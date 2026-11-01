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
 return `<div class="v22 v22-adm">${v22Head('System Settings','Review environment defaults, access controls and the live-integration backlog.','<span class="v22-pill warn lg">Demo config</span>','ADMIN · SYSTEM')}${adminNotice()}
 <div class="v22-sys-two"><section class="v22-card"><div class="v22-card-head"><h2>Platform configuration</h2><button type="button" class="v22-row-btn" data-action="settings-edit">${ic('sliders')} Edit</button></div><div class="v22-kv icons">${[['globe','Platform name','Mod Alpha'],['clock','Default timezone','Asia/Kolkata'],['rupee','Default currency','INR (₹)'],['calendar','SIP date model','One common platform date'],['upload','NAV ingestion','Manual Excel / CSV upload'],['plug','Environment','Local test prototype']].map(x=>`<div>${cic(x[0],24)}<span>${x[1]}</span><b>${x[2]}</b></div>`).join('')}</div></section>
 <section class="v22-card"><div class="v22-card-head"><h2>Access &amp; security</h2></div><div class="v22-kv icons">${[['key','Admin MFA','Required in production','warn'],['users','Role-based access','Admin / Super Admin','warn'],['clock','Session policy','To be configured','warn'],['lock','Encryption','KMS integration pending','warn'],['shield','Secrets','Secrets manager pending','warn'],['doc','Audit trail','Required','ok']].map(x=>`<div>${cic(x[0],24)}<span>${x[1]}</span><b class="t-${x[3]}">${x[2]}</b></div>`).join('')}</div></section></div>
 <section class="v22-card" id="integrations"><div class="v22-card-head"><div><h2>Integration readiness</h2><p>${I.length} live APIs and services identified from every screen and button · ${p0.length} launch-blocking (P0) · ${p0done} of ${p0.length} P0 ready</p></div><button type="button" class="v22-outline-btn" data-v22-int-csv>${ic('download')} Export CSV</button></div>
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
