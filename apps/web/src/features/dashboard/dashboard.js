/* ==========================================================================
   Feature: user dashboard (#/user/overview)
   KPI tiles, top-funds chart, the SIP calendar with the recommended day and the
   reminder card, quick what-if estimate and latest AI insights.
   ========================================================================== */

/** Selected period on the dashboard chart. */
let v22DashPeriod='5Y';

/** Illustrative dashboard chart (no dataset). */
function v22DashChartSample(period){
 const n=18,mk=(seed,end,amp)=>v22Seeded(seed,n,-10,end,amp);
 const scale={'1Y':.35,'3Y':.65,'5Y':1,'10Y':1.15}[period]||1;
 const s1=mk(7,52*scale,7),s2=mk(13,41*scale,5),s3=mk(29,30*scale,4);
 const labels={'1Y':['Nov 25','Jan','Mar','May','Jul','Sep'],'3Y':['2023','2024','2025','2026'],'5Y':['2021','2022','2023','2024','2025','2026'],'10Y':['2016','2018','2020','2022','2024','2026']}[period];
 const tip=`<small>${period==='1Y'?'Oct 2026':'Dec 2026'}</small>${[['#2f8bff','Quant Small Cap',(48.2*scale)],['#f5b13d','SBI Contra',(36.1*scale)],['#d946ef','HDFC Mid Cap',(28.9*scale)]].map(x=>`<div><i style="--c:${x[0]}"></i><span>${x[1]}</span><b>${x[2].toFixed(1)}%</b></div>`).join('')}`;
 return v22Chart({w:580,h:330,pad:{l:50,r:20,t:20,b:40},yMin:-20,yMax:60,yTicks:[-20,0,20,40,60],yFmt:v=>v+'%',xLabels:labels,xPos:labels.map((_,i)=>50+i*(580-50-20-60)/(labels.length-1)),label:'Illustrative top fund performance',
  series:[{values:s1,color:'#2f8bff',area:.45,width:3,dots:true,r:4.2,endDot:7,glow:'#2f8bff'},{values:s2,color:'#14d9c5',width:3,dots:true,r:4.2,endDot:7,glow:'#14d9c5'},{values:s3,color:'#d946ef',width:3,dots:true,r:4.2,endDot:7,glow:'#d946ef'}],
  overlays:[{x:300,y:14,cls:'v22-multi-tip',html:tip}]});
}

/** Month shown in the SIP calendar. */
let v22CalMonth={y:2026,m:9};

/** Illustrative KPI tiles (no dataset). */
function v22UserKpisSample(){return [['trophy','gold','Top Performing Fund','(5Y Returns)','32.4%','Quant Small Cap Fund','Equity'],['calendar','violet','Best AI Investment Date','This Month','12th','+2.8% vs fixed SIP',''],['bars','blue','Average Category Return','(Small Cap)','24.1%','5Y CAGR',''],['db','teal','Funds Tracked','In Our Database','8,500+','Mutual Funds','']]}

/** Day the user picked in the calendar. */
let v22PickDay=null;

/** Current reminder choice (Mod Alpha date or custom). */
function v22ReminderState(){return (window.MA_REMINDER&&MA_REMINDER.get())||{mode:'modalpha',day:null}}

/** Reminder card next to the calendar (Set Reminder). */
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

/** Calendar legend and alternative good days. */
function v22CalFooter(SP,MN){
 const cls=['pink','green','purple'];
 return `<div class="v22-cal-foot"><div class="v22-cal-foot-head"><b>Other good dates</b><span>Tap a day to choose your own reminder date</span></div>
  <div class="v22-alt-chips">${SP.alts.map((a,i)=>`<button type="button" class="v22-alt-chip ${cls[i]}${v22PickDay===a[0]?' on':''}" data-v22-pick="${a[0]}"><i></i><span>${a[0]} ${MN}</span><b>+${a[1]}%</b></button>`).join('')}</div>
  <div class="v22-cal-legend"><span><i class="lg-best"></i>Best</span><span><i class="lg-good"></i>Good</span><span><i class="lg-pick"></i>Your pick</span></div></div>`;
}

/** Month calendar with the recommended day highlighted. */
function v22Calendar(){
 const {y,m}=v22CalMonth,first=new Date(y,m,1).getDay(),days=new Date(y,m+1,0).getDate(),prev=new Date(y,m,0).getDate();
 const sp=v22SipFor(y,m),isOct=!!sp,good={};if(sp)sp.alts.forEach((a,i)=>good[a[0]]=['pink','green','purple'][i]);
 const cells=[];for(let i=0;i<42;i++){const d=i-first+1;if(d<1)cells.push(`<span class="mute">${prev+d}</span>`);else if(d>days)cells.push(`<span class="mute">${d-days}</span>`);else cells.push(`<span role="button" tabindex="0" data-v22-pick="${d}" aria-label="${d} ${V22_MON[m]} ${y}" class="${isOct&&d===sp.day?'sel':isOct&&good[d]?'good '+good[d]:''}${v22PickDay===d&&!(isOct&&d===sp.day)?' pick':''}">${d}</span>`)}
 return `<div class="v22-cal"><div class="v22-cal-week">${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(x=>`<span>${x}</span>`).join('')}</div><div class="v22-cal-days">${cells.join('')}</div></div>`;
}

/** User dashboard screen. */
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

/** Quick estimate result. */
function v22EstHTML(r){return `<div class="v22-est-main"><small>Estimated Value</small><b>${inr(r.value)}</b></div><div><small>Total Returns</small><b class="pos">+${r.ret.toFixed(1)}%</b></div><div><small>CAGR</small><b class="pos">${r.cagr.toFixed(1)}%</b></div><div class="sep"><small>Time Period</small><b>${r.yrs.toFixed(1)} years</b></div>${v22EstBars(r)}`}

/** Mod Alpha vs traditional SIP bars. */
function v22EstBars(r){const inv=r.value/(1+r.ret/100),w=Math.max(6,Math.min(100,inv/r.value*100));return `<div class="v22-est-bars" aria-hidden="true"><div><span>Invested</span><i style="width:${w.toFixed(1)}%"></i><b>${inr(Math.round(inv))}</b></div><div><span>Value today</span><i class="now" style="width:100%"></i><b>${inr(r.value)}</b></div></div>`}

/** Run the quick what-if on the dashboard. */
function v22QuickCalc(open){const d=v22ParseDate(document.getElementById('quick-date')?.value),a=v22Num(document.getElementById('quick-amount')?.value);if(!d||d>V22_ASOF){notify('Enter a valid past date as dd/mm/yyyy.');return}if(!a||a<500){notify('Enter an amount of at least ₹500.');return}document.getElementById('v22-est').innerHTML=v22EstHTML(v22Lump(a,d));if(open){v22WhatIf={date:v22FmtDate(d),amount:a};go('user/whatif')}}

/** Top-funds cumulative return chart from the dataset (falls back to the sample). */
function v22DashChart(period){
 const M=V22D.model;if(!M)return v22DashChartSample(period);
 const top=M.funds.filter(f=>f.returns[5]!=null).sort((a,b)=>b.returns[5]-a.returns[5]).slice(0,3),cols=['#2f8bff','#14d9c5','#d946ef'],tcol=['#2f8bff','#f5b13d','#d946ef'];
 const ser=top.map(f=>{const n=M.navBy[f.id],L=n.v.length-1,j=Math.max(0,v22NavAt(n,v22PeriodStart(n.d[L],period)));const idx=v22Sample(n,j,L,18);return{f,vals:idx.map(k=>(n.v[k]/n.v[j]-1)*100),dates:idx.map(k=>n.d[k])}});
 const all=ser.flatMap(s=>s.vals),hi=v22NiceMax(Math.max(...all)*1.05),lo=Math.min(0,Math.floor(Math.min(...all)/(hi/4))*(hi/4)),ticks=[];for(let v=lo;v<=hi+1e-9;v+=hi/4)ticks.push(+v.toFixed(0));
 const W=580,l=56,r=20,d0=ser[0].dates,long=['3Y','5Y','10Y'].includes(period),lab=[],pos=[];d0.forEach((ds,i)=>{const d=v22D(ds),k=long?d.getUTCFullYear():d.getUTCMonth(),p=i?v22D(d0[i-1]):null;if(i&&(long?p.getUTCFullYear()!==k:p.getUTCMonth()!==k)){lab.push(long?String(k):V22_MON[k]);pos.push(l+i*(W-l-r)/(d0.length-1))}});
 const tip=`<small>${v22Fmt(d0.at(-1))} · ${period} return</small>${ser.map((s,i)=>`<div><i style="--c:${cols[i]}"></i><span>${esc(s.f.short)}</span><b>${s.vals.at(-1)>=0?'+':''}${s.vals.at(-1).toFixed(1)}%</b></div>`).join('')}`;
 return v22Chart({w:W,h:330,pad:{l,r,t:20,b:40},yMin:lo,yMax:hi,yTicks:ticks,yFmt:v=>v+'%',xLabels:lab,xPos:pos,label:'Top funds cumulative return from NAV',series:ser.map((s,i)=>({values:s.vals,color:cols[i],area:i===0?.45:0,width:3,dots:true,r:4,endDot:7,glow:cols[i]})),overlays:[{x:W*.08,y:14,cls:'v22-multi-tip',html:tip}]})
  +`<div class="v22-dash-legend">${ser.map((s,i)=>`<a class="v22-dl-item" href="#/user/fund/${encodeURIComponent(s.f.id)}">${v22FundLogo(s.f)}<div class="v22-dl-txt"><b>${esc(s.f.short)}</b><em><i style="--c:${cols[i]}"></i>${s.vals.at(-1)>=0?'+':''}${s.vals.at(-1).toFixed(1)}% <small>· ${period}</small></em></div></a>`).join('')}</div>`;
}

/** Recommended SIP date for a month. */
function v22SipFor(y,m){const r=V22D.model?.sip.find(x=>x.month===`${y}-${String(m+1).padStart(2,'0')}`);if(!V22D.model)return y===2026&&m===9?{day:12,uplift:2.8,alts:[[5,1.6],[20,1.4],[28,1.2]]}:null;if(!r)return null;return{day:r.recommended_day,uplift:r.uplift_pct??0,alts:[[r.alt_day_1,r.alt_uplift_1],[r.alt_day_2,r.alt_uplift_2],[r.alt_day_3,r.alt_uplift_3]].filter(a=>a[0])}}

/** KPI tiles from the dataset (falls back to the sample). */
function v22UserKpis(){const M=V22D.model;if(!M)return v22UserKpisSample();const t=M.funds.filter(f=>f.returns[5]!=null).sort((a,b)=>b.returns[5]-a.returns[5])[0];const a=v22D(M.asOf),sp=v22SipFor(a.getUTCFullYear(),a.getUTCMonth());const cat=t?.category,peers=M.funds.filter(f=>f.category===cat&&f.returns[5]!=null),avg=peers.reduce((s,f)=>s+f.returns[5],0)/(peers.length||1);
 return [['trophy','gold','Top Performing Fund','(5Y Returns)',t?t.returns[5].toFixed(1)+'%':'—',t?t.name:'—',t?t.type:''],['calendar','violet','Best AI Investment Date','This Month',sp?sp.day+(sp.day%10===1&&sp.day!==11?'st':sp.day%10===2&&sp.day!==12?'nd':sp.day%10===3&&sp.day!==13?'rd':'th'):'—',sp?`+${sp.uplift}% vs fixed SIP`:'Not published',''],['bars','blue','Average Category Return',`(${cat||'—'})`,avg.toFixed(1)+'%','5Y CAGR',''],['db','teal','Funds Tracked','In Our Database',M.funds.length.toLocaleString('en-IN'),'Mutual Funds','']]}
