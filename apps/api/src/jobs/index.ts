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
export const JOBS = { importNav, dispatchDueCampaigns, subscriptionLifecycle, processDataRequests } as const;
