/* ==========================================================================
   Feature: admin — system settings (#/admin/settings)
   Platform settings, the integration readiness list (what is live, mocked or still
   to build) with filters and CSV export.
   ========================================================================== */

/** Integration list filters (category, status, search). */
let v22IntCat='all',v22IntStatus='All',v22IntQ='';

/** Integration readiness rows. */
function v22IntList(){const q=v22IntQ.toLowerCase();const L=V22_INTEGRATIONS.filter(x=>(v22IntCat==='all'||x.cat===v22IntCat)&&(v22IntStatus==='All'||x.status===v22IntStatus||(v22IntStatus==='P0'&&x.p==='P0'))&&(!q||(x.id+' '+x.name+' '+x.ui+' '+x.api+' '+x.opts).toLowerCase().includes(q)));
 if(!L.length)return '<div class="v22-empty">No integrations match these filters.</div>';
 return V22_INTEGRATION_CATEGORIES.filter(c=>L.some(x=>x.cat===c[0])).map(c=>{const items=L.filter(x=>x.cat===c[0]);return `<div class="v22-int-group"><h3>${cic(c[2],24)} ${c[1]} <span>${items.length}</span></h3>${items.map(x=>`<details class="v22-int" id="int-${x.id}"><summary><span class="mono v22-int-id">${x.id}</span><b>${esc(x.name)}</b><span class="v22-pill ${x.p==='P0'?'bad':x.p==='P1'?'warn':'neutral'}">${x.p}</span>${v22IntPill(x.status)}${ic('chevDown','v22-int-car')}</summary><div class="v22-int-body"><div><small>Where in the UI</small><p>${esc(x.ui)}</p></div><div><small>API / contract</small><p class="mono">${esc(x.api)}</p></div><div><small>Provider options</small><p>${esc(x.opts)}</p></div>${x.note?`<div><small>Current state</small><p>${esc(x.note)}</p></div>`:''}</div></details>`).join('')}</div>`}).join('')}

/** Status pill (Ready / Mock / Manual / Pending). */
const v22IntPill=s=>`<span class="v22-pill ${{Ready:'ok',Manual:'info',Mock:'warn',Simulated:'warn',Pending:'neutral'}[s]}">${s==='Mock'?'Integrated later':s==='Simulated'?'Demo only':s}</span>`;

/** System settings screen: platform settings and integration readiness. */
function adminSettings(){
 const I=V22_INTEGRATIONS,cnt=s=>I.filter(x=>x.status===s).length,p0=I.filter(x=>x.p==='P0'),p0done=p0.filter(x=>x.status==='Ready').length;
 return `<div class="v22 v22-adm">${v22Head('System Settings','Review environment defaults, access controls and the live-integration backlog.','','ADMIN · SYSTEM')}${adminNotice()}
 <div class="v22-sys-two"><section class="v22-card"><div class="v22-card-head"><h2>Platform configuration</h2><button type="button" class="v22-row-btn" data-action="settings-edit">${ic('sliders')} Edit</button></div><div class="v22-kv icons">${[['globe','Platform name','Mod Alpha'],['clock','Default timezone','Asia/Kolkata'],['rupee','Default currency','INR (₹)'],['calendar','SIP date model','One common platform date'],['upload','NAV ingestion','Manual Excel / CSV upload'],['plug','Environment',(window.MA_API&&MA_API.enabled?String(MA_API.env).replace(/^./,c=>c.toUpperCase()):'Local')]].map(x=>`<div>${cic(x[0],24)}<span>${x[1]}</span><b>${x[2]}</b></div>`).join('')}</div></section>
 <section class="v22-card"><div class="v22-card-head"><h2>Access &amp; security</h2></div><div class="v22-kv icons">${[['key','Admin sign-in','Email code + SMS code','ok'],['users','Role-based access','User / Admin / Super Admin','ok'],['clock','Session policy','15 min idle · 12 h users / 8 h admins','ok'],['lock','Encryption','KMS integration pending','warn'],['shield','Secrets','Secrets manager pending','warn'],['doc','Audit trail','Required','ok']].map(x=>`<div>${cic(x[0],24)}<span>${x[1]}</span><b class="t-${x[3]}">${x[2]}</b></div>`).join('')}</div></section></div>
 <section class="v22-card" id="integrations"><div class="v22-card-head"><div><h2>Integration readiness</h2><p>${I.length} live APIs and services identified from every screen and button · ${p0.length} launch-blocking (P0) · ${p0done} of ${p0.length} P0 ready</p></div><button type="button" class="v22-outline-btn" data-v22-int-csv>${ic('download')} Export CSV</button></div>
 ${v22BuildProgress()}
 <div class="v22-int-stats">${[['Pending','Not built yet','neutral'],['Mock','API built · provider mocked','warn'],['Manual','Interim manual process','info'],['Ready','Implemented','ok']].map(s=>`<button type="button" data-v22-intstatus="${s[0]}" class="${v22IntStatus===s[0]?'active':''}"><b>${cnt(s[0])}</b><span>${v22IntPill(s[0])}</span><small>${s[1]}</small></button>`).join('')}<button type="button" data-v22-intstatus="P0" class="${v22IntStatus==='P0'?'active':''}"><b>${p0.length}</b><span><span class="v22-pill bad">P0</span></span><small>Launch-blocking</small></button></div>
 <i class="v22-bar big v22-int-bar">${['Ready','Manual','Mock'].map(s=>`<em class="s-${s}" style="width:${cnt(s)/I.length*100}%"></em>`).join('')}</i>
 <div class="v22-filters" style="margin-top:16px"><label class="v22-search">${ic('search')}<input id="v22-int-q" placeholder="Search API, screen, button or provider" value="${esc(v22IntQ)}"></label><div class="v22-seg-pills wrap v22-int-cats">${[['all','All']].concat(V22_INTEGRATION_CATEGORIES.map(c=>[c[0],c[1].split(' ')[0].replace(',','')])).map(c=>`<button type="button" class="${v22IntCat===c[0]?'active':''}" data-v22-intcat="${c[0]}">${c[1]}</button>`).join('')}</div>${v22IntStatus!=='All'?`<button type="button" class="v22-row-btn" data-v22-intstatus="All">${ic('x')} Clear status filter</button>`:''}</div>
 <div id="v22-int-list">${v22IntList()}</div><p class="v22-callout">${cic('doc',20)} Full backlog with contracts and provider options: <code>docs/22_integration_backlog.md</code>.</p></section></div>`;
}

/** Download the integration list as CSV. */
function v22IntCsv(){const rows=[['id','category','name','priority','status','ui_touchpoints','api','provider_options','note']].concat(V22_INTEGRATIONS.map(x=>[x.id,(V22_INTEGRATION_CATEGORIES.find(c=>c[0]===x.cat)||[])[1],x.name,x.p,x.status,x.ui,x.api,x.opts,x.note||'']));const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n')],{type:'text/csv'}));a.download='mod-alpha-integration-backlog.csv';a.click()}

/* ---------- start-up steps (run once by core/boot.js, in this global order) ---------- */

MA_STARTUP(331, "input listener: [data-v22-pc]", () => {
document.addEventListener('input',e=>{const t=e.target;
 if(t.id==='v22-int-q'){v22IntQ=t.value;document.getElementById('v22-int-list').innerHTML=v22IntList()}
 if(t.matches('[data-pc]')&&t.closest('[data-v22-pc]')){const sec=t.closest('[data-v22-pc]'),m=+sec.querySelector('[data-pc="Monthly"]').value,y=+sec.querySelector('[data-pc="Yearly"]').value;sec.querySelector('[data-pc-save]').textContent=m?`Saves ${Math.max(0,Math.round((1-y/(m*12))*100))}% vs monthly`:'Free'}
});
});

/** "Build progress" panel: overall share of integrations Ready, a bar per area (Ready / Manual / Mock /
 *  Pending) and the latest completed work (window.V22_PROGRESS_LOG in integrations-catalogue.js). */
function v22BuildProgress(){
 const I=V22_INTEGRATIONS,pct=(n,d)=>d?Math.round(n/d*100):0,ready=I.filter(x=>x.status==='Ready').length,built=I.filter(x=>x.status!=='Pending').length;
 const p0=I.filter(x=>x.p==='P0'),p0ready=p0.filter(x=>x.status==='Ready').length,p0built=p0.filter(x=>x.status!=='Pending').length;
 const rows=V22_INTEGRATION_CATEGORIES.map(c=>{const L=I.filter(x=>x.cat===c[0]);const k=s=>L.filter(x=>x.status===s).length;return `<div class="ma-prog-row"><span>${cic(c[2],22)}<b>${c[1]}</b></span><i class="v22-bar">${['Ready','Manual','Mock'].map(s=>`<em class="s-${s}" style="width:${pct(k(s),L.length)}%"></em>`).join('')}</i><small>${k('Ready')}/${L.length} ready${k('Mock')?` · ${k('Mock')} mock`:''}${k('Pending')?` · ${k('Pending')} to build`:''}</small></div>`}).join('');
 const log=(window.V22_PROGRESS_LOG||[]).slice(0,6).map(x=>`<li><span>${x[0]}</span><b>${x[1]}</b><p>${x[2]}</p></li>`).join('');
 return `<div class="ma-prog"><div class="ma-prog-head"><div class="ma-prog-big"><b>${pct(built,I.length)}%</b><small>built (API + screens)</small></div><div class="ma-prog-big"><b>${pct(ready,I.length)}%</b><small>fully live (no mock)</small></div><div class="ma-prog-big"><b>${p0built}/${p0.length}</b><small>launch-blocking (P0) built · ${p0ready} live</small></div></div>
 <div class="ma-prog-body"><div class="ma-prog-rows"><h3>Progress by area</h3>${rows}<p class="ma-prog-key"><span class="s-Ready"></span>Ready <span class="s-Manual"></span>Manual <span class="s-Mock"></span>Mock (provider later) <span class="s-none"></span>To build</p></div><div class="ma-prog-log"><h3>Latest updates</h3><ul>${log}</ul></div></div></div>`;
}
