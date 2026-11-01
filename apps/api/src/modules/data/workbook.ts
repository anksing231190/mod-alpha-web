/** Server-side validator for the test-data workbook. Rules mirror docs/21_test_data_excel_format.md. */
import XLSX from 'xlsx';

// Allowed values for list columns.
const ENUM = {
  asset: ['Equity', 'Debt', 'Hybrid', 'Index', 'Other'], plan: ['Direct', 'Regular'], option: ['Growth', 'IDCW'],
  risk: ['Low', 'Low to Moderate', 'Moderate', 'Moderately High', 'High', 'Very High'], yn: ['Y', 'N'],
  acct: ['Active', 'Suspended', 'Closed'], kyc: ['Not started', 'Pending', 'In review', 'Verified', 'Rejected'],
  subPlan: ['Pro', 'Premium'], cycle: ['Monthly', 'Quarterly', 'Yearly'], subStatus: ['Active', 'Past due', 'Cancelled', 'Expired'], sip: ['Draft', 'Published', 'Archived'],
};
type Col = { t: 'id' | 'str' | 'num' | 'int' | 'date' | 'month' | 'enum' | 'email'; req?: 1; v?: string[]; gt?: number; min?: number; max?: number; ref?: string; notFuture?: 1; def?: string };
// One entry per sheet: key columns (unique together), unique columns, whether it holds personal data, and each
// column's type and rules.
export const SCHEMA: Record<string, { key: string[]; unique?: string[]; optional?: 1; personal?: 1; cols: Record<string, Col> }> = {
  Funds: { key: ['fund_id'], cols: { fund_id: { t: 'id', req: 1 }, scheme_name: { t: 'str', req: 1 }, amc: { t: 'str', req: 1 }, category: { t: 'str', req: 1 }, asset_class: { t: 'enum', v: ENUM.asset, req: 1 }, plan: { t: 'enum', v: ENUM.plan, req: 1 }, option: { t: 'enum', v: ENUM.option, req: 1 }, risk_level: { t: 'enum', v: ENUM.risk, req: 1 }, benchmark: { t: 'str' }, aum_cr: { t: 'num', min: 0 }, expense_ratio_pct: { t: 'num', min: 0, max: 5 }, inception_date: { t: 'date', req: 1 }, is_active: { t: 'enum', v: ENUM.yn, def: 'Y' } } },
  NAV_History: { key: ['fund_id', 'nav_date'], cols: { fund_id: { t: 'id', req: 1, ref: 'Funds' }, nav_date: { t: 'date', req: 1, notFuture: 1 }, nav: { t: 'num', req: 1, gt: 0 } } },
  Users: { key: ['user_id'], unique: ['email'], personal: 1, cols: { user_id: { t: 'id', req: 1 }, full_name: { t: 'str', req: 1 }, email: { t: 'email', req: 1 }, mobile: { t: 'str' }, signup_date: { t: 'date', req: 1, notFuture: 1 }, account_status: { t: 'enum', v: ENUM.acct, req: 1 }, kyc_status: { t: 'enum', v: ENUM.kyc, req: 1 }, marketing_consent: { t: 'enum', v: ENUM.yn, def: 'N' } } },
  Subscriptions: { key: ['subscription_id'], personal: 1, cols: { subscription_id: { t: 'id', req: 1 }, user_id: { t: 'id', req: 1, ref: 'Users' }, plan: { t: 'enum', v: ENUM.subPlan, req: 1 }, billing_cycle: { t: 'enum', v: ENUM.cycle, req: 1 }, amount_inr: { t: 'num', req: 1, min: 0 }, start_date: { t: 'date', req: 1, notFuture: 1 }, last_payment_date: { t: 'date', notFuture: 1 }, renewal_date: { t: 'date' }, status: { t: 'enum', v: ENUM.subStatus, req: 1 }, payment_ref: { t: 'str' } } },
  SIP_Dates: { key: ['month'], cols: { month: { t: 'month', req: 1 }, recommended_day: { t: 'int', req: 1, min: 1, max: 28 }, uplift_pct: { t: 'num' }, alt_day_1: { t: 'int', min: 1, max: 28 }, alt_uplift_1: { t: 'num' }, alt_day_2: { t: 'int', min: 1, max: 28 }, alt_uplift_2: { t: 'num' }, alt_day_3: { t: 'int', min: 1, max: 28 }, alt_uplift_3: { t: 'num' }, status: { t: 'enum', v: ENUM.sip, req: 1 }, published_on: { t: 'date' }, version: { t: 'str' } } },
  Market_Holidays: { key: ['holiday_date', 'exchange'], optional: 1, cols: { holiday_date: { t: 'date', req: 1 }, description: { t: 'str', req: 1 }, exchange: { t: 'str', def: 'NSE' } } },
};
export type Issue = { row: number | string; col?: string; msg: string };
export type SheetReport = { name: string; total: number; valid: number; errors: Issue[]; warnings: Issue[] };
export type Report = { ok: boolean; fatal?: string; sheets: SheetReport[]; ignored: string[]; errors: number; warnings: number };

const pad = (n: number) => String(n).padStart(2, '0');
// Validate and normalise one cell (Excel dates, YYYY-MM-DD text, numbers without ₹/% or commas, enums case-
// insensitive).
function cell(v: any, c: Col, todayIso: string): { v?: any; empty?: 1; err?: string } {
  if (v === undefined || v === null || (typeof v === 'string' && v.trim() === '')) return { empty: 1 };
  if (c.t === 'date') {
    let s: string;
    if (typeof v === 'number') { const p = XLSX.SSF.parse_date_code(v); if (!p) return { err: 'is not a valid date' }; s = `${p.y}-${pad(p.m)}-${pad(p.d)}`; }
    else if (v instanceof Date) s = v.toISOString().slice(0, 10);
    else { s = String(v).trim(); const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/); if (!m) return { err: `"${s}" is not a date — use YYYY-MM-DD or an Excel date` }; const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])); if (d.getUTCMonth() !== +m[2] - 1) return { err: `"${s}" is not a real calendar date` }; }
    if (c.notFuture && s > todayIso) return { err: `${s} is in the future` };
    return { v: s };
  }
  if (c.t === 'month') { if (typeof v === 'number') { const p = XLSX.SSF.parse_date_code(v); return { v: `${p.y}-${pad(p.m)}` }; } const s = String(v).trim(), m = s.match(/^(\d{4})-(\d{2})$/); return m && +m[2] >= 1 && +m[2] <= 12 ? { v: s } : { err: `"${s}" is not a month — use YYYY-MM` }; }
  if (c.t === 'num' || c.t === 'int') {
    const n = typeof v === 'number' ? v : Number(String(v).replace(/[,₹\s]/g, ''));
    if (!isFinite(n)) return { err: `"${v}" is not a number` };
    if (c.t === 'int' && !Number.isInteger(n)) return { err: `"${v}" must be a whole number` };
    if (c.gt !== undefined && !(n > c.gt)) return { err: `Must be greater than ${c.gt}` };
    if (c.min !== undefined && n < c.min) return { err: `Must be ≥ ${c.min}` };
    if (c.max !== undefined && n > c.max) return { err: `Must be ≤ ${c.max}` };
    return { v: n };
  }
  if (c.t === 'enum') { const s = String(v).trim(), hit = c.v!.find((x) => x.toLowerCase() === s.toLowerCase()); return hit ? { v: hit } : { err: `"${s}" is not allowed — use one of: ${c.v!.join(', ')}` }; }
  if (c.t === 'email') { const s = String(v).trim(); return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) ? { v: s.toLowerCase() } : { err: `"${s}" is not a valid email` }; }
  const s = String(v).trim(); if (c.t === 'id' && /\s/.test(s)) return { err: `"${s}" must not contain spaces` }; return { v: s };
}

// Validate one sheet: header row, required columns, every row, duplicate keys. Returns the clean rows and a
// report.
function readSheet(ws: XLSX.WorkSheet, name: string, todayIso: string) {
  const sch = SCHEMA[name], rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null, blankrows: false });
  const rep: SheetReport = { name, total: 0, valid: 0, errors: [], warnings: [] }, out: any[] = [];
  let missing: string[] = [];
  if (!rows.length) { rep.errors.push({ row: 1, msg: 'Sheet is empty — row 1 must contain the column headers' }); return { rep, rows: out, missing: ['*'] }; }
  const head = rows[0].map((h) => String(h ?? '').trim().toLowerCase());
  const idx: Record<string, number> = {}; for (const c of Object.keys(sch.cols)) idx[c] = head.indexOf(c);
  missing = Object.entries(sch.cols).filter(([c, d]) => idx[c] < 0 && d.req).map(([c]) => c);
  if (missing.length) { rep.errors.push({ row: 1, msg: `Missing required column(s): ${missing.join(', ')}` }); return { rep, rows: out, missing }; }
  head.forEach((h) => { if (h && !(h in sch.cols)) rep.warnings.push({ row: 1, msg: `Unknown column "${h}" will be ignored` }); });
  const seen = new Map<string, number>(), uniq: Record<string, Map<any, number>> = {}; (sch.unique ?? []).forEach((u) => (uniq[u] = new Map()));
  for (let r = 1; r < rows.length; r++) {
    const raw = rows[r]; if (!raw || raw.every((x) => x === null || String(x).trim() === '')) continue;
    rep.total++; const o: any = {}; let bad = false;
    for (const [c, d] of Object.entries(sch.cols)) {
      const p = idx[c] < 0 ? { empty: 1 as const } : cell(raw[idx[c]], d, todayIso);
      if ('empty' in p && p.empty) { if (d.req) { rep.errors.push({ row: r + 1, col: c, msg: 'Required value is empty' }); bad = true; } else o[c] = d.def ?? null; continue; }
      if (p.err) { rep.errors.push({ row: r + 1, col: c, msg: p.err }); bad = true; continue; }
      o[c] = p.v;
    }
    if (bad) continue;
    const k = sch.key.map((x) => o[x]).join('|');
    if (seen.has(k)) { rep.errors.push({ row: r + 1, msg: `Duplicate ${sch.key.join(' + ')} "${k.replace('|', ' / ')}" (first seen on row ${seen.get(k)})` }); continue; }
    seen.set(k, r + 1);
    let dup = false; for (const u in uniq) { if (uniq[u].has(o[u])) { rep.errors.push({ row: r + 1, col: u, msg: `Duplicate ${u} "${o[u]}" (row ${uniq[u].get(o[u])})` }); dup = true; } else uniq[u].set(o[u], r + 1); }
    if (dup) continue;
    o._row = r + 1; out.push(o);
  }
  if (!rep.total) rep.errors.push({ row: 2, msg: 'No data rows. Remove this sheet from the workbook if you do not want to replace it — publishing an empty sheet would delete all existing rows.' });
  return { rep, rows: out, missing };
}

/**
 * Validate a workbook buffer. Sheets present replace the matching tables; `existing` holds the keys
 * currently in the DB so cross-sheet references can be checked when only some sheets are uploaded.
 */
// Validate a whole workbook (or a CSV as one sheet): sheet names, cross-sheet references (NAV → Funds,
// Subscriptions → Users) and the personal-data rule.
export function validateWorkbook(buf: Buffer, opts: { fileName: string; csvAs?: string; existingFundIds: Set<string>; existingUserRefs: Set<string>; allowPersonal: boolean; todayIso: string }) {
  const wb = XLSX.read(buf, { type: 'buffer', dense: true });
  const report: Report = { ok: false, sheets: [], ignored: [], errors: 0, warnings: 0 };
  const map: Record<string, string> = {};
  for (const n of wb.SheetNames) { const k = Object.keys(SCHEMA).find((s) => s.toLowerCase() === n.trim().toLowerCase().replace(/\s+/g, '_')); if (k) map[k] = n; else if (n.toLowerCase() !== 'readme') report.ignored.push(n); }
  if (/\.csv$/i.test(opts.fileName) && opts.csvAs && wb.SheetNames.length === 1) map[opts.csvAs] = wb.SheetNames[0];
  if (!Object.keys(map).length) { report.fatal = 'No recognised sheets. Sheet names must be: ' + Object.keys(SCHEMA).join(', '); return { report, data: {} as Record<string, any[]> }; }
  const data: Record<string, any[]> = {};
  for (const s of Object.keys(SCHEMA)) {
    if (!map[s]) continue;
    if (SCHEMA[s].personal && !opts.allowPersonal) { report.sheets.push({ name: s, total: 0, valid: 0, errors: [{ row: '—', msg: `${s} cannot be imported in production — users and subscriptions come from real sign-ups and payments.` }], warnings: [] }); continue; }
    const r = readSheet(wb.Sheets[map[s]], s, opts.todayIso);
    if (!r.missing.length) data[s] = r.rows;
    report.sheets.push(r.rep);
  }
  const fundIds = data.Funds ? new Set(data.Funds.map((r) => r.fund_id)) : opts.existingFundIds;
  const userRefs = data.Users ? new Set(data.Users.map((r) => r.user_id)) : opts.existingUserRefs;
  const ref = (sheet: string, col: string, ids: Set<string>, target: string) => {
    if (!data[sheet]) return; const rep = report.sheets.find((x) => x.name === sheet)!; let n = 0;
    data[sheet] = data[sheet].filter((r) => { if (ids.has(r[col])) return true; if (n < 200) rep.errors.push({ row: r._row, col, msg: `${col} "${r[col]}" does not exist in ${target}` }); n++; return false; });
    if (n > 200) rep.errors.push({ row: '—', msg: `…and ${n - 200} more rows referencing unknown ${target}` });
  };
  ref('NAV_History', 'fund_id', fundIds, 'Funds'); ref('Subscriptions', 'user_id', userRefs, 'Users');
  if (data.Funds && data.NAV_History) { const has = new Set(data.NAV_History.map((r) => r.fund_id)); const no = data.Funds.filter((f) => !has.has(f.fund_id)).map((f) => f.fund_id); if (no.length) report.sheets.find((x) => x.name === 'Funds')!.warnings.push({ row: '—', msg: `${no.length} fund(s) have no NAV rows: ${no.slice(0, 8).join(', ')}${no.length > 8 ? '…' : ''}` }); }
  if (data.Funds && !data.NAV_History) report.sheets.find((x) => x.name === 'Funds')!.warnings.push({ row: '—', msg: 'Funds were uploaded without NAV_History — NAV for removed funds will be deleted.' });
  for (const s of report.sheets) { s.valid = data[s.name]?.length ?? 0; report.errors += s.errors.length; report.warnings += s.warnings.length; }
  report.ok = !report.fatal && report.errors === 0 && Object.keys(data).length > 0;
  return { report, data };
}
