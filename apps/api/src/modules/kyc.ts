import type { FastifyInstance } from 'fastify';
import crypto from 'node:crypto';
import { z } from 'zod';
import { parse } from '../lib/validate.js';
import { notFound, unauthorized } from '../lib/errors.js';
import { requireAdmin, requireUser } from '../lib/auth.js';
import { audit } from '../lib/audit.js';
import type { Q } from '../db.js';

async function applyStatus(q: Q, ref: string, status: string, reason?: string, decidedBy?: string) {
  const s = (await q.query(`UPDATE kyc_sessions SET status=$2, reason=$3, decided_by=$4, updated_at=now() WHERE provider_ref=$1 RETURNING user_id`, [ref, status, reason ?? null, decidedBy ?? null])).rows[0];
  if (!s) return null;
  await q.query('UPDATE users SET kyc_status=$2, updated_at=now() WHERE id=$1', [s.user_id, status]);
  await q.query(`INSERT INTO notifications (user_id, kind, title, body, link) VALUES ($1,'kyc',$2,$3,'#/user/subscription')`, [s.user_id, status === 'Verified' ? 'KYC verified' : status === 'Rejected' ? 'KYC could not be verified' : 'KYC in review', status === 'Verified' ? 'You can now subscribe to a paid plan.' : reason ?? 'We will update you shortly.']);
  return s.user_id;
}

export default async function kyc(app: FastifyInstance) {
  const { db, providers, cfg } = app.deps;
  app.get('/kyc/status', async (req) => {
    const u = requireUser(req);
    const r = await db.query(`SELECT u.kyc_status, k.status, k.provider, k.redirect_url, k.updated_at, k.reason FROM users u LEFT JOIN LATERAL (SELECT * FROM kyc_sessions WHERE user_id=u.id ORDER BY created_at DESC LIMIT 1) k ON true WHERE u.id=$1`, [u.id]);
    return r.rows[0];
  });
  app.post('/kyc/sessions', async (req) => {
    const u = requireUser(req);
    const row = (await db.query('SELECT * FROM users WHERE id=$1', [u.id])).rows[0];
    if (row.kyc_status === 'Verified') return { status: 'Verified' };
    const s = await providers.kyc.start({ userId: u.id, name: row.full_name, email: row.email, mobile: row.mobile });
    await db.query(`INSERT INTO kyc_sessions (user_id, provider, provider_ref, status, redirect_url) VALUES ($1,$2,$3,'Pending',$4)`, [u.id, providers.kyc.name, s.ref, s.redirectUrl]);
    await db.query(`UPDATE users SET kyc_status='Pending' WHERE id=$1 AND kyc_status IN ('Not started','Rejected')`, [u.id]);
    return { status: 'Pending', redirectUrl: s.redirectUrl, ref: s.ref, provider: providers.kyc.name };
  });
  app.post('/webhooks/kyc', { config: { rateLimit: false } }, async (req) => {
    const raw = req.rawBody ?? JSON.stringify(req.body);
    if (!providers.kyc.verifyWebhook(raw, (req.headers['x-digio-signature'] ?? req.headers['x-mock-signature']) as string)) throw unauthorized('Invalid signature');
    const ev = providers.kyc.parseWebhook(req.body);
    if (!ev) return { ignored: true };
    const userId = await applyStatus(db, ev.ref, ev.status, ev.reason);
    if (userId) await audit(db, null, { action: `KYC_${ev.status.toUpperCase().replace(' ', '_')}`, category: 'Account', resource: userId, actorLabel: `kyc:${providers.kyc.name}` });
    return { ok: !!userId };
  });
  // Stage-only: the mock KYC page posts the decision through the same signed webhook path.
  app.post('/kyc/mock/complete', async (req) => {
    const u = requireUser(req);
    if (providers.kyc.name !== 'mock' || cfg.APP_ENV === 'prod') throw notFound();
    const b = parse(z.object({ ref: z.string(), decision: z.enum(['Verified', 'Rejected']) }), req.body);
    const own = await db.query('SELECT 1 FROM kyc_sessions WHERE provider_ref=$1 AND user_id=$2', [b.ref, u.id]); if (!own.rows[0]) throw notFound();
    const body = JSON.stringify({ ref: b.ref, status: b.decision, reason: b.decision === 'Rejected' ? 'Name mismatch (test)' : undefined });
    const res = await app.inject({ method: 'POST', url: '/api/v1/webhooks/kyc', payload: body, headers: { 'content-type': 'application/json', 'x-mock-signature': crypto.createHmac('sha256', cfg.JWT_SECRET).update(body).digest('hex') } });
    return res.json();
  });
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
