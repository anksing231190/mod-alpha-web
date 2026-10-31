import type { Db } from '../db.js';

/** Rule-based assistant used until the LLM provider is enabled. Answers are grounded in the database. */
export async function mockAnswer(db: Db, question: string): Promise<string> {
  const s = question.toLowerCase();
  if (/date|best|when/.test(s)) {
    const r = await db.query(`SELECT * FROM sip_dates WHERE status='Published' ORDER BY month DESC LIMIT 1`);
    const d = r.rows[0];
    if (!d) return 'No SIP date has been published yet for this month.';
    const alts = [d.alt_day_1, d.alt_day_2, d.alt_day_3].filter(Boolean).join(', ');
    return `For ${d.month} the published date is the ${d.recommended_day}${d.uplift_pct != null ? ` — historically about +${d.uplift_pct}% vs a fixed-date SIP` : ''}.${alts ? ` Other good dates: ${alts}.` : ''} Historical analysis does not guarantee future returns.`;
  }
  if (s.includes('cagr')) return 'CAGR (compound annual growth rate) is the steady yearly rate that turns the starting value into the ending value. It smooths the path, so it says nothing about volatility along the way.';
  const words = s.replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter((w) => w.length > 3 && !['compare', 'fund', 'funds', 'versus', 'with', 'what', 'which', 'better'].includes(w));
  if (words.length) {
    const r = await db.query(`SELECT fund_id, scheme_name, category FROM funds WHERE is_active AND (${words.map((_, i) => `scheme_name ILIKE $${i + 1}`).join(' OR ')}) LIMIT 3`, words.map((w) => `%${w}%`));
    if (r.rows.length) {
      const parts: string[] = [];
      for (const f of r.rows) {
        const n = await db.query(`SELECT nav_date, nav FROM nav_history WHERE fund_id=$1 ORDER BY nav_date DESC LIMIT 1`, [f.fund_id]);
        const o = n.rows[0] && (await db.query(`SELECT nav FROM nav_history WHERE fund_id=$1 AND nav_date <= ($2::date - interval '5 years') ORDER BY nav_date DESC LIMIT 1`, [f.fund_id, n.rows[0].nav_date])).rows[0];
        const c5 = o ? ((Math.pow(n.rows[0].nav / o.nav, 1 / 5) - 1) * 100).toFixed(1) + '%' : 'n/a';
        parts.push(`${f.scheme_name} (${f.category}) — 5Y CAGR ${c5}`);
      }
      return `Here is what the data shows: ${parts.join('; ')}. Compare risk level, expense ratio and benchmark as well. This is not investment advice.`;
    }
  }
  return 'I can explain fund data, return definitions and SIP concepts. Try asking about CAGR, this month’s SIP date, or comparing two funds by name.';
}
