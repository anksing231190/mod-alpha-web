/* Mod Alpha — "Sand" light theme palette (beige + cream).
   One colour-mapping function shared by:
     • scripts/build-light-theme.mjs  → generates theme-light.css from styles.css + v22.css
     • js/theme.js                    → re-colours charts drawn at runtime (SVG attributes)
   It translates each dark-theme colour into its light-theme counterpart, based on what
   the colour is used for (surface, text, border, shadow, chart). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.MA_PALETTE = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  // Design tokens (documented in docs/25_light_theme.md)
  const TOKENS = {
    page: '#f4ecdd',      // beige page background
    page2: '#efe4cf',     // deeper beige band
    card: '#fffaf1',      // cream card
    card2: '#fbf4e7',     // cream inner / input
    line: '#e4d6bf',      // hairline
    line2: '#d6c3a3',     // stronger line
    text: '#2b2118',      // espresso
    sub: '#5c4b3b',       // secondary text
    muted: '#8a7560',     // muted text
    caramel: '#a8692f',   // primary accent
    caramelDeep: '#7f4b22',
    plum: '#8e4a6c',      // secondary accent
    sage: '#5a7d43',      // positive
    terracotta: '#b4472f',// negative
    ochre: '#b98019',     // warning
    teal: '#3f7c79',      // info / third series
  };

  // Accent families: source hue range → target hue / saturation
  const FAMILIES = [
    [15, 35, 22, 0.62],    // orange → burnt orange
    [35, 64, 38, 0.72],    // amber/yellow → ochre
    [64, 166, 96, 0.33],   // green → sage / olive
    [166, 196, 178, 0.34], // cyan → teal-sage
    [196, 241, 29, 0.55],  // blue → caramel (primary)
    [241, 292, 326, 0.33], // indigo / violet → plum
    [292, 332, 345, 0.45], // magenta / pink → rose
  ];
  const RED = [8, 0.56];   // 332..15 → terracotta

  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const NAMED = { white: [255, 255, 255, 1], black: [0, 0, 0, 1] };

  function parse(str) {
    const s = str.trim().toLowerCase();
    if (NAMED[s]) return NAMED[s].slice();
    let m = s.match(/^#([0-9a-f]{3,8})$/);
    if (m) {
      let h = m[1];
      if (h.length === 3 || h.length === 4) h = h.split('').map((c) => c + c).join('');
      if (h.length !== 6 && h.length !== 8) return null;
      const n = (i) => parseInt(h.slice(i, i + 2), 16);
      return [n(0), n(2), n(4), h.length === 8 ? n(6) / 255 : 1];
    }
    m = s.match(/^rgba?\(([^)]+)\)$/);
    if (m) {
      const p = m[1].split(/[\s,\/]+/).filter(Boolean);
      if (p.length < 3) return null;
      const ch = (v) => (v.endsWith('%') ? parseFloat(v) * 2.55 : parseFloat(v));
      const a = p[3] === undefined ? 1 : p[3].endsWith('%') ? parseFloat(p[3]) / 100 : parseFloat(p[3]);
      return [ch(p[0]), ch(p[1]), ch(p[2]), a];
    }
    return null;
  }
  function toHsl([r, g, b]) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
    if (max === min) return [0, 0, l];
    const d = max - min, s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    let h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return [h * 60, s, l];
  }
  function fromHsl(h, s, l) {
    h = ((h % 360) + 360) % 360 / 360;
    if (s === 0) { const v = Math.round(l * 255); return [v, v, v]; }
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
    const f = (t) => { t = (t + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < 0.5 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; };
    return [f(h + 1 / 3), f(h), f(h - 1 / 3)].map((v) => Math.round(v * 255));
  }
  function out(rgb, a) {
    a = Math.round(clamp(a, 0, 1) * 1000) / 1000;
    if (a >= 1) return '#' + rgb.map((v) => v.toString(16).padStart(2, '0')).join('');
    return `rgba(${rgb.join(',')},${a})`;
  }
  function family(h) {
    for (const [a, b, th, ts] of FAMILIES) if (h >= a && h < b) return [th, ts];
    return RED;
  }
  const isNeutral = (s, l) => s < 0.42 || l < 0.28 || (l < 0.36 && s < 0.5) || l > 0.86 || (l > 0.8 && s < 0.8);

  /** Map one colour. cat: bg | text | border | shadow | chart | accent ; opts.keepWhite */
  function mapColor(str, cat, opts = {}) {
    const c = parse(str);
    if (!c) return str;
    const [r, g, b, a] = c;
    if (a === 0) return str;
    const [h, s, l] = toHsl([r, g, b]);
    // low-alpha, muted blues are the dark theme's hairlines and glazes, not accents
    const neutral = isNeutral(s, l) || (a < 0.4 && s < 0.75 && cat !== 'text') || (a < 0.25 && l > 0.6 && cat !== 'text');

    if (neutral) {
      switch (cat) {
        case 'bg': {
          if (l < 0.08 && s < 0.15 && a < 0.95) return out([52, 36, 20], a * 0.55);   // black scrim → warm scrim
          if (l < 0.36) {                                                         // dark surface → beige / cream
            const t = Math.min(1, l / 0.3);
            const L = l < 0.075 ? 0.915 : 0.985 - t * 0.05;
            return out(fromHsl(40, l < 0.075 ? 0.48 : 0.72, L), a < 0.3 ? a * 0.9 : Math.max(a, 0.9));
          }
          if (l > 0.8) {
            if (a < 0.45) return out([120, 86, 46], a * 1.15);                       // white glaze → brown glaze
            return out(fromHsl(40, 0.8, Math.max(l, 0.975)), a);                     // white fill → cream
          }
          return out(fromHsl(35, 0.26, 0.5 + (l - 0.24) * 0.45), a);                // mid grey → sand
        }
        case 'text': case 'chart': case 'gradtext': {
          if (opts.keepWhite && l > 0.85) return str;
          if (l >= 0.5) {
            const L = clamp(0.13 + (1 - l) * 0.62, 0.13, 0.38);
            return out(fromHsl(28, 0.24, L), a < 1 ? Math.max(a, 0.55) : 1);
          }
          return out(fromHsl(28, 0.26, 0.12 + l * 0.45), a);
        }
        case 'border': {
          if (a < 0.7) return out([126, 92, 52], clamp(a * 0.85 + 0.06, 0.08, 0.42));
          if (l < 0.3) return out(fromHsl(38, 0.38, 0.86 - (l / 0.3) * 0.05), 1);
          return out(fromHsl(36, 0.3, clamp(0.62 + (l - 0.3) * 0.25, 0.62, 0.8)), 1);
        }
        case 'shadow': {
          if (l > 0.7) return out([255, 255, 255], Math.min(0.7, a));             // inset highlight stays light
          return out([94, 64, 32], clamp(a * 0.42, 0.04, 0.2));
        }
        default: return str;
      }
    }

    // accent colour
    const [th, ts] = family(h);
    const sat = clamp(ts + (s - 0.8) * 0.15, 0.2, 0.8);
    switch (cat) {
      case 'text': return out(fromHsl(th, sat, clamp(0.26 + (l - 0.3) * 0.2, 0.26, 0.35)), a < 1 ? Math.max(a, 0.8) : 1);
      case 'gradtext': return out(fromHsl(th, Math.min(0.7, sat + 0.05), clamp(0.3 + (l - 0.4) * 0.2, 0.3, 0.4)), 1);
      case 'chart': return out(fromHsl(th, sat, clamp(0.36 + (l - 0.4) * 0.3, 0.36, 0.52)), a);
      case 'border': return out(fromHsl(th, sat, clamp(l, 0.45, 0.62)), a);
      case 'shadow': return out(fromHsl(th, sat, 0.45), clamp(a * 0.45, 0.04, 0.25));
      case 'bg': default: {
        if (a < 0.6) return out(fromHsl(th, sat, clamp(l, 0.45, 0.62)), Math.min(0.6, a * 1.2));
        if (l > 0.8) return out(fromHsl(th, sat * 0.9, clamp(l, 0.86, 0.95)), a);   // pastel stays pastel
        return out(fromHsl(th, sat, clamp(l * 0.75, 0.28, 0.38)), a);               // solid fill: white text ≥ 4.5:1
      }
    }
  }

  const COLOR_RE = /#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)|\b(?:white|black)\b/g;
  function mapValue(value, cat, opts) {
    return value.replace(COLOR_RE, (m) => mapColor(m, cat, opts));
  }
  function isAccent(str) {
    const c = parse(str); if (!c || c[3] < 0.3) return false;
    const [, s, l] = toHsl(c); return !isNeutral(s, l);
  }
  return { TOKENS, mapColor, mapValue, isAccent, parse, COLOR_RE };
});
