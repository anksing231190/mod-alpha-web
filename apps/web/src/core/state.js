/* ==========================================================================
   Mod Alpha — core: shared state and small helpers
   The page elements every screen draws into (#app, toast, modal root), the demo
   dataset (D = window.MOD_ALPHA_DATA from src/data/demo-data.js), the app-wide
   UI state (current role, selected fund, filters, …) and helpers used everywhere:
   money / percent formatting, HTML escaping, toast, navigation, modal, CSV export.
   ========================================================================== */

/** #app — every screen is drawn into this element. Toast message element. Container for modal dialogs. */
let app, toast, modalRoot; // set at start-up (step 0)

/** Demo dataset (funds, plans, insights, FAQs) from src/data/demo-data.js; replaced by API data in live mode. */
const D=window.MOD_ALPHA_DATA;

/** UI state shared across screens: billing period on pricing, sign-in vs sign-up, current role, selected fund / period, settings tab, signed-in user (demo), fund filters, last calculator result, admin tab. */
let pricingBilling='monthly', authMode='login', currentRole='guest', selectedFund='MA001', selectedPeriod='3', settingsTab='profile', currentUser={name:'Ankit Singh',email:'ankit@example.com'}, filters={q:'',type:'All',category:'All',plan:'All',sort:'3'}, calcResult=null, adminTab='';

/** ₹ with Indian digit grouping (₹1,23,456.78). */
const money=n=>'₹'+Number(n).toLocaleString('en-IN',{maximumFractionDigits:2});

/** Signed percentage (+12.3%). */
const pct=n=>(n>0?'+':'')+Number(n).toFixed(1)+'%';

/** Escape text for safe use inside HTML. */
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

/** Show a short toast message. */
function notify(m){toast.textContent=m;toast.classList.add('show');clearTimeout(notify.t);notify.t=setTimeout(()=>toast.classList.remove('show'),3000)}

/** Navigate to #/<path>. */
function go(p){location.hash='#/'+p}

/** Labelled form input (sign-in / settings forms). */
function field(label,name,type,placeholder,extra=''){return `<label class="field"><span class="field-label">${label}${extra}</span><input name="${name}" type="${type}" placeholder="${placeholder}" ${name==='email'?'autocomplete="email"':''} ${name==='password'?'minlength="6"':''} required></label>`}

/** Open a modal dialog with a title and HTML body; × closes it. */
function showModal(title,body){modalRoot.innerHTML=`<div class="modal-backdrop"><div class="modal"><div class="modal-head"><h3>${title}</h3><button data-modal-close>×</button></div><div class="modal-body">${body}</div></div></div>`;modalRoot.querySelectorAll('[data-modal-close]').forEach(b=>b.onclick=()=>modalRoot.innerHTML='');modalRoot.querySelector('.modal-backdrop').onclick=e=>{if(e.target.classList.contains('modal-backdrop'))modalRoot.innerHTML=''}}

/** Download rows as a CSV file. */
function exportCSV(name,headers,rows){let csv=[headers,...rows].map(r=>r.map(x=>'"'+String(x).replaceAll('"','""')+'"').join(',')).join('\n'),url=URL.createObjectURL(new Blob([csv],{type:'text/csv'})),a=document.createElement('a');a.href=url;a.download=name;a.click();URL.revokeObjectURL(url);notify('Sample CSV exported.')}

/** Fund list paging and the sign-in method tab (email / mobile). */
let maFundPage=1,maAuthMethod='email';

/* ---------- start-up steps (run once by core/boot.js, in this global order) ---------- */

MA_STARTUP(0, "initialise app, toast, modalRoot", () => {
app = document.getElementById('app');
toast = document.getElementById('toast');
modalRoot = document.getElementById('modal-root');
});
