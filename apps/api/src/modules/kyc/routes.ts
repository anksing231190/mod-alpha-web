/**
 * KYC module — identity verification before the first paid subscription.
 *   POST /kyc/pan { pan, name, dob, consent } — PAN-first KYC (SEBI): PAN check → KRA lookup →
 *        Verified at once (KRA record) or full KYC with the provider (DigiLocker) → redirect URL
 *   GET /kyc/status · POST /kyc/sessions (older flow: start full KYC directly)
 *   POST /webhooks/kyc (provider → us, signed) · POST /kyc/mock/complete (stage only)
 *   POST /admin/kyc/:userId/decision (manual approve / reject, audited)
 * Only the outcome is stored (status, method, masked PAN, PAN hash, KRA reference, match flags) — never the full
 * PAN, the Aadhaar number or document images (migration 005).
 */
import type { FastifyInstance } from 'fastify';
import crypto from 'node:crypto';
import { z } from 'zod';
import { parse } from '../../shared/validate.js';
import { HttpError, notFound, tooMany, unauthorized } from '../../shared/errors.js';
import { requireAdmin, requireUser } from '../auth/session.js';
import { audit } from '../../shared/audit.js';
import type { Q } from '../../db.js';

// Record a KYC result: update the KYC session and the user's kyc_status, and notify the user in the app.
async function applyStatus(q: Q, ref: string, status: string, reason?: string, decidedBy?: string, kraRef?: string) {
  const s = (await q.query(`UPDATE kyc_sessions SET status=$2, reason=$3, decided_by=$4, kra_ref=coalesce($5, kra_ref), updated_at=now() WHERE provider_ref=$1 RETURNING user_id`, [ref, status, reason ?? null, decidedBy ?? null, kraRef ?? null])).rows[0];
  if (!s) return null;
  await q.query('UPDATE users SET kyc_status=$2, updated_at=now() WHERE id=$1', [s.user_id, status]);
  await q.query(`INSERT INTO notifications (user_id, kind, title, body, link) VALUES ($1,'kyc',$2,$3,'#/user/subscription')`, [s.user_id, status === 'Verified' ? 'KYC verified' : status === 'Rejected' ? 'KYC could not be verified' : 'KYC in review', status === 'Verified' ? 'You can now subscribe to a paid plan.' : reason ?? 'We will update you shortly.']);
  return s.user_id;
}

export default async function kyc(app: FastifyInstance) {
  const { db, providers, cfg } = app.deps;
  // GET /kyc/status — the user's KYC state and latest provider session.
  app.get('/kyc/status', async (req) => {
    const u = requireUser(req);
    const r = await db.query(`SELECT u.kyc_status, k.status, k.provider, k.redirect_url, k.updated_at, k.reason, k.method, k.pan_masked, k.kra_ref FROM users u LEFT JOIN LATERAL (SELECT * FROM kyc_sessions WHERE user_id=u.id ORDER BY created_at DESC LIMIT 1) k ON true WHERE u.id=$1`, [u.id]);
    return r.rows[0];
  });
  /** Masked PAN for display: ABCDE1234F → ABCDE••••F. */
  const maskPan = (p: string) => `${p.slice(0, 5)}••••${p.slice(-1)}`;
  /** One-way fingerprint of a PAN (detects the same PAN on two accounts without storing it). */
  const panHash = (p: string) => crypto.createHmac('sha256', cfg.JWT_SECRET).update(`pan:${p}`).digest('hex');

  /**
   * POST /kyc/pan — PAN-first KYC.
   *  1. format + consent check, at most 5 attempts per user per 24 h
   *  2. same PAN already verified on ANOTHER account → 'In review' for an admin (KYC_DUPLICATE_PAN)
   *  3. provider checks PAN + name + date of birth; a mismatch is recorded and returned as 400 pan_invalid
   *  4. KRA record found → Verified now (method 'kra'); otherwise full KYC → { status: 'Pending', redirectUrl }
   */
  app.post('/kyc/pan', { config: { rateLimit: { max: cfg.APP_ENV === 'test' ? 1000 : 10, timeWindow: '1 minute' } } }, async (req) => {
    const u = requireUser(req);
    const b = parse(z.object({
      pan: z.string().trim().toUpperCase().regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/, 'Enter a valid PAN (5 letters, 4 digits, 1 letter — e.g. ABCDE1234F)'),
      name: z.string().trim().min(2, 'Enter your name as printed on your PAN card').max(100),
      dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Enter your date of birth'),
      consent: z.literal(true, { errorMap: () => ({ message: 'Please give your consent to verify your PAN and KYC records' }) }),
    }), req.body);
    const user = (await db.query('SELECT * FROM users WHERE id=$1', [u.id])).rows[0];
    if (user.kyc_status === 'Verified') return { status: 'Verified' };
    const tries = (await db.query(`SELECT count(*)::int n FROM kyc_sessions WHERE user_id=$1 AND pan_hash IS NOT NULL AND created_at > now() - interval '24 hours'`, [u.id])).rows[0].n;
    if (tries >= 5) throw tooMany('Too many PAN attempts today. Try again tomorrow or contact support.');
    const hash = panHash(b.pan), masked = maskPan(b.pan);
    const ref = () => `pan_${crypto.randomUUID().slice(0, 12)}`;
    const record = (status: string, extra: Record<string, unknown> = {}) => db.query(
      `INSERT INTO kyc_sessions (user_id, provider, provider_ref, status, redirect_url, method, pan_masked, pan_hash, kra_ref, name_match, dob_match, consent_at, reason)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11, now(), $12)`,
      [u.id, providers.kyc.name, extra.ref ?? ref(), status, extra.redirectUrl ?? null, extra.method ?? null, masked, hash, extra.kraRef ?? null, extra.nameMatch ?? null, extra.dobMatch ?? null, extra.reason ?? null]);
    await audit(db, req, { action: 'KYC_PAN_SUBMITTED', category: 'Account', resource: u.id, meta: { pan: masked } });

    // the same PAN verified on another account → manual review
    const dup = (await db.query(`SELECT 1 FROM kyc_sessions k JOIN users x ON x.id=k.user_id WHERE k.pan_hash=$1 AND k.user_id<>$2 AND x.kyc_status='Verified' LIMIT 1`, [hash, u.id])).rows[0];
    if (dup) {
      await record('In review', { reason: 'PAN already verified on another account' });
      await db.query(`UPDATE users SET kyc_status='In review' WHERE id=$1`, [u.id]);
      await audit(db, req, { action: 'KYC_DUPLICATE_PAN', category: 'Account', resource: u.id, outcome: 'Blocked', meta: { pan: masked } });
      return { status: 'In review', message: 'This PAN is already linked to another Mod Alpha account. Our team will review it within 1 business day.' };
    }
    const chk = await providers.kyc.verifyPan({ pan: b.pan, name: b.name, dob: b.dob });
    if (!chk.valid || !chk.nameMatch || !chk.dobMatch) {
      const reason = !chk.valid ? (chk.reason || 'PAN could not be verified') : !chk.nameMatch ? 'Name does not match the PAN record' : 'Date of birth does not match the PAN record';
      await record('Rejected', { method: 'pan', reason, nameMatch: chk.nameMatch, dobMatch: chk.dobMatch });
      await audit(db, req, { action: 'KYC_PAN_FAILED', category: 'Account', resource: u.id, outcome: 'Blocked', meta: { pan: masked, reason } });
      throw new HttpError(400, 'pan_invalid', `${reason}. Check the details and try again.`, { nameMatch: chk.nameMatch, dobMatch: chk.dobMatch });
    }
    const kra = await providers.kyc.kraLookup(b.pan);
    if (kra.found) {
      const r = ref();
      await record('Pending', { ref: r, method: 'kra', kraRef: kra.kraRef, nameMatch: true, dobMatch: true });
      await applyStatus(db, r, 'Verified', undefined, undefined, kra.kraRef);
      await audit(db, req, { action: 'KYC_KRA_MATCH', category: 'Account', resource: u.id, meta: { pan: masked, agency: kra.agency } });
      return { status: 'Verified', method: 'kra', panMasked: masked };
    }
    const s = await providers.kyc.start({ userId: u.id, name: b.name, email: user.email, mobile: user.mobile });
    await record('Pending', { ref: s.ref, redirectUrl: s.redirectUrl, method: 'digilocker', nameMatch: true, dobMatch: true });
    await db.query(`UPDATE users SET kyc_status='Pending' WHERE id=$1 AND kyc_status IN ('Not started','Rejected')`, [u.id]);
    await audit(db, req, { action: 'KYC_FULL_STARTED', category: 'Account', resource: u.id, meta: { pan: masked } });
    return { status: 'Pending', next: 'digilocker', redirectUrl: s.redirectUrl, panMasked: masked };
  });

  // POST /kyc/sessions — start (or restart after rejection) verification with the provider.
  app.post('/kyc/sessions', async (req) => {
    const u = requireUser(req);
    const row = (await db.query('SELECT * FROM users WHERE id=$1', [u.id])).rows[0];
    if (row.kyc_status === 'Verified') return { status: 'Verified' };
    const s = await providers.kyc.start({ userId: u.id, name: row.full_name, email: row.email, mobile: row.mobile });
    await db.query(`INSERT INTO kyc_sessions (user_id, provider, provider_ref, status, redirect_url) VALUES ($1,$2,$3,'Pending',$4)`, [u.id, providers.kyc.name, s.ref, s.redirectUrl]);
    await db.query(`UPDATE users SET kyc_status='Pending' WHERE id=$1 AND kyc_status IN ('Not started','Rejected')`, [u.id]);
    return { status: 'Pending', redirectUrl: s.redirectUrl, ref: s.ref, provider: providers.kyc.name };
  });
  // POST /webhooks/kyc — provider result. Signature checked on the raw body; the result is audited.
  app.post('/webhooks/kyc', { config: { rateLimit: false } }, async (req) => {
    const raw = req.rawBody ?? JSON.stringify(req.body);
    if (!providers.kyc.verifyWebhook(raw, (req.headers['x-digio-signature'] ?? req.headers['x-mock-signature']) as string)) throw unauthorized('Invalid signature');
    const ev = providers.kyc.parseWebhook(req.body);
    if (!ev) return { ignored: true };
    const userId = await applyStatus(db, ev.ref, ev.status, ev.reason, undefined, ev.kraRef);
    if (userId) await audit(db, null, { action: `KYC_${ev.status.toUpperCase().replace(' ', '_')}`, category: 'Account', resource: userId, actorLabel: `kyc:${providers.kyc.name}` });
    return { ok: !!userId };
  });
  // Stage-only: the mock KYC page posts the decision through the same signed webhook path.
  // Stage only: the mock KYC page's Approve / Reject buttons post through the same signed webhook path.
  app.post('/kyc/mock/complete', async (req) => {
    const u = requireUser(req);
    if (providers.kyc.name !== 'mock' || cfg.APP_ENV === 'prod') throw notFound();
    const b = parse(z.object({ ref: z.string(), decision: z.enum(['Verified', 'Rejected']) }), req.body);
    const own = await db.query('SELECT 1 FROM kyc_sessions WHERE provider_ref=$1 AND user_id=$2', [b.ref, u.id]); if (!own.rows[0]) throw notFound();
    const body = JSON.stringify({ ref: b.ref, status: b.decision, reason: b.decision === 'Rejected' ? 'Name mismatch (test)' : undefined, kraRef: b.decision === 'Verified' ? `MOCKKRA${b.ref.slice(-6).toUpperCase()}` : undefined });
    const res = await app.inject({ method: 'POST', url: '/api/v1/webhooks/kyc', payload: body, headers: { 'content-type': 'application/json', 'x-mock-signature': crypto.createHmac('sha256', cfg.JWT_SECRET).update(body).digest('hex') } });
    return res.json();
  });
  // Admin override: approve or reject with a reason (creates a 'manual' KYC session if none exists).
  app.post('/admin/kyc/:userId/decision', async (req) => {
    const admin = requireAdmin(req);
    const b = parse(z.object({ decision: z.enum(['Verified', 'Rejected', 'In review']), reason: z.string().min(3) }), req.body);
    const uid = (req.params as any).userId;
    let s = (await db.query('SELECT provider_ref FROM kyc_sessions WHERE user_id=$1 ORDER BY created_at DESC LIMIT 1', [uid])).rows[0];
    if (!s) { const ref = `manual_${crypto.randomUUID().slice(0, 8)}`; await db.query(`INSERT INTO kyc_sessions (user_id, provider, provider_ref, status) VALUES ($1,'manual',$2,'Pending')`, [uid, ref]); s = { provider_ref: ref }; }
    const ok = await applyStatus(db, s.provider_ref, b.decision, b.reason, admin.id);
    if (!ok) throw notFound('User not found');
    await audit(db, req, { action: 'KYC_MANUAL_DECISION', category: 'Account', resource: uid, meta: b });
    return { ok: true };
  });
}
