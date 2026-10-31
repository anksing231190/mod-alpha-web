import type { FastifyInstance } from 'fastify';
import XLSX from 'xlsx';
import { z } from 'zod';
import { parse } from '../lib/validate.js';
import { badRequest, notFound } from '../lib/errors.js';
import { requireAdmin } from '../lib/auth.js';
import { audit } from '../lib/audit.js';
import { tx, type Q } from '../db.js';
import { today } from '../lib/dates.js';
import { SCHEMA, validateWorkbook } from './workbook.js';
import { computeFundMetrics } from './analytics.js';

async function bulk(c: Q, table: string, cols: string[], types: string[], rows: any[][]) {
  for (let i = 0; i < rows.length; i += 5000) {
    const chunk = rows.slice(i, i + 5000);
    const arrays = cols.map((_, j) => chunk.map((r) => r[j]));
    await c.query(`INSERT INTO ${table} (${cols.join(',')}) SELECT * FROM unnest(${types.map((t, j) => `$${j + 1}::${t}[]`).join(',')})`, arrays);
  }
}

/** Replace the tables for every sheet present in `data`. Runs inside a transaction. */
export async function importData(c: Q, data: Record<string, any[]>) {
  const counts: Record<string, number> = {};
  if (data.Funds) {
    const ids = data.Funds.map((f) => f.fund_id);
    await c.query('DELETE FROM funds WHERE NOT (fund_id = ANY($1))', [ids]);
    for (const f of data.Funds) await c.query(`INSERT INTO funds (fund_id, scheme_name, amc, category, asset_class, plan, option, risk_level, benchmark, aum_cr, expense_ratio_pct, inception_date, is_active) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
      ON CONFLICT (fund_id) DO UPDATE SET scheme_name=$2, amc=$3, category=$4, asset_class=$5, plan=$6, option=$7, risk_level=$8, benchmark=$9, aum_cr=$10, expense_ratio_pct=$11, inception_date=$12, is_active=$13`,
      [f.fund_id, f.scheme_name, f.amc, f.category, f.asset_class, f.plan, f.option, f.risk_level, f.benchmark, f.aum_cr, f.expense_ratio_pct, f.inception_date, f.is_active !== 'N']);
    counts.Funds = ids.length;
  }
  if (data.NAV_History) {
    await c.query('TRUNCATE nav_history');
    await bulk(c, 'nav_history', ['fund_id', 'nav_date', 'nav'], ['text', 'date', 'numeric'], data.NAV_History.map((r) => [r.fund_id, r.nav_date, r.nav]));
    counts.NAV_History = data.NAV_History.length;
  }
  if (data.Users) {
    const refs = data.Users.map((u) => u.user_id);
    await c.query('DELETE FROM users WHERE external_ref IS NOT NULL AND NOT (external_ref = ANY($1))', [refs]);
    await c.query('CREATE TEMP TABLE _u (external_ref text, full_name text, email text, mobile text, signup_date date, account_status text, kyc_status text, marketing_consent boolean) ON COMMIT DROP');
    await bulk(c, '_u', ['external_ref', 'full_name', 'email', 'mobile', 'signup_date', 'account_status', 'kyc_status', 'marketing_consent'], ['text', 'text', 'text', 'text', 'date', 'text', 'text', 'boolean'], data.Users.map((u) => [u.user_id, u.full_name, u.email, u.mobile || null, u.signup_date, u.account_status, u.kyc_status, u.marketing_consent === 'Y']));
    await c.query(`INSERT INTO users (external_ref, full_name, email, mobile, signup_date, account_status, kyc_status, marketing_consent, created_at)
      SELECT external_ref, full_name, email, mobile, signup_date, account_status, kyc_status, marketing_consent, signup_date::timestamptz FROM _u
      ON CONFLICT (external_ref) DO UPDATE SET full_name=EXCLUDED.full_name, email=EXCLUDED.email, mobile=EXCLUDED.mobile, signup_date=EXCLUDED.signup_date, account_status=EXCLUDED.account_status, kyc_status=EXCLUDED.kyc_status, marketing_consent=EXCLUDED.marketing_consent`);
    counts.Users = refs.length;
  }
  if (data.Subscriptions) {
    await c.query(`DELETE FROM subscriptions WHERE provider='import'`);
    await c.query('CREATE TEMP TABLE _s (id text, ref text, plan_id text, billing_cycle text, amount_inr numeric, status text, start_date date, last_payment_date date, renewal_date date, payment_ref text) ON COMMIT DROP');
    await bulk(c, '_s', ['id', 'ref', 'plan_id', 'billing_cycle', 'amount_inr', 'status', 'start_date', 'last_payment_date', 'renewal_date', 'payment_ref'], ['text', 'text', 'text', 'text', 'numeric', 'text', 'date', 'date', 'date', 'text'], data.Subscriptions.map((s) => [s.subscription_id, s.user_id, s.plan, s.billing_cycle, s.amount_inr, s.status, s.start_date, s.last_payment_date, s.renewal_date, s.payment_ref]));
    await c.query(`INSERT INTO subscriptions (id, user_id, plan_id, billing_cycle, amount_inr, status, start_date, last_payment_date, renewal_date, payment_ref, provider)
      SELECT s.id, u.id, s.plan_id, s.billing_cycle, s.amount_inr, s.status, s.start_date, s.last_payment_date, s.renewal_date, s.payment_ref, 'import' FROM _s s JOIN users u ON u.external_ref=s.ref
      ON CONFLICT (id) DO UPDATE SET user_id=EXCLUDED.user_id, plan_id=EXCLUDED.plan_id, billing_cycle=EXCLUDED.billing_cycle, amount_inr=EXCLUDED.amount_inr, status=EXCLUDED.status, start_date=EXCLUDED.start_date, last_payment_date=EXCLUDED.last_payment_date, renewal_date=EXCLUDED.renewal_date, payment_ref=EXCLUDED.payment_ref`);
    // imported payment history (one row per billing cycle) so revenue reports work on stage
    await c.query(`DELETE FROM payments WHERE provider='import'`);
    await c.query(`INSERT INTO payments (subscription_id, user_id, amount_inr, status, provider, paid_on)
      SELECT s.id, s.user_id, s.amount_inr, 'captured', 'import', g::date FROM subscriptions s
      CROSS JOIN LATERAL generate_series(s.start_date::timestamp, coalesce(s.last_payment_date, s.start_date)::timestamp, (CASE s.billing_cycle WHEN 'Monthly' THEN '1 month' WHEN 'Quarterly' THEN '3 months' ELSE '1 year' END)::interval) g
      WHERE s.provider='import'`);
    counts.Subscriptions = data.Subscriptions.length;
  }
  if (data.SIP_Dates) {
    await c.query('DELETE FROM sip_dates');
    for (const r of data.SIP_Dates) await c.query(`INSERT INTO sip_dates (month, recommended_day, uplift_pct, alt_day_1, alt_uplift_1, alt_day_2, alt_uplift_2, alt_day_3, alt_uplift_3, status, published_on, version) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`, [r.month, r.recommended_day, r.uplift_pct, r.alt_day_1, r.alt_uplift_1, r.alt_day_2, r.alt_uplift_2, r.alt_day_3, r.alt_uplift_3, r.status, r.published_on, r.version]);
    counts.SIP_Dates = data.SIP_Dates.length;
  }
  if (data.Market_Holidays) {
    await c.query('DELETE FROM market_holidays');
    for (const r of data.Market_Holidays) await c.query('INSERT INTO market_holidays (holiday_date, exchange, description) VALUES ($1,$2,$3)', [r.holiday_date, r.exchange || 'NSE', r.description]);
    counts.Market_Holidays = data.Market_Holidays.length;
  }
  if (data.Funds || data.NAV_History) await computeFundMetrics(c);
  return counts;
}

export default async function dataModule(app: FastifyInstance) {
  const { db, cfg } = app.deps;
  const existing = async () => ({ existingFundIds: new Set((await db.query('SELECT fund_id FROM funds')).rows.map((r) => r.fund_id)), existingUserRefs: new Set((await db.query('SELECT external_ref FROM users WHERE external_ref IS NOT NULL')).rows.map((r) => r.external_ref)) });

  app.post('/admin/data/uploads', async (req, reply) => {
    const admin = requireAdmin(req);
    const file = await (req as any).file();
    if (!file) throw badRequest('Attach a file in the "file" field');
    if (!/\.(xlsx|xls|csv)$/i.test(file.filename)) throw badRequest('Unsupported file type. Upload .xlsx, .xls or .csv.');
    const buf: Buffer = await file.toBuffer();
    const csvAs = (file.fields?.csvAs as any)?.value;
    let result;
    try { result = validateWorkbook(buf, { fileName: file.filename, csvAs, ...(await existing()), allowPersonal: cfg.APP_ENV !== 'prod', todayIso: today() }); }
    catch (e: any) { throw badRequest(`Could not read this file: ${e.message}`); }
    const r = await db.query(`INSERT INTO data_uploads (file_name, size_bytes, storage_key, content, sheets, report, status, uploaded_by) VALUES ($1,$2,'db',$3,$4,$5,$6,$7) RETURNING id, created_at`, [file.filename, buf.length, buf, Object.keys(result.data), JSON.stringify(result.report), result.report.ok ? 'validated' : 'failed', admin.id]);
    await audit(db, req, { action: result.report.ok ? 'DATA_UPLOAD_VALIDATED' : 'DATA_UPLOAD_FAILED', category: 'Data', resource: file.filename, outcome: result.report.ok ? 'Success' : 'Failed', meta: { errors: result.report.errors } });
    return reply.status(201).send({ id: r.rows[0].id, fileName: file.filename, report: result.report });
  });
  app.get('/admin/data/uploads', async (req) => {
    requireAdmin(req);
    return { items: (await db.query(`SELECT d.id, d.file_name, d.size_bytes, d.sheets, d.status, d.created_at, d.published_at, (d.report->>'errors')::int errors, (d.report->>'warnings')::int warnings, u.full_name uploaded_by FROM data_uploads d LEFT JOIN users u ON u.id=d.uploaded_by ORDER BY d.created_at DESC LIMIT 50`)).rows };
  });
  app.get('/admin/data/uploads/:id', async (req) => {
    requireAdmin(req);
    const r = (await db.query('SELECT id, file_name, status, report, sheets, created_at, published_at FROM data_uploads WHERE id=$1', [(req.params as any).id])).rows[0];
    if (!r) throw notFound(); return r;
  });
  app.post('/admin/data/uploads/:id/publish', async (req) => {
    requireAdmin(req);
    const id = (req.params as any).id;
    const up = (await db.query('SELECT * FROM data_uploads WHERE id=$1', [id])).rows[0];
    if (!up) throw notFound();
    if (up.status !== 'validated') throw badRequest(`Only a validated upload can be published (status: ${up.status})`);
    const { report, data } = validateWorkbook(up.content, { fileName: up.file_name, ...(await existing()), allowPersonal: cfg.APP_ENV !== 'prod', todayIso: today() });
    if (!report.ok) { await db.query(`UPDATE data_uploads SET status='failed', report=$2 WHERE id=$1`, [id, JSON.stringify(report)]); throw badRequest('The data changed since validation and no longer passes. Upload again.', report); }
    const counts = await tx(db, async (c) => { const n = await importData(c, data); await c.query(`UPDATE data_uploads SET status='published', published_at=now() WHERE id=$1`, [id]); return n; });
    await audit(db, req, { action: 'DATASET_PUBLISHED', category: 'Data', resource: up.file_name, meta: counts });
    return { ok: true, counts };
  });
  app.post('/admin/data/uploads/:id/discard', async (req) => {
    requireAdmin(req);
    await db.query(`UPDATE data_uploads SET status='discarded', content=NULL WHERE id=$1 AND status IN ('validated','failed')`, [(req.params as any).id]);
    return { ok: true };
  });
  app.get('/admin/data/summary', async (req) => {
    requireAdmin(req);
    const r = (await db.query(`SELECT (SELECT count(*) FROM funds WHERE is_active) funds, (SELECT count(DISTINCT category) FROM funds WHERE is_active) categories, (SELECT count(*) FROM nav_history) nav_rows, (SELECT max(nav_date) FROM nav_history) last_nav, (SELECT count(*) FROM users WHERE deleted_at IS NULL) users, (SELECT count(*) FROM subscriptions) subscriptions, (SELECT count(*) FROM sip_dates) sip_months, (SELECT count(*) FROM market_holidays) holidays`)).rows[0];
    const last = (await db.query(`SELECT file_name, published_at FROM data_uploads WHERE status='published' ORDER BY published_at DESC LIMIT 1`)).rows[0];
    return { ...r, lastPublished: last ?? null };
  });
  /** Download the active dataset in the workbook format (Users/Subscriptions only outside prod). */
  app.get('/admin/data/export.xlsx', async (req, reply) => {
    requireAdmin(req);
    const wb = XLSX.utils.book_new();
    const add = (name: string, rows: any[]) => { const cols = Object.keys(SCHEMA[name].cols); XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([cols, ...rows.map((r) => cols.map((c) => r[c] ?? ''))]), name); };
    add('Funds', (await db.query(`SELECT fund_id, scheme_name, amc, category, asset_class, plan, option, risk_level, benchmark, aum_cr, expense_ratio_pct, inception_date, CASE WHEN is_active THEN 'Y' ELSE 'N' END is_active FROM funds ORDER BY fund_id`)).rows);
    add('NAV_History', (await db.query('SELECT fund_id, nav_date, nav FROM nav_history ORDER BY fund_id, nav_date')).rows);
    if (cfg.APP_ENV !== 'prod') {
      add('Users', (await db.query(`SELECT coalesce(external_ref, id::text) user_id, full_name, email, mobile, signup_date, account_status, kyc_status, CASE WHEN marketing_consent THEN 'Y' ELSE 'N' END marketing_consent FROM users WHERE deleted_at IS NULL AND role='user' ORDER BY signup_date`)).rows);
      add('Subscriptions', (await db.query(`SELECT s.id subscription_id, coalesce(u.external_ref, u.id::text) user_id, s.plan_id plan, s.billing_cycle, s.amount_inr, s.start_date, s.last_payment_date, s.renewal_date, s.status, s.payment_ref FROM subscriptions s JOIN users u ON u.id=s.user_id WHERE s.status<>'Created' ORDER BY s.start_date`)).rows);
    }
    add('SIP_Dates', (await db.query('SELECT * FROM sip_dates ORDER BY month')).rows);
    add('Market_Holidays', (await db.query('SELECT * FROM market_holidays ORDER BY holiday_date')).rows);
    reply.header('content-type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet').header('content-disposition', 'attachment; filename="mod-alpha-active-dataset.xlsx"');
    return reply.send(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
  });
  app.post('/admin/data/recompute-metrics', async (req) => { requireAdmin(req); return { funds: await computeFundMetrics(db) }; });
  app.get('/admin/data/schema', async (req) => { requireAdmin(req); return { schema: SCHEMA, personalSheetsAllowed: cfg.APP_ENV !== 'prod' }; });
  void parse; void z;
}
