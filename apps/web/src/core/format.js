/* ==========================================================================
   Mod Alpha — core: formatting helpers
   Dates (DD/MM/YYYY ⇄ Date), Indian number formats, month names, small UI
   building blocks (status pills, tags, selects, toggles, avatars) shared by many screens.
   ========================================================================== */

/** Short month names (Jan…Dec). */
const V22_MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

/** Amount in ₹ with Indian grouping, no decimals. */
const inr=n=>'₹'+Math.round(n).toLocaleString('en-IN');

/** Repeatable pseudo-random series (same input → same numbers) for illustrative demo charts. */
function v22Seeded(seed,n,start,end,noise){let x=seed*9301+49297;const r=()=>{x=(x*9301+49297)%233280;return x/233280};return Array.from({length:n},(_,i)=>{const t=i/(n-1);return start+(end-start)*Math.pow(t,1.35)+(i&&i<n-1?(r()-.5)*noise:0)})}

/** Small tag chips. */
function v22Tags(f){return `<div class="v22-tags"><span>${esc(f.type)}</span><span>${esc(f.category)}</span></div>`}

/** Row of pill buttons (one active). */
function v22Pills(list,active,attr='data-v22-period'){return `<div class="v22-pills">${list.map(x=>`<button type="button" ${attr}="${x}" class="${x===active?'active':''}">${x}</button>`).join('')}</div>`}

/** DD/MM/YYYY (or YYYY-MM-DD) text → Date, or null. */
function v22ParseDate(s){const m=String(s||'').trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);if(!m)return null;const d=new Date(+m[3],+m[2]-1,+m[1]);return isNaN(d)||d.getMonth()!==+m[2]-1?null:d}

/** Date → DD/MM/YYYY. */
function v22FmtDate(d){return String(d.getDate()).padStart(2,'0')+'/'+String(d.getMonth()+1).padStart(2,'0')+'/'+d.getFullYear()}

/** Number with Indian grouping. */
function v22Num(s){return Number(String(s||'').replace(/[^\d.]/g,''))}

/** Date input with a calendar button (opens the date picker). */
function v22DateField(id,value,lead='clock'){return `<div class="v22-field">${lead?ic(lead):''}<input id="${id}" value="${value}" inputmode="numeric" placeholder="dd/mm/yyyy" aria-label="Date (dd/mm/yyyy)"><button type="button" class="v22-cal-btn" data-v22-cal="${id}" aria-label="Open calendar">${ic('calendar')}</button><input type="date" class="v22-hidden-date" data-v22-date-for="${id}" tabindex="-1" aria-hidden="true"></div>`}

/** Coloured status pill (Active, Pending, Failed, …). */
const v22Status=(t)=>{const m={Active:'ok',Verified:'ok',Published:'ok',Success:'ok',Completed:'ok',Scheduled:'info','In review':'info',Pending:'warn','Past due':'warn','Not started':'neutral',Draft:'warn',Archived:'neutral',Cancelled:'bad',Suspended:'bad',Blocked:'bad',Free:'neutral','Manual for now':'ok',Expired:'neutral'};return `<span class="v22-pill ${m[t]||'neutral'}">${esc(t)}</span>`};

/** Round initials avatar. */
const v22Avatar=(n,i=0)=>`<span class="v22-av" style="--c:${['#3b82f6','#8b5cf6','#14b8a6','#f59e0b','#ec4899','#22c55e'][i%6]}">${esc(n.split(' ').map(x=>x[0]).join('').slice(0,2))}</span>`;

/** Styled <select>. */
const v22Sel=(id,opts,cls='')=>`<label class="v22-select ${cls}"><select ${id?`id="${id}"`:''}>${opts.map(o=>`<option>${o}</option>`).join('')}</select>${ic('chevDown')}</label>`;

/** On/off switch. */
const v22Toggle=(on,attr='')=>`<label class="v22-switch"><input type="checkbox" ${on?'checked':''} ${attr}><span></span></label>`;

/** Date → YYYY-MM-DD. */
const v22Iso=d=>d.getUTCFullYear()+'-'+String(d.getUTCMonth()+1).padStart(2,'0')+'-'+String(d.getUTCDate()).padStart(2,'0');

/** Today as YYYY-MM-DD. */
const v22Today=()=>{const n=new Date();return v22Iso(new Date(Date.UTC(n.getFullYear(),n.getMonth(),n.getDate())))};

/** Trim and collapse whitespace. */
function v22Strip(sheets){const o={};for(const s in sheets)o[s]=sheets[s].map(r=>{const x={...r};delete x._row;return x});return o}

/** YYYY-MM-DD → Date (UTC). */
const v22D=s=>new Date(s+'T00:00:00Z');

/** Add years to a YYYY-MM-DD date. */
const v22AddY=(iso,y)=>{const d=v22D(iso);d.setUTCFullYear(d.getUTCFullYear()-y);return v22Iso(d)};

/** YYYY-MM-DD → '12 Nov 2026'. */
const v22Fmt=iso=>{if(!iso)return '—';const d=v22D(iso);return `${d.getUTCDate()} ${V22_MON[d.getUTCMonth()]} ${d.getUTCFullYear()}`};

/** Short number (12.3K, 4.5L, 1.2Cr). */
const v22Short=n=>n>=1e7?'₹'+(n/1e7).toFixed(1)+'Cr':n>=1e5?'₹'+(n/1e5).toFixed(1)+'L':n>=1e3?'₹'+Math.round(n/1e3)+'K':'₹'+Math.round(n);

/** Percentage with one decimal. */
const v22Pct=(v,pp)=>`${v>=0?'+':''}${v.toFixed(1)}${pp?' pp':'%'}`;
