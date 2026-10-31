import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { parse, isoDate } from '../lib/validate.js';
import { badRequest, notFound } from '../lib/errors.js';
import { requireUser } from '../lib/auth.js';
import { addMonths, addYears, daysBetween, today, toDate, iso } from '../lib/dates.js';
import { latestNav, navOnOrAfter, sample } from './analytics.js';

export const fundView = (r: any) => ({
  id: r.fund_id, name: r.scheme_name, short: r.scheme_name.replace(/ Fund.*$/, ''), amc: r.amc, category: r.category, type: r.asset_class, plan: r.plan, option: r.option,
  risk: r.risk_level, riskLabel: r.risk_level, benchmark: r.benchmark, aum: r.aum_cr != null ? `₹${Math.round(r.aum_cr).toLocaleString('en-IN')} Cr` : '—', aumCr: r.aum_cr, expense: r.expense_ratio_pct, inception: r.inception_date,
  nav: r.nav, navDate: r.nav_date, returns: { 1: r.r1, 3: r.r3, 5: r.r5, 10: r.r10 }, vol: r.vol3, sharpe: r.sharpe3, since2021: r.since_2021, spark: r.spark ?? [],
});
const PERIOD: Record<string, (d: string) => string> = { '1M': (d) => addMonths(d, -1), '3M': (d) => addMonths(d, -3), '6M': (d) => addMonths(d, -6), '1Y': (d) => addYears(d, -1), '3Y': (d) => addYears(d, -3), '5Y': (d) => addYears(d, -5), '10Y': (d) => addYears(d, -10), MAX: () => '1900-01-01' };

export default async function funds(app: FastifyInstance) {
  const { db } = app.deps;
  const SORT: Record<string, string> = { '1y': 'm.r1', '3y': 'm.r3', '5y': 'm.r5', '10y': 'm.r10', name: 'f.scheme_name', aum: 'f.aum_cr' };

  app.get('/funds', async (req) => {
    const p = parse(z.object({ q: z.string().max(80).optional(), category: z.string().optional(), assetClass: z.string().optional(), sort: z.enum(['1y', '3y', '5y', '10y', 'name', 'aum']).default('5y'), page: z.coerce.number().int().min(1).default(1), pageSize: z.coerce.number().int().min(1).max(500).default(50) }), req.query);
    const w: string[] = ['f.is_active'], a: any[] = [];
    if (p.q) { a.push(`%${p.q}%`); w.push(`(f.scheme_name ILIKE $${a.length} OR f.amc ILIKE $${a.length} OR f.category ILIKE $${a.length} OR f.fund_id ILIKE $${a.length})`); }
    if (p.category && p.category !== 'All') { a.push(p.category); w.push(`(f.category=$${a.length} OR f.asset_class=$${a.length})`); }
    if (p.assetClass) { a.push(p.assetClass); w.push(`f.asset_class=$${a.length}`); }
    const where = w.join(' AND ');
    const total = (await db.query(`SELECT count(*)::int n FROM funds f WHERE ${where}`, a)).rows[0].n;
    a.push(p.pageSize, (p.page - 1) * p.pageSize);
    const rows = (await db.query(`SELECT f.*, m.* FROM funds f LEFT JOIN fund_metrics m USING (fund_id) WHERE ${where} ORDER BY ${SORT[p.sort]} ${p.sort === 'name' ? 'ASC' : 'DESC'} NULLS LAST, f.fund_id LIMIT $${a.length - 1} OFFSET $${a.length}`, a)).rows;
    return { items: rows.map(fundView), total, page: p.page, pageSize: p.pageSize };
  });
  app.get('/funds/categories', async () => ({ categories: (await db.query(`SELECT category, count(*)::int funds FROM funds WHERE is_active GROUP BY category ORDER BY category`)).rows }));
  app.get('/funds/:id', async (req) => {
    const r = (await db.query('SELECT f.*, m.* FROM funds f LEFT JOIN fund_metrics m USING (fund_id) WHERE f.fund_id=$1', [(req.params as any).id])).rows[0];
    if (!r) throw notFound('Fund not found');
    return { fund: fundView(r) };
  });
  app.get('/funds/:id/nav', async (req) => {
    const p = parse(z.object({ period: z.enum(['1M', '3M', '6M', '1Y', '3Y', '5Y', '10Y', 'MAX']).default('5Y'), points: z.coerce.number().int().min(2).max(2000).default(40), from: isoDate.optional(), to: isoDate.optional() }), req.query);
    const id = (req.params as any).id;
    const last = await latestNav(db, id); if (!last) throw notFound('No NAV data for this fund');
    const from = p.from ?? PERIOD[p.period](last.nav_date), to = p.to ?? last.nav_date;
    const rows = (await db.query('SELECT nav_date AS d, nav AS v FROM nav_history WHERE fund_id=$1 AND nav_date BETWEEN $2 AND $3 ORDER BY nav_date', [id, from, to])).rows;
    return { fundId: id, period: p.period, from, to, points: sample(rows, p.points) };
  });

  async function defaultFund() { return (await db.query(`SELECT fund_id FROM fund_metrics ORDER BY r5 DESC NULLS LAST LIMIT 1`)).rows[0]?.fund_id; }

  /** Lump-sum "what if": units bought at the first NAV on/after `date`, valued at the latest NAV. */
  app.post('/calc/lumpsum', async (req) => {
    const b = parse(z.object({ fundId: z.string().optional(), date: isoDate, amount: z.number().min(500).max(1e10) }), req.body);
    const fundId = b.fundId ?? (await defaultFund()); if (!fundId) throw badRequest('No fund data loaded');
    const buy = await navOnOrAfter(db, fundId, b.date), last = await latestNav(db, fundId);
    if (!buy || !last || buy.nav_date >= last.nav_date) throw badRequest('No NAV history for this fund on or after the selected date');
    const units = b.amount / buy.nav, value = units * last.nav, yrs = daysBetween(buy.nav_date, last.nav_date) / 365.25;
    const rows = (await db.query('SELECT nav_date d, nav v FROM nav_history WHERE fund_id=$1 AND nav_date BETWEEN $2 AND $3 ORDER BY nav_date', [fundId, buy.nav_date, last.nav_date])).rows;
    return { fundId, investedOn: buy.nav_date, buyNav: buy.nav, asOf: last.nav_date, units: +units.toFixed(4), value: Math.round(value), gain: Math.round(value - b.amount), totalReturnPct: +((value / b.amount - 1) * 100).toFixed(2), cagrPct: yrs >= 1 ? +((Math.pow(value / b.amount, 1 / yrs) - 1) * 100).toFixed(2) : null, years: +yrs.toFixed(1), journey: sample(rows, 24).map((x: any) => ({ d: x.d, value: Math.round(units * x.v) })) };
  });

  /** SIP comparison: fixed day each month vs the published MOD Alpha date for that month (fallback: fixed day). */
  app.post('/calc/sip-compare', async (req) => {
    const b = parse(z.object({ fundId: z.string().optional(), amount: z.number().min(500).max(1e8), start: isoDate, end: isoDate, fixedDay: z.number().int().min(1).max(28).optional() }), req.body);
    if (b.end <= b.start) throw badRequest('End date must be after start date');
    const fundId = b.fundId ?? (await defaultFund()); if (!fundId) throw badRequest('No fund data loaded');
    const last = await latestNav(db, fundId); if (!last) throw badRequest('No NAV data');
    const end = b.end > last.nav_date ? last.nav_date : b.end;
    const fixedDay = b.fixedDay ?? toDate(b.start).getUTCDate();
    const dates = new Map((await db.query('SELECT month, recommended_day FROM sip_dates')).rows.map((r: any) => [r.month, r.recommended_day]));
    const navs = (await db.query('SELECT nav_date d, nav v FROM nav_history WHERE fund_id=$1 AND nav_date BETWEEN $2 AND $3 ORDER BY nav_date', [fundId, b.start, end])).rows as { d: string; v: number }[];
    if (navs.length < 2) throw badRequest('Not enough NAV history in this range');
    const navAt = (d: string) => { let lo = 0, hi = navs.length - 1; if (navs[hi].d < d) return null; while (lo < hi) { const m = (lo + hi) >> 1; if (navs[m].d < d) lo = m + 1; else hi = m; } return navs[lo]; };
    let uf = 0, um = 0, months = 0, aiMonths = 0; const path: any[] = [];
    for (let m = iso(new Date(Date.UTC(toDate(b.start).getUTCFullYear(), toDate(b.start).getUTCMonth(), 1))); m <= end; m = addMonths(m, 1)) {
      const ym = m.slice(0, 7), fd = `${ym}-${String(fixedDay).padStart(2, '0')}`, ad = dates.has(ym) ? `${ym}-${String(dates.get(ym)).padStart(2, '0')}` : fd;
      if (fd < b.start || fd > end) continue;
      const nf = navAt(fd), na = navAt(ad > end ? fd : ad); if (!nf || !na) continue;
      uf += b.amount / nf.v; um += b.amount / na.v; months++; if (dates.has(ym)) aiMonths++;
      path.push({ month: ym, invested: months * b.amount, fixed: Math.round(uf * nf.v), modAlpha: Math.round(um * na.v) });
    }
    const lastNav = navAt(end) ?? navs.at(-1)!;
    const fixedVal = uf * lastNav.v, modVal = um * lastNav.v;
    return { fundId, months, monthsWithPublishedDate: aiMonths, fixedDay, invested: months * b.amount, fixedValue: Math.round(fixedVal), modAlphaValue: Math.round(modVal), extra: Math.round(modVal - fixedVal), extraPct: fixedVal ? +((modVal / fixedVal - 1) * 100).toFixed(2) : 0, asOf: lastNav.d, path: sample(path, 24), note: aiMonths < months ? `Published SIP dates exist for ${aiMonths} of ${months} months; other months use the fixed day.` : undefined };
  });
}
