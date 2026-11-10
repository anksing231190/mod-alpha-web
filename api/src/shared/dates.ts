/**
 * Date helpers working on 'YYYY-MM-DD' strings in UTC (no time-zone surprises).
 */
export const iso = (d: Date) => d.toISOString().slice(0, 10);
export const toDate = (s: string) => new Date(s + 'T00:00:00Z');
export function addDays(s: string, n: number) { const d = toDate(s); d.setUTCDate(d.getUTCDate() + n); return iso(d); }
export function addMonths(s: string, n: number) { const d = toDate(s); d.setUTCMonth(d.getUTCMonth() + n); return iso(d); }
export function addYears(s: string, n: number) { const d = toDate(s); d.setUTCFullYear(d.getUTCFullYear() + n); return iso(d); }
export const today = () => iso(new Date());
export const daysBetween = (a: string, b: string) => Math.round((toDate(b).getTime() - toDate(a).getTime()) / 864e5);
