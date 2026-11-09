/* ==========================================================================
   Shared: fund house logos
   Shows the official AMC logo when one is listed in assets/funds/manifest.js,
   otherwise a coloured monogram (two letters) for the fund house.
   ========================================================================== */

/** Monogram colours per fund house. */
const V22_AMC_STYLE={'Quant Mutual Fund':['q','#5b2a86'],'SBI Mutual Fund':['SBI','#1d4f9c'],'HDFC Mutual Fund':['HDFC','#0b4a8b'],'PPFAS Mutual Fund':['PP','#0f6b63'],'Axis Mutual Fund':['AX','#8e1b4f']};

/** Two-letter monogram for a fund house. */
function v22AmcMono(amc){const st=V22_AMC_STYLE[amc];if(st)return st;const w=String(amc||'?').replace(/(Mutual Fund|Investments|AMC|Asset Management)/gi,'').trim();const pal=['#2563eb','#0d9488','#7c3aed','#c2410c','#be123c','#0369a1','#4d7c0f','#a16207','#9333ea','#0f766e'];let h=0;for(const c of w)h=(h*31+c.charCodeAt(0))>>>0;return [w.slice(0,1).toUpperCase(),pal[h%pal.length]]}

/** Fund house logo image, or the monogram. */
function v22FundLogo(f,cls=''){const amc=f&&f.amc||'',src=(window.MA_AMC_LOGOS||{})[amc],[mono,col]=v22AmcMono(amc),len=mono.length;
 return `<span class="v22-fund-logo ${cls} ${src?'has-img':''} l${len}" style="--fc:${col}" title="${esc(amc)}" role="img" aria-label="${esc(amc)}">${src?`<img src="${src}" alt="" loading="lazy" onerror="this.parentElement.classList.remove('has-img');this.remove()">`:''}<b>${esc(mono)}</b></span>`}

/** Logo for a fund object. */
function v22FundIcon(f){return v22FundLogo(f)}
