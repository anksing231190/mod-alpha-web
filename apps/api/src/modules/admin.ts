import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { parse, isoDate } from '../lib/validate.js';
import { badRequest, notFound } from '../lib/errors.js';
import { requireAdmin } from '../lib/auth.js';
import { audit } from '../lib/audit.js';
import { addDays, daysBetween, today } from '../lib/dates.js';
import { providerStatus } from '../providers/index.js';

const csv = (rows: any[][]) => rows.map((r) => r.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');

export default async function admin(app: FastifyInstance) {
  const { db, cfg, providers } = app.deps;

  /** KPIs + time series for the dashboard. Granularity is chosen from the range length unless given. */
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
    return {
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
  app.get('/admin/users/:id', async (req) => {
    requireAdmin(req);
    const u = (await db.query(`SELECT id, external_ref, full_name, email, mobile, role, account_status, kyc_status, marketing_consent, signup_date, email_verified_at, mobile_verified_at FROM users WHERE id=$1`, [(req.params as any).id])).rows[0];
    if (!u) throw notFound();
    await audit(db, req, { action: 'USER_RECORD_VIEWED', category: 'Access', resource: u.id });
    return { user: u, subscriptions: (await db.query('SELECT id, plan_id, billing_cycle, amount_inr, status, start_date, renewal_date FROM subscriptions WHERE user_id=$1 ORDER BY start_date DESC', [u.id])).rows, kyc: (await db.query('SELECT provider, status, reason, updated_at FROM kyc_sessions WHERE user_id=$1 ORDER BY created_at DESC LIMIT 5', [u.id])).rows };
  });
  app.patch('/admin/users/:id', async (req) => {
    const admin = requireAdmin(req);
    const b = parse(z.object({ accountStatus: z.enum(['Active', 'Suspended', 'Closed']).optional(), role: z.enum(['user', 'admin', 'superadmin']).optional(), reason: z.string().min(3) }), req.body);
    if (b.role && admin.role !== 'superadmin') throw badRequest('Only a super admin can change roles');
    const id = (req.params as any).id;
    if (id === admin.id && b.accountStatus && b.accountStatus !== 'Active') throw badRequest('You cannot suspend your own account');
    const r = await db.query('UPDATE users SET account_status=coalesce($2, account_status), role=coalesce($3, role), updated_at=now() WHERE id=$1 RETURNING id', [id, b.accountStatus ?? null, b.role ?? null]);
    if (!r.rows[0]) throw notFound();
    if (b.accountStatus && b.accountStatus !== 'Active') await db.query(`UPDATE sessions SET revoked_at=now(), end_reason='suspended' WHERE user_id=$1 AND revoked_at IS NULL`, [id]);
    await audit(db, req, { action: b.role ? 'USER_ROLE_CHANGED' : `USER_${(b.accountStatus ?? '').toUpperCase()}`, category: 'Access', resource: id, meta: b });
    return { ok: true };
  });

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
  app.get('/admin/recent', async (req) => {
    requireAdmin(req);
    return {
      signups: (await db.query(`SELECT id, full_name name, coalesce(mobile, email::text) contact, signup_date, account_status status FROM users WHERE role='user' ORDER BY signup_date DESC, created_at DESC LIMIT 5`)).rows,
      subscriptions: (await db.query(`SELECT s.id, u.full_name name, s.plan_id plan, s.billing_cycle cycle, s.amount_inr amount, s.start_date, s.status FROM subscriptions s JOIN users u ON u.id=s.user_id WHERE s.status<>'Created' ORDER BY s.start_date DESC, s.created_at DESC LIMIT 5`)).rows,
    };
  });

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
  const DEFAULT_SETTINGS = { platformName: 'Mod Alpha', timezone: 'Asia/Kolkata', currency: 'INR', sipDateModel: 'One common platform date', reminderLeadDays: 2, supportEmail: 'support@modalpha.in' };
  app.get('/admin/settings', async (req) => {
    requireAdmin(req);
    const r = (await db.query(`SELECT value, updated_at FROM settings WHERE key='platform'`)).rows[0];
    return { settings: { ...DEFAULT_SETTINGS, ...(r?.value ?? {}) }, updatedAt: r?.updated_at ?? null, environment: cfg.APP_ENV, security: { adminMfa: 'Email code + SMS code required for every admin sign-in', rbac: 'Enforced: user / admin / superadmin', sessions: `Sign-out after ${cfg.SESSION_IDLE_MINUTES} min inactivity · max ${cfg.SESSION_MAX_HOURS_USER} h (users) / ${cfg.SESSION_MAX_HOURS_ADMIN} h (admins) · access token ${cfg.ACCESS_TOKEN_TTL_MIN} min, rotating refresh`, auditTrail: 'Append-only (database trigger)' } };
  });
  app.put('/admin/settings', async (req) => {
    const admin = requireAdmin(req, true);
    const b = parse(z.object({ platformName: z.string().min(2).max(60), timezone: z.string(), currency: z.literal('INR'), reminderLeadDays: z.number().int().min(0).max(7), supportEmail: z.string().email() }).partial().strict(), req.body);
    await db.query(`INSERT INTO settings (key, value, updated_by) VALUES ('platform', $1, $2) ON CONFLICT (key) DO UPDATE SET value=settings.value || $1, updated_by=$2, updated_at=now()`, [JSON.stringify(b), admin.id]);
    await audit(db, req, { action: 'SYSTEM_SETTINGS_UPDATED', category: 'Configuration', meta: b });
    return { ok: true };
  });
  app.get('/admin/integrations', async (req) => { requireAdmin(req); return providerStatus(providers, cfg); });
  app.get('/admin/mock-outbox', async (req) => {
    requireAdmin(req);
    const p = parse(z.object({ channel: z.string().optional(), limit: z.coerce.number().int().min(1).max(200).default(50) }), req.query);
    return { items: (await db.query(`SELECT * FROM mock_outbox WHERE ($1::text IS NULL OR channel=$1) ORDER BY id DESC LIMIT $2`, [p.channel ?? null, p.limit])).rows };
  });

  // ---- data requests (DPDP) — admin processes exports/deletions
  app.get('/admin/data-requests', async (req) => { requireAdmin(req); return { items: (await db.query(`SELECT d.*, u.full_name, u.email FROM data_requests d JOIN users u ON u.id=d.user_id ORDER BY d.created_at DESC LIMIT 100`)).rows }; });

  // ---- model releases & gates
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
