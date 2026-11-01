/**
 * KYC / identity verification — provider adapter.
 * Switch: KYC_PROVIDER = mock | digio (credentials in env; see docs/23_mocks_and_replacements.md).
 * Mock: redirects to a stage page with Approve / Reject that posts a signed webhook. Real: Digio KYC request + webhook.
 *
 * PAN-first flow (SEBI intermediaries): verifyPan() → kraLookup() → (no KRA record) start() full KYC.
 * Mock test PANs (stage / local only — any name and date of birth):
 *   ABCDE1234F  valid, KYC record found in the KRA      → verified at once
 *   ABCDE5678G  valid, no KRA record                    → full KYC (DigiLocker) needed
 *   …0000X      (e.g. ABCDE0000X) PAN not found          → fails, user can correct it
 *   any other well-formed PAN behaves like ABCDE5678G.
 */
import crypto from 'node:crypto';
import { type Ctx, http, hmac, safeEq } from './shared.js';
import { upstream } from '../shared/errors.js';

/** Result of checking a PAN with the Income Tax database (through the provider). */
export interface PanCheck { valid: boolean; nameMatch: boolean; dobMatch: boolean; reason?: string }
/** Result of looking a PAN up in the KYC registration agencies (CVL, NDML, CAMS, …). */
export interface KraLookup { found: boolean; kraRef?: string; agency?: string }

export interface KycProvider {
  name: string;
  /** Check PAN + name + date of birth (YYYY-MM-DD). */
  verifyPan(p: { pan: string; name: string; dob: string }): Promise<PanCheck>;
  /** Is there already a valid KYC record for this PAN in a KRA? */
  kraLookup(pan: string): Promise<KraLookup>;
  /** Start full KYC (DigiLocker Aadhaar, selfie, e-sign) — returns the provider page to send the user to. */
  start(u: { userId: string; name: string; email?: string | null; mobile?: string | null }): Promise<{ ref: string; redirectUrl: string }>;
  verifyWebhook(rawBody: string, signature: string | undefined): boolean;
  parseWebhook(body: any): { ref: string; status: 'Verified' | 'Rejected' | 'In review'; reason?: string; kraRef?: string } | null;
}
export const mockKyc = (ctx: Ctx): KycProvider => ({
  name: 'mock',
  async verifyPan(p) {
    if (/0000[A-Z]$/.test(p.pan)) return { valid: false, nameMatch: false, dobMatch: false, reason: 'PAN not found in the Income Tax database (test PAN ending 0000X).' };
    return { valid: true, nameMatch: true, dobMatch: true };
  },
  async kraLookup(pan) { return pan === 'ABCDE1234F' ? { found: true, kraRef: `MOCKKRA${pan.slice(-5)}`, agency: 'CVL KRA (test)' } : { found: false }; },
  async start(u) { const ref = `mock_kyc_${crypto.randomUUID().slice(0, 12)}`; return { ref, redirectUrl: `${ctx.cfg.PUBLIC_APP_URL}/#/kyc/mock?ref=${ref}` }; },
  verifyWebhook: (raw, sig) => !!sig && safeEq(sig, hmac(ctx.cfg.JWT_SECRET, raw)),
  parseWebhook: (b) => (b?.ref ? { ref: b.ref, status: b.status, reason: b.reason, kraRef: b.kraRef } : null),
});
export const digio = (ctx: Ctx): KycProvider => {
  const auth = 'Basic ' + Buffer.from(`${ctx.cfg.DIGIO_CLIENT_ID}:${ctx.cfg.DIGIO_CLIENT_SECRET}`).toString('base64');
  // PAN verification and KRA fetch are separate Digio products; their endpoints and payloads come with the
  // Digio contract (see TODO.md §1). Until they are configured these calls fail clearly instead of guessing.
  const notConfigured = (what: string) => upstream(`${what} is not configured for Digio yet — add the endpoint from the Digio onboarding pack (TODO.md §1).`);
  return {
    name: 'digio',
    async verifyPan() { throw notConfigured('PAN verification'); },
    async kraLookup() { throw notConfigured('KRA lookup'); },
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
