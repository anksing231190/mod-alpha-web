/**
 * External provider adapters.
 *
 * Every integration is behind an interface with two implementations:
 *   - a MOCK, used on stage until the vendor is contracted (records what it would send in `mock_outbox`)
 *   - a REAL adapter written against the vendor's documented HTTP API, enabled by env vars
 *
 * `providerStatus()` feeds Admin → System Settings ("Mocked — integrated later") and
 * docs/23_mocks_and_replacements.md describes each replacement.
 */
import crypto from 'node:crypto';
import type { Config } from '../config.js';
import type { Db } from '../db.js';
import { upstream } from '../lib/errors.js';
import { mockAnswer } from './mock-ai.js';

export interface Ctx { db: Db; cfg: Config; log: { info: (o: any, m?: string) => void; warn: (o: any, m?: string) => void } }

async function outbox(ctx: Ctx, provider: string, channel: string, recipient: string, body: string, subject?: string, meta?: unknown) {
  const r = await ctx.db.query('INSERT INTO mock_outbox (provider, channel, recipient, subject, body, meta) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id', [provider, channel, recipient, subject ?? null, body, meta ? JSON.stringify(meta) : null]);
  return `mock_${channel}_${r.rows[0].id}`;
}
async function http(url: string, init: RequestInit & { timeoutMs?: number } = {}) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), init.timeoutMs ?? 15000);
  try {
    const res = await fetch(url, { ...init, signal: ctl.signal });
    const text = await res.text();
    let json: any = null;
    try { json = text ? JSON.parse(text) : null; } catch { /* non-JSON */ }
    if (!res.ok) throw upstream(`${new URL(url).host} responded ${res.status}: ${text.slice(0, 200)}`);
    return { json, text };
  } finally { clearTimeout(t); }
}
const hmac = (secret: string, body: string | Buffer) => crypto.createHmac('sha256', secret).update(body).digest('hex');
const safeEq = (a: string, b: string) => { const x = Buffer.from(a), y = Buffer.from(b); return x.length === y.length && crypto.timingSafeEqual(x, y); };

// ------------------------------------------------------------------ email
export interface EmailProvider { name: string; send(m: { to: string; subject: string; text: string; html?: string }): Promise<string> }
const mockEmail = (ctx: Ctx): EmailProvider => ({ name: 'mock', send: (m) => outbox(ctx, 'mock', 'email', m.to, m.text, m.subject) });
const sendgrid = (ctx: Ctx): EmailProvider => ({
  name: 'sendgrid',
  async send(m) {
    const from = ctx.cfg.EMAIL_FROM.match(/^(.*)<(.+)>$/);
    await http('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST', headers: { Authorization: `Bearer ${ctx.cfg.SENDGRID_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ personalizations: [{ to: [{ email: m.to }] }], from: from ? { name: from[1].trim(), email: from[2] } : { email: ctx.cfg.EMAIL_FROM }, subject: m.subject, content: [{ type: 'text/plain', value: m.text }, ...(m.html ? [{ type: 'text/html', value: m.html }] : [])] }),
    });
    return `sendgrid_${Date.now()}`;
  },
});

// ------------------------------------------------------------------ SMS / OTP
export interface SmsProvider { name: string; send(m: { to: string; text: string; templateId?: string; vars?: Record<string, string> }): Promise<string> }
const mockSms = (ctx: Ctx): SmsProvider => ({ name: 'mock', send: (m) => outbox(ctx, 'mock', 'sms', m.to, m.text, undefined, { templateId: m.templateId, vars: m.vars }) });
const msg91 = (ctx: Ctx): SmsProvider => ({
  name: 'msg91',
  async send(m) {
    // MSG91 Flow API — DLT-registered template; variables are substituted by MSG91.
    const { json } = await http('https://control.msg91.com/api/v5/flow/', {
      method: 'POST', headers: { authkey: ctx.cfg.MSG91_AUTH_KEY!, 'Content-Type': 'application/json' },
      body: JSON.stringify({ template_id: m.templateId ?? ctx.cfg.MSG91_SMS_TEMPLATE_ID, sender: ctx.cfg.MSG91_SENDER_ID, recipients: [{ mobiles: m.to.replace(/\D/g, ''), ...(m.vars ?? {}) }] }),
    });
    return json?.request_id ?? `msg91_${Date.now()}`;
  },
});

// ------------------------------------------------------------------ push
export interface PushProvider { name: string; send(m: { token: string; title: string; body: string; link?: string }): Promise<string> }
const mockPush = (ctx: Ctx): PushProvider => ({ name: 'mock', send: (m) => outbox(ctx, 'mock', 'push', m.token, m.body, m.title, { link: m.link }) });
const fcm = (ctx: Ctx): PushProvider => ({
  name: 'fcm',
  async send(m) {
    const { json } = await http('https://fcm.googleapis.com/fcm/send', { method: 'POST', headers: { Authorization: `key=${ctx.cfg.FCM_SERVER_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ to: m.token, notification: { title: m.title, body: m.body, click_action: m.link } }) });
    return String(json?.multicast_id ?? Date.now());
  },
});

// ------------------------------------------------------------------ WhatsApp
export interface WhatsAppProvider { name: string; sendTemplate(m: { to: string; template: string; vars: string[] }): Promise<string> }
const mockWa = (ctx: Ctx): WhatsAppProvider => ({ name: 'mock', sendTemplate: (m) => outbox(ctx, 'mock', 'whatsapp', m.to, `[${m.template}] ${m.vars.join(' | ')}`) });
const metaWa = (ctx: Ctx): WhatsAppProvider => ({
  name: 'meta',
  async sendTemplate(m) {
    const { json } = await http(`https://graph.facebook.com/v20.0/${ctx.cfg.META_WA_PHONE_ID}/messages`, { method: 'POST', headers: { Authorization: `Bearer ${ctx.cfg.META_WA_TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ messaging_product: 'whatsapp', to: m.to.replace(/\D/g, ''), type: 'template', template: { name: m.template, language: { code: 'en' }, components: [{ type: 'body', parameters: m.vars.map((t) => ({ type: 'text', text: t })) }] } }) });
    return json?.messages?.[0]?.id ?? `wa_${Date.now()}`;
  },
});

// ------------------------------------------------------------------ payments
export interface CheckoutResult { provider: string; orderId: string; amountPaise: number; currency: 'INR'; keyId?: string; mockConfirm?: boolean }
export interface PaymentEvent { eventId: string; type: 'payment.captured' | 'payment.failed' | 'subscription.cancelled' | 'refund.processed'; orderId?: string; paymentId?: string; amountPaise?: number; subscriptionRef?: string; raw: unknown }
export interface PaymentProvider {
  name: string;
  createOrder(o: { receipt: string; amountInr: number; notes: Record<string, string> }): Promise<CheckoutResult>;
  verifyCheckoutSignature(o: { orderId: string; paymentId: string; signature: string }): boolean;
  verifyWebhook(rawBody: string, signature: string | undefined): boolean;
  parseWebhook(body: any): PaymentEvent | null;
  refund(paymentId: string, amountInr: number): Promise<string>;
}
const mockPayments = (ctx: Ctx): PaymentProvider => ({
  name: 'mock',
  async createOrder(o) { return { provider: 'mock', orderId: `mock_order_${crypto.randomUUID().slice(0, 12)}`, amountPaise: Math.round(o.amountInr * 100), currency: 'INR', mockConfirm: true }; },
  verifyCheckoutSignature: (o) => o.signature === hmac(ctx.cfg.JWT_SECRET, `${o.orderId}|${o.paymentId}`),
  verifyWebhook: (raw, sig) => !!sig && safeEq(sig, hmac(ctx.cfg.JWT_SECRET, raw)),
  parseWebhook: (b) => b && b.event ? { eventId: b.id, type: b.event, orderId: b.orderId, paymentId: b.paymentId, amountPaise: b.amountPaise, raw: b } : null,
  async refund(paymentId, amountInr) { return outbox(ctx, 'mock', 'refund', paymentId, `Refund ₹${amountInr}`); },
});
const razorpay = (ctx: Ctx): PaymentProvider => {
  const auth = 'Basic ' + Buffer.from(`${ctx.cfg.RAZORPAY_KEY_ID}:${ctx.cfg.RAZORPAY_KEY_SECRET}`).toString('base64');
  return {
    name: 'razorpay',
    async createOrder(o) {
      const { json } = await http('https://api.razorpay.com/v1/orders', { method: 'POST', headers: { Authorization: auth, 'Content-Type': 'application/json' }, body: JSON.stringify({ amount: Math.round(o.amountInr * 100), currency: 'INR', receipt: o.receipt, notes: o.notes }) });
      return { provider: 'razorpay', orderId: json.id, amountPaise: json.amount, currency: 'INR', keyId: ctx.cfg.RAZORPAY_KEY_ID };
    },
    verifyCheckoutSignature: (o) => safeEq(o.signature, hmac(ctx.cfg.RAZORPAY_KEY_SECRET!, `${o.orderId}|${o.paymentId}`)),
    verifyWebhook: (raw, sig) => !!sig && safeEq(sig, hmac(ctx.cfg.RAZORPAY_WEBHOOK_SECRET!, raw)),
    parseWebhook(b) {
      const p = b?.payload?.payment?.entity, map: Record<string, PaymentEvent['type']> = { 'payment.captured': 'payment.captured', 'payment.failed': 'payment.failed', 'refund.processed': 'refund.processed', 'subscription.cancelled': 'subscription.cancelled' };
      if (!map[b?.event]) return null;
      return { eventId: b.id ?? `${b.event}:${p?.id}`, type: map[b.event], orderId: p?.order_id, paymentId: p?.id, amountPaise: p?.amount, subscriptionRef: b?.payload?.subscription?.entity?.id, raw: b };
    },
    async refund(paymentId, amountInr) { const { json } = await http(`https://api.razorpay.com/v1/payments/${paymentId}/refund`, { method: 'POST', headers: { Authorization: auth, 'Content-Type': 'application/json' }, body: JSON.stringify({ amount: Math.round(amountInr * 100) }) }); return json.id; },
  };
};

// ------------------------------------------------------------------ KYC
export interface KycProvider {
  name: string;
  start(u: { userId: string; name: string; email?: string | null; mobile?: string | null }): Promise<{ ref: string; redirectUrl: string }>;
  verifyWebhook(rawBody: string, signature: string | undefined): boolean;
  parseWebhook(body: any): { ref: string; status: 'Verified' | 'Rejected' | 'In review'; reason?: string } | null;
}
const mockKyc = (ctx: Ctx): KycProvider => ({
  name: 'mock',
  async start(u) { const ref = `mock_kyc_${crypto.randomUUID().slice(0, 12)}`; return { ref, redirectUrl: `${ctx.cfg.PUBLIC_APP_URL}/#/kyc/mock?ref=${ref}` }; },
  verifyWebhook: (raw, sig) => !!sig && safeEq(sig, hmac(ctx.cfg.JWT_SECRET, raw)),
  parseWebhook: (b) => (b?.ref ? { ref: b.ref, status: b.status, reason: b.reason } : null),
});
const digio = (ctx: Ctx): KycProvider => {
  const auth = 'Basic ' + Buffer.from(`${ctx.cfg.DIGIO_CLIENT_ID}:${ctx.cfg.DIGIO_CLIENT_SECRET}`).toString('base64');
  return {
    name: 'digio',
    async start(u) {
      const { json } = await http(`${ctx.cfg.DIGIO_BASE_URL}/client/kyc/v2/request/with_template`, { method: 'POST', headers: { Authorization: auth, 'Content-Type': 'application/json' }, body: JSON.stringify({ customer_identifier: u.email ?? u.mobile, customer_name: u.name, template_name: 'MODALPHA_KYC', notify_customer: false, generate_access_token: true, reference_id: u.userId }) });
      return { ref: json.id, redirectUrl: `https://app.digio.in/#/gateway/login/${json.id}/${json.reference_id ?? ''}/${encodeURIComponent(u.email ?? u.mobile ?? '')}` };
    },
    verifyWebhook: (raw, sig) => !!sig && safeEq(sig, hmac(ctx.cfg.KYC_WEBHOOK_SECRET!, raw)),
    parseWebhook(b) {
      const e = b?.payload?.kyc_request ?? b?.payload; if (!e?.id) return null;
      const st = String(e.status).toLowerCase();
      return { ref: e.id, status: st === 'approved' ? 'Verified' : st === 'rejected' ? 'Rejected' : 'In review', reason: e.reason };
    },
  };
};

// ------------------------------------------------------------------ AI assistant
export interface AiProvider { name: string; complete(i: { system: string; messages: { role: 'user' | 'assistant'; content: string }[]; maxTokens?: number }): Promise<{ text: string; tokensIn: number; tokensOut: number }> }
const mockAi = (ctx: Ctx): AiProvider => ({ name: 'mock', async complete(i) { const q = i.messages.at(-1)?.content ?? ''; return { text: await mockAnswer(ctx.db, q), tokensIn: 0, tokensOut: 0 }; } });
const anthropic = (ctx: Ctx): AiProvider => ({
  name: 'anthropic',
  async complete(i) {
    const { json } = await http('https://api.anthropic.com/v1/messages', { method: 'POST', timeoutMs: 60000, headers: { 'x-api-key': ctx.cfg.ANTHROPIC_API_KEY!, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' }, body: JSON.stringify({ model: ctx.cfg.ANTHROPIC_MODEL, max_tokens: i.maxTokens ?? 600, system: i.system, messages: i.messages }) });
    return { text: (json.content ?? []).filter((c: any) => c.type === 'text').map((c: any) => c.text).join(''), tokensIn: json.usage?.input_tokens ?? 0, tokensOut: json.usage?.output_tokens ?? 0 };
  },
});

// ------------------------------------------------------------------ NAV feed
export interface NavRow { amfiCode: string; schemeName: string; navDate: string; nav: number }
export interface NavProvider { name: string; fetchLatest(): Promise<NavRow[]> }
const mockNav = (ctx: Ctx): NavProvider => ({
  name: 'mock',
  async fetchLatest() {
    // Synthesises the next business day's NAV from the last stored NAV (small random walk).
    const r = await ctx.db.query(`SELECT f.fund_id, coalesce(f.amfi_code, f.fund_id) code, f.scheme_name, n.nav_date, n.nav FROM funds f JOIN LATERAL (SELECT nav_date, nav FROM nav_history WHERE fund_id=f.fund_id ORDER BY nav_date DESC LIMIT 1) n ON true WHERE f.is_active`);
    return r.rows.map((x: any) => { const d = new Date(x.nav_date + 'T00:00:00Z'); do d.setUTCDate(d.getUTCDate() + 1); while ([0, 6].includes(d.getUTCDay())); return { amfiCode: x.code, schemeName: x.scheme_name, navDate: d.toISOString().slice(0, 10), nav: +(x.nav * (1 + (Math.random() - 0.48) * 0.012)).toFixed(4) }; });
  },
});
const amfi = (ctx: Ctx): NavProvider => ({
  name: 'amfi',
  async fetchLatest() {
    const { text } = await http(ctx.cfg.AMFI_NAV_URL, { timeoutMs: 60000 });
    const M: Record<string, string> = { Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06', Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12' };
    const out: NavRow[] = [];
    for (const line of text.split(/\r?\n/)) {
      const p = line.split(';'); if (p.length < 6 || !/^\d+$/.test(p[0])) continue;
      const nav = Number(p[4]), dm = p[5].trim().match(/^(\d{2})-([A-Za-z]{3})-(\d{4})$/);
      if (!isFinite(nav) || nav <= 0 || !dm) continue;
      out.push({ amfiCode: p[0], schemeName: p[3].trim(), navDate: `${dm[3]}-${M[dm[2]]}-${dm[1]}`, nav });
    }
    return out;
  },
});

// ------------------------------------------------------------------ Google sign-in
export interface OAuthProvider { name: string; verify(idToken: string): Promise<{ sub: string; email: string; name: string; emailVerified: boolean }> }
const mockGoogle = (ctx: Ctx): OAuthProvider => ({ name: 'mock', async verify(t) { const m = t.match(/^mock:(.+@.+)$/); if (!m || ctx.cfg.APP_ENV === 'prod') throw upstream('Invalid mock Google token'); return { sub: `mock-${m[1]}`, email: m[1], name: m[1].split('@')[0], emailVerified: true }; } });
const google = (ctx: Ctx): OAuthProvider => ({
  name: 'google',
  async verify(t) {
    const { json } = await http(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(t)}`);
    if (json.aud !== ctx.cfg.GOOGLE_CLIENT_ID) throw upstream('Google token audience mismatch');
    return { sub: json.sub, email: json.email, name: json.name ?? json.email, emailVerified: json.email_verified === 'true' || json.email_verified === true };
  },
});

// ------------------------------------------------------------------ helpdesk
export interface SupportProvider { name: string; create(t: { email: string; subject: string; message: string; number: string }): Promise<string> }
const mockSupport = (ctx: Ctx): SupportProvider => ({ name: 'mock', create: (t) => outbox(ctx, 'mock', 'support', t.email, t.message, `${t.number} · ${t.subject}`) });
const freshdesk = (ctx: Ctx): SupportProvider => ({
  name: 'freshdesk',
  async create(t) { const { json } = await http(`https://${ctx.cfg.FRESHDESK_DOMAIN}/api/v2/tickets`, { method: 'POST', headers: { Authorization: 'Basic ' + Buffer.from(`${ctx.cfg.FRESHDESK_API_KEY}:X`).toString('base64'), 'Content-Type': 'application/json' }, body: JSON.stringify({ email: t.email, subject: `${t.number} · ${t.subject}`, description: t.message, status: 2, priority: 1 }) }); return String(json.id); },
});

// ------------------------------------------------------------------ registry
export interface Providers { email: EmailProvider; sms: SmsProvider; push: PushProvider; whatsapp: WhatsAppProvider; payments: PaymentProvider; kyc: KycProvider; ai: AiProvider; nav: NavProvider; google: OAuthProvider; support: SupportProvider }
export function createProviders(ctx: Ctx): Providers {
  const c = ctx.cfg;
  const p: Providers = {
    email: c.EMAIL_PROVIDER === 'sendgrid' ? sendgrid(ctx) : mockEmail(ctx),
    sms: c.SMS_PROVIDER === 'msg91' ? msg91(ctx) : mockSms(ctx),
    push: c.PUSH_PROVIDER === 'fcm' ? fcm(ctx) : mockPush(ctx),
    whatsapp: c.WHATSAPP_PROVIDER === 'meta' ? metaWa(ctx) : mockWa(ctx),
    payments: c.PAYMENT_PROVIDER === 'razorpay' ? razorpay(ctx) : mockPayments(ctx),
    kyc: c.KYC_PROVIDER === 'digio' ? digio(ctx) : mockKyc(ctx),
    ai: c.AI_PROVIDER === 'anthropic' ? anthropic(ctx) : mockAi(ctx),
    nav: c.NAV_PROVIDER === 'amfi' ? amfi(ctx) : mockNav(ctx),
    google: c.OAUTH_GOOGLE === 'google' ? google(ctx) : mockGoogle(ctx),
    support: c.SUPPORT_PROVIDER === 'freshdesk' ? freshdesk(ctx) : mockSupport(ctx),
  };
  const mocks = Object.entries(p).filter(([, v]) => v.name === 'mock').map(([k]) => k);
  if (mocks.length) ctx.log.warn({ mocks, env: c.APP_ENV }, 'Running with mock providers');
  return p;
}

/** Catalogue shown in Admin → System Settings and in docs/23. */
export const PROVIDER_CATALOGUE = [
  { key: 'payments', label: 'Payments & subscriptions', env: 'PAYMENT_PROVIDER', real: 'razorpay', mockBehaviour: 'Creates a fake order; a stage-only “Confirm test payment” step signs and posts the same webhook a real gateway would.', replacement: 'Razorpay Orders + Subscriptions (UPI Autopay / e-mandate) and signed webhooks', vars: ['RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET', 'RAZORPAY_WEBHOOK_SECRET'], backlog: ['BILL-01', 'BILL-02', 'BILL-03', 'BILL-06'] },
  { key: 'kyc', label: 'KYC / identity verification', env: 'KYC_PROVIDER', real: 'digio', mockBehaviour: 'Redirects to a stage page with Approve / Reject buttons that post a signed webhook.', replacement: 'Digio KYC (PAN, DigiLocker / Aadhaar offline eKYC, CKYC) with webhook', vars: ['DIGIO_CLIENT_ID', 'DIGIO_CLIENT_SECRET', 'KYC_WEBHOOK_SECRET'], backlog: ['KYC-01', 'KYC-02'] },
  { key: 'email', label: 'Transactional email', env: 'EMAIL_PROVIDER', real: 'sendgrid', mockBehaviour: 'Writes the email to the Mock outbox (Admin → Notifications) instead of sending.', replacement: 'SendGrid (or Amazon SES) with delivery/bounce webhooks', vars: ['SENDGRID_API_KEY', 'EMAIL_FROM'], backlog: ['NOTI-01', 'AUTH-03'] },
  { key: 'sms', label: 'SMS & OTP', env: 'SMS_PROVIDER', real: 'msg91', mockBehaviour: 'Writes the SMS/OTP to the Mock outbox; on stage the OTP is also returned in the API response for testers.', replacement: 'MSG91 Flow API with DLT-registered sender and templates', vars: ['MSG91_AUTH_KEY', 'MSG91_SENDER_ID', 'MSG91_OTP_TEMPLATE_ID', 'MSG91_SMS_TEMPLATE_ID'], backlog: ['AUTH-02', 'NOTI-02'] },
  { key: 'push', label: 'Push notifications', env: 'PUSH_PROVIDER', real: 'fcm', mockBehaviour: 'In-app notifications work; device push is written to the Mock outbox.', replacement: 'Firebase Cloud Messaging (web push)', vars: ['FCM_SERVER_KEY'], backlog: ['NOTI-03'] },
  { key: 'whatsapp', label: 'WhatsApp messages', env: 'WHATSAPP_PROVIDER', real: 'meta', mockBehaviour: 'Template messages are written to the Mock outbox.', replacement: 'WhatsApp Business Cloud API (approved templates)', vars: ['META_WA_TOKEN', 'META_WA_PHONE_ID'], backlog: ['NOTI-04'] },
  { key: 'ai', label: 'AI assistant (LLM)', env: 'AI_PROVIDER', real: 'anthropic', mockBehaviour: 'Rule-based answers grounded in the fund database (CAGR, SIP date, fund comparison).', replacement: 'Anthropic Claude via the server-side gateway with quotas and cost limits', vars: ['ANTHROPIC_API_KEY', 'ANTHROPIC_MODEL', 'AI_MONTHLY_BUDGET_INR'], backlog: ['AI-04', 'AI-07'] },
  { key: 'nav', label: 'Daily NAV feed', env: 'NAV_PROVIDER', real: 'amfi', mockBehaviour: 'The nightly job synthesises the next business day’s NAV from the last stored value; admins can also upload the workbook.', replacement: 'AMFI NAVAll.txt (free) — later a licensed vendor (CAMS/KFintech, Value Research, Morningstar)', vars: ['AMFI_NAV_URL'], backlog: ['DATA-01'] },
  { key: 'google', label: 'Google sign-in', env: 'OAUTH_GOOGLE', real: 'google', mockBehaviour: 'Accepts a test token “mock:<email>” on stage only.', replacement: 'Google Identity Services (ID-token verification)', vars: ['GOOGLE_CLIENT_ID'], backlog: ['AUTH-04'] },
  { key: 'support', label: 'Helpdesk tickets', env: 'SUPPORT_PROVIDER', real: 'freshdesk', mockBehaviour: 'Tickets are stored in the database and copied to the Mock outbox.', replacement: 'Freshdesk (or Zendesk / Zoho Desk) ticket API', vars: ['FRESHDESK_DOMAIN', 'FRESHDESK_API_KEY'], backlog: ['ACC-04'] },
] as const;
export const NOT_YET_BUILT = [
  { key: 'apple', label: 'Sign in with Apple', replacement: 'Apple Services ID + OIDC callback', backlog: 'AUTH-05' },
  { key: 'gst_invoicing', label: 'GST e-invoicing', replacement: 'Gateway invoices or Zoho Books / ClearTax for GST-compliant invoices (in-app invoices are generated today)', backlog: 'BILL-07' },
  { key: 'object_storage', label: 'Object storage for uploads', replacement: 'Amazon S3 / GCS — uploads are stored in PostgreSQL (bytea) until then', backlog: 'PLT-02' },
  { key: 'benchmark_data', label: 'Benchmark / TRI index data', replacement: 'NSE Indices licensed feed', backlog: 'DATA-04' },
  { key: 'analytics', label: 'Product analytics', replacement: 'PostHog / GA4 behind the consent flag', backlog: 'CALC-07' },
  { key: 'cms', label: 'Help-centre CMS', replacement: 'Headless CMS — FAQs are served from the database today', backlog: 'ACC-05' },
  { key: 'secrets', label: 'Secrets manager & KMS', replacement: 'AWS Secrets Manager / GCP Secret Manager — env vars injected by CI today', backlog: 'PLT-03' },
  { key: 'mfa', label: 'Admin MFA (TOTP)', replacement: 'TOTP enrolment for admins — RBAC is enforced today', backlog: 'AUTH-09' },
];
export function providerStatus(p: Providers, cfg: Config) {
  return {
    env: cfg.APP_ENV,
    providers: PROVIDER_CATALOGUE.map((x) => {
      const active = (p as any)[x.key].name as string;
      return { ...x, active, mode: active === 'mock' ? 'mock' : 'live', configured: x.vars.every((v) => !!(cfg as any)[v] || v === 'EMAIL_FROM' || v === 'AMFI_NAV_URL' || v === 'ANTHROPIC_MODEL' || v === 'AI_MONTHLY_BUDGET_INR') };
    }),
    notYetBuilt: NOT_YET_BUILT,
  };
}
