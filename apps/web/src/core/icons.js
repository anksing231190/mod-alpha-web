/* ==========================================================================
   Mod Alpha — core: icons and brand mark
   Inline SVG icons: ic() = outline icons (V22_ICONS), cic() = coloured tile icons,
   v22Mark() / v22BrandMark() = the Mod Alpha α logo.
   ========================================================================== */

/** Outline icon paths by name (search, bell, calendar, …). */
const V22_ICONS={
 search:'<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
 x:'<path d="M18 6 6 18M6 6l12 12"/>',
 chevDown:'<path d="m6 9 6 6 6-6"/>',chevUp:'<path d="m18 15-6-6-6 6"/>',
 chevL:'<path d="m15 18-6-6 6-6"/>',chevR:'<path d="m9 18 6-6-6-6"/>',
 arrowR:'<path d="M5 12h14M13 6l6 6-6 6"/>',
 calendar:'<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M8 3v4M16 3v4M3.5 10h17"/><path d="M8 14h2M12 14h2M16 14h0M8 17h2M12 17h2"/>',
 calCheck:'<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M8 3v4M16 3v4M3.5 10h17"/><path d="m9 15 2 2 4-4"/>',
 clock:'<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
 star:'<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" fill="currentColor"/>',
 user:'<circle cx="12" cy="8" r="4"/><path d="M4.5 20.5c1.2-4 4.1-6 7.5-6s6.3 2 7.5 6"/>',
 users:'<circle cx="9" cy="8" r="3.5"/><path d="M2.5 19.5c.9-3.4 3.4-5.2 6.5-5.2s5.6 1.8 6.5 5.2"/><circle cx="17" cy="9" r="2.8"/><path d="M16.5 14.4c2.6.1 4.3 1.7 5 4.6"/>',
 lock:'<rect x="4.5" y="10.5" width="15" height="10" rx="2.5"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/>',
 eye:'<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
 info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.6v.1"/>',
 target:'<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.8"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/>',
 bell:'<path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.6 2H4.4z"/><path d="M10 20.5a2.2 2.2 0 0 0 4 0"/>',
 trend:'<path d="m3 17 5.5-5.5 4 4L21 7"/><path d="M15 7h6v6"/>',
 bars:'<path d="M5 20v-6M10 20V9M15 20v-8M20 20V5"/>',
 bulb:'<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.6 10.8c.7.6 1.1 1.4 1.1 2.2h5c0-.8.4-1.6 1.1-2.2A6 6 0 0 0 12 3z"/>',
 crown:'<path d="M3.5 8.5 8 12l4-6.5 4 6.5 4.5-3.5-1.8 10H5.3z" fill="currentColor" fill-opacity=".9"/>',
 percent:'<path d="M19 5 5 19"/><circle cx="7" cy="7" r="2.5"/><circle cx="17" cy="17" r="2.5"/>',
 rupee:'<path d="M6.5 4.5h11M6.5 9h11M9 4.5c5.5 0 5.5 9 0 9H6.5l8.5 7"/>',
 db:'<ellipse cx="12" cy="5.5" rx="7.5" ry="3"/><path d="M4.5 5.5v13c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3v-13"/><path d="M4.5 12c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3"/>',
 cloudUp:'<path d="M7 18.5a4.5 4.5 0 0 1-.6-9 6 6 0 0 1 11.6 1.5 3.8 3.8 0 0 1-.5 7.5"/><path d="M12 12.5v8M9 15.5l3-3 3 3"/>',
 check:'<path d="m5 12.5 4.5 4.5L19 7.5"/>',
 checkCircle:'<circle cx="12" cy="12" r="9" fill="currentColor"/><path d="m7.8 12.3 2.8 2.8 5.6-5.6" stroke="#06261c" stroke-width="2.4"/>',
 refresh:'<path d="M20 11a8 8 0 0 0-14.3-4.6L4 8.5"/><path d="M4 4v4.5h4.5"/><path d="M4 13a8 8 0 0 0 14.3 4.6L20 15.5"/><path d="M20 20v-4.5h-4.5"/>',
 grid:'<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>',
 dash:'<path d="M3.5 11.5 12 4.5l8.5 7"/><path d="M6 10v9.5h12V10"/><path d="M10 19.5v-5h4v5"/>',
 card:'<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M3 10h18M7 15h4"/>',
 gear:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-2.7-1.1l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0-1.1-2.7H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.1-2.7l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 2.7-1.1V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 2.7 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0 1.1 2.7H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z"/>',
 file:'<path d="M14 3.5H7a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8.5z"/><path d="M14 3.5v5h5M9 13h6M9 16.5h4"/>',
 brain:'<path d="M9.5 4.5a3 3 0 0 0-3 3 3 3 0 0 0-2 5.2 3 3 0 0 0 2 5.3 3 3 0 0 0 5.5 1.5V5.8a2.5 2.5 0 0 0-2.5-1.3z"/><path d="M14.5 4.5a3 3 0 0 1 3 3 3 3 0 0 1 2 5.2 3 3 0 0 1-2 5.3 3 3 0 0 1-5.5 1.5"/><path d="M12 9h-2M12 14h-2.5M12 9h2M12 14h2.5"/>',
 network:'<circle cx="6" cy="6" r="2.2"/><circle cx="18" cy="6" r="2.2"/><circle cx="12" cy="18" r="2.2"/><circle cx="12" cy="11" r="1.6"/><path d="m7.7 7.3 3 2.5M16.3 7.3l-3 2.5M12 12.6v3.2"/>',
 shield:'<path d="M12 3 4.5 6v5.5c0 4.6 3.2 8.2 7.5 9.5 4.3-1.3 7.5-4.9 7.5-9.5V6z"/><path d="m8.8 12.2 2.3 2.3 4.3-4.6"/>',
 mail:'<rect x="3" y="5.5" width="18" height="13" rx="2.5"/><path d="m3.5 7 8.5 6 8.5-6"/>',
 msg:'<path d="M4 5.5h16a1.5 1.5 0 0 1 1.5 1.5v9a1.5 1.5 0 0 1-1.5 1.5H10l-4.5 3.5V17.5H4A1.5 1.5 0 0 1 2.5 16V7A1.5 1.5 0 0 1 4 5.5z"/><path d="M8 11.5h.1M12 11.5h.1M16 11.5h.1" stroke-width="2.6"/>',
 bolt:'<path d="M13 2.5 5 13.5h6l-1 8 8-11h-6z" fill="currentColor"/>',
 layers:'<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/>',
 play:'<circle cx="12" cy="12" r="9.5" fill="currentColor"/><path d="m10 8.3 5.5 3.7-5.5 3.7z" fill="#060a18" stroke="none"/>',
 spark:'<path d="M12 2.5c.6 4.6 2.9 6.9 7.5 7.5-4.6.6-6.9 2.9-7.5 7.5-.6-4.6-2.9-6.9-7.5-7.5 4.6-.6 6.9-2.9 7.5-7.5z" fill="currentColor"/>',
 robot:'<rect x="5" y="8" width="14" height="11" rx="3"/><path d="M12 4.5V8M9.5 13h.1M14.5 13h.1" stroke-width="2.4"/><circle cx="12" cy="4" r="1"/>',
 logout:'<path d="M15 4.5h3a1.5 1.5 0 0 1 1.5 1.5v12a1.5 1.5 0 0 1-1.5 1.5h-3"/><path d="M10 16.5 5.5 12 10 7.5M5.5 12H15"/>',
 back:'<path d="M9 14 4.5 9.5 9 5"/><path d="M4.5 9.5H15a5 5 0 0 1 0 10h-3"/>',
 sort:'<path d="M4 6h16M7 12h10M10 18h4"/>',
 trophy:'<path d="M8 4h8v5a4 4 0 0 1-8 0z" fill="currentColor"/><path d="M8 6H5.5a2.5 2.5 0 0 0 2.5 4M16 6h2.5a2.5 2.5 0 0 1-2.5 4M12 13v4M8.5 20h7M9.5 17h5"/>',
 sliders:'<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>',
 mic:'<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/>',
 wallet:'<path d="M4 7.5h14.5A1.5 1.5 0 0 1 20 9v9.5a1.5 1.5 0 0 1-1.5 1.5H5.5A1.5 1.5 0 0 1 4 18.5z"/><path d="M4 7.5 15.5 4v3.5"/><circle cx="16" cy="14" r="1.2" fill="currentColor"/>',
 help:'<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.6 2.6 0 0 1 5 .9c0 1.7-2.5 2.3-2.5 3.8M12 17.2v.1"/>',
 swap:'<path d="M4 8h13l-3-3M20 16H7l3 3"/>',
 download:'<path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M5 19.5h14"/>'
};

/** Outline SVG icon by name. */
function ic(name,cls='',size){return `<svg class="v22-ic ${cls}" viewBox="0 0 24 24" ${size?`width="${size}" height="${size}"`:''} fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${V22_ICONS[name]||''}</svg>`}

/** The Mod Alpha α mark as inline SVG. */
/* Brand "M" glyph used in the reference login card, engine chip and phone notification */
function v22Mark(size=34,id='mk'+Math.random().toString(36).slice(2,7)){return `<svg class="v22-mark" width="${size}" height="${size}" viewBox="0 0 48 48" aria-hidden="true"><defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#38c7ff"/><stop offset=".55" stop-color="#5b7bff"/><stop offset="1" stop-color="#b350f5"/></linearGradient></defs><path d="M6 40V12.5c0-3.6 4.4-5.3 6.8-2.6L24 22.6 35.2 9.9c2.4-2.7 6.8-1 6.8 2.6V40h-8.5V24.5l-7.2 8.1a3 3 0 0 1-4.6 0l-7.2-8.1V40z" fill="url(#${id})"/></svg>`}

/** Unique id for SVG gradients. */
let v22Cid=0;

/** Coloured tile icon (gradient background) by name and size. */
/* Colourful (multi-colour) icons */
function cic(name,size=28){
 const id='ci'+(++v22Cid),g=(a,b,x2=1,y2=1)=>`<linearGradient id="${id}${a}${b}" x1="0" y1="0" x2="${x2}" y2="${y2}"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`,u=(a,b)=>`url(#${id}${a}${b})`;
 const I={
  search:`<defs>${g('#7dd3fc','#6366f1')}${g('#fbbf24','#f97316')}</defs><circle cx="13" cy="13" r="8.5" fill="${u('#7dd3fc','#6366f1')}"/><circle cx="13" cy="13" r="5.6" fill="#dbeafe" fill-opacity=".55"/><path d="M9.8 11.2a3.6 3.6 0 0 1 3.4-2.4" stroke="#fff" stroke-width="1.8" stroke-linecap="round" fill="none"/><rect x="19.2" y="18.2" width="4.4" height="10" rx="2.2" transform="rotate(-45 21.4 23.2)" fill="${u('#fbbf24','#f97316')}"/>`,
  alarm:`<defs>${g('#fb7185','#ef4444')}${g('#fde68a','#f59e0b')}</defs><path d="M4 9.5 9 4.5M28 9.5l-5-5" stroke="${u('#fde68a','#f59e0b')}" stroke-width="3.2" stroke-linecap="round"/><circle cx="16" cy="17.5" r="11" fill="${u('#fb7185','#ef4444')}"/><circle cx="16" cy="17.5" r="8" fill="#fff7ed"/><path d="M16 12.5v5.3l3.4 2.2" stroke="#1f2937" stroke-width="2" stroke-linecap="round" fill="none"/><path d="M9 28l2-2.4M23 28l-2-2.4" stroke="#ef4444" stroke-width="2.4" stroke-linecap="round"/>`,
  chat:`<defs>${g('#38bdf8','#6366f1')}${g('#c084fc','#ec4899')}</defs><path d="M5 6.5h17a3 3 0 0 1 3 3V19a3 3 0 0 1-3 3h-9l-6 5v-5H5a3 3 0 0 1-3-3V9.5a3 3 0 0 1 3-3z" fill="${u('#38bdf8','#6366f1')}"/><circle cx="8.6" cy="14.3" r="1.7" fill="#fff"/><circle cx="13.5" cy="14.3" r="1.7" fill="#fff"/><circle cx="18.4" cy="14.3" r="1.7" fill="#fff"/><circle cx="26" cy="7" r="4.2" fill="${u('#c084fc','#ec4899')}"/><path d="M26 4.8v4.4M23.8 7h4.4" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/>`,
  sprout:`<defs>${g('#6ee7b7','#10b981')}${g('#a7f3d0','#34d399')}</defs><circle cx="16" cy="16" r="14" fill="#064e3b" fill-opacity=".55"/><path d="M16 26V15" stroke="#34d399" stroke-width="2.4" stroke-linecap="round"/><path d="M16 16c0-5 -3.5-8.5-9-8.5 0 5.4 3.6 8.5 9 8.5z" fill="${u('#6ee7b7','#10b981')}"/><path d="M16 14c0-4.4 3-7.5 8-7.5 0 4.8-3.2 7.5-8 7.5z" fill="${u('#a7f3d0','#34d399')}"/>`,
  rocket:`<defs>${g('#93c5fd','#7c3aed')}${g('#fde047','#f97316',0,1)}</defs><path d="M12 22.5c-1.8 1.4-2.6 3.8-2.6 6.3 2.4 0 4.8-.8 6.3-2.6z" fill="${u('#fde047','#f97316')}"/><path d="M27.5 4.5c-7.5-.5-13.6 4-16.8 11.2l5.6 5.6c7.2-3.2 11.7-9.3 11.2-16.8z" fill="${u('#93c5fd','#7c3aed')}"/><circle cx="20.3" cy="11.7" r="2.7" fill="#e0f2fe" stroke="#1e1b4b" stroke-width="1.2"/><path d="M10.7 15.7 5.5 14.6l4-4.6 5.4.3zM16.3 21.3l1.1 5.2 4.6-4-.3-5.4z" fill="#f472b6"/>`,
  crown:`<defs>${g('#fde68a','#f59e0b',0,1)}</defs><path d="M4 11.5 10 16l6-9 6 9 6-4.5-2.4 13H6.4z" fill="${u('#fde68a','#f59e0b')}" stroke="#b45309" stroke-width=".8"/><rect x="6.4" y="24.5" width="19.2" height="3.4" rx="1.2" fill="#d97706"/><circle cx="16" cy="6.5" r="2" fill="#f472b6"/><circle cx="4" cy="11" r="1.8" fill="#38bdf8"/><circle cx="28" cy="11" r="1.8" fill="#38bdf8"/><circle cx="16" cy="19.5" r="2.1" fill="#ef4444"/>`,
  check:`<defs>${g('#4ade80','#059669')}</defs><circle cx="16" cy="16" r="13" fill="${u('#4ade80','#059669')}"/><path d="m10 16.5 4 4 8-8.5" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`,
  cross:`<circle cx="16" cy="16" r="13" fill="#334155"/><path d="m11.5 11.5 9 9M20.5 11.5l-9 9" stroke="#94a3b8" stroke-width="2.6" stroke-linecap="round"/>`,
  shield:`<defs>${g('#5eead4','#0d9488')}</defs><path d="M16 3 5 7.5v7.6c0 6.6 4.6 11.4 11 13.9 6.4-2.5 11-7.3 11-13.9V7.5z" fill="${u('#5eead4','#0d9488')}"/><path d="m11 16 3.6 3.6 6.8-7" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`,
  calendar:`<defs>${g('#c4b5fd','#7c3aed',0,1)}</defs><rect x="4" y="6" width="24" height="22" rx="4" fill="#f5f3ff"/><path d="M4 10a4 4 0 0 1 4-4h16a4 4 0 0 1 4 4v3H4z" fill="#ef4444"/><path d="M10 3.5v5M22 3.5v5" stroke="#475569" stroke-width="2.4" stroke-linecap="round"/><rect x="12.5" y="16" width="7" height="7" rx="1.6" fill="${u('#c4b5fd','#7c3aed')}"/>`,
  bank:`<defs>${g('#93c5fd','#2563eb',0,1)}</defs><path d="M16 3 3.5 9.5h25z" fill="${u('#93c5fd','#2563eb')}"/><rect x="6" y="11.5" width="3.4" height="11" rx="1" fill="#60a5fa"/><rect x="11.6" y="11.5" width="3.4" height="11" rx="1" fill="#60a5fa"/><rect x="17.2" y="11.5" width="3.4" height="11" rx="1" fill="#60a5fa"/><rect x="22.8" y="11.5" width="3.4" height="11" rx="1" fill="#60a5fa"/><rect x="3.5" y="24" width="25" height="4" rx="1.4" fill="${u('#93c5fd','#2563eb')}"/><circle cx="24" cy="24" r="6" fill="#ef4444"/><path d="m21.7 21.7 4.6 4.6M26.3 21.7l-4.6 4.6" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/>`,
  idcard:`<defs>${g('#fdba74','#ea580c')}</defs><rect x="3" y="6.5" width="26" height="19" rx="3.5" fill="${u('#fdba74','#ea580c')}"/><circle cx="11" cy="14.5" r="3.2" fill="#fff7ed"/><path d="M6.5 22c.8-2.6 2.4-3.8 4.5-3.8s3.7 1.2 4.5 3.8" fill="#fff7ed"/><path d="M18.5 13h7M18.5 17h5M18.5 21h6" stroke="#fff7ed" stroke-width="1.8" stroke-linecap="round"/>`,
  db:`<defs>${g('#a5b4fc','#4f46e5',0,1)}</defs><ellipse cx="16" cy="7.5" rx="10" ry="4" fill="#c7d2fe"/><path d="M6 7.5v17c0 2.2 4.5 4 10 4s10-1.8 10-4v-17c0 2.2-4.5 4-10 4S6 9.7 6 7.5z" fill="${u('#a5b4fc','#4f46e5')}"/><path d="M6 13.5c0 2.2 4.5 4 10 4s10-1.8 10-4M6 19.5c0 2.2 4.5 4 10 4s10-1.8 10-4" stroke="#e0e7ff" stroke-width="1.2" fill="none" stroke-opacity=".7"/>`,
  brain:`<defs>${g('#f9a8d4','#db2777')}</defs><path d="M13 5a4.5 4.5 0 0 0-4.4 3.6A4.6 4.6 0 0 0 5 13a4.6 4.6 0 0 0 1.4 3.3A4.6 4.6 0 0 0 9 23.6 4.5 4.5 0 0 0 16 26V7.3A4.4 4.4 0 0 0 13 5zM19 5a4.5 4.5 0 0 1 4.4 3.6A4.6 4.6 0 0 1 27 13a4.6 4.6 0 0 1-1.4 3.3 4.6 4.6 0 0 1-2.6 7.3A4.5 4.5 0 0 1 16 26V7.3A4.4 4.4 0 0 1 19 5z" fill="${u('#f9a8d4','#db2777')}"/><path d="M16 8v18M11 12.5h3M10 18.5h4M18 12.5h3M18 18.5h4" stroke="#fdf2f8" stroke-width="1.4" stroke-linecap="round"/>`,
  lock:`<defs>${g('#fde68a','#d97706',0,1)}</defs><path d="M10 14v-3.5a6 6 0 0 1 12 0V14" stroke="#94a3b8" stroke-width="3" fill="none"/><rect x="6" y="13.5" width="20" height="15" rx="3.5" fill="${u('#fde68a','#d97706')}"/><circle cx="16" cy="20" r="2.2" fill="#78350f"/><path d="M16 21.5v3" stroke="#78350f" stroke-width="2" stroke-linecap="round"/>`,
  bell:`<defs>${g('#fde68a','#f59e0b',0,1)}</defs><path d="M8 21.5v-7a8 8 0 0 1 16 0v7l2 2.5H6z" fill="${u('#fde68a','#f59e0b')}"/><circle cx="16" cy="27" r="2.6" fill="#f97316"/><circle cx="24.5" cy="7.5" r="3.6" fill="#ef4444"/>`,
  help:`<defs>${g('#7dd3fc','#2563eb')}</defs><circle cx="16" cy="16" r="13" fill="${u('#7dd3fc','#2563eb')}"/><path d="M12.4 12.4a3.7 3.7 0 0 1 7.2 1.2c0 2.4-3.6 3-3.6 5.2" stroke="#fff" stroke-width="2.6" stroke-linecap="round" fill="none"/><circle cx="16" cy="22.8" r="1.7" fill="#fff"/>`,
  chart:`<defs>${g('#86efac','#16a34a',0,1)}${g('#93c5fd','#2563eb',0,1)}</defs><rect x="4" y="17" width="5" height="10" rx="1.4" fill="${u('#93c5fd','#2563eb')}"/><rect x="11.5" y="12" width="5" height="15" rx="1.4" fill="${u('#86efac','#16a34a')}"/><rect x="19" y="7" width="5" height="20" rx="1.4" fill="${u('#93c5fd','#2563eb')}"/><path d="M4 11.5 11 6l5 3.5 9.5-6" stroke="#fbbf24" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`
 };
 return `<svg class="v22-cic" width="${size}" height="${size}" viewBox="0 0 32 32" fill="none" aria-hidden="true">${I[name]||(V22X[name]?V22X[name](g,u):'')}</svg>`;
}

/** Brand mark image at a given size. */
const v22BrandMark=(h=26)=>`<img src="assets/brand/mod-alpha-mark.png" alt="" style="height:${h}px;width:auto">`;

/** Extra icon paths. */
const V22X={
 user:(g,u)=>`<defs>${g('#93c5fd','#6366f1')}</defs><circle cx="16" cy="16" r="14" fill="${u('#93c5fd','#6366f1')}"/><circle cx="16" cy="13" r="5" fill="#fff"/><path d="M7.5 25c1.6-4 4.8-6 8.5-6s6.9 2 8.5 6" fill="#fff"/>`,
 users:(g,u)=>`<defs>${g('#93c5fd','#2563eb')}${g('#c4b5fd','#7c3aed')}</defs><circle cx="12" cy="11" r="5" fill="${u('#93c5fd','#2563eb')}"/><path d="M3 26c1.2-5 4.6-7.5 9-7.5s7.8 2.5 9 7.5z" fill="${u('#93c5fd','#2563eb')}"/><circle cx="22.5" cy="12" r="4" fill="${u('#c4b5fd','#7c3aed')}"/><path d="M19 19.2c1-.4 2.2-.7 3.5-.7 3.5 0 6 2.1 7 6.5h-7.6" fill="${u('#c4b5fd','#7c3aed')}"/>`,
 sliders:(g,u)=>`<defs>${g('#67e8f9','#0891b2')}</defs><rect x="3" y="3" width="26" height="26" rx="7" fill="${u('#67e8f9','#0891b2')}"/><path d="M9 10h14M9 16h14M9 22h14" stroke="#ecfeff" stroke-width="2" stroke-linecap="round" stroke-opacity=".6"/><circle cx="19" cy="10" r="2.6" fill="#fff"/><circle cx="12" cy="16" r="2.6" fill="#fff"/><circle cx="21" cy="22" r="2.6" fill="#fff"/>`,
 mail:(g,u)=>`<defs>${g('#93c5fd','#2563eb')}</defs><rect x="3" y="7" width="26" height="19" rx="4" fill="${u('#93c5fd','#2563eb')}"/><path d="m4.5 9 11.5 8.5L27.5 9" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`,
 sms:(g,u)=>`<defs>${g('#6ee7b7','#059669')}</defs><path d="M6 5h20a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H13l-6 5v-5H6a3 3 0 0 1-3-3V8a3 3 0 0 1 3-3z" fill="${u('#6ee7b7','#059669')}"/><path d="M9 11h14M9 16h9" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/>`,
 phone:(g,u)=>`<defs>${g('#c4b5fd','#7c3aed')}</defs><rect x="8" y="2.5" width="16" height="27" rx="4" fill="${u('#c4b5fd','#7c3aed')}"/><rect x="10.5" y="6" width="11" height="17" rx="1.5" fill="#ede9fe"/><circle cx="16" cy="26" r="1.4" fill="#fff"/><circle cx="23" cy="6" r="4" fill="#ef4444"/>`,
 download:(g,u)=>`<defs>${g('#7dd3fc','#0284c7')}</defs><circle cx="16" cy="16" r="14" fill="${u('#7dd3fc','#0284c7')}"/><path d="M16 8.5v11M11.5 15.5l4.5 4.5 4.5-4.5M10 23.5h12" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>`,
 trash:(g,u)=>`<defs>${g('#fca5a5','#dc2626')}</defs><path d="M7 9h18l-1.6 17.2A2.5 2.5 0 0 1 20.9 28.5h-9.8a2.5 2.5 0 0 1-2.5-2.3z" fill="${u('#fca5a5','#dc2626')}"/><rect x="5" y="6" width="22" height="3.6" rx="1.6" fill="#ef4444"/><path d="M13 4h6M13 14v9M19 14v9" stroke="#fff" stroke-width="2" stroke-linecap="round"/>`,
 rupee:(g,u)=>`<defs>${g('#86efac','#16a34a')}</defs><circle cx="16" cy="16" r="14" fill="${u('#86efac','#16a34a')}"/><path d="M11 9h10M11 13h10M13.5 9c4.5 0 4.5 8 0 8H11l7.5 7" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`,
 warn:(g,u)=>`<defs>${g('#fde68a','#f59e0b',0,1)}</defs><path d="M16 3.5 29 27H3z" fill="${u('#fde68a','#f59e0b')}" stroke-linejoin="round"/><path d="M16 12v7" stroke="#78350f" stroke-width="2.8" stroke-linecap="round"/><circle cx="16" cy="23" r="1.7" fill="#78350f"/>`,
 refund:(g,u)=>`<defs>${g('#f9a8d4','#db2777')}</defs><circle cx="16" cy="16" r="14" fill="${u('#f9a8d4','#db2777')}"/><path d="M10 13h9a4.5 4.5 0 0 1 0 9h-5M10 13l3.5-3.5M10 13l3.5 3.5" stroke="#fff" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`,
 upload:(g,u)=>`<defs>${g('#93c5fd','#4f46e5')}</defs><path d="M9 25a6.5 6.5 0 0 1-.9-12.9 8.5 8.5 0 0 1 16.4 2.1A5.5 5.5 0 0 1 23.5 25z" fill="${u('#93c5fd','#4f46e5')}"/><path d="M16 23v-9M12 17.5l4-4 4 4" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>`,
 key:(g,u)=>`<defs>${g('#fde68a','#d97706')}</defs><circle cx="11" cy="16" r="7" fill="${u('#fde68a','#d97706')}"/><circle cx="9.5" cy="16" r="2.3" fill="#78350f"/><path d="M17 16h12M24 16v5M28 16v4" stroke="#f59e0b" stroke-width="3" stroke-linecap="round"/>`,
 plug:(g,u)=>`<defs>${g('#a5b4fc','#6366f1')}</defs><path d="M11 3v7M21 3v7" stroke="#94a3b8" stroke-width="2.6" stroke-linecap="round"/><path d="M7 10h18v4a9 9 0 0 1-18 0z" fill="${u('#a5b4fc','#6366f1')}"/><path d="M16 23v6" stroke="#94a3b8" stroke-width="3" stroke-linecap="round"/>`,
 clock:(g,u)=>`<defs>${g('#a5f3fc','#0891b2')}</defs><circle cx="16" cy="16" r="13" fill="${u('#a5f3fc','#0891b2')}"/><circle cx="16" cy="16" r="9.5" fill="#ecfeff"/><path d="M16 10v6.5l4 2.5" stroke="#0e7490" stroke-width="2.4" stroke-linecap="round" fill="none"/>`,
 globe:(g,u)=>`<defs>${g('#86efac','#0ea5e9')}</defs><circle cx="16" cy="16" r="13" fill="${u('#86efac','#0ea5e9')}"/><path d="M3 16h26M16 3c4 4 4 22 0 26M16 3c-4 4-4 22 0 26" stroke="#ecfeff" stroke-width="1.8" fill="none"/>`,
 palette:(g,u)=>`<defs>${g('#c4b5fd','#7c3aed')}</defs><path d="M16 3a13 13 0 0 0 0 26c1.7 0 2.4-1.2 2-2.6-.5-1.6.4-3.4 2.4-3.4H23a6 6 0 0 0 6-6C29 9.2 23.2 3 16 3z" fill="${u('#c4b5fd','#7c3aed')}"/><circle cx="10" cy="14" r="2.2" fill="#fde047"/><circle cx="14" cy="9" r="2.2" fill="#f472b6"/><circle cx="20" cy="9.5" r="2.2" fill="#38bdf8"/><circle cx="23" cy="15" r="2.2" fill="#4ade80"/>`,
 doc:(g,u)=>`<defs>${g('#e2e8f0','#94a3b8',0,1)}</defs><path d="M8 3h11l7 7v17a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" fill="${u('#e2e8f0','#94a3b8')}"/><path d="M19 3v7h7" fill="#cbd5e1"/><path d="M10.5 15h11M10.5 19h11M10.5 23h7" stroke="#475569" stroke-width="1.8" stroke-linecap="round"/>`,
 rocket2:(g,u)=>V22X.plug(g,u)
};
