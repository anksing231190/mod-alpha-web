/* ==========================================================================
   Feature: Mod Alpha SIP vs traditional SIP (#/user/sip)
   Compares a monthly SIP on Mod Alpha's recommended dates with the same SIP on a fixed day.
   ========================================================================== */

/** Illustrative monthly returns: Mod Alpha dates vs fixed date. */
let V22_R_MOD, V22_R_TRAD; // set at start-up (step 112)

/** Future value of a monthly SIP for both strategies. */
function v22Sip(amount,start,end){const months=Math.max(1,(end.getFullYear()-start.getFullYear())*12+end.getMonth()-start.getMonth());const fv=r=>amount*((Math.pow(1+r,months)-1)/r)*(1+r);const mod=fv(V22_R_MOD),trad=fv(V22_R_TRAD);const path=r=>Array.from({length:6},(_,k)=>{const m=Math.round(months*k/5);return m?amount*((Math.pow(1+r,m)-1)/r)*(1+r):amount});return{months,invested:amount*months,mod,trad,extra:mod-trad,pct:(mod-trad)/trad*100,yrs:Math.round(months/12*10)/10,modPath:path(V22_R_MOD),tradPath:path(V22_R_TRAD)}}

/** SIP comparison form state. */
let v22SipState={amount:10000,start:'01/01/2021',end:'01/01/2026'};

/** Comparison chart. */
function v22SipChart(r,start,end){
 const yMax=Math.max(4,Math.ceil(r.mod/1e5/4)*4)*1e5,ticks=[0,1,2,3].map(i=>i*yMax/3);
 const y0=start.getFullYear(),y1=end.getFullYear(),years=Array.from({length:6},(_,i)=>String(Math.round(y0+(y1-y0)*i/5)));
 return v22Chart({w:720,h:300,pad:{l:50,r:120,t:22,b:40},yMin:0,yMax,yTicks:ticks,yFmt:v=>v?'₹'+Math.round(v/1e5)+'L':'0',xLabels:years,axisY:true,label:'Illustrative SIP portfolio comparison',
  series:[{values:r.modPath,color:'#2ed3f5',stops:[[0,'#2ed3f5'],[1,'#38bdf8']],width:3.4,dots:true,r:6,glow:'#22d3ee',dotColor:'#54e1ff'},{values:r.tradPath,color:'#b65cf6',stops:[[0,'#a855f7'],[1,'#c084fc']],width:3.4,dots:true,r:6,glow:'#a855f7',dotColor:'#c26bff'}],
  overlays:[{at:[0,-1],cls:'v22-badge cyan',html:inr(r.mod)},{at:[1,-1],cls:'v22-badge purple',html:inr(r.trad)}]});
}

/** Comparison result tiles. */
function v22SipResults(r){return `<div><span>Total Invested</span><b>${inr(r.invested)}</b></div><div><span>MOD Alpha SIP<br>Final Value</span><b>${inr(r.mod)}</b></div><div><span>Traditional SIP<br>Final Value</span><b>${inr(r.trad)}</b></div><div class="extra"><span>Additional Returns</span><b class="pos">+${inr(r.extra)}<small>(+${r.pct.toFixed(1)}% higher returns)</small></b></div>`}

/** SIP comparison screen. */
function sipCompare(){
 const s=v22ParseDate(v22SipState.start),e=v22ParseDate(v22SipState.end),r=v22Sip(v22SipState.amount,s,e);
 return `<div class="v22 v22-sip">
 <header class="v22-title"><h1>MOD Alpha SIP vs Traditional SIP</h1></header>
 <section class="v22-three"><article class="v22-card v22-input-card"><label class="v22-label" for="sip-amount">Monthly SIP Amount</label><div class="v22-field"><span class="v22-rs">₹</span><input id="sip-amount" value="${v22SipState.amount.toLocaleString('en-IN')}" inputmode="numeric" aria-label="Monthly SIP amount"></div><div class="v22-opts">${[[5000,'5K'],[10000,'10K'],[25000,'25K'],[50000,'50K']].map(x=>`<button type="button" data-v22-sip="${x[0]}" class="${v22SipState.amount===x[0]?'active':''}">${x[1]}</button>`).join('')}</div></article>
 <article class="v22-card v22-input-card"><label class="v22-label" for="sip-start">Start Date</label>${v22DateField('sip-start',v22SipState.start,'')}</article>
 <article class="v22-card v22-input-card"><label class="v22-label" for="sip-end">End Date</label>${v22DateField('sip-end',v22SipState.end,'')}</article></section>
 <section class="v22-sip-grid"><article class="v22-card"><div class="v22-card-head"><h2>Portfolio Value Comparison</h2><div class="v22-legend"><span><i style="--c:#2ed3f5"></i>MOD Alpha SIP (AI Dates)</span><span><i style="--c:#b65cf6"></i>Traditional SIP (Fixed Date)</span></div></div><div id="v22-sip-chart">${v22SipChart(r,s,e)}</div></article>
 <article class="v22-card v22-results"><h2 class="v22-h2 sm">Final Results</h2><div class="v22-result-box tall" id="v22-sip-results">${v22SipResults(r)}</div></article></section>
 <p class="v22-note">Illustrative simulation only · Same contribution assumptions · No future-return claim. Mod Alpha does not place investment orders.</p></div>`;
}

/** Run the comparison and redraw. */
function runSip(){
 const a=v22Num(document.getElementById('sip-amount')?.value),s=v22ParseDate(document.getElementById('sip-start')?.value),e=v22ParseDate(document.getElementById('sip-end')?.value);
 if(!a||a<500){notify('Enter a monthly SIP amount of at least ₹500.');return}
 if(!s||!e||e<=s){notify('Enter a valid start and end date (dd/mm/yyyy), end after start.');return}
 v22SipState={amount:a,start:v22FmtDate(s),end:v22FmtDate(e)};const r=v22Sip(a,s,e);
 document.getElementById('v22-sip-chart').innerHTML=v22SipChart(r,s,e);document.getElementById('v22-sip-results').innerHTML=v22SipResults(r);
 document.querySelectorAll('[data-v22-sip]').forEach(b=>b.classList.toggle('active',Number(b.dataset.v22Sip)===a));
}

/* ---------- start-up steps (run once by core/boot.js, in this global order) ---------- */

MA_STARTUP(112, "initialise V22_R_MOD, V22_R_TRAD", () => {
V22_R_MOD = v22SolveRate(117.1377);
V22_R_TRAD = v22SolveRate(68);
});
