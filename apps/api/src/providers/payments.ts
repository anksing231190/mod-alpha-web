/**
 * Payments (checkout, webhooks, refunds) — provider adapter.
 * Switch: PAYMENT_PROVIDER = mock | razorpay (credentials in env; see docs/23_mocks_and_replacements.md).
 * Mock: fake order + HMAC-signed webhook posted by the stage "test payment" dialog, processed by the same code as Razorpay. Real: Razorpay Orders, checkout signature, webhooks, refunds.
 */
import crypto from 'node:crypto';
import { type Ctx, outbox, http, hmac, safeEq } from './shared.js';

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
export const mockPayments = (ctx: Ctx): PaymentProvider => ({
  name: 'mock',
  async createOrder(o) { return { provider: 'mock', orderId: `mock_order_${crypto.randomUUID().slice(0, 12)}`, amountPaise: Math.round(o.amountInr * 100), currency: 'INR', mockConfirm: true }; },
  verifyCheckoutSignature: (o) => o.signature === hmac(ctx.cfg.JWT_SECRET, `${o.orderId}|${o.paymentId}`),
  verifyWebhook: (raw, sig) => !!sig && safeEq(sig, hmac(ctx.cfg.JWT_SECRET, raw)),
  parseWebhook: (b) => b && b.event ? { eventId: b.id, type: b.event, orderId: b.orderId, paymentId: b.paymentId, amountPaise: b.amountPaise, raw: b } : null,
  async refund(paymentId, amountInr) { return outbox(ctx, 'mock', 'refund', paymentId, `Refund ₹${amountInr}`); },
});
export const razorpay = (ctx: Ctx): PaymentProvider => {
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
