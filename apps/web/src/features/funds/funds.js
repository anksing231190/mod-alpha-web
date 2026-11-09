/* ==========================================================================
   Feature: explore funds (#/user/funds) and fund detail (#/user/funds/<id>)
   Search, category chips, paging, fund cards; detail tabs with NAV chart and returns.
   ========================================================================== */

/** Selected category chip and page on Explore Funds. */
let v22Chip='All',v22Page=1;

/** Explore Funds screen: search, chips, sort, cards, pager. */
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
  <div class="v22-spark-box" tabindex="0" aria-label="1-year chart for ${esc(f.short||f.name)}">${v22Spark(v22FundSpark(f,i),sparkColors[(all.indexOf(f))%5])}</div>
  <div class="v22-fund-ret"><b>${f.returns[5].toFixed(1)}%</b><small>5Y CAGR</small></div>
  ${window.MA_FUNDX?MA_FUNDX.rowExtra(f):''}
  <button type="button" class="v22-view" data-fund="${f.id}">View ${ic('arrowR')}</button>
 </article>`).join('')||(window.MA_EMPTY?MA_EMPTY.html({title:'No funds match your search',text:'Try a shorter name, another category or clear the filters.',action:['Show all funds','data-ma-funds-reset'],mood:'think'}):'<div class="v22-empty">No schemes match your filters. Try a broader search.</div>')}</div>
 <nav class="v22-pager" aria-label="Pagination"><button type="button" data-v22-page="${v22Page-1}" ${v22Page===1?'disabled':''} aria-label="Previous page">${ic('chevL')}</button>${Array.from({length:pages},(_,i)=>`<button type="button" data-v22-page="${i+1}" class="${i+1===v22Page?'active':''}">${i+1}</button>`).join('')}<button type="button" data-v22-page="${v22Page+1}" ${v22Page===pages?'disabled':''} aria-label="Next page">${ic('chevR')}</button></nav>
 <p class="v22-note">Sample catalogue · ${all.length} schemes · Returns are illustrative test values, not live performance.</p></div>`;
}

/** Selected period on the fund detail chart. */
let v22DetailPeriod='5Y';

/** Fund detail screen. */
function fundDetail(id){
 const f=D.funds.find(x=>x.id===id)||D.funds[0];selectedFund=f.id;
 // One metric tile.
 const metric=(v,l,c='')=>`<article><b class="${c}">${v}</b><small>${l}</small></article>`;
 // glossary term with an "✦ Explained" card (features/ai/ai-ui.js); plain text without it
 const tm=(l,k)=>window.MA_AI?MA_AI.term(l,k):l;
 return `<div class="v22 v22-detail">
 ${window.MA_FUNDBAR?MA_FUNDBAR.crumbs(f):''}
 <header class="v22-detail-head"><div class="v22-detail-id">${v22FundLogo(f,'lg')}<div><h1>${esc(f.name)}</h1>${v22Tags(f)}</div></div><div class="ma-head-acts">${window.MA_FACTSHEET?MA_FACTSHEET.button(f.id):''}${window.MA_WATCH?MA_WATCH.button(f.id):`<button type="button" class="v22-watch" data-action="watchlist">${ic('star')}<span>Add to Watchlist</span></button>`}</div></header>
 ${window.MA_FUNDBAR?MA_FUNDBAR.bar(f):''}
 <div class="v22-tabs" role="tablist">${[['overview','Overview'],['performance','Performance'],['nav','NAV History'],['ai','AI Insights'],['info','Fund Info']].map((t,i)=>`<button type="button" role="tab" data-tab="${t[0]}" class="${i===0?'active':''}">${t[0]==='ai'&&window.MA_AI?'<span class="ma-spark" aria-hidden="true">✦</span> ':''}${t[1]}</button>`).join('')}</div>
 <section class="v22-metrics">${metric(f.returns[5].toFixed(1)+'%',tm('5Y CAGR','cagr'),'pos')}${metric(f.returns[3].toFixed(1)+'%',tm('3Y CAGR','cagr'),'pos')}${metric(f.returns[1].toFixed(1)+'%','1Y Returns','pos')}${metric((f.sharpe||1.5).toFixed(1),tm('Sharpe Ratio','sharpe'),'pos-soft')}${metric(esc(f.riskLabel||'Moderate'),tm('Risk Level','risk'),'pos')}</section>
 ${typeof maAsOf==='function'?`<p class="ma-asof-line">${ic('info')} Returns as of ${maAsOf()||'the latest NAV'} · NAV source: AMFI · Past performance does not guarantee future returns.</p>`:''}
 <section id="fund-tab-content">${fundTab(f,'overview')}</section></div>`;
}

/** Illustrative NAV chart (no dataset). */
function v22DetailChartSample(f,period){
 const vals=v22DetailSeries(f,period),max=Math.max(...vals),top=Math.ceil(max/100)*100+ (max%100>80?100:0);
 const yMax=Math.max(100,top),step=yMax/5;
 const labels={'1M':['W1','W2','W3','W4'],'3M':['Jul','Aug','Sep','Oct'],'6M':['May','Jun','Jul','Aug','Sep','Oct'],'1Y':['Nov','Jan','Mar','May','Jul','Sep'],'3Y':['2023','2024','2025','2026'],'5Y':['2021','2022','2023','2024','2025','2026']}[period];
 const ret=((vals.at(-1)/vals[0]-1)*100);
 return v22Chart({w:1080,h:330,pad:{l:56,r:22,t:18,b:40},yMin:0,yMax,yTicks:[0,1,2,3,4,5].map(i=>i*step),yFmt:v=>v?'₹'+Math.round(v):'0',xLabels:labels,xPos:labels.map((_,i)=>56+i*(1080-56-22-40)/(labels.length-1)),axisY:true,label:'Illustrative returns performance',
  series:[{name:'NAV',values:vals,stops:[[0,'#3b82f6'],[.45,'#6d6cf6'],[1,'#c84cf0']],areaStops:[[0,'#2563eb'],[.6,'#7c3aed'],[1,'#c026d3']],area:.75,width:3.2,dots:2,r:4.5,endDot:7,glow:'#8b5cf6'}],crosshair:{fmt:v=>'₹'+v.toFixed(2)},
  overlays:[{at:[0,-1],cls:'v22-tip v22-tip-left',html:`<small>${period==='5Y'?'Dec 2026':'Latest'}</small><b>₹${vals.at(-1).toFixed(2)}</b><strong>${ret>=0?'+':''}${(period==='5Y'?f.returns[5]:ret).toFixed(1)}%</strong>`}]});
}

/** Fund detail tab content (overview, returns, risk). */
function fundTab(f,tab){
 if(tab==='overview'||tab==='performance'){
  const invested=10000,cur=Math.round(invested*v22Since(f)/10)*10,tot=(cur/invested-1)*100;
  const sn=f.short||f.name,qs=[`Why did ${sn} rise or fall recently?`,`Is ${sn} risky for a 5-year SIP?`,`How does ${sn} compare with its category?`];
  return `<section class="v22-card v22-perf"><div class="v22-card-head"><h2>Returns Performance</h2>${v22Pills(['1M','3M','6M','1Y','3Y','5Y'],v22DetailPeriod,'data-v22-dperiod')}</div><div id="v22-detail-chart">${v22DetailChart(f,v22DetailPeriod)}</div>${window.MA_AI?MA_AI.chips(qs):''}</section>
  <section class="v22-summary"><article><b class="lav">${inr(invested)}</b><small>Invested on 01 Jan 2021</small></article><article><b class="vio">${inr(cur)}</b><small class="ul">Current Value</small></article><article><b class="pos">+${tot.toFixed(1)}%</b><small>Total Returns</small></article><article><b class="pos">${f.returns[5].toFixed(1)}%</b><small>CAGR</small></article><article><b class="sky">5.7 years</b><small>Time Period</small></article></section>`;
 }
 if(tab==='nav')return `<section class="v22-card"><div class="v22-card-head"><h2>NAV History</h2><span class="v22-muted">Daily NAV</span></div><div class="table-scroll"><table class="v22-table"><thead><tr><th>Date</th><th>NAV</th><th>Change</th><th>Source</th></tr></thead><tbody>${v22DetailSeries(f,'1Y').slice(-12).reverse().map((v,i,a)=>`<tr><td>${String(30-i*2).padStart(2,'0')} Sep 2026</td><td>₹${v.toFixed(2)}</td><td class="${a[i+1]&&v<a[i+1]?'neg':'pos'}">${a[i+1]?((v/a[i+1]-1)*100).toFixed(2)+'%':'—'}</td><td>AMFI</td></tr>`).join('')}</tbody></table></div></section>`;
 if(tab==='ai')return `<section class="v22-insight-row v2"><span class="v22-ins-badge">${v22BrandMark(28)}</span><div class="v22-insight-body"><b>AI Insight</b><p>${esc(f.short)} shows a ${f.returns[5].toFixed(1)}% 5-year CAGR. Review volatility, benchmark (${esc(f.benchmark)}), expense ratio and your horizon before deciding.</p></div></section>`;
 return `<section class="v22-card"><h2 class="v22-h2">Fund Information</h2><div class="v22-info-grid">${[['Scheme name',f.name],['AMC',f.amc],['Category',f.category],['Asset class',f.type],['Plan',f.plan],['Option',f.option],['Benchmark',f.benchmark],['AUM',f.aum],['Inception date',f.inception],['Riskometer',f.risk]].map(([a,b])=>`<div><span>${a}</span><b>${esc(b)}</b></div>`).join('')}</div></section>`;
}

/** Sparkline of a fund's NAV. */
function v22FundSpark(f,i){const n=V22D.model?.navBy[f.id];if(!n||n.v.length<30)return v22Seeded(f.id.charCodeAt(0)+f.id.charCodeAt(2)+i,12,6,22,5);const L=n.v.length-1,j=Math.max(0,v22NavAt(n,v22AddY(n.d[L],1)));return v22Sample(n,j,L,24).map(k=>n.v[k])}

/** Return since a date. */
function v22Since(f){return f.since2021||Math.pow(1+(f.returns[5]||0)/100,5.15)}

/** NAV chart from the dataset (falls back to the sample). */
function v22DetailChart(f,period){
 const n=V22D.model?.navBy[f.id];if(!n||n.v.length<5)return v22DetailChartSample(f,period);
 const L=n.v.length-1,j=Math.max(0,v22NavAt(n,v22PeriodStart(n.d[L],period))),idx=v22Sample(n,j,L,32),vals=idx.map(k=>n.v[k]);
 const yMax=v22NiceMax(Math.max(...vals)*1.08),yMin=Math.min(...vals)>yMax*.5?Math.floor(Math.min(...vals)*.9/(yMax/5))*(yMax/5):0,step=(yMax-yMin)/5;
 const lab=[],pos=[],W=1080,l=56,r=22,iw=W-l-r-40;const long=['3Y','5Y','10Y'].includes(period);
 idx.forEach((k,i)=>{const d=v22D(n.d[k]),key=long?d.getUTCFullYear():d.getUTCMonth();const pk=i?v22D(n.d[idx[i-1]]):null;if(!i||(long?pk.getUTCFullYear()!==key:pk.getUTCMonth()!==key)){lab.push(long?String(key):V22_MON[key]+(period==='1Y'?" '"+String(d.getUTCFullYear()).slice(2):'')+(period==='1M'?' '+d.getUTCDate():''));pos.push(l+i*iw/(idx.length-1))}});
 const thin=lab.length>8?2:1;const ret=(vals.at(-1)/vals[0]-1)*100,yrs=(v22D(n.d[L])-v22D(n.d[j]))/(365.25*864e5),cagr=yrs>=1?(Math.pow(vals.at(-1)/vals[0],1/yrs)-1)*100:null;
 return v22Chart({w:W,h:330,pad:{l,r,t:18,b:40},yMin,yMax,yTicks:[0,1,2,3,4,5].map(i=>yMin+i*step),yFmt:v=>v?'₹'+Math.round(v):'0',xLabels:lab.filter((_,i)=>i%thin===0),xPos:pos.filter((_,i)=>i%thin===0),axisY:true,label:'Fund NAV from test data',
  series:[{name:'NAV',values:vals,stops:[[0,'#3b82f6'],[.45,'#6d6cf6'],[1,'#c84cf0']],areaStops:[[0,'#2563eb'],[.6,'#7c3aed'],[1,'#c026d3']],area:.75,width:3.2,dots:2,r:4.5,endDot:7,glow:'#8b5cf6'}],crosshair:{labels:idx.map(k=>v22Fmt(n.d[k])),fmt:v=>'₹'+v.toFixed(2)},
  overlays:[{at:[0,-1],cls:'v22-tip v22-tip-left',html:`<small>${v22Fmt(n.d[L])}</small><b>₹${vals.at(-1).toFixed(2)}</b><strong>${ret>=0?'+':''}${ret.toFixed(1)}%${cagr!=null?` <em>· ${cagr.toFixed(1)}% CAGR</em>`:''}</strong>`}]});
}

/** NAV series for a period. */
function v22DetailSeries(f,period){const n=V22D.model?.navBy[f.id];if(!n)return v22Seeded(f.id.charCodeAt(1),20,f.nav/2,f.nav,f.nav*.03);const L=n.v.length-1,j=Math.max(0,v22NavAt(n,v22PeriodStart(n.d[L],period)));return v22Sample(n,j,L,40).map(k=>n.v[k])}
