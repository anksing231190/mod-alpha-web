/**
 * GST tax invoices: issue (number + snapshot of everything printed) and render as PDF.
 *
 * What a GST tax invoice carries (CGST Rule 46): supplier name, address and GSTIN; a unique serial number per
 * financial year (max 16 characters); date; recipient name and address (and GSTIN when registered); place of
 * supply with state; SAC; description; taxable value; tax rate and amount split into CGST + SGST (same state)
 * or IGST (other state); total in figures and words; reverse charge; signature of the supplier.
 * Mod Alpha's seller details come from INVOICE_* environment variables (config.ts).
 */
import type { Config } from '../../config.js';
import { Pdf, type Rgb } from '../../shared/pdf.js';
import { GST_STATES, GST_RATE, financialYear, splitTax, rupeesInWords } from '../../shared/gst.js';

type Q = { query: (sql: string, params?: unknown[]) => Promise<{ rows: any[] }> };

/** The seller block, from configuration. */
export function sellerFromConfig(cfg: Config) {
  return {
    name: cfg.INVOICE_SELLER_NAME, address: cfg.INVOICE_SELLER_ADDRESS, stateCode: cfg.INVOICE_SELLER_STATE_CODE,
    gstin: cfg.INVOICE_SELLER_GSTIN, pan: cfg.INVOICE_SELLER_PAN, llpin: cfg.INVOICE_SELLER_LLPIN,
    sebiReg: cfg.INVOICE_SEBI_REG, email: cfg.INVOICE_SUPPORT_EMAIL,
  };
}

/**
 * Create the invoice for a captured payment, inside the payment transaction. The number is
 * <PREFIX>/<yy-yy>/<5 digits>, consecutive inside each financial year (an advisory lock keeps it gap-free
 * when two payments land at the same moment).
 */
export async function issueInvoice(c: Q, cfg: Config, o: { userId: string; paymentId: string; amount: number; date: string; plan: string; cycle: string; periodEnd: string; description?: string }) {
  await c.query(`SELECT pg_advisory_xact_lock(hashtext('invoice_number'))`);
  const fy = financialYear(o.date);
  const seq = (await c.query('SELECT coalesce(max(seq),0)::int + 1 n FROM invoices WHERE fy=$1', [fy])).rows[0].n;
  const number = `${cfg.INVOICE_PREFIX}/${fy.slice(2, 4)}-${fy.slice(5)}/${String(seq).padStart(5, '0')}`;
  const u = (await c.query('SELECT full_name, email, mobile, billing_state_code, billing_address, billing_gstin FROM users WHERE id=$1', [o.userId])).rows[0];
  const seller = sellerFromConfig(cfg);
  // place of supply: the customer's state on record; if not given, the supplier's location (B2C rule)
  const pos = u.billing_state_code || (u.billing_gstin ? u.billing_gstin.slice(0, 2) : seller.stateCode);
  const t = splitTax(o.amount, seller.stateCode, pos);
  const buyer = { name: u.full_name, email: u.email, mobile: u.mobile, address: u.billing_address, stateCode: u.billing_state_code, gstin: u.billing_gstin };
  const description = o.description ?? `Mod Alpha ${o.plan} plan — ${o.cycle} subscription (research & SIP date insights)`;
  const r = await c.query(`INSERT INTO invoices (number, user_id, payment_id, amount_inr, gst_inr, issued_at, fy, seq, seller, buyer, sac, description, period_start, period_end, place_of_supply, taxable_inr, cgst_inr, sgst_inr, igst_inr)
    VALUES ($1,$2,$3,$4,$5,now(),$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18) RETURNING id, number`,
    [number, o.userId, o.paymentId, o.amount, +(t.cgst + t.sgst + t.igst).toFixed(2), fy, seq, JSON.stringify(seller), JSON.stringify(buyer), cfg.INVOICE_SAC, description, o.date, o.periodEnd, pos, t.taxable, t.cgst, t.sgst, t.igst]);
  return r.rows[0] as { id: string; number: string };
}

/**
 * GST credit note for a refund (CGST Act s.34), inside the refund transaction. Own number series per financial
 * year: CN/<yy-yy>/<5 digits>. The tax is split like the original invoice (same place of supply), so the GST it
 * reverses matches what was charged. Must be issued by 30 November after the financial year ends.
 */
export async function issueCreditNote(c: Q, cfg: Config, o: { paymentId: string; userId: string; amount: number; reason: string; refundRef?: string; date: string }) {
  await c.query(`SELECT pg_advisory_xact_lock(hashtext('credit_note_number'))`);
  const fy = financialYear(o.date);
  const seq = (await c.query('SELECT coalesce(max(seq),0)::int + 1 n FROM credit_notes WHERE fy=$1', [fy])).rows[0].n;
  const number = `CN/${fy.slice(2, 4)}-${fy.slice(5)}/${String(seq).padStart(5, '0')}`;
  const inv = (await c.query('SELECT id, seller, buyer, sac, place_of_supply FROM invoices WHERE payment_id=$1 ORDER BY issued_at LIMIT 1', [o.paymentId])).rows[0];
  const seller = inv?.seller ?? sellerFromConfig(cfg);
  const pos = inv?.place_of_supply ?? seller.stateCode;
  const t = splitTax(o.amount, seller.stateCode, pos);
  const buyer = inv?.buyer ?? null;
  const r = await c.query(`INSERT INTO credit_notes (number, fy, seq, user_id, invoice_id, payment_id, amount_inr, taxable_inr, cgst_inr, sgst_inr, igst_inr, place_of_supply, seller, buyer, sac, reason, refund_ref)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) RETURNING id, number`,
    [number, fy, seq, o.userId, inv?.id ?? null, o.paymentId, o.amount, t.taxable, t.cgst, t.sgst, t.igst, pos, JSON.stringify(seller), JSON.stringify(buyer), inv?.sac ?? cfg.INVOICE_SAC, o.reason, o.refundRef ?? null]);
  return r.rows[0] as { id: string; number: string };
}
/** A credit note in the same printable shape as an invoice (invoicePdf prints it as "CREDIT NOTE"). */
export function creditNoteView(cfg: Config, c: any) {
  const seller = c.seller ?? sellerFromConfig(cfg);
  const pos = c.place_of_supply ?? seller.stateCode;
  return {
    id: c.id, number: c.number, issuedAt: c.issued_at, seller, pos, posName: GST_STATES[pos] ?? pos,
    buyer: c.buyer ?? {}, sac: c.sac ?? cfg.INVOICE_SAC,
    description: `Refund: ${c.reason}${c.invoice_description ? ` (against: ${c.invoice_description})` : ''}`,
    periodStart: null, periodEnd: null, total: +c.amount_inr, taxable: +c.taxable_inr, cgst: +c.cgst_inr, sgst: +c.sgst_inr, igst: +c.igst_inr,
    paymentRef: c.refund_ref, paidOn: c.issued_at, docType: 'credit_note' as const, againstNumber: c.invoice_number ?? null, againstDate: c.invoice_date ?? null,
  };
}

/** One invoice with everything needed to print it. Invoices issued before v23.18 get the details filled in. */
export function invoiceView(cfg: Config, i: any) {
  const seller = i.seller ?? sellerFromConfig(cfg);
  const pos = i.place_of_supply ?? seller.stateCode;
  const t = i.taxable_inr != null ? { taxable: +i.taxable_inr, cgst: +i.cgst_inr, sgst: +i.sgst_inr, igst: +i.igst_inr } : splitTax(+i.amount_inr, seller.stateCode, pos);
  return {
    id: i.id, number: i.number, issuedAt: i.issued_at, seller, pos, posName: GST_STATES[pos] ?? pos,
    buyer: i.buyer ?? { name: i.full_name, email: i.email, mobile: i.mobile },
    sac: i.sac ?? cfg.INVOICE_SAC, description: i.description ?? `Mod Alpha ${i.plan_id ?? ''} plan — ${i.billing_cycle ?? ''} subscription`,
    periodStart: i.period_start, periodEnd: i.period_end, total: +i.amount_inr, ...t,
    paymentRef: i.provider_payment_id, paidOn: i.paid_on,
  };
}

// ---- PDF layout
const INK: Rgb = [0.13, 0.11, 0.09], MUTED: Rgb = [0.42, 0.36, 0.3], BRAND: Rgb = [0.55, 0.33, 0.16], BAND: Rgb = [0.98, 0.96, 0.92], RULE: Rgb = [0.85, 0.81, 0.75];
const money = (n: number) => `Rs. ${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const dmy = (d: any) => (d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }) : '—');

/** Render the invoice as an A4 PDF. */
export function invoicePdf(v: ReturnType<typeof invoiceView> | ReturnType<typeof creditNoteView>): Buffer {
  const cn = (v as any).docType === 'credit_note', docWord = cn ? 'credit note' : 'invoice';
  const p = new Pdf(), L = 40, R = p.width - 40, W = R - L;
  // header band: seller name, address lines, identifiers (the band grows with the lines present)
  const addr = String(v.seller.address || '').split('|').map((x: string) => x.trim()).filter(Boolean);
  const ids = [v.seller.gstin && `GSTIN: ${v.seller.gstin}`, v.seller.pan && `PAN: ${v.seller.pan}`, v.seller.llpin && `LLPIN/CIN: ${v.seller.llpin}`].filter(Boolean).join('   ·   ');
  const headLines = [...addr, ...(ids ? [ids] : []), ...(v.seller.sebiReg ? [`SEBI registration: ${v.seller.sebiReg}`] : [])];
  const bandH = Math.max(84, 64 + headLines.length * 12 + 10);
  p.rect(0, 0, p.width, bandH, { fill: BAND });
  p.rect(0, bandH, p.width, 3, { fill: BRAND });
  p.text(L, 46, v.seller.name || 'Mod Alpha', { size: 18, bold: true, color: INK });
  headLines.forEach((line, n) => p.text(L, 64 + n * 12, line, { size: 9, color: n < addr.length ? MUTED : INK }));
  p.text(R, 46, cn ? 'CREDIT NOTE' : 'TAX INVOICE', { size: 16, bold: true, color: BRAND, align: 'right' });
  p.text(R, 62, 'Original for recipient', { size: 8.5, color: MUTED, align: 'right' });

  // invoice details (right) and billed to (left)
  let y = bandH + 32;
  p.text(L, y, 'BILLED TO', { size: 8, bold: true, color: MUTED });
  const meta: [string, string][] = [[cn ? 'Credit note number' : 'Invoice number', v.number], [cn ? 'Credit note date' : 'Invoice date', dmy(v.issuedAt)], ...(cn ? [['Against invoice', String((v as any).againstNumber ?? '—')], ['Invoice date', (v as any).againstDate ? dmy((v as any).againstDate) : '—']] as [string, string][] : []), ['Place of supply', `${v.posName} (${v.pos})`], ['Reverse charge', 'No']];
  meta.forEach(([k, val], i) => { p.text(R - 170, y + i * 15, k, { size: 9, color: MUTED }); p.text(R, y + i * 15, val, { size: 9, bold: true, color: INK, align: 'right' }); });
  let by = y + 16;
  p.text(L, by, v.buyer.name || 'Customer', { size: 11, bold: true, color: INK }); by += 14;
  for (const s of [v.buyer.email, v.buyer.mobile, ...(String(v.buyer.address || '').split('|').map((x: string) => x.trim()))].filter(Boolean)) { by = p.wrap(L, by, String(s), 260, { size: 9, color: INK, lineGap: 3 }); }
  if (v.buyer.stateCode) { p.text(L, by, `State: ${GST_STATES[v.buyer.stateCode] ?? ''} (${v.buyer.stateCode})`, { size: 9, color: INK }); by += 12; }
  p.text(L, by, v.buyer.gstin ? `GSTIN: ${v.buyer.gstin}` : 'GSTIN: Unregistered (B2C)', { size: 9, color: INK }); by += 12;

  // items table
  y = Math.max(by, y + 64) + 18;
  const X = { n: L + 6, desc: L + 26, sac: R - 250, taxR: R - 128, gstR: R - 84, amtR: R - 6 };
  p.rect(L, y, W, 22, { fill: BAND });
  const hd = { size: 8.5, bold: true, color: MUTED };
  p.text(X.n, y + 14.5, '#', hd); p.text(X.desc, y + 14.5, 'Description', hd); p.text(X.sac, y + 14.5, 'SAC', hd);
  p.text(X.taxR, y + 14.5, 'Taxable value', { ...hd, align: 'right' }); p.text(X.gstR, y + 14.5, 'GST', { ...hd, align: 'right' }); p.text(X.amtR, y + 14.5, 'Amount', { ...hd, align: 'right' });
  y += 22;
  const descEnd = p.wrap(X.desc, y + 15, v.description, X.sac - X.desc - 14, { size: 9.5, color: INK, lineGap: 3 });
  let rowEnd = descEnd;
  if (v.periodStart) { p.text(X.desc, descEnd + 1, `Service period: ${dmy(v.periodStart)} – ${dmy(v.periodEnd)}`, { size: 8.5, color: MUTED }); rowEnd = descEnd + 13; }
  p.text(X.n, y + 15, '1', { size: 9.5, color: INK });
  p.text(X.sac, y + 15, v.sac, { size: 9.5, color: INK });
  p.text(X.taxR, y + 15, money(v.taxable), { size: 9.5, color: INK, align: 'right' });
  p.text(X.gstR, y + 15, `${GST_RATE}%`, { size: 9.5, color: INK, align: 'right' });
  p.text(X.amtR, y + 15, money(v.total), { size: 9.5, bold: true, color: INK, align: 'right' });
  y = rowEnd + 6;
  p.line(L, y, R, y, { color: RULE });

  // totals
  y += 20;
  const tot: [string, string, boolean][] = [['Taxable value', money(v.taxable), false]];
  if (v.igst) tot.push([`IGST @ ${GST_RATE}%`, money(v.igst), false]);
  else tot.push([`CGST @ ${GST_RATE / 2}%`, money(v.cgst), false], [`SGST @ ${GST_RATE / 2}%`, money(v.sgst), false]);
  tot.forEach(([k, val], i) => { p.text(R - 200, y + i * 16, k, { size: 9.5, color: MUTED }); p.text(R - 6, y + i * 16, val, { size: 9.5, color: INK, align: 'right' }); });
  y += tot.length * 16 + 4;
  p.rect(R - 210, y - 2, 210, 26, { fill: BAND });
  p.text(R - 200, y + 15, cn ? 'Total credited (incl. GST)' : 'Total (incl. GST)', { size: 10.5, bold: true, color: INK });
  p.text(R - 6, y + 15, money(v.total), { size: 11, bold: true, color: BRAND, align: 'right' });
  y += 40;
  p.text(L, y, 'Amount in words', { size: 8, bold: true, color: MUTED });
  y = p.wrap(L, y + 13, rupeesInWords(v.total), W, { size: 9.5, color: INK });

  // payment
  y += 10;
  p.text(L, y, cn ? 'REFUND' : 'PAYMENT', { size: 8, bold: true, color: MUTED });
  p.text(L, y + 14, cn ? `Refunded to the original payment method${v.paidOn ? ` on ${dmy(v.paidOn)}` : ''} · Refund reference ${v.paymentRef || '—'} · GST reversed under section 34 of the CGST Act` : `Paid${v.paidOn ? ` on ${dmy(v.paidOn)}` : ''} · Payment reference ${v.paymentRef || '—'}`, { size: 9, color: INK });

  // signature + notes
  y = p.height - 150;
  p.line(L, y, R, y, { color: RULE });
  p.text(R, y + 22, `For ${v.seller.name || 'Mod Alpha'}`, { size: 9.5, bold: true, color: INK, align: 'right' });
  p.text(R, y + 58, 'Authorised signatory', { size: 8.5, color: MUTED, align: 'right' });
  let ny = p.wrap(L, y + 22, `This is a computer-generated ${docWord} and does not need a physical signature.`, 300, { size: 8.5, color: MUTED });
  ny = p.wrap(L, ny + 2, `Questions about this ${docWord}: ${v.seller.email}`, 300, { size: 8.5, color: MUTED });
  if (v.seller.sebiReg) p.wrap(L, Math.max(ny + 6, y + 80), 'Registration granted by SEBI and certification from NISM in no way guarantee performance of the intermediary or provide any assurance of returns to investors.', W, { size: 7.5, color: MUTED });
  return p.toBuffer({ title: `${cn ? 'Credit note' : 'Tax invoice'} ${v.number}`, author: v.seller.name });
}
