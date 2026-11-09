/**
 * Billing module — plans, checkout, payments and subscriptions.
 *   GET /plans · GET /me/entitlements
 *   POST /billing/checkout → gateway order (KYC must be Verified first, 409 kyc_required)
 *   POST /billing/verify (browser-side confirmation) · POST /webhooks/payments (gateway → us, signed, idempotent)
 *   POST /billing/mock/complete (stage only: the 'test payment' dialog)
 *   GET /billing/subscription · POST /billing/subscriptions/:id/cancel · GET /billing/invoices(/:id)
 *   GET /billing/change/preview · POST /billing/change · POST /billing/change/undo (plan changes, docs/29)
 *   GET /billing/credit-notes/:id(/pdf)
 *   PUT /admin/plans/:id (versioned price edit) · POST /admin/payments/:id/refund (issues a GST credit note)
 */
import type { FastifyInstance, FastifyRequest } from 'fastify';
import crypto from 'node:crypto';
import { z } from 'zod';
import { parse } from '../../shared/validate.js';
import { badRequest, conflict, forbidden, HttpError, notFound, unauthorized } from '../../shared/errors.js';
import { requireAdmin, requireUser } from '../auth/session.js';
import { audit } from '../../shared/audit.js';
import { tx, type Db, type Q } from '../../db.js';
import { addDays, addMonths, today } from '../../shared/dates.js';
import { invoicePdf, invoiceView, issueInvoice, issueCreditNote, creditNoteView } from './invoice.js';
import { previewChange, todayIST, type Plan, type Sub } from './plan-change.js';
import type { Deps } from '../../app.js';

const CYCLE_MONTHS = { Monthly: 1, Quarterly: 3, Yearly: 12 } as const;
type Cycle = keyof typeof CYCLE_MONTHS;
// Database plan row → what the website shows.
export const planView = (p: any) => ({ id: p.id, name: p.name, tagline: p.tagline, prices: p.prices, features: p.features, limits: p.limits, active: p.active, version: p.version, price: p.prices.Monthly });

/** Days a subscription keeps its features after a failed renewal ("Past due") before falling back to Free. */
export const GRACE_DAYS = 7;
// The user's active subscription, or a past-due one still inside its grace period, newest first.
export async function currentSubscription(q: Q, userId: string) {
  const r = await q.query(`SELECT s.*, p.name AS plan_name, p.limits, (s.renewal_date + ${GRACE_DAYS}) AS grace_ends_on FROM subscriptions s JOIN plans p ON p.id=s.plan_id
    WHERE s.user_id=$1 AND (s.status='Active' OR (s.status='Past due' AND coalesce(s.renewal_date, CURRENT_DATE) + ${GRACE_DAYS} >= CURRENT_DATE)) ORDER BY s.start_date DESC LIMIT 1`, [userId]);
  return r.rows[0] ?? null;
}
// What the user's plan allows (AI questions per day, custom reminders, …). Free plan when there is no
// subscription.
export async function entitlements(q: Q, userId: string) {
  const s = await currentSubscription(q, userId);
  const plan = s ? s.plan_id : 'Free';
  const limits = s ? s.limits : (await q.query(`SELECT limits FROM plans WHERE id='Free'`)).rows[0]?.limits ?? { ai_queries_per_day: 1 };
  return { plan, limits, subscription: s ? { id: s.id, cycle: s.billing_cycle, status: s.status, renewalDate: s.renewal_date, cancelAtPeriodEnd: s.cancel_at_period_end, graceEndsOn: s.status === 'Past due' ? s.grace_ends_on : null, amountInr: Number(s.amount_inr), pendingChange: s.cancel_at_period_end ? null : s.pending_plan_id ? { plan: s.pending_plan_id, cycle: s.pending_cycle, effectiveOn: s.renewal_date, amountInr: Number(s.pending_amount_inr) } : null } : null };
}

/** Idempotently mark a payment captured and activate its subscription. Shared by verify, webhook and mock. */
// Turn a captured payment into an active subscription + GST invoice + notification. Safe to call twice for the
// same order (idempotent).
export async function capturePayment(deps: Deps, req: FastifyRequest | null, o: { orderId: string; paymentId: string; raw?: unknown }) {
  const { db, providers } = deps;
  const result = await tx(db, async (c) => {
    const p = (await c.query('SELECT * FROM payments WHERE provider_order_id=$1 FOR UPDATE', [o.orderId])).rows[0];
    if (!p) throw notFound('Unknown order');
    if (p.status === 'captured') return { already: true, subscriptionId: p.subscription_id, userId: p.user_id };
    const s = (await c.query('SELECT * FROM subscriptions WHERE id=$1 FOR UPDATE', [p.subscription_id])).rows[0];
    const t = today(), renew = addMonths(t, CYCLE_MONTHS[s.billing_cycle as Cycle]);
    await c.query(`UPDATE payments SET status='captured', provider_payment_id=$2, paid_on=$3, raw=$4 WHERE id=$1`, [p.id, o.paymentId, t, JSON.stringify(o.raw ?? null)]);
    if (p.kind === 'upgrade') {
      // prorated upgrade of an existing subscription: same subscription, new plan/cycle; renewal date as previewed
      const m = p.meta;
      await c.query(`UPDATE subscriptions SET plan_id=$2, billing_cycle=$3, amount_inr=$4, renewal_date=$5, last_payment_date=$6, payment_ref=$7, cancel_at_period_end=false, pending_plan_id=NULL, pending_cycle=NULL, pending_amount_inr=NULL, pending_requested_at=NULL, updated_at=now() WHERE id=$1`, [s.id, m.to.plan, m.to.cycle, m.nextAmount, m.renewsOn, t, o.paymentId]);
      await issueInvoice(c, deps.cfg, { userId: s.user_id, paymentId: p.id, amount: +p.amount_inr, date: t, plan: m.to.plan, cycle: m.to.cycle, periodEnd: m.periodEnd, description: `Mod Alpha plan change: ${m.from.plan} ${m.from.cycle} to ${m.to.plan} ${m.to.cycle} (${m.newCycle ? 'new billing cycle from today' : `${m.daysLeft} of ${m.daysInCycle} days`}), less Rs. ${Number(m.credit).toFixed(2)} credit for unused days` });
      await c.query(`INSERT INTO notifications (user_id, kind, title, body, link) VALUES ($1,'billing',$2,$3,'#/user/subscription')`, [s.user_id, `Upgraded to ${m.to.plan}`, `Payment of ₹${p.amount_inr} received. Your plan renews on ${m.renewsOn} at ₹${m.nextAmount}.`]);
      await audit(c, req, { action: 'SUBSCRIPTION_UPGRADED', category: 'Subscription', resource: s.id, meta: { ...m, amount: p.amount_inr }, actorLabel: 'payments' });
      return { already: false, subscriptionId: s.id, userId: s.user_id, plan: m.to.plan, amount: p.amount_inr, renew: m.renewsOn };
    }
    // an upgrade/downgrade replaces the previous paid plan at once (no proration in v1 — see BILL-05)
    await c.query(`UPDATE subscriptions SET status='Cancelled', cancelled_at=now(), updated_at=now() WHERE user_id=$1 AND id<>$2 AND status IN ('Active','Past due')`, [s.user_id, s.id]);
    await c.query(`UPDATE subscriptions SET status='Active', start_date=CASE WHEN status='Created' THEN $2::date ELSE start_date END, last_payment_date=$2, renewal_date=$3, payment_ref=$4, updated_at=now() WHERE id=$1`, [s.id, t, renew, o.paymentId]);
    // GST tax invoice (numbered per financial year, with a snapshot of seller and buyer details)
    await issueInvoice(c, deps.cfg, { userId: s.user_id, paymentId: p.id, amount: +p.amount_inr, date: t, plan: s.plan_id, cycle: s.billing_cycle, periodEnd: addDays(renew, -1) });
    await c.query(`INSERT INTO notifications (user_id, kind, title, body, link) VALUES ($1,'billing',$2,$3,'#/user/subscription')`, [s.user_id, `${s.plan_id} plan activated`, `Payment of ₹${p.amount_inr} received. Next renewal on ${renew}.`]);
    await audit(c, req, { action: 'SUBSCRIPTION_ACTIVATED', category: 'Subscription', resource: s.id, meta: { plan: s.plan_id, amount: p.amount_inr }, actorLabel: 'payments' });
    return { already: false, subscriptionId: s.id, userId: s.user_id, plan: s.plan_id, amount: p.amount_inr, renew };
  });
  if (!result.already) {
    const u = (await db.query('SELECT email, full_name FROM users WHERE id=$1', [result.userId])).rows[0];
    if (u?.email) await providers.email.send({ to: u.email, subject: `Your Mod Alpha ${result.plan} plan is active`, text: `Hi ${u.full_name},\n\nWe received ₹${result.amount}. Your plan renews on ${result.renew}.\nYour invoice is available under Subscription → Billing history.` }).catch(() => {});
  }
  return result;
}

export default async function billing(app: FastifyInstance) {
  const deps = app.deps, { db, providers, cfg } = deps;

  // GET /plans — public price list (also used by the landing page).
  app.get('/plans', async () => ({ plans: (await db.query('SELECT * FROM plans WHERE active ORDER BY sort')).rows.map(planView) }));

  // GET /me/entitlements — plan + limits for the signed-in user.
  app.get('/me/entitlements', async (req) => {
    const u = requireUser(req);
    const e = await entitlements(db, u.id);
    const r = (await db.query(`SELECT coalesce(sum(queries) FILTER (WHERE day = CURRENT_DATE), 0)::int AS today, coalesce(sum(queries), 0)::int AS month FROM assistant_usage WHERE user_id=$1 AND day >= date_trunc('month', CURRENT_DATE)::date`, [u.id])).rows[0];
    // AI questions used today / this month, next to the plan's caps (limits.ai_queries_per_day / _per_month)
    return { ...e, usage: { aiQueriesToday: r.today, aiQueriesMonth: r.month } };
  });

  // POST /billing/checkout — create a gateway order for a plan + billing cycle. Blocks until KYC is verified.
  app.post('/billing/checkout', async (req) => {
    const u = requireUser(req);
    const b = parse(z.object({ planId: z.string(), cycle: z.enum(['Monthly', 'Quarterly', 'Yearly']) }), req.body);
    const plan = (await db.query('SELECT * FROM plans WHERE id=$1 AND active', [b.planId])).rows[0];
    if (!plan || plan.id === 'Free') throw badRequest('Choose a paid plan');
    const user = (await db.query('SELECT * FROM users WHERE id=$1', [u.id])).rows[0];
    if (user.kyc_status !== 'Verified') throw new HttpError(409, 'kyc_required', 'Complete KYC before your first paid subscription.', { kycStatus: user.kyc_status });
    const amount = Number(plan.prices[b.cycle]);
    if (!amount) throw badRequest('This billing cycle is not available for the plan');
    const subId = `SUB-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    const order = await providers.payments.createOrder({ receipt: subId, amountInr: amount, notes: { userId: u.id, plan: plan.id, cycle: b.cycle } });
    await tx(db, async (c) => {
      await c.query(`INSERT INTO subscriptions (id, user_id, plan_id, billing_cycle, amount_inr, status, start_date, provider) VALUES ($1,$2,$3,$4,$5,'Created',CURRENT_DATE,$6)`, [subId, u.id, plan.id, b.cycle, amount, order.provider]);
      await c.query(`INSERT INTO payments (subscription_id, user_id, amount_inr, status, provider, provider_order_id) VALUES ($1,$2,$3,'created',$4,$5)`, [subId, u.id, amount, order.provider, order.orderId]);
    });
    return { subscriptionId: subId, plan: plan.id, cycle: b.cycle, amountInr: amount, order: { ...order, name: 'Mod Alpha', description: `${plan.name} · ${b.cycle}`, prefill: { name: user.full_name, email: user.email, contact: user.mobile } } };
  });

  // POST /billing/verify — check the gateway's checkout signature, then capture (the webhook may arrive first or
  // later).
  app.post('/billing/verify', async (req) => {
    const u = requireUser(req);
    const b = parse(z.object({ orderId: z.string(), paymentId: z.string(), signature: z.string() }), req.body);
    if (!providers.payments.verifyCheckoutSignature(b)) throw forbidden('Payment signature could not be verified');
    const p = (await db.query('SELECT user_id FROM payments WHERE provider_order_id=$1', [b.orderId])).rows[0];
    if (!p || p.user_id !== u.id) throw notFound('Unknown order');
    return capturePayment(deps, req, b);
  });

  // Stage-only: simulate the gateway confirming the payment (goes through the same signed-webhook path).
  // Stage only (404 in prod / with a real gateway): simulate the gateway's signed webhook for the test-payment
  // dialog.
  app.post('/billing/mock/complete', async (req) => {
    const u = requireUser(req);
    if (providers.payments.name !== 'mock' || cfg.APP_ENV === 'prod') throw notFound();
    const b = parse(z.object({ orderId: z.string(), outcome: z.enum(['success', 'failure']).default('success') }), req.body);
    const p = (await db.query('SELECT user_id, amount_inr FROM payments WHERE provider_order_id=$1', [b.orderId])).rows[0];
    if (!p || p.user_id !== u.id) throw notFound('Unknown order');
    const paymentId = `mock_pay_${crypto.randomUUID().slice(0, 12)}`;
    const body = JSON.stringify({ id: `evt_${paymentId}`, event: b.outcome === 'success' ? 'payment.captured' : 'payment.failed', orderId: b.orderId, paymentId, amountPaise: Math.round(p.amount_inr * 100) });
    const sig = crypto.createHmac('sha256', cfg.JWT_SECRET).update(body).digest('hex');
    const res = await app.inject({ method: 'POST', url: '/api/v1/webhooks/payments', payload: body, headers: { 'content-type': 'application/json', 'x-mock-signature': sig } });
    return { ...(res.json() as object), paymentId, signature: crypto.createHmac('sha256', cfg.JWT_SECRET).update(`${b.orderId}|${paymentId}`).digest('hex') };
  });

  // POST /webhooks/payments — called by the payment gateway. Signature verified on the raw body; each event id is
  // processed once (webhook_events).
  app.post('/webhooks/payments', { config: { rateLimit: false } }, async (req, reply) => {
    const raw = req.rawBody ?? JSON.stringify(req.body);
    const sig = (req.headers['x-razorpay-signature'] ?? req.headers['x-mock-signature']) as string | undefined;
    if (!providers.payments.verifyWebhook(raw, sig)) { await audit(db, req, { action: 'WEBHOOK_SIGNATURE_INVALID', category: 'Subscription', outcome: 'Blocked', actorLabel: 'payments' }); throw unauthorized('Invalid signature'); }
    const ev = providers.payments.parseWebhook(req.body);
    if (!ev) return reply.status(202).send({ ignored: true });
    const ins = await db.query(`INSERT INTO webhook_events (provider, event_id, type, payload) VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING RETURNING id`, [providers.payments.name, ev.eventId, ev.type, JSON.stringify(ev.raw)]);
    if (!ins.rows[0]) return { duplicate: true };
    try {
      if (ev.type === 'payment.captured' && ev.orderId && ev.paymentId) await capturePayment(deps, null, { orderId: ev.orderId, paymentId: ev.paymentId, raw: ev.raw });
      else if (ev.type === 'payment.failed' && ev.orderId) {
        const p = (await db.query(`UPDATE payments SET status='failed', raw=$2 WHERE provider_order_id=$1 AND status='created' RETURNING subscription_id, user_id`, [ev.orderId, JSON.stringify(ev.raw)])).rows[0];
        if (p) { await db.query(`UPDATE subscriptions SET status=CASE WHEN status='Created' THEN 'Expired' ELSE 'Past due' END, updated_at=now() WHERE id=$1`, [p.subscription_id]); await db.query(`INSERT INTO notifications (user_id, kind, title, body, link) VALUES ($1,'billing','Payment failed','Your payment could not be completed. Please try again.','#/user/subscription')`, [p.user_id]); }
      } else if (ev.type === 'refund.processed' && ev.paymentId) await db.query(`UPDATE payments SET status='refunded' WHERE provider_payment_id=$1`, [ev.paymentId]);
      else if (ev.type === 'subscription.cancelled' && ev.subscriptionRef) await db.query(`UPDATE subscriptions SET status='Cancelled', cancelled_at=now() WHERE provider_ref=$1`, [ev.subscriptionRef]);
      await db.query('UPDATE webhook_events SET processed_at=now() WHERE id=$1', [ins.rows[0].id]);
    } catch (e: any) { await db.query('UPDATE webhook_events SET error=$2 WHERE id=$1', [ins.rows[0].id, String(e.message)]); throw e; }
    return { processed: true };
  });

  // GET /billing/subscription — the current subscription (or null).
  app.get('/billing/subscription', async (req) => { const u = requireUser(req); return { subscription: await currentSubscription(db, u.id) }; });
  // Cancel at period end: access continues until the renewal date. The optional survey (reason + comment) is kept
  // for the product team.
  const REASONS = ['too_expensive', 'not_using', 'missing_feature', 'found_alternative', 'temporary', 'other'] as const;
  app.post('/billing/subscriptions/:id/cancel', async (req) => {
    const u = requireUser(req);
    const b = parse(z.object({ reason: z.enum(REASONS).optional(), comment: z.string().trim().max(1000).optional() }), req.body ?? {});
    const r = await db.query(`UPDATE subscriptions SET cancel_at_period_end=true, cancel_reason=coalesce($3, cancel_reason), cancel_comment=coalesce($4, cancel_comment), updated_at=now() WHERE id=$1 AND user_id=$2 AND status IN ('Active','Past due') RETURNING id, renewal_date`, [(req.params as any).id, u.id, b.reason ?? null, b.comment || null]);
    if (!r.rows[0]) throw notFound('No active subscription with this id');
    await audit(db, req, { action: 'SUBSCRIPTION_CANCEL_REQUESTED', category: 'Subscription', resource: r.rows[0].id, meta: { reason: b.reason ?? null } });
    return { ok: true, endsOn: r.rows[0].renewal_date, message: 'Your plan stays active until the end of the current billing period.' };
  });
  // Keep the plan: undo a cancellation before the period ends.
  app.post('/billing/subscriptions/:id/resume', async (req) => {
    const u = requireUser(req);
    const r = await db.query(`UPDATE subscriptions SET cancel_at_period_end=false, updated_at=now() WHERE id=$1 AND user_id=$2 AND status='Active' AND cancel_at_period_end RETURNING id, renewal_date`, [(req.params as any).id, u.id]);
    if (!r.rows[0]) throw notFound('No cancelled subscription to resume');
    await audit(db, req, { action: 'SUBSCRIPTION_RESUMED', category: 'Subscription', resource: r.rows[0].id });
    return { ok: true, renewsOn: r.rows[0].renewal_date, message: 'Your plan will renew as usual.' };
  });
  // ---- plan changes (docs/29_subscription_rules.md, logic in plan-change.ts)
  const planRows = async () => (await db.query('SELECT id, name, sort, prices FROM plans WHERE active')).rows as Plan[];
  const changeBody = z.object({ planId: z.string(), cycle: z.enum(['Monthly', 'Quarterly', 'Yearly']) });
  // GET /billing/change/preview?planId=Premium&cycle=Monthly — what the change would cost and when it applies.
  app.get('/billing/change/preview', async (req) => {
    const u = requireUser(req);
    const b = parse(changeBody, req.query);
    return { preview: previewChange(await currentSubscription(db, u.id) as Sub | null, await planRows(), b, todayIST()) };
  });
  // POST /billing/change — upgrade: a gateway order for the prorated amount (paid through the normal checkout);
  // downgrade / shorter cycle: scheduled for the renewal date; to Free: cancel at period end.
  app.post('/billing/change', async (req) => {
    const u = requireUser(req);
    const b = parse(changeBody, req.body);
    const sub = await currentSubscription(db, u.id);
    const pv = previewChange(sub as Sub | null, await planRows(), b, todayIST());
    if (pv.kind === 'same' || pv.kind === 'blocked') throw badRequest(pv.message);
    if (pv.kind === 'new') throw new HttpError(409, 'use_checkout', 'Start a new subscription through checkout.');
    if (pv.kind === 'scheduled') {
      if (pv.toFree) await db.query(`UPDATE subscriptions SET cancel_at_period_end=true, pending_plan_id=NULL, pending_cycle=NULL, pending_amount_inr=NULL, updated_at=now() WHERE id=$1`, [sub.id]);
      else await db.query(`UPDATE subscriptions SET pending_plan_id=$2, pending_cycle=$3, pending_amount_inr=$4, pending_requested_at=now(), cancel_at_period_end=false, updated_at=now() WHERE id=$1`, [sub.id, pv.to.plan, pv.to.cycle, pv.nextAmount]);
      await audit(db, req, { action: 'SUBSCRIPTION_CHANGE_SCHEDULED', category: 'Subscription', resource: sub.id, meta: pv });
      return { scheduled: true, preview: pv };
    }
    const user = (await db.query('SELECT full_name, email, mobile FROM users WHERE id=$1', [u.id])).rows[0];
    const order = await providers.payments.createOrder({ receipt: `${sub.id}-UP`, amountInr: pv.chargeNow, notes: { userId: u.id, plan: pv.to.plan, cycle: pv.to.cycle, kind: 'upgrade' } });
    await db.query(`INSERT INTO payments (subscription_id, user_id, amount_inr, status, provider, provider_order_id, kind, meta) VALUES ($1,$2,$3,'created',$4,$5,'upgrade',$6)`, [sub.id, u.id, pv.chargeNow, order.provider, order.orderId, JSON.stringify(pv)]);
    return { subscriptionId: sub.id, plan: pv.to.plan, cycle: pv.to.cycle, amountInr: pv.chargeNow, preview: pv, order: { ...order, name: 'Mod Alpha', description: `Upgrade to ${pv.to.plan} · ${pv.to.cycle}`, prefill: { name: user.full_name, email: user.email, contact: user.mobile } } };
  });
  // POST /billing/change/undo — drop a scheduled downgrade / cycle change before it applies.
  app.post('/billing/change/undo', async (req) => {
    const u = requireUser(req);
    const r = await db.query(`UPDATE subscriptions SET pending_plan_id=NULL, pending_cycle=NULL, pending_amount_inr=NULL, pending_requested_at=NULL, updated_at=now() WHERE user_id=$1 AND status IN ('Active','Past due') AND pending_plan_id IS NOT NULL RETURNING id`, [u.id]);
    if (!r.rows[0]) throw notFound('No scheduled change to undo');
    await audit(db, req, { action: 'SUBSCRIPTION_CHANGE_UNDONE', category: 'Subscription', resource: r.rows[0].id });
    return { ok: true };
  });

  // Invoices and credit notes of the signed-in user, newest first (type: 'invoice' | 'credit_note').
  app.get('/billing/invoices', async (req) => {
    const u = requireUser(req);
    const inv = (await db.query(`SELECT 'invoice' AS type, i.id, i.number, i.amount_inr, i.gst_inr, i.issued_at, s.plan_id, s.billing_cycle, NULL::text AS against FROM invoices i LEFT JOIN payments p ON p.id=i.payment_id LEFT JOIN subscriptions s ON s.id=p.subscription_id WHERE i.user_id=$1`, [u.id])).rows;
    const cn = (await db.query(`SELECT 'credit_note' AS type, c.id, c.number, c.amount_inr, (c.cgst_inr+c.sgst_inr+c.igst_inr) AS gst_inr, c.issued_at, s.plan_id, s.billing_cycle, i.number AS against FROM credit_notes c LEFT JOIN invoices i ON i.id=c.invoice_id LEFT JOIN payments p ON p.id=c.payment_id LEFT JOIN subscriptions s ON s.id=p.subscription_id WHERE c.user_id=$1`, [u.id])).rows;
    return { items: [...inv, ...cn].sort((a, b) => +new Date(b.issued_at) - +new Date(a.issued_at)) };
  });
  // One credit note (own only; admins any), and its PDF.
  async function loadCreditNote(req: FastifyRequest) {
    const u = requireUser(req);
    const r = await db.query(`SELECT c.*, i.number AS invoice_number, i.issued_at AS invoice_date, i.description AS invoice_description, i.period_start, i.period_end FROM credit_notes c LEFT JOIN invoices i ON i.id=c.invoice_id WHERE c.id=$1 AND (c.user_id=$2 OR $3)`, [(req.params as any).id, u.id, u.role !== 'user']);
    if (!r.rows[0]) throw notFound();
    return creditNoteView(cfg, r.rows[0]);
  }
  app.get('/billing/credit-notes/:id', async (req) => ({ creditNote: await loadCreditNote(req) }));
  app.get('/billing/credit-notes/:id/pdf', async (req, reply) => {
    const v = await loadCreditNote(req);
    reply.header('content-type', 'application/pdf').header('content-disposition', `attachment; filename="Mod-Alpha-credit-note-${v.number.replace(/\//g, '-')}.pdf"`);
    return reply.send(invoicePdf(v));
  });
  // One invoice (own invoices only; admins any) with the GST breakdown.
  async function loadInvoice(req: FastifyRequest) {
    const u = requireUser(req);
    const r = await db.query(`SELECT i.*, u.full_name, u.email, u.mobile, s.plan_id, s.billing_cycle, p.provider_payment_id, p.paid_on FROM invoices i JOIN users u ON u.id=i.user_id LEFT JOIN payments p ON p.id=i.payment_id LEFT JOIN subscriptions s ON s.id=p.subscription_id WHERE i.id=$1 AND (i.user_id=$2 OR $3)`, [(req.params as any).id, u.id, u.role !== 'user']);
    if (!r.rows[0]) throw notFound();
    return invoiceView(cfg, r.rows[0]);
  }
  app.get('/billing/invoices/:id', async (req) => ({ invoice: await loadInvoice(req) }));
  // The GST tax invoice as a PDF file (A4).
  app.get('/billing/invoices/:id/pdf', async (req, reply) => {
    const v = await loadInvoice(req);
    reply.header('content-type', 'application/pdf').header('content-disposition', `attachment; filename="Mod-Alpha-invoice-${v.number.replace(/\//g, '-')}.pdf"`);
    return reply.send(invoicePdf(v));
  });

  // ---- admin
  // Admin: change a plan's prices / features. Keeps the previous version and writes PLAN_UPDATED to the audit log.
  app.put('/admin/plans/:id', async (req) => {
    requireAdmin(req);
    const b = parse(z.object({ name: z.string().min(2).optional(), tagline: z.string().max(120).optional(), prices: z.object({ Monthly: z.number().min(0), Quarterly: z.number().min(0), Yearly: z.number().min(0) }).optional(), features: z.array(z.string().min(1)).min(1).optional(), limits: z.record(z.number()).optional(), active: z.boolean().optional() }).strict(), req.body);
    const id = (req.params as any).id;
    if (id !== 'Free' && b.prices && !b.prices.Monthly) throw badRequest('Monthly price cannot be 0 for a paid plan');
    const r = await db.query(`UPDATE plans SET name=coalesce($2,name), tagline=coalesce($3,tagline), prices=coalesce($4,prices), features=coalesce($5,features), limits=coalesce($6,limits), active=coalesce($7,active), version=version+1, updated_at=now() WHERE id=$1 RETURNING *`, [id, b.name ?? null, b.tagline ?? null, b.prices ? JSON.stringify(b.prices) : null, b.features ? JSON.stringify(b.features) : null, b.limits ? JSON.stringify(b.limits) : null, b.active ?? null]);
    if (!r.rows[0]) throw notFound('Plan not found');
    await audit(db, req, { action: 'PLAN_CONFIGURATION_UPDATED', category: 'Configuration', resource: id, meta: b });
    return { plan: planView(r.rows[0]) };
  });
  // Super admin: refund a payment through the gateway and record it.
  app.post('/admin/payments/:id/refund', async (req) => {
    requireAdmin(req);
    const b = parse(z.object({ amountInr: z.number().positive(), reason: z.string().min(3) }), req.body);
    const p = (await db.query('SELECT * FROM payments WHERE id=$1', [(req.params as any).id])).rows[0];
    if (!p || p.status !== 'captured') throw notFound('Captured payment not found');
    if (b.amountInr > p.amount_inr - p.refunded_inr) throw badRequest('Refund exceeds the refundable amount');
    const ref = await providers.payments.refund(p.provider_payment_id, b.amountInr);
    // every refund gets a GST credit note against the original invoice (CGST Act s.34; docs/29)
    const cn = await tx(db, async (c) => {
      await c.query(`UPDATE payments SET refunded_inr=refunded_inr+$2, status=CASE WHEN refunded_inr+$2 >= amount_inr THEN 'refunded' ELSE status END WHERE id=$1`, [p.id, b.amountInr]);
      return issueCreditNote(c, cfg, { paymentId: p.id, userId: p.user_id, amount: b.amountInr, reason: b.reason, refundRef: ref, date: todayIST() });
    });
    if (p.user_id) await db.query(`INSERT INTO notifications (user_id, kind, title, body, link) VALUES ($1,'billing','Refund issued',$2,'#/user/subscription')`, [p.user_id, `₹${b.amountInr} is on its way back to your original payment method (usually 5–7 working days). Credit note ${cn.number} is in Billing history.`]);
    await audit(db, req, { action: 'PAYMENT_REFUNDED', category: 'Subscription', resource: p.id, meta: { amount: b.amountInr, reason: b.reason, ref, creditNote: cn.number } });
    return { ok: true, refundRef: ref, creditNote: cn };
  });
}
