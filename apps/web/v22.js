/* ==========================================================================
   Mod Alpha — v22 reference-fidelity layer
   Re-implements the screens shown in docs/assets/reference-v21/ so layout,
   type scale, icons and charts follow the approved screenshots.
   Loaded after app.js: function declarations below replace the v21 ones.
   All figures are synthetic, illustrative test data.
   ========================================================================== */

/* ---------- Icons (inline SVG, stroke style) ---------- */
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
function ic(name,cls='',size){return `<svg class="v22-ic ${cls}" viewBox="0 0 24 24" ${size?`width="${size}" height="${size}"`:''} fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${V22_ICONS[name]||''}</svg>`}
/* Brand "M" glyph used in the reference login card, engine chip and phone notification */
function v22Mark(size=34,id='mk'+Math.random().toString(36).slice(2,7)){return `<svg class="v22-mark" width="${size}" height="${size}" viewBox="0 0 48 48" aria-hidden="true"><defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#38c7ff"/><stop offset=".55" stop-color="#5b7bff"/><stop offset="1" stop-color="#b350f5"/></linearGradient></defs><path d="M6 40V12.5c0-3.6 4.4-5.3 6.8-2.6L24 22.6 35.2 9.9c2.4-2.7 6.8-1 6.8 2.6V40h-8.5V24.5l-7.2 8.1a3 3 0 0 1-4.6 0l-7.2-8.1V40z" fill="url(#${id})"/></svg>`}
const V22_MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const inr=n=>'₹'+Math.round(n).toLocaleString('en-IN');
const lakh=n=>n>=1e5?'₹'+(n/1e5).toFixed(n>=1e7?0:0)+'L':inr(n);

/* ---------- Chart engine (uniform scaling: no stretched text or oval dots) ---------- */
function v22Chart(o){
 const W=o.w||1000,H=o.h||360,P=Object.assign({l:56,r:20,t:16,b:40},o.pad||{}),gid='c'+Math.random().toString(36).slice(2,8);
 const yMin=o.yMin,yMax=o.yMax,iw=W-P.l-P.r,ih=H-P.t-P.b;
 const Y=v=>P.t+ih-(v-yMin)/(yMax-yMin)*ih;
 const X=(i,n)=>P.l+(n<=1?0:i*iw/(n-1));
 let s=`<svg class="v22-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(o.label||'Illustrative chart')}"><defs>`;
 (o.series||[]).forEach((se,k)=>{
  const st=se.stops||[[0,se.color],[1,se.color]];
  s+=`<linearGradient id="${gid}s${k}" gradientUnits="userSpaceOnUse" x1="${P.l}" y1="0" x2="${W-P.r}" y2="0">${st.map(x=>`<stop offset="${x[0]}" stop-color="${x[1]}"/>`).join('')}</linearGradient>`;
  if(se.area){const as=se.areaStops||st;s+=`<linearGradient id="${gid}a${k}" gradientUnits="userSpaceOnUse" x1="${P.l}" y1="0" x2="${W-P.r}" y2="0">${as.map(x=>`<stop offset="${x[0]}" stop-color="${x[1]}"/>`).join('')}</linearGradient><linearGradient id="${gid}f${k}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="${se.area}"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient><mask id="${gid}m${k}"><rect x="0" y="0" width="${W}" height="${H}" fill="url(#${gid}f${k})"/></mask>`}
 });
 if(o.bars)s+=`<linearGradient id="${gid}b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3d8cff"/><stop offset="1" stop-color="#1a3fae"/></linearGradient><linearGradient id="${gid}bp" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8b5cf6"/><stop offset="1" stop-color="#3b2a9e"/></linearGradient>`;
 s+=`</defs>`;
 // grid
 (o.yTicks||[]).forEach(t=>{const y=Y(t);s+=`<line class="v22-grid" x1="${P.l}" x2="${W-P.r}" y1="${y}" y2="${y}"/><text class="v22-axis" x="${P.l-14}" y="${y+5}" text-anchor="end">${o.yFmt?o.yFmt(t):t}</text>`});
 if(o.yRight)o.yRight.ticks.forEach((t,i)=>{const y=Y(o.yTicks[i]);s+=`<text class="v22-axis" x="${W-P.r+12}" y="${y+5}" text-anchor="start">${t}</text>`});
 const xl=o.xLabels||[];const xPos=o.xPos||xl.map((_,i)=>P.l+(xl.length<=1?0:i*iw/(xl.length-1)));
 {const vx=o.vGrid===false||xPos.length<3?Array.from({length:9},(_,i)=>P.l+i*iw/8):xPos;vx.forEach(x=>{s+=`<line class="v22-grid v" x1="${x.toFixed(1)}" x2="${x.toFixed(1)}" y1="${P.t}" y2="${P.t+ih}"/>`})}
 if(o.axisY)s+=`<line class="v22-axisline" x1="${P.l}" x2="${P.l}" y1="${P.t}" y2="${P.t+ih}"/>`;
 xl.forEach((t,i)=>{s+=`<text class="v22-axis" x="${xPos[i]}" y="${H-P.b+28}" text-anchor="middle">${t}</text>`});
 // bars
 if(o.bars){const n=o.bars.values.length,bw=Math.min(o.bars.width||iw/n*.55,iw/n*.34,12);o.bars.values.forEach((v,i)=>{const x=P.l+(i+.5)*iw/n-bw/2,y=Y(v);s+=`<rect data-i="${i}" x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${(P.t+ih-y).toFixed(1)}" rx="2" fill="url(#${gid}${(o.bars.purple||[]).includes(i)?'bp':'b'})"/>`})}
 // series
 (o.series||[]).forEach((se,k)=>{
  const n=se.values.length,xs=se.xs||se.values.map((_,i)=>se.bandX?P.l+(i+.5)*iw/n:X(i,n));
  const pts=se.values.map((v,i)=>[xs[i],Y(v)]);
  const d=pts.map((p,i)=>(i?'L':'M')+p[0].toFixed(1)+' '+p[1].toFixed(1)).join(' ');
  if(se.area)s+=`<path d="${d} L${pts.at(-1)[0]} ${P.t+ih} L${pts[0][0]} ${P.t+ih}Z" fill="url(#${gid}a${k})" mask="url(#${gid}m${k})"/>`;
  s+=`<path class="v22-line ${se.cls||''}" d="${d}" fill="none" stroke="url(#${gid}s${k})" stroke-width="${Math.max(1.4,(se.width||3)*.55).toFixed(2)}" ${se.dash?`stroke-dasharray="${se.dash}"`:''} stroke-linecap="round" stroke-linejoin="round" style="--glow:${se.glow||se.color||'#4b8bff'}"/>`;
  if(se.dots){const st=se.stops||[[0,se.color],[1,se.color]];pts.forEach((p,i)=>{if(se.dots!==true&&i%se.dots!==0&&i!==n-1)return;const c=se.dotColor||v22Mix(st,i/(n-1||1));const end=i===n-1&&se.endDot;s+=`<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="${end?Math.max(3.5,se.endDot*.7):Math.max(2.2,(se.r||4.5)*.62)}" fill="${c}" ${end?`class="v22-enddot" style="--glow:${c}"`:''} stroke="${end?'#fff':'rgba(255,255,255,.55)'}" stroke-width="${end?1.8:.8}"/>`})}
 });
 s+='</svg>';
 const ov=(o.overlays||[]).map(x=>{let px,py;if(x.at){const se=o.series[x.at[0]],n=se.values.length,i=x.at[1]<0?n+x.at[1]:x.at[1];px=se.bandX?P.l+(i+.5)*iw/n:X(i,n);py=Y(se.values[i])}else{px=x.x;py=x.y}return `<div class="v22-ov ${x.cls||''}" style="left:${(px/W*100).toFixed(2)}%;top:${(py/H*100).toFixed(2)}%">${x.html}</div>`}).join('');
 return `<div class="v22-chart ${o.cls||''}" style="aspect-ratio:${W}/${H}">${s}${ov}</div>`;
}
function v22Mix(stops,t){const hex=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));for(let i=0;i<stops.length-1;i++){const[a,ca]=stops[i],[b,cb]=stops[i+1];if(t>=a&&t<=b){const u=(t-a)/(b-a||1),A=hex(ca),B=hex(cb);return'#'+A.map((v,j)=>Math.round(v+(B[j]-v)*u).toString(16).padStart(2,'0')).join('')}}return stops.at(-1)[1]}
function v22Spark(values,color,extra=''){const w=120,h=48,min=Math.min(...values),max=Math.max(...values);const pts=values.map((v,i)=>[4+i*(w-8)/(values.length-1),h-6-(v-min)/(max-min||1)*(h-14)]);const gid='sp'+Math.random().toString(36).slice(2,7);return `<svg class="v22-spark ${extra}" viewBox="0 0 ${w} ${h}" aria-hidden="true"><defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${color}" stop-opacity=".28"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></linearGradient></defs><path d="M${pts.map(p=>p.map(n=>n.toFixed(1)).join(' ')).join(' L')} L${w-4} ${h} L4 ${h}Z" fill="url(#${gid})"/><polyline points="${pts.map(p=>p.join(',')).join(' ')}" fill="none" stroke="${color}" stroke-width="1.4" stroke-linejoin="round" stroke-linecap="round" style="filter:drop-shadow(0 0 4px ${color})"/></svg>`}
function v22Seeded(seed,n,start,end,noise){let x=seed*9301+49297;const r=()=>{x=(x*9301+49297)%233280;return x/233280};return Array.from({length:n},(_,i)=>{const t=i/(n-1);return start+(end-start)*Math.pow(t,1.35)+(i&&i<n-1?(r()-.5)*noise:0)})}

/* ---------- Shared bits ---------- */
const V22_AMC_STYLE={'Quant Mutual Fund':['q','#5b2a86'],'SBI Mutual Fund':['SBI','#1d4f9c'],'HDFC Mutual Fund':['HDFC','#0b4a8b'],'PPFAS Mutual Fund':['PP','#0f6b63'],'Axis Mutual Fund':['AX','#8e1b4f']};
function v22AmcMono(amc){const st=V22_AMC_STYLE[amc];if(st)return st;const w=String(amc||'?').replace(/(Mutual Fund|Investments|AMC|Asset Management)/gi,'').trim();const pal=['#2563eb','#0d9488','#7c3aed','#c2410c','#be123c','#0369a1','#4d7c0f','#a16207','#9333ea','#0f766e'];let h=0;for(const c of w)h=(h*31+c.charCodeAt(0))>>>0;return [w.slice(0,1).toUpperCase(),pal[h%pal.length]]}
function v22FundLogo(f,cls=''){const amc=f&&f.amc||'',src=(window.MA_AMC_LOGOS||{})[amc],[mono,col]=v22AmcMono(amc),len=mono.length;
 return `<span class="v22-fund-logo ${cls} ${src?'has-img':''} l${len}" style="--fc:${col}" title="${esc(amc)}" aria-label="${esc(amc)}">${src?`<img src="${src}" alt="" loading="lazy" onerror="this.parentElement.classList.remove('has-img');this.remove()">`:''}<b>${esc(mono)}</b></span>`}
function v22FundIcon(f){return v22FundLogo(f)}
function v22Tags(f){return `<div class="v22-tags"><span>${esc(f.type)}</span><span>${esc(f.category)}</span></div>`}
function v22Pills(list,active,attr='data-v22-period'){return `<div class="v22-pills">${list.map(x=>`<button type="button" ${attr}="${x}" class="${x===active?'active':''}">${x}</button>`).join('')}</div>`}
function v22ParseDate(s){const m=String(s||'').trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);if(!m)return null;const d=new Date(+m[3],+m[2]-1,+m[1]);return isNaN(d)||d.getMonth()!==+m[2]-1?null:d}
function v22FmtDate(d){return String(d.getDate()).padStart(2,'0')+'/'+String(d.getMonth()+1).padStart(2,'0')+'/'+d.getFullYear()}
function v22Num(s){return Number(String(s||'').replace(/[^\d.]/g,''))}
function v22DateField(id,value,lead='clock'){return `<div class="v22-field">${lead?ic(lead):''}<input id="${id}" value="${value}" inputmode="numeric" placeholder="dd/mm/yyyy" aria-label="Date (dd/mm/yyyy)"><button type="button" class="v22-cal-btn" data-v22-cal="${id}" aria-label="Open calendar">${ic('calendar')}</button><input type="date" class="v22-hidden-date" data-v22-date-for="${id}" tabindex="-1" aria-hidden="true"></div>`}
const V22_ASOF=new Date(2026,8,30); // data "as of" used by the illustrative calculators

/* ---------- Illustrative calculation models (tuned so defaults equal the reference values) ---------- */
const V22_LUMP_CAGR=Math.exp(Math.log(4.44171)/5.7)-1; // ≈29.9% → ₹1,00,000 over 5.7y = ₹4,44,171
function v22Lump(amount,date){const yrs=Math.max(.1,Math.round((V22_ASOF-date)/(365.25*864e5)*10)/10);const mult=Math.pow(1+V22_LUMP_CAGR,yrs);return{yrs,value:amount*mult,gain:amount*(mult-1),ret:(mult-1)*100,cagr:Math.floor(V22_LUMP_CAGR*1000)/10,mult}}
function v22SolveRate(target){let lo=0,hi=.06;for(let k=0;k<80;k++){const r=(lo+hi)/2,fv=((Math.pow(1+r,60)-1)/r)*(1+r);fv>target?hi=r:lo=r}return(lo+hi)/2}
const V22_R_MOD=v22SolveRate(117.1377),V22_R_TRAD=v22SolveRate(68);
function v22Sip(amount,start,end){const months=Math.max(1,(end.getFullYear()-start.getFullYear())*12+end.getMonth()-start.getMonth());const fv=r=>amount*((Math.pow(1+r,months)-1)/r)*(1+r);const mod=fv(V22_R_MOD),trad=fv(V22_R_TRAD);const path=r=>Array.from({length:6},(_,k)=>{const m=Math.round(months*k/5);return m?amount*((Math.pow(1+r,m)-1)/r)*(1+r):amount});return{months,invested:amount*months,mod,trad,extra:mod-trad,pct:(mod-trad)/trad*100,yrs:Math.round(months/12*10)/10,modPath:path(V22_R_MOD),tradPath:path(V22_R_TRAD)}}

/* ======================================================================
   Explore Mutual Funds  (ref 02 / 03)
   ====================================================================== */
let v22Chip='All',v22Page=1;
function fundExplorer(){
 const q=(filters.q||'').toLowerCase();
 const all=D.funds.filter(f=>(!q||(f.name+' '+f.amc+' '+f.category+' '+f.type).toLowerCase().includes(q))&&(filters.category==='All'||f.category===filters.category||f.type===filters.category)&&(v22Chip==='All'||f.type===v22Chip||f.category===v22Chip)).sort((a,b)=>(b.returns[5]??-999)-(a.returns[5]??-999));
 const per=5,pages=Math.max(1,Math.ceil(all.length/per));v22Page=Math.min(v22Page,pages);const shown=all.slice((v22Page-1)*per,v22Page*per);
 const chips=['All','Equity','Small Cap','Mid Cap','Large Cap','Flexi Cap','Hybrid','Index','ELSS'];
 const sparkColors=['#8b5cf6','#38bdf8','#d946ef','#22c55e','#c026d3'];
 return `<div class="v22 v22-explore">
 <header class="v22-title"><h1>Explore Mutual Funds</h1><p>Discover top performing mutual funds with AI-powered insights.</p></header>
 <div class="v22-explore-tools"><label class="v22-search">${ic('search')}<input id="fund-search" placeholder="Search by fund name, AMC or category..." value="${esc(filters.q)}" autocomplete="off"><button type="button" data-v22-clear aria-label="Clear search">${ic('x')}</button></label><label class="v22-select"><select id="filter-category" aria-label="Category"><option value="All">All Categories</option>${D.categories.map(x=>`<option ${filters.category===x?'selected':''}>${esc(x)}</option>`).join('')}</select>${ic('chevDown')}</label></div>
 <div class="v22-chips" role="toolbar" aria-label="Fund categories">${chips.map(x=>`<button type="button" data-v22-chip="${x}" class="${v22Chip===x?'active':''}">${x}</button>`).join('')}</div>
 <div class="v22-sort">${ic('sort')}<span>Best 5Y Returns</span></div>
 <div class="v22-fund-list">${shown.map((f,i)=>`<article class="v22-fund-row">
  <div class="v22-fund-id">${v22FundIcon(f)}<div><b>${esc(f.name)}</b>${v22Tags(f)}</div></div>
  <div class="v22-spark-box">${v22Spark(v22FundSpark(f,i),sparkColors[(all.indexOf(f))%5])}</div>
  <div class="v22-fund-ret"><b>${f.returns[5].toFixed(1)}%</b><small>5Y CAGR</small></div>
  <button type="button" class="v22-view" data-fund="${f.id}">View ${ic('arrowR')}</button>
 </article>`).join('')||'<div class="v22-empty">No schemes match your filters. Try a broader search.</div>'}</div>
 <nav class="v22-pager" aria-label="Pagination"><button type="button" data-v22-page="${v22Page-1}" ${v22Page===1?'disabled':''} aria-label="Previous page">${ic('chevL')}</button>${Array.from({length:pages},(_,i)=>`<button type="button" data-v22-page="${i+1}" class="${i+1===v22Page?'active':''}">${i+1}</button>`).join('')}<button type="button" data-v22-page="${v22Page+1}" ${v22Page===pages?'disabled':''} aria-label="Next page">${ic('chevR')}</button></nav>
 <p class="v22-note">Sample catalogue · ${all.length} schemes · Returns are illustrative test values, not live performance.</p></div>`;
}

/* ======================================================================
   Fund Detail  (ref 01 / 04)
   ====================================================================== */
let v22DetailPeriod='5Y';
function fundDetail(id){
 const f=D.funds.find(x=>x.id===id)||D.funds[0];selectedFund=f.id;
 const metric=(v,l,c='')=>`<article><b class="${c}">${v}</b><small>${l}</small></article>`;
 return `<div class="v22 v22-detail">
 <header class="v22-detail-head"><div class="v22-detail-id">${v22FundLogo(f,'lg')}<div><h1>${esc(f.name)}</h1>${v22Tags(f)}</div></div><button type="button" class="v22-watch" data-action="watchlist">${ic('star')}<span>Add to Watchlist</span></button></header>
 <div class="v22-tabs" role="tablist">${[['overview','Overview'],['performance','Performance'],['nav','NAV History'],['ai','AI Insights'],['info','Fund Info']].map((t,i)=>`<button type="button" role="tab" data-tab="${t[0]}" class="${i===0?'active':''}">${t[1]}</button>`).join('')}</div>
 <section class="v22-metrics">${metric(f.returns[5].toFixed(1)+'%','5Y CAGR','pos')}${metric(f.returns[3].toFixed(1)+'%','3Y CAGR','pos')}${metric(f.returns[1].toFixed(1)+'%','1Y Returns','pos')}${metric((f.sharpe||1.5).toFixed(1),'Sharpe Ratio','pos-soft')}${metric(esc(f.riskLabel||'Moderate'),'Risk Level','pos')}</section>
 <section id="fund-tab-content">${fundTab(f,'overview')}</section></div>`;
}
function v22Since(f){return f.since2021||Math.pow(1+f.returns[5]/100,5.15)}
function v22DetailSeries(f,period){
 const n={'1M':12,'3M':14,'6M':16,'1Y':18,'3Y':24,'5Y':30}[period]||30;
 const yrs={'1M':1/12,'3M':.25,'6M':.5,'1Y':1,'3Y':3,'5Y':5.7}[period]||5.7;
 const end=f.nav,start=period==='5Y'?end/v22Since(f):end/Math.pow(1+f.returns[5]/100,yrs);
 return v22Seeded(f.id.charCodeAt(1),n,start,end,(end-start)*.035);
}
function v22DetailChart(f,period){
 const vals=v22DetailSeries(f,period),max=Math.max(...vals),top=Math.ceil(max/100)*100+ (max%100>80?100:0);
 const yMax=Math.max(100,top),step=yMax/5;
 const labels={'1M':['W1','W2','W3','W4'],'3M':['Jul','Aug','Sep','Oct'],'6M':['May','Jun','Jul','Aug','Sep','Oct'],'1Y':['Nov','Jan','Mar','May','Jul','Sep'],'3Y':['2023','2024','2025','2026'],'5Y':['2021','2022','2023','2024','2025','2026']}[period];
 const ret=((vals.at(-1)/vals[0]-1)*100);
 return v22Chart({w:1080,h:330,pad:{l:56,r:22,t:18,b:40},yMin:0,yMax,yTicks:[0,1,2,3,4,5].map(i=>i*step),yFmt:v=>v?'₹'+Math.round(v):'0',xLabels:labels,xPos:labels.map((_,i)=>56+i*(1080-56-22-40)/(labels.length-1)),axisY:true,label:'Illustrative returns performance',
  series:[{values:vals,stops:[[0,'#3b82f6'],[.45,'#6d6cf6'],[1,'#c84cf0']],areaStops:[[0,'#2563eb'],[.6,'#7c3aed'],[1,'#c026d3']],area:.75,width:3.2,dots:2,r:4.5,endDot:7,glow:'#8b5cf6'}],
  overlays:[{at:[0,-1],cls:'v22-tip v22-tip-left',html:`<small>${period==='5Y'?'Dec 2026':'Latest'}</small><b>₹${vals.at(-1).toFixed(2)}</b><strong>${ret>=0?'+':''}${(period==='5Y'?f.returns[5]:ret).toFixed(1)}%</strong>`}]});
}
function fundTab(f,tab){
 if(tab==='overview'||tab==='performance'){
  const invested=10000,cur=Math.round(invested*v22Since(f)/10)*10,tot=(cur/invested-1)*100;
  return `<section class="v22-card v22-perf"><div class="v22-card-head"><h2>Returns Performance</h2>${v22Pills(['1M','3M','6M','1Y','3Y','5Y'],v22DetailPeriod,'data-v22-dperiod')}</div><div id="v22-detail-chart">${v22DetailChart(f,v22DetailPeriod)}</div></section>
  <section class="v22-summary"><article><b class="lav">${inr(invested)}</b><small>Invested on 01 Jan 2021</small></article><article><b class="vio">${inr(cur)}</b><small class="ul">Current Value</small></article><article><b class="pos">+${tot.toFixed(1)}%</b><small>Total Returns</small></article><article><b class="pos">${f.returns[5].toFixed(1)}%</b><small>CAGR</small></article><article><b class="sky">5.7 years</b><small>Time Period</small></article></section>`;
 }
 if(tab==='nav')return `<section class="v22-card"><div class="v22-card-head"><h2>NAV History</h2><span class="v22-muted">Illustrative sample NAV data</span></div><div class="table-scroll"><table class="v22-table"><thead><tr><th>Date</th><th>NAV</th><th>Change</th><th>Source</th></tr></thead><tbody>${v22DetailSeries(f,'1Y').slice(-12).reverse().map((v,i,a)=>`<tr><td>${String(30-i*2).padStart(2,'0')} Sep 2026</td><td>₹${v.toFixed(2)}</td><td class="${a[i+1]&&v<a[i+1]?'neg':'pos'}">${a[i+1]?((v/a[i+1]-1)*100).toFixed(2)+'%':'—'}</td><td>Demo dataset</td></tr>`).join('')}</tbody></table></div></section>`;
 if(tab==='ai')return `<section class="v22-insight-row v2"><span class="v22-ins-badge">${v22BrandMark(28)}</span><div class="v22-insight-body"><b>AI Insight <em>Illustrative</em></b><p>${esc(f.short)} shows a ${f.returns[5].toFixed(1)}% illustrative 5-year CAGR in this sample dataset. Review volatility, benchmark (${esc(f.benchmark)}), expense ratio and your horizon before deciding.</p></div></section>`;
 return `<section class="v22-card"><h2 class="v22-h2">Fund Information</h2><div class="v22-info-grid">${[['Scheme name',f.name],['AMC',f.amc],['Category',f.category],['Asset class',f.type],['Plan',f.plan],['Option',f.option],['Benchmark',f.benchmark],['AUM',f.aum],['Inception date',f.inception],['Riskometer',f.risk]].map(([a,b])=>`<div><span>${a}</span><b>${esc(b)}</b></div>`).join('')}</div></section>`;
}

/* ======================================================================
   What If Calculator  (ref 05)
   ====================================================================== */
let v22WhatIf={date:'15/01/2021',amount:100000};
function v22JourneyChart(r,amount){
 const n=12,vals=Array.from({length:n},(_,i)=>amount*Math.pow(r.mult,i/(n-1)));
 const yMax=Math.max(5,Math.ceil(r.value/1e5))*1e5;const ticks=[0,1,2,3,4,5].map(i=>i*yMax/5);
 const fmt=v=>!v?'0':v>=1e7?'₹'+(v/1e7).toFixed(v%1e7?1:0)+'Cr':v>=1e5?'₹'+(v/1e5).toFixed(v%1e5?1:0)+'L':'₹'+(v/1e3).toFixed(0)+'K';
 const start=v22ParseDate(v22WhatIf.date)||new Date(2021,0,15),y0=start.getFullYear(),years=Array.from({length:6},(_,i)=>String(Math.round(y0+(2026-y0)*i/5)));
 return v22Chart({w:620,h:310,pad:{l:50,r:24,t:20,b:40},yMin:0,yMax,yTicks:ticks,yFmt:fmt,xLabels:years,axisY:true,label:'Illustrative investment journey',
  series:[{values:vals,stops:[[0,'#22d3ee'],[1,'#38bdf8']],area:.7,areaStops:[[0,'#0ea5e9'],[1,'#22d3ee']],width:3.6,dots:true,r:6,endDot:8,glow:'#22d3ee',dotColor:'#5fe3ff'}],
  overlays:[{at:[0,-1],cls:'v22-tip v22-tip-up',html:`<small>Current Value</small><b>${inr(r.value)}</b>`}]});
}
function whatIf(){
 const d=v22ParseDate(v22WhatIf.date)||new Date(2021,0,15),r=v22Lump(v22WhatIf.amount,d);
 const presetActive=k=>{const y=Math.round((V22_ASOF-d)/(365.25*864e5));return k==='custom'?![1,3,5].includes(y)||Math.abs(r.yrs-y)>.35:Math.abs(r.yrs-k)<.35&&false};
 return `<div class="v22 v22-whatif">
 <header class="v22-title"><h1>What if you had invested on this date?</h1><p>See how much your investment would be worth if you had invested at a different time.</p></header>
 <section class="v22-two"><article class="v22-card v22-input-card"><label class="v22-label" for="calc-date">Investment Date</label>${v22DateField('calc-date',v22FmtDate(d))}<div class="v22-opts">${[['5','5Y'],['3','3Y'],['1','1Y'],['custom','Custom']].map(x=>`<button type="button" data-v22-preset="${x[0]}" class="${x[0]==='custom'?'soft':''}">${x[1]}</button>`).join('')}</div></article>
 <article class="v22-card v22-input-card"><label class="v22-label" for="calc-amount">Investment Amount</label><div class="v22-field">${ic('wallet')}<input id="calc-amount" value="${Number(v22WhatIf.amount).toLocaleString('en-IN')}" inputmode="numeric" aria-label="Investment amount in rupees"></div><div class="v22-opts">${[[10000,'10K'],[50000,'50K'],[100000,'1L'],[500000,'5L'],[1000000,'10L']].map(x=>`<button type="button" data-v22-amount="${x[0]}" class="${v22WhatIf.amount===x[0]?'active':''}">${x[1]}</button>`).join('')}</div></article></section>
 <section class="v22-journey-grid"><article class="v22-card"><h2 class="v22-h2">Investment Journey</h2><div id="v22-journey">${v22JourneyChart(r,v22WhatIf.amount)}</div></article>
 <article class="v22-card v22-results"><h2 class="v22-h2 sm">Results</h2><div class="v22-result-box" id="v22-results">${v22ResultRows(r)}</div></article></section>
 <section class="v22-insight-row v2"><span class="v22-ins-badge">${v22BrandMark(28)}</span><div class="v22-insight-body"><b>AI Insight <em>Illustrative</em></b><p id="v22-insight-text">${v22InsightText(r,d)}</p></div></section>
 <p class="v22-note">Illustrative values for interface testing only. Actual calculations require verified historical NAV data and precise date handling.</p></div>`;
}
function v22ResultRows(r){return [['Current Value',inr(r.value),''],['Absolute Gain',inr(r.gain),''],['Total Return','+'+r.ret.toFixed(1)+'%','pos'],['CAGR',r.cagr.toFixed(1)+'%','pos'],['Holding Period',r.yrs.toFixed(1)+' years','']].map(x=>`<div><span>${x[0]}</span><b class="${x[2]}">${x[1]}</b></div>`).join('')}
function v22InsightText(r,d){return `A ${inr(v22WhatIf.amount)} investment on ${d.getDate()} ${V22_MON[d.getMonth()]} ${d.getFullYear()} would have grown to ${inr(r.value)} today — a ${r.cagr.toFixed(1)}% CAGR over ${r.yrs.toFixed(1)} years.`}
function runCalc(){
 const amt=v22Num(document.getElementById('calc-amount')?.value),d=v22ParseDate(document.getElementById('calc-date')?.value);
 if(!d||d>V22_ASOF||d<new Date(2000,0,1)){notify('Enter a valid past date as dd/mm/yyyy.');return}
 if(!amt||amt<500){notify('Enter an amount of at least ₹500.');return}
 v22WhatIf={date:v22FmtDate(d),amount:amt};const r=v22Lump(amt,d);
 document.getElementById('v22-journey').innerHTML=v22JourneyChart(r,amt);
 document.getElementById('v22-results').innerHTML=v22ResultRows(r);
 document.getElementById('v22-insight-text').textContent=v22InsightText(r,d);
 document.querySelectorAll('[data-v22-amount]').forEach(b=>b.classList.toggle('active',Number(b.dataset.v22Amount)===amt));
}

/* ======================================================================
   MOD Alpha SIP vs Traditional SIP  (ref 06)
   ====================================================================== */
let v22SipState={amount:10000,start:'01/01/2021',end:'01/01/2026'};
function v22SipChart(r,start,end){
 const yMax=Math.max(4,Math.ceil(r.mod/1e5/4)*4)*1e5,ticks=[0,1,2,3].map(i=>i*yMax/3);
 const y0=start.getFullYear(),y1=end.getFullYear(),years=Array.from({length:6},(_,i)=>String(Math.round(y0+(y1-y0)*i/5)));
 return v22Chart({w:720,h:300,pad:{l:50,r:120,t:22,b:40},yMin:0,yMax,yTicks:ticks,yFmt:v=>v?'₹'+Math.round(v/1e5)+'L':'0',xLabels:years,axisY:true,label:'Illustrative SIP portfolio comparison',
  series:[{values:r.modPath,color:'#2ed3f5',stops:[[0,'#2ed3f5'],[1,'#38bdf8']],width:3.4,dots:true,r:6,glow:'#22d3ee',dotColor:'#54e1ff'},{values:r.tradPath,color:'#b65cf6',stops:[[0,'#a855f7'],[1,'#c084fc']],width:3.4,dots:true,r:6,glow:'#a855f7',dotColor:'#c26bff'}],
  overlays:[{at:[0,-1],cls:'v22-badge cyan',html:inr(r.mod)},{at:[1,-1],cls:'v22-badge purple',html:inr(r.trad)}]});
}
function v22SipResults(r){return `<div><span>Total Invested</span><b>${inr(r.invested)}</b></div><div><span>MOD Alpha SIP<br>Final Value</span><b>${inr(r.mod)}</b></div><div><span>Traditional SIP<br>Final Value</span><b>${inr(r.trad)}</b></div><div class="extra"><span>Additional Returns</span><b class="pos">+${inr(r.extra)}<small>(+${r.pct.toFixed(1)}% higher returns)</small></b></div>`}
function sipCompare(){
 const s=v22ParseDate(v22SipState.start),e=v22ParseDate(v22SipState.end),r=v22Sip(v22SipState.amount,s,e);
 return `<div class="v22 v22-sip">
 <header class="v22-title"><h1>MOD Alpha SIP vs Traditional SIP</h1><p>See how AI-selected investment dates can potentially improve your SIP returns.</p></header>
 <section class="v22-three"><article class="v22-card v22-input-card"><label class="v22-label" for="sip-amount">Monthly SIP Amount</label><div class="v22-field"><span class="v22-rs">₹</span><input id="sip-amount" value="${v22SipState.amount.toLocaleString('en-IN')}" inputmode="numeric" aria-label="Monthly SIP amount"></div><div class="v22-opts">${[[5000,'5K'],[10000,'10K'],[25000,'25K'],[50000,'50K']].map(x=>`<button type="button" data-v22-sip="${x[0]}" class="${v22SipState.amount===x[0]?'active':''}">${x[1]}</button>`).join('')}</div></article>
 <article class="v22-card v22-input-card"><label class="v22-label" for="sip-start">Start Date</label>${v22DateField('sip-start',v22SipState.start,'')}</article>
 <article class="v22-card v22-input-card"><label class="v22-label" for="sip-end">End Date</label>${v22DateField('sip-end',v22SipState.end,'')}</article></section>
 <section class="v22-sip-grid"><article class="v22-card"><div class="v22-card-head"><h2>Portfolio Value Comparison</h2><div class="v22-legend"><span><i style="--c:#2ed3f5"></i>MOD Alpha SIP (AI Dates)</span><span><i style="--c:#b65cf6"></i>Traditional SIP (Fixed Date)</span></div></div><div id="v22-sip-chart">${v22SipChart(r,s,e)}</div></article>
 <article class="v22-card v22-results"><h2 class="v22-h2 sm">Final Results</h2><div class="v22-result-box tall" id="v22-sip-results">${v22SipResults(r)}</div></article></section>
 <p class="v22-note">Illustrative simulation only · Same contribution assumptions · No future-return claim. Mod Alpha does not place investment orders.</p></div>`;
}
function runSip(){
 const a=v22Num(document.getElementById('sip-amount')?.value),s=v22ParseDate(document.getElementById('sip-start')?.value),e=v22ParseDate(document.getElementById('sip-end')?.value);
 if(!a||a<500){notify('Enter a monthly SIP amount of at least ₹500.');return}
 if(!s||!e||e<=s){notify('Enter a valid start and end date (dd/mm/yyyy), end after start.');return}
 v22SipState={amount:a,start:v22FmtDate(s),end:v22FmtDate(e)};const r=v22Sip(a,s,e);
 document.getElementById('v22-sip-chart').innerHTML=v22SipChart(r,s,e);document.getElementById('v22-sip-results').innerHTML=v22SipResults(r);
 document.querySelectorAll('[data-v22-sip]').forEach(b=>b.classList.toggle('active',Number(b.dataset.v22Sip)===a));
}

/* ======================================================================
   User dashboard  (ref 07)
   ====================================================================== */
let v22DashPeriod='5Y';
function v22DashChart(period){
 const n=18,mk=(seed,end,amp)=>v22Seeded(seed,n,-10,end,amp);
 const scale={'1Y':.35,'3Y':.65,'5Y':1,'10Y':1.15}[period]||1;
 const s1=mk(7,52*scale,7),s2=mk(13,41*scale,5),s3=mk(29,30*scale,4);
 const labels={'1Y':['Nov 25','Jan','Mar','May','Jul','Sep'],'3Y':['2023','2024','2025','2026'],'5Y':['2021','2022','2023','2024','2025','2026'],'10Y':['2016','2018','2020','2022','2024','2026']}[period];
 const tip=`<small>${period==='1Y'?'Oct 2026':'Dec 2026'}</small>${[['#2f8bff','Quant Small Cap',(48.2*scale)],['#f5b13d','SBI Contra',(36.1*scale)],['#d946ef','HDFC Mid Cap',(28.9*scale)]].map(x=>`<div><i style="--c:${x[0]}"></i><span>${x[1]}</span><b>${x[2].toFixed(1)}%</b></div>`).join('')}`;
 return v22Chart({w:580,h:330,pad:{l:50,r:20,t:20,b:40},yMin:-20,yMax:60,yTicks:[-20,0,20,40,60],yFmt:v=>v+'%',xLabels:labels,xPos:labels.map((_,i)=>50+i*(580-50-20-60)/(labels.length-1)),label:'Illustrative top fund performance',
  series:[{values:s1,color:'#2f8bff',area:.45,width:3,dots:true,r:4.2,endDot:7,glow:'#2f8bff'},{values:s2,color:'#14d9c5',width:3,dots:true,r:4.2,endDot:7,glow:'#14d9c5'},{values:s3,color:'#d946ef',width:3,dots:true,r:4.2,endDot:7,glow:'#d946ef'}],
  overlays:[{x:300,y:14,cls:'v22-multi-tip',html:tip}]});
}
let v22CalMonth={y:2026,m:9};
function v22SipFor(y,m){return y===2026&&m===9?{day:12,uplift:2.8,alts:[[5,1.6],[20,1.4],[28,1.2]]}:null}
function v22UserKpis(){return [['trophy','gold','Top Performing Fund','(5Y Returns)','32.4%','Quant Small Cap Fund','Equity'],['calendar','violet','Best AI Investment Date','This Month','12th','+2.8% vs fixed SIP',''],['bars','blue','Average Category Return','(Small Cap)','24.1%','5Y CAGR',''],['db','teal','Funds Tracked','In Our Database','8,500+','Mutual Funds','']]}
function v22FundSpark(f,i){return v22Seeded(f.id.charCodeAt(0)+f.id.charCodeAt(2)+i,12,6,22,5)}
/* ---- SIP reminder: pick your own day (subscribers) or keep Mod Alpha's date ---- */
let v22PickDay=null;
function v22ReminderState(){return (window.MA_REMINDER&&MA_REMINDER.get())||{mode:'modalpha',day:null}}
function v22ReminderCard(SP,MN){
 const y=v22CalMonth.y,pick=v22PickDay&&v22PickDay!==SP.day?v22PickDay:null,alt=pick&&SP.alts.find(a=>a[0]===pick),st=v22ReminderState();
 const day=pick||SP.day,wd=new Date(y,v22CalMonth.m,day).toLocaleDateString('en-GB',{weekday:'long'});
 const now=`<p class="v22-rem-now">${ic('bell')}<span>Reminder: <b>${st.mode==='custom'&&st.day?`day ${st.day} of every month`:'Mod Alpha date'}</b></span></p>`;
 const tag=pick?'<em class="mine">Your date</em>':'<em>Best Date</em>';
 const gain=pick?(alt?`<strong class="v22-best-gain">+${alt[1]}%<small>vs. fixed date SIP</small></strong>`:`<p class="v22-best-sub">Not a Mod Alpha recommended date</p>`):`<strong class="v22-best-gain">+${SP.uplift}%<small>vs. fixed date SIP</small></strong>`;
 return `<div class="v22-best ${pick?'is-custom':''}"><div class="v22-best-info"><div class="v22-best-top">${tag}</div>
  <div class="v22-best-day"><b>${day}</b><div><span>${MN} ${y}</span><small>${wd}</small></div></div>${gain}</div>
  <div class="v22-best-act"><button type="button" class="v22-grad-btn" data-action="set-reminder"${pick?` data-day="${pick}"`:''}>Set Reminder</button>${now}${pick?`<button type="button" class="v22-link-btn" data-v22-pick-reset>Use Mod Alpha date (${SP.day} ${MN})</button>`:''}</div></div>`;
}
function v22CalFooter(SP,MN){
 const cls=['pink','green','purple'];
 return `<div class="v22-cal-foot"><div class="v22-cal-foot-head"><b>Other good dates</b><span>Tap a day to choose your own reminder date</span></div>
  <div class="v22-alt-chips">${SP.alts.map((a,i)=>`<button type="button" class="v22-alt-chip ${cls[i]}${v22PickDay===a[0]?' on':''}" data-v22-pick="${a[0]}"><i></i><span>${a[0]} ${MN}</span><b>+${a[1]}%</b></button>`).join('')}</div>
  <div class="v22-cal-legend"><span><i class="lg-best"></i>Best</span><span><i class="lg-good"></i>Good</span><span><i class="lg-pick"></i>Your pick</span></div></div>`;
}
function v22Calendar(){
 const {y,m}=v22CalMonth,first=new Date(y,m,1).getDay(),days=new Date(y,m+1,0).getDate(),prev=new Date(y,m,0).getDate();
 const sp=v22SipFor(y,m),isOct=!!sp,good={};if(sp)sp.alts.forEach((a,i)=>good[a[0]]=['pink','green','purple'][i]);
 const cells=[];for(let i=0;i<42;i++){const d=i-first+1;if(d<1)cells.push(`<span class="mute">${prev+d}</span>`);else if(d>days)cells.push(`<span class="mute">${d-days}</span>`);else cells.push(`<span role="button" tabindex="0" data-v22-pick="${d}" aria-label="${d} ${V22_MON[m]} ${y}" class="${isOct&&d===sp.day?'sel':isOct&&good[d]?'good '+good[d]:''}${v22PickDay===d&&!(isOct&&d===sp.day)?' pick':''}">${d}</span>`)}
 return `<div class="v22-cal"><div class="v22-cal-week">${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(x=>`<span>${x}</span>`).join('')}</div><div class="v22-cal-days">${cells.join('')}</div></div>`;
}
function userOverview(){
 const lp=v22Lump(100000,new Date(2021,0,15)),sp=v22Sip(10000,new Date(2021,0,1),new Date(2026,0,1));
 const monthName=new Date(v22CalMonth.y,v22CalMonth.m,1).toLocaleString('en-GB',{month:'long',year:'numeric'});
 const K=v22UserKpis(),SP=v22SipFor(v22CalMonth.y,v22CalMonth.m),MN=V22_MON[v22CalMonth.m];
 return `<div class="v22 v22-dash">
 <section class="v22-welcome"><div><h1>Welcome back, ${esc(currentUser.name)} 👋</h1><p>Get AI-powered insights to make smarter SIP investment decisions.</p></div></section>
 <section class="v22-kpis">${K.map(k=>`<article><span class="v22-tile ${k[1]}">${ic(k[0])}</span><div class="v22-kpi-txt"><small>${k[2]} <em>${k[3]}</em></small><b class="v22-kpi-val">${k[4]}<span>${k[5]}</span></b></div></article>`).join('')}</section>
 <section class="v22-dash-top">
  <article class="v22-card v22-perf-card"><div class="v22-card-head"><div><h2>Top Performing Mutual Funds</h2><p>Compare historical returns and find the best performing funds</p></div>${v22Pills(['1Y','3Y','5Y','10Y'],v22DashPeriod,'data-v22-dash')}</div><div id="v22-dash-chart">${v22DashChart(v22DashPeriod)}</div></article>
  <article class="v22-card v22-cal-card"><div class="v22-card-head"><h2>AI Recommended SIP Dates <span class="v22-i" title="Common reminder date published for all mutual funds">${ic('info')}</span></h2><div class="v22-month"><button type="button" data-v22-month="-1" aria-label="Previous month">${ic('chevL')}</button><b>${monthName}</b><button type="button" data-v22-month="1" aria-label="Next month">${ic('chevR')}</button></div></div>
  <div class="v22-cal-wrap"><div class="v22-cal-main">${v22Calendar()}${SP?v22CalFooter(SP,MN):''}</div><div class="v22-cal-side">${SP?v22ReminderCard(SP,MN):`<div class="v22-best"><p>No SIP date has been published for this month yet.</p></div>`}</div></div></article>
 </section>
 <section class="v22-dash-bottom">
  <article class="v22-card v22-mini-whatif"><h2 class="v22-h2">What if you had invested on this date?</h2><p class="v22-sub">See how much your investment would be worth if you had invested at a different time.</p>
   <div class="v22-mini-inputs"><div class="v22-mini-box"><label class="v22-label" for="quick-date">Investment Date</label>${v22DateField('quick-date','15/01/2021','search')}<div class="v22-opts sm">${[['5','5Y'],['3','3Y'],['1','1Y'],['custom','Custom']].map((x,i)=>`<button type="button" data-v22-qpreset="${x[0]}" class="${i===0?'active':''}">${x[1]}</button>`).join('')}</div></div>
   <div class="v22-mini-box"><label class="v22-label" for="quick-amount">Investment Amount</label><div class="v22-field"><span class="v22-rs">₹</span><input id="quick-amount" value="1,00,000" inputmode="numeric"></div><div class="v22-opts sm">${[[10000,'10K'],[50000,'50K'],[100000,'1L'],[500000,'5L']].map(x=>`<button type="button" data-v22-qamount="${x[0]}" class="${x[0]===100000?'active':''}">${x[1]}</button>`).join('')}</div></div></div>
   <div class="v22-est" id="v22-est">${v22EstHTML(lp)}</div>
   <button type="button" class="v22-grad-btn wide" data-action="v22-quick-calc">Run Calculation ${ic('arrowR')}</button></article>
  <article class="v22-card v22-mini-sip"><h2 class="v22-h2">MOD Alpha vs Traditional SIP</h2><p class="v22-sub">See how AI-selected dates can potentially improve your SIP returns.</p><div class="v22-legend left"><span><i style="--c:#2ed3f5"></i>MOD Alpha (AI Dates)</span><span><i style="--c:#b65cf6"></i>Traditional SIP (Fixed Date)</span></div>
   ${v22Chart({w:420,h:240,pad:{l:40,r:96,t:18,b:34},yMin:0,yMax:12e5,yTicks:[0,3e5,6e5,9e5,12e5],yFmt:v=>v?'₹'+v/1e5+'L':'0',xLabels:['2021','2022','2023','2024','2025','2026'],axisY:true,label:'Illustrative SIP comparison',series:[{values:sp.modPath,color:'#2ed3f5',width:4.5,dots:true,r:8,glow:'#22d3ee',dotColor:'#54e1ff'},{values:sp.tradPath,color:'#b65cf6',width:4.5,dots:true,r:8,glow:'#a855f7',dotColor:'#c26bff'}],overlays:[{at:[0,-1],cls:'v22-badge cyan lg',html:inr(sp.mod)},{at:[1,-1],cls:'v22-badge purple lg',html:inr(sp.trad)}]})}
   <div class="v22-stat3"><div><b class="pos">+${sp.pct.toFixed(1)}%</b><small class="pos">Higher returns<br>with MOD Alpha</small></div><div><b>${inr(sp.extra)}</b><small class="pos">Extra value<br>created</small></div><div><b>${sp.yrs.toFixed(1)} years</b><small>Same time period</small></div></div>
   <button type="button" class="v22-grad-btn wide" data-go="sip">Try Different Dates ${ic('arrowR')}</button></article>
  <article class="v22-card v22-insights"><div class="v22-card-head"><h2>Latest AI Insights</h2><a href="#/user/chat">View All</a></div><div class="v22-ins-list">
   ${[['trend','blue','Small Cap Funds Showing Strong Momentum','3 hours ago','Small cap funds have outperformed mid and large cap funds by 6.2% over the last 12 months. AI suggests continuing SIPs in top quartile funds.'],['calendar','violet','Best SIP Date for October','5 hours ago','Based on historical analysis, 12th October has the highest probability of better returns (2.8% higher vs fixed date).'],['bulb','gold','New Fund Opportunity','1 day ago','A new mid cap fund has shown strong risk-adjusted returns. AI recommends considering it for long-term SIP.'],['bell','amber','Market Volatility Insights','2 days ago','Current market volatility may present a good opportunity for phased investments in quality large cap funds.']].map(x=>`<div class="v22-ins"><span class="v22-tile ${x[1]}">${ic(x[0])}</span><div><div class="v22-ins-top"><b>${x[2]}</b><small>${x[3]}</small></div><p>${x[4]}</p></div></div>`).join('')}</div>
  </article>
 </section>
 <p class="v22-note">Sample insights and figures are illustrative test data, not investment advice or live market data.</p></div>`;
}
function v22EstHTML(r){return `<div class="v22-est-main"><small>Estimated Value</small><b>${inr(r.value)}</b></div><div><small>Total Returns</small><b class="pos">+${r.ret.toFixed(1)}%</b></div><div><small>CAGR</small><b class="pos">${r.cagr.toFixed(1)}%</b></div><div class="sep"><small>Time Period</small><b>${r.yrs.toFixed(1)} years</b></div>${v22EstBars(r)}`}
function v22EstBars(r){const inv=r.value/(1+r.ret/100),w=Math.max(6,Math.min(100,inv/r.value*100));return `<div class="v22-est-bars" aria-hidden="true"><div><span>Invested</span><i style="width:${w.toFixed(1)}%"></i><b>${inr(Math.round(inv))}</b></div><div><span>Value today</span><i class="now" style="width:100%"></i><b>${inr(r.value)}</b></div></div>`}

/* ======================================================================
   Login / Signup  (ref 08)
   ====================================================================== */
function renderAuth(){
 const signup=authMode==='signup',mobile=maAuthMethod==='mobile';
 app.innerHTML=`${topbar(true)}<main class="v22 v22-auth"><div class="v22-auth-bg" aria-hidden="true">${v22NetworkBg()}</div><section class="v22-auth-card">
 <div class="v22-auth-brand">${v22Mark(36)}<b>Mod Alpha</b></div>
 <h1>${signup?'Create Account':'Welcome Back'}</h1><p>${signup?'Start your AI-powered investment insights':'Continue to your AI-powered investment insights'}</p>
 <div class="v22-seg" role="tablist"><button type="button" class="${!mobile?'active':''}" data-auth-method="email">Email</button><button type="button" class="${mobile?'active':''}" data-auth-method="mobile">Mobile</button></div>
 <form id="auth-form" novalidate>
  ${signup?`<label class="v22-auth-in">${ic('user')}<input name="name" placeholder="Full name" required autocomplete="name"></label>`:''}
  <label class="v22-auth-in">${ic(mobile?'msg':'user')}<input name="email" type="${mobile?'tel':'email'}" placeholder="${mobile?'+91 98765 43210':'you@example.com'}" required autocomplete="${mobile?'tel':'email'}"></label>
  <label class="v22-auth-in">${ic('lock')}<input name="password" id="v22-pass" type="password" placeholder="••••••••••" minlength="6" required autocomplete="${signup?'new-password':'current-password'}"><button type="button" class="v22-eye" data-v22-eye aria-label="Show password">${ic('eye')}</button></label>
  ${signup?`<label class="v22-auth-in">${ic('lock')}<input name="confirm" type="password" placeholder="Confirm password" required autocomplete="new-password"></label>`:''}
  <div class="v22-auth-opts"><label><input type="checkbox" checked> Remember me</label><button type="button" data-action="forgot">Forgot Password?</button></div>
  <div id="form-error" class="v22-err" role="alert"></div>
  <button class="v22-grad-btn wide lg" type="submit">${signup?'Create Account':'Login'} ${ic('arrowR')}</button>
 </form>
 <div class="v22-or"><span>or continue with</span></div>
 <div class="v22-social"><button type="button" data-v22-social="Google"><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="#4285F4" d="M22.6 12.3c0-.8-.1-1.5-.2-2.3H12v4.3h6a5.1 5.1 0 0 1-2.2 3.4v2.8h3.6c2-1.9 3.2-4.7 3.2-8.2z"/><path fill="#34A853" d="M12 23c3 0 5.5-1 7.4-2.7l-3.6-2.8c-1 .7-2.3 1.1-3.8 1.1-2.9 0-5.4-2-6.3-4.6H2v2.9A11 11 0 0 0 12 23z"/><path fill="#FBBC05" d="M5.7 14c-.2-.7-.4-1.4-.4-2s.1-1.4.4-2V7.1H2a11 11 0 0 0 0 9.8z"/><path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.2-3.2A11 11 0 0 0 2 7.1L5.7 10c.9-2.6 3.4-4.6 6.3-4.6z"/></svg>Google</button><button type="button" data-v22-social="Apple"><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="#fff" d="M16.4 12.6c0-2.6 2.1-3.8 2.2-3.9-1.2-1.8-3.1-2-3.7-2-1.6-.2-3.1.9-3.9.9s-2-.9-3.4-.9a5 5 0 0 0-4.2 2.6c-1.8 3.1-.5 7.7 1.3 10.2.9 1.2 1.9 2.6 3.2 2.6 1.3-.1 1.8-.8 3.3-.8s2 .8 3.4.8 2.2-1.3 3.1-2.5c1-1.4 1.4-2.8 1.4-2.9 0 0-2.7-1-2.7-4.1zM13.9 5c.7-.9 1.2-2 1-3.2-1 0-2.3.7-3 1.5-.6.7-1.2 1.9-1 3.1 1.1.1 2.3-.6 3-1.4z"/></svg>Apple</button></div>
 <div class="v22-auth-foot">${signup?`Already have an account? <button type="button" data-mode="login">Log in</button>`:`New to Mod Alpha? <button type="button" data-mode="signup">Create an account</button>`}</div>
 <div class="v22-auth-guest"><a href="#/guest/user">Explore as User</a><span>·</span><a href="#/guest/admin">Explore as Admin</a></div>
 </section></main>${publicFooter()}`;
 app.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{authMode=b.dataset.mode==='signup'?'signup':'login';history.replaceState(null,'','#/'+authMode);renderAuth()});
 app.querySelectorAll('[data-auth-method]').forEach(b=>b.onclick=()=>{maAuthMethod=b.dataset.authMethod;renderAuth()});
 app.querySelector('[data-v22-eye]').onclick=e=>{const p=document.getElementById('v22-pass');p.type=p.type==='password'?'text':'password';e.currentTarget.classList.toggle('on',p.type==='text')};
 app.querySelector('[data-action="forgot"]').onclick=()=>notify('Password reset will be connected during authentication integration.');
 app.querySelectorAll('[data-v22-social]').forEach(b=>b.onclick=()=>notify(`${b.dataset.v22Social} sign-in is not connected in this prototype.`));
 const form=document.getElementById('auth-form');form.onsubmit=e=>{e.preventDefault();const fd=new FormData(form),err=document.getElementById('form-error');const id=String(fd.get('email')||'').trim();
  if(!id){err.textContent=mobile?'Enter your mobile number.':'Enter your email address.';return}
  if(!mobile&&!/^\S+@\S+\.\S+$/.test(id)){err.textContent='Enter a valid email address.';return}
  if(mobile&&id.replace(/\D/g,'').length<10){err.textContent='Enter a valid 10-digit mobile number.';return}
  if(String(fd.get('password')||'').length<6){err.textContent='Password must be at least 6 characters.';return}
  if(signup&&fd.get('password')!==fd.get('confirm')){err.textContent='Passwords do not match.';return}
  currentUser={name:fd.get('name')||(mobile?'Investor':id.split('@')[0]),email:id};notify('Demo sign-in successful');go('user/overview')};
}
function v22NetworkBg(){
 let s='<svg viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice"><defs><radialGradient id="nbg1" cx="15%" cy="70%" r="45%"><stop offset="0" stop-color="#1d4ed8" stop-opacity=".45"/><stop offset="1" stop-color="#1d4ed8" stop-opacity="0"/></radialGradient><radialGradient id="nbg2" cx="88%" cy="30%" r="40%"><stop offset="0" stop-color="#4f46e5" stop-opacity=".35"/><stop offset="1" stop-color="#4f46e5" stop-opacity="0"/></radialGradient></defs><rect width="1440" height="900" fill="url(#nbg1)"/><rect width="1440" height="900" fill="url(#nbg2)"/>';
 for(let k=0;k<16;k++){const y=520+k*14,a=60+k*6;s+=`<path d="M-20 ${y} C 300 ${y-a}, 520 ${y+a*.8}, 820 ${y-a*.3} S 1250 ${y-a*1.1}, 1460 ${y-40}" fill="none" stroke="${k%2?'#3b82f6':'#6366f1'}" stroke-opacity="${.08+k*.012}" stroke-width="1"/>`}
 let x=987654;const r=()=>{x=(x*16807)%2147483647;return x/2147483647};
 for(let k=0;k<70;k++){const cx=r()*1440,cy=r()*900,rad=r()*1.8+.4;s+=`<circle cx="${cx.toFixed(0)}" cy="${cy.toFixed(0)}" r="${rad.toFixed(1)}" fill="#7cc4ff" fill-opacity="${(.25+r()*.6).toFixed(2)}"/>`}
 return s+'</svg>';
}

/* ======================================================================
   Public landing: hero (ref 09) + How Mod Alpha Works (ref 11)
   ====================================================================== */
function v22Hero(){
 const pts=[[0,470],[60,452],[110,460],[160,430],[210,438],[260,402],[300,410],[350,378],[400,384],[440,350],[480,320],[520,330],[560,296],[600,270],[640,286],[690,232],[740,210],[780,180],[830,150],[880,120]];
 const line=pts.map((p,i)=>(i?'L':'M')+p.join(' ')).join(' ');
 let beams='';pts.forEach((p,i)=>{if(i%1===0)beams+=`<line x1="${p[0]}" y1="${p[1]}" x2="${p[0]}" y2="560" stroke="url(#hb)" stroke-width="${i%3?.5:.9}" opacity="${.25+i/50}"/>`});
 let waves='';for(let k=0;k<12;k++){const y=470+k*10;waves+=`<path d="M-200 ${y+20} C 0 ${y-40}, 200 ${y+70}, 420 ${y} S 760 ${y-60}, 980 ${y+10}" fill="none" stroke="${k%3?'#3b6cff':'#7c3aed'}" stroke-opacity="${.12+k*.025}" stroke-width=".7"/>`}
 return `<section class="v22 v22-hero" id="why-mod-alpha">
 <div class="v22-hero-copy"><span class="v22-hero-badge">${ic('crown')} AI-Powered SIP Intelligence</span>
 <h1>Invest at the<br><span class="g-cyan">Right Time</span> with <span class="g-violet">AI</span></h1>
 <p>Mod Alpha analyzes 10+ years of mutual fund data to find the statistically best dates to invest — so your money works harder, every single month.</p>
 <div class="v22-hero-actions"><a class="v22-grad-btn lg" href="#/signup">Get Started ${ic('arrowR')}</a><a class="v22-ghost-btn lg" href="#how-it-works" data-scroll-inline>${ic('play')} See How It Works</a></div>
 <div class="v22-hero-stats">${[["users","12,500+","Users","c1"],["layers","8,500+","Funds Tracked","c2"],["percent","15.7%","Avg. Extra Returns","c3"],["star","4.8/5","User Rating","c4"]].map(x=>`<div class="v22-stat-tile ${x[3]}"><span class="v22-stat-ic">${ic(x[0])}</span><div><b>${x[1]}</b><small>${x[2]}</small></div></div>`).join('')}</div></div>
 <div class="v22-hero-art" aria-hidden="true"><svg viewBox="0 0 900 600" preserveAspectRatio="xMaxYMid meet"><defs><linearGradient id="hl" x1="0" x2="1"><stop offset="0" stop-color="#2563eb"/><stop offset=".6" stop-color="#3b82f6"/><stop offset="1" stop-color="#60a5fa"/></linearGradient><linearGradient id="hb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#60a5fa" stop-opacity=".9"/><stop offset="1" stop-color="#1e3a8a" stop-opacity="0"/></linearGradient><linearGradient id="ha" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3b82f6" stop-opacity=".45"/><stop offset="1" stop-color="#1e1b6b" stop-opacity="0"/></linearGradient><radialGradient id="hg" cx="70%" cy="40%" r="55%"><stop offset="0" stop-color="#4338ca" stop-opacity=".35"/><stop offset="1" stop-color="#0b1022" stop-opacity="0"/></radialGradient></defs><rect width="900" height="600" fill="url(#hg)"/>${waves}<path d="${line} L880 560 L0 560Z" fill="url(#ha)"/>${beams}<path class="v22-hero-line" d="${line}" fill="none" stroke="url(#hl)" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"/>${pts.filter((_,i)=>i%2===1||i===pts.length-1).map(p=>`<circle cx="${p[0]}" cy="${p[1]}" r="3" fill="#67e8f9" class="v22-node"/>`).join('')}</svg>
 <div class="v22-float f1"><b>${ic('trend')} +18.5%</b><small>Higher returns<br>vs fixed SIP</small></div>
 <div class="v22-float f2"><span class="v22-float-ic">${ic('target')}</span><span>AI suggests<br>best date to invest</span></div>
 <div class="v22-robot">${v22Robot()}</div></div>
 </section>`;
}
function v22Robot(){return `<svg viewBox="0 0 220 260" aria-hidden="true"><defs><linearGradient id="rbh" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".6" stop-color="#cfe0ff"/><stop offset="1" stop-color="#7f9cf5"/></linearGradient><linearGradient id="rbv" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0d1838"/><stop offset="1" stop-color="#050a1c"/></linearGradient><radialGradient id="rbe"><stop offset="0" stop-color="#e0fbff"/><stop offset=".45" stop-color="#22d3ee"/><stop offset="1" stop-color="#22d3ee" stop-opacity="0"/></radialGradient></defs><path d="M40 260c0-50 30-80 70-80s70 30 70 80z" fill="url(#rbh)" opacity=".95"/><rect x="92" y="150" width="36" height="34" rx="10" fill="#8aa6f0"/><rect x="18" y="20" width="184" height="150" rx="58" fill="url(#rbh)"/><rect x="8" y="76" width="20" height="44" rx="10" fill="#9fb6f5"/><rect x="192" y="76" width="20" height="44" rx="10" fill="#9fb6f5"/><rect x="38" y="44" width="144" height="104" rx="44" fill="url(#rbv)"/><circle cx="82" cy="96" r="26" fill="url(#rbe)"/><circle cx="138" cy="96" r="26" fill="url(#rbe)"/><circle cx="82" cy="96" r="12" fill="#a5f3fc" class="v22-eye"/><circle cx="138" cy="96" r="12" fill="#a5f3fc" class="v22-eye"/></svg>`}
function flowLarge(){
 const inputs=[['trend','#f43f5e','Mutual Fund NAVs','5+ years of data'],['bolt','#facc15','Market Volatility','Rolling analysis'],['calCheck','#22c55e','Market Holidays','Trading calendar'],['db','#8b5cf6','Fund Categories','Equity, Debt, Hybrid']];
 const steps=[['Market Data<br>Collection','We ingest historical NAV data, market trends, and key factors.'],['AI Analysis Engine','Our AI analyzes patterns, volatility, and historical behavior to identify better investment dates.'],['Finds the Best Date','Each month, we identify the statistically strongest investment date based on multiple factors.'],['Personalized<br>Notifications','We notify you before the recommended date each month.'],['You Invest Smarter','You invest on the recommended date through your broker app — and stay ahead consistently.']];
 const head=i=>`<div class="v22-step-head"><span class="v22-step-no">0${i+1}</span><div><h3>${steps[i][0]}</h3><p>${steps[i][1]}</p></div></div>`;
 let fibers='';for(let k=0;k<14;k++){const y0=20+k*(260/13),y1=150+(k-6.5)*5;{const d=`M0 ${y0.toFixed(0)} C 60 ${y0.toFixed(0)}, 70 ${y1.toFixed(0)}, 130 ${y1.toFixed(0)}`;fibers+=`<path class="v22-fiber-base" d="${d}"/><path class="v22-fiber" style="--d:${(k%5)*.35}s" d="${d}"/>`}}
 let fdots='';[[0,56],[0,128],[0,201],[0,272],[32,64],[38,140],[30,210],[46,250],[70,100],[74,186]].forEach((p,k)=>{fdots+=`<circle cx="${p[0]+8}" cy="${p[1]}" r="${k<4?4.5:3}" class="v22-fdot" style="--d:${k*.2}s"/>`});
 let outf='';for(let k=0;k<7;k++){const y0=150+(k-3)*6,y1=40+k*36;{const d=`M0 ${y0} C 30 ${y0}, 30 ${y1}, 70 ${y1}`;outf+=`<path class="v22-fiber-base out" d="${d}"/><path class="v22-fiber out" style="--d:${k*.3}s" d="${d}"/>`}}
 const arrow=`<svg class="v22-arrow" viewBox="0 0 90 40" aria-hidden="true"><defs><linearGradient id="arG" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="90" y2="0"><stop offset="0" stop-color="#3b82f6" stop-opacity=".15"/><stop offset="1" stop-color="#38bdf8"/></linearGradient></defs><path d="M2 20H78" stroke="url(#arG)" stroke-width="5" stroke-linecap="round"/><path class="v22-arrow-flow" d="M2 20H78"/><path d="M68 9 84 20 68 31" fill="none" stroke="#5cc8ff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
 return `<section class="v22 v22-how" id="how-it-works" data-v22-flow>
 <div class="v22-how-head"><span class="v22-how-badge">${ic('spark')} AI POWERED</span><h2>How <span class="g-blue">Mod Alpha</span> Works</h2><p>We analyze real market data, find the statistically best SIP date each month,<br>and notify you — so you can invest smarter, effortlessly.</p></div>
 <div class="v22-flow">
  <div class="v22-stage" style="--i:0">${head(0)}<div class="v22-vis"><div class="v22-panel v22-inputs">${inputs.map((x,i)=>`<div class="v22-input"><span class="v22-in-ic" style="--c:${x[1]}">${ic(x[0])}</span><div><b class="${i===3?'blue':''}">${x[2]}</b><small>${x[3]}</small></div></div>`).join('')}</div></div></div>
  <div class="v22-conn fibers" style="--i:0"><svg viewBox="0 0 130 300" preserveAspectRatio="none" aria-hidden="true">${fibers}${fdots}</svg></div>
  <div class="v22-stage engine" style="--i:1">${head(1)}<div class="v22-vis"><div class="v22-engine">
   <span class="v22-chip tl">${ic('trend')}<b>Pattern<br>Analysis</b></span><span class="v22-chip tr">${ic('bars')}<b>Volatility<br>Windows</b></span>
   <div class="v22-core"><div class="v22-core-glow"></div><span class="v22-core-mark">${v22BrandMark(46)}</span><b>Mod Alpha<br>AI Engine</b></div>
   <span class="v22-chip bl">${ic('clock')}<b>Historical<br>Backtesting</b></span><span class="v22-chip br">${ic('brain')}<b>Multi-Factor<br>Scoring</b></span>
   <svg class="v22-engine-out" viewBox="0 0 70 300" preserveAspectRatio="none" aria-hidden="true">${outf}</svg></div></div></div>
  <div class="v22-conn" style="--i:1">${arrow}</div>
  <div class="v22-stage" style="--i:2">${head(2)}<div class="v22-vis"><div class="v22-panel v22-month-an"><small>MONTHLY ANALYSIS</small>${[['1st','Lower confidence','low'],['5th','Moderate','mid'],['12th','Highest confidence','best'],['18th','Moderate','mid']].map(x=>`<div class="v22-conf ${x[2]}">${x[2]==='best'?`<span class="v22-conf-ic">${ic('target')}</span>`:''}<div><b>${x[0]}</b><small>${x[1]}</small></div></div>`).join('')}</div></div></div>
  <div class="v22-conn" style="--i:2">${arrow}</div>
  <div class="v22-stage" style="--i:3">${head(3)}<div class="v22-vis"><div class="v22-phone-wrap"><div class="v22-phone"><div class="v22-phone-bar"><span>9:41</span><i></i><span class="sig">▪▪▪ ▬</span></div>${ic('lock','v22-phone-lock')}<div class="v22-phone-time">9:41</div><div class="v22-phone-date">Monday, 12 Oct</div></div><span class="v22-phone-bell">${ic('bell')}</span>
   <div class="v22-notif"><span class="v22-notif-logo">${v22Mark(22,'nfM')}</span><div><div class="v22-notif-top"><b>Mod Alpha</b><small>now</small></div><b class="t">Best SIP date this month!</b><p>Our analysis suggests investing on 12th Oct for potentially better long-term returns.</p></div></div>
   <div class="v22-channels">${[['bell','#fbbf24','Push<br>Notification'],['mail','#60a5fa','Email<br>Alert'],['msg','#22d3ee','SMS<br>Reminder']].map(x=>`<div><span style="--c:${x[1]}">${ic(x[0])}</span><small>${x[2]}</small></div>`).join('')}</div></div></div></div>
  <div class="v22-conn" style="--i:3">${arrow}</div>
  <div class="v22-stage" style="--i:4">${head(4)}<div class="v22-vis"><div class="v22-panel v22-outcome"><div class="v22-outcome-chart"><svg viewBox="0 0 320 230" aria-hidden="true"><defs><linearGradient id="ocA" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6366f1" stop-opacity=".45"/><stop offset="1" stop-color="#6366f1" stop-opacity="0"/></linearGradient><linearGradient id="ocL" x1="0" x2="1"><stop offset="0" stop-color="#2563eb"/><stop offset="1" stop-color="#a5b4fc"/></linearGradient></defs><path d="M10 190 L60 168 L100 160 L140 132 L180 120 L215 92 L255 88 L300 40 L300 220 L10 220Z" fill="url(#ocA)"/><path d="M10 205 L60 196 L100 192 L140 180 L180 176 L215 164 L255 160 L300 136" fill="none" stroke="#8b93b8" stroke-width="2" stroke-dasharray="6 6"/>${[[10,205],[60,196],[100,192],[140,180],[180,176],[215,164],[255,160]].map(p=>`<circle cx="${p[0]}" cy="${p[1]}" r="4.5" fill="#8b93b8"/>`).join('')}<path class="v22-out-line" d="M10 190 L60 168 L100 160 L140 132 L180 120 L215 92 L255 88 L300 40" fill="none" stroke="url(#ocL)" stroke-width="4" stroke-linejoin="round"/>${[[10,190],[60,168],[100,160],[140,132],[180,120],[215,92],[255,88]].map(p=>`<circle cx="${p[0]}" cy="${p[1]}" r="6" fill="#38bdf8"/>`).join('')}<circle cx="300" cy="40" r="7" fill="#c4b5fd" class="v22-node"/></svg><span class="v22-oc-label top">With Mod Alpha<br>(Optimized Dates)</span><span class="v22-oc-label fixed">Fixed Date SIP</span></div>
   <div class="v22-oc-foot"><span>${ic('bars')}</span><p><b>Historically better timing</b> can lead to higher long-term returns.</p></div></div></div></div>
 </div>
 <div class="v22-benefits">${[['db','#8b5cf6','Real Market Data','Based on actual historical NAV data',''],['brain','#f43f5e','Advanced AI Analysis','Multi-factor statistical model',''],['target','#2dd4bf','Data-Driven Confidence','Each recommendation comes with confidence scoring','cyan'],['bell','#fbbf24','Timely Notifications','So you never miss the best date','blue'],['shield','#2dd4bf','You Stay in Control','You invest on your own broker app','']].map(x=>`<div><span style="--c:${x[1]}">${ic(x[0])}</span><div><b class="${x[4]}">${x[2]}</b><small>${x[3]}</small></div></div>`).join('')}</div>
 <div class="v22-how-replay"><button type="button" class="v22-ghost-btn" data-action="replay-flow">${ic('refresh')} Replay animation</button><small>High-level explanation only. Proprietary model logic remains internal. Historical analysis does not guarantee future returns.</small></div>
 </section>`;
}
function initFlowAnimation(){
 const root=document.querySelector('[data-v22-flow]');if(!root)return;
 const reduced=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
 const play=()=>{if(reduced)return;root.classList.remove('is-playing');void root.offsetWidth;root.classList.add('is-playing')};
 root._replayFlow=play;
 if(reduced){root.classList.add('is-static');return}
 if('IntersectionObserver'in window){const io=new IntersectionObserver(es=>{if(es.some(e=>e.isIntersecting)){play();io.disconnect()}},{threshold:.15});io.observe(root)}
}
function renderLanding(){
 app.innerHTML=`${topbar(true)}<main class="public-page v22-landing">
<div id="public-activity-toast" class="public-activity-toast" aria-live="polite" aria-atomic="true" hidden><span class="activity-toast-icon">✦</span><div class="activity-toast-copy"><b class="activity-toast-title"></b><small class="activity-toast-time"></small></div><button type="button" class="activity-toast-close" aria-label="Dismiss notification">×</button></div>
${v22Hero()}
<section class="public-features" id="features"><div class="section-center"><div class="eyebrow">THE MOD ALPHA EXPERIENCE</div><h2>Everything you need to understand your mutual funds.</h2><p>Explore funds, review historical performance and understand the monthly SIP date insight.</p></div><div class="feature-grid v22-feature-grid">${[['grid','Explore Mutual Funds','Search and compare mutual fund schemes, categories and historical performance.'],['trend','What If Calculator','Explore hypothetical investment outcomes using historical NAV data.'],['calendar','MOD Alpha SIP','Compare a fixed-date SIP with the platform date-selection approach.'],['spark','AI Insights','Understand fund data and historical patterns in clear language.']].map(x=>`<article class="feature-card"><span>${ic(x[0])}</span><h3>${x[1]}</h3><p>${x[2]}</p></article>`).join('')}</div></section>
${flowLarge()}
<div id="pricing-preview">${pricingSection(true)}</div>
<section class="public-faq" id="faq-preview"><div class="section-center"><div class="eyebrow">NEED TO KNOW MORE?</div><h2>Frequently asked questions</h2></div><div class="faq-preview-grid"><article><h3>Does Mod Alpha place SIP orders?</h3><p>No. Mod Alpha provides insights and reminders. You make investment decisions through your own provider.</p></article><article><h3>Is the recommended date guaranteed?</h3><p>No. Historical analysis does not predict or guarantee future performance.</p></article><article><h3>When is KYC required?</h3><p>Before activating a user's first paid subscription, through an approved verification flow.</p></article></div><div class="center-link"><a href="#/faq">Read all FAQs →</a></div></section>
</main>${publicFooter()}`;
 initFlowAnimation();initPublicActivityToast();
}

/* ======================================================================
   Admin  (ref 10)
   ====================================================================== */
const V22_ADMIN_NAV=[['dashboard','dash','Dashboard'],['users','users','User Management'],['subscriptions','card','Subscriptions'],['sipdate','calCheck','SIP Date Configuration'],['data','db','Data Management',[['data','NAV Data Upload'],['data#funds','Fund Management'],['data#categories','Category Management']]],['methodology','network','AI Models & Insights'],['notifications','bell','Notifications'],['settings','gear','System Settings'],['audit','file','Audit Logs']];
const V22_USER_NAV=[['overview','dash','Overview'],['funds','grid','Explore Funds'],['whatif','trend','What If Calculator'],['sip','calendar','MOD Alpha SIP'],['subscription','crown','Subscription'],['settings','gear','Settings'],['help','help','Help & FAQ']];
let v22DataOpen=true;
function sidebar(role,active){
 const nav=role==='admin'?V22_ADMIN_NAV:V22_USER_NAV;
 return `<aside class="sidebar v22-side"><div class="side-brand">${logo()}</div><div class="side-label">${role==='admin'?'ADMIN CONSOLE':'WORKSPACE'}</div><nav>${nav.map(([id,icon,label,sub])=>sub?`<button type="button" class="nav-link v22-nav-group ${active===id?'active':''}" data-v22-navgroup aria-expanded="${v22DataOpen}">${ic(icon)}<span>${label}</span>${ic(v22DataOpen?'chevUp':'chevDown','caret')}</button><div class="v22-subnav ${v22DataOpen?'open':''}">${sub.map(s=>`<a href="#/${role}/${s[0].split('#')[0]}">${s[1]}</a>`).join('')}</div>`:`<a href="#/${role}/${id}" class="nav-link ${active===id?'active':''}">${ic(icon)}<span>${label}</span></a>`).join('')}</nav><div class="side-bottom">${role==='admin'?`<a class="v22-back" href="#/user/overview">${ic('back')} Back to User View</a>`:(window.MA_API&&MA_API.enabled?'':`<div class="side-demo"><i></i><span><b>Demo mode</b><small>Local sample data</small></span></div>`)}<button type="button" class="logout-btn v22-logout" data-action="logout">${ic('logout')} Log out</button></div></aside>`;
}
function v22AdminKpi(icon,tone,label,val,delta,prev,cmp='vs last month'){const down=String(delta).trim().startsWith('-');return `<article class="v22-akpi"><span class="v22-tile ${tone} lg">${ic(icon)}</span><span class="v22-akpi-ghost">${ic(icon)}</span><div class="v22-akpi-main"><small>${label}</small><b>${val}</b><div class="v22-akpi-delta ${down?'down':'up'}"><em>${ic(down?'trend':'trend')}${delta}</em><span>${cmp}</span></div>${prev?`<small class="v22-akpi-prev">${cmp==='vs last month'?'Last month':'Previous period'}: <b>${prev}</b></small>`:''}</div></article>`}
function adminDashboard(){
 const bars=[90,110,80,120,100,140,95,160,130,150,175,160,190,412,230,150,170,240,210,250,260,230,300,290,330,340,420,350,520,600,560];
 const totals=bars.map((_,i)=>140+i*(680-140)/30+Math.sin(i)*8);
 const subBars=[14,16,18,12,20,15,18,22,20,24,26,24,28,86,30,26,32,34,30,38,36,46,42,52,50,58,62,64,88,96,90].map(v=>v*1.2);
 const rev=subBars.map((_,i)=>18+i*(150-18)/30+Math.cos(i)*3);
 const dayLbl=['1 Oct','5 Oct','10 Oct','15 Oct','20 Oct','25 Oct','31 Oct'],dayPos=(W,l,r)=>[0,4,9,14,19,24,30].map(i=>l+(i+.5)*(W-l-r)/31);
 const signups=[['Rahul Sharma','rahul.s@example.com','26 Oct 2026, 10:24 AM'],['Priya Mehta','+91 98765 43210','26 Oct 2026, 09:12 AM'],['Amit Verma','amit.v@example.com','26 Oct 2026, 08:43 AM'],['Neha Singh','neha.s@example.com','25 Oct 2026, 11:30 PM'],['Vikram Patel','+91 98123 45678','25 Oct 2026, 10:18 PM']];
 const subs=[['Karan Gupta','Pro (Quarterly)','₹499','26 Oct 2026'],['Sneha Iyer','Premium (Yearly)','₹899','26 Oct 2026'],['Rohit Jain','Basic (Monthly)','₹199','25 Oct 2026'],['Pooja Nair','Pro (Quarterly)','₹499','25 Oct 2026'],['Arjun Mehta','Premium (Yearly)','₹899','25 Oct 2026']];
 return `<div class="v22 v22-admin">
 <section class="v22-admin-head"><div><h1>Admin Dashboard</h1><p>Manage users, data, SIP notifications and monitor platform performance.</p></div><button type="button" class="v22-range" data-action="v22-range">01 Oct 2026 - 31 Oct 2026 ${ic('calendar')}</button></section>
 <section class="v22-akpis">${v22AdminKpi('users','blue','Total Users','12,568','+12%',[8,10,9,13,11,12,15,13,16,14,18,22],'#3b9bff')}${v22AdminKpi('crown','gold','Subscribed Users','3,482','+18%',[5,7,6,10,8,12,9,11,14,12,15,18],'#c04cf5')}${v22AdminKpi('percent','teal','Conversion Rate','27.7%','+4.2%',[8,9,11,10,13,11,14,12,15,14,16,18],'#19d6a4')}${v22AdminKpi('rupee','purple','Monthly Revenue','₹4,17,840','+22%',[4,6,8,7,10,8,11,13,11,14,15,17],'#b65cf6')}</section>
 <section class="v22-admin-charts">
  <article class="v22-card"><div class="v22-card-head"><div><h2>User Growth</h2><p>New user registrations over time</p></div>${v22Pills(['7D','30D','3M','1Y'],'30D','data-v22-apill')}</div><div class="v22-legend center sq"><span><i style="--c:#3b82f6"></i>New Users</span><span><i style="--c:#a855f7"></i>Total Users</span></div>
  ${v22Chart({w:540,h:220,pad:{l:42,r:10,t:12,b:34},yMin:0,yMax:800,yTicks:[0,200,400,600,800],xLabels:dayLbl,xPos:dayPos(540,42,10),vGrid:false,bars:{values:bars,purple:[13,20,27,29]},series:[{values:totals.map((v,i)=>i%3===0||i===30?v:v),color:'#c04cf5',width:2.6,dots:3,r:5,endDot:6,glow:'#c04cf5',bandX:true}],overlays:[{x:240,y:20,cls:'v22-multi-tip compact',html:'<small>15 Oct 2026</small><div><i style="--c:#3b82f6"></i><span>New Users: 412</span></div><div><i style="--c:#c04cf5"></i><span>Total Users: 8,256</span></div>'}]})}</article>
  <article class="v22-card"><div class="v22-card-head"><div><h2>Subscription Trends</h2><p>Daily subscription count and revenue</p></div>${v22Pills(['7D','30D','3M','1Y'],'30D','data-v22-apill')}</div><div class="v22-legend center sq"><span><i style="--c:#3b82f6"></i>New Subscriptions</span><span><i style="--c:#a855f7"></i>Revenue (₹)</span></div>
  ${v22Chart({w:540,h:220,pad:{l:38,r:44,t:12,b:34},yMin:0,yMax:200,yTicks:[0,50,100,150,200],yRight:{ticks:['₹0','₹20K','₹40K','₹60K','₹80K']},xLabels:dayLbl,xPos:dayPos(540,38,44),vGrid:false,bars:{values:subBars,purple:[29]},series:[{values:rev,color:'#c04cf5',width:2.6,dots:3,r:5,endDot:6,glow:'#c04cf5',bandX:true}],overlays:[{x:265,y:30,cls:'v22-multi-tip compact',html:'<small>15 Oct 2026</small><div><i style="--c:#3b82f6"></i><span>Subscriptions: 86</span></div><div><i style="--c:#c04cf5"></i><span>Revenue: ₹28,400</span></div>'}]})}</article>
 </section>
 <section class="v22-admin-ops">
  <article class="v22-card v22-sipcfg"><div class="v22-op-head"><span class="v22-tile violet lg">${ic('calendar')}</span><div><h2>SIP Notification Date Configuration</h2><p>Set the SIP investment date for this month. All subscribed users will receive a notification on this date.</p></div></div>
   <div class="v22-sipcfg-row"><div><label class="v22-label" for="admin-sip-date">Selected Date (October 2026)</label>${v22DateField('admin-sip-date','12/10/2026','calendar')}</div><div class="v22-sipcfg-note"><p>This date will be used to send SIP investment notifications to all active subscribers.</p><button type="button" class="v22-grad-btn" data-action="v22-update-date">Update Date</button></div></div>
   <b class="v22-upcoming-t">Upcoming Notifications</b><div class="v22-upcoming"><span class="d" id="v22-upcoming-date">12 Oct 2026</span><span>SIP investment reminder for all subscribers</span><button type="button" class="v22-outline-btn" data-action="v22-preview-notif">${ic('eye')} Preview Notification</button></div></article>
  <article class="v22-card v22-upload"><div class="v22-op-head"><span class="v22-tile blue lg">${ic('db')}</span><div><h2>Data Upload &amp; Management</h2><p>Upload and manage mutual fund NAV data used for charts, analytics and AI insights.</p></div><a class="v22-outline-btn sm" href="#/admin/data">View Upload History ${ic('arrowR')}</a></div>
   <div class="v22-upload-row"><label class="v22-drop" for="v22-nav-file">${ic('cloudUp','up')}<b>Upload NAV Data (CSV/Excel)</b><small>Drag and drop your file here, or <u>click to browse</u></small><span class="v22-outline-btn">Choose File</span><input type="file" id="v22-nav-file" accept=".csv,.xlsx,.xls" hidden></label>
   <div class="v22-last"><b>Last Upload</b><div class="v22-last-when">${ic('file')}<span id="v22-last-when">16 Oct 2026, 10:24 AM</span><em>Success</em></div><dl><dt>File:</dt><dd id="v22-last-file">nav_data_oct_2026.xlsx</dd><dt>Records:</dt><dd>1,25,680 (245 funds)</dd><dt>Uploaded by:</dt><dd>Admin</dd></dl><a class="v22-outline-btn sm" href="#/admin/data">View Details ${ic('arrowR')}</a></div></div>
   <p class="v22-supported">${ic('checkCircle')} Supported format: CSV, Excel (.xlsx), Max file size: 50MB.</p></article>
 </section>
 <section class="v22-admin-lower">
  <article class="v22-card v22-tbl-card"><div class="v22-card-head"><h2>${ic('user','t-ic blue')} Recent User Signups</h2><a href="#/admin/users">View All ${ic('arrowR')}</a></div><table class="v22-mini-table v22-compact"><thead><tr><th>User</th><th>Signed up</th><th>Status</th></tr></thead><tbody>${signups.map(r=>`<tr><td><b>${r[0]}</b><small>${r[1]}</small></td><td>${r[2]}</td><td><span class="v22-status">Active</span></td></tr>`).join('')}</tbody></table></article>
  <article class="v22-card v22-tbl-card"><div class="v22-card-head"><h2>${ic('crown','t-ic gold')} Recent Subscriptions</h2><a href="#/admin/subscriptions">View All ${ic('arrowR')}</a></div><table class="v22-mini-table v22-compact"><thead><tr><th>User</th><th>Plan</th><th>Status</th></tr></thead><tbody>${subs.map(r=>`<tr><td><b>${r[0]}</b><small>${r[3]}</small></td><td><b>${r[1]}</b><small>${r[2]}</small></td><td><span class="v22-status">Active</span></td></tr>`).join('')}</tbody></table></article>
  <article class="v22-card v22-summary-card"><div class="v22-card-head"><h2>${ic('db','t-ic teal')} Data Summary</h2><small class="v22-updated">${ic('refresh')} Last updated: 16 Oct 2026, 10:24 AM</small></div><div class="v22-dsum">${[['bars','teal','Total Mutual Funds','8,532','+12 new','pos'],['grid','violet','Categories','12','Equity, Debt, Hybrid...',''],['layers','green','Total NAV Records','12.8M','Till 31 Oct 2026',''],['calendar','blue','Last Data Date','31 Oct 2026','Up to date','badge']].map(x=>`<div><span class="v22-tile ${x[1]}">${ic(x[0])}</span><div><small>${x[2]}</small><b>${x[3]}</b><em class="${x[5]}">${x[4]}</em></div></div>`).join('')}</div></article>
 </section></div>`;
}

/* ---------- Floating assistant (ref 07: robot "Ask Mod Alpha") ---------- */
function chatWidget(){return `<button class="chat-fab v22-fab" data-action="chat-toggle" aria-label="Ask Mod Alpha"><span class="v22-fab-bot">${v22Robot()}</span><span class="v22-fab-dot"></span><span class="v22-fab-label">Ask Mod Alpha</span></button><section class="chat-drawer" id="chat-drawer"><div class="chat-head"><span class="ai-orb small">✧</span><div><b>Mod Alpha Assistant</b><small>Demo · Fund data only</small></div><button data-action="chat-toggle">×</button></div><div class="chat-messages" id="chat-messages"><div class="bot-message">Hi! I can help explain sample mutual fund data, returns and SIP concepts. What would you like to understand?</div></div><div class="chat-compose"><input id="chat-input" placeholder="Ask a question..."><button data-action="chat-send">↑</button></div><p class="chat-disclaimer">Not investment advice. No personal portfolio data is accessed.</p></section>`}

/* ---------- v22 interactions ---------- */
document.addEventListener('click',e=>{
 const t=e.target;let b;
 if((b=t.closest('[data-v22-chip]'))){v22Chip=b.dataset.v22Chip;v22Page=1;renderUser('funds');return}
 if((b=t.closest('[data-v22-page]'))&&!b.disabled){v22Page=Number(b.dataset.v22Page);renderUser('funds');document.querySelector('.v22-explore')?.scrollIntoView({block:'start'});return}
 if(t.closest('[data-v22-clear]')){filters.q='';v22Page=1;renderUser('funds');document.getElementById('fund-search')?.focus();return}
 if((b=t.closest('[data-v22-dperiod]'))){v22DetailPeriod=b.dataset.v22Dperiod;b.parentElement.querySelectorAll('button').forEach(x=>x.classList.toggle('active',x===b));const f=D.funds.find(x=>x.id===selectedFund);document.getElementById('v22-detail-chart').innerHTML=v22DetailChart(f,v22DetailPeriod);return}
 if((b=t.closest('[data-v22-dash]'))){v22DashPeriod=b.dataset.v22Dash;b.parentElement.querySelectorAll('button').forEach(x=>x.classList.toggle('active',x===b));document.getElementById('v22-dash-chart').innerHTML=v22DashChart(v22DashPeriod);return}
 if((b=t.closest('[data-v22-apill]'))){b.parentElement.querySelectorAll('button').forEach(x=>x.classList.toggle('active',x===b));notify(`${b.dataset.v22Apill} view · illustrative sample data`);return}
 if((b=t.closest('[data-v22-month]'))){let m=v22CalMonth.m+Number(b.dataset.v22Month),y=v22CalMonth.y;if(m<0){m=11;y--}if(m>11){m=0;y++}v22CalMonth={y,m};renderUser('overview');return}
 if((b=t.closest('[data-v22-preset]'))){const k=b.dataset.v22Preset,inp=document.getElementById('calc-date');b.parentElement.querySelectorAll('button').forEach(x=>x.classList.toggle('active',x===b));if(k==='custom'){inp.focus();inp.select();return}const d=new Date(V22_ASOF);d.setFullYear(d.getFullYear()-Number(k));inp.value=v22FmtDate(d);runCalc();return}
 if((b=t.closest('[data-v22-amount]'))){document.getElementById('calc-amount').value=Number(b.dataset.v22Amount).toLocaleString('en-IN');runCalc();return}
 if((b=t.closest('[data-v22-sip]'))){document.getElementById('sip-amount').value=Number(b.dataset.v22Sip).toLocaleString('en-IN');runSip();return}
 if((b=t.closest('[data-v22-qpreset]'))){const k=b.dataset.v22Qpreset,inp=document.getElementById('quick-date');b.parentElement.querySelectorAll('button').forEach(x=>x.classList.toggle('active',x===b));if(k==='custom'){inp.focus();inp.select();return}const d=new Date(V22_ASOF);d.setFullYear(d.getFullYear()-Number(k));inp.value=v22FmtDate(d);v22QuickCalc();return}
 if((b=t.closest('[data-v22-qamount]'))){b.parentElement.querySelectorAll('button').forEach(x=>x.classList.toggle('active',x===b));document.getElementById('quick-amount').value=Number(b.dataset.v22Qamount).toLocaleString('en-IN');v22QuickCalc();return}
 if(t.closest('[data-action="v22-quick-calc"]')){v22QuickCalc(true);return}
 if((b=t.closest('[data-v22-cal]'))){const h=document.querySelector(`[data-v22-date-for="${b.dataset.v22Cal}"]`),d=v22ParseDate(document.getElementById(b.dataset.v22Cal).value);if(d)h.value=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');try{h.showPicker()}catch(_){h.focus();h.click()}return}
 if(t.closest('[data-v22-navgroup]')){v22DataOpen=!v22DataOpen;const g=t.closest('[data-v22-navgroup]');g.setAttribute('aria-expanded',v22DataOpen);g.nextElementSibling.classList.toggle('open',v22DataOpen);g.querySelector('.caret').outerHTML=ic(v22DataOpen?'chevUp':'chevDown','caret');return}
 if(t.closest('[data-action="set-reminder"]')){window.MA_REMINDER?MA_REMINDER.onSet(t.closest('[data-action="set-reminder"]')):notify('Reminder set.');return}
 if(t.closest('[data-v22-pick]')){const d=+t.closest('[data-v22-pick]').dataset.v22Pick,SP=v22SipFor(v22CalMonth.y,v22CalMonth.m);v22PickDay=SP&&d===SP.day?null:(v22PickDay===d?null:d);route();return}
 if(t.closest('[data-v22-pick-reset]')){v22PickDay=null;route();return}
 
 if(t.closest('[data-action="v22-update-date"]')){const d=v22ParseDate(document.getElementById('admin-sip-date').value);if(!d){notify('Enter a valid date as dd/mm/yyyy.');return}const s=d.getDate()+' '+V22_MON[d.getMonth()]+' '+d.getFullYear();document.getElementById('v22-upcoming-date').textContent=s;notify(`SIP notification date set to ${s} (demo only).`);return}
 if(t.closest('[data-action="v22-preview-notif"]')){showModal('Notification preview',`<div class="v22-notif modal"><span class="v22-notif-logo">${v22Mark(22,'pvM')}</span><div><div class="v22-notif-top"><b>Mod Alpha</b><small>now</small></div><b class="t">Best SIP date this month!</b><p>Our analysis suggests investing on ${document.getElementById('v22-upcoming-date').textContent} for potentially better long-term returns.</p></div></div><p class="v22-muted">Preview only — nothing is sent in this prototype.</p><button class="secondary-btn full" data-modal-close>Close</button>`);return}
},true);
document.addEventListener('change',e=>{
 const t=e.target;
 if(t.matches('[data-v22-date-for]')&&t.value){const[y,m,d]=t.value.split('-');const inp=document.getElementById(t.dataset.v22DateFor);inp.value=`${d}/${m}/${y}`;inp.dispatchEvent(new Event('change',{bubbles:true}))}
 if(t.id==='calc-date'||t.id==='calc-amount')runCalc();
 if(t.id==='sip-amount'||t.id==='sip-start'||t.id==='sip-end')runSip();
 if(t.id==='quick-date'||t.id==='quick-amount')v22QuickCalc();
 if(t.id==='v22-nav-file'&&t.files[0]){const f=t.files[0];if(!/\.(csv|xlsx|xls)$/i.test(f.name)){notify('Unsupported file type. Upload CSV or Excel (.xlsx).');return}if(f.size>50*1024*1024){notify('File exceeds the 50MB limit.');return}document.getElementById('v22-last-file').textContent=f.name;document.getElementById('v22-last-when').textContent=new Date().toLocaleString('en-GB',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});notify('File accepted for demo validation. Row-level processing is not connected.')}
});
document.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.matches('#calc-date,#calc-amount,#sip-amount,#sip-start,#sip-end,#quick-date,#quick-amount'))e.target.dispatchEvent(new Event('change',{bubbles:true}))});
document.addEventListener('dragover',e=>{const d=e.target.closest?.('.v22-drop');if(d){e.preventDefault();d.classList.add('over')}});
document.addEventListener('dragleave',e=>{e.target.closest?.('.v22-drop')?.classList.remove('over')});
document.addEventListener('drop',e=>{const d=e.target.closest?.('.v22-drop');if(!d)return;e.preventDefault();d.classList.remove('over');const inp=document.getElementById('v22-nav-file');if(e.dataTransfer.files.length){inp.files=e.dataTransfer.files;inp.dispatchEvent(new Event('change',{bubbles:true}))}});
function v22QuickCalc(open){const d=v22ParseDate(document.getElementById('quick-date')?.value),a=v22Num(document.getElementById('quick-amount')?.value);if(!d||d>V22_ASOF){notify('Enter a valid past date as dd/mm/yyyy.');return}if(!a||a<500){notify('Enter an amount of at least ₹500.');return}document.getElementById('v22-est').innerHTML=v22EstHTML(v22Lump(a,d));if(open){v22WhatIf={date:v22FmtDate(d),amount:a};go('user/whatif')}}

/* Keep focus/caret in the fund search while the list re-renders */
(function(){const base=renderUser;renderUser=function(page,sub){const a=document.activeElement,keep=a&&a.id==='fund-search'?a.selectionStart:null;if(page==='funds'&&a&&a.id==='fund-search')v22Page=1;base(page,sub);if(keep!==null){const i=document.getElementById('fund-search');if(i){i.focus();i.setSelectionRange(keep,keep)}}}})();

window.addEventListener('hashchange',()=>{if(typeof modalRoot!=='undefined')modalRoot.innerHTML=''});

/* ======================================================================
   v22.1 — animated feature previews, pricing, FAQ, brand social icons,
   larger assistant
   ====================================================================== */
let v22Cid=0;
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
const v22BrandMark=(h=26)=>`<img src="assets/brand/mod-alpha-mark.png" alt="" style="height:${h}px;width:auto">`;

/* ---------- Animated "what Mod Alpha covers" cards ---------- */
function v22Features(){
 const cards=[
  {ic:cic('search',30),t:'Fund Selection &amp; Overview',d:'Searchable fund selector with key info, 5-year returns and an AI-generated summary.',go:'#/user/funds',cta:'Explore funds',prev:`<div class="pv pv-search"><div class="pv-box">${ic('search')}<span class="pv-type">Quant Small Cap</span><i class="pv-caret"></i></div><div class="pv-rows">${[['#f59e0b','82%','32.4%'],['#3b82f6','70%','28.1%'],['#ef4444','62%','26.8%']].map((r,i)=>`<div style="--i:${i}"><i style="background:${r[0]}"></i><span style="--w:${r[1]}"></span><b>${r[2]}</b></div>`).join('')}</div></div>`},
  {ic:cic('alarm',30),t:'What If I Invested on This Date?',d:'Interactive investment simulator with a date picker, growth chart and CAGR summary.',go:'#/user/whatif',cta:'Try the calculator',prev:`<div class="pv pv-whatif"><span class="pv-chip">${ic('calendar')} 15/01/2021</span><svg viewBox="0 0 300 110" preserveAspectRatio="none"><defs><linearGradient id="pvA" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#22d3ee" stop-opacity=".35"/><stop offset="1" stop-color="#22d3ee" stop-opacity="0"/></linearGradient></defs><path class="pv-area" d="M10 100 C 70 96, 110 84, 160 66 S 250 30, 290 12 L290 110 L10 110Z" fill="url(#pvA)"/><path class="pv-line" pathLength="100" d="M10 100 C 70 96, 110 84, 160 66 S 250 30, 290 12" fill="none" stroke="#38bdf8" stroke-width="3.2" stroke-linecap="round"/><circle class="pv-dot" cx="290" cy="12" r="5" fill="#a5f3fc"/></svg><span class="pv-value">₹4,44,171 <em>+344.2%</em></span></div>`},
  {ic:v22BrandMark(28),brand:true,t:'MOD Alpha — Intelligent SIP Analysis',d:'Compare a traditional fixed-date SIP with AI-optimised investment dates over the same period.',go:'#/user/sip',cta:'Compare SIPs',prev:`<div class="pv pv-bars"><div class="pv-bar fixed"><span><b>₹6.8L</b></span><small>Fixed date</small></div><div class="pv-bar mod"><span><b>₹11.7L</b></span><small>MOD α</small></div><em class="pv-badge">+72%</em></div>`},
  {ic:cic('chat',30),t:'AI Insights &amp; Chat',d:'Ask the AI assistant anything about funds and SIP dates, and get confidence-scored insights in plain language.',go:'#/user/chat',cta:'Ask Mod Alpha',prev:`<div class="pv pv-chat"><div class="pv-msg me">Best SIP date this month?</div><div class="pv-typing"><i></i><i></i><i></i></div><div class="pv-msg bot">${cic('calendar',16)} The 12th — historically 2.8% better than a fixed date</div></div>`}
 ];
 return `<section class="v22 v22-features" id="features" data-v22-reveal><div class="v22-sec-head"><span class="v22-eyebrow">THE MOD ALPHA EXPERIENCE</span><h2>Everything you need to understand <span class="g-blue">your mutual funds</span></h2><p>Explore funds, review historical performance and understand the monthly SIP date insight.</p></div>
 <div class="v22-feat-grid">${cards.map((c,i)=>`<article class="v22-feat" style="--i:${i}"><div class="v22-feat-top"><span class="v22-feat-ic ${c.brand?'brand':''}">${c.ic}</span><h3>${c.t}</h3></div>${c.prev}<p>${c.d}</p><a href="${c.go}" class="v22-feat-cta">${c.cta} ${ic('arrowR')}</a></article>`).join('')}</div></section>`;
}

/* ---------- Pricing ---------- */
let v22Billing='monthly';
const V22_PLAN_META={Free:{ic:'sprout',no:['Advanced analytics','Unlimited AI queries'],cta:'Get Started'},Pro:{ic:'rocket',no:[],cta:'Start Pro Plan'},Premium:{ic:'crown',no:[],cta:'Start Premium Plan'}};
function v22PlanPrice(p,billing){const m=p.price,ym=Math.round(m*.8);return billing==='yearly'?{per:ym,note:m?`Billed ${inr(ym*12)} per year`:'Free forever'}:{per:m,note:m?'Billed monthly':'Free forever'}}
pricingSection=function(){
 return `<section class="v22 v22-pricing" id="pricing" data-v22-reveal><div class="v22-sec-head"><span class="v22-eyebrow">SIMPLE, TRANSPARENT PRICING</span><h2>Choose Your Plan</h2><p>Simple and transparent pricing for mutual fund intelligence and monthly SIP insights.</p>
 <div class="v22-billing" data-state="${v22Billing}" role="group" aria-label="Billing period"><i class="v22-billing-thumb"></i><button type="button" data-v22-billing="monthly" aria-pressed="${v22Billing==='monthly'}">Monthly</button><button type="button" data-v22-billing="yearly" aria-pressed="${v22Billing==='yearly'}">Yearly <em>Save 20%</em></button></div></div>
 <div class="v22-plans">${D.plans.filter(p=>p.active!==false).map((p,i)=>{const m=V22_PLAN_META[p.name]||{ic:'sprout',no:[],cta:'Choose'},pr=v22PlanPrice(p,v22Billing),pop=p.name==='Pro';return `<article class="v22-plan ${pop?'popular':''}" style="--i:${i}">${pop?'<span class="v22-pop">MOST POPULAR</span>':''}<div class="v22-plan-head"><div><h3>${p.name}</h3><p>${esc(p.tagline)}</p></div><span class="v22-plan-ic">${cic(m.ic,30)}</span></div><div class="v22-price"><b data-v22-price="${p.price}">${inr(pr.per)}</b><span>/month</span></div><small class="v22-price-note" data-v22-note="${p.price}">${pr.note}</small><ul>${p.features.map(f=>`<li>${cic('check',20)}<span>${esc(f)}</span></li>`).join('')}${m.no.map(f=>`<li class="no">${cic('cross',20)}<span>${f}</span></li>`).join('')}</ul><a class="${pop?'v22-grad-btn':'v22-plan-btn'}" href="#/signup">${m.cta} ${ic('arrowR')}</a></article>`}).join('')}</div>
 <div class="v22-trust">${[['shield','You stay in control','Mod Alpha never places orders or holds your money'],['idcard','One-time KYC','Required before your first paid subscription'],['lock','Secure by design','Payments and data protection confirmed before launch']].map(x=>`<div>${cic(x[0],30)}<span><b>${x[1]}</b><small>${x[2]}</small></span></div>`).join('')}</div>
</section>`;
};
function v22AnimatePrice(el,to){const from=v22Num(el.textContent),t0=performance.now(),dur=450;const step=t=>{const k=Math.min(1,(t-t0)/dur),e=1-Math.pow(1-k,3);el.textContent=inr(from+(to-from)*e);if(k<1)requestAnimationFrame(step)};requestAnimationFrame(step)}

/* ---------- FAQ ---------- */
const V22_FAQ=[
 ['product','shield','Does Mod Alpha place SIP orders or hold my money?','No. Mod Alpha provides analytics, a monthly SIP date insight and reminders. You invest through your own broker or mutual fund platform — we never execute transactions or hold customer money.'],
 ['product','calendar','How is the monthly SIP date chosen?','Our engine analyses historical NAV data, volatility windows, market holidays and multiple statistical factors to identify the historically strongest date each month. The detailed model remains proprietary.'],
 ['product','chart','Is the recommended date guaranteed to give higher returns?','No. Recommendations are based on historical analysis, which does not predict or guarantee future performance. Each insight comes with a confidence level so you can decide for yourself.'],
 ['pricing','idcard','When do I need to complete KYC?','KYC is required once, before your first paid subscription is activated, through an approved secure verification flow. The Free plan does not require KYC.'],
 ['pricing','rocket','Can I upgrade, downgrade or cancel my plan?','Plan changes will be available from the Subscription page. Final billing, cancellation and refund terms will be confirmed before launch.'],
 ['data','db','Where does the fund data come from?','NAV data is uploaded by administrators and validated before it is published. A licensed live data source is planned; all figures on this test website are illustrative.']
];
let v22FaqCat='all';
function v22Faq(full=false){
 const cats=[['all','All'],['product','Product'],['pricing','Pricing & KYC'],['data','Data']];
 return `<section class="v22 v22-faq" id="faq-preview" data-v22-reveal><div class="v22-faq-grid"><div class="v22-faq-side"><span class="v22-eyebrow">NEED TO KNOW MORE?</span><h2>Frequently asked questions</h2><p>Everything you need to know about how Mod Alpha works, pricing and your data.</p>
 <div class="v22-faq-help">${cic('help',36)}<div><b>Still have questions?</b><small>Our assistant explains funds, returns and SIP concepts in plain language.</small><div class="v22-faq-actions"><a class="v22-grad-btn" href="#/user/chat">Ask Mod Alpha ${ic('arrowR')}</a><a class="v22-plan-btn sm" href="#/faq">${full?'Contact support':'View all FAQs'}</a></div></div></div></div>
 <div class="v22-faq-main"><div class="v22-faq-cats" role="tablist">${cats.map(c=>`<button type="button" data-v22-faqcat="${c[0]}" class="${v22FaqCat===c[0]?'active':''}">${c[1]}</button>`).join('')}</div>
 <div class="v22-acc">${V22_FAQ.map((q,i)=>`<div class="v22-acc-item ${i===0?'open':''}" data-cat="${q[0]}" ${v22FaqCat!=='all'&&v22FaqCat!==q[0]?'hidden':''}><button type="button" class="v22-acc-q" aria-expanded="${i===0}" data-v22-acc>${cic(q[1],26)}<span>${q[2]}</span><i class="v22-acc-plus"></i></button><div class="v22-acc-a"><div><p>${q[3]}</p></div></div></div>`).join('')}</div></div></div></section>`;
}

/* ---------- Brand-coloured social icons in the public footer ---------- */
const V22_SOCIAL=[
 ['WhatsApp','<rect width="32" height="32" rx="9" fill="#25D366"/><path d="M16 6.5a9.4 9.4 0 0 0-8.1 14.2L6.6 25.5l4.9-1.3A9.4 9.4 0 1 0 16 6.5z" fill="#fff"/><path d="M12.6 11.3c.3-.6.6-.6.9-.6h.7c.2 0 .5 0 .7.5l1 2.3c.1.2.1.4 0 .6l-.5.7c-.2.2-.2.4 0 .7.7 1.2 1.7 2.1 2.9 2.7.3.1.5.1.7-.1l.8-.9c.2-.2.4-.3.7-.2l2.2 1c.3.2.4.3.4.5 0 .5-.2 1.4-1 1.9-.7.5-1.8.7-3.4.1a11.6 11.6 0 0 1-5.6-5c-.9-1.6-.7-3 0-4.2z" fill="#25D366"/>'],
 ['X','<rect width="32" height="32" rx="9" fill="#000"/><rect x=".5" y=".5" width="31" height="31" rx="8.5" stroke="#3f3f46" fill="none"/><path d="M8.5 8h4.6l3.6 5 4.3-5h2.2l-5.5 6.4L24 24h-4.6l-3.9-5.4-4.7 5.4H8.6l6-6.9z" fill="#fff"/>'],
 ['Instagram','<defs><radialGradient id="igG" cx="30%" cy="107%" r="150%"><stop offset="0" stop-color="#fdf497"/><stop offset=".1" stop-color="#fdf497"/><stop offset=".5" stop-color="#fd5949"/><stop offset=".68" stop-color="#d6249f"/><stop offset="1" stop-color="#285AEB"/></radialGradient></defs><rect width="32" height="32" rx="9" fill="url(#igG)"/><rect x="8" y="8" width="16" height="16" rx="5" stroke="#fff" stroke-width="2" fill="none"/><circle cx="16" cy="16" r="3.8" stroke="#fff" stroke-width="2" fill="none"/><circle cx="20.8" cy="11.2" r="1.2" fill="#fff"/>'],
 ['YouTube','<rect width="32" height="32" rx="9" fill="#FF0000"/><path d="M13 11.2v9.6l8.2-4.8z" fill="#fff"/>'],
 ['LinkedIn','<rect width="32" height="32" rx="9" fill="#0A66C2"/><rect x="8" y="13" width="3.4" height="11" fill="#fff"/><circle cx="9.7" cy="9.7" r="2" fill="#fff"/><path d="M14.3 13h3.2v1.6c.5-.9 1.7-1.9 3.5-1.9 3.3 0 3.9 2.1 3.9 4.9V24h-3.4v-5.6c0-1.3 0-3-1.8-3s-2.1 1.4-2.1 2.9V24h-3.3z" fill="#fff"/>']
];
(function(){const base=publicFooter;publicFooter=function(){return base().replace(/<div class="footer-socials"[\s\S]*?<\/div>/,`<div class="footer-socials v22-socials" aria-label="Social media">${V22_SOCIAL.map(s=>`<a href="#" data-v22-socialnet="${s[0]}" aria-label="${s[0]}" title="${s[0]}"><svg viewBox="0 0 32 32" width="40" height="40" aria-hidden="true">${s[1]}</svg></a>`).join('')}</div>`)}})();

/* ---------- Landing: plug the new sections in, no replay button ---------- */
(function(){const base=renderLanding;renderLanding=function(){base();
 const feat=document.getElementById('features');if(feat)feat.outerHTML=v22Features();
 const pp=document.getElementById('pricing-preview');if(pp)pp.innerHTML=pricingSection(true);
 const fq=document.getElementById('faq-preview');if(fq)fq.outerHTML=v22Faq();
 document.querySelector('.v22-how-replay')?.remove();
 v22FitFibers();
 // faint version of the login-page particle animation behind the whole landing page
 if(typeof v22AuthAnim==='function'&&!matchMedia('(prefers-reduced-motion: reduce)').matches){const bg=document.createElement('div');bg.className='v22-land-bg';bg.setAttribute('aria-hidden','true');bg.innerHTML='<div><canvas></canvas></div>';app.prepend(bg);bg.querySelector('canvas').dataset.noWaves='1';v22AuthAnim(bg.querySelector('canvas'))}
 v22InitReveal();}})();
(function(){const base=renderPublic;renderPublic=function(type){if(type==='faq'){app.innerHTML=`${topbar(true)}<main class="public-page v22-public-faq">${v22Faq(true)}</main>${publicFooter()}`;v22InitReveal();return}base(type);v22InitReveal()}})();
function v22InitReveal(){
 const els=[...document.querySelectorAll('[data-v22-reveal]')];if(!els.length)return;
 if(!('IntersectionObserver'in window)){els.forEach(e=>e.classList.add('in-view'));return}
 const io=new IntersectionObserver(es=>es.forEach(e=>{e.target.classList.toggle('in-view',e.isIntersecting||e.target.classList.contains('seen'));if(e.isIntersecting)e.target.classList.add('seen')}),{threshold:.12});
 els.forEach(e=>io.observe(e));
 const flow=document.querySelector('[data-v22-flow]');if(flow){const fo=new IntersectionObserver(es=>{es.forEach(e=>{if(e.isIntersecting&&!flow.classList.contains('is-playing'))flow._replayFlow?.()})},{threshold:.15});fo.observe(flow)}
}

/* ---------- Larger Mod Alpha assistant ---------- */
const V22_CHAT_PROMPTS=['Best SIP date this month?','What is CAGR?','Compare Quant Small Cap vs SBI Contra','How does MOD Alpha SIP work?'];
chatWidget=function(){return `<button class="chat-fab v22-fab" data-v22-chat-toggle aria-label="Ask Mod Alpha" aria-expanded="false"><span class="v22-fab-bot">${v22Robot()}</span><span class="v22-fab-dot"></span><span class="v22-fab-label">Ask Mod Alpha</span></button>
<section class="chat-drawer v22-chat" id="chat-drawer" aria-label="Mod Alpha Assistant"><header class="v22-chat-head"><span class="v22-chat-av">${v22Robot()}</span><div><b>Mod Alpha Assistant</b><small><i></i> Online · Demo · Fund data only</small></div><button type="button" data-v22-chat-toggle aria-label="Close assistant">${ic('x')}</button></header>
<div class="v22-chat-body" id="chat-messages"><div class="v22-bubble bot">Hi ${esc((currentUser.name||'there').split(' ')[0])}! 👋 I can explain sample mutual fund data, returns and SIP concepts. What would you like to understand?</div><div class="v22-chat-prompts">${V22_CHAT_PROMPTS.map(p=>`<button type="button" data-v22-prompt="${esc(p)}">${esc(p)}</button>`).join('')}</div></div>
<div class="v22-chat-compose"><input id="v22-chat-input" placeholder="Ask about funds, returns or SIP dates…" autocomplete="off"><button type="button" data-v22-chat-send aria-label="Send">${ic('arrowR')}</button></div><p class="v22-chat-note">Not investment advice. No personal portfolio data is accessed.</p></section>`};
function v22Answer(q){const s=q.toLowerCase(),f=n=>D.funds.find(x=>x.name.toLowerCase().includes(n));
 if(/date|best|when/.test(s))return '📅 For October 2026 the published demo date is <b>12 Oct</b> — historically about <b>+2.8%</b> better than a fixed-date SIP in the sample data. Other good dates: 5, 20 and 28 Oct.';
 if(s.includes('cagr'))return '📈 <b>CAGR</b> (compound annual growth rate) is the steady yearly rate that turns the starting value into the ending value. It smooths the path, so it says nothing about volatility along the way.';
 if(/compare|vs|versus/.test(s)){const a=f('quant'),b=f('sbi');return `⚖️ Sample 5Y CAGR: <b>${a.name}</b> ${a.returns[5]}% vs <b>${b.name}</b> ${b.returns[5]}%. 3Y: ${a.returns[3]}% vs ${b.returns[3]}%. Compare risk, expense ratio and benchmark too — these are illustrative values.`}
 if(/sip|mod alpha|work/.test(s))return '🤖 MOD Alpha SIP compares investing on the AI-recommended date each month with a traditional fixed date. In the sample, ₹10,000/month from 2021–2026 grows to ₹11,71,377 vs ₹6,80,000. You still invest through your own provider.';
 return 'I can explain sample fund data, return definitions and SIP concepts. Try asking about CAGR, the best SIP date, or comparing two funds.'}
function v22ChatSend(q){q=(q||'').trim();if(!q)return;const box=document.getElementById('chat-messages');box.querySelector('.v22-chat-prompts')?.remove();box.insertAdjacentHTML('beforeend',`<div class="v22-bubble me">${esc(q)}</div><div class="v22-bubble bot typing"><i></i><i></i><i></i></div>`);box.scrollTop=box.scrollHeight;setTimeout(()=>{const t=box.querySelector('.typing');if(t){t.classList.remove('typing');t.innerHTML=v22Answer(q)+'<small>Demo answer · Not personalised advice</small>'}box.scrollTop=box.scrollHeight},750)}

document.addEventListener('click',e=>{
 const t=e.target;let b;
 if((b=t.closest('[data-v22-chat-toggle]'))){e.stopPropagation();const d=document.getElementById('chat-drawer');const open=!d.classList.contains('open');d.classList.toggle('open',open);document.querySelector('.v22-fab')?.classList.toggle('is-open',open);document.querySelector('.v22-fab')?.setAttribute('aria-expanded',open);if(open)setTimeout(()=>document.getElementById('v22-chat-input')?.focus(),60);return}
 if((b=t.closest('[data-v22-prompt]'))){v22ChatSend(b.dataset.v22Prompt);return}
 if(t.closest('[data-v22-chat-send]')){const i=document.getElementById('v22-chat-input');v22ChatSend(i.value);i.value='';return}
 if((b=t.closest('[data-v22-billing]'))){v22Billing=b.dataset.v22Billing;document.querySelectorAll('.v22-billing').forEach(x=>{x.dataset.state=v22Billing;x.querySelectorAll('button').forEach(y=>y.setAttribute('aria-pressed',y.dataset.v22Billing===v22Billing))});document.querySelectorAll('[data-v22-price]').forEach(el=>{const p=D.plans.find(x=>x.price===Number(el.dataset.v22Price));v22AnimatePrice(el,v22PlanPrice(p,v22Billing).per)});document.querySelectorAll('[data-v22-note]').forEach(el=>{const p=D.plans.find(x=>x.price===Number(el.dataset.v22Note));el.textContent=v22PlanPrice(p,v22Billing).note});return}
 if((b=t.closest('[data-v22-acc]'))){const item=b.parentElement,open=!item.classList.contains('open');item.parentElement.querySelectorAll('.v22-acc-item').forEach(x=>{x.classList.remove('open');x.querySelector('[data-v22-acc]').setAttribute('aria-expanded','false')});item.classList.toggle('open',open);b.setAttribute('aria-expanded',open);return}
 if((b=t.closest('[data-v22-faqcat]'))){v22FaqCat=b.dataset.v22Faqcat;b.parentElement.querySelectorAll('button').forEach(x=>x.classList.toggle('active',x===b));let first=true;document.querySelectorAll('.v22-acc-item').forEach(x=>{const show=v22FaqCat==='all'||x.dataset.cat===v22FaqCat;x.hidden=!show;x.classList.toggle('open',show&&first);if(show)first=false});return}
 if((b=t.closest('[data-v22-socialnet]'))){e.preventDefault();notify(`${b.dataset.v22Socialnet} profile link will be added before launch.`);return}
},true);
document.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.id==='v22-chat-input'){v22ChatSend(e.target.value);e.target.value=''}if(e.key==='Escape'){const d=document.getElementById('chat-drawer');if(d?.classList.contains('open'))document.querySelector('.v22-fab')?.click()}});

/* ======================================================================
   v22.2 — Settings, Help, admin pages, workspace top bar
   ====================================================================== */
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
const v22Status=(t)=>{const m={Active:'ok',Verified:'ok',Published:'ok',Success:'ok',Completed:'ok',Scheduled:'info','In review':'info',Pending:'warn','Past due':'warn','Not started':'neutral',Draft:'warn',Archived:'neutral',Cancelled:'bad',Suspended:'bad',Blocked:'bad',Free:'neutral','Manual for now':'ok',Expired:'neutral'};return `<span class="v22-pill ${m[t]||'neutral'}">${esc(t)}</span>`};
function v22Head(title,sub,actions='',eyebrow=''){return `<header class="v22-phead"><div>${eyebrow?`<span class="v22-crumb">${eyebrow}</span>`:''}<h1>${title}</h1><p>${sub}</p></div>${actions?`<div class="v22-phead-actions">${actions}</div>`:''}</header>`}
function v22Kpis(list){return `<section class="v22-skpis">${list.map(k=>`<article><span class="v22-skpi-ic">${cic(k[0],30)}</span><div><small>${k[1]}</small><b>${k[2]}</b><em class="${k[4]||''}">${k[3]}</em></div></article>`).join('')}</section>`}
userBanner=function(){return `<div class="v22 v22-notice">${cic('help',22)}<div><b>Guest user preview</b><span>Sample figures and recommendations only — no personal portfolio or transactions are tracked.</span></div><a href="#/signup">Create account ${ic('arrowR')}</a></div>`};
adminNotice=function(){return `<div class="v22 v22-notice admin">${cic('shield',22)}<div><b>Guest admin preview</b><span>Actions are simulated in this browser. No real users, payments, uploads or notifications are modified.</span></div><span class="v22-pill info">READ-ONLY DEMO</span></div>`};
const v22Avatar=(n,i=0)=>`<span class="v22-av" style="--c:${['#3b82f6','#8b5cf6','#14b8a6','#f59e0b','#ec4899','#22c55e'][i%6]}">${esc(n.split(' ').map(x=>x[0]).join('').slice(0,2))}</span>`;
const v22Sel=(id,opts,cls='')=>`<label class="v22-select ${cls}"><select ${id?`id="${id}"`:''}>${opts.map(o=>`<option>${o}</option>`).join('')}</select>${ic('chevDown')}</label>`;
const v22Toggle=(on,attr='')=>`<label class="v22-switch"><input type="checkbox" ${on?'checked':''} ${attr}><span></span></label>`;

/* ---------------- User Settings ---------------- */
function settingsPage(){
 const tab=settingsTab,tabs=[['profile','user','Profile','Personal details & security'],['preferences','sliders','Preferences','Defaults & appearance'],['notifications','bell','Notifications','Channels & reminders'],['privacy','shield','Data & Privacy','Consent & your data']];
 const first=esc((currentUser.name||'U')[0]);
 let body='';
 if(tab==='profile')body=`<section class="v22-card v22-set-card"><div class="v22-prof"><span class="v22-prof-av">${first}</span><div class="v22-prof-main"><b>${esc(currentUser.name)}</b><span>${esc(currentUser.email)}</span><div class="v22-prof-tags"><span class="v22-pill neutral">Free plan</span><span class="v22-pill info">Guest demo profile</span></div></div><div class="v22-sec-actions"><button type="button" class="v22-outline-btn" data-action="change-password">${ic('lock')} Change Password</button><button type="button" class="v22-outline-btn v22-danger-outline" data-action="logout-all">${ic('logout')} Sign out of all devices</button></div></div>
  <div class="v22-meter"><div><b>Profile completeness</b><span>60%</span></div><i><em style="width:60%"></em></i><small>Add a mobile number to receive SMS reminders.</small></div></section>
  <section class="v22-card v22-set-card"><h3 class="v22-set-h">${cic('idcard',24)} Personal details</h3><div class="v22-form-grid"><label class="v22-fl">Full name<input id="profile-name" value="${esc(currentUser.name)}"></label><label class="v22-fl">Email address<input id="profile-email" type="email" value="${esc(currentUser.email)}" disabled><small>${ic('lock')} Verified email changes come with authentication integration.</small></label><label class="v22-fl">Mobile number<input id="profile-mobile" placeholder="+91 98765 43210" inputmode="tel"></label><label class="v22-fl">Country / Region${v22Sel('profile-country',['India','Other'])}</label></div></section>
  <section class="v22-card v22-set-card"><h3 class="v22-set-h">${cic('rupee',24)} Investment defaults</h3><div class="v22-form-grid"><label class="v22-fl">Default investment amount (₹)<input id="default-investment" type="number" min="500" step="500" value="100000"></label><label class="v22-fl">Default SIP amount (₹)<input id="default-sip" type="number" min="500" step="500" value="10000"></label></div><p class="v22-hint">These values pre-fill calculators only. They never create or modify an investment or SIP.</p></section>
  <div class="v22-savebar"><span>Changes are stored for this demo session only.</span><button type="button" class="v22-grad-btn" data-action="save-profile-settings">Save Changes</button></div>`;
 else if(tab==='preferences')body=`<section class="v22-card v22-set-card"><h3 class="v22-set-h">${cic('chart',24)} Investment &amp; display</h3><div class="v22-form-grid"><label class="v22-fl">Default investment amount (₹)<input type="number" value="100000"></label><label class="v22-fl">Default SIP amount (₹)<input type="number" value="10000"></label></div><div class="v22-fl">Default return period<div class="v22-seg-pills">${['1Y','3Y','5Y','10Y'].map(x=>`<button type="button" class="${x==='5Y'?'active':''}" data-v22-segpick>${x}</button>`).join('')}</div></div><div class="v22-fl">Number format<div class="v22-seg-pills">${['₹1,00,000 (Indian)','₹100,000 (International)'].map((x,i)=>`<button type="button" class="${i===0?'active':''}" data-v22-segpick>${x}</button>`).join('')}</div></div></section>
  <section class="v22-card v22-set-card"><h3 class="v22-set-h">${cic('palette',24)} Appearance</h3><div class="v22-theme-cards"><label class="v22-theme on"><input type="radio" name="v22-theme" checked><span class="v22-theme-prev dark"><i></i><i></i><i></i></span><b>Dark</b><small>Default midnight theme</small></label><label class="v22-theme off"><input type="radio" name="v22-theme" disabled><span class="v22-theme-prev light"><i></i><i></i><i></i></span><b>Light</b><small>Coming soon</small></label></div><select id="theme-select" hidden><option value="dark" selected>Dark</option></select><label class="v22-fl" style="margin-top:18px;max-width:360px">Language${v22Sel('',['English (India)','हिन्दी (coming soon)'])}</label></section>
  <div class="v22-savebar"><span>Preferences apply to this browser session.</span><button type="button" class="v22-grad-btn" data-action="save-settings">Save Preferences</button></div>`;
 else if(tab==='notifications')body=`<section class="v22-card v22-set-card"><h3 class="v22-set-h">${cic('bell',24)} Delivery channels</h3><p class="v22-hint top">Choose how Mod Alpha contacts you. Essential account and subscription notices may still be sent where legally required.</p><div class="v22-channels-grid">${[['mail','Email','ankit@example.com',1],['sms','SMS','Add a mobile number',0],['phone','In-app &amp; push','This browser',1]].map(c=>`<div class="v22-chan ${c[3]?'on':''}">${cic(c[0],34)}<div><b>${c[1]}</b><small>${c[2]}</small></div>${v22Toggle(c[3],'data-v22-chan')}</div>`).join('')}</div></section>
  <section class="v22-card v22-set-card"><h3 class="v22-set-h">${cic('calendar',24)} What to notify me about</h3>${[['Monthly SIP reminder','Receive a reminder before the common monthly date.',1],['Best-date published','Get notified as soon as the month’s date is published.',1],['Subscription &amp; billing','Renewals, receipts and payment status.',1],['Weekly insights digest','A summary of AI insights for funds you follow.',0],['Product announcements','Optional product news and feature updates.',0]].map(x=>`<div class="v22-trow"><div><b>${x[0]}</b><small>${x[1]}</small></div>${v22Toggle(x[2])}</div>`).join('')}<div class="v22-trow"><div><b>Reminder timing</b><small>How early to remind you before the SIP date.</small></div>${v22Sel('',['2 days before','1 day before','On the day','3 days before'],'sm')}</div></section>
  <div class="v22-savebar"><span>Delivery is not connected in this prototype.</span><button type="button" class="v22-grad-btn" data-action="save-settings">Save Notification Preferences</button></div>`;
 else body=`<section class="v22-card v22-set-card"><div class="v22-privacy-hero">${cic('shield',44)}<div><b>Your data, your control</b><p>Your account details, preferences and support history will be handled according to the published privacy policy. This test website stores no data on a server.</p></div></div><div class="v22-data-chips">${[['user','Account details'],['sliders','Preferences'],['help','Support history']].map(x=>`<span>${cic(x[0],18)} ${x[1]}</span>`).join('')}</div></section>
  <section class="v22-card v22-set-card"><h3 class="v22-set-h">${cic('key',24)} Consent</h3><div class="v22-trow"><div><b>Product analytics</b><small>Allow anonymous usage analytics to improve the service.</small></div>${v22Toggle(0)}</div><div class="v22-trow"><div><b>Personalised communications</b><small>Allow optional product updates and announcements.</small></div>${v22Toggle(0)}</div><div class="v22-trow"><div><b>Essential cookies</b><small>Required for sign-in and security. Always on.</small></div>${v22Toggle(1,'disabled')}</div></section>
  <section class="v22-two-act"><article class="v22-card v22-act">${cic('download',36)}<div><b>Download your data</b><p>Get a copy of your profile, preferences and support requests.</p><button type="button" class="v22-outline-btn" data-action="export-account">Request data export</button></div></article><article class="v22-card v22-act danger">${cic('trash',36)}<div><b>Delete account</b><p>Permanently remove your account. Identity verification will be required.</p><button type="button" class="v22-danger-btn" data-action="delete-account">Request account deletion</button></div></article></section>`;
 return `<div class="v22 v22-settings">${v22Head('Settings','Manage your profile, preferences, notifications and data privacy.','','ACCOUNT')}${userBanner()}
 <div class="v22-set-layout"><aside class="v22-set-side"><div class="v22-set-who"><span class="v22-prof-av sm">${first}</span><div><b>${esc(currentUser.name)}</b><small>${esc(currentUser.email)}</small></div></div><nav>${tabs.map(t=>`<button type="button" class="${tab===t[0]?'active':''}" data-settings-tab="${t[0]}">${cic(t[1],26)}<span><b>${t[2]}</b><small>${t[3]}</small></span>${ic('chevR','go')}</button>`).join('')}</nav></aside><div class="v22-set-body">${body}</div></div></div>`;
}

/* ---------------- Help & FAQ ---------------- */
const V22_HELP=[['start','What is Mod Alpha?','Mod Alpha is a mutual fund analytics and SIP date intelligence platform. It provides historical analysis, calculators and monthly SIP date reminders.'],['start','Does Mod Alpha invest on my behalf?','No. Mod Alpha does not hold customer money, place SIP orders or connect to broker/demat accounts. You make investment decisions and transact through your own provider.'],['sip','Are historical results guaranteed?','No. Historical and simulated results are not forecasts or guarantees of future performance.'],['sip','How is the SIP date selected?','The platform publishes one common reminder date each month. It is chosen using historical NAV behaviour, volatility windows and multi-factor scoring; the detailed model is proprietary.'],['data','What data does Mod Alpha use?','The prototype uses synthetic sample data. Production NAV data will initially be uploaded by administrators through validated Excel/CSV files.'],['billing','When is KYC required?','KYC/identity verification is required once, when you subscribe to a paid plan for the first time.'],['billing','Can I cancel a subscription?','Cancellation, renewal and refund terms will be shown before checkout. Billing is not connected in this demo.']];
let v22HelpCat='all',v22HelpQ='';
function v22HelpList(){const q=v22HelpQ.toLowerCase();const list=V22_HELP.filter(x=>(v22HelpCat==='all'||x[0]===v22HelpCat)&&(!q||(x[1]+' '+x[2]).toLowerCase().includes(q)));return list.length?list.map((x,i)=>`<div class="v22-acc-item ${i===0?'open':''}"><button type="button" class="v22-acc-q" data-v22-acc aria-expanded="${i===0}">${cic({start:'help',sip:'calendar',data:'db',billing:'idcard'}[x[0]],24)}<span>${x[1]}</span><i class="v22-acc-plus"></i></button><div class="v22-acc-a"><div><p>${x[2]}</p></div></div></div>`).join(''):`<div class="v22-empty">No answers match “${esc(v22HelpQ)}”. Try another word, or send us a request.</div>`}
function helpPage(){
 return `<div class="v22 v22-help">${v22Head('Help &amp; FAQ','Answers about the platform, data, reminders and subscriptions.','','HELP CENTRE')}${userBanner()}
 <section class="v22-help-hero"><h2>How can we help you today?</h2><label class="v22-help-search">${ic('search')}<input id="v22-help-q" placeholder="Search questions — e.g. KYC, SIP date, cancel" value="${esc(v22HelpQ)}" autocomplete="off"></label>
 <div class="v22-help-topics">${[['all','grid','All topics','7 articles'],['start','help','Getting started','What Mod Alpha does'],['sip','calendar','SIP dates','How dates are chosen'],['billing','idcard','Plans &amp; KYC','Billing and verification'],['data','db','Data &amp; privacy','Sources and your data']].map(t=>`<button type="button" class="${v22HelpCat===t[0]?'active':''}" data-v22-helpcat="${t[0]}">${t[0]==='all'?`<span class="v22-ht-ic">${ic('grid')}</span>`:cic(t[1],30)}<b>${t[2]}</b><small>${t[3]}</small></button>`).join('')}</div></section>
 <div class="v22-help-grid"><section class="v22-card"><div class="v22-card-head"><h2>Frequently asked questions</h2><span class="v22-muted" id="v22-help-count"></span></div><div class="v22-acc" id="v22-help-list">${v22HelpList()}</div></section>
 <aside class="v22-help-side"><section class="v22-card v22-contact"><div class="v22-contact-top">${cic('mail',36)}<div><h3>Still need help?</h3><p>Send a demo support request. No message is sent externally.</p></div></div>
  <label class="v22-fl">Your email<input id="support-email" type="email" value="${esc(currentUser.email)}"></label>
  <div class="v22-fl">Topic<div class="v22-seg-pills wrap" id="v22-topic">${['Product question','Fund data','Subscription','Account &amp; privacy'].map((x,i)=>`<button type="button" class="${i===0?'active':''}" data-v22-segpick>${x}</button>`).join('')}</div></div>
  <label class="v22-fl">Message<textarea id="support-message" rows="4" maxlength="500" placeholder="Tell us what you need help with…"></textarea><small class="v22-count"><span id="v22-msg-count">0</span>/500</small></label>
  <button type="button" class="v22-grad-btn wide" data-v22-support>Submit request ${ic('arrowR')}</button><div id="v22-support-ok" class="v22-ok" hidden>${cic('check',22)} Request recorded locally — reference <b>DEMO-${Math.floor(1000+Math.random()*9000)}</b></div></section>
  <section class="v22-quick"><button type="button" data-v22-chat-toggle>${cic('chat',30)}<span><b>Chat with Mod Alpha</b><small>Instant answers, 24×7</small></span>${ic('chevR')}</button><a href="#/user/subscription">${cic('crown',30)}<span><b>Plans &amp; billing</b><small>Compare Free, Pro and Premium</small></span>${ic('chevR')}</a></section></aside></div></div>`;
}

/* ---------------- Admin: Users ---------------- */
function usersTable(users){return users.length?`<div class="table-scroll"><table class="v22-table v22-admin-table"><thead><tr><th>User</th><th>User ID</th><th>Joined</th><th>Account</th><th>KYC</th><th>Plan</th><th>Subscription</th><th></th></tr></thead><tbody>${users.map((u,i)=>`<tr><td><div class="v22-who">${v22Avatar(u.name,i)}<div><b>${esc(u.name)}</b><small>${esc(u.email)}</small></div></div></td><td class="mono">${u.id}</td><td>${u.joined}</td><td>${v22Status(u.status)}</td><td>${v22Status(u.kyc)}</td><td>${esc(u.plan)}</td><td>${v22Status(u.sub==='Free'?'Free':u.sub)}</td><td><button type="button" class="v22-row-btn" data-user="${u.id}">${ic('eye')} View</button></td></tr>`).join('')}</tbody></table></div><div class="v22-tfoot">Showing ${users.length} of ${D.users.length} sample records</div>`:`<div class="v22-empty">No users match these filters.</div>`}
function adminUsers(){return `<div class="v22 v22-adm">${v22Head('User Management','Search user records and review verification, consent and subscription status.',`<button type="button" class="v22-outline-btn" data-action="export-users">${ic('download')} Export CSV</button>`,'ADMIN · USERS')}${adminNotice()}
 ${v22Kpis([['users','Total users','12,568','+12% vs last month','pos'],['check','Active accounts','11,904','94.7% of users',''],['idcard','KYC pending','642','Needs review','warn'],['warn','Suspended','22','Policy or payment issues','bad']])}
 <section class="v22-card"><div class="v22-filters"><label class="v22-search">${ic('search')}<input id="user-search" placeholder="Search name, email or user ID"></label>${v22Sel('user-status',['All statuses','Active','Suspended'])}${v22Sel('user-kyc',['All KYC states','Verified','Pending','In review','Not started'])}</div><div id="users-table">${usersTable(D.users)}</div></section></div>`}

/* ---------------- Admin: Subscriptions ---------------- */
const V22_SUBS=[['SUB-8821','Aarav Mehta','Premium','Yearly','₹4,790','30 Oct 2027','Active','DEMO-PAY-001'],['SUB-8820','Kabir Rao','Pro','Quarterly','₹897','12 Jan 2027','Active','DEMO-PAY-002'],['SUB-8817','Meera Iyer','Pro','Monthly','₹299','—','Past due','DEMO-PAY-003'],['SUB-8810','Diya Sharma','Premium','Monthly','₹499','26 Nov 2026','Active','DEMO-PAY-005'],['SUB-8801','Riya Sen','Pro','Monthly','₹299','—','Cancelled','DEMO-PAY-004']];
function adminSubs(){return `<div class="v22 v22-adm">${v22Head('Subscriptions','Review plans, subscription lifecycle, invoices and payment reconciliation.',`<button type="button" class="v22-outline-btn" data-action="manage-plans">${ic('gear')} Manage plans</button>`,'ADMIN · BILLING')}${adminNotice()}
 ${v22Kpis([['check','Active subscriptions','3,218','+18% vs last month','pos'],['rupee','Monthly revenue','₹4,17,840','+22% vs last month','pos'],['warn','Past due','86','Requires follow-up','warn'],['refund','Refunded this month','₹42,500','Illustrative sample','']])}
 <section class="v22-plan-admin">${D.plans.map((p,i)=>`<article class="v22-card"><div class="v22-pa-top">${cic(['sprout','rocket','crown'][i],34)}<div><b>${p.name}</b><small>${esc(p.tagline)}</small></div><span class="v22-pill ${i===1?'info':'neutral'}">${i===1?'Most popular':p.period}</span></div><div class="v22-pa-price">${p.price?inr(p.price):'₹0'}<span>/month</span></div><div class="v22-pa-stats"><div><small>Subscribers</small><b>${['9,086','2,604','878'][i]}</b></div><div><small>Entitlements</small><b>${p.features.length}</b></div><div><small>Share</small><b>${['72%','21%','7%'][i]}</b></div></div><i class="v22-bar"><em style="width:${[72,21,7][i]}%"></em></i></article>`).join('')}</section>
 <section class="v22-card"><div class="v22-card-head"><h2>All subscriptions</h2></div><div class="v22-filters"><label class="v22-search">${ic('search')}<input id="v22-sub-search" placeholder="Search subscription ID or user"></label>${v22Sel('v22-sub-state',['All states','Active','Past due','Cancelled'])}${v22Sel('v22-sub-plan',['All plans','Pro','Premium'])}</div>
 <div class="table-scroll"><table class="v22-table v22-admin-table" id="v22-sub-table"><thead><tr><th>Subscription</th><th>User</th><th>Plan</th><th>Amount</th><th>Renewal</th><th>Status</th><th>Payment ref</th></tr></thead><tbody>${V22_SUBS.map((r,i)=>`<tr data-plan="${r[2]}" data-state="${r[6]}"><td class="mono">${r[0]}</td><td><div class="v22-who">${v22Avatar(r[1],i)}<b>${r[1]}</b></div></td><td>${r[2]} <small class="v22-muted">· ${r[3]}</small></td><td><b>${r[4]}</b></td><td>${r[5]}</td><td>${v22Status(r[6])}</td><td class="mono">${r[7]}</td></tr>`).join('')}</tbody></table></div>
 <p class="v22-callout">${cic('shield',20)} Payment status must be verified through signed provider webhooks and reconciliation. This demo cannot mark a payment successful or grant entitlements.</p></section></div>`}

/* ---------------- Admin: SIP date configuration ---------------- */
function adminSipDate(){
 const days=Array.from({length:28},(_,i)=>i+1);
 return `<div class="v22 v22-adm">${v22Head('SIP Date Configuration','Configure the monthly platform-wide reminder date and manage its publishing lifecycle.','<span class="v22-pill ok lg">● Current: 12 Nov 2026</span>','ADMIN · SIP DATES')}${adminNotice()}
 <div class="v22-sip-cfg"><section class="v22-card"><h2 class="v22-h2">Configure monthly reminder</h2><p class="v22-sub">Initial product assumption: one common date across all mutual funds.</p>
  <div class="v22-steps" id="v22-steps">${['Draft','Validate','Preview','Publish'].map((s,i)=>`<div class="${i===0?'done':''}"><i>${i+1}</i><span>${s}</span></div>`).join('')}</div>
  <div class="v22-form-grid"><label class="v22-fl">Effective month${v22Sel('sip-month',['November 2026','December 2026','January 2027'])}</label><label class="v22-fl">Timezone${v22Sel('',['Asia/Kolkata (IST)'])}</label></div>
  <div class="v22-fl">Reminder date <small class="v22-muted">· selected <b id="v22-day-label">12th</b> of the month</small><div class="v22-daygrid">${days.map(d=>`<button type="button" class="${d===12?'active':''} ${[5,20].includes(d)?'alt':''}" data-v22-day="${d}">${d}</button>`).join('')}</div><input type="hidden" id="admin-sip-day" value="12"><small class="v22-legend-row"><span><i class="a"></i>Selected</span><span><i class="b"></i>Other strong dates (model)</span></small></div>
  <label class="v22-fl">Internal change reason<textarea id="sip-reason" rows="3" placeholder="Reason for configuring this date (required to publish)"></textarea></label>
  <button type="button" class="v22-grad-btn wide" data-action="validate-date">Validate configuration ${ic('arrowR')}</button><div id="sip-validation" class="v22-valbox"></div></section>
 <aside class="v22-sip-side"><section class="v22-card v22-orb-card"><h2 class="v22-h2 sm">Current published date</h2><div class="v22-orb"><div><small>NOVEMBER 2026</small><strong>12</strong><span>THURSDAY</span></div></div><div class="v22-kv">${[['Status',v22Status('Published')],['Published by','Admin Demo'],['Published on','28 Oct 2026'],['Version','DEMO-v1.0'],['Recipients','3,218 subscribers']].map(x=>`<div><span>${x[0]}</span><b>${x[1]}</b></div>`).join('')}</div></section>
 <p class="v22-callout">${cic('bell',20)} Publishing creates a versioned record and notification campaign. A published date is a reminder only; it never places an order.</p></aside></div>
 <section class="v22-card"><div class="v22-card-head"><h2>Publishing history</h2></div><div class="table-scroll"><table class="v22-table v22-admin-table"><thead><tr><th>Month</th><th>Date</th><th>Version</th><th>Published by</th><th>Recipients</th><th>Status</th></tr></thead><tbody>${[['November 2026','12 Nov','DEMO-v1.0','Admin Demo','3,218','Published'],['October 2026','12 Oct','DEMO-v0.9','Admin Demo','3,101','Archived'],['September 2026','8 Sep','DEMO-v0.8','Admin Demo','2,944','Archived']].map(r=>`<tr><td><b>${r[0]}</b></td><td>${r[1]}</td><td class="mono">${r[2]}</td><td>${r[3]}</td><td>${r[4]}</td><td>${v22Status(r[5])}</td></tr>`).join('')}</tbody></table></div></section></div>`;
}

/* ---------------- Admin: Data management ---------------- */
function adminData(){return `<div class="v22 v22-adm">${v22Head('Data Management','Upload and validate mutual fund NAV and reference data using Excel or CSV files.','<span class="v22-pill info lg">Manual upload</span>','ADMIN · DATA')}${adminNotice()}
 ${v22Kpis([['db','Last published batch','NAV-DEMO-028','30 Oct 2026',''],['check','Rows accepted','12,48,520','99.99% pass rate','pos'],['warn','Rejected rows','142','Review before publish','warn'],['chart','Funds covered','8,532','+12 new this month','pos']])}
 <section class="v22-card"><div class="v22-pipeline">${[['upload','Upload'],['doc','Schema check'],['refresh','Deduplicate'],['shield','Reconcile'],['check','Publish']].map((x,i)=>`<div class="${i<1?'done':''}">${x[0]==='refresh'?`<span class="v22-pl-ic">${ic('refresh')}</span>`:cic(x[0],28)}<b>${x[1]}</b></div>`).join(`<i></i>`)}</div>
 <div class="v22-upload-grid"><label class="v22-drop big" for="nav-file">${cic('upload',52)}<b>Upload NAV data file</b><small>Drag and drop an Excel (.xlsx) or CSV file, or <u>click to browse</u></small><span class="v22-outline-btn">Choose File</span><em id="v22-file-name">No file selected</em><input type="file" id="nav-file" accept=".xlsx,.xls,.csv" hidden></label>
 <div class="v22-upload-fields"><label class="v22-fl">Data type${v22Sel('',['Daily NAV data','Fund master','Market holiday calendar'])}</label><label class="v22-fl">Data effective date<input type="date" value="2026-10-30"></label><label class="v22-fl">Source description<input placeholder="e.g. NAV data export – October 2026"></label><button type="button" class="v22-grad-btn wide" data-action="validate-upload">Validate selected file ${ic('arrowR')}</button><div id="upload-result" class="v22-valbox"></div></div></div></section>
 <div class="v22-data-two"><section class="v22-card"><div class="v22-card-head"><h2>Required file columns</h2><span class="v22-pill info">NAV schema</span></div><div class="v22-schema">${[['scheme_code','Unique scheme identifier','text'],['nav_date','NAV date (YYYY-MM-DD)','date'],['nav_value','NAV numeric value','decimal'],['source','Source / provider label','optional']].map(x=>`<div><code>${x[0]}</code><span>${x[1]}</span><em>${x[2]}</em></div>`).join('')}</div></section>
 <section class="v22-card"><div class="v22-card-head"><h2>Recent ingestion batches</h2></div>${[['NAV-DEMO-028','nav_oct_sample.xlsx','30 Oct 2026','12,48,520',142,'Published'],['NAV-DEMO-027','nav_sep_sample.csv','30 Sep 2026','12,20,410',87,'Published'],['NAV-DEMO-026','nav_aug_sample.csv','30 Aug 2026','11,96,005',301,'Archived']].map(r=>`<div class="v22-batch">${cic('doc',30)}<div><b>${r[0]}</b><small>${r[1]} · ${r[2]}</small><i class="v22-bar"><em style="width:${(100-r[4]/120).toFixed(1)}%"></em></i><small>${r[3]} rows · <span class="warn-t">${r[4]} rejected</span></small></div>${v22Status(r[5])}</div>`).join('')}</section></div>
 <p class="v22-callout">${cic('shield',20)} Files are staged, schema-checked, deduplicated and reconciled before atomic publishing. This prototype simulates validation only and does not persist uploaded NAV data.</p></div>`}

/* ---------------- Admin: Notifications ---------------- */
function adminNotifications(){return `<div class="v22 v22-adm">${v22Head('Notifications','Manage templates, subscriber campaigns, delivery status and consent-aware reminders.',`<button type="button" class="v22-grad-btn" data-action="new-campaign">${ic('spark')} Send announcement</button>`,'ADMIN · MESSAGING')}${adminNotice()}
 ${v22Kpis([['users','Scheduled recipients','3,218','Next SIP reminder · 12 Nov',''],['check','Delivery success','97.6%','+0.8% vs October','pos'],['refund','Failed / retry','78','Auto-retry in 30 min','warn'],['bell','Opt-in rate','88.4%','Consent-aware sends','']])}
 <section class="v22-card"><div class="v22-card-head"><h2>Notification templates</h2><span class="v22-muted">4 templates</span></div>${window.MA_TPL?MA_TPL.grid(MA_TPL.demoList(),'data-ma-tpl-demo'):''}</section>
 <div class="v22-notif-two"><section class="v22-card"><div class="v22-card-head"><h2>Recent campaigns</h2><span class="v22-pill neutral">Demo history</span></div>${[['November SIP reminder','Email + In-app',3218,3140,78,'Scheduled'],['October SIP reminder','Email',3101,3022,79,'Completed'],['Pro plan launch','Email + Push',8840,8655,185,'Completed']].map(c=>`<div class="v22-camp"><div><b>${c[0]}</b><small>${c[1]} · ${c[2].toLocaleString('en-IN')} recipients</small></div><div class="v22-camp-bar"><i class="v22-bar"><em style="width:${(c[3]/c[2]*100).toFixed(1)}%"></em></i><small>${(c[3]/c[2]*100).toFixed(1)}% delivered · ${c[4]} failed</small></div>${v22Status(c[5])}</div>`).join('')}</section>
 <section class="v22-card"><div class="v22-card-head"><h2>Reminder preview</h2><div class="v22-seg-pills sm">${['Email','SMS','Push'].map((x,i)=>`<button type="button" class="${i===0?'active':''}" data-v22-prevtab="${x}">${x}</button>`).join('')}</div></div><div class="v22-smsprev" data-prev="SMS" hidden><div class="v22-sms-bubble"><b>MODALPHA</b>Reminder: your Mod Alpha SIP date is 12 Nov. Review and invest via your own provider. We never place orders. Reply STOP to opt out.</div><small>160-character SMS template · DLT registration required</small></div><div class="v22-pushprev" data-prev="Push" hidden><div class="v22-notif modal"><span class="v22-notif-logo">${v22Mark(22,'apM')}</span><div><div class="v22-notif-top"><b>Mod Alpha</b><small>now</small></div><b class="t">Best SIP date this month!</b><p>12 Nov is this month’s recommended date. Tap to view the insight.</p></div></div><small>Push / in-app template · opt-in required</small></div><div class="v22-mailprev" data-prev="Email"><div class="v22-mp-head">${v22BrandMark(22)}<div><b>Mod Alpha</b><small>to subscriber · Subject: Your Mod Alpha SIP date reminder</small></div></div><h3>Your monthly reminder date is 12 November</h3><p>Your Mod Alpha monthly reminder date is approaching. Review your investment decision and, if appropriate, proceed through your own mutual fund provider. Mod Alpha does not place orders.</p><span class="v22-mp-btn">View this month’s insight</span><small>Demo template · Subscriber consent required · Delivery not connected</small></div></section></div></div>`}

/* ---------------- Admin: AI & Methodology ---------------- */
const V22_GATES=['Historical data quality and provenance verified','Look-ahead and survivorship bias tests passed','Out-of-sample / walk-forward evaluation completed','Holiday and missing-NAV rules validated','Legal and compliance review approved','Admin approval and audit event recorded'];
function adminMethodology(){return `<div class="v22 v22-adm">${v22Head('AI Models &amp; Insights','Manage public-facing explanations, version governance, model configuration and evaluation status.','<span class="v22-pill warn lg">Internal only</span>','ADMIN · METHODOLOGY')}${adminNotice()}
 <div class="v22-lockbox">${cic('lock',40)}<div><b>Proprietary methodology is internal information</b><p>Model parameters, feature weights, scoring rules, thresholds and implementation details are restricted to authorised administrators. The public website explains only the high-level product process.</p></div></div>
 <div class="v22-method-two"><section class="v22-card"><div class="v22-card-head"><h2>Methodology release</h2><span class="v22-pill warn">Not production approved</span></div><div class="v22-release">${cic('brain',44)}<div><b>MA-SIP-DEMO-1.0</b><small>Test / synthetic environment · last evaluation not run</small></div></div><div class="v22-kv">${[['Current version','MA-SIP-DEMO-1.0'],['Environment','Test / Synthetic'],['Approval status','<span class="warn-t">Pending gates</span>'],['Last evaluation','Not run']].map(x=>`<div><span>${x[0]}</span><b>${x[1]}</b></div>`).join('')}</div><button type="button" class="v22-outline-btn" data-action="method-review">${ic('file')} Open release checklist</button></section>
 <section class="v22-card"><div class="v22-card-head"><h2>Model service configuration</h2></div><div class="v22-kv icons">${[['plug','AI provider','Not connected','bad'],['key','Model endpoint','Server-side secret required','warn'],['db','Retrieval sources','Approved fund data only','ok'],['rupee','Monthly cost limit','Not configured','warn'],['doc','Prompt version','PROMPT-DEMO-1.0','ok']].map(x=>`<div>${cic(x[0],24)}<span>${x[1]}</span><b class="t-${x[3]}">${x[2]}</b></div>`).join('')}</div><p class="v22-callout">${cic('shield',20)} API keys and secrets must be stored in a managed secrets service, never in frontend code.</p></section></div>
 <section class="v22-card"><div class="v22-card-head"><div><h2>Release gates</h2><p><span id="v22-gate-count">0</span> of ${V22_GATES.length} gates passed</p></div><div class="v22-gate-meter"><i class="v22-bar big"><em id="v22-gate-bar" style="width:0%"></em></i></div></div><div class="v22-gates">${V22_GATES.map(x=>`<label class="v22-gate"><input type="checkbox" data-v22-gate><span class="v22-gate-box">${ic('check')}</span><b>${x}</b></label>`).join('')}</div></section></div>`}

/* ---------------- Admin: Audit logs ---------------- */
const V22_AUDIT=[['28 Oct 2026 10:42','admin.demo','SIP_DATE_PUBLISHED','November 2026 · v1.0','Success','Configuration','calendar'],['27 Oct 2026 16:18','data.ops','NAV_BATCH_PUBLISHED','NAV-DEMO-028','Success','Data','db'],['26 Oct 2026 13:04','superadmin.demo','PLAN_CONFIGURATION_UPDATED','Premium plan','Success','Subscription','crown'],['25 Oct 2026 11:32','admin.demo','NOTIFICATION_TEMPLATE_EDITED','SIP reminder','Success','Configuration','bell'],['24 Oct 2026 09:12','system.demo','LOGIN_RATE_LIMIT_EVENT','Auth service','Blocked','Access','shield'],['23 Oct 2026 18:47','admin.demo','USER_SUSPENDED','U-10024','Success','Access','user']];
function adminAudit(){return `<div class="v22 v22-adm">${v22Head('Audit Logs','Review administrative actions and sensitive platform events.',`<button type="button" class="v22-outline-btn" data-action="export-audit">${ic('download')} Export logs</button>`,'ADMIN · SECURITY')}${adminNotice()}
 ${v22Kpis([['doc','Events (30 days)','1,284','All event types',''],['check','Successful','1,261','98.2%','pos'],['shield','Blocked','23','Rate-limit & policy','warn'],['users','Active admins','4','2 with super-admin','']])}
 <section class="v22-card"><div class="v22-filters"><label class="v22-search">${ic('search')}<input id="v22-audit-search" placeholder="Search action, actor or reference"></label>${v22Sel('v22-audit-type',['All event types','Configuration','Data','Access','Subscription'])}${v22Sel('',['Last 30 days','Last 7 days','Last 90 days'])}</div>
 <div class="v22-timeline" id="v22-audit-list">${V22_AUDIT.map(r=>`<div class="v22-tl" data-type="${r[5]}">${cic(r[6],30)}<div class="v22-tl-main"><b class="mono">${r[2]}</b><small><span class="v22-actor">${r[1]}</span> · ${r[3]} · ${r[5]}</small></div><time>${r[0]}</time>${v22Status(r[4])}</div>`).join('')}</div>
 <p class="v22-callout">${cic('lock',20)} Audit records are append-only in production. This page contains static sample events; no real security monitoring is connected.</p></section></div>`}

/* ---------------- Admin: System settings ---------------- */
function adminSettings(){const ints=[['key','Authentication','Pending','Identity provider / OTP'],['idcard','KYC provider','Pending','First subscription gate'],['rupee','Payment gateway','Pending','Hosted checkout + webhooks'],['db','NAV source','Manual for now','Excel / CSV staging'],['mail','Email / SMS','Pending','Consent + delivery receipts'],['brain','AI model','Pending','Grounded server-side gateway']];
 return `<div class="v22 v22-adm">${v22Head('System Settings','Review environment defaults, access controls and operational configuration.','<span class="v22-pill warn lg">Demo config</span>','ADMIN · SYSTEM')}${adminNotice()}
 <div class="v22-sys-two"><section class="v22-card"><div class="v22-card-head"><h2>Platform configuration</h2><button type="button" class="v22-row-btn" data-action="settings-edit">${ic('sliders')} Edit</button></div><div class="v22-kv icons">${[['globe','Platform name','Mod Alpha'],['clock','Default timezone','Asia/Kolkata'],['rupee','Default currency','INR (₹)'],['calendar','SIP date model','One common platform date'],['upload','NAV ingestion','Manual Excel / CSV upload'],['plug','Environment','Local test prototype']].map(x=>`<div>${cic(x[0],24)}<span>${x[1]}</span><b>${x[2]}</b></div>`).join('')}</div></section>
 <section class="v22-card"><div class="v22-card-head"><h2>Access &amp; security</h2></div><div class="v22-kv icons">${[['key','Admin MFA','Required in production','ok'],['users','Role-based access','Admin / Super Admin','ok'],['clock','Session policy','To be configured','warn'],['lock','Encryption','KMS integration pending','warn'],['shield','Secrets','Secrets manager pending','warn'],['doc','Audit trail','Required','ok']].map(x=>`<div>${cic(x[0],24)}<span>${x[1]}</span><b class="t-${x[3]}">${x[2]}</b></div>`).join('')}</div></section></div>
 <section class="v22-card"><div class="v22-card-head"><div><h2>Integration readiness</h2><p>1 of ${ints.length} integrations ready for launch</p></div><div class="v22-gate-meter"><i class="v22-bar big"><em style="width:${100/ints.length}%"></em></i></div></div><div class="v22-ints">${ints.map(x=>`<article>${cic(x[0],36)}<div><b>${x[1]}</b><small>${x[3]}</small></div>${v22Status(x[2])}</article>`).join('')}</div></section></div>`}

/* ---------------- Workspace top bar: icons, notifications ---------------- */
const V22_NOTIFS=[['calendar','November SIP date published','12 Nov 2026 is the recommended date.','2h ago',1],['chart','Small caps gained momentum','New AI insight is available.','5h ago',1],['crown','Upgrade to Pro','Unlock unlimited AI queries.','1d ago',0]];
(function(){const base=shell;shell=function(role,active,content){base(role,active,content);
 const s=document.querySelector('.workspace-search>span');if(s)s.innerHTML=ic('search');
 const up=document.querySelector('.workspace-actions .upgrade-link');
 if(up){if(role==='admin')up.outerHTML=`<span class="v22-role-chip">${cic('shield',20)} Admin Console</span>`;else{up.classList.add('v22-upgrade');up.innerHTML=`${cic('crown',22)}<span>Upgrade Plan</span>`}}
 const bell=document.querySelector('.workspace-actions .icon-action');
 if(bell){const unread=V22_NOTIFS.filter(n=>n[4]).length;bell.classList.add('v22-bell');bell.setAttribute('aria-label',`Notifications (${unread} unread)`);bell.innerHTML=`${ic('bell')}<em class="v22-bell-badge">${unread}</em>`;bell.setAttribute('data-v22-bell','');
  bell.insertAdjacentHTML('afterend',`<div class="v22 v22-notif-pop" id="v22-notif-pop" hidden><div class="v22-np-head"><b>Notifications</b><button type="button" data-v22-markread>Mark all as read</button></div>${V22_NOTIFS.map(n=>`<a class="v22-np-item ${n[4]?'unread':''}" href="#/${role}/${role==='admin'?'notifications':'chat'}">${cic(n[0],30)}<div><b>${n[1]}</b><small>${n[2]}</small></div><time>${n[3]}</time></a>`).join('')}<a class="v22-np-all" href="#/${role}/${role==='admin'?'notifications':'settings'}" ${role==='user'?'data-v22-notifsettings':''}>${role==='admin'?'Manage notifications':'Notification settings'} ${ic('arrowR')}</a></div>`);bell.parentElement.style.position='relative'}
 const chev=document.querySelector('.profile-menu>b');if(chev)chev.innerHTML=ic('chevDown');
}})();

document.addEventListener('click',e=>{
 const t=e.target;let b;
 const pop=document.getElementById('v22-notif-pop');
 if(t.closest('[data-v22-bell]')){e.stopPropagation();if(pop)pop.hidden=!pop.hidden;return}
 if(pop&&!pop.hidden&&!t.closest('#v22-notif-pop'))pop.hidden=true;
 if(t.closest('[data-v22-markread]')){document.querySelectorAll('.v22-np-item.unread').forEach(x=>x.classList.remove('unread'));V22_NOTIFS.forEach(n=>n[4]=0);document.querySelector('.v22-bell-badge')?.remove();return}
 if(t.closest('[data-v22-notifsettings]')){settingsTab='notifications'}
 if((b=t.closest('[data-v22-prevtab]'))){b.parentElement.querySelectorAll('button').forEach(x=>x.classList.toggle('active',x===b));b.closest('.v22-card').querySelectorAll('[data-prev]').forEach(x=>x.hidden=x.dataset.prev!==b.dataset.v22Prevtab);return}
 if((b=t.closest('[data-v22-segpick]'))){b.parentElement.querySelectorAll('button').forEach(x=>x.classList.toggle('active',x===b));return}
 if((b=t.closest('[data-v22-helpcat]'))){v22HelpCat=b.dataset.v22Helpcat;b.parentElement.querySelectorAll('button').forEach(x=>x.classList.toggle('active',x===b));document.getElementById('v22-help-list').innerHTML=v22HelpList();return}
 if(t.closest('[data-v22-support]')){const em=document.getElementById('support-email').value.trim(),msg=document.getElementById('support-message').value.trim();if(!/^\S+@\S+\.\S+$/.test(em)){notify('Enter a valid email address.');return}if(msg.length<10){notify('Please describe your question (at least 10 characters).');return}document.getElementById('v22-support-ok').hidden=false;document.getElementById('support-message').value='';document.getElementById('v22-msg-count').textContent='0';notify('Demo support request recorded locally (not sent).');return}
 if((b=t.closest('[data-v22-day]'))){b.parentElement.querySelectorAll('button').forEach(x=>x.classList.toggle('active',x===b));const n=Number(b.dataset.v22Day),sfx=n%100>=11&&n%100<=13?'th':({1:'st',2:'nd',3:'rd'}[n%10]||'th');document.getElementById('admin-sip-day').value=n;document.getElementById('v22-day-label').textContent=n+sfx;return}
 if(t.closest('[data-action="validate-date"]')){setTimeout(()=>{document.querySelectorAll('#v22-steps>div').forEach((x,i)=>x.classList.toggle('done',i<3))},0)}
 if(t.closest('[data-v22-confirm-publish],[data-confirm-publish]')){setTimeout(()=>document.querySelectorAll('#v22-steps>div').forEach(x=>x.classList.add('done')),0)}
},true);
document.addEventListener('input',e=>{const t=e.target;
 if(t.id==='v22-help-q'){v22HelpQ=t.value;document.getElementById('v22-help-list').innerHTML=v22HelpList()}
 if(t.id==='support-message'){const c=document.getElementById('v22-msg-count');if(c)c.textContent=t.value.length}
 if(t.id==='v22-sub-search')v22FilterSubs();
 if(t.id==='v22-audit-search')v22FilterAudit();
});
document.addEventListener('change',e=>{const t=e.target;
 if(t.id==='v22-sub-state'||t.id==='v22-sub-plan')v22FilterSubs();
 if(t.id==='v22-audit-type')v22FilterAudit();
 if(t.matches('[data-v22-gate]')){const all=[...document.querySelectorAll('[data-v22-gate]')],n=all.filter(x=>x.checked).length;document.getElementById('v22-gate-count').textContent=n;document.getElementById('v22-gate-bar').style.width=(n/all.length*100)+'%';if(n===all.length)notify('All release gates checked (demo). Production approval still requires sign-off.')}
 if(t.matches('[data-v22-chan]'))t.closest('.v22-chan')?.classList.toggle('on',t.checked);
 if(t.id==='nav-file'){const n=document.getElementById('v22-file-name');if(n)n.textContent=t.files[0]?`${t.files[0].name} · ${(t.files[0].size/1024).toFixed(0)} KB`:'No file selected';document.querySelector('.v22-pipeline>div:nth-child(1)')?.classList.add('done')}
});
function v22FilterSubs(){const q=(document.getElementById('v22-sub-search')?.value||'').toLowerCase(),st=document.getElementById('v22-sub-state')?.value,pl=document.getElementById('v22-sub-plan')?.value;document.querySelectorAll('#v22-sub-table tbody tr').forEach(r=>{r.hidden=!(r.innerText.toLowerCase().includes(q)&&(st==='All states'||r.dataset.state===st)&&(pl==='All plans'||r.dataset.plan===pl))})}
function v22FilterAudit(){const q=(document.getElementById('v22-audit-search')?.value||'').toLowerCase(),ty=document.getElementById('v22-audit-type')?.value;document.querySelectorAll('#v22-audit-list .v22-tl').forEach(r=>{r.hidden=!(r.innerText.toLowerCase().includes(q)&&(ty==='All event types'||r.dataset.type===ty))})}
document.addEventListener('dragover',e=>{if(e.target.closest?.('.v22-drop.big')){e.preventDefault()}});
document.addEventListener('drop',e=>{const d=e.target.closest?.('.v22-drop.big');if(!d)return;e.preventDefault();const inp=document.getElementById('nav-file');if(e.dataTransfer.files.length){inp.files=e.dataTransfer.files;inp.dispatchEvent(new Event('change',{bubbles:true}))}});
route();

/* incoming flow lines always run up to the AI engine card, whatever the screen width */
function v22FitFibers(){const conn=document.querySelector('.v22-conn.fibers'),svg=conn&&conn.querySelector('svg'),core=document.querySelector('.v22-stage.engine .v22-core');if(!svg||!core)return;
 if(getComputedStyle(conn).flexDirection==='column'||innerWidth<=900){svg.style.width='';svg.style.marginRight='';return}
 svg.style.width='';svg.style.marginRight='';const ext=Math.max(0,Math.round(core.getBoundingClientRect().left-conn.getBoundingClientRect().right+1));
 svg.style.setProperty('width',(conn.clientWidth+ext)+'px','important');svg.style.setProperty('margin-right',(-ext)+'px','important')}
addEventListener('resize',()=>requestAnimationFrame(v22FitFibers));
