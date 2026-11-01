/**
 * External providers — registry.
 *
 * Every integration sits behind an interface with two implementations (one file per provider in this folder):
 *   - a MOCK, used on stage/local until the vendor is contracted (records what it would send in `mock_outbox`)
 *   - a REAL adapter written against the vendor's documented HTTP API, enabled by env vars
 * `createProviders()` picks one per provider from the config. Prod refuses to start with mocks for payments,
 * KYC, email or SMS (config.ts). `providerStatus()` feeds Admin → System Settings → External providers.
 *
 *   email.ts  sms.ts  push.ts  whatsapp.ts  payments.ts  kyc.ts  ai.ts (+ mock-ai.ts)  nav.ts  google.ts  support.ts
 *   shared.ts — Ctx, mock outbox, http with timeout, HMAC helpers
 */
import type { Config } from '../config.js';
import type { Ctx } from './shared.js';
import { mockEmail, sendgrid, type EmailProvider } from './email.js';
import { mockSms, msg91, type SmsProvider } from './sms.js';
import { mockPush, fcm, type PushProvider } from './push.js';
import { mockWa, metaWa, type WhatsAppProvider } from './whatsapp.js';
import { mockPayments, razorpay, type CheckoutResult, type PaymentEvent, type PaymentProvider } from './payments.js';
import { mockKyc, digio, type KycProvider } from './kyc.js';
import { mockAi, anthropic, type AiProvider } from './ai.js';
import { mockNav, amfi, type NavRow, type NavProvider } from './nav.js';
import { mockGoogle, google, type OAuthProvider } from './google.js';
import { mockSupport, freshdesk, type SupportProvider } from './support.js';

export type { Ctx } from './shared.js';
export type { EmailProvider } from './email.js';
export type { SmsProvider } from './sms.js';
export type { PushProvider } from './push.js';
export type { WhatsAppProvider } from './whatsapp.js';
export type { CheckoutResult, PaymentEvent, PaymentProvider } from './payments.js';
export type { KycProvider } from './kyc.js';
export type { AiProvider } from './ai.js';
export type { NavRow, NavProvider } from './nav.js';
export type { OAuthProvider } from './google.js';
export type { SupportProvider } from './support.js';

/** One adapter per integration, chosen at startup. */
export interface Providers { email: EmailProvider; sms: SmsProvider; push: PushProvider; whatsapp: WhatsAppProvider; payments: PaymentProvider; kyc: KycProvider; ai: AiProvider; nav: NavProvider; google: OAuthProvider; support: SupportProvider }
/** Build the provider set from the config (mock unless the real vendor is selected). */
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
/** Integrations that have no adapter yet (shown as "Not built yet — planned"). */
export const NOT_YET_BUILT = [
  { key: 'apple', label: 'Sign in with Apple', replacement: 'Apple Services ID + OIDC callback', backlog: 'AUTH-05' },
  { key: 'gst_invoicing', label: 'GST e-invoicing', replacement: 'Gateway invoices or Zoho Books / ClearTax for GST-compliant invoices (in-app invoices are generated today)', backlog: 'BILL-07' },
  { key: 'object_storage', label: 'Object storage for uploads', replacement: 'Amazon S3 / GCS — uploads are stored in PostgreSQL (bytea) until then', backlog: 'PLT-02' },
  { key: 'benchmark_data', label: 'Benchmark / TRI index data', replacement: 'NSE Indices licensed feed', backlog: 'DATA-04' },
  { key: 'analytics', label: 'Product analytics', replacement: 'PostHog / GA4 behind the consent flag', backlog: 'CALC-07' },
  { key: 'cms', label: 'Help-centre CMS', replacement: 'Headless CMS — FAQs are served from the database today', backlog: 'ACC-05' },
  { key: 'secrets', label: 'Secrets manager & KMS', replacement: 'AWS Secrets Manager / GCP Secret Manager — env vars injected by CI today', backlog: 'PLT-03' },
  { key: 'mfa', label: 'Authenticator app (TOTP) for admins', replacement: 'Optional TOTP as an alternative factor — admins already need an email code + SMS code today', backlog: 'AUTH-09' },
];
/** Which providers are live vs mocked, and whether their credentials are set (Admin → System Settings). */
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
