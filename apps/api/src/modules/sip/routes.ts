/**
 * SIP date module — the monthly recommended investment day, Mod Alpha's core output.
 *   GET /sip-dates/current · GET /sip-dates (history)
 *   POST /admin/sip-dates/validate (checks only) · POST /admin/sip-dates/publish (new version + reminder campaign)
 */
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { parse } from '../../shared/validate.js';
import { badRequest } from '../../shared/errors.js';
import { requireAdmin } from '../auth/session.js';
import { audit } from '../../shared/audit.js';
import { tx } from '../../db.js';
import { addDays } from '../../shared/dates.js';

// Request body for validate / publish: month YYYY-MM, day 1–28, a reason (kept for the audit trail) and optional
// alternative days.
const month = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Use YYYY-MM');
const body = z.object({ month, day: z.number().int().min(1).max(28), reason: z.string().trim().min(5, 'Give a reason (min 5 characters)').max(500), upliftPct: z.number().min(-50).max(50).optional(), alternatives: z.array(z.object({ day: z.number().int().min(1).max(28), upliftPct: z.number() })).max(3).optional() });

export default async function sip(app: FastifyInstance) {
  const { db } = app.deps;
  // GET /sip-dates/current — latest published date (public).
  app.get('/sip-dates/current', async () => {
    const r = await db.query(`SELECT * FROM sip_dates WHERE status='Published' ORDER BY (month = to_char(CURRENT_DATE,'YYYY-MM')) DESC, (month <= to_char(CURRENT_DATE,'YYYY-MM')) DESC, CASE WHEN month <= to_char(CURRENT_DATE,'YYYY-MM') THEN month END DESC, month ASC LIMIT 1`);
    const upcoming = await db.query(`SELECT * FROM sip_dates WHERE status='Published' AND month > to_char(CURRENT_DATE,'YYYY-MM') ORDER BY month LIMIT 3`);
    return { current: r.rows[0] ?? null, upcoming: upcoming.rows };
  });
  // GET /sip-dates — published history, optional ?from=&to= months.
  app.get('/sip-dates', async (req) => {
    const p = parse(z.object({ from: month.optional(), to: month.optional() }), req.query);
    return { items: (await db.query(`SELECT * FROM sip_dates WHERE status<>'Draft' AND ($1::text IS NULL OR month >= $1) AND ($2::text IS NULL OR month <= $2) ORDER BY month DESC`, [p.from ?? null, p.to ?? null])).rows };
  });

  // Pre-publish checks: weekend, market holiday, already published (re-publishing creates a new version), past
  // date; plus how many subscribers will be notified.
  async function checks(b: z.infer<typeof body>) {
    const date = `${b.month}-${String(b.day).padStart(2, '0')}`, d = new Date(date + 'T00:00:00Z');
    const out: { level: 'ok' | 'warn' | 'error'; msg: string }[] = [];
    const dow = d.getUTCDay();
    out.push(dow === 0 || dow === 6 ? { level: 'warn', msg: `${date} is a ${dow === 0 ? 'Sunday' : 'Saturday'} — most SIPs execute on the next business day.` } : { level: 'ok', msg: `${date} is a weekday.` });
    const hol = (await db.query('SELECT description FROM market_holidays WHERE holiday_date=$1', [date])).rows[0];
    out.push(hol ? { level: 'warn', msg: `${date} is a market holiday (${hol.description}).` } : { level: 'ok', msg: 'Not a market holiday.' });
    const ex = (await db.query('SELECT * FROM sip_dates WHERE month=$1', [b.month])).rows[0];
    if (ex?.status === 'Published') out.push({ level: 'warn', msg: `${b.month} is already published for the ${ex.recommended_day}${ex.recommended_day === b.day ? ' (same day)' : ''}. Publishing creates a new version and notifies subscribers of the change.` });
    if (date < new Date().toISOString().slice(0, 10)) out.push({ level: 'error', msg: 'The date is in the past.' });
    const recipients = (await db.query(`SELECT count(DISTINCT s.user_id)::int n FROM subscriptions s JOIN users u ON u.id=s.user_id WHERE s.status='Active' AND u.account_status='Active'`)).rows[0].n;
    return { date, checks: out, ok: !out.some((c) => c.level === 'error'), recipients, existing: ex ?? null };
  }
  // POST /admin/sip-dates/validate — run the checks without saving.
  app.post('/admin/sip-dates/validate', async (req) => { requireAdmin(req); return checks(parse(body, req.body)); });
  // POST /admin/sip-dates/publish — save as Published (new version), audit it and schedule the SIP reminder
  // campaign, in one transaction.
  app.post('/admin/sip-dates/publish', async (req) => {
    const admin = requireAdmin(req);
    const b = parse(body, req.body);
    const v = await checks(b);
    if (!v.ok) throw badRequest('Configuration has blocking problems', v.checks);
    const res = await tx(db, async (c) => {
      const prev = (await c.query('SELECT version FROM sip_dates WHERE month=$1', [b.month])).rows[0];
      const n = prev?.version?.match(/v(\d+)\.(\d+)/);
      const version = n ? `v${n[1]}.${+n[2] + 1}` : `v${b.month.replace('-', '')}.0`;
      await c.query(`UPDATE sip_dates SET status='Archived' WHERE status='Published' AND month<>$1 AND month < to_char(CURRENT_DATE, 'YYYY-MM')`, [b.month]);
      const a = b.alternatives ?? [];
      await c.query(`INSERT INTO sip_dates (month, recommended_day, uplift_pct, alt_day_1, alt_uplift_1, alt_day_2, alt_uplift_2, alt_day_3, alt_uplift_3, status, published_on, version, reason, published_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'Published',CURRENT_DATE,$10,$11,$12)
        ON CONFLICT (month) DO UPDATE SET recommended_day=$2, uplift_pct=coalesce($3, sip_dates.uplift_pct), alt_day_1=coalesce($4, sip_dates.alt_day_1), alt_uplift_1=coalesce($5, sip_dates.alt_uplift_1), alt_day_2=coalesce($6, sip_dates.alt_day_2), alt_uplift_2=coalesce($7, sip_dates.alt_uplift_2), alt_day_3=coalesce($8, sip_dates.alt_day_3), alt_uplift_3=coalesce($9, sip_dates.alt_uplift_3), status='Published', published_on=CURRENT_DATE, version=$10, reason=$11, published_by=$12`,
        [b.month, b.day, b.upliftPct ?? null, a[0]?.day ?? null, a[0]?.upliftPct ?? null, a[1]?.day ?? null, a[1]?.upliftPct ?? null, a[2]?.day ?? null, a[2]?.upliftPct ?? null, version, b.reason, admin.id]);
      await c.query(`INSERT INTO notifications (user_id, kind, title, body, link) VALUES (NULL,'sip_date',$1,$2,'#/user/overview')`, [`SIP date for ${b.month} published`, `This month's recommended SIP date is ${v.date}. You will get a reminder before the date.`]);
      // schedule the reminder campaign (sent by the jobs worker)
      const tpl = (await c.query(`SELECT id, channels FROM notification_templates WHERE key='sip_reminder'`)).rows[0];
      if (tpl) await c.query(`INSERT INTO campaigns (name, template_id, channels, audience, scheduled_for, status, created_by) VALUES ($1,$2,$3,'active_subscribers', (($4::date - 2) + time '09:00') AT TIME ZONE 'Asia/Kolkata', 'Scheduled', $5)`, [`SIP reminder ${b.month}`, tpl.id, tpl.channels, v.date, admin.id]);
      await audit(c, req, { action: 'SIP_DATE_PUBLISHED', category: 'Configuration', resource: `${b.month} · ${version}`, meta: { day: b.day, reason: b.reason } });
      return { version };
    });
    return { ok: true, month: b.month, day: b.day, date: v.date, version: res.version, recipients: v.recipients, reminderOn: addDays(v.date, -2) };
  });
}
