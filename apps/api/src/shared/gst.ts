/**
 * GST helpers for tax invoices: state codes, financial year, CGST/SGST vs IGST split and amount in words.
 * Prices on Mod Alpha are GST-inclusive (18%), so the taxable value is worked out backwards from the total.
 */

/** GST state / union territory codes. */
export const GST_STATES: Record<string, string> = {
  '01': 'Jammu and Kashmir', '02': 'Himachal Pradesh', '03': 'Punjab', '04': 'Chandigarh', '05': 'Uttarakhand', '06': 'Haryana',
  '07': 'Delhi', '08': 'Rajasthan', '09': 'Uttar Pradesh', '10': 'Bihar', '11': 'Sikkim', '12': 'Arunachal Pradesh', '13': 'Nagaland',
  '14': 'Manipur', '15': 'Mizoram', '16': 'Tripura', '17': 'Meghalaya', '18': 'Assam', '19': 'West Bengal', '20': 'Jharkhand',
  '21': 'Odisha', '22': 'Chhattisgarh', '23': 'Madhya Pradesh', '24': 'Gujarat', '26': 'Dadra and Nagar Haveli and Daman and Diu',
  '27': 'Maharashtra', '29': 'Karnataka', '30': 'Goa', '31': 'Lakshadweep', '32': 'Kerala', '33': 'Tamil Nadu', '34': 'Puducherry',
  '35': 'Andaman and Nicobar Islands', '36': 'Telangana', '37': 'Andhra Pradesh', '38': 'Ladakh',
};
export const GST_RATE = 18;
export const GSTIN_RE = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

/** Indian financial year of a date (YYYY-MM-DD): '2026-27' for 1 Apr 2026 – 31 Mar 2027. */
export function financialYear(d: string) {
  const y = +d.slice(0, 4), m = +d.slice(5, 7), start = m >= 4 ? y : y - 1;
  return `${start}-${String((start + 1) % 100).padStart(2, '0')}`;
}

const r2 = (n: number) => Math.round(n * 100) / 100;
/**
 * Split a GST-inclusive total. Same state as the seller (or state unknown → supplier's location is the place of
 * supply) → CGST 9% + SGST 9%; another state → IGST 18%.
 */
export function splitTax(total: number, sellerState: string, placeOfSupply: string) {
  const taxable = r2(total / (1 + GST_RATE / 100)), tax = r2(total - taxable);
  if (placeOfSupply === sellerState) { const half = r2(tax / 2); return { taxable, cgst: half, sgst: r2(tax - half), igst: 0, intra: true }; }
  return { taxable, cgst: 0, sgst: 0, igst: tax, intra: false };
}

/** "Rupees Two Hundred Ninety Nine Only" (Indian numbering: thousand, lakh, crore). */
export function rupeesInWords(n: number) {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const two = (x: number) => (x < 20 ? ones[x] : `${tens[Math.floor(x / 10)]}${x % 10 ? ' ' + ones[x % 10] : ''}`);
  const three = (x: number) => [x >= 100 ? `${ones[Math.floor(x / 100)]} Hundred` : '', two(x % 100)].filter(Boolean).join(' ');
  const words = (x: number): string => {
    if (x === 0) return 'Zero';
    const parts: string[] = [];
    const crore = Math.floor(x / 1e7); x %= 1e7;
    const lakh = Math.floor(x / 1e5); x %= 1e5;
    const thousand = Math.floor(x / 1e3); x %= 1e3;
    if (crore) parts.push(`${words(crore)} Crore`);
    if (lakh) parts.push(`${two(lakh)} Lakh`);
    if (thousand) parts.push(`${two(thousand)} Thousand`);
    if (x) parts.push(three(x));
    return parts.join(' ');
  };
  const rupees = Math.floor(n), paise = Math.round((n - rupees) * 100);
  return `Rupees ${words(rupees)}${paise ? ` and ${two(paise)} Paise` : ''} Only`;
}
