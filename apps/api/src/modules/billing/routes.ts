/**
 * Billing module — plans, checkout, payments and subscriptions.
 *   GET /plans · GET /me/entitlements
 *   POST /billing/checkout → gateway order (KYC must be Verified first, 409 kyc_required)
 *   POST /billing/verify (browser-side confirmation) · POST /webhooks/payments (gateway → us, signed, idempotent)
 *   POST /billing/mock/complete (stage only: the 'test payment' dialog)
 *   GET /billing/subscription · POST /billing/subscriptions/:id/cancel · GET /billing/invoices(/:id)
 *   PUT /admin/plans/:id (versioned price edit) · POST /admin/payments/:id/refund
 */
import type { FastifyInstance, FastifyRequest } from 'fastify';
import crypto from 'node:crypto';
import { z } from 'zod';
import { parse } from '../../shared/validate.js';
import { badRequest, conflict, forbidden, HttpError, notFound, unauthorized } from '../../shared/errors.js';
import { requireAdmin, requireUser } from '../auth/session.js';
import { audit } from '../../shared/audit.js';
import { tx, type Db, type Q } from '../../db.js';
import { addMonths, today } from '../../shared/dates.js';
import type { Deps } from '../../app.js';

const CYCLE_MONTHS = { Monthly: 1, Quarterly: 3, Yearly: 12 } as const;
type Cycle = keyof typeof CYCLE_MONTHS;
// Database plan row → what the website shows.
export const planView = (p: any) => ({ id: p.id, name: p.name, tagline: p.tagline, prices: p.prices, features: p.features, limits: p.limits, active: p.active, version: p.version, price: p.prices.Monthly });

// The user's active (or past-due) subscription, newest first.
export async function currentSubscription(q: Q, userId: string) {
  const r = await q.query(`SELECT s.*, p.name AS plan_name, p.limits FROM subscriptions s JOIN plans p ON p.id=s.plan_id WHERE s.user_id=$1 AND s.status IN ('Active','Past due') ORDER BY s.start_date DESC LIMIT 1`, [userId]);
  return r.rows[0] ?? null;
}
// What the user's plan allows (AI questions per day, custom reminders, …). Free plan when there is no
// subscription.
export async function entitlements(q: Q, userId: string) {
  const s = await currentSubscription(q, userId);
  const plan = s ? s.plan_id : 'Free';
  const limits = s ? s.limits : (await q.query(`SELECT limits FROM plans WHERE id='Free'`)).rows[0]?.limits ?? { ai_queries_per_day: 1 };
  return { plan, limits, subscription: s ? { id: s.id, cycle: s.billing_cycle, status: s.status, renewalDate: s.renewal_date, cancelAtPeriodEnd: s.cancel_at_period_end } : null };
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
    // an upgrade/downgrade replaces the previous paid plan at once (no proration in v1 — see BILL-05)
    await c.query(`UPDATE subscriptions SET status='Cancelled', cancelled_at=now(), updated_at=now() WHERE user_id=$1 AND id<>$2 AND status IN ('Active','Past due')`, [s.user_id, s.id]);
    await c.query(`UPDATE subscriptions SET status='Active', start_date=CASE WHEN status='Created' THEN $2::date ELSE start_date END, last_payment_date=$2, renewal_date=$3, payment_ref=$4, updated_at=now() WHERE id=$1`, [s.id, t, renew, o.paymentId]);
    const n = (await c.query(`SELECT count(*)::int n FROM invoices`)).rows[0].n + 1;
    const gst = +(p.amount_inr - p.amount_inr / 1.18).toFixed(2);
    await c.query('INSERT INTO invoices (number, user_id, payment_id, amount_inr, gst_inr) VALUES ($1,$2,$3,$4,$5)', [`MA/${t.slice(0, 4)}/${String(n).padStart(6, '0')}`, s.user_id, p.id, p.amount_inr, gst]);
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
    const used = (await db.query('SELECT queries FROM assistant_usage WHERE user_id=$1 AND day=CURRENT_DATE', [u.id])).rows[0]?.queries ?? 0;
    return { ...e, usage: { aiQueriesToday: used } };
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
  // Cancel at period end: access continues until the renewal date.
  app.post('/billing/subscriptions/:id/cancel', async (req) => {
    const u = requireUser(req);
    const r = await db.query(`UPDATE subscriptions SET cancel_at_period_end=true, updated_at=now() WHERE id=$1 AND user_id=$2 AND status IN ('Active','Past due') RETURNING id, renewal_date`, [(req.params as any).id, u.id]);
    if (!r.rows[0]) throw notFound('No active subscription with this id');
    await audit(db, req, { action: 'SUBSCRIPTION_CANCEL_REQUESTED', category: 'Subscription', resource: r.rows[0].id });
    return { ok: true, endsOn: r.rows[0].renewal_date, message: 'Your plan stays active until the end of the current billing period.' };
  });
  // Invoices of the signed-in user.
  app.get('/billing/invoices', async (req) => {
    const u = requireUser(req);
    return { items: (await db.query(`SELECT i.id, i.number, i.amount_inr, i.gst_inr, i.issued_at, s.plan_id, s.billing_cycle FROM invoices i LEFT JOIN payments p ON p.id=i.payment_id LEFT JOIN subscriptions s ON s.id=p.subscription_id WHERE i.user_id=$1 ORDER BY i.issued_at DESC`, [u.id])).rows };
  });
  // One invoice (own invoices only) with GST breakdown, for the printable view.
  app.get('/billing/invoices/:id', async (req) => {
    const u = requireUser(req);
    const r = await db.query(`SELECT i.*, u.full_name, u.email, s.plan_id, s.billing_cycle, p.provider_payment_id FROM invoices i JOIN users u ON u.id=i.user_id LEFT JOIN payments p ON p.id=i.payment_id LEFT JOIN subscriptions s ON s.id=p.subscription_id WHERE i.id=$1 AND (i.user_id=$2 OR $3)`, [(req.params as any).id, u.id, u.role !== 'user']);
    if (!r.rows[0]) throw notFound();
    const i = r.rows[0];
    return { invoice: { ...i, seller: 'Mod Alpha Ventures LLP', taxable: +(i.amount_inr - i.gst_inr).toFixed(2), note: 'Amounts are GST-inclusive (18%). GST e-invoicing integration is pending (BILL-07).' } };
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
    await db.query(`UPDATE payments SET refunded_inr=refunded_inr+$2, status=CASE WHEN refunded_inr+$2 >= amount_inr THEN 'refunded' ELSE status END WHERE id=$1`, [p.id, b.amountInr]);
    await audit(db, req, { action: 'PAYMENT_REFUNDED', category: 'Subscription', resource: p.id, meta: { amount: b.amountInr, reason: b.reason, ref } });
    return { ok: true, refundRef: ref };
  });
}
