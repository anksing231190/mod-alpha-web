/* ==========================================================================
   Shared: charts
   SVG line / bar / combined charts used by the dashboard, fund pages, calculators
   and the admin console, plus the hover tooltip that follows the pointer.
   ========================================================================== */

/** Crosshair data per chart id (filled by v22Chart when o.crosshair is set). */
const V22_XH={};

/** Line / area chart with grid, axis labels and hover points. */
function v22Chart(o){
 const W=o.w||1000,H=o.h||360,P=Object.assign({l:56,r:20,t:16,b:40},o.pad||{}),gid='c'+Math.random().toString(36).slice(2,8);
 const yMin=o.yMin,yMax=o.yMax,iw=W-P.l-P.r,ih=H-P.t-P.b;
 // Value → y coordinate.
 const Y=v=>P.t+ih-(v-yMin)/(yMax-yMin)*ih;
 // Point index → x coordinate.
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
 // crosshair data (shared/chart-crosshair.js): x/y of every point, in viewBox units
 let xh='';if(o.crosshair&&(o.series||[]).length){const ks=Object.keys(V22_XH);if(ks.length>40)ks.slice(0,ks.length-40).forEach(k=>delete V22_XH[k]);V22_XH[gid]={W,H,top:P.t,bot:P.t+ih,labels:o.crosshair.labels||[],fmt:o.crosshair.fmt||o.yFmt||(v=>v),series:o.series.map(se=>{const n=se.values.length;return{name:se.name||'',color:se.dotColor||se.color||(se.stops?se.stops.at(-1)[1]:'#60a5fa'),v:se.values,x:se.values.map((_,i)=>se.xs?se.xs[i]:se.bandX?P.l+(i+.5)*iw/n:X(i,n)),y:se.values.map(Y)}})};xh=` data-ma-xh="${gid}"`}
 const ov=(o.overlays||[]).map(x=>{let px,py;if(x.at){const se=o.series[x.at[0]],n=se.values.length,i=x.at[1]<0?n+x.at[1]:x.at[1];px=se.bandX?P.l+(i+.5)*iw/n:X(i,n);py=Y(se.values[i])}else{px=x.x;py=x.y}return `<div class="v22-ov ${x.cls||''}" style="left:${(px/W*100).toFixed(2)}%;top:${(py/H*100).toFixed(2)}%">${x.html}</div>`}).join('');
 return `<div class="v22-chart ${o.cls||''}"${xh} style="aspect-ratio:${W}/${H}">${s}${ov}${xh?'<div class="ma-xh" aria-hidden="true"><i class="ma-xh-line"></i><b class="ma-xh-date"></b><div class="ma-xh-tip"></div></div>':''}</div>`;
}

/** Bar + line combined chart. */
function v22Mix(stops,t){const hex=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));for(let i=0;i<stops.length-1;i++){const[a,ca]=stops[i],[b,cb]=stops[i+1];if(t>=a&&t<=b){const u=(t-a)/(b-a||1),A=hex(ca),B=hex(cb);return'#'+A.map((v,j)=>Math.round(v+(B[j]-v)*u).toString(16).padStart(2,'0')).join('')}}return stops.at(-1)[1]}

/** Tiny sparkline. */
function v22Spark(values,color,extra=''){const w=120,h=48,min=Math.min(...values),max=Math.max(...values);const pts=values.map((v,i)=>[4+i*(w-8)/(values.length-1),h-6-(v-min)/(max-min||1)*(h-14)]);const gid='sp'+Math.random().toString(36).slice(2,7);return `<svg class="v22-spark ${extra}" viewBox="0 0 ${w} ${h}" aria-hidden="true"><defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${color}" stop-opacity=".28"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></linearGradient></defs><path d="M${pts.map(p=>p.map(n=>n.toFixed(1)).join(' ')).join(' L')} L${w-4} ${h} L4 ${h}Z" fill="url(#${gid})"/><polyline points="${pts.map(p=>p.join(',')).join(' ')}" fill="none" stroke="${color}" stroke-width="1.4" stroke-linejoin="round" stroke-linecap="round" style="filter:drop-shadow(0 0 4px ${color})"/></svg>`}

/** Round a maximum up to a nice axis value. */
function v22NiceMax(v){if(v<=0)return 1;const p=Math.pow(10,Math.floor(Math.log10(v))),n=v/p;return(n<=1?1:n<=2?2:n<=2.5?2.5:n<=5?5:10)*p}

/** Split a date range into chart buckets (days / weeks / months). */
function v22Buckets(period,asOf){if(period&&typeof period==='object')return v22RangeBuckets(period);const end=v22D(asOf),out=[];
 if(period==='7D'||period==='30D'){const n=period==='7D'?7:31;for(let i=n-1;i>=0;i--){const d=new Date(end);d.setUTCDate(d.getUTCDate()-i);const s=v22Iso(d);out.push({from:s,to:s,label:`${d.getUTCDate()} ${V22_MON[d.getUTCMonth()]}`})}}
 else if(period==='3M'){for(let i=12;i>=0;i--){const t=new Date(end);t.setUTCDate(t.getUTCDate()-i*7);const f=new Date(t);f.setUTCDate(f.getUTCDate()-6);out.push({from:v22Iso(f),to:v22Iso(t),label:`${t.getUTCDate()} ${V22_MON[t.getUTCMonth()]}`})}}
 else{for(let i=11;i>=0;i--){const f=new Date(Date.UTC(end.getUTCFullYear(),end.getUTCMonth()-i,1)),t=new Date(Date.UTC(end.getUTCFullYear(),end.getUTCMonth()-i+1,0));out.push({from:v22Iso(f),to:v22Iso(t>end?end:t),label:`${V22_MON[f.getUTCMonth()]} ${String(f.getUTCFullYear()).slice(2)}`})}}
 return out}

/** Count rows whose date falls in a bucket. */
function v22CountIn(sorted,key,from,to){let lo=0,hi=sorted.length;while(lo<hi){const m=(lo+hi)>>1;if(sorted[m][key]<from)lo=m+1;else hi=m}let n=0;for(let i=lo;i<sorted.length&&sorted[i][key]<=to;i++)n++;return n}

/** Sum payments in a bucket. */
function v22SumPays(from,to){let s=0;for(const p of V22D.model.pays){if(p[0]>to)break;if(p[0]>=from)s+=p[1]}return s}

/** Admin growth / subscription chart from the dataset. */
function v22AdminChart(kind,period){
 const M=V22D.model,B=v22Buckets(period,M.asOf),n=B.length;
 let bars,line,lineMax,barMax,tip,legend;
 if(kind==='users'){bars=B.map(b=>v22CountIn(M.users,'signup_date',b.from,b.to));line=B.map(b=>v22CountIn(M.users,'signup_date','0000',b.to));}
 else{bars=B.map(b=>v22CountIn(M.subs,'start_date',b.from,b.to));line=B.map(b=>v22SumPays(b.from,b.to));}
 barMax=v22NiceMax(Math.max(...bars)*1.15);lineMax=v22NiceMax(Math.max(...line)*1.05);
 const lineScaled=line.map(v=>v/lineMax*barMax),peak=bars.indexOf(Math.max(...bars));
 const step=Math.max(1,Math.ceil(n/7)),lblIdx=B.map((_,i)=>i).filter(i=>i%step===0||i===n-1).filter((i,k,a)=>!(k===a.length-2&&a[k+1]-i<step*.6));
 const W=540,l=kind==='users'?46:42,r=kind==='users'?50:54,iw=W-l-r;
 const wk=period==='3M'||(typeof period==='object'&&B.length&&B[0].from!==B[0].to&&B[0].label.indexOf(' ')>0&&!/\d{2}$/.test(B[0].label));const tipAt=k=>kind==='users'?`<small>${B[k].tip||B[k].label}${period==='3M'?' (week)':''}</small><div><i style="--c:#3b82f6"></i><span>New Users: ${bars[k].toLocaleString('en-IN')}</span></div><div><i style="--c:#c04cf5"></i><span>Total Users: ${line[k].toLocaleString('en-IN')}</span></div>`:`<small>${B[k].tip||B[k].label}${period==='3M'?' (week)':''}</small><div><i style="--c:#3b82f6"></i><span>Subscriptions: ${bars[k]}</span></div><div><i style="--c:#c04cf5"></i><span>Revenue: ${inr(line[k])}</span></div>`;let def=n-1;while(def>0&&!bars[def])def--;V22_HOV[kind]={n,l,iw,W,tips:B.map((_,k)=>tipAt(k)),def};tip=tipAt(def);
 return v22Chart({w:W,h:220,pad:{l,r,t:12,b:34},yMin:0,yMax:barMax,yTicks:[0,1,2,3,4].map(i=>barMax*i/4),yFmt:v=>v>=1000?(v/1000)+'K':Math.round(v),yRight:{ticks:[0,1,2,3,4].map(i=>kind==='users'?(i?((lineMax*i/4)>=1000?((lineMax*i/4)/1000).toFixed(lineMax>=4e4?0:1)+'K':Math.round(lineMax*i/4)):'0'):v22Short(lineMax*i/4))},xLabels:lblIdx.map(i=>B[i].label),xPos:lblIdx.map(i=>l+(i+.5)*iw/n),vGrid:false,label:kind==='users'?'User growth':'Subscription trends',bars:{values:bars,purple:[def]},series:[{values:lineScaled,color:'#c04cf5',width:2.6,dots:Math.max(1,Math.round(n/8)),r:4.5,endDot:6,glow:'#c04cf5',bandX:true}],overlays:[{x:l+(def+.5)*iw/n,y:6,cls:'v22-multi-tip compact v22-tip-auto v22-hov-tip '+(def>n*.6?'left':''),html:tip},{x:l+(def+.5)*iw/n,y:0,cls:'v22-hov-line',html:''}]}).replace('<div class="v22-chart','<div data-v22-hov="'+kind+'" class="v22-chart v22-hov');
}

/** Hover tooltip element. */
const V22_HOV={};

/** Show the tooltip for the hovered chart point. */
/* hover: tooltip + highlighted bar follow the pointer */
function v22HovSet(el,i){const h=V22_HOV[el.dataset.v22Hov];if(!h)return;i=Math.max(0,Math.min(h.n-1,i));if(el._hi===i)return;el._hi=i;const x=(h.l+(i+.5)*h.iw/h.n)/h.W*100;const tip=el.querySelector('.v22-hov-tip'),ln=el.querySelector('.v22-hov-line');if(tip){tip.innerHTML=h.tips[i];tip.style.left=x+'%';tip.classList.toggle('left',i>h.n*.6)}if(ln){ln.style.left=x+'%';ln.classList.toggle('on',i!==h.def||el.matches(':hover'))}el.querySelectorAll('rect[data-i]').forEach(r=>{const on=+r.dataset.i===i;r.classList.toggle('hov',on);r.setAttribute('fill',r.getAttribute('fill').replace(/(b|bp)\)$/,on?'bp)':'b)'))})}

/* ---------- start-up steps (run once by core/boot.js, in this global order) ---------- */

MA_STARTUP(306, "pointermove listener: [data-v22-hov]", () => {
document.addEventListener('pointermove',e=>{const el=e.target.closest?.('[data-v22-hov]');if(!el)return;const h=V22_HOV[el.dataset.v22Hov];if(!h)return;const r=el.getBoundingClientRect(),x=(e.clientX-r.left)/r.width*h.W;v22HovSet(el,Math.floor((x-h.l)/h.iw*h.n))});
});

MA_STARTUP(307, "pointerout listener: [data-v22-hov]", () => {
document.addEventListener('pointerout',e=>{const el=e.target.closest?.('[data-v22-hov]');if(!el||el.contains(e.relatedTarget))return;const h=V22_HOV[el.dataset.v22Hov];if(h){v22HovSet(el,h.def);el.querySelector('.v22-hov-line')?.classList.remove('on')}});
});
