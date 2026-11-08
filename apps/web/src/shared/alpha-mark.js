/* ==========================================================================
   Shared: the animated α mark — Mod Alpha's AI "character" (replaces the robot)
   maAlphaMark({ tile, cls }) → inline SVG: the α draws itself in gold → violet → cyan, a spark of light runs
   along the stroke, and it glows when an answer is ready.
   States come from a class on the mark or any parent (styles in src/styles/ux.css):
     .ma-thinking / .think → draws faster   .hit → bright glow   .dim → quiet (empty states)
   The stroke path is MA_ALPHA_PATH (viewBox 0 0 100 100).
   ========================================================================== */
const MA_ALPHA_PATH = 'M80 30 C 70 30 64 44 58 56 C 50 72 40 78 30 78 C 18 78 14 66 14 56 C 14 42 24 30 36 30 C 52 30 58 52 64 66 C 68 74 74 80 86 78';
let maAlphaN = 0;
/** The α mark as an SVG string. tile: false draws the stroke only (no dark rounded square behind it). */
function maAlphaMark(o = {}) {
  const k = 'mam' + (++maAlphaN), P = MA_ALPHA_PATH, tile = o.tile !== false;
  return `<svg class="ma-am${tile ? ' tiled' : ''}${o.cls ? ' ' + o.cls : ''}" viewBox="0 0 100 100" aria-hidden="true" focusable="false"><defs>
<linearGradient id="${k}i" x1="0" x2="1"><stop offset="0" stop-color="#e8c58f"/><stop offset=".5" stop-color="#c4b5fd"/><stop offset="1" stop-color="#22d3ee"/></linearGradient>
<linearGradient id="${k}t" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1d2152"/><stop offset="1" stop-color="#0a0e2a"/></linearGradient></defs>
${tile ? `<rect class="ma-am-tile" x="2" y="2" width="96" height="96" rx="28" fill="url(#${k}t)"/>` : ''}
<path class="ma-am-base" d="${P}"/><path class="ma-am-ink" d="${P}" stroke="url(#${k}i)"/>
<circle class="ma-am-spark" r="3.2"><animateMotion dur="3.2s" repeatCount="indefinite" path="${P}"/></circle></svg>`;
}
window.maAlphaMark = maAlphaMark;
