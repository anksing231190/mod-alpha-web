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

/** Outline icon by name: Lucide (core/icons-lucide.js) first, the old hand-drawn path only as a fallback. */
function ic(name,cls='',size){const L=typeof MA_LUCIDE!=='undefined'?MA_LUCIDE[MA_ICON_OUTLINE[name]||(MA_ICON_TILE[name]||[])[0]||name]:null;return `<svg class="v22-ic ${cls}" viewBox="0 0 24 24" ${size?`width="${size}" height="${size}"`:''} fill="none" stroke="currentColor" stroke-width="${L?1.75:1.8}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${L||V22_ICONS[name]||''}</svg>`}

/** The Mod Alpha α mark as inline SVG. */
/* Brand "M" glyph used in the reference login card, engine chip and phone notification */
function v22Mark(size=34,id='mk'+Math.random().toString(36).slice(2,7)){return `<svg class="v22-mark" width="${size}" height="${size}" viewBox="0 0 48 48" aria-hidden="true"><defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#38c7ff"/><stop offset=".55" stop-color="#5b7bff"/><stop offset="1" stop-color="#b350f5"/></linearGradient></defs><path d="M6 40V12.5c0-3.6 4.4-5.3 6.8-2.6L24 22.6 35.2 9.9c2.4-2.7 6.8-1 6.8 2.6V40h-8.5V24.5l-7.2 8.1a3 3 0 0 1-4.6 0l-7.2-8.1V40z" fill="url(#${id})"/></svg>`}

/** Tints for tile icons: [background, stroke]. */
const MA_TINT={blue:['#3b82f6','#60a5fa'],violet:['#8b5cf6','#a78bfa'],green:['#10b981','#34d399'],amber:['#f59e0b','#fbbf24'],rose:['#f43f5e','#fb7185'],cyan:['#06b6d4','#22d3ee']};

/** Tile icon: a Lucide icon on a softly tinted rounded square (replaces the old multi-colour drawings). */
function cic(name,size=28){
 const m=(typeof MA_ICON_TILE!=='undefined'&&(MA_ICON_TILE[name]||(MA_ICON_OUTLINE[name]&&[MA_ICON_OUTLINE[name],'blue'])))||[name,'blue'],L=typeof MA_LUCIDE!=='undefined'?MA_LUCIDE[m[0]]:'',c=MA_TINT[m[1]]||MA_TINT.blue;
 return `<svg class="v22-cic ma-tint-${m[1]}" width="${size}" height="${size}" viewBox="0 0 32 32" fill="none" aria-hidden="true"><rect x=".75" y=".75" width="30.5" height="30.5" rx="9" fill="${c[0]}" fill-opacity=".14" stroke="${c[1]}" stroke-opacity=".35" stroke-width="1"/><g transform="translate(7 7) scale(.75)" stroke="${c[1]}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${L||''}</g></svg>`;
}

/** Brand mark image at a given size. */
const v22BrandMark=(h=26)=>`<img src="assets/brand/mod-alpha-mark.png" alt="" style="height:${h}px;width:auto">`;


