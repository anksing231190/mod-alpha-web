import type { FastifyInstance } from 'fastify';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { parse } from '../lib/validate.js';
import { badRequest, notFound, unauthorized } from '../lib/errors.js';
import { randomToken, requireUser, sha256 } from '../lib/auth.js';
import { audit } from '../lib/audit.js';
import { userView } from './auth.js';

export const DEFAULT_PREFS = {
  defaultInvestment: 100000, defaultSip: 10000, defaultPeriod: '5Y', numberFormat: 'indian', theme: 'dark', language: 'en-IN',
  channels: { email: true, sms: false, push: true, whatsapp: false },
  topics: { sipReminder: true, datePublished: true, billing: true, weeklyDigest: false, announcements: false },
  reminderTiming: '2 days before',
};

export default async function me(app: FastifyInstance) {
  const { db, providers, cfg } = app.deps;

  app.patch('/me', async (req) => {
    const u = requireUser(req);
    const b = parse(z.object({ name: z.string().trim().min(2).max(80).optional(), mobile: z.string().trim().max(20).optional().nullable(), country: z.string().max(40).optional() }), req.body);
    if (b.mobile) {
      const m = b.mobile.replace(/[^\d+]/g, ''); if (!/^\+?\d{10,13}$/.test(m)) throw badRequest('Enter a valid mobile number');
      const taken = await db.query('SELECT 1 FROM users WHERE mobile=$1 AND id<>$2', [m, u.id]); if (taken.rows[0]) throw badRequest('This mobile number is linked to another account');
      await db.query('UPDATE users SET mobile=$2, mobile_verified_at=NULL WHERE id=$1 AND coalesce(mobile,\'\')<>$2', [u.id, m.startsWith('+') ? m : `+91${m}`]);
    }
    const r = await db.query('UPDATE users SET full_name=coalesce($2, full_name), updated_at=now() WHERE id=$1 RETURNING *', [u.id, b.name ?? null]);
    return { user: userView(r.rows[0]) };
  });

  app.post('/me/password', async (req) => {
    const u = requireUser(req);
    const b = parse(z.object({ currentPassword: z.string().optional(), newPassword: z.string().min(8).max(128) }), req.body);
    const row = (await db.query('SELECT password_hash FROM users WHERE id=$1', [u.id])).rows[0];
    if (row?.password_hash && !(b.currentPassword && (await bcrypt.compare(b.currentPassword, row.password_hash)))) throw unauthorized('Current password is incorrect');
    await db.query('UPDATE users SET password_hash=$2, updated_at=now() WHERE id=$1', [u.id, await bcrypt.hash(b.newPassword, 11)]);
    await audit(db, req, { action: 'PASSWORD_CHANGED', category: 'Access', resource: u.id });
    return { ok: true };
  });

  app.post('/me/verify-email', async (req) => {
    const u = requireUser(req);
    const row = (await db.query('SELECT * FROM users WHERE id=$1', [u.id])).rows[0];
    if (!row.email) throw badRequest('No email on this account');
    if (row.email_verified_at) return { ok: true, alreadyVerified: true };
    const token = randomToken();
    await db.query(`INSERT INTO password_resets (token_hash, user_id, expires_at) VALUES ($1,$2, now() + interval '3 days')`, ['verify:' + sha256(token), u.id]);
    await providers.email.send({ to: row.email, subject: 'Verify your email for Mod Alpha', text: `Confirm your email: ${cfg.PUBLIC_APP_URL}/#/verify-email?token=${token}` });
    return { ok: true };
  });

  app.get('/me/preferences', async (req) => {
    const u = requireUser(req);
    const r = await db.query('SELECT data FROM preferences WHERE user_id=$1', [u.id]);
    const c = await db.query(`SELECT DISTINCT ON (kind) kind, granted FROM consents WHERE user_id=$1 ORDER BY kind, created_at DESC`, [u.id]);
    return { preferences: { ...DEFAULT_PREFS, ...(r.rows[0]?.data ?? {}) }, consents: Object.fromEntries(c.rows.map((x) => [x.kind, x.granted])) };
  });
  app.put('/me/preferences', async (req) => {
    const u = requireUser(req);
    const b = parse(z.object({
      defaultInvestment: z.number().min(500).max(1e9).optional(), defaultSip: z.number().min(500).max(1e8).optional(),
      defaultPeriod: z.enum(['1Y', '3Y', '5Y', '10Y']).optional(), numberFormat: z.enum(['indian', 'international']).optional(), theme: z.enum(['dark']).optional(), language: z.string().max(10).optional(),
      channels: z.object({ email: z.boolean(), sms: z.boolean(), push: z.boolean(), whatsapp: z.boolean() }).partial().optional(),
      topics: z.object({ sipReminder: z.boolean(), datePublished: z.boolean(), billing: z.boolean(), weeklyDigest: z.boolean(), announcements: z.boolean() }).partial().optional(),
      reminderTiming: z.enum(['3 days before', '2 days before', '1 day before', 'On the day']).optional(),
    }).strict(), req.body);
    const cur = { ...DEFAULT_PREFS, ...((await db.query('SELECT data FROM preferences WHERE user_id=$1', [u.id])).rows[0]?.data ?? {}) };
    const next = { ...cur, ...b, channels: { ...cur.channels, ...(b.channels ?? {}) }, topics: { ...cur.topics, ...(b.topics ?? {}) } };
    await db.query(`INSERT INTO preferences (user_id, data) VALUES ($1,$2) ON CONFLICT (user_id) DO UPDATE SET data=$2, updated_at=now()`, [u.id, JSON.stringify(next)]);
    return { preferences: next };
  });
  app.put('/me/consents', async (req) => {
    const u = requireUser(req);
    const b = parse(z.object({ analytics: z.boolean().optional(), marketing: z.boolean().optional() }).strict(), req.body);
    for (const [k, v] of Object.entries(b)) await db.query('INSERT INTO consents (user_id, kind, granted, source) VALUES ($1,$2,$3,$4)', [u.id, k, v, 'settings']);
    if (b.marketing !== undefined) await db.query('UPDATE users SET marketing_consent=$2 WHERE id=$1', [u.id, b.marketing]);
    return { ok: true };
  });

  // ---- notifications (in-app inbox)
  app.get('/me/notifications', async (req) => {
    const u = requireUser(req);
    const r = await db.query(`SELECT n.id, n.kind, n.title, n.body, n.link, n.created_at, (r.read_at IS NOT NULL) AS read FROM notifications n LEFT JOIN notification_reads r ON r.notification_id=n.id AND r.user_id=$1 WHERE n.user_id=$1 OR n.user_id IS NULL ORDER BY n.created_at DESC LIMIT 30`, [u.id]);
    return { items: r.rows, unread: r.rows.filter((x) => !x.read).length };
  });
  app.post('/me/notifications/read', async (req) => {
    const u = requireUser(req);
    const b = parse(z.object({ ids: z.array(z.string().uuid()).optional() }), req.body);
    await db.query(`INSERT INTO notification_reads (notification_id, user_id) SELECT id, $1 FROM notifications WHERE (user_id=$1 OR user_id IS NULL) AND ($2::uuid[] IS NULL OR id = ANY($2)) ON CONFLICT DO NOTHING`, [u.id, b.ids ?? null]);
    return { ok: true };
  });

  // ---- watchlist
  app.get('/me/watchlist', async (req) => {
    const u = requireUser(req);
    return { items: (await db.query('SELECT w.fund_id, f.scheme_name, w.added_at FROM watchlist w JOIN funds f USING (fund_id) WHERE w.user_id=$1 ORDER BY w.added_at DESC', [u.id])).rows };
  });
  app.post('/me/watchlist/:fundId', async (req) => {
    const u = requireUser(req); const { fundId } = req.params as any;
    const f = await db.query('SELECT 1 FROM funds WHERE fund_id=$1', [fundId]); if (!f.rows[0]) throw notFound('Fund not found');
    await db.query('INSERT INTO watchlist (user_id, fund_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [u.id, fundId]);
    return { ok: true };
  });
  app.delete('/me/watchlist/:fundId', async (req) => { const u = requireUser(req); await db.query('DELETE FROM watchlist WHERE user_id=$1 AND fund_id=$2', [u.id, (req.params as any).fundId]); return { ok: true }; });

  // ---- data rights (DPDP Act)
  app.post('/me/data-export', async (req) => {
    const u = requireUser(req);
    const pending = await db.query(`SELECT id FROM data_requests WHERE user_id=$1 AND kind='export' AND status IN ('Requested','Processing')`, [u.id]);
    if (pending.rows[0]) return { id: pending.rows[0].id, status: 'Requested' };
    const r = await db.query(`INSERT INTO data_requests (user_id, kind) VALUES ($1,'export') RETURNING id, status`, [u.id]);
    await audit(db, req, { action: 'DATA_EXPORT_REQUESTED', category: 'Account', resource: u.id });
    return r.rows[0];
  });
  app.get('/me/data-export/:id', async (req) => {
    const u = requireUser(req);
    const r = await db.query(`SELECT * FROM data_requests WHERE id=$1 AND user_id=$2 AND kind='export'`, [(req.params as any).id, u.id]);
    if (!r.rows[0]) throw notFound();
    if (r.rows[0].status !== 'Completed') return { status: r.rows[0].status };
    return { status: 'Completed', data: await exportUserData(db, u.id) };
  });
  app.post('/me/deletion-request', async (req) => {
    const u = requireUser(req);
    const b = parse(z.object({ password: z.string().optional(), confirm: z.literal('DELETE') }), req.body);
    const row = (await db.query('SELECT password_hash FROM users WHERE id=$1', [u.id])).rows[0];
    if (row.password_hash && !(b.password && (await bcrypt.compare(b.password, row.password_hash)))) throw unauthorized('Password is incorrect');
    const r = await db.query(`INSERT INTO data_requests (user_id, kind) VALUES ($1,'deletion') RETURNING id, status, created_at`, [u.id]);
    await audit(db, req, { action: 'ACCOUNT_DELETION_REQUESTED', category: 'Account', resource: u.id });
    return { ...r.rows[0], message: 'Your account will be deleted within 30 days. Billing records are retained as required by law.' };
  });
}

export async function exportUserData(db: any, userId: string) {
  const q = async (sql: string) => (await db.query(sql, [userId])).rows;
  return {
    exportedAt: new Date().toISOString(),
    profile: (await q('SELECT id, email, mobile, full_name, kyc_status, account_status, signup_date, marketing_consent FROM users WHERE id=$1'))[0],
    preferences: (await q('SELECT data FROM preferences WHERE user_id=$1'))[0]?.data ?? {},
    consents: await q('SELECT kind, granted, source, created_at FROM consents WHERE user_id=$1 ORDER BY created_at'),
    subscriptions: await q('SELECT id, plan_id, billing_cycle, amount_inr, status, start_date, renewal_date FROM subscriptions WHERE user_id=$1'),
    payments: await q('SELECT amount_inr, status, paid_on FROM payments WHERE user_id=$1'),
    watchlist: await q('SELECT fund_id, added_at FROM watchlist WHERE user_id=$1'),
    supportTickets: await q('SELECT number, topic, message, status, created_at FROM support_tickets WHERE user_id=$1'),
  };
}
