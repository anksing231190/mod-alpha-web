/* ==========================================================================
   Feature: what-if calculator (#/user/whatif)
   "What if you had invested ₹X on date D?" — value today, CAGR and the journey chart.
   ========================================================================== */

/** As-of date for calculator data. */
let V22_ASOF; // set at start-up (step 108)

/** Illustrative yearly returns per fund for the demo calculator. */
let V22_LUMP_CAGR; // set at start-up (step 109)

/** Value of a lump sum after some years. */
function v22Lump(amount,date){const yrs=Math.max(.1,Math.round((V22_ASOF-date)/(365.25*864e5)*10)/10);const mult=Math.pow(1+V22_LUMP_CAGR,yrs);return{yrs,value:amount*mult,gain:amount*(mult-1),ret:(mult-1)*100,cagr:Math.floor(V22_LUMP_CAGR*1000)/10,mult}}

/** CAGR from start and end values. */
function v22SolveRate(target){let lo=0,hi=.06;for(let k=0;k<80;k++){const r=(lo+hi)/2,fv=((Math.pow(1+r,60)-1)/r)*(1+r);fv>target?hi=r:lo=r}return(lo+hi)/2}

/** What-if form state. */
let v22WhatIf={date:'15/01/2021',amount:100000};

/** Investment journey chart. */
function v22JourneyChart(r,amount){
 const n=12,vals=Array.from({length:n},(_,i)=>amount*Math.pow(r.mult,i/(n-1)));
 const yMax=Math.max(5,Math.ceil(r.value/1e5))*1e5;const ticks=[0,1,2,3,4,5].map(i=>i*yMax/5);
 // Short ₹ amount (₹1.2L, ₹3Cr).
 const fmt=v=>!v?'0':v>=1e7?'₹'+(v/1e7).toFixed(v%1e7?1:0)+'Cr':v>=1e5?'₹'+(v/1e5).toFixed(v%1e5?1:0)+'L':'₹'+(v/1e3).toFixed(0)+'K';
 const start=v22ParseDate(v22WhatIf.date)||new Date(2021,0,15),y0=start.getFullYear(),years=Array.from({length:6},(_,i)=>String(Math.round(y0+(2026-y0)*i/5)));
 return v22Chart({w:620,h:310,pad:{l:50,r:24,t:20,b:40},yMin:0,yMax,yTicks:ticks,yFmt:fmt,xLabels:years,axisY:true,label:'Illustrative investment journey',
  series:[{values:vals,stops:[[0,'#22d3ee'],[1,'#38bdf8']],area:.7,areaStops:[[0,'#0ea5e9'],[1,'#22d3ee']],width:3.6,dots:true,r:6,endDot:8,glow:'#22d3ee',dotColor:'#5fe3ff'}],
  overlays:[{at:[0,-1],cls:'v22-tip v22-tip-up',html:`<small>Current Value</small><b>${inr(r.value)}</b>`}]});
}

/** What-if calculator screen. */
function whatIf(){
 const d=v22ParseDate(v22WhatIf.date)||new Date(2021,0,15),r=v22Lump(v22WhatIf.amount,d);
 // Is a preset (1Y / 3Y / 5Y / custom) the current choice?
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

/** Result rows (invested, value, gain, CAGR). */
function v22ResultRows(r){return [['Current Value',inr(r.value),''],['Absolute Gain',inr(r.gain),''],['Total Return','+'+r.ret.toFixed(1)+'%','pos'],['CAGR',r.cagr.toFixed(1)+'%','pos'],['Holding Period',r.yrs.toFixed(1)+' years','']].map(x=>`<div><span>${x[0]}</span><b class="${x[2]}">${x[1]}</b></div>`).join('')}

/** Plain-language summary of the result. */
function v22InsightText(r,d){return `A ${inr(v22WhatIf.amount)} investment on ${d.getDate()} ${V22_MON[d.getMonth()]} ${d.getFullYear()} would have grown to ${inr(r.value)} today — a ${r.cagr.toFixed(1)}% CAGR over ${r.yrs.toFixed(1)} years.`}

/** Run the calculation and redraw the result. */
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

/* ---------- start-up steps (run once by core/boot.js, in this global order) ---------- */

MA_STARTUP(108, "initialise V22_ASOF", () => {
V22_ASOF = new Date(2026,8,30);
});

MA_STARTUP(109, "initialise V22_LUMP_CAGR", () => {
V22_LUMP_CAGR = Math.exp(Math.log(4.44171)/5.7)-1;
});
