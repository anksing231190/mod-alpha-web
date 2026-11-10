/**
 * Tiny PDF writer for documents made of text, lines and filled boxes (used for GST invoices).
 * No dependency: standard Helvetica / Helvetica-Bold with WinAnsi encoding, A4 pages, coordinates in points
 * from the TOP-left corner (converted to PDF's bottom-left internally).
 * The standard fonts have no ₹ glyph, so amounts are written as "Rs." / "INR".
 */

// Advance widths (per 1000 units) of characters 32–255 in WinAnsi, from the standard Adobe font metrics.
const [HELV, HELV_B]: number[][] = [[278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556, 1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556, 333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584, 761, 556, 0, 222, 556, 333, 1000, 556, 556, 333, 1000, 667, 333, 1000, 0, 611, 0, 0, 222, 222, 333, 333, 350, 556, 1000, 333, 1000, 500, 333, 944, 0, 500, 667, 278, 333, 556, 556, 556, 556, 260, 556, 333, 737, 370, 556, 584, 333, 737, 333, 400, 584, 333, 333, 333, 556, 537, 278, 333, 333, 365, 556, 834, 834, 834, 611, 667, 667, 667, 667, 667, 667, 1000, 722, 667, 667, 667, 667, 278, 278, 278, 278, 722, 722, 778, 778, 778, 778, 778, 584, 778, 722, 722, 722, 722, 667, 667, 611, 556, 556, 556, 556, 556, 556, 889, 500, 556, 556, 556, 556, 278, 278, 278, 278, 556, 556, 556, 556, 556, 556, 556, 584, 611, 556, 556, 556, 556, 500, 556, 500], [278, 333, 474, 556, 556, 889, 722, 238, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 333, 333, 584, 584, 584, 611, 975, 722, 722, 722, 722, 667, 611, 778, 722, 278, 556, 722, 611, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 333, 278, 333, 584, 556, 333, 556, 611, 556, 611, 556, 333, 611, 611, 278, 278, 556, 278, 889, 611, 611, 611, 611, 389, 556, 333, 611, 556, 778, 556, 556, 500, 389, 280, 389, 584, 761, 556, 0, 278, 556, 500, 1000, 556, 556, 333, 1000, 667, 333, 1000, 0, 611, 0, 0, 278, 278, 500, 500, 350, 556, 1000, 333, 1000, 556, 333, 944, 0, 500, 667, 278, 333, 556, 556, 556, 556, 280, 556, 333, 737, 370, 556, 584, 333, 737, 333, 400, 584, 333, 333, 333, 611, 556, 278, 333, 333, 365, 556, 834, 834, 834, 611, 722, 722, 722, 722, 722, 722, 1000, 722, 667, 667, 667, 667, 278, 278, 278, 278, 722, 722, 778, 778, 778, 778, 778, 584, 778, 722, 722, 722, 722, 667, 667, 611, 556, 556, 556, 556, 556, 556, 889, 556, 556, 556, 556, 556, 278, 278, 278, 278, 611, 611, 611, 611, 611, 611, 611, 584, 611, 611, 611, 611, 611, 556, 611, 556]];

export type Rgb = [number, number, number];
type Op = string;

export class Pdf {
  readonly width = 595.28;
  readonly height = 841.89;
  private pages: Op[][] = [];
  private cur: Op[] = [];
  constructor() { this.addPage(); }

  /** Start a new page. */
  addPage() { this.cur = []; this.pages.push(this.cur); }

  /** Width of a string in points. */
  textWidth(s: string, size: number, bold = false) {
    const t = bold ? HELV_B : HELV;
    let w = 0;
    for (const ch of toWinAnsi(s)) w += t[ch - 32] ?? 556;
    return (w * size) / 1000;
  }

  /** Write text. align: left (x is the start), right (x is the end) or center. */
  text(x: number, y: number, s: string, o: { size?: number; bold?: boolean; color?: Rgb; align?: 'left' | 'right' | 'center' } = {}) {
    const size = o.size ?? 10, w = this.textWidth(s, size, o.bold);
    const px = o.align === 'right' ? x - w : o.align === 'center' ? x - w / 2 : x;
    const [r, g, b] = o.color ?? [0.1, 0.1, 0.12];
    this.cur.push(`BT ${r} ${g} ${b} rg /${o.bold ? 'F2' : 'F1'} ${size} Tf ${px.toFixed(2)} ${(this.height - y).toFixed(2)} Td (${escape(s)}) Tj ET`);
    return w;
  }

  /** Text wrapped to a width; returns the y below the last line. */
  wrap(x: number, y: number, s: string, maxW: number, o: { size?: number; bold?: boolean; color?: Rgb; lineGap?: number } = {}) {
    const size = o.size ?? 10, lh = size + (o.lineGap ?? 3);
    for (const para of s.split('\n')) {
      let line = '';
      for (const word of para.split(' ')) {
        const tryLine = line ? line + ' ' + word : word;
        if (line && this.textWidth(tryLine, size, o.bold) > maxW) { this.text(x, y, line, o); y += lh; line = word; } else line = tryLine;
      }
      if (line) { this.text(x, y, line, o); y += lh; }
    }
    return y;
  }

  /** Straight line. */
  line(x1: number, y1: number, x2: number, y2: number, o: { width?: number; color?: Rgb } = {}) {
    const [r, g, b] = o.color ?? [0.82, 0.8, 0.76];
    this.cur.push(`${r} ${g} ${b} RG ${o.width ?? 0.6} w ${x1.toFixed(2)} ${(this.height - y1).toFixed(2)} m ${x2.toFixed(2)} ${(this.height - y2).toFixed(2)} l S`);
  }

  /** Filled (and optionally stroked) rectangle; y is the top edge. */
  rect(x: number, y: number, w: number, h: number, o: { fill?: Rgb; stroke?: Rgb } = {}) {
    const ops = [];
    if (o.fill) ops.push(`${o.fill.join(' ')} rg`);
    if (o.stroke) ops.push(`${o.stroke.join(' ')} RG 0.6 w`);
    ops.push(`${x.toFixed(2)} ${(this.height - y - h).toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re ${o.fill && o.stroke ? 'B' : o.fill ? 'f' : 'S'}`);
    this.cur.push(ops.join(' '));
  }

  /** The finished PDF file. */
  toBuffer(meta: { title?: string; author?: string } = {}): Buffer {
    const objs: (string | Buffer)[] = [];
    const add = (o: string | Buffer) => { objs.push(o); return objs.length; };
    const catalog = add(''), pagesId = add('');
    const f1 = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
    const f2 = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
    const kids: number[] = [];
    for (const ops of this.pages) {
      const body = Buffer.from(ops.join('\n'), 'latin1');
      const content = add(Buffer.concat([Buffer.from(`<< /Length ${body.length} >>\nstream\n`), body, Buffer.from('\nendstream')]));
      kids.push(add(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${this.width} ${this.height}] /Resources << /Font << /F1 ${f1} 0 R /F2 ${f2} 0 R >> >> /Contents ${content} 0 R >>`));
    }
    objs[catalog - 1] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
    objs[pagesId - 1] = `<< /Type /Pages /Kids [${kids.map((k) => `${k} 0 R`).join(' ')}] /Count ${kids.length} >>`;
    const info = add(`<< /Title (${escape(meta.title ?? '')}) /Author (${escape(meta.author ?? '')}) /Producer (Mod Alpha) >>`);
    const parts: Buffer[] = [Buffer.from('%PDF-1.4\n%\xe2\xe3\xcf\xd3\n', 'latin1')];
    let off = parts[0].length; const xref: number[] = [];
    objs.forEach((o, i) => {
      const b = Buffer.concat([Buffer.from(`${i + 1} 0 obj\n`), typeof o === 'string' ? Buffer.from(o, 'latin1') : o, Buffer.from('\nendobj\n')]);
      xref.push(off); off += b.length; parts.push(b);
    });
    const x = [`xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`, ...xref.map((n) => `${String(n).padStart(10, '0')} 00000 n \n`)].join('');
    parts.push(Buffer.from(x + `trailer\n<< /Size ${objs.length + 1} /Root ${catalog} 0 R /Info ${info} 0 R >>\nstartxref\n${off}\n%%EOF\n`, 'latin1'));
    return Buffer.concat(parts);
  }
}

// Map a JS string to WinAnsi byte values (unknown characters become "?"). ₹ becomes "Rs.".
const SPECIAL: Record<string, number> = { '€': 128, '‚': 130, '„': 132, '…': 133, '‘': 145, '’': 146, '“': 147, '”': 148, '•': 149, '–': 150, '—': 151, '™': 153 };
function toWinAnsi(s: string): number[] {
  const out: number[] = [];
  for (const ch of s.replace(/₹\s?/g, 'Rs. ')) {
    const c = ch.codePointAt(0)!;
    out.push(SPECIAL[ch] ?? (c >= 32 && c <= 126 ? c : c >= 160 && c <= 255 ? c : 63));
  }
  return out;
}
// PDF string literal: WinAnsi bytes with ( ) \ escaped.
function escape(s: string) {
  return toWinAnsi(s).map((c) => (c === 40 || c === 41 || c === 92 ? '\\' + String.fromCharCode(c) : String.fromCharCode(c))).join('');
}
