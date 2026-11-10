/**
 * Daily NAV feed — provider adapter.
 * Switch: NAV_PROVIDER = mock | amfi (credentials in env; see docs/23_mocks_and_replacements.md).
 * Mock: synthesises the next business day's NAV from the last stored value. Real: AMFI NAVAll.txt (semicolon-separated, parsed below).
 */
import { type Ctx, http } from './shared.js';

export interface NavRow { amfiCode: string; schemeName: string; navDate: string; nav: number }
export interface NavProvider { name: string; fetchLatest(): Promise<NavRow[]> }
export const mockNav = (ctx: Ctx): NavProvider => ({
  name: 'mock',
  async fetchLatest() {
    // Synthesises the next business day's NAV from the last stored NAV (small random walk).
    const r = await ctx.db.query(`SELECT f.fund_id, coalesce(f.amfi_code, f.fund_id) code, f.scheme_name, n.nav_date, n.nav FROM funds f JOIN LATERAL (SELECT nav_date, nav FROM nav_history WHERE fund_id=f.fund_id ORDER BY nav_date DESC LIMIT 1) n ON true WHERE f.is_active`);
    return r.rows.map((x: any) => { const d = new Date(x.nav_date + 'T00:00:00Z'); do d.setUTCDate(d.getUTCDate() + 1); while ([0, 6].includes(d.getUTCDay())); return { amfiCode: x.code, schemeName: x.scheme_name, navDate: d.toISOString().slice(0, 10), nav: +(x.nav * (1 + (Math.random() - 0.48) * 0.012)).toFixed(4) }; });
  },
});
export const amfi = (ctx: Ctx): NavProvider => ({
  name: 'amfi',
  async fetchLatest() {
    const { text } = await http(ctx.cfg.AMFI_NAV_URL, { timeoutMs: 60000 });
    const M: Record<string, string> = { Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06', Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12' };
    const out: NavRow[] = [];
    for (const line of text.split(/\r?\n/)) {
      const p = line.split(';'); if (p.length < 6 || !/^\d+$/.test(p[0])) continue;
      const nav = Number(p[4]), dm = p[5].trim().match(/^(\d{2})-([A-Za-z]{3})-(\d{4})$/);
      if (!isFinite(nav) || nav <= 0 || !dm) continue;
      out.push({ amfiCode: p[0], schemeName: p[3].trim(), navDate: `${dm[3]}-${M[dm[2]]}-${dm[1]}`, nav });
    }
    return out;
  },
});
