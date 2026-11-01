/* ==========================================================================
   Shared: dataset (demo mode)
   The demo runs on the bundled Excel workbook (data/mod-alpha-test-data.xlsx) or one
   an admin uploads. This file validates workbooks (same rules as the API,
   docs/21_test_data_excel_format.md), builds the in-memory model (funds, NAV
   history, users, subscriptions, SIP dates) and keeps it in IndexedDB.
   In live mode the API supplies the data instead (dataset.live.js).
   ========================================================================== */

/** Bundled demo workbook URL, blank template URL and version. */
const V22_BUNDLED_URL='data/mod-alpha-test-data.xlsx',V22_TEMPLATE_URL='data/mod-alpha-data-template.xlsx',V22_BUNDLE_VERSION='2026-10-31.2';

/** Allowed values for list columns. */
const V22_ENUM={asset:['Equity','Debt','Hybrid','Index','Other'],plan:['Direct','Regular'],option:['Growth','IDCW'],risk:['Low','Low to Moderate','Moderate','Moderately High','High','Very High'],yn:['Y','N'],acct:['Active','Suspended','Closed'],kyc:['Not started','Pending','In review','Verified','Rejected'],subPlan:['Pro','Premium'],cycle:['Monthly','Quarterly','Yearly'],subStatus:['Active','Past due','Cancelled','Expired'],sipStatus:['Draft','Published','Archived']};

/** Workbook sheets and column rules (mirrors the API). */
let V22_SCHEMA; // set at start-up (step 233)

/** The loaded dataset: model, report, history. */
const V22D={ready:false,source:null,ds:null,model:null,pending:null,error:null};

/** In-memory fallback when IndexedDB is unavailable. */
const v22Mem={};

/** Open the IndexedDB store. */
function v22Idb(){return new Promise((res,rej)=>{try{const r=indexedDB.open('mod-alpha',1);r.onupgradeneeded=()=>r.result.createObjectStore('kv');r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)}catch(e){rej(e)}})}

/** Read a value from the store. */
async function v22Get(k){try{const db=await v22Idb();return await new Promise((res,rej)=>{const q=db.transaction('kv').objectStore('kv').get(k);q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error)})}catch(e){return v22Mem[k]}}

/** Save a value. */
async function v22Put(k,v){v22Mem[k]=v;try{const db=await v22Idb();await new Promise((res,rej)=>{const tx=db.transaction('kv','readwrite');tx.objectStore('kv').put(v,k);tx.oncomplete=res;tx.onerror=()=>rej(tx.error)})}catch(e){}}

/** Delete a value. */
async function v22Del(k){delete v22Mem[k];try{const db=await v22Idb();await new Promise(res=>{const tx=db.transaction('kv','readwrite');tx.objectStore('kv').delete(k);tx.oncomplete=res;tx.onerror=res})}catch(e){}}

/** Validate one workbook cell (dates, numbers, lists). */
function v22ParseCell(v,c){
 if(v===undefined||v===null||(typeof v==='string'&&v.trim()===''))return{empty:1};
 const t=c.t;
 if(t==='date'){if(typeof v==='number'){const p=XLSX.SSF.parse_date_code(v);if(!p)return{err:'is not a valid date'};return{v:`${p.y}-${String(p.m).padStart(2,'0')}-${String(p.d).padStart(2,'0')}`}}const s=String(v).trim();const m=s.match(/^(\d{4})-(\d{2})-(\d{2})$/);if(!m)return{err:`"${s}" is not a date — use YYYY-MM-DD or an Excel date`};const d=new Date(Date.UTC(+m[1],+m[2]-1,+m[3]));if(d.getUTCMonth()!==+m[2]-1)return{err:`"${s}" is not a real calendar date`};return{v:s}}
 if(t==='month'){if(typeof v==='number'){const p=XLSX.SSF.parse_date_code(v);return{v:`${p.y}-${String(p.m).padStart(2,'0')}`}}const s=String(v).trim(),m=s.match(/^(\d{4})-(\d{2})$/);if(!m||+m[2]<1||+m[2]>12)return{err:`"${s}" is not a month — use YYYY-MM`};return{v:s}}
 if(t==='num'||t==='int'){const n=typeof v==='number'?v:Number(String(v).replace(/[,₹\s]/g,''));if(!isFinite(n))return{err:`"${v}" is not a number`};if(t==='int'&&!Number.isInteger(n))return{err:`"${v}" must be a whole number`};if(c.gt!==undefined&&!(n>c.gt))return{err:`must be greater than ${c.gt}`};if(c.min!==undefined&&n<c.min)return{err:`must be ≥ ${c.min}`};if(c.max!==undefined&&n>c.max)return{err:`must be ≤ ${c.max}`};return{v:n}}
 if(t==='enum'){const s=String(v).trim(),hit=c.v.find(x=>x.toLowerCase()===s.toLowerCase());return hit?{v:hit}:{err:`"${s}" is not allowed — use one of: ${c.v.join(', ')}`}}
 if(t==='email'){const s=String(v).trim();return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)?{v:s.toLowerCase()}:{err:`"${s}" is not a valid email`}}
 const s=String(v).trim();if(t==='id'&&/\s/.test(s))return{err:`"${s}" must not contain spaces`};return{v:s};
}

/** Validate one sheet: header, required columns, rows, duplicates. */
function v22ReadSheet(ws,name){
 const sch=V22_SCHEMA[name],rows=XLSX.utils.sheet_to_json(ws,{header:1,raw:true,defval:null,blankrows:false});
 const res={name,rows:[],errors:[],warnings:[],total:0,missingCols:[]};
 if(!rows.length){res.errors.push({row:1,msg:'Sheet is empty — row 1 must contain the column headers'});return res}
 const head=rows[0].map(h=>String(h??'').trim().toLowerCase());
 const idx={};Object.keys(sch.cols).forEach(c=>{idx[c]=head.indexOf(c)});
 Object.entries(sch.cols).forEach(([c,d])=>{if(idx[c]<0&&d.req)res.missingCols.push(c)});
 if(res.missingCols.length){res.errors.push({row:1,msg:`Missing required column(s): ${res.missingCols.join(', ')}`});return res}
 head.forEach(h=>{if(h&&!(h in sch.cols))res.warnings.push({row:1,msg:`Unknown column "${h}" will be ignored`})});
 const today=v22Today(),seen=new Map(),uniq={};(sch.unique||[]).forEach(u=>uniq[u]=new Map());
 for(let r=1;r<rows.length;r++){
  const raw=rows[r];if(!raw||raw.every(x=>x===null||String(x).trim()===''))continue;
  res.total++;const o={};let bad=false;
  for(const[c,d]of Object.entries(sch.cols)){
   const p=idx[c]<0?{empty:1}:v22ParseCell(raw[idx[c]],d);
   if(p.empty){if(d.req){res.errors.push({row:r+1,col:c,msg:'Required value is empty'});bad=true}else o[c]=d.def??null;continue}
   if(p.err){res.errors.push({row:r+1,col:c,msg:p.err[0].toUpperCase()+p.err.slice(1)});bad=true;continue}
   if(d.notFuture&&p.v>today){res.errors.push({row:r+1,col:c,msg:`${p.v} is in the future`});bad=true;continue}
   o[c]=p.v;
  }
  if(bad)continue;
  const k=sch.key.map(x=>o[x]).join('|');if(seen.has(k)){res.errors.push({row:r+1,msg:`Duplicate ${sch.key.join(' + ')} "${k.replace('|',' / ')}" (first seen on row ${seen.get(k)})`});continue}seen.set(k,r+1);
  let dup=false;for(const u in uniq){if(uniq[u].has(o[u])){res.errors.push({row:r+1,col:u,msg:`Duplicate ${u} "${o[u]}" (row ${uniq[u].get(o[u])})`});dup=true}else uniq[u].set(o[u],r+1)}if(dup)continue;
  o._row=r+1;res.rows.push(o);
 }
 if(!res.total)res.warnings.push({row:2,msg:'No data rows found'});
 return res;
}

/** Validate a whole workbook and build the report. */
/* Validate a workbook. Sheets present replace the matching sheets of `base`; the rest are kept. */
function v22Validate(wb,base,csvAs){
 const report={sheets:{},errors:0,warnings:0,replaced:[],ignored:[]};
 const names=wb.SheetNames;
 const map={};names.forEach(n=>{const k=Object.keys(V22_SCHEMA).find(s=>s.toLowerCase()===n.trim().toLowerCase().replace(/\s+/g,'_'));if(k)map[k]=n;else if(n.toLowerCase()!=='readme')report.ignored.push(n)});
 if(csvAs&&names.length===1)map[csvAs]=names[0];
 if(!Object.keys(map).length){report.fatal='No recognised sheets. Sheet names must be: '+Object.keys(V22_SCHEMA).join(', ');return report}
 for(const s of Object.keys(V22_SCHEMA)){if(map[s]){report.sheets[s]=v22ReadSheet(wb.Sheets[map[s]],s);report.replaced.push(s)}}
 const merged={};Object.keys(V22_SCHEMA).forEach(s=>{const r=report.sheets[s];merged[s]=r&&!r.missingCols.length?r.rows:(base?.[s]||[])});
 const missing=Object.keys(V22_SCHEMA).filter(s=>!V22_SCHEMA[s].optional&&!merged[s].length);
 if(missing.length)report.fatal=`The resulting dataset has no rows for: ${missing.join(', ')}. Upload these sheets (the first upload must contain all required sheets).`;
 // referential integrity
 const ids={Funds:new Set(merged.Funds.map(r=>r.fund_id)),Users:new Map(merged.Users.map(r=>[r.user_id,r]))};
 // Check that every value in a column exists in another sheet (e.g. NAV → Funds).
 const ref=(sheet,col,target)=>{const rep=report.sheets[sheet]||(report.replaced.includes(target)?{rows:merged[sheet],errors:[],warnings:[],virtual:1,name:sheet,total:merged[sheet].length}:null);if(!rep)return;let n=0;const keep=[];for(const r of rep.rows){const ok=target==='Funds'?ids.Funds.has(r[col]):ids.Users.has(r[col]);if(!ok){if(n<200)rep.errors.push({row:r._row||'—',col,msg:`${col} "${r[col]}" does not exist in ${target}`});n++}else keep.push(r)}if(n>200)rep.errors.push({row:'—',msg:`…and ${n-200} more rows referencing unknown ${target}`});rep.rows=keep;if(rep.virtual&&n)report.sheets[sheet]=rep};
 ref('NAV_History','fund_id','Funds');ref('Subscriptions','user_id','Users');
 if(report.sheets.Subscriptions){for(const r of report.sheets.Subscriptions.rows){const u=ids.Users.get(r.user_id);if(u&&r.start_date<u.signup_date){report.sheets.Subscriptions.warnings.push({row:r._row,msg:`start_date ${r.start_date} is before the user's signup_date ${u.signup_date}`});if(report.sheets.Subscriptions.warnings.length>50)break}}}
 if(merged.NAV_History.length&&merged.Funds.length){const has=new Set(merged.NAV_History.map(r=>r.fund_id));const no=merged.Funds.filter(f=>!has.has(f.fund_id)).map(f=>f.fund_id);if(no.length)(report.sheets.Funds||report.sheets.NAV_History||{warnings:[]}).warnings.push({row:'—',msg:`${no.length} fund(s) have no NAV rows: ${no.slice(0,8).join(', ')}${no.length>8?'…':''}`})}
 for(const s in report.sheets){report.errors+=report.sheets[s].errors.length;report.warnings+=report.sheets[s].warnings.length}
 report.merged=merged;return report;
}

/** Index of the NAV on or before a date. */
function v22NavAt(n,iso){let lo=0,hi=n.d.length-1;if(hi<0||n.d[0]>iso)return -1;while(lo<hi){const m=(lo+hi+1)>>1;if(n.d[m]<=iso)lo=m;else hi=m-1}return lo}

/** Build the model the screens use (funds with returns, NAV series, users, subscriptions, SIP dates). */
function v22BuildModel(sh){
 const nav={};for(const r of sh.NAV_History){(nav[r.fund_id]=nav[r.fund_id]||[]).push(r)}
 const navBy={};let navMax='';for(const id in nav){const a=nav[id].sort((x,y)=>x.nav_date<y.nav_date?-1:1);navBy[id]={d:a.map(r=>r.nav_date),v:a.map(r=>r.nav)};if(a.at(-1).nav_date>navMax)navMax=a.at(-1).nav_date}
 const users=[...sh.Users].sort((a,b)=>a.signup_date<b.signup_date?-1:a.signup_date>b.signup_date?1:0);
 const uMax=users.length?users.at(-1).signup_date:'',sMax=sh.Subscriptions.reduce((m,x)=>x.start_date>m?x.start_date:m,'');const asOf=[navMax,uMax,sMax].sort().at(-1)||v22Today();
 const subs=[...sh.Subscriptions].sort((a,b)=>a.start_date<b.start_date?-1:1);
 const cyc={Monthly:1,Quarterly:3,Yearly:12};const pays=[];
 for(const s of subs){const end=s.last_payment_date||s.start_date;let d=v22D(s.start_date);let k=0;while(v22Iso(d)<=end&&k<400){pays.push([v22Iso(d),s.amount_inr]);d.setUTCMonth(d.getUTCMonth()+cyc[s.billing_cycle]);k++}}
 pays.sort((a,b)=>a[0]<b[0]?-1:1);
 const funds=sh.Funds.filter(f=>f.is_active!=='N').map((f,i)=>{
  const n=navBy[f.fund_id]||{d:[],v:[]},L=n.v.length-1,last=n.d[L];const ret={};
  for(const y of [1,3,5,10]){if(L<1){ret[y]=null;continue}const j=v22NavAt(n,v22AddY(last,y));const jj=j<0&&(v22D(n.d[0])-v22D(v22AddY(last,y)))/864e5<=7?0:j;ret[y]=jj<0?null:+((Math.pow(n.v[L]/n.v[jj],1/y)-1)*100).toFixed(1)}
  // annualised volatility & Sharpe over 3 years (risk-free 6.5%)
  let sharpe=null,vol=null;const j3=Math.max(0,v22NavAt(n,v22AddY(last||asOf,3)));if(L-j3>60){const lr=[];for(let k=j3+1;k<=L;k++)lr.push(Math.log(n.v[k]/n.v[k-1]));const mu=lr.reduce((a,b)=>a+b,0)/lr.length,sd=Math.sqrt(lr.reduce((a,b)=>a+(b-mu)**2,0)/(lr.length-1));vol=sd*Math.sqrt(252);sharpe=ret[3]!=null?+(((ret[3]/100)-0.065)/vol).toFixed(1):null}
  const j21=v22NavAt(n,'2021-01-01');const since=L>0?n.v[L]/n.v[Math.max(0,j21<0?0:(n.d[j21]<'2021-01-01'&&j21<L?j21+1:j21))]:1;
  const ref=(window.V22_SEED_FUNDS||[]).find(x=>x.id===f.fund_id)||{};
  return {id:f.fund_id,name:f.scheme_name,short:f.scheme_name.replace(/ Fund.*$/,''),amc:f.amc,category:f.category,type:f.asset_class,plan:f.plan,option:f.option,nav:L>=0?n.v[L]:0,navDate:last,returns:ret,risk:f.risk_level,riskLabel:f.risk_level,sharpe:sharpe??0,vol:vol?+(vol*100).toFixed(1):null,aum:f.aum_cr!=null?'₹'+Math.round(f.aum_cr).toLocaleString('en-IN')+' Cr':'—',benchmark:f.benchmark||'—',inception:f.inception_date,expense:f.expense_ratio_pct,since2021:since,icon:ref.icon||(i===0?'trophy':'mark'),color:ref.color||['#2f86f6','#16c784','#b42ee8','#f4b72f','#ef3340'][i%5]};
 });
 // reference fund keeps its "Low" risk label from the seed for display parity, if present in seed
 const latestSub={};for(const s of subs){latestSub[s.user_id]=s}
 const uView=users.slice().reverse().map(u=>{const s=latestSub[u.user_id];return{id:u.user_id,name:u.full_name,email:u.email,mobile:u.mobile,joined:v22Fmt(u.signup_date),signup:u.signup_date,status:u.account_status,kyc:u.kyc_status,plan:s?`${s.plan} (${s.billing_cycle})`:'Free',sub:s?s.status:'Free'}});
 const sip=[...sh.SIP_Dates].sort((a,b)=>a.month<b.month?-1:1);
 return{asOf,navBy,navRows:sh.NAV_History.length,funds,users,uView,subs,pays,sip,holidays:sh.Market_Holidays||[],categories:[...new Set(funds.map(f=>f.category))]};
}

/** Make a model the active dataset and redraw. */
function v22Apply(sheets,meta){
 const m=v22BuildModel(sheets);V22D.model=m;V22D.meta=meta;V22D.sheets=sheets;V22D.ready=true;
 if(!window.V22_SEED_FUNDS)window.V22_SEED_FUNDS=D.funds.map(f=>({id:f.id,icon:f.icon,color:f.color}));
 D.funds=m.funds;D.users=m.uView;D.categories=m.categories;
 const cur=m.sip.find(r=>r.status==='Published')||m.sip.at(-1);if(cur){const[y,mo]=cur.month.split('-').map(Number);D.sipDate={month:`${V22_MON[mo-1]} ${y}`,date:cur.recommended_day,status:cur.status,published:v22Fmt(cur.published_on),version:cur.version||'—'}}
 const a=v22D(m.asOf);v22CalMonth={y:a.getUTCFullYear(),m:a.getUTCMonth()};
}

/** Load the saved dataset, or the bundled workbook the first time. */
async function v22LoadDataset(){
 try{
  if(typeof XLSX==='undefined')throw new Error('Spreadsheet library failed to load');
  const pub=await v22Get('dataset');
  if(pub&&pub.sheets){v22Apply(pub.sheets,pub.meta);V22D.source='uploaded';return}
  const cached=await v22Get('bundled');
  if(cached&&cached.version===V22_BUNDLE_VERSION){v22Apply(cached.sheets,cached.meta);V22D.source='bundled';return}
  const res=await fetch(V22_BUNDLED_URL,{cache:'no-cache'});if(!res.ok)throw new Error(`Could not load ${V22_BUNDLED_URL} (HTTP ${res.status})`);
  const buf=await res.arrayBuffer();const wb=XLSX.read(buf,{type:'array',dense:true});
  const rep=v22Validate(wb,null);if(rep.fatal||rep.errors)throw new Error('Bundled test workbook failed validation: '+(rep.fatal||rep.errors+' errors'));
  const sheets=v22Strip(rep.merged),meta={fileName:'mod-alpha-test-data.xlsx',loadedAt:new Date().toISOString(),by:'Bundled dataset',counts:Object.fromEntries(Object.entries(sheets).map(([k,v])=>[k,v.length]))};
  await v22Put('bundled',{version:V22_BUNDLE_VERSION,sheets,meta});v22Apply(sheets,meta);V22D.source='bundled';
 }catch(e){V22D.error=e.message;V22D.source='fallback';console.warn('[Mod Alpha] test data not loaded:',e)}
 finally{V22D.loaded=true}
}

/** Evenly spaced indexes for a chart. */
function v22Sample(n,from,to,max){const len=to-from+1,step=Math.max(1,Math.ceil(len/max)),idx=[];for(let i=from;i<=to;i+=step)idx.push(i);if(idx.at(-1)!==to)idx.push(to);return idx}

/** Start date for a period (1Y, 3Y, 5Y, …). */
function v22PeriodStart(last,period){const d=v22D(last);({'1M':()=>d.setUTCMonth(d.getUTCMonth()-1),'3M':()=>d.setUTCMonth(d.getUTCMonth()-3),'6M':()=>d.setUTCMonth(d.getUTCMonth()-6),'1Y':()=>d.setUTCFullYear(d.getUTCFullYear()-1),'3Y':()=>d.setUTCFullYear(d.getUTCFullYear()-3),'5Y':()=>d.setUTCFullYear(d.getUTCFullYear()-5),'10Y':()=>d.setUTCFullYear(d.getUTCFullYear()-10)}[period]||(()=>0))();return v22Iso(d)}

/* ---------- start-up steps (run once by core/boot.js, in this global order) ---------- */

MA_STARTUP(233, "initialise V22_SCHEMA", () => {
V22_SCHEMA = {
 Funds:{desc:'Fund master — one row per scheme',key:['fund_id'],cols:{fund_id:{t:'id',req:1,ex:'QSC01'},scheme_name:{t:'str',req:1,ex:'Quant Small Cap Fund'},amc:{t:'str',req:1,ex:'Quant Mutual Fund'},category:{t:'str',req:1,ex:'Small Cap'},asset_class:{t:'enum',v:V22_ENUM.asset,req:1},plan:{t:'enum',v:V22_ENUM.plan,req:1},option:{t:'enum',v:V22_ENUM.option,req:1},risk_level:{t:'enum',v:V22_ENUM.risk,req:1},benchmark:{t:'str',ex:'Nifty Smallcap 250 TRI'},aum_cr:{t:'num',min:0,ex:'24620'},expense_ratio_pct:{t:'num',min:0,max:5,ex:'0.62'},inception_date:{t:'date',req:1},is_active:{t:'enum',v:V22_ENUM.yn,def:'Y'}}},
 NAV_History:{desc:'Daily NAV per fund (business days)',key:['fund_id','nav_date'],cols:{fund_id:{t:'id',req:1,ref:'Funds',ex:'QSC01'},nav_date:{t:'date',req:1,notFuture:1},nav:{t:'num',req:1,gt:0,ex:'425.6'}}},
 Users:{desc:'Registered users',key:['user_id'],unique:['email'],cols:{user_id:{t:'id',req:1,ex:'U-10001'},full_name:{t:'str',req:1},email:{t:'email',req:1},mobile:{t:'str',ex:'+91 98765 43210'},signup_date:{t:'date',req:1,notFuture:1},account_status:{t:'enum',v:V22_ENUM.acct,req:1},kyc_status:{t:'enum',v:V22_ENUM.kyc,req:1},marketing_consent:{t:'enum',v:V22_ENUM.yn,def:'N'}}},
 Subscriptions:{desc:'Paid subscriptions (Free users have no row)',key:['subscription_id'],cols:{subscription_id:{t:'id',req:1,ex:'SUB-20001'},user_id:{t:'id',req:1,ref:'Users'},plan:{t:'enum',v:V22_ENUM.subPlan,req:1},billing_cycle:{t:'enum',v:V22_ENUM.cycle,req:1},amount_inr:{t:'num',req:1,min:0,ex:'299'},start_date:{t:'date',req:1,notFuture:1},last_payment_date:{t:'date',notFuture:1},renewal_date:{t:'date'},status:{t:'enum',v:V22_ENUM.subStatus,req:1},payment_ref:{t:'str',ex:'TEST-PAY-300001'}}},
 SIP_Dates:{desc:'Monthly recommended SIP date',key:['month'],cols:{month:{t:'month',req:1,ex:'2026-11'},recommended_day:{t:'int',req:1,min:1,max:28,ex:'12'},uplift_pct:{t:'num',ex:'2.8'},alt_day_1:{t:'int',min:1,max:28},alt_uplift_1:{t:'num'},alt_day_2:{t:'int',min:1,max:28},alt_uplift_2:{t:'num'},alt_day_3:{t:'int',min:1,max:28},alt_uplift_3:{t:'num'},status:{t:'enum',v:V22_ENUM.sipStatus,req:1},published_on:{t:'date'},version:{t:'str',ex:'TEST-v11.0'}}},
 Market_Holidays:{desc:'Exchange holidays (optional)',optional:1,key:['holiday_date','exchange'],cols:{holiday_date:{t:'date',req:1},description:{t:'str',req:1},exchange:{t:'str',def:'NSE'}}}
};
});

MA_STARTUP(304, "(async()=>{if(window.MA_API&&MA_API.enabled)return;V22D.hist", () => {
(async()=>{if(window.MA_API&&MA_API.enabled)return;V22D.history=(await v22Get('history'))||[];await v22LoadDataset();route()})();
});
