/**
 * Admin module — the admin console's data.
 *   GET /admin/metrics (dashboard KPIs + charts for a date range) · GET /admin/recent
 *   GET /admin/users (+ CSV export) · GET/PATCH /admin/users/:id (status, role) · GET /admin/subscriptions
 *   GET /admin/audit · GET/PUT /admin/settings · GET /admin/integrations · GET /admin/mock-outbox
 *   GET /admin/data-requests · GET /admin/models · PUT /admin/models/:version/gates · POST …/approve
 * Every route requires an admin; changes are audited. Some actions are super-admin only.
 */
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { parse, isoDate } from '../../shared/validate.js';
import { badRequest, notFound } from '../../shared/errors.js';
import { randomToken, requireAdmin, sha256 } from '../auth/session.js';
import { conflict } from '../../shared/errors.js';
import { audit } from '../../shared/audit.js';
import { addDays, daysBetween, today } from '../../shared/dates.js';
import { providerStatus } from '../../providers/index.js';

// Rows → CSV text with every value quoted (safe for commas, quotes and new lines).
const csv = (rows: any[][]) => rows.map((r) => r.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');

export default async function admin(app: FastifyInstance) {
  const { db, cfg, providers } = app.deps;

  /** KPIs + time series for the dashboard. Granularity is chosen from the range length unless given. */
  // GET /admin/metrics — users, subscribers, conversion, revenue and the growth / subscription charts for
  // ?from&to, with the previous period for comparison.
  app.get('/admin/metrics', async (req) => {
    requireAdmin(req);
    const asOf = (await db.query(`SELECT greatest((SELECT max(signup_date) FROM users), (SELECT max(nav_date) FROM nav_history), (SELECT max(start_date) FROM subscriptions), CURRENT_DATE - 0) d`)).rows[0].d as string;
    const p = parse(z.object({ from: isoDate.optional(), to: isoDate.optional(), granularity: z.enum(['day', 'week', 'month']).optional() }), req.query);
    const to = p.to ?? asOf, from = p.from ?? `${to.slice(0, 8)}01`;
    if (from > to) throw badRequest('"from" must be on or before "to"');
    const len = daysBetween(from, to), prevTo = addDays(from, -1), prevFrom = addDays(prevTo, -len);
    const g = p.granularity ?? (len <= 45 ? 'day' : len <= 200 ? 'week' : 'month');
    const k = async (f: string, t: string) => (await db.query(`SELECT
        (SELECT count(*) FROM users WHERE role='user' AND deleted_at IS NULL AND signup_date <= $2) total_users,
        (SELECT count(*) FROM users WHERE role='user' AND signup_date BETWEEN $1 AND $2) new_users,
        (SELECT count(*) FROM subscriptions WHERE start_date <= $2 AND status IN ('Active','Past due') OR (start_date <= $2 AND last_payment_date >= $2)) active_subs,
        (SELECT coalesce(sum(amount_inr - refunded_inr),0) FROM payments WHERE status IN ('captured','refunded') AND paid_on BETWEEN $1 AND $2) revenue`, [f, t])).rows[0];
    const cur = await k(from, to), prev = await k(prevFrom, prevTo);
    const conv = (x: any) => (x.total_users ? (x.active_subs / x.total_users) * 100 : 0);
    const pct = (a: number, b: number) => (b ? (a / b - 1) * 100 : null);
    const series = (await db.query(`WITH b AS (SELECT generate_series(date_trunc($3, $1::date), date_trunc($3, $2::date), ('1 ' || $3)::interval)::date bucket)
      SELECT b.bucket,
        (SELECT count(*) FROM users WHERE role='user' AND signup_date >= greatest(b.bucket, $1::date) AND signup_date < b.bucket + ('1 ' || $3)::interval AND signup_date <= $2) new_users,
        (SELECT count(*) FROM users WHERE role='user' AND deleted_at IS NULL AND signup_date < least(b.bucket + ('1 ' || $3)::interval, $2::date + 1)) total_users,
        (SELECT count(*) FROM subscriptions WHERE status<>'Created' AND start_date >= greatest(b.bucket, $1::date) AND start_date < b.bucket + ('1 ' || $3)::interval AND start_date <= $2) new_subs,
        (SELECT coalesce(sum(amount_inr - refunded_inr),0) FROM payments WHERE status IN ('captured','refunded') AND paid_on >= greatest(b.bucket, $1::date) AND paid_on < b.bucket + ('1 ' || $3)::interval AND paid_on <= $2) revenue
      FROM b ORDER BY b.bucket`, [from, to, g])).rows;
    // plan mix (active paid subscriptions by plan; everyone else is Free), sign-up funnel for the period, support speed
    const mix = (await db.query(`SELECT s.plan_id plan, count(DISTINCT s.user_id)::int n FROM subscriptions s JOIN users u ON u.id=s.user_id
      WHERE u.role='user' AND u.deleted_at IS NULL AND s.status IN ('Active','Past due') GROUP BY s.plan_id`)).rows;
    const paidUsers = mix.reduce((a: number, r: any) => a + r.n, 0);
    const funnel = (await db.query(`SELECT count(*)::int signed_up,
        count(*) FILTER (WHERE mobile_verified_at IS NOT NULL OR email_verified_at IS NOT NULL)::int verified,
        count(*) FILTER (WHERE kyc_status='Verified')::int kyc,
        count(*) FILTER (WHERE EXISTS (SELECT 1 FROM subscriptions s WHERE s.user_id=u.id AND s.status<>'Created'))::int paid
      FROM users u WHERE role='user' AND signup_date BETWEEN $1 AND $2`, [from, to])).rows[0];
    const sup = (await db.query(`SELECT count(*) FILTER (WHERE status IN ('Open','In progress'))::int waiting,
        min(created_at) FILTER (WHERE status IN ('Open','In progress')) oldest,
        avg(extract(epoch FROM replied_at - created_at)/3600) FILTER (WHERE replied_at IS NOT NULL AND created_at > now() - interval '30 days') avg_reply_hours
      FROM support_tickets`)).rows[0];
    return {
      planMix: [{ plan: 'Free', users: Math.max(0, Number(cur.total_users) - paidUsers) }, ...mix.map((r: any) => ({ plan: r.plan, users: r.n }))],
      funnel: { signedUp: funnel.signed_up, verified: funnel.verified, kyc: funnel.kyc, paid: funnel.paid },
      support: { waiting: sup.waiting, oldest: sup.oldest, avgReplyHours: sup.avg_reply_hours == null ? null : +Number(sup.avg_reply_hours).toFixed(1) },
      range: { from, to, previous: { from: prevFrom, to: prevTo }, granularity: g, asOf },
      kpis: {
        totalUsers: { value: cur.total_users, previous: prev.total_users, changePct: pct(cur.total_users, prev.total_users) },
        activeSubscriptions: { value: cur.active_subs, previous: prev.active_subs, changePct: pct(cur.active_subs, prev.active_subs) },
        conversionRate: { value: +conv(cur).toFixed(2), previous: +conv(prev).toFixed(2), changePp: +(conv(cur) - conv(prev)).toFixed(2) },
        revenue: { value: cur.revenue, previous: prev.revenue, changePct: pct(cur.revenue, prev.revenue) },
        newUsers: { value: cur.new_users, previous: prev.new_users },
      },
      series,
    };
  });

  // GET /admin/users — search and filter users; ?format=csv exports (audited as USERS_EXPORTED).
  app.get('/admin/users', async (req) => {
    requireAdmin(req);
    const p = parse(z.object({ q: z.string().optional(), status: z.string().optional(), kyc: z.string().optional(), role: z.string().optional(), page: z.coerce.number().int().min(1).default(1), pageSize: z.coerce.number().int().min(1).max(200).default(15), format: z.enum(['json', 'csv']).default('json') }), req.query);
    const w = ['u.deleted_at IS NULL'], a: any[] = [];
    if (p.q) { a.push(`%${p.q}%`); w.push(`(u.full_name ILIKE $${a.length} OR u.email::text ILIKE $${a.length} OR u.mobile ILIKE $${a.length} OR u.external_ref ILIKE $${a.length} OR u.id::text ILIKE $${a.length})`); }
    if (p.status && p.status !== 'All statuses') { a.push(p.status); w.push(`u.account_status=$${a.length}`); }
    if (p.kyc && p.kyc !== 'All KYC states') { a.push(p.kyc); w.push(`u.kyc_status=$${a.length}`); }
    if (p.role) { a.push(p.role); w.push(`u.role=$${a.length}`); }
    const where = w.join(' AND ');
    const base = `FROM users u LEFT JOIN LATERAL (SELECT plan_id, billing_cycle, status FROM subscriptions WHERE user_id=u.id AND status<>'Created' ORDER BY start_date DESC LIMIT 1) s ON true WHERE ${where}`;
    const sel = `SELECT u.id, coalesce(u.external_ref, left(u.id::text, 8)) ref, u.full_name name, u.email, u.mobile, u.signup_date, u.account_status status, u.kyc_status kyc, u.role, CASE WHEN s.plan_id IS NULL THEN 'Free' ELSE s.plan_id || ' (' || s.billing_cycle || ')' END plan, coalesce(s.status, 'Free') sub ${base} ORDER BY u.signup_date DESC, u.created_at DESC`;
    if (p.format === 'csv') {
      const rows = (await db.query(sel + ' LIMIT 100000', a)).rows;
      await audit(db, req, { action: 'USERS_EXPORTED', category: 'Data', meta: { count: rows.length, filters: { q: p.q, status: p.status, kyc: p.kyc } } });
      return csv([['id', 'name', 'email', 'mobile', 'signup_date', 'status', 'kyc', 'plan', 'subscription'], ...rows.map((r) => [r.ref, r.name, r.email, r.mobile, r.signup_date, r.status, r.kyc, r.plan, r.sub])]);
    }
    const total = (await db.query(`SELECT count(*)::int n ${base}`, a)).rows[0].n;
    a.push(p.pageSize, (p.page - 1) * p.pageSize);
    return { items: (await db.query(sel + ` LIMIT $${a.length - 1} OFFSET $${a.length}`, a)).rows, total, page: p.page, pageSize: p.pageSize };
  });
  // One user with subscriptions and recent KYC sessions.
  app.get('/admin/users/:id', async (req) => {
    requireAdmin(req);
    const u = (await db.query(`SELECT id, external_ref, full_name, email, mobile, role, account_status, kyc_status, marketing_consent, signup_date, email_verified_at, mobile_verified_at FROM users WHERE id=$1`, [(req.params as any).id])).rows[0];
    if (!u) throw notFound();
    await audit(db, req, { action: 'USER_RECORD_VIEWED', category: 'Access', resource: u.id });
    return { user: u, subscriptions: (await db.query('SELECT id, plan_id, billing_cycle, amount_inr, status, start_date, renewal_date FROM subscriptions WHERE user_id=$1 ORDER BY start_date DESC', [u.id])).rows, kyc: (await db.query('SELECT provider, status, reason, method, pan_masked, kra_ref, name_match, dob_match, updated_at FROM kyc_sessions WHERE user_id=$1 ORDER BY created_at DESC LIMIT 5', [u.id])).rows };
  });
  // POST /admin/admins — super admins add an admin (or super admin). The new account has no password: an
  // invitation email carries a 3-day link to set one (the reset-password page), which also confirms the email.
  // Admins sign in with password + email code + SMS code, so the mobile number is required.
  app.post('/admin/admins', async (req) => {
    requireAdmin(req, true);
    const b = parse(z.object({
      name: z.string().trim().min(2).max(80),
      email: z.string().trim().toLowerCase().email(),
      mobile: z.string().trim().transform((m) => m.replace(/[^\d+]/g, '')).transform((m) => (m.startsWith('+') ? m : `+91${m}`)).refine((m) => /^\+\d{12,13}$/.test(m), 'Enter a valid mobile number'),
      role: z.enum(['admin', 'superadmin']).default('admin'),
    }), req.body);
    const taken = (await db.query('SELECT id, role, email, mobile FROM users WHERE (email=$1 OR mobile=$2) AND deleted_at IS NULL', [b.email, b.mobile])).rows[0];
    if (taken) throw conflict(taken.role === 'user' ? 'This email or mobile already has a user account. Open it under Users and change its role instead.' : 'This person is already an admin.');
    const u = (await db.query(`INSERT INTO users (email, mobile, full_name, role, kyc_status) VALUES ($1,$2,$3,$4,'Verified') RETURNING id`, [b.email, b.mobile, b.name, b.role])).rows[0];
    const token = randomToken();
    await db.query(`INSERT INTO password_resets (token_hash, user_id, expires_at) VALUES ($1,$2, now() + interval '3 days')`, [sha256(token), u.id]);
    const link = `${app.deps.cfg.PUBLIC_APP_URL}/#/reset-password?token=${token}`;
    await app.deps.providers.email.send({ to: b.email, subject: 'You have been added as a Mod Alpha admin', text: `Hi ${b.name},\n\nYou have been added to the Mod Alpha admin console. Set your password with this link (valid for 3 days):\n${link}\n\nAt every sign-in you will also enter a code sent to this email and a code sent by SMS to ${b.mobile}.` });
    await audit(db, req, { action: 'ADMIN_INVITED', category: 'Access', resource: u.id, meta: { email: b.email, role: b.role } });
    return { ok: true, id: u.id, ...(app.deps.providers.email.name === 'mock' && app.deps.cfg.APP_ENV !== 'prod' ? { devLink: link } : {}) };
  });

  // Change account status or role. Suspending ends the user's sessions immediately. Audited.
  app.patch('/admin/users/:id', async (req) => {
    const admin = requireAdmin(req);
    const b = parse(z.object({ accountStatus: z.enum(['Active', 'Suspended', 'Closed']).optional(), role: z.enum(['user', 'admin', 'superadmin']).optional(), reason: z.string().min(3) }), req.body);
    if (b.role && admin.role !== 'superadmin') throw badRequest('Only a super admin can change roles');
    const id = (req.params as any).id;
    if (id === admin.id && b.accountStatus && b.accountStatus !== 'Active') throw badRequest('You cannot suspend your own account');
    if (b.role && id === admin.id) throw badRequest('You cannot change your own role');
    if (b.role && b.role !== 'user') {
      const t = (await db.query('SELECT email, mobile FROM users WHERE id=$1', [id])).rows[0];
      if (t && (!t.email || !t.mobile)) throw badRequest('Admins sign in with an email code and an SMS code — this account needs both an email address and a mobile number first.');
    }
    const r = await db.query('UPDATE users SET account_status=coalesce($2, account_status), role=coalesce($3, role), updated_at=now() WHERE id=$1 RETURNING id', [id, b.accountStatus ?? null, b.role ?? null]);
    if (!r.rows[0]) throw notFound();
    if (b.accountStatus && b.accountStatus !== 'Active') await db.query(`UPDATE sessions SET revoked_at=now(), end_reason='suspended' WHERE user_id=$1 AND revoked_at IS NULL`, [id]);
    await audit(db, req, { action: b.role ? 'USER_ROLE_CHANGED' : `USER_${(b.accountStatus ?? '').toUpperCase()}`, category: 'Access', resource: id, meta: b });
    return { ok: true };
  });

  // Subscriptions list with KPIs (active, MRR, by plan).
  app.get('/admin/subscriptions', async (req) => {
    requireAdmin(req);
    const p = parse(z.object({ q: z.string().optional(), status: z.string().optional(), plan: z.string().optional(), page: z.coerce.number().int().min(1).default(1), pageSize: z.coerce.number().int().min(1).max(200).default(15) }), req.query);
    const w = [`s.status<>'Created'`], a: any[] = [];
    if (p.q) { a.push(`%${p.q}%`); w.push(`(s.id ILIKE $${a.length} OR u.full_name ILIKE $${a.length} OR u.email::text ILIKE $${a.length} OR u.external_ref ILIKE $${a.length})`); }
    if (p.status && p.status !== 'All states') { a.push(p.status); w.push(`s.status=$${a.length}`); }
    if (p.plan && p.plan !== 'All plans') { a.push(p.plan); w.push(`s.plan_id=$${a.length}`); }
    const base = `FROM subscriptions s JOIN users u ON u.id=s.user_id WHERE ${w.join(' AND ')}`;
    const total = (await db.query(`SELECT count(*)::int n ${base}`, a)).rows[0].n;
    a.push(p.pageSize, (p.page - 1) * p.pageSize);
    const items = (await db.query(`SELECT s.id, s.plan_id plan, s.billing_cycle cycle, s.amount_inr amount, s.start_date, s.renewal_date, s.status, s.payment_ref, s.provider, s.cancel_at_period_end, u.id user_id, u.full_name user_name, coalesce(u.external_ref, left(u.id::text,8)) user_ref ${base} ORDER BY s.start_date DESC, s.id DESC LIMIT $${a.length - 1} OFFSET $${a.length}`, a)).rows;
    const k = (await db.query(`SELECT count(*) FILTER (WHERE status='Active')::int active, count(*) FILTER (WHERE status='Past due')::int past_due, count(*) FILTER (WHERE status='Cancelled')::int cancelled, count(*) FILTER (WHERE status='Cancelled' AND coalesce(cancelled_at::date, last_payment_date) >= date_trunc('month', CURRENT_DATE))::int cancelled_month,
      coalesce(sum(amount_inr / CASE billing_cycle WHEN 'Monthly' THEN 1 WHEN 'Quarterly' THEN 3 ELSE 12 END) FILTER (WHERE status='Active'),0) mrr FROM subscriptions`)).rows[0];
    const byPlan = (await db.query(`SELECT plan_id, count(*)::int n FROM subscriptions WHERE status='Active' GROUP BY plan_id`)).rows;
    const users = (await db.query(`SELECT count(*)::int n FROM users WHERE role='user' AND deleted_at IS NULL`)).rows[0].n;
    return { items, total, page: p.page, pageSize: p.pageSize, kpis: { ...k, mrr: Math.round(k.mrr), byPlan: Object.fromEntries(byPlan.map((x) => [x.plan_id, x.n])), totalUsers: users } };
  });
  // Latest 5 sign-ups and subscriptions (dashboard 'recent' tables).
  app.get('/admin/recent', async (req) => {
    requireAdmin(req);
    return {
      signups: (await db.query(`SELECT id, full_name name, coalesce(mobile, email::text) contact, signup_date, account_status status FROM users WHERE role='user' ORDER BY signup_date DESC, created_at DESC LIMIT 5`)).rows,
      subscriptions: (await db.query(`SELECT s.id, u.full_name name, s.plan_id plan, s.billing_cycle cycle, s.amount_inr amount, s.start_date, s.status FROM subscriptions s JOIN users u ON u.id=s.user_id WHERE s.status<>'Created' ORDER BY s.start_date DESC, s.created_at DESC LIMIT 5`)).rows,
    };
  });

  // Search the audit log (category, action, actor, date range), newest first.
  app.get('/admin/audit', async (req) => {
    requireAdmin(req);
    const p = parse(z.object({ q: z.string().optional(), category: z.string().optional(), from: isoDate.optional(), to: isoDate.optional(), page: z.coerce.number().int().min(1).default(1), pageSize: z.coerce.number().int().min(1).max(500).default(50), format: z.enum(['json', 'csv']).default('json') }), req.query);
    const w = ['true'], a: any[] = [];
    if (p.q) { a.push(`%${p.q}%`); w.push(`(action ILIKE $${a.length} OR actor_label ILIKE $${a.length} OR resource ILIKE $${a.length})`); }
    if (p.category && p.category !== 'All event types') { a.push(p.category); w.push(`category=$${a.length}`); }
    a.push(p.from ?? addDays(today(), -30)); w.push(`at >= $${a.length}::date`);
    a.push(p.to ?? today()); w.push(`at < $${a.length}::date + 1`);
    const where = w.join(' AND ');
    if (p.format === 'csv') {
      const rows = (await db.query(`SELECT at, actor_label, action, category, resource, outcome, ip FROM audit_log WHERE ${where} ORDER BY at DESC LIMIT 100000`, a)).rows;
      await audit(db, req, { action: 'AUDIT_EXPORTED', category: 'Access', meta: { count: rows.length } });
      return csv([['at', 'actor', 'action', 'category', 'resource', 'outcome', 'ip'], ...rows.map((r) => [r.at.toISOString(), r.actor_label, r.action, r.category, r.resource, r.outcome, r.ip])]);
    }
    const stats = (await db.query(`SELECT count(*)::int total, count(*) FILTER (WHERE outcome='Success')::int ok, count(*) FILTER (WHERE outcome<>'Success')::int blocked FROM audit_log WHERE ${where}`, a)).rows[0];
    a.push(p.pageSize, (p.page - 1) * p.pageSize);
    const admins = (await db.query(`SELECT count(*)::int n, count(*) FILTER (WHERE role='superadmin')::int s FROM users WHERE role<>'user'`)).rows[0];
    return { items: (await db.query(`SELECT id, at, actor_label actor, action, category, resource, outcome FROM audit_log WHERE ${where} ORDER BY at DESC LIMIT $${a.length - 1} OFFSET $${a.length}`, a)).rows, stats: { ...stats, admins: admins.n, superAdmins: admins.s } };
  });

  // ---- settings & integrations
  // Platform settings (name, time zone, reminder lead days, support email) — stored in the settings table.
  const DEFAULT_SETTINGS = { platformName: 'Mod Alpha', timezone: 'Asia/Kolkata', currency: 'INR', sipDateModel: 'One common platform date', reminderLeadDays: 2, supportEmail: 'support@modalpha.in' };
  app.get('/admin/settings', async (req) => {
    requireAdmin(req);
    const r = (await db.query(`SELECT value, updated_at FROM settings WHERE key='platform'`)).rows[0];
    return { settings: { ...DEFAULT_SETTINGS, ...(r?.value ?? {}) }, updatedAt: r?.updated_at ?? null, environment: cfg.APP_ENV, security: { adminMfa: 'Email code + SMS code required for every admin sign-in', rbac: 'Enforced: user / admin / superadmin', sessions: `Sign-out after ${cfg.SESSION_IDLE_MINUTES} min inactivity · max ${cfg.SESSION_MAX_HOURS_USER} h (users) / ${cfg.SESSION_MAX_HOURS_ADMIN} h (admins) · access token ${cfg.ACCESS_TOKEN_TTL_MIN} min, rotating refresh`, auditTrail: 'Append-only (database trigger)' } };
  });
  // Super admin: update platform settings (audited).
  app.put('/admin/settings', async (req) => {
    const admin = requireAdmin(req, true);
    const b = parse(z.object({ platformName: z.string().min(2).max(60), timezone: z.string(), currency: z.literal('INR'), reminderLeadDays: z.number().int().min(0).max(7), supportEmail: z.string().email() }).partial().strict(), req.body);
    await db.query(`INSERT INTO settings (key, value, updated_by) VALUES ('platform', $1, $2) ON CONFLICT (key) DO UPDATE SET value=settings.value || $1, updated_by=$2, updated_at=now()`, [JSON.stringify(b), admin.id]);
    await audit(db, req, { action: 'SYSTEM_SETTINGS_UPDATED', category: 'Configuration', meta: b });
    return { ok: true };
  });
  // Which external providers are live or mocked (System Settings → External providers).
  app.get('/admin/integrations', async (req) => { requireAdmin(req); return providerStatus(providers, cfg); });
  // What the mock providers 'sent' (emails, SMS, push…) — stage testing only.
  app.get('/admin/mock-outbox', async (req) => {
    requireAdmin(req);
    const p = parse(z.object({ channel: z.string().optional(), limit: z.coerce.number().int().min(1).max(200).default(50) }), req.query);
    return { items: (await db.query(`SELECT * FROM mock_outbox WHERE ($1::text IS NULL OR channel=$1) ORDER BY id DESC LIMIT $2`, [p.channel ?? null, p.limit])).rows };
  });

  // ---- data requests (DPDP) — admin processes exports/deletions
  // Data export / deletion requests and their status.
  app.get('/admin/data-requests', async (req) => { requireAdmin(req); return { items: (await db.query(`SELECT d.*, u.full_name, u.email FROM data_requests d JOIN users u ON u.id=d.user_id ORDER BY d.created_at DESC LIMIT 100`)).rows }; });

  // ---- model releases & gates
  // SIP-date model releases. A release needs every quality gate ticked before a super admin can approve it;
  // approving retires the previous one.
  app.get('/admin/models', async (req) => { requireAdmin(req); return { items: (await db.query('SELECT * FROM model_releases ORDER BY created_at DESC')).rows }; });
  app.put('/admin/models/:version/gates', async (req) => {
    requireAdmin(req);
    const b = parse(z.object({ gates: z.record(z.boolean()) }), req.body);
    const r = await db.query(`UPDATE model_releases SET gates=gates || $2, status=CASE WHEN status='Draft' THEN 'Evaluating' ELSE status END WHERE version=$1 RETURNING *`, [(req.params as any).version, JSON.stringify(b.gates)]);
    if (!r.rows[0]) throw notFound();
    await audit(db, req, { action: 'MODEL_GATES_UPDATED', category: 'Configuration', resource: r.rows[0].version, meta: b.gates });
    return { release: r.rows[0] };
  });
  app.post('/admin/models/:version/approve', async (req) => {
    const admin = requireAdmin(req, true);
    const m = (await db.query('SELECT * FROM model_releases WHERE version=$1', [(req.params as any).version])).rows[0];
    if (!m) throw notFound();
    const pending = Object.entries(m.gates).filter(([, v]) => !v).map(([k]) => k);
    if (pending.length) throw badRequest(`All release gates must pass first. Pending: ${pending.join(', ')}`);
    await db.query(`UPDATE model_releases SET status='Retired' WHERE status='Approved'`);
    await db.query(`UPDATE model_releases SET status='Approved', approved_by=$2, approved_at=now() WHERE version=$1`, [m.version, admin.id]);
    await audit(db, req, { action: 'MODEL_RELEASE_APPROVED', category: 'Configuration', resource: m.version });
    return { ok: true };
  });
}
