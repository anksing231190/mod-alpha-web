import type { Deps } from '../app.js';
import { dispatchCampaign } from '../modules/notifications.js';
import { computeFundMetrics } from '../modules/analytics.js';
import { exportUserData } from '../modules/me.js';
import { audit } from '../lib/audit.js';

/** Import the latest NAVs from the configured provider (AMFI or mock). Only funds we track are stored. */
export async function importNav(d: Deps) {
  const rows = await d.providers.nav.fetchLatest();
  const map = new Map((await d.db.query(`SELECT fund_id, coalesce(amfi_code, fund_id) code FROM funds WHERE is_active`)).rows.map((r) => [r.code, r.fund_id]));
  let n = 0; const touched = new Set<string>();
  for (const r of rows) { const id = map.get(r.amfiCode); if (!id) continue; const x = await d.db.query('INSERT INTO nav_history (fund_id, nav_date, nav) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING', [id, r.navDate, r.nav]); if (x.rowCount) { n++; touched.add(id); } }
  if (touched.size) await computeFundMetrics(d.db, [...touched]);
  await audit(d.db, null, { action: 'NAV_FEED_IMPORTED', category: 'Data', resource: d.providers.nav.name, meta: { rows: n }, actorLabel: 'jobs' });
  return { imported: n, funds: touched.size };
}
export async function dispatchDueCampaigns(d: Deps) {
  const due = (await d.db.query(`SELECT id FROM campaigns WHERE status='Scheduled' AND scheduled_for <= now() ORDER BY scheduled_for`)).rows;
  const out = []; for (const c of due) out.push(await dispatchCampaign(d, c.id)); return out;
}
/** Expire cancelled-at-period-end plans; mark overdue renewals Past due (gateway webhooks normally do this). */
export async function subscriptionLifecycle(d: Deps) {
  const ended = await d.db.query(`UPDATE subscriptions SET status='Cancelled', cancelled_at=now() WHERE cancel_at_period_end AND status IN ('Active','Past due') AND renewal_date <= CURRENT_DATE RETURNING id`);
  const overdue = await d.db.query(`UPDATE subscriptions SET status='Past due' WHERE status='Active' AND provider<>'import' AND renewal_date < CURRENT_DATE - 3 RETURNING id`);
  const stale = await d.db.query(`UPDATE subscriptions SET status='Expired' WHERE status='Created' AND created_at < now() - interval '1 day' RETURNING id`);
  return { ended: ended.rowCount, pastDue: overdue.rowCount, abandonedCheckouts: stale.rowCount };
}
/** Fulfil DPDP data-export requests and anonymise accounts whose deletion grace period (30 days) has passed. */
export async function processDataRequests(d: Deps) {
  const ex = (await d.db.query(`SELECT d.id, d.user_id, u.email FROM data_requests d JOIN users u ON u.id=d.user_id WHERE d.kind='export' AND d.status='Requested'`)).rows;
  for (const r of ex) {
    await exportUserData(d.db, r.user_id);
    await d.db.query(`UPDATE data_requests SET status='Completed', completed_at=now() WHERE id=$1`, [r.id]);
    if (r.email) await d.providers.email.send({ to: r.email, subject: 'Your Mod Alpha data export is ready', text: 'Your data export is ready. Download it from Settings → Data & Privacy within 7 days.' });
  }
  const del = (await d.db.query(`SELECT id, user_id FROM data_requests WHERE kind='deletion' AND status='Requested' AND created_at < now() - interval '30 days'`)).rows;
  for (const r of del) {
    await d.db.query(`UPDATE users SET email=NULL, mobile='deleted:' || id::text, full_name='Deleted user', password_hash=NULL, google_sub=NULL, account_status='Closed', deleted_at=now() WHERE id=$1`, [r.user_id]);
    await d.db.query('DELETE FROM sessions WHERE user_id=$1', [r.user_id]); await d.db.query('DELETE FROM preferences WHERE user_id=$1', [r.user_id]); await d.db.query('DELETE FROM watchlist WHERE user_id=$1', [r.user_id]);
    await d.db.query(`UPDATE data_requests SET status='Completed', completed_at=now() WHERE id=$1`, [r.id]);
    await audit(d.db, null, { action: 'ACCOUNT_ANONYMISED', category: 'Account', resource: r.user_id, actorLabel: 'jobs' });
  }
  return { exports: ex.length, deletions: del.length };
}
/** Daily (09:00 IST): remind paid subscribers who chose their own SIP day. If their day is past the end of a
 *  short month (e.g. 31 in November) they are reminded on the last day. In-app always; email/SMS per their channels. */
export async function customSipReminders(d: Deps, today?: string) {
  const ist = today ?? new Date(Date.now() + 5.5 * 3600e3).toISOString().slice(0, 10);
  const [y, m, dd] = ist.split('-').map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const users = (await d.db.query(`SELECT DISTINCT u.id, u.full_name, u.email, u.mobile, p.data prefs FROM users u
      JOIN subscriptions s ON s.user_id=u.id AND s.status='Active' JOIN preferences p ON p.user_id=u.id
     WHERE u.account_status='Active' AND u.deleted_at IS NULL AND p.data->'sipReminder'->>'mode'='custom'`)).rows;
  const sip = (await d.db.query(`SELECT recommended_day FROM sip_dates WHERE status='Published' AND month=$1`, [ist.slice(0, 7)])).rows[0];
  const month = new Date(Date.UTC(y, m - 1, 1)).toLocaleString('en-GB', { month: 'long', timeZone: 'UTC' });
  let sent = 0;
  for (const u of users) {
    const day = Math.min(Number(u.prefs.sipReminder.day), last);
    if (day !== dd || u.prefs.topics?.sipReminder === false) continue;
    const link = `#/user/overview?sip=${ist}`;   // one reminder per user per date (also the dedupe key)
    const dup = await d.db.query(`SELECT 1 FROM notifications WHERE user_id=$1 AND kind='custom_sip' AND link=$2`, [u.id, link]);
    if (dup.rowCount) continue;
    const title = `Your SIP reminder for ${dd} ${month}`;
    const body = `This is the reminder you set for day ${u.prefs.sipReminder.day} of every month.${sip ? ` Mod Alpha's recommended date this month is ${sip.recommended_day} ${month}.` : ''} Invest through your own provider if appropriate. Mod Alpha does not place orders.`;
    await d.db.query(`INSERT INTO notifications (user_id, kind, title, body, link) VALUES ($1,'custom_sip',$2,$3,$4)`, [u.id, title, body, link]);
    try {
      if (u.email && u.prefs.channels?.email !== false) await d.providers.email.send({ to: u.email, subject: title, text: `Hi ${u.full_name},\n\n${body}\n\nChange this in Settings → Notifications.` });
      if (u.mobile && u.prefs.channels?.sms) await d.providers.sms.send({ to: u.mobile, text: `Mod Alpha: your SIP reminder for ${dd} ${month}. Invest via your own provider. Not advice.`, vars: {} });
    } catch (e) { /* in-app reminder is already stored; provider errors are retried next day by design */ }
    sent++;
  }
  return { date: ist, candidates: users.length, sent };
}

export const JOBS = { importNav, dispatchDueCampaigns, subscriptionLifecycle, processDataRequests, customSipReminders } as const;
