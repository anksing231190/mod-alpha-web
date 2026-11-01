/* ==========================================================================
   Mod Alpha — v22.5 UI refinements
   - Brand mark aspect ratio, larger wordmark & public nav
   - Mod Alpha AI page removed (chat bot covers it), search bar & chevron removed
   - Profile name opens profile; admin profile modal
   - Larger login card with animated network background
   - Dashboard date-range picker, pricing configuration editor
   - Integration readiness backlog (v22-integrations.js)
   ========================================================================== */

/* ---------- Mod Alpha AI page → chat bot ---------- */
(function(){const i=U_NAV.findIndex(x=>x[0]==='insights');if(i>=0)U_NAV.splice(i,1)})();
(function(){const base=route;route=function(){const h=location.hash;if(/^#\/user\/(insights|chat)\b/.test(h)){history.replaceState(null,'','#/user/overview');base();setTimeout(v22OpenChat,60);return}base()}})();
function v22OpenChat(){const d=document.getElementById('chat-drawer');if(!d)return;d.classList.add('open');document.querySelector('.v22-fab')?.classList.add('is-open');setTimeout(()=>document.getElementById('v22-chat-input')?.focus(),80)}

/* ---------- Workspace top bar: no search, no chevron, name opens profile ---------- */
(function(){const base=shell;shell=function(role,active,content){base(role,active,content);
 document.querySelector('.workspace-search')?.remove();
 document.querySelector('.workspace-topbar')?.classList.add('v22-nosearch');
 const pm=document.querySelector('.profile-menu');if(pm){pm.querySelector(':scope>b')?.remove();const c=pm.cloneNode(true);c.removeAttribute('data-action');c.setAttribute('data-v22-profile',role);c.title=role==='admin'?'Open admin profile':'Open your profile';pm.replaceWith(c)}
}})();
function v22AdminProfile(){showModal('Admin profile',`<div class="v22 v22-aprof"><div class="v22-prof"><span class="v22-prof-av">A</span><div class="v22-prof-main"><b>Admin</b><span>admin@modalpha.test</span><div class="v22-prof-tags"><span class="v22-pill info">Super Admin</span><span class="v22-pill warn">MFA not enrolled</span></div></div></div>
 <div class="v22-kv" style="margin-top:16px">${[['Role','Super Admin (demo)'],['Permissions','Users, billing, data, SIP dates, notifications, settings'],['Last sign-in',new Date().toLocaleString('en-IN')],['Session','This browser · demo preview'],['Audit','All admin actions are logged (append-only in production)']].map(x=>`<div><span>${x[0]}</span><b>${x[1]}</b></div>`).join('')}</div>
 <p class="v22-callout">${cic('key',20)} Profile editing, password change and MFA enrolment need the identity provider (AUTH-07, AUTH-09, AUTH-10).</p>
 <div class="v22-modal-actions"><a class="v22-outline-btn" href="#/admin/settings" data-modal-close>${ic('plug')} Integration readiness</a><a class="v22-danger-btn" href="#/login" data-modal-close>${ic('logout')} Sign out</a></div></div>`)}

/* ---------- Login: larger card + animated network background ---------- */
(function(){const base=renderAuth;renderAuth=function(){base();const bg=document.querySelector('.v22-auth-bg');if(!bg)return;bg.insertAdjacentHTML('afterbegin','<canvas class="v22-auth-canvas" aria-hidden="true"></canvas>');v22AuthAnim(bg.querySelector('canvas'))}})();
function v22AuthAnim(cv){
 const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches,ctx=cv.getContext('2d');let W,H,dpr,pts=[],t=0;
 const size=()=>{dpr=Math.min(2,devicePixelRatio||1);W=cv.clientWidth;H=cv.clientHeight;cv.width=W*dpr;cv.height=H*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);const n=Math.round(Math.min(110,W*H/14000));pts=Array.from({length:n},()=>({x:Math.random()*W,y:Math.random()*H,vx:(Math.random()-.5)*.35,vy:(Math.random()-.5)*.35,r:Math.random()*1.8+.6,h:Math.random()<.5?'96,165,250':'167,139,250'}))};
 size();addEventListener('resize',size);
 let mx=-999,my=-999;cv.parentElement.parentElement.addEventListener('pointermove',e=>{const r=cv.getBoundingClientRect();mx=e.clientX-r.left;my=e.clientY-r.top});
 const draw=()=>{if(!cv.isConnected){removeEventListener('resize',size);return}t+=.006;ctx.clearRect(0,0,W,H);const lt=document.documentElement.dataset.theme==='light';
  // flowing waves
  for(let k=0;k<(cv.dataset.noWaves?0:14);k++){ctx.beginPath();const base=H*.62+k*9,amp=40+k*5;for(let x=0;x<=W;x+=12){const y=base+Math.sin(x/260+t*2+k*.35)*amp*.5+Math.sin(x/120-t*3+k)*8;x?ctx.lineTo(x,y):ctx.moveTo(x,y)}ctx.strokeStyle=`rgba(${lt?(k%2?'142,74,108':'168,105,47'):(k%2?'99,102,241':'59,130,246')},${(lt?.07:.05)+k*.012})`;ctx.lineWidth=1;ctx.stroke()}
  // particles + links
  for(const p of pts){p.x+=p.vx;p.y+=p.vy;if(p.x<0||p.x>W)p.vx*=-1;if(p.y<0||p.y>H)p.vy*=-1;const dm=Math.hypot(p.x-mx,p.y-my);if(dm<140){p.x+=(p.x-mx)/dm*.6;p.y+=(p.y-my)/dm*.6}}
  for(let i=0;i<pts.length;i++)for(let j=i+1;j<pts.length;j++){const a=pts[i],b=pts[j],d=Math.hypot(a.x-b.x,a.y-b.y);if(d<130){ctx.strokeStyle=`rgba(${lt?'150,98,52':'96,165,250'},${(1-d/130)*(lt?.28:.22)})`;ctx.lineWidth=.8;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke()}}
  for(const p of pts){const ph=lt?(p.h[0]==='9'?'168,105,47':'142,74,108'):p.h;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,7);ctx.fillStyle=`rgba(${ph},${.55+Math.sin(t*6+p.x)*.3})`;ctx.shadowColor=`rgb(${ph})`;ctx.shadowBlur=lt?4:8;ctx.fill();ctx.shadowBlur=0}
  if(!reduce)requestAnimationFrame(draw)};
 draw();
}

/* ---------- Dashboard date-range picker ---------- */
let V22_RANGE=null;
function v22RangeBuckets(r){const f=v22D(r.from),t=v22D(r.to),days=Math.round((t-f)/864e5)+1,out=[];
 if(days<=45){for(let i=0;i<days;i++){const d=new Date(f);d.setUTCDate(d.getUTCDate()+i);const s=v22Iso(d);out.push({from:s,to:s,label:`${d.getUTCDate()} ${V22_MON[d.getUTCMonth()]}`})}}
 else if(days<=200){for(let s=new Date(f);s<=t;s.setUTCDate(s.getUTCDate()+7)){const e=new Date(s);e.setUTCDate(e.getUTCDate()+6);if(e>t)e.setTime(t);out.push({from:v22Iso(s),to:v22Iso(e),label:`${s.getUTCDate()} ${V22_MON[s.getUTCMonth()]}`,tip:`${v22Fmt(v22Iso(s))} – ${v22Fmt(v22Iso(e))}`})}}
 else{let s=new Date(Date.UTC(f.getUTCFullYear(),f.getUTCMonth(),1));while(s<=t){const e=new Date(Date.UTC(s.getUTCFullYear(),s.getUTCMonth()+1,0));out.push({from:v22Iso(s<f?f:s),to:v22Iso(e>t?t:e),label:`${V22_MON[s.getUTCMonth()]} ${String(s.getUTCFullYear()).slice(2)}`});s=new Date(Date.UTC(s.getUTCFullYear(),s.getUTCMonth()+1,1))}}
 return out}
function v22KpiStats(){
 const M=V22D.model;
 if(!V22_RANGE){const S=v22MonthStats();return{...S,from:S.monthStart,to:M.asOf,cmp:'vs last month'}}
 const{from,to}=V22_RANGE,len=Math.round((v22D(to)-v22D(from))/864e5);const pe=new Date(v22D(from));pe.setUTCDate(pe.getUTCDate()-1);const ps=new Date(pe);ps.setUTCDate(ps.getUTCDate()-len);const pFrom=v22Iso(ps),pTo=v22Iso(pe);
 const totalAt=iso=>v22CountIn(M.users,'signup_date','0000',iso),activeAt=iso=>M.subs.filter(s=>s.start_date<=iso&&(s.status==='Active'||s.status==='Past due'||(s.last_payment_date&&s.last_payment_date>=iso))).length;
 const total=totalAt(to),totalPrev=totalAt(pTo),activeNow=to>=M.asOf?M.subs.filter(s=>s.status==='Active').length:activeAt(to),activePrev=activeAt(pTo),revNow=v22SumPays(from,to),revPrev=v22SumPays(pFrom,pTo),conv=activeNow/(total||1)*100,convPrev=activePrev/(totalPrev||1)*100;
 return{from,to,cmp:'vs previous period',total,totalPrev,activeNow,activePrev,conv,convPrev,revNow,revPrev,dTotal:(total/(totalPrev||1)-1)*100,dActive:(activeNow/(activePrev||1)-1)*100,dConv:conv-convPrev,dRev:(revNow/(revPrev||1)-1)*100,monthStart:from};
}
function v22RangeModal(){
 const M=V22D.model;if(!M){notify('Load a dataset first.');return}
 const a=M.asOf,ad=v22D(a),iso=d=>v22Iso(d),minus=(n,u)=>{const d=new Date(ad);if(u==='d')d.setUTCDate(d.getUTCDate()-n+1);if(u==='m')d.setUTCMonth(d.getUTCMonth()-n);return iso(d)};
 const pre=[['This month',iso(new Date(Date.UTC(ad.getUTCFullYear(),ad.getUTCMonth(),1))),a],['Last 7 days',minus(7,'d'),a],['Last 30 days',minus(30,'d'),a],['Last 90 days',minus(90,'d'),a],['Last month',iso(new Date(Date.UTC(ad.getUTCFullYear(),ad.getUTCMonth()-1,1))),iso(new Date(Date.UTC(ad.getUTCFullYear(),ad.getUTCMonth(),0)))],['Year to date',`${ad.getUTCFullYear()}-01-01`,a],['Last 12 months',minus(12,'m'),a]];
 const cur=V22_RANGE||{from:pre[0][1],to:a},min=M.users[0]?.signup_date||'2015-01-01';
 showModal('Select date range',`<div class="v22 v22-range-modal"><div class="v22-range-pre">${pre.map(p=>`<button type="button" data-v22-rpre="${p[1]}|${p[2]}" class="${cur.from===p[1]&&cur.to===p[2]?'active':''}">${p[0]}</button>`).join('')}</div>
 <div class="v22-form-grid"><label class="v22-fl">From<input type="date" id="v22-r-from" value="${cur.from}" min="${min}" max="${a}"></label><label class="v22-fl">To<input type="date" id="v22-r-to" value="${cur.to}" min="${min}" max="${a}"></label></div>
 <p class="v22-hint">KPIs compare with the previous period of equal length. Charts use daily buckets up to 45 days, weekly up to ~6 months, monthly beyond. Data available ${v22Fmt(min)} – ${v22Fmt(a)}.</p><div id="v22-r-err" class="v22-err"></div>
 <div class="v22-modal-actions"><button type="button" class="v22-outline-btn" data-v22-rreset>Reset to this month</button><button type="button" class="v22-grad-btn" data-v22-rapply>Apply range</button></div></div>`);
}

/* ---------- Pricing configuration (Manage plans / Edit plan) ---------- */
const V22_PRICE_KEY='mod-alpha-pricing';
function v22PricingLoad(){try{const c=JSON.parse(localStorage.getItem(V22_PRICE_KEY)||'null');if(c&&Array.isArray(c.plans))c.plans.forEach(p=>{const t=D.plans.find(x=>x.name===p.name);if(t)Object.assign(t,p)})}catch(e){}D.plans.forEach(p=>{if(!p.prices)p.prices={Monthly:p.price,Quarterly:p.price*3,Yearly:Math.round(p.price*.8)*12};if(p.active===undefined)p.active=true})}
v22PricingLoad();
v22PlanPrice=function(p,billing){const m=p.price,y=p.prices?.Yearly??Math.round(m*.8)*12,ym=Math.round(y/12);return billing==='yearly'?{per:ym,note:m?`Billed ${inr(y)} per year`:'Free forever'}:{per:m,note:m?'Billed monthly':'Free forever'}};
function v22PricingModal(focus){
 showModal('Pricing configuration',`<div class="v22 v22-pricing-cfg"><p class="v22-sub">Edit plan prices, taglines and entitlements. Changes update the public Pricing section and Subscription page in <b>this browser only</b> until the Pricing Configuration API (BILL-04) is connected.</p>
 <div class="v22-pc-list">${D.plans.map((p,i)=>`<section class="v22-pc ${focus===p.name?'focus':''}" data-v22-pc="${i}"><header>${cic(['sprout','rocket','crown'][i]||'doc',30)}<b>${p.name}</b><label class="v22-pc-active">${v22Toggle(p.active!==false,'data-pc-active')}<span>Active</span></label></header>
  <div class="v22-pc-grid"><label class="v22-fl">Monthly (₹)<input type="number" min="0" step="1" data-pc="Monthly" value="${p.prices.Monthly}"></label><label class="v22-fl">Quarterly (₹)<input type="number" min="0" step="1" data-pc="Quarterly" value="${p.prices.Quarterly}"></label><label class="v22-fl">Yearly (₹)<input type="number" min="0" step="1" data-pc="Yearly" value="${p.prices.Yearly}"><small data-pc-save>${p.prices.Monthly?`Saves ${Math.max(0,Math.round((1-p.prices.Yearly/(p.prices.Monthly*12))*100))}% vs monthly`:'Free'}</small></label></div>
  <label class="v22-fl">Tagline<input data-pc-tag value="${esc(p.tagline)}"></label><label class="v22-fl">Entitlements <small>one per line</small><textarea rows="${Math.max(3,p.features.length)}" data-pc-feat>${esc(p.features.join('\n'))}</textarea></label></section>`).join('')}</div>
 <div id="v22-pc-err" class="v22-err"></div><div class="v22-modal-actions"><button type="button" class="v22-outline-btn" data-v22-pc-reset>Restore defaults</button><button type="button" class="v22-grad-btn" data-v22-pc-save>Save pricing</button></div></div>`);
 setTimeout(()=>document.querySelector('.v22-pc.focus')?.scrollIntoView({block:'center'}),50);
}
function v22PricingSave(){
 const err=document.getElementById('v22-pc-err'),out=[];
 for(const sec of document.querySelectorAll('[data-v22-pc]')){const p=D.plans[+sec.dataset.v22Pc],pr={};for(const inp of sec.querySelectorAll('[data-pc]')){const v=Number(inp.value);if(!isFinite(v)||v<0||inp.value===''){err.textContent=`${p.name}: ${inp.dataset.pc} price must be a number ≥ 0.`;return}pr[inp.dataset.pc]=Math.round(v)}
  if(p.name!=='Free'&&!pr.Monthly){err.textContent=`${p.name}: monthly price cannot be 0.`;return}
  const feats=sec.querySelector('[data-pc-feat]').value.split('\n').map(x=>x.trim()).filter(Boolean);if(!feats.length){err.textContent=`${p.name}: add at least one entitlement.`;return}
  out.push({name:p.name,price:pr.Monthly,prices:pr,tagline:sec.querySelector('[data-pc-tag]').value.trim()||p.tagline,features:feats,active:sec.querySelector('[data-pc-active]').checked})}
 out.forEach(o=>Object.assign(D.plans.find(x=>x.name===o.name),o));
 try{localStorage.setItem(V22_PRICE_KEY,JSON.stringify({plans:out,savedAt:new Date().toISOString()}))}catch(e){}
 modalRoot.innerHTML='';notify('Pricing saved in this browser (Pricing Configuration API pending).');(function(){const base=renderPublic;renderPublic=function(type){base(type);document.querySelectorAll('.simple-public>.disclosure,.public-page .pricing-disclaimer').forEach(x=>x.remove())}})();
route();
}

/* ---------- System settings: integration readiness backlog ---------- */
let v22IntCat='all',v22IntStatus='All',v22IntQ='';
function v22IntList(){const q=v22IntQ.toLowerCase();const L=V22_INTEGRATIONS.filter(x=>(v22IntCat==='all'||x.cat===v22IntCat)&&(v22IntStatus==='All'||x.status===v22IntStatus||(v22IntStatus==='P0'&&x.p==='P0'))&&(!q||(x.id+' '+x.name+' '+x.ui+' '+x.api+' '+x.opts).toLowerCase().includes(q)));
 if(!L.length)return '<div class="v22-empty">No integrations match these filters.</div>';
 return V22_INTEGRATION_CATEGORIES.filter(c=>L.some(x=>x.cat===c[0])).map(c=>{const items=L.filter(x=>x.cat===c[0]);return `<div class="v22-int-group"><h3>${cic(c[2],24)} ${c[1]} <span>${items.length}</span></h3>${items.map(x=>`<details class="v22-int" id="int-${x.id}"><summary><span class="mono v22-int-id">${x.id}</span><b>${esc(x.name)}</b><span class="v22-pill ${x.p==='P0'?'bad':x.p==='P1'?'warn':'neutral'}">${x.p}</span>${v22IntPill(x.status)}${ic('chevDown','v22-int-car')}</summary><div class="v22-int-body"><div><small>Where in the UI</small><p>${esc(x.ui)}</p></div><div><small>API / contract</small><p class="mono">${esc(x.api)}</p></div><div><small>Provider options</small><p>${esc(x.opts)}</p></div>${x.note?`<div><small>Current state</small><p>${esc(x.note)}</p></div>`:''}</div></details>`).join('')}</div>`}).join('')}
const v22IntPill=s=>`<span class="v22-pill ${{Ready:'ok',Manual:'info',Mock:'warn',Simulated:'warn',Pending:'neutral'}[s]}">${s==='Mock'?'Integrated later':s==='Simulated'?'Demo only':s}</span>`;
adminSettings=function(){
 const I=V22_INTEGRATIONS,cnt=s=>I.filter(x=>x.status===s).length,p0=I.filter(x=>x.p==='P0'),p0done=p0.filter(x=>x.status==='Ready').length;
 return `<div class="v22 v22-adm">${v22Head('System Settings','Review environment defaults, access controls and the live-integration backlog.','<span class="v22-pill warn lg">Demo config</span>','ADMIN · SYSTEM')}${adminNotice()}
 <div class="v22-sys-two"><section class="v22-card"><div class="v22-card-head"><h2>Platform configuration</h2><button type="button" class="v22-row-btn" data-action="settings-edit">${ic('sliders')} Edit</button></div><div class="v22-kv icons">${[['globe','Platform name','Mod Alpha'],['clock','Default timezone','Asia/Kolkata'],['rupee','Default currency','INR (₹)'],['calendar','SIP date model','One common platform date'],['upload','NAV ingestion','Manual Excel / CSV upload'],['plug','Environment','Local test prototype']].map(x=>`<div>${cic(x[0],24)}<span>${x[1]}</span><b>${x[2]}</b></div>`).join('')}</div></section>
 <section class="v22-card"><div class="v22-card-head"><h2>Access &amp; security</h2></div><div class="v22-kv icons">${[['key','Admin MFA','Required in production','warn'],['users','Role-based access','Admin / Super Admin','warn'],['clock','Session policy','To be configured','warn'],['lock','Encryption','KMS integration pending','warn'],['shield','Secrets','Secrets manager pending','warn'],['doc','Audit trail','Required','ok']].map(x=>`<div>${cic(x[0],24)}<span>${x[1]}</span><b class="t-${x[3]}">${x[2]}</b></div>`).join('')}</div></section></div>
 <section class="v22-card" id="integrations"><div class="v22-card-head"><div><h2>Integration readiness</h2><p>${I.length} live APIs and services identified from every screen and button · ${p0.length} launch-blocking (P0) · ${p0done} of ${p0.length} P0 ready</p></div><button type="button" class="v22-outline-btn" data-v22-int-csv>${ic('download')} Export CSV</button></div>
 <div class="v22-int-stats">${[['Pending','Not built yet','neutral'],['Mock','API built · provider mocked','warn'],['Manual','Interim manual process','info'],['Ready','Implemented','ok']].map(s=>`<button type="button" data-v22-intstatus="${s[0]}" class="${v22IntStatus===s[0]?'active':''}"><b>${cnt(s[0])}</b><span>${v22IntPill(s[0])}</span><small>${s[1]}</small></button>`).join('')}<button type="button" data-v22-intstatus="P0" class="${v22IntStatus==='P0'?'active':''}"><b>${p0.length}</b><span><span class="v22-pill bad">P0</span></span><small>Launch-blocking</small></button></div>
 <i class="v22-bar big v22-int-bar">${['Ready','Manual','Mock'].map(s=>`<em class="s-${s}" style="width:${cnt(s)/I.length*100}%"></em>`).join('')}</i>
 <div class="v22-filters" style="margin-top:16px"><label class="v22-search">${ic('search')}<input id="v22-int-q" placeholder="Search API, screen, button or provider" value="${esc(v22IntQ)}"></label><div class="v22-seg-pills wrap v22-int-cats">${[['all','All']].concat(V22_INTEGRATION_CATEGORIES.map(c=>[c[0],c[1].split(' ')[0].replace(',','')])).map(c=>`<button type="button" class="${v22IntCat===c[0]?'active':''}" data-v22-intcat="${c[0]}">${c[1]}</button>`).join('')}</div>${v22IntStatus!=='All'?`<button type="button" class="v22-row-btn" data-v22-intstatus="All">${ic('x')} Clear status filter</button>`:''}</div>
 <div id="v22-int-list">${v22IntList()}</div><p class="v22-callout">${cic('doc',20)} Full backlog with contracts and provider options: <code>docs/22_integration_backlog.md</code>.</p></section></div>`;
};
function v22IntCsv(){const rows=[['id','category','name','priority','status','ui_touchpoints','api','provider_options','note']].concat(V22_INTEGRATIONS.map(x=>[x.id,(V22_INTEGRATION_CATEGORIES.find(c=>c[0]===x.cat)||[])[1],x.name,x.p,x.status,x.ui,x.api,x.opts,x.note||'']));const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n')],{type:'text/csv'}));a.download='mod-alpha-integration-backlog.csv';a.click()}

/* ---------- Events ---------- */
document.addEventListener('click',e=>{const t=e.target;let b;
 if((b=t.closest('[data-v22-profile]'))){e.stopPropagation();if(b.dataset.v22Profile==='admin')v22AdminProfile();else{settingsTab='profile';if(location.hash==='#/user/settings')renderUser('settings');else go('user/settings')}return}
 if(t.closest('[data-action="v22-range"]')){e.stopPropagation();v22RangeModal();return}
 if((b=t.closest('[data-v22-rpre]'))){const[f,to]=b.dataset.v22Rpre.split('|');document.getElementById('v22-r-from').value=f;document.getElementById('v22-r-to').value=to;b.parentElement.querySelectorAll('button').forEach(x=>x.classList.toggle('active',x===b));return}
 if(t.closest('[data-v22-rapply]')){const f=document.getElementById('v22-r-from').value,to=document.getElementById('v22-r-to').value,err=document.getElementById('v22-r-err');if(!f||!to){err.textContent='Choose both dates.';return}if(f>to){err.textContent='“From” must be on or before “To”.';return}V22_RANGE={from:f,to};v22AdmPeriod.users=v22AdmPeriod.subs={from:f,to};modalRoot.innerHTML='';renderAdmin('dashboard');notify(`Showing ${v22Fmt(f)} – ${v22Fmt(to)}`);return}
 if(t.closest('[data-v22-rreset]')){V22_RANGE=null;v22AdmPeriod.users=v22AdmPeriod.subs='30D';modalRoot.innerHTML='';renderAdmin('dashboard');return}
 if((b=t.closest('[data-action="manage-plans"],[data-action="edit-plan"]'))){e.stopPropagation();v22PricingModal(b.dataset.plan);return}
 if(t.closest('[data-v22-pc-save]')){v22PricingSave();return}
 if(t.closest('[data-v22-pc-reset]')){try{localStorage.removeItem(V22_PRICE_KEY)}catch(_){};location.reload();return}
 if((b=t.closest('[data-v22-intcat]'))){v22IntCat=b.dataset.v22Intcat;b.parentElement.querySelectorAll('button').forEach(x=>x.classList.toggle('active',x===b));document.getElementById('v22-int-list').innerHTML=v22IntList();return}
 if((b=t.closest('[data-v22-intstatus]'))){v22IntStatus=v22IntStatus===b.dataset.v22Intstatus?'All':b.dataset.v22Intstatus;renderAdmin('settings');document.getElementById('integrations')?.scrollIntoView({block:'start'});return}
 if(t.closest('[data-v22-int-csv]')){v22IntCsv();return}
 if((b=t.closest('[data-v22-ap-users],[data-v22-ap-subs]'))){V22_RANGE&&(V22_RANGE=V22_RANGE)}
},true);
document.addEventListener('input',e=>{const t=e.target;
 if(t.id==='v22-int-q'){v22IntQ=t.value;document.getElementById('v22-int-list').innerHTML=v22IntList()}
 if(t.matches('[data-pc]')&&t.closest('[data-v22-pc]')){const sec=t.closest('[data-v22-pc]'),m=+sec.querySelector('[data-pc="Monthly"]').value,y=+sec.querySelector('[data-pc="Yearly"]').value;sec.querySelector('[data-pc-save]').textContent=m?`Saves ${Math.max(0,Math.round((1-y/(m*12))*100))}% vs monthly`:'Free'}
});
(function(){const base=renderPublic;renderPublic=function(type){base(type);document.querySelectorAll('.simple-public>.disclosure,.public-page .pricing-disclaimer').forEach(x=>x.remove())}})();
/* Footer: Mod Alpha mark to the left of the brand block (name + text + socials) */
(function(){const base=publicFooter;publicFooter=function(){return base().replace(/<div class="footer-brand-col">([\s\S]*?<div class="footer-socials[\s\S]*?<\/div>)\s*<\/div>/,(m,inner)=>`<div class="footer-brand-col v22-foot-brand"><img class="v22-foot-mark" src="assets/brand/mod-alpha-mark.png" alt="Mod Alpha"><div class="v22-foot-copy">${inner}</div></div>`)}})();
/* ---------- Hero alternatives (preview: #/landing/hero-a … hero-d) ---------- */
const V22_HEROES=[['hero-a','A · Growth chart','Current: thin-line growth chart + robot'],['hero-b','B · Date spotlight','Calendar with the AI-picked date'],['hero-c','C · SIP comparison','Fixed date vs MOD Alpha, two thin lines'],['hero-d','D · Phone reminder','Phone with the monthly reminder']];
function v22HeroVariant(){const m=location.hash.match(/^#\/landing\/(hero-[a-d])/);return m?m[1]:'hero-d'}
function v22HeroArtB(){
 const first=new Date(2026,10,1).getDay(),days=30,best=12,alts=[5,20,26];
 let cells='';for(let i=0;i<first;i++)cells+='<span class="mute"></span>';for(let d=1;d<=days;d++)cells+=`<span class="${d===best?'best':alts.includes(d)?'alt':''}" style="--d:${d}">${d}${d===best?'<i></i>':''}</span>`;
 return `<div class="v22-hero-art hb" aria-hidden="true"><div class="hb-glow"></div>
 <div class="hb-cal"><div class="hb-cal-head"><b>November 2026</b><span>${ic('spark')} AI SIP date</span></div><div class="hb-week">${['S','M','T','W','T','F','S'].map(x=>`<span>${x}</span>`).join('')}</div><div class="hb-days">${cells}</div>
 <div class="hb-cmp"><div><small>Fixed date · 5th</small><i><em style="--w:58%"></em></i><b>₹6.80L</b></div><div class="ai"><small>AI date · 12th</small><i><em style="--w:100%"></em></i><b>₹11.71L</b></div></div><p class="hb-note">Illustrative backtest, ₹10,000/month, 2021–26</p></div>
 <div class="hb-toast">${v22Mark(22,'hbM')}<div><b>Your SIP date is 12 Nov</b><small>+2.8% historically vs a fixed date</small></div></div>
 <div class="v22-float f1 hb-f1"><b>${ic('trend')} +18.5%</b><small>Higher returns<br>vs fixed SIP</small></div></div>`;
}
function v22HeroArtC(){
 const W=760,H=420,yr=['2021','2022','2023','2024','2025','2026'];
 const mod=[0,.06,.15,.27,.42,.6,.78,1],fix=[0,.05,.11,.18,.25,.33,.41,.5];
 const X=i=>60+i*(W-140)/(mod.length-1),Y=v=>H-60-v*(H-120);
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
function v22HeroArtD(){
 // Lucide icon paths (lucide.dev, ISC licence)
 const L=(d)=>`<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
 const SPARK=L('<path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/>');
 const CAL=L('<path d="M21 7.5V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h3.5"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h5"/><path d="M17.5 17.5 16 16.3V14"/><circle cx="16" cy="16" r="6"/>');
 const PIE=L('<path d="M21 12c.552 0 1.005-.449.95-.998a10 10 0 0 0-8.953-8.951c-.55-.055-.998.398-.998.95v8a1 1 0 0 0 1 1z"/><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/>');
 const ARC='M20 372 A270 316 0 0 1 560 372';
 const mark=typeof v22BrandMark==='function'?v22BrandMark(18):v22Mark(20,'hdM1');
 return `<div class="v22-hero-art hd hd-orbit-art" aria-hidden="true"><div class="hd-stage">
 <svg class="hd-orbit-svg" viewBox="0 0 580 560"><defs><radialGradient id="hdDotG"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient><path id="hdArc" d="${ARC}"/></defs>
  <g class="hd-globe">${[0,1,2,3].map(k=>`<ellipse cx="290" cy="372" rx="${270-k*58}" ry="316" />`).join('')}<ellipse cx="290" cy="560" rx="300" ry="70"/><ellipse cx="290" cy="620" rx="320" ry="120"/></g>
  <path d="${ARC}" class="hd-arc"/>
  <path d="M70 216 V400" class="hd-dash"/><path d="M510 216 V400" class="hd-dash"/><path d="M290 96 V118" class="hd-dash"/>
  <path d="M176 452 L192 440" class="hd-dash"/><path d="M404 452 L388 440" class="hd-dash"/>
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
(function(){const base=v22Hero;v22Hero=function(){let h=base();const v=v22HeroVariant();
 if(v!=='hero-a'){const i=h.indexOf('<div class="v22-hero-art"'),j=h.lastIndexOf('</section>');h=h.slice(0,i)+({'hero-b':v22HeroArtB,'hero-c':v22HeroArtC,'hero-d':v22HeroArtD}[v])()+'\n '+h.slice(j)}
 h=h.replace('class="v22 v22-hero"',`class="v22 v22-hero ${v}"`);

 return h}})();
/* ---------- User Subscription page (v23.2): same components and type scale as the landing pricing ---------- */
const V22_SUB_FAQ=[
 ['Can I change my plan later?','Yes. Upgrade or switch plans at any time from this page. A new plan starts immediately and your next renewal date moves accordingly.'],
 ['What happens when I cancel?','Your plan stays active until the end of the current billing period. After that your account moves to the Free plan; your settings and watchlist are kept.'],
 ['Why is KYC required?','Regulations require identity verification before a paid subscription. You complete it once, through our verification partner, using PAN and DigiLocker.'],
 ['Do prices include GST?','Yes. All prices shown include 18% GST. A GST invoice is available under Billing history after every payment.'],
 ['Does Mod Alpha place investments for me?','No. Mod Alpha provides analytics and SIP-date reminders. You invest through your own broker or mutual fund platform.']
];
subscriptionPage=function(){
 const cur=(window.MA_STATE&&MA_STATE.ent&&MA_STATE.ent.plan)||null;
 const cards=D.plans.filter(p=>p.active!==false).map((p,i)=>{const m=V22_PLAN_META[p.name]||{ic:'sprout',no:[],cta:'Choose'},pr=v22PlanPrice(p,v22Billing),pop=p.name==='Pro',isCur=cur&&cur===(p.id||p.name);
  return `<article class="v22-plan ${pop?'popular':''} ${isCur?'is-current':''}">${pop?'<span class="v22-pop">MOST POPULAR</span>':''}${isCur?'<span class="v22-pop cur">YOUR PLAN</span>':''}<div class="v22-plan-head"><div><h3>${esc(p.name)}</h3><p>${esc(p.tagline)}</p></div><span class="v22-plan-ic">${cic(m.ic,30)}</span></div><div class="v22-price"><b data-v22-price="${p.price}">${inr(pr.per)}</b><span>/month</span></div><small class="v22-price-note" data-v22-note="${p.price}">${pr.note}</small><ul>${p.features.map(f=>`<li>${cic('check',20)}<span>${esc(f)}</span></li>`).join('')}${m.no.map(f=>`<li class="no">${cic('cross',20)}<span>${f}</span></li>`).join('')}</ul>${isCur?`<button type="button" class="v22-plan-btn" disabled>Current plan</button>`:`<button type="button" class="${pop?'v22-grad-btn':'v22-plan-btn'}" data-plan="${esc(p.name)}">${p.name==='Free'?'Switch to Free':m.cta} ${ic('arrowR')}</button>`}</article>`}).join('');
 return `<div class="v22 v22-subpage">
 <section class="v22-subhead"><div><span class="v22-eyebrow">MOD ALPHA MEMBERSHIP</span><h1>Choose Your Plan</h1><p>Start free, upgrade when you need more insight.</p></div><div class="v22-billing" data-state="${v22Billing}" role="group" aria-label="Billing period"><i class="v22-billing-thumb"></i><button type="button" data-v22-billing="monthly" aria-pressed="${v22Billing==='monthly'}">Monthly</button><button type="button" data-v22-billing="yearly" aria-pressed="${v22Billing==='yearly'}">Yearly <em>Save 20%</em></button></div></section>
 <div class="v22-plans">${cards}</div>
 <p class="v22-subnote">Prices include GST. First-time subscribers complete KYC before activation.</p>
 <section class="v22-two-act v22-subinfo"><article class="v22-card v22-act">${cic('idcard',40)}<div><b>Secure identity verification</b><p>KYC is required once, when you subscribe for the first time. It is done through an approved verification partner using PAN and DigiLocker.</p><span class="v22-pill warn lg">Required before first paid activation</span></div></article>
 <article class="v22-card v22-act">${cic('refund',40)}<div><b>Manage your subscription</b><p>See your current plan, billing cycle, invoices and renewal date, or cancel at the end of the period.</p><button type="button" class="v22-outline-btn" data-action="billing-details">${ic('file')} View billing details</button></div></article></section>
 <section class="v22-card v22-subfaq"><h2 class="v22-h2">Subscription FAQs</h2><div class="v22-acc">${V22_SUB_FAQ.map((q,i)=>`<div class="v22-acc-item ${i===0?'open':''}"><button type="button" class="v22-acc-q" data-v22-acc aria-expanded="${i===0}">${cic(['rocket','refund','idcard','rupee','shield'][i],24)}<span>${q[0]}</span><i class="v22-acc-plus"></i></button><div class="v22-acc-a"><div><p>${q[1]}</p></div></div></div>`).join('')}</div></section></div>`;
};
// keep the checkout's billing cycle in sync with the toggle
window.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-v22-billing]');if(b)pricingBilling=b.dataset.v22Billing},true);
route();
