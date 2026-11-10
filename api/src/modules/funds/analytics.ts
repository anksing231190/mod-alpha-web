/**
 * Fund analytics — NAV look-ups and the metrics shown everywhere in the app.
 *   CAGR (1/3/5/10 years) = (NAV_latest / NAV_on_or_before(latest − N years))^(1/N) − 1
 *   Volatility (3 y)      = annualised standard deviation of daily log returns
 *   Sharpe (3 y)          = (3-year CAGR − RISK_FREE) ÷ volatility
 * Results are stored in fund_metrics so pages never compute them on the fly.
 */
import type { Q } from '../../db.js';
import { addYears } from '../../shared/dates.js';

// Risk-free rate used by the Sharpe ratio (6.5 %). Planned: make it an admin setting.
export const RISK_FREE = 0.065;
// NAV on a date, or the closest earlier business day.
async function navOnOrBefore(q: Q, fundId: string, date: string) {
  return (await q.query('SELECT nav_date, nav FROM nav_history WHERE fund_id=$1 AND nav_date <= $2 ORDER BY nav_date DESC LIMIT 1', [fundId, date])).rows[0] ?? null;
}
// NAV on a date, or the next business day (used when buying in the calculators).
export async function navOnOrAfter(q: Q, fundId: string, date: string) {
  return (await q.query('SELECT nav_date, nav FROM nav_history WHERE fund_id=$1 AND nav_date >= $2 ORDER BY nav_date ASC LIMIT 1', [fundId, date])).rows[0] ?? null;
}
// Most recent NAV of a fund.
export async function latestNav(q: Q, fundId: string) {
  return (await q.query('SELECT nav_date, nav FROM nav_history WHERE fund_id=$1 ORDER BY nav_date DESC LIMIT 1', [fundId])).rows[0] ?? null;
}
// Keep at most `max` evenly spaced rows (always including the last) — for charts.
export function sample<T>(rows: T[], max: number): T[] {
  if (rows.length <= max) return rows;
  const step = Math.ceil(rows.length / max), out: T[] = [];
  for (let i = 0; i < rows.length; i += step) out.push(rows[i]);
  if (out.at(-1) !== rows.at(-1)) out.push(rows.at(-1)!);
  return out;
}
/** Recompute metrics for one or all funds. CAGR = (NAV_t / NAV_{t-N})^(1/N) − 1. */
// Recompute returns, volatility, Sharpe and the sparkline for all (or some) funds. Runs after imports and nightly.
export async function computeFundMetrics(q: Q, fundIds?: string[]) {
  const ids = fundIds ?? (await q.query('SELECT fund_id FROM funds')).rows.map((r: any) => r.fund_id);
  for (const id of ids) {
    const last = await latestNav(q, id);
    if (!last) { await q.query('DELETE FROM fund_metrics WHERE fund_id=$1', [id]); continue; }
    const first = (await q.query('SELECT nav_date FROM nav_history WHERE fund_id=$1 ORDER BY nav_date LIMIT 1', [id])).rows[0].nav_date;
    const r: Record<number, number | null> = {};
    for (const y of [1, 3, 5, 10]) {
      const target = addYears(last.nav_date, -y);
      let p = await navOnOrBefore(q, id, target);
      if (!p) { const f = await navOnOrAfter(q, id, target); if (f && (new Date(f.nav_date).getTime() - new Date(target).getTime()) / 864e5 <= 7) p = f; }
      r[y] = p ? +((Math.pow(last.nav / p.nav, 1 / y) - 1) * 100).toFixed(2) : null;
    }
    const series = (await q.query(`SELECT nav FROM nav_history WHERE fund_id=$1 AND nav_date > $2 ORDER BY nav_date`, [id, addYears(last.nav_date, -3)])).rows.map((x: any) => x.nav as number);
    let vol: number | null = null, sharpe: number | null = null;
    if (series.length > 60) {
      const lr = series.slice(1).map((v, i) => Math.log(v / series[i]));
      const mu = lr.reduce((a, b) => a + b, 0) / lr.length;
      vol = Math.sqrt(lr.reduce((a, b) => a + (b - mu) ** 2, 0) / (lr.length - 1)) * Math.sqrt(252);
      sharpe = r[3] != null ? (r[3] / 100 - RISK_FREE) / vol : null;
    }
    const base = (await navOnOrAfter(q, id, '2021-01-01')) ?? (await q.query('SELECT nav FROM nav_history WHERE fund_id=$1 ORDER BY nav_date LIMIT 1', [id])).rows[0];
    const yr = (await q.query(`SELECT nav FROM nav_history WHERE fund_id=$1 AND nav_date > $2 ORDER BY nav_date`, [id, addYears(last.nav_date, -1)])).rows.map((x: any) => x.nav);
    await q.query(`INSERT INTO fund_metrics (fund_id, nav, nav_date, r1, r3, r5, r10, vol3, sharpe3, since_2021, spark, computed_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11, now())
      ON CONFLICT (fund_id) DO UPDATE SET nav=$2, nav_date=$3, r1=$4, r3=$5, r5=$6, r10=$7, vol3=$8, sharpe3=$9, since_2021=$10, spark=$11, computed_at=now()`,
      [id, last.nav, last.nav_date, r[1], r[3], r[5], r[10], vol != null ? +(vol * 100).toFixed(2) : null, sharpe != null ? +sharpe.toFixed(2) : null, base ? +(last.nav / base.nav).toFixed(4) : null, JSON.stringify(sample(yr, 24))]);
  }
  return ids.length;
}
