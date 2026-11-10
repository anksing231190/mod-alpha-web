/* ==========================================================================
   Feature: landing page (#/landing)
   Hero with the orbit animation, "How Mod Alpha works" flow, features, pricing
   preview, FAQ preview, the faint background animation and the anonymous
   "someone just joined" toast.
   ========================================================================== */

/** 'Rahul K. joined the Mod Alpha community' notification card, rotating every 12 s. Live: GET /public/activity (a first name + last initial and city only for members who opted in, otherwise 'A new member'). Demo: illustrative sample events. */
function initPublicActivityToast(){
 const toast=document.getElementById('public-activity-toast');if(!toast)return;
 const close=toast.querySelector('.activity-toast-close');
 let events=[],index=0,hideTimer=null;
 const hide=()=>{toast.classList.remove('is-visible');clearTimeout(hideTimer);hideTimer=setTimeout(()=>{toast.hidden=true},260)};
 close.onclick=()=>{hide();clearInterval(toast._rotate)};
 // "Rahul Kumar" → "RK"; no name → the α mark
 // "Rahul Kumar" → "Rahul K." (never a full surname)
 const short=n=>{const w=String(n||'').trim().split(/\s+/);return w.length>1?`${w[0]} ${w[w.length-1][0].toUpperCase()}.`:w[0]};
 const initials=n=>String(n||'').split(/\s+/).filter(Boolean).slice(0,2).map(w=>w[0].toUpperCase()).join('');
 const ago=t=>{const m=Math.max(0,Math.floor((Date.now()-Date.parse(t))/60000));return m<1?'just now':m<60?`${m} min ago`:m<1440?`${Math.floor(m/60)} hr ago`:'recently'};
 const safeEvents=payload=>{
  const list=Array.isArray(payload)?payload:(Array.isArray(payload?.events)?payload.events:[]);
  const now=Date.now();
  return list.filter(x=>{
   if(!x||!['signup','subscription_activated'].includes(x.type))return false;
   const t=Date.parse(x.createdAt||'');return Number.isFinite(t)&&t<=now&&now-t<48*60*60*1000;
  }).sort((a,b)=>Date.parse(b.createdAt)-Date.parse(a.createdAt)).slice(0,8);
 };
 // one-line notification: avatar · "<name> joined Mod Alpha · 2 min ago" · ✓
 // (outside <main>, so it floats above the footer; text kept short and trimmed with … if needed)
 // never over the footer: hide while the footer is on screen, skip new ones until it scrolls away
 const footerShown=()=>{const f=document.querySelector('.public-footer');return !!f&&f.getBoundingClientRect().top<innerHeight-40};
 if(!toast._footHook){toast._footHook=1;addEventListener('scroll',()=>{if(toast.isConnected&&footerShown()&&toast.classList.contains('is-visible'))hide()},{passive:true})}
 const show=()=>{
  if(!events.length||document.hidden||footerShown())return;
  const ev=events[index%events.length];index++;
  const name=ev.name?short(ev.name):'A new member',sub=ev.type==='subscription_activated';
  toast.querySelector('.activity-toast-avatar').innerHTML=ev.name?esc(initials(ev.name.replace('.',''))):'<img src="assets/brand/mod-alpha-mark.png" alt="">';
  toast.querySelector('.activity-toast-avatar').style.setProperty('--h',String((name.length*47)%360));
  toast.querySelector('.activity-toast-title').innerHTML=`<b>${esc(name)}</b> <span>${sub?esc(`subscribed to ${ev.plan||'Pro'}`):'joined Mod Alpha'}</span> · <small>${esc(ago(ev.createdAt))}</small>`;
  toast.title=[ev.city,ago(ev.createdAt)].filter(Boolean).join(' · ');
  toast.hidden=false;requestAnimationFrame(()=>toast.classList.add('is-visible'));
  clearTimeout(hideTimer);hideTimer=setTimeout(hide,5600);
 };
 const start=list=>{events=safeEvents(list);if(!events.length)return;clearInterval(toast._rotate);setTimeout(show,2500);toast._rotate=setInterval(show,12000)};
 if(window.MA_API&&MA_API.enabled){
  // live: real, anonymous-by-default events (a first name + last initial only for members who opted in)
  fetch(MA_API.base+'/api/v1/public/activity?limit=8',{headers:{'Accept':'application/json'},credentials:'omit'})
   .then(r=>{if(!r.ok)throw new Error('Activity feed unavailable');return r.json()}).then(start).catch(()=>{/* no feed → nothing shown */});
 }else{
  // demo: illustrative sample events (the whole demo dataset is synthetic)
  const t=m=>new Date(Date.now()-m*60000).toISOString();
  start({events:[{type:'signup',name:'Rahul Kumar',city:'Bengaluru, India',createdAt:t(2)},{type:'subscription_activated',name:'Priya Sharma',city:'Pune, India',plan:'Premium',createdAt:t(9)},{type:'signup',name:'Arjun Mehta',city:'Mumbai, India',createdAt:t(17)},{type:'signup',name:'Sneha Iyer',city:'Chennai, India',createdAt:t(31)},{type:'subscription_activated',name:'Vikram Singh',city:'Delhi, India',plan:'Pro',createdAt:t(44)}]});
 }
 if(!toast._visHook){toast._visHook=1;document.addEventListener('visibilitychange',()=>{if(document.hidden)hide()})}
}

/** Network background art. */
function v22NetworkBg(){
 let s='<svg viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice"><defs><radialGradient id="nbg1" cx="15%" cy="70%" r="45%"><stop offset="0" stop-color="#1d4ed8" stop-opacity=".45"/><stop offset="1" stop-color="#1d4ed8" stop-opacity="0"/></radialGradient><radialGradient id="nbg2" cx="88%" cy="30%" r="40%"><stop offset="0" stop-color="#4f46e5" stop-opacity=".35"/><stop offset="1" stop-color="#4f46e5" stop-opacity="0"/></radialGradient></defs><rect width="1440" height="900" fill="url(#nbg1)"/><rect width="1440" height="900" fill="url(#nbg2)"/>';
 let x=987654;const r=()=>{x=(x*16807)%2147483647;return x/2147483647};
 for(let k=0;k<70;k++){const cx=r()*1440,cy=r()*900,rad=r()*1.8+.4;s+=`<circle cx="${cx.toFixed(0)}" cy="${cy.toFixed(0)}" r="${rad.toFixed(1)}" fill="#7cc4ff" fill-opacity="${(.25+r()*.6).toFixed(2)}"/>`}
 return s+'</svg>';
}

/** Hero section: headline, call-to-action buttons, stat tiles and the art. */
function v22HeroBase(){
 const pts=[[0,470],[60,452],[110,460],[160,430],[210,438],[260,402],[300,410],[350,378],[400,384],[440,350],[480,320],[520,330],[560,296],[600,270],[640,286],[690,232],[740,210],[780,180],[830,150],[880,120]];
 const line=pts.map((p,i)=>(i?'L':'M')+p.join(' ')).join(' ');
 let beams='';pts.forEach((p,i)=>{if(i%1===0)beams+=`<line x1="${p[0]}" y1="${p[1]}" x2="${p[0]}" y2="560" stroke="url(#hb)" stroke-width="${i%3?.5:.9}" opacity="${.25+i/50}"/>`});
 return `<section class="v22 v22-hero" id="why-mod-alpha">
 <div class="v22-hero-copy"><span class="v22-hero-badge">${ic('crown')} AI-Powered SIP Intelligence</span>
 <h1>Invest at the<br><span class="g-cyan">Right Time</span> with <span class="g-violet">AI</span></h1>
 <p>Mod Alpha analyzes 10+ years of mutual fund data to find the statistically best dates to invest — so your money works harder, every single month.</p>
 <div class="v22-hero-actions"><a class="v22-grad-btn lg" href="#/signup">Get Started ${ic('arrowR')}</a><a class="v22-ghost-btn lg" href="#how-it-works" data-scroll-inline>${ic('play')} See How It Works</a></div>
 <div class="v22-hero-stats">${[["users","12,500+","Users","c1"],["layers","8,500+","Funds Tracked","c2"],["percent","15.7%","Avg. Extra Returns","c3"],["star","4.8/5","User Rating","c4"]].map(x=>`<div class="v22-stat-tile ${x[3]}"><span class="v22-stat-ic">${ic(x[0])}</span><div><b>${x[1]}</b><small>${x[2]}</small></div></div>`).join('')}</div></div>
 <div class="v22-hero-art" aria-hidden="true"><svg viewBox="0 0 900 600" preserveAspectRatio="xMaxYMid meet"><defs><linearGradient id="hl" x1="0" x2="1"><stop offset="0" stop-color="#2563eb"/><stop offset=".6" stop-color="#3b82f6"/><stop offset="1" stop-color="#60a5fa"/></linearGradient><linearGradient id="hb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#60a5fa" stop-opacity=".9"/><stop offset="1" stop-color="#1e3a8a" stop-opacity="0"/></linearGradient><linearGradient id="ha" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3b82f6" stop-opacity=".45"/><stop offset="1" stop-color="#1e1b6b" stop-opacity="0"/></linearGradient><radialGradient id="hg" cx="70%" cy="40%" r="55%"><stop offset="0" stop-color="#4338ca" stop-opacity=".35"/><stop offset="1" stop-color="#0b1022" stop-opacity="0"/></radialGradient></defs><rect width="900" height="600" fill="url(#hg)"/><path d="${line} L880 560 L0 560Z" fill="url(#ha)"/>${beams}<path class="v22-hero-line" d="${line}" fill="none" stroke="url(#hl)" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"/>${pts.filter((_,i)=>i%2===1||i===pts.length-1).map(p=>`<circle cx="${p[0]}" cy="${p[1]}" r="3" fill="#67e8f9" class="v22-node"/>`).join('')}</svg>
 <div class="v22-float f1"><b>${ic('trend')} +18.5%</b><small>Higher returns<br>vs fixed SIP</small></div>
 <div class="v22-float f2"><span class="v22-float-ic">${ic('target')}</span><span>AI suggests<br>best date to invest</span></div>
 <div class="v22-robot">${v22Robot()}</div></div>
 </section>`;
}

/** Assistant illustration. */
/** Mod Alpha's AI mark (was the robot drawing): the animated α (shared/alpha-mark.js). */
function v22Robot(){return maAlphaMark({tile:false})}

/** The 'How Mod Alpha works' flow diagram (data → engine → date → you). */
function flowLarge(){
 const inputs=[['trend','#f43f5e','Mutual Fund NAVs','5+ years of data'],['bolt','#facc15','Market Volatility','Rolling analysis'],['calCheck','#22c55e','Market Holidays','Trading calendar'],['db','#8b5cf6','Fund Categories','Equity, Debt, Hybrid']];
 const steps=[['Market Data<br>Collection','We ingest historical NAV data, market trends, and key factors.'],['AI Analysis Engine','Our AI analyzes patterns, volatility, and historical behavior to identify better investment dates.'],['Finds the Best Date','Each month, we identify the statistically strongest investment date based on multiple factors.'],['Personalized<br>Notifications','We notify you before the recommended date each month.'],['You Invest Smarter','You invest on the recommended date through your broker app — and stay ahead consistently.']];
 // Step heading in the flow diagram.
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
  <div class="v22-stage" style="--i:4">${head(4)}<div class="v22-vis"><div class="v22-panel v22-outcome"><div class="v22-outcome-chart"><svg class="ma-chk-bg" viewBox="0 0 320 230" aria-hidden="true"><defs><linearGradient id="ocA" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6366f1" stop-opacity=".45"/><stop offset="1" stop-color="#6366f1" stop-opacity="0"/></linearGradient><linearGradient id="ocL" x1="0" x2="1"><stop offset="0" stop-color="#2563eb"/><stop offset="1" stop-color="#a5b4fc"/></linearGradient></defs><path d="M10 190 L60 168 L100 160 L140 132 L180 120 L215 92 L255 88 L300 40 L300 220 L10 220Z" fill="url(#ocA)"/><path d="M10 205 L60 196 L100 192 L140 180 L180 176 L215 164 L255 160 L300 136" fill="none" stroke="#8b93b8" stroke-width="2" stroke-dasharray="6 6"/>${[[10,205],[60,196],[100,192],[140,180],[180,176],[215,164],[255,160]].map(p=>`<circle cx="${p[0]}" cy="${p[1]}" r="4.5" fill="#8b93b8"/>`).join('')}<path class="v22-out-line" d="M10 190 L60 168 L100 160 L140 132 L180 120 L215 92 L255 88 L300 40" fill="none" stroke="url(#ocL)" stroke-width="4" stroke-linejoin="round"/>${[[10,190],[60,168],[100,160],[140,132],[180,120],[215,92],[255,88]].map(p=>`<circle cx="${p[0]}" cy="${p[1]}" r="6" fill="#38bdf8"/>`).join('')}<circle cx="300" cy="40" r="7" fill="#c4b5fd" class="v22-node"/></svg><span class="v22-oc-label top">With Mod Alpha<br>(Optimized Dates)</span><span class="v22-oc-label fixed">Fixed Date SIP</span></div>
   <div class="v22-oc-foot"><span>${ic('bars')}</span><p><b>Historically better timing</b> can lead to higher long-term returns.</p></div></div></div></div>
 </div>
 <div class="v22-benefits">${[['db','#8b5cf6','Real Market Data','Based on actual historical NAV data',''],['brain','#f43f5e','Advanced AI Analysis','Multi-factor statistical model',''],['target','#2dd4bf','Data-Driven Confidence','Each recommendation comes with confidence scoring','cyan'],['bell','#fbbf24','Timely Notifications','So you never miss the best date','blue'],['shield','#2dd4bf','You Stay in Control','You invest on your own broker app','']].map(x=>`<div><span style="--c:${x[1]}">${ic(x[0])}</span><div><b class="${x[4]}">${x[2]}</b><small>${x[3]}</small></div></div>`).join('')}</div>
 <div class="v22-how-replay"><button type="button" class="v22-ghost-btn" data-action="replay-flow">${ic('refresh')} Replay animation</button><small>High-level explanation only. Proprietary model logic remains internal. Historical analysis does not guarantee future returns.</small></div>
 </section>`;
}

/** Start the flow diagram animation when it scrolls into view. */
function initFlowAnimation(){
 const root=document.querySelector('[data-v22-flow]');if(!root)return;
 const reduced=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
 // Restart the flow animation.
 const play=()=>{if(reduced)return;root.classList.remove('is-playing');void root.offsetWidth;root.classList.add('is-playing')};
 root._replayFlow=play;
 if(reduced){root.classList.add('is-static');return}
 if('IntersectionObserver'in window){const io=new IntersectionObserver(es=>{if(es.some(e=>e.isIntersecting)){play();io.disconnect()}},{threshold:.15});io.observe(root)}
}

/** Landing page sections. */
function renderLandingBase(){
 app.innerHTML=`${topbar(true)}<main class="public-page v22-landing">
${v22Hero()}
<section class="public-features" id="features"><div class="section-center"><div class="eyebrow">THE MOD ALPHA EXPERIENCE</div><h2>Everything you need to understand your mutual funds.</h2><p>Explore funds, review historical performance and understand the monthly SIP date insight.</p></div><div class="feature-grid v22-feature-grid">${[['grid','Explore Mutual Funds','Search and compare mutual fund schemes, categories and historical performance.'],['trend','What If Calculator','Explore hypothetical investment outcomes using historical NAV data.'],['calendar','MOD Alpha SIP','Compare a fixed-date SIP with the platform date-selection approach.'],['spark','AI Insights','Understand fund data and historical patterns in clear language.']].map(x=>`<article class="feature-card"><span>${ic(x[0])}</span><h3>${x[1]}</h3><p>${x[2]}</p></article>`).join('')}</div></section>
${flowLarge()}
<div id="pricing-preview">${pricingSection(true)}</div>
<section class="public-faq" id="faq-preview"><div class="section-center"><div class="eyebrow">NEED TO KNOW MORE?</div><h2>Frequently asked questions</h2></div><div class="faq-preview-grid"><article><h3>Does Mod Alpha place SIP orders?</h3><p>No. Mod Alpha provides insights and reminders. You make investment decisions through your own provider.</p></article><article><h3>Is the recommended date guaranteed?</h3><p>No. Historical analysis does not predict or guarantee future performance.</p></article><article><h3>When is KYC required?</h3><p>Before activating a user's first paid subscription, through an approved verification flow.</p></article></div><div class="center-link"><a href="#/faq">Read all FAQs →</a></div></section>
</main>${publicFooter()}<div id="public-activity-toast" class="public-activity-toast ma-act" aria-live="polite" aria-atomic="true" hidden><span class="activity-toast-avatar"></span><div class="activity-toast-copy"><span class="activity-toast-title"></span><span class="activity-toast-line"></span><small class="activity-toast-time"></small></div><span class="activity-toast-check" aria-hidden="true">✓</span><button type="button" class="activity-toast-close" aria-label="Dismiss notification">×</button></div>`;
 initFlowAnimation();initPublicActivityToast();
}

/** Features section. */
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

/** renderLandingBase() + features, pricing and FAQ previews, flow lines fitted to the engine card and the faint background animation. */
function renderLanding(){renderLandingBase();
 const feat=document.getElementById('features');if(feat)feat.outerHTML=v22Features();
 const pp=document.getElementById('pricing-preview');if(pp)pp.innerHTML=pricingSection(true);
 const fq=document.getElementById('faq-preview');if(fq)fq.outerHTML=v22Faq(true);
 if(window.MA_GROWTH)MA_GROWTH.landing();
 document.querySelector('.v22-how-replay')?.remove();
 v22FitFibers();
 // faint version of the login-page particle animation behind the whole landing page
 if(typeof v22AuthAnim==='function'&&!matchMedia('(prefers-reduced-motion: reduce)').matches){const bg=document.createElement('div');bg.className='v22-land-bg';bg.setAttribute('aria-hidden','true');bg.innerHTML='<div><canvas></canvas></div>';app.prepend(bg);v22AuthAnim(bg.querySelector('canvas'))}
 // the robot "Alpha": hero show, Beat-the-AI / timing sections (features/landing/robot/)
 if(typeof maRobotInit==='function')maRobotInit();
 v22InitReveal();}

/** Fade sections in as they scroll into view. */
function v22InitReveal(){
 const els=[...document.querySelectorAll('[data-v22-reveal]')];if(!els.length)return;
 if(!('IntersectionObserver'in window)){els.forEach(e=>e.classList.add('in-view'));return}
 const io=new IntersectionObserver(es=>es.forEach(e=>{e.target.classList.toggle('in-view',e.isIntersecting||e.target.classList.contains('seen'));if(e.isIntersecting)e.target.classList.add('seen')}),{threshold:.12});
 els.forEach(e=>io.observe(e));
 const flow=document.querySelector('[data-v22-flow]');if(flow){const fo=new IntersectionObserver(es=>{es.forEach(e=>{if(e.isIntersecting&&!flow.classList.contains('is-playing'))flow._replayFlow?.()})},{threshold:.15});fo.observe(flow)}
}

/** Stretch the flow lines so they reach the engine card at any width. */
/* incoming flow lines always run up to the AI engine card, whatever the screen width */
function v22FitFibers(){const conn=document.querySelector('.v22-conn.fibers'),svg=conn&&conn.querySelector('svg'),core=document.querySelector('.v22-stage.engine .v22-core');if(!svg||!core)return;
 if(getComputedStyle(conn).flexDirection==='column'||innerWidth/maZoom()<=900){svg.style.width='';svg.style.marginRight='';return}
 svg.style.width='';svg.style.marginRight='';const ext=Math.max(0,Math.round((core.getBoundingClientRect().left-conn.getBoundingClientRect().right)/maZoom()+1));
 svg.style.setProperty('width',(conn.clientWidth+ext)+'px','important');svg.style.setProperty('margin-right',(-ext)+'px','important')}

/** Which hero art to use. */
function v22HeroVariant(){const m=location.hash.match(/^#\/landing\/(hero-[a-d])/);return m?m[1]:'hero-d'}

/** Hero art variant B. */
function v22HeroArtB(){
 const first=new Date(2026,10,1).getDay(),days=30,best=12,alts=[5,20,26];
 let cells='';for(let i=0;i<first;i++)cells+='<span class="mute"></span>';for(let d=1;d<=days;d++)cells+=`<span class="${d===best?'best':alts.includes(d)?'alt':''}" style="--d:${d}">${d}${d===best?'<i></i>':''}</span>`;
 return `<div class="v22-hero-art hb" aria-hidden="true"><div class="hb-glow"></div>
 <div class="hb-cal"><div class="hb-cal-head"><b>November 2026</b><span>${ic('spark')} AI SIP date</span></div><div class="hb-week">${['S','M','T','W','T','F','S'].map(x=>`<span>${x}</span>`).join('')}</div><div class="hb-days">${cells}</div>
 <div class="hb-cmp"><div><small>Fixed date · 5th</small><i><em style="--w:58%"></em></i><b>₹6.80L</b></div><div class="ai"><small>AI date · 12th</small><i><em style="--w:100%"></em></i><b>₹11.71L</b></div></div><p class="hb-note">Illustrative backtest, ₹10,000/month, 2021–26</p></div>
 <div class="hb-toast">${v22Mark(22,'hbM')}<div><b>Your SIP date is 12 Nov</b><small>+2.8% historically vs a fixed date</small></div></div>
 <div class="v22-float f1 hb-f1"><b>${ic('trend')} +18.5%</b><small>Higher returns<br>vs fixed SIP</small></div></div>`;
}

/** Hero art variant C. */
function v22HeroArtC(){
 const W=760,H=420,yr=['2021','2022','2023','2024','2025','2026'];
 const mod=[0,.06,.15,.27,.42,.6,.78,1],fix=[0,.05,.11,.18,.25,.33,.41,.5];
 // Chart coordinates.
 const X=i=>60+i*(W-140)/(mod.length-1),Y=v=>H-60-v*(H-120);
 // SVG path for a series.
 const path=a=>a.map((v,i)=>`${i?'L':'M'}${X(i).toFixed(1)} ${Y(v).toFixed(1)}`).join(' ');
 const band=path(mod)+' '+fix.slice().reverse().map((v,k)=>`L${X(fix.length-1-k).toFixed(1)} ${Y(v).toFixed(1)}`).join(' ')+'Z';
 return `<div class="v22-hero-art hc" aria-hidden="true"><svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet"><defs><linearGradient id="hcL" x1="0" x2="1"><stop offset="0" stop-color="#38bdf8"/><stop offset="1" stop-color="#a78bfa"/></linearGradient><linearGradient id="hcB" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6366f1" stop-opacity=".28"/><stop offset="1" stop-color="#6366f1" stop-opacity=".02"/></linearGradient></defs>
 ${[0,1,2,3,4].map(k=>`<line x1="60" x2="${W-80}" y1="${Y(k/4)}" y2="${Y(k/4)}" stroke="rgba(140,160,220,.12)" stroke-width=".7"/>`).join('')}
 ${yr.map((t,i)=>`<text x="${60+i*(W-140)/5}" y="${H-28}" fill="#8ea0c4" font-size="13" text-anchor="middle" font-family="Inter">${t}</text>`).join('')}
 <path d="${band}" fill="url(#hcB)" class="hc-band"/>
 <path d="${path(fix)}" fill="none" stroke="#94a3b8" stroke-width="1.4" stroke-dasharray="5 6" class="hc-fix" pathLength="100"/>
 <path d="${path(mod)}" fill="none" stroke="url(#hcL)" stroke-width="1.8" class="hc-mod" pathLength="100" stroke-linecap="round"/>
 ${mod.map((v,i)=>`<circle cx="${X(i)}" cy="${Y(v)}" r="2.6" fill="#7dd3fc" class="hc-dot" style="--i:${i}"/>`).join('')}
 <circle cx="${X(7)}" cy="${Y(1)}" r="4.5" fill="#c4b5fd" class="v22-node"/><circle cx="${X(7)}" cy="${Y(.5)}" r="3.5" fill="#94a3b8"/></svg>
 <span class="hc-lab mod">MOD Alpha SIP <b>₹11.71L</b></span><span class="hc-lab fix">Fixed-date SIP <b>₹6.80L</b></span>
 <div class="v22-float hc-chip"><b>${ic('trend')} +72%</b><small>Same ₹10,000/month,<br>AI-picked dates</small></div>
 <div class="hc-legend"><span><i class="m"></i>MOD Alpha (AI dates)</span><span><i class="f"></i>Fixed date</span><em>Illustrative backtest</em></div></div>`;
}

/** Hero art: orbit scene with the phone, nodes and moving comets. */
function v22HeroArtD(){
 // Lucide icon paths (lucide.dev, ISC licence)
 const L=(d)=>`<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
 const SPARK=L('<path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/>');
 const CAL=L('<path d="M21 7.5V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h3.5"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h5"/><path d="M17.5 17.5 16 16.3V14"/><circle cx="16" cy="16" r="6"/>');
 const PIE=L('<path d="M21 12c.552 0 1.005-.449.95-.998a10 10 0 0 0-8.953-8.951c-.55-.055-.998.398-.998.95v8a1 1 0 0 0 1 1z"/><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/>');
 // the comets' path from the left icon over the top icon to the right icon (the line itself is not drawn)
 const ARC='M70 189 A270 316 0 0 1 510 189';
 const mark=typeof v22BrandMark==='function'?v22BrandMark(18):v22Mark(20,'hdM1');
 return `<div class="v22-hero-art hd hd-orbit-art" aria-hidden="true"><div class="hd-stage">
 <svg class="hd-orbit-svg" viewBox="0 0 580 560"><defs><radialGradient id="hdDotG"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient><path id="hdArc" d="${ARC}"/></defs>
  <g class="hd-globe">${[0,1,2,3].map(k=>`<ellipse cx="290" cy="372" rx="${270-k*58}" ry="316" />`).join('')}<ellipse cx="290" cy="560" rx="300" ry="70"/><ellipse cx="290" cy="620" rx="320" ry="120"/></g>
  <circle r="4" class="hd-comet"><animateMotion dur="7s" repeatCount="indefinite" rotate="auto"><mpath href="#hdArc"/></animateMotion></circle>
  <circle r="3" class="hd-comet b"><animateMotion dur="7s" begin="-3.5s" repeatCount="indefinite" keyPoints="1;0" keyTimes="0;1" calcMode="linear"><mpath href="#hdArc"/></animateMotion></circle>
 </svg>
 <div class="hd-node top" style="left:290px;top:56px"><span>${SPARK}</span><b>Fund Analytics</b></div>
 <div class="hd-node" style="left:70px;top:186px"><span>${CAL}</span><b>SIP Intelligence</b></div>
 <div class="hd-node" style="left:510px;top:186px"><span>${PIE}</span><b>Portfolio Insights</b></div>
 <div class="hd-phone"><div class="hd-notch"></div><div class="hd-time">9:41</div><div class="hd-date">Thursday, 12 November</div>
  <div class="hd-card n1"><span class="hd-app">${mark}</span><div><b>Mod Alpha <small>now</small></b><p>Today is your AI-recommended SIP date. Historically +2.8% vs a fixed date.</p></div></div>
  <div class="hd-card n2"><div class="hd-best"><small>NOVEMBER BEST DATE</small><strong>12</strong><span>${ic('target')} Highest confidence</span></div><div class="hd-alts"><span>5th</span><span>20th</span><span>26th</span></div></div>
  <div class="hd-home"></div></div>
 <div class="hd-info l"><small>SMART REMINDERS</small><p>A reminder before every best SIP date</p></div>
 <div class="hd-info r"><small>HIGHER RETURNS</small><p><b>+18.5%</b> vs a fixed-date SIP (backtest)</p></div>
 </div></div>`;
}

/** v22HeroBase() with the chosen hero art. */
function v22Hero(){let h=v22HeroBase();const v=v22HeroVariant();
 if(v!=='hero-a'){const i=h.indexOf('<div class="v22-hero-art"'),j=h.lastIndexOf('</section>');h=h.slice(0,i)+({'hero-b':v22HeroArtB,'hero-c':v22HeroArtC,'hero-d':v22HeroArtD}[v])()+'\n '+h.slice(j)}
 h=h.replace('class="v22 v22-hero"',`class="v22 v22-hero ${v}"`);

 return h}

/* ---------- start-up steps (run once by core/boot.js, in this global order) ---------- */

MA_STARTUP(230, "resize listener", () => {
addEventListener('resize',()=>requestAnimationFrame(v22FitFibers));
});
