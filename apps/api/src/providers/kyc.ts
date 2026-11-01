/**
 * KYC / identity verification — provider adapter.
 * Switch: KYC_PROVIDER = mock | digio (credentials in env; see docs/23_mocks_and_replacements.md).
 * Mock: redirects to a stage page with Approve / Reject that posts a signed webhook. Real: Digio KYC request + webhook.
 */
import crypto from 'node:crypto';
import { type Ctx, http, hmac, safeEq } from './shared.js';

export interface KycProvider {
  name: string;
  start(u: { userId: string; name: string; email?: string | null; mobile?: string | null }): Promise<{ ref: string; redirectUrl: string }>;
  verifyWebhook(rawBody: string, signature: string | undefined): boolean;
  parseWebhook(body: any): { ref: string; status: 'Verified' | 'Rejected' | 'In review'; reason?: string } | null;
}
export const mockKyc = (ctx: Ctx): KycProvider => ({
  name: 'mock',
  async start(u) { const ref = `mock_kyc_${crypto.randomUUID().slice(0, 12)}`; return { ref, redirectUrl: `${ctx.cfg.PUBLIC_APP_URL}/#/kyc/mock?ref=${ref}` }; },
  verifyWebhook: (raw, sig) => !!sig && safeEq(sig, hmac(ctx.cfg.JWT_SECRET, raw)),
  parseWebhook: (b) => (b?.ref ? { ref: b.ref, status: b.status, reason: b.reason } : null),
});
export const digio = (ctx: Ctx): KycProvider => {
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
