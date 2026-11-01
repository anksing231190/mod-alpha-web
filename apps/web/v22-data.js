/* ==========================================================================
   Mod Alpha — test-data workbook layer (v22.3)
   - Loads data/mod-alpha-test-data.xlsx (or the last workbook an admin published)
   - Validates uploads against V22_SCHEMA (same rules as docs/21_test_data_excel_format.md)
   - Derives every admin metric, chart and table, plus fund returns, from the data
   Requires assets/vendor/xlsx.full.min.js (SheetJS CE, Apache-2.0).
   ========================================================================== */
const V22_BUNDLED_URL='data/mod-alpha-test-data.xlsx',V22_TEMPLATE_URL='data/mod-alpha-data-template.xlsx',V22_BUNDLE_VERSION='2026-10-31.2';
const V22_ENUM={asset:['Equity','Debt','Hybrid','Index','Other'],plan:['Direct','Regular'],option:['Growth','IDCW'],risk:['Low','Low to Moderate','Moderate','Moderately High','High','Very High'],yn:['Y','N'],acct:['Active','Suspended','Closed'],kyc:['Not started','Pending','In review','Verified','Rejected'],subPlan:['Pro','Premium'],cycle:['Monthly','Quarterly','Yearly'],subStatus:['Active','Past due','Cancelled','Expired'],sipStatus:['Draft','Published','Archived']};
const V22_SCHEMA={
 Funds:{desc:'Fund master — one row per scheme',key:['fund_id'],cols:{fund_id:{t:'id',req:1,ex:'QSC01'},scheme_name:{t:'str',req:1,ex:'Quant Small Cap Fund'},amc:{t:'str',req:1,ex:'Quant Mutual Fund'},category:{t:'str',req:1,ex:'Small Cap'},asset_class:{t:'enum',v:V22_ENUM.asset,req:1},plan:{t:'enum',v:V22_ENUM.plan,req:1},option:{t:'enum',v:V22_ENUM.option,req:1},risk_level:{t:'enum',v:V22_ENUM.risk,req:1},benchmark:{t:'str',ex:'Nifty Smallcap 250 TRI'},aum_cr:{t:'num',min:0,ex:'24620'},expense_ratio_pct:{t:'num',min:0,max:5,ex:'0.62'},inception_date:{t:'date',req:1},is_active:{t:'enum',v:V22_ENUM.yn,def:'Y'}}},
 NAV_History:{desc:'Daily NAV per fund (business days)',key:['fund_id','nav_date'],cols:{fund_id:{t:'id',req:1,ref:'Funds',ex:'QSC01'},nav_date:{t:'date',req:1,notFuture:1},nav:{t:'num',req:1,gt:0,ex:'425.6'}}},
 Users:{desc:'Registered users',key:['user_id'],unique:['email'],cols:{user_id:{t:'id',req:1,ex:'U-10001'},full_name:{t:'str',req:1},email:{t:'email',req:1},mobile:{t:'str',ex:'+91 98765 43210'},signup_date:{t:'date',req:1,notFuture:1},account_status:{t:'enum',v:V22_ENUM.acct,req:1},kyc_status:{t:'enum',v:V22_ENUM.kyc,req:1},marketing_consent:{t:'enum',v:V22_ENUM.yn,def:'N'}}},
 Subscriptions:{desc:'Paid subscriptions (Free users have no row)',key:['subscription_id'],cols:{subscription_id:{t:'id',req:1,ex:'SUB-20001'},user_id:{t:'id',req:1,ref:'Users'},plan:{t:'enum',v:V22_ENUM.subPlan,req:1},billing_cycle:{t:'enum',v:V22_ENUM.cycle,req:1},amount_inr:{t:'num',req:1,min:0,ex:'299'},start_date:{t:'date',req:1,notFuture:1},last_payment_date:{t:'date',notFuture:1},renewal_date:{t:'date'},status:{t:'enum',v:V22_ENUM.subStatus,req:1},payment_ref:{t:'str',ex:'TEST-PAY-300001'}}},
 SIP_Dates:{desc:'Monthly recommended SIP date',key:['month'],cols:{month:{t:'month',req:1,ex:'2026-11'},recommended_day:{t:'int',req:1,min:1,max:28,ex:'12'},uplift_pct:{t:'num',ex:'2.8'},alt_day_1:{t:'int',min:1,max:28},alt_uplift_1:{t:'num'},alt_day_2:{t:'int',min:1,max:28},alt_uplift_2:{t:'num'},alt_day_3:{t:'int',min:1,max:28},alt_uplift_3:{t:'num'},status:{t:'enum',v:V22_ENUM.sipStatus,req:1},published_on:{t:'date'},version:{t:'str',ex:'TEST-v11.0'}}},
 Market_Holidays:{desc:'Exchange holidays (optional)',optional:1,key:['holiday_date','exchange'],cols:{holiday_date:{t:'date',req:1},description:{t:'str',req:1},exchange:{t:'str',def:'NSE'}}}
};
const V22D={ready:false,source:null,ds:null,model:null,pending:null,error:null};

/* ---------------- IndexedDB (falls back to memory) ---------------- */
const v22Mem={};
function v22Idb(){return new Promise((res,rej)=>{try{const r=indexedDB.open('mod-alpha',1);r.onupgradeneeded=()=>r.result.createObjectStore('kv');r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)}catch(e){rej(e)}})}
async function v22Get(k){try{const db=await v22Idb();return await new Promise((res,rej)=>{const q=db.transaction('kv').objectStore('kv').get(k);q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error)})}catch(e){return v22Mem[k]}}
async function v22Put(k,v){v22Mem[k]=v;try{const db=await v22Idb();await new Promise((res,rej)=>{const tx=db.transaction('kv','readwrite');tx.objectStore('kv').put(v,k);tx.oncomplete=res;tx.onerror=()=>rej(tx.error)})}catch(e){}}
async function v22Del(k){delete v22Mem[k];try{const db=await v22Idb();await new Promise(res=>{const tx=db.transaction('kv','readwrite');tx.objectStore('kv').delete(k);tx.oncomplete=res;tx.onerror=res})}catch(e){}}

/* ---------------- Parsing & validation ---------------- */
const v22Iso=d=>d.getUTCFullYear()+'-'+String(d.getUTCMonth()+1).padStart(2,'0')+'-'+String(d.getUTCDate()).padStart(2,'0');
const v22Today=()=>{const n=new Date();return v22Iso(new Date(Date.UTC(n.getFullYear(),n.getMonth(),n.getDate())))};
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
 const ref=(sheet,col,target)=>{const rep=report.sheets[sheet]||(report.replaced.includes(target)?{rows:merged[sheet],errors:[],warnings:[],virtual:1,name:sheet,total:merged[sheet].length}:null);if(!rep)return;let n=0;const keep=[];for(const r of rep.rows){const ok=target==='Funds'?ids.Funds.has(r[col]):ids.Users.has(r[col]);if(!ok){if(n<200)rep.errors.push({row:r._row||'—',col,msg:`${col} "${r[col]}" does not exist in ${target}`});n++}else keep.push(r)}if(n>200)rep.errors.push({row:'—',msg:`…and ${n-200} more rows referencing unknown ${target}`});rep.rows=keep;if(rep.virtual&&n)report.sheets[sheet]=rep};
 ref('NAV_History','fund_id','Funds');ref('Subscriptions','user_id','Users');
 if(report.sheets.Subscriptions){for(const r of report.sheets.Subscriptions.rows){const u=ids.Users.get(r.user_id);if(u&&r.start_date<u.signup_date){report.sheets.Subscriptions.warnings.push({row:r._row,msg:`start_date ${r.start_date} is before the user's signup_date ${u.signup_date}`});if(report.sheets.Subscriptions.warnings.length>50)break}}}
 if(merged.NAV_History.length&&merged.Funds.length){const has=new Set(merged.NAV_History.map(r=>r.fund_id));const no=merged.Funds.filter(f=>!has.has(f.fund_id)).map(f=>f.fund_id);if(no.length)(report.sheets.Funds||report.sheets.NAV_History||{warnings:[]}).warnings.push({row:'—',msg:`${no.length} fund(s) have no NAV rows: ${no.slice(0,8).join(', ')}${no.length>8?'…':''}`})}
 for(const s in report.sheets){report.errors+=report.sheets[s].errors.length;report.warnings+=report.sheets[s].warnings.length}
 report.merged=merged;return report;
}
function v22Strip(sheets){const o={};for(const s in sheets)o[s]=sheets[s].map(r=>{const x={...r};delete x._row;return x});return o}

/* ---------------- Derived model ---------------- */
const v22D=s=>new Date(s+'T00:00:00Z');
const v22AddY=(iso,y)=>{const d=v22D(iso);d.setUTCFullYear(d.getUTCFullYear()-y);return v22Iso(d)};
const v22Fmt=iso=>{if(!iso)return '—';const d=v22D(iso);return `${d.getUTCDate()} ${V22_MON[d.getUTCMonth()]} ${d.getUTCFullYear()}`};
function v22NavAt(n,iso){let lo=0,hi=n.d.length-1;if(hi<0||n.d[0]>iso)return -1;while(lo<hi){const m=(lo+hi+1)>>1;if(n.d[m]<=iso)lo=m;else hi=m-1}return lo}
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
function v22Apply(sheets,meta){
 const m=v22BuildModel(sheets);V22D.model=m;V22D.meta=meta;V22D.sheets=sheets;V22D.ready=true;
 if(!window.V22_SEED_FUNDS)window.V22_SEED_FUNDS=D.funds.map(f=>({id:f.id,icon:f.icon,color:f.color}));
 D.funds=m.funds;D.users=m.uView;D.categories=m.categories;
 const cur=m.sip.find(r=>r.status==='Published')||m.sip.at(-1);if(cur){const[y,mo]=cur.month.split('-').map(Number);D.sipDate={month:`${V22_MON[mo-1]} ${y}`,date:cur.recommended_day,status:cur.status,published:v22Fmt(cur.published_on),version:cur.version||'—'}}
 const a=v22D(m.asOf);v22CalMonth={y:a.getUTCFullYear(),m:a.getUTCMonth()};
}

/* ---------------- Loading ---------------- */
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
  const sheets=v22Strip(rep.merged),meta={fileName:'mod-alpha-test-data.xlsx',loadedAt:new Date().toISOString(),by:'Bundled test data',counts:Object.fromEntries(Object.entries(sheets).map(([k,v])=>[k,v.length]))};
  await v22Put('bundled',{version:V22_BUNDLE_VERSION,sheets,meta});v22Apply(sheets,meta);V22D.source='bundled';
 }catch(e){V22D.error=e.message;V22D.source='fallback';console.warn('[Mod Alpha] test data not loaded:',e)}
 finally{V22D.loaded=true}
}

/* ---------------- Charts from data ---------------- */
function v22NiceMax(v){if(v<=0)return 1;const p=Math.pow(10,Math.floor(Math.log10(v))),n=v/p;return(n<=1?1:n<=2?2:n<=2.5?2.5:n<=5?5:10)*p}
function v22Buckets(period,asOf){if(period&&typeof period==='object')return v22RangeBuckets(period);const end=v22D(asOf),out=[];
 if(period==='7D'||period==='30D'){const n=period==='7D'?7:31;for(let i=n-1;i>=0;i--){const d=new Date(end);d.setUTCDate(d.getUTCDate()-i);const s=v22Iso(d);out.push({from:s,to:s,label:`${d.getUTCDate()} ${V22_MON[d.getUTCMonth()]}`})}}
 else if(period==='3M'){for(let i=12;i>=0;i--){const t=new Date(end);t.setUTCDate(t.getUTCDate()-i*7);const f=new Date(t);f.setUTCDate(f.getUTCDate()-6);out.push({from:v22Iso(f),to:v22Iso(t),label:`${t.getUTCDate()} ${V22_MON[t.getUTCMonth()]}`})}}
 else{for(let i=11;i>=0;i--){const f=new Date(Date.UTC(end.getUTCFullYear(),end.getUTCMonth()-i,1)),t=new Date(Date.UTC(end.getUTCFullYear(),end.getUTCMonth()-i+1,0));out.push({from:v22Iso(f),to:v22Iso(t>end?end:t),label:`${V22_MON[f.getUTCMonth()]} ${String(f.getUTCFullYear()).slice(2)}`})}}
 return out}
function v22CountIn(sorted,key,from,to){let lo=0,hi=sorted.length;while(lo<hi){const m=(lo+hi)>>1;if(sorted[m][key]<from)lo=m+1;else hi=m}let n=0;for(let i=lo;i<sorted.length&&sorted[i][key]<=to;i++)n++;return n}
function v22SumPays(from,to){let s=0;for(const p of V22D.model.pays){if(p[0]>to)break;if(p[0]>=from)s+=p[1]}return s}
const v22Short=n=>n>=1e7?'₹'+(n/1e7).toFixed(1)+'Cr':n>=1e5?'₹'+(n/1e5).toFixed(1)+'L':n>=1e3?'₹'+Math.round(n/1e3)+'K':'₹'+Math.round(n);
function v22AdminChart(kind,period){
 const M=V22D.model,B=v22Buckets(period,M.asOf),n=B.length;
 let bars,line,lineMax,barMax,tip,legend;
 if(kind==='users'){bars=B.map(b=>v22CountIn(M.users,'signup_date',b.from,b.to));line=B.map(b=>v22CountIn(M.users,'signup_date','0000',b.to));}
 else{bars=B.map(b=>v22CountIn(M.subs,'start_date',b.from,b.to));line=B.map(b=>v22SumPays(b.from,b.to));}
 barMax=v22NiceMax(Math.max(...bars)*1.15);lineMax=v22NiceMax(Math.max(...line)*1.05);
 const lineScaled=line.map(v=>v/lineMax*barMax),peak=bars.indexOf(Math.max(...bars));
 const step=Math.max(1,Math.ceil(n/7)),lblIdx=B.map((_,i)=>i).filter(i=>i%step===0||i===n-1).filter((i,k,a)=>!(k===a.length-2&&a[k+1]-i<step*.6));
 const W=540,l=kind==='users'?46:42,r=kind==='users'?50:54,iw=W-l-r;
 const wk=period==='3M'||(typeof period==='object'&&B.length&&B[0].from!==B[0].to&&B[0].label.indexOf(' ')>0&&!/\d{2}$/.test(B[0].label));const tipAt=k=>kind==='users'?`<small>${B[k].tip||B[k].label}${period==='3M'?' (week)':''}</small><div><i style="--c:#3b82f6"></i><span>New Users: ${bars[k].toLocaleString('en-IN')}</span></div><div><i style="--c:#c04cf5"></i><span>Total Users: ${line[k].toLocaleString('en-IN')}</span></div>`:`<small>${B[k].tip||B[k].label}${period==='3M'?' (week)':''}</small><div><i style="--c:#3b82f6"></i><span>Subscriptions: ${bars[k]}</span></div><div><i style="--c:#c04cf5"></i><span>Revenue: ${inr(line[k])}</span></div>`;let def=n-1;while(def>0&&!bars[def])def--;V22_HOV[kind]={n,l,iw,W,tips:B.map((_,k)=>tipAt(k)),def};tip=tipAt(def);
 return v22Chart({w:W,h:220,pad:{l,r,t:12,b:34},yMin:0,yMax:barMax,yTicks:[0,1,2,3,4].map(i=>barMax*i/4),yFmt:v=>v>=1000?(v/1000)+'K':Math.round(v),yRight:{ticks:[0,1,2,3,4].map(i=>kind==='users'?(i?((lineMax*i/4)>=1000?((lineMax*i/4)/1000).toFixed(lineMax>=4e4?0:1)+'K':Math.round(lineMax*i/4)):'0'):v22Short(lineMax*i/4))},xLabels:lblIdx.map(i=>B[i].label),xPos:lblIdx.map(i=>l+(i+.5)*iw/n),vGrid:false,label:kind==='users'?'User growth from test data':'Subscription trends from test data',bars:{values:bars,purple:[def]},series:[{values:lineScaled,color:'#c04cf5',width:2.6,dots:Math.max(1,Math.round(n/8)),r:4.5,endDot:6,glow:'#c04cf5',bandX:true}],overlays:[{x:l+(def+.5)*iw/n,y:6,cls:'v22-multi-tip compact v22-tip-auto v22-hov-tip '+(def>n*.6?'left':''),html:tip},{x:l+(def+.5)*iw/n,y:0,cls:'v22-hov-line',html:''}]}).replace('<div class="v22-chart','<div data-v22-hov="'+kind+'" class="v22-chart v22-hov');
}
function v22MonthStats(){
 const M=V22D.model,a=v22D(M.asOf),y=a.getUTCFullYear(),m=a.getUTCMonth();
 const mStart=i=>v22Iso(new Date(Date.UTC(y,m-i,1))),mEnd=i=>v22Iso(new Date(Date.UTC(y,m-i+1,0)));
 const totalAt=iso=>v22CountIn(M.users,'signup_date','0000',iso);
 const activeAt=iso=>M.subs.filter(s=>s.start_date<=iso&&(s.status==='Active'||s.status==='Past due'||(s.last_payment_date&&s.last_payment_date>=iso))).length;
 const months=Array.from({length:12},(_,k)=>11-k);
 const total=M.users.length,totalPrev=totalAt(mEnd(1)),activeNow=M.subs.filter(s=>s.status==='Active').length,activePrev=activeAt(mEnd(1));
 const revNow=v22SumPays(mStart(0),M.asOf),revPrev=v22SumPays(mStart(1),mEnd(1));
 const conv=activeNow/total*100,convPrev=activePrev/(totalPrev||1)*100;
 return{totalPrev,activePrev,revPrev,convPrev,total,activeNow,conv,revNow,dTotal:(total/totalPrev-1)*100,dActive:(activeNow/(activePrev||1)-1)*100,dConv:conv-convPrev,dRev:(revNow/(revPrev||1)-1)*100,
  sTotal:months.map(i=>totalAt(mEnd(i)>M.asOf?M.asOf:mEnd(i))),sActive:months.map(i=>activeAt(mEnd(i)>M.asOf?M.asOf:mEnd(i))),sConv:months.map(i=>activeAt(mEnd(i))/(totalAt(mEnd(i))||1)*100),sRev:months.map(i=>v22SumPays(mStart(i),mEnd(i))),monthStart:mStart(0)};
}
const v22Pct=(v,pp)=>`${v>=0?'+':''}${v.toFixed(1)}${pp?' pp':'%'}`;

/* ---------------- Admin dashboard (data-driven) ---------------- */
let v22AdmPeriod={users:'30D',subs:'30D'};const V22_HOV={};
function v22Loading(title){return `<div class="v22 v22-adm">${v22Head(title,'Loading the test-data workbook…','','ADMIN')}<section class="v22-card v22-loading"><span class="v22-spin"></span><div><b>Reading data/mod-alpha-test-data.xlsx</b><small>The first load parses ~80,000 rows; later visits use the browser cache.</small></div></section></div>`}
function v22NoData(title){return `<div class="v22 v22-adm">${v22Head(title,'No dataset is loaded.','','ADMIN')}<section class="v22-card v22-loading"><span>${cic('warn',40)}</span><div><b>Test data could not be loaded</b><small>${esc(V22D.error||'')} — run the site with <code>./run-local.sh</code> (it cannot be opened as a file), or upload a workbook on the Data Management page.</small><a class="v22-outline-btn" href="#/admin/data" style="margin-top:12px">Open Data Management</a></div></section></div>`}
function adminDashboard(){
 if(!V22D.loaded)return v22Loading('Admin Dashboard');if(!V22D.ready)return v22NoData('Admin Dashboard');
 const M=V22D.model,S=v22KpiStats(),a=v22D(M.asOf);
 const cur=M.sip.find(r=>r.month===M.asOf.slice(0,7))||M.sip.at(-1),next=M.sip.find(r=>r.month>M.asOf.slice(0,7)&&r.status!=='Draft');
 const curD=cur?v22D(cur.month+'-'+String(cur.recommended_day).padStart(2,'0')):null,nextD=next?v22D(next.month+'-'+String(next.recommended_day).padStart(2,'0')):null;
 const signups=M.users.slice(-5).reverse(),subs=M.subs.slice(-5).reverse(),uById=new Map(M.users.map(u=>[u.user_id,u]));
 const lastNav=M.funds.map(f=>f.navDate).sort().at(-1),meta=V22D.meta||{},upTo=lastNav&&(v22D(M.asOf)-v22D(lastNav))/864e5<=4;
 const newFunds=M.funds.filter(f=>f.inception>=S.monthStart).length;
 return `<div class="v22 v22-adm v22-admin">
 <section class="v22-admin-head"><div><h1>Admin Dashboard</h1><p>Manage users, data, SIP notifications and monitor platform performance.</p></div><div class="v22-head-right"><span class="v22-src">${cic('db',18)} ${V22D.source==='uploaded'?'Uploaded dataset':'Test data'} · as of ${v22Fmt(M.asOf)}</span><button type="button" class="v22-range" data-action="v22-range">${v22Fmt(S.from)} - ${v22Fmt(S.to)} ${ic('calendar')}</button></div></section>
 <section class="v22-akpis">${v22AdminKpi('users','blue','Total Users',S.total.toLocaleString('en-IN'),v22Pct(S.dTotal),S.totalPrev.toLocaleString('en-IN'),S.cmp)}${v22AdminKpi('crown','gold','Subscribed Users',S.activeNow.toLocaleString('en-IN'),v22Pct(S.dActive),S.activePrev.toLocaleString('en-IN'),S.cmp)}${v22AdminKpi('percent','teal','Conversion Rate',S.conv.toFixed(1)+'%',v22Pct(S.dConv,1),S.convPrev.toFixed(1)+'%',S.cmp)}${v22AdminKpi('rupee','purple',(V22_RANGE?'Revenue (Period)':'Monthly Revenue'),inr(S.revNow),v22Pct(S.dRev),inr(S.revPrev),S.cmp)}</section>
 <section class="v22-admin-charts">
  <article class="v22-card"><div class="v22-card-head"><div><h2>User Growth</h2><p>New user registrations over time</p></div>${v22Pills(['7D','30D','3M','1Y'],typeof v22AdmPeriod.users==='string'?v22AdmPeriod.users:'','data-v22-ap-users')}</div><div class="v22-legend center sq"><span><i style="--c:#3b82f6"></i>New Users</span><span><i style="--c:#a855f7"></i>Total Users</span></div><div id="v22-ch-users">${v22AdminChart('users',v22AdmPeriod.users)}</div></article>
  <article class="v22-card"><div class="v22-card-head"><div><h2>Subscription Trends</h2><p>New subscriptions and revenue collected</p></div>${v22Pills(['7D','30D','3M','1Y'],typeof v22AdmPeriod.subs==='string'?v22AdmPeriod.subs:'','data-v22-ap-subs')}</div><div class="v22-legend center sq"><span><i style="--c:#3b82f6"></i>New Subscriptions</span><span><i style="--c:#a855f7"></i>Revenue (₹)</span></div><div id="v22-ch-subs">${v22AdminChart('subs',v22AdmPeriod.subs)}</div></article>
 </section>
 <section class="v22-admin-ops">
  <article class="v22-card v22-sipcfg"><div class="v22-op-head"><span class="v22-tile violet lg">${ic('calendar')}</span><div><h2>SIP Notification Date Configuration</h2><p>Set the SIP investment date for this month. All subscribed users will receive a notification on this date.</p></div></div>
   <div class="v22-sipcfg-row"><div><label class="v22-label" for="admin-sip-date">Selected Date (${V22_MON[a.getUTCMonth()]} ${a.getUTCFullYear()})</label>${v22DateField('admin-sip-date',curD?v22FmtDate(new Date(curD.getUTCFullYear(),curD.getUTCMonth(),curD.getUTCDate())):'','calendar')}</div><div class="v22-sipcfg-note"><p>This date will be used to send SIP investment notifications to all ${S.activeNow.toLocaleString('en-IN')} active subscribers.</p><button type="button" class="v22-grad-btn" data-action="v22-update-date">Update Date</button></div></div>
   <b class="v22-upcoming-t">Upcoming Notifications</b><div class="v22-upcoming"><span class="d" id="v22-upcoming-date">${nextD?v22Fmt(v22Iso(nextD)):curD?v22Fmt(v22Iso(curD)):'—'}</span><span>SIP investment reminder for all subscribers${next?` · ${next.status}`:''}</span><button type="button" class="v22-outline-btn" data-action="v22-preview-notif">${ic('eye')} Preview Notification</button></div></article>
  <article class="v22-card v22-upload"><div class="v22-op-head"><span class="v22-tile blue lg">${ic('db')}</span><div><h2>Data Upload &amp; Management</h2><p>Upload and manage the test-data workbook used for charts, analytics and AI insights.</p></div><a class="v22-outline-btn sm" href="#/admin/data">Open Data Management ${ic('arrowR')}</a></div>
   <div class="v22-upload-row"><a class="v22-drop" href="#/admin/data">${ic('cloudUp','up')}<b>Upload Test Data (Excel)</b><small>Funds, NAV, Users, Subscriptions and SIP dates in one workbook</small><span class="v22-outline-btn">Go to upload</span></a>
   <div class="v22-last"><b>Active Dataset</b><div class="v22-last-when">${ic('file')}<span>${esc(v22Fmt(meta.loadedAt?.slice(0,10)))}${meta.loadedAt?', '+new Date(meta.loadedAt).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'}):''}</span><em>${V22D.source==='uploaded'?'Uploaded':'Bundled'}</em></div><dl><dt>File:</dt><dd>${esc(meta.fileName||'—')}</dd><dt>NAV rows:</dt><dd>${M.navRows.toLocaleString('en-IN')} (${M.funds.length} funds)</dd><dt>Loaded by:</dt><dd>${esc(meta.by||'—')}</dd></dl><a class="v22-outline-btn sm" href="#/admin/data">View Details ${ic('arrowR')}</a></div></div>
   <p class="v22-supported">${ic('checkCircle')} Format: .xlsx workbook as per docs/21_test_data_excel_format.md · Max 50MB.</p></article>
 </section>
 <section class="v22-admin-lower">
  <article class="v22-card v22-tbl-card"><div class="v22-card-head"><h2>${ic('user','t-ic blue')} Recent User Signups</h2><a href="#/admin/users">View All ${ic('arrowR')}</a></div><table class="v22-mini-table"><thead><tr><th>User</th><th>Email / Mobile</th><th>Signup Date</th><th>Status</th></tr></thead><tbody>${signups.map(u=>`<tr><td>${esc(u.full_name)}</td><td>${esc(u.mobile||u.email)}</td><td>${v22Fmt(u.signup_date)}</td><td>${v22Status(u.account_status)}</td></tr>`).join('')}</tbody></table></article>
  <article class="v22-card v22-tbl-card"><div class="v22-card-head"><h2>${ic('crown','t-ic gold')} Recent Subscriptions</h2><a href="#/admin/subscriptions">View All ${ic('arrowR')}</a></div><table class="v22-mini-table"><thead><tr><th>User</th><th>Plan</th><th>Amount</th><th>Date</th><th>Status</th></tr></thead><tbody>${subs.map(s=>`<tr><td>${esc(uById.get(s.user_id)?.full_name||s.user_id)}</td><td>${s.plan} (${s.billing_cycle})</td><td>${inr(s.amount_inr)}</td><td>${v22Fmt(s.start_date)}</td><td>${v22Status(s.status)}</td></tr>`).join('')}</tbody></table></article>
  <article class="v22-card v22-summary-card"><div class="v22-card-head"><h2>${ic('db','t-ic teal')} Data Summary</h2><small class="v22-updated">${ic('refresh')} As of ${v22Fmt(M.asOf)}</small></div><div class="v22-dsum">${[['bars','teal','Total Mutual Funds',M.funds.length.toLocaleString('en-IN'),newFunds?`+${newFunds} new`:'No new funds this month','pos'],['grid','violet','Categories',M.categories.length,M.categories.slice(0,3).join(', ')+(M.categories.length>3?'…':''),''],['layers','green','Total NAV Records',M.navRows.toLocaleString('en-IN'),`Till ${v22Fmt(lastNav)}`,''],['calendar','blue','Last Data Date',v22Fmt(lastNav),upTo?'Up to date':'Stale — upload NAV',upTo?'badge':'warnb']].map(x=>`<div><span class="v22-tile ${x[1]}">${ic(x[0])}</span><div><small>${x[2]}</small><b>${x[3]}</b><em class="${x[5]}">${x[4]}</em></div></div>`).join('')}</div></article>
 </section></div>`;
}

/* ---------------- Users / Subscriptions / SIP dates ---------------- */
let v22UList=null,v22UPage=1;const V22_UPER=15;
function usersTable(users){
 v22UList=users;const pages=Math.max(1,Math.ceil(users.length/V22_UPER));v22UPage=Math.min(v22UPage,pages);const shown=users.slice((v22UPage-1)*V22_UPER,v22UPage*V22_UPER);
 if(!users.length)return `<div class="v22-empty">No users match these filters.</div>`;
 return `<div class="table-scroll"><table class="v22-table v22-admin-table"><thead><tr><th>User</th><th>User ID</th><th>Joined</th><th>Account</th><th>KYC</th><th>Plan</th><th>Subscription</th><th></th></tr></thead><tbody>${shown.map((u,i)=>`<tr><td><div class="v22-who">${v22Avatar(u.name,i)}<div><b>${esc(u.name)}</b><small>${esc(u.email)}</small></div></div></td><td class="mono">${u.id}</td><td>${u.joined}</td><td>${v22Status(u.status)}</td><td>${v22Status(u.kyc)}</td><td>${esc(u.plan)}</td><td>${v22Status(u.sub)}</td><td><button type="button" class="v22-row-btn" data-user="${u.id}">${ic('eye')} View</button></td></tr>`).join('')}</tbody></table></div>${v22Pager(users.length,v22UPage,pages,'data-v22-upage')}`;
}
function v22Pager(total,page,pages,attr){if(pages<=1)return `<div class="v22-tfoot">Showing ${total.toLocaleString('en-IN')} record(s)</div>`;const nums=[...new Set([1,page-1,page,page+1,pages])].filter(n=>n>=1&&n<=pages).sort((a,b)=>a-b);let html='',prev=0;for(const n of nums){if(n-prev>1)html+='<span class="v22-ell">…</span>';html+=`<button type="button" ${attr}="${n}" class="${n===page?'active':''}">${n}</button>`;prev=n}return `<div class="v22-tfoot v22-tpager"><span>Showing ${((page-1)*V22_UPER+1).toLocaleString('en-IN')}–${Math.min(page*V22_UPER,total).toLocaleString('en-IN')} of ${total.toLocaleString('en-IN')}</span><nav class="v22-pager sm"><button type="button" ${attr}="${page-1}" ${page===1?'disabled':''} aria-label="Previous">${ic('chevL')}</button>${html}<button type="button" ${attr}="${page+1}" ${page===pages?'disabled':''} aria-label="Next">${ic('chevR')}</button></nav></div>`}
function filterUsers(){const q=(document.getElementById('user-search')?.value||'').toLowerCase(),s=document.getElementById('user-status')?.value,k=document.getElementById('user-kyc')?.value;v22UPage=1;document.getElementById('users-table').innerHTML=usersTable(D.users.filter(u=>(!q||(u.name+' '+u.email+' '+u.id).toLowerCase().includes(q))&&(s==='All statuses'||u.status===s)&&(k==='All KYC states'||u.kyc===k)))}
function adminUsers(){
 if(!V22D.loaded)return v22Loading('User Management');
 const U=D.users,c=f=>U.filter(f).length,ms=V22D.ready?v22MonthStats().monthStart:null;
 return `<div class="v22 v22-adm">${v22Head('User Management','Search user records and review verification, consent and subscription status.',`<button type="button" class="v22-outline-btn" data-action="v22-export-users">${ic('download')} Export CSV</button>`,'ADMIN · USERS')}${adminNotice()}
 ${v22Kpis([['users','Total users',U.length.toLocaleString('en-IN'),ms?`${c(u=>u.signup>=ms)} joined this month`:'Sample','pos'],['check','Active accounts',c(u=>u.status==='Active').toLocaleString('en-IN'),`${(c(u=>u.status==='Active')/U.length*100).toFixed(1)}% of users`,''],['idcard','KYC pending / in review',c(u=>u.kyc==='Pending'||u.kyc==='In review').toLocaleString('en-IN'),'Needs review','warn'],['warn','Suspended / closed',c(u=>u.status!=='Active').toLocaleString('en-IN'),'Policy or user request','bad']])}
 <section class="v22-card"><div class="v22-filters"><label class="v22-search">${ic('search')}<input id="user-search" placeholder="Search name, email or user ID"></label>${v22Sel('user-status',['All statuses',...V22_ENUM.acct])}${v22Sel('user-kyc',['All KYC states',...V22_ENUM.kyc])}</div><div id="users-table">${(v22UPage=1,usersTable(U))}</div></section></div>`;
}
let v22SList=null,v22SPage=1;
function v22SubRows(list){const pages=Math.max(1,Math.ceil(list.length/V22_UPER));v22SPage=Math.min(v22SPage,pages);const uById=new Map((V22D.model?.users||[]).map(u=>[u.user_id,u]));
 return list.length?`<div class="table-scroll"><table class="v22-table v22-admin-table"><thead><tr><th>Subscription</th><th>User</th><th>Plan</th><th>Amount</th><th>Started</th><th>Renewal</th><th>Status</th><th>Payment ref</th></tr></thead><tbody>${list.slice((v22SPage-1)*V22_UPER,v22SPage*V22_UPER).map((r,i)=>`<tr><td class="mono">${r.subscription_id}</td><td><div class="v22-who">${v22Avatar(uById.get(r.user_id)?.full_name||r.user_id,i)}<div><b>${esc(uById.get(r.user_id)?.full_name||r.user_id)}</b><small>${r.user_id}</small></div></div></td><td>${r.plan} <small class="v22-muted">· ${r.billing_cycle}</small></td><td><b>${inr(r.amount_inr)}</b></td><td>${v22Fmt(r.start_date)}</td><td>${v22Fmt(r.renewal_date)}</td><td>${v22Status(r.status)}</td><td class="mono">${esc(r.payment_ref||'—')}</td></tr>`).join('')}</tbody></table></div>${v22Pager(list.length,v22SPage,pages,'data-v22-spage')}`:`<div class="v22-empty">No subscriptions match these filters.</div>`}
function v22FilterSubs(){const q=(document.getElementById('v22-sub-search')?.value||'').toLowerCase(),st=document.getElementById('v22-sub-state')?.value,pl=document.getElementById('v22-sub-plan')?.value,uById=new Map(V22D.model.users.map(u=>[u.user_id,u.full_name]));v22SPage=1;v22SList=V22D.model.subs.slice().reverse().filter(r=>(!q||(r.subscription_id+' '+r.user_id+' '+(uById.get(r.user_id)||'')).toLowerCase().includes(q))&&(st==='All states'||r.status===st)&&(pl==='All plans'||r.plan===pl));document.getElementById('v22-sub-list').innerHTML=v22SubRows(v22SList)}
function adminSubs(){
 if(!V22D.loaded)return v22Loading('Subscriptions');if(!V22D.ready)return v22NoData('Subscriptions');
 const M=V22D.model,S=v22MonthStats(),act=M.subs.filter(s=>s.status==='Active'),pd=M.subs.filter(s=>s.status==='Past due').length,canc=M.subs.filter(s=>s.status==='Cancelled'&&s.last_payment_date>=S.monthStart).length;
 const paidUsers=new Set(act.map(s=>s.user_id)).size,free=M.users.length-paidUsers,mrr=act.reduce((a,s)=>a+s.amount_inr/({Monthly:1,Quarterly:3,Yearly:12}[s.billing_cycle]),0);
 const cnt={Free:free,Pro:act.filter(s=>s.plan==='Pro').length,Premium:act.filter(s=>s.plan==='Premium').length},tot=M.users.length;
 v22SPage=1;v22SList=M.subs.slice().reverse();
 return `<div class="v22 v22-adm">${v22Head('Subscriptions','Review plans, subscription lifecycle, invoices and payment reconciliation.',`<button type="button" class="v22-outline-btn" data-action="manage-plans">${ic('gear')} Manage plans</button>`,'ADMIN · BILLING')}${adminNotice()}
 ${v22Kpis([['check','Active subscriptions',act.length.toLocaleString('en-IN'),v22Pct(S.dActive)+' vs last month','pos'],['rupee','MRR (monthly equivalent)',inr(mrr),`Collected this month ${inr(S.revNow)}`,'pos'],['warn','Past due',pd.toLocaleString('en-IN'),'Requires follow-up','warn'],['refund','Cancelled this month',canc.toLocaleString('en-IN'),`${M.subs.filter(s=>s.status==='Cancelled').length} cancelled in total`,'']])}
 <section class="v22-plan-admin">${D.plans.map((p,i)=>`<article class="v22-card"><div class="v22-pa-top">${cic(['sprout','rocket','crown'][i],34)}<div><b>${p.name}</b><small>${esc(p.tagline)}</small></div><span class="v22-pill ${i===1?'info':'neutral'}">${i===1?'Most popular':p.period}</span></div><div class="v22-pa-price">${p.price?inr(p.price):'₹0'}<span>/month</span></div><div class="v22-pa-stats"><div><small>${i?'Active subs':'Users'}</small><b>${cnt[p.name].toLocaleString('en-IN')}</b></div><div><small>Entitlements</small><b>${p.features.length}</b></div><div><small>Share</small><b>${(cnt[p.name]/tot*100).toFixed(1)}%</b></div></div><i class="v22-bar"><em style="width:${(cnt[p.name]/tot*100).toFixed(1)}%"></em></i><button type="button" class="v22-row-btn" data-action="edit-plan" data-plan="${p.name}">${ic('sliders')} Edit plan</button></article>`).join('')}</section>
 <section class="v22-card"><div class="v22-card-head"><h2>All subscriptions</h2><span class="v22-muted">${M.subs.length.toLocaleString('en-IN')} records</span></div><div class="v22-filters"><label class="v22-search">${ic('search')}<input id="v22-sub-search" placeholder="Search subscription ID, user ID or name"></label>${v22Sel('v22-sub-state',['All states',...V22_ENUM.subStatus])}${v22Sel('v22-sub-plan',['All plans',...V22_ENUM.subPlan])}</div><div id="v22-sub-list">${v22SubRows(v22SList)}</div>
 <p class="v22-callout">${cic('shield',20)} Payment status must be verified through signed provider webhooks and reconciliation. This demo cannot mark a payment successful or grant entitlements.</p></section></div>`;
}
function adminSipDate(){
 if(!V22D.loaded)return v22Loading('SIP Date Configuration');if(!V22D.ready)return v22NoData('SIP Date Configuration');
 const M=V22D.model,pub=M.sip.filter(r=>r.status==='Published').at(-1)||M.sip.at(-1),d=v22D(pub.month+'-'+String(pub.recommended_day).padStart(2,'0'));
 const dn=['SUNDAY','MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY'][d.getUTCDay()],act=M.subs.filter(s=>s.status==='Active').length;
 const alts=[pub.alt_day_1,pub.alt_day_2,pub.alt_day_3].filter(Boolean),months=[...new Set([...M.sip.map(r=>r.month),pub.month])];
 const nextM=(()=>{const x=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,1));return `${x.getUTCFullYear()}-${String(x.getUTCMonth()+1).padStart(2,'0')}`})();
 const mLabel=s=>{const[y,m]=s.split('-');return `${['January','February','March','April','May','June','July','August','September','October','November','December'][m-1]} ${y}`};
 return `<div class="v22 v22-adm">${v22Head('SIP Date Configuration','Configure the monthly platform-wide reminder date and manage its publishing lifecycle.',`<span class="v22-pill ok lg">● Current: ${pub.recommended_day} ${V22_MON[d.getUTCMonth()]} ${d.getUTCFullYear()}</span>`,'ADMIN · SIP DATES')}${adminNotice()}
 <div class="v22-sip-cfg"><section class="v22-card"><h2 class="v22-h2">Configure monthly reminder</h2><p class="v22-sub">One common date across all mutual funds. Model suggestions come from the SIP_Dates sheet.</p>
  <div class="v22-steps" id="v22-steps">${['Draft','Validate','Preview','Publish'].map((s,i)=>`<div class="${i===0?'done':''}"><i>${i+1}</i><span>${s}</span></div>`).join('')}</div>
  <div class="v22-form-grid"><label class="v22-fl">Effective month${v22Sel('sip-month',[mLabel(nextM),...months.slice().reverse().filter(m=>m!==nextM).slice(0,3).map(mLabel)])}</label><label class="v22-fl">Timezone${v22Sel('',['Asia/Kolkata (IST)'])}</label></div>
  <div class="v22-fl">Reminder date <small class="v22-muted">· selected <b id="v22-day-label">${pub.recommended_day}th</b> of the month</small><div class="v22-daygrid">${Array.from({length:28},(_,i)=>i+1).map(n=>`<button type="button" class="${n===pub.recommended_day?'active':''} ${alts.includes(n)?'alt':''}" data-v22-day="${n}">${n}</button>`).join('')}</div><input type="hidden" id="admin-sip-day" value="${pub.recommended_day}"><small class="v22-legend-row"><span><i class="a"></i>Selected</span><span><i class="b"></i>Alternative strong dates (SIP_Dates)</span></small></div>
  <label class="v22-fl">Internal change reason<textarea id="sip-reason" rows="3" placeholder="Reason for configuring this date (required to publish)"></textarea></label>
  <button type="button" class="v22-grad-btn wide" data-action="validate-date">Validate configuration ${ic('arrowR')}</button><div id="sip-validation" class="v22-valbox"></div></section>
 <aside class="v22-sip-side"><section class="v22-card v22-orb-card"><h2 class="v22-h2 sm">Current published date</h2><div class="v22-orb"><div><small>${mLabel(pub.month).toUpperCase()}</small><strong>${pub.recommended_day}</strong><span>${dn}</span></div></div><div class="v22-kv">${[['Status',v22Status(pub.status)],['Expected uplift',pub.uplift_pct!=null?`+${pub.uplift_pct}% vs fixed date`:'—'],['Published on',v22Fmt(pub.published_on)],['Version',esc(pub.version||'—')],['Recipients',act.toLocaleString('en-IN')+' active subscribers']].map(x=>`<div><span>${x[0]}</span><b>${x[1]}</b></div>`).join('')}</div></section>
 <p class="v22-callout">${cic('bell',20)} Publishing creates a versioned record and notification campaign. A published date is a reminder only; it never places an order.</p></aside></div>
 <section class="v22-card"><div class="v22-card-head"><h2>Publishing history</h2><span class="v22-muted">From the SIP_Dates sheet</span></div><div class="table-scroll"><table class="v22-table v22-admin-table"><thead><tr><th>Month</th><th>Date</th><th>Uplift</th><th>Alternatives</th><th>Version</th><th>Published on</th><th>Status</th></tr></thead><tbody>${M.sip.slice().reverse().map(r=>`<tr><td><b>${mLabel(r.month)}</b></td><td>${r.recommended_day} ${V22_MON[+r.month.slice(5)-1]}</td><td class="pos">${r.uplift_pct!=null?'+'+r.uplift_pct+'%':'—'}</td><td>${[r.alt_day_1,r.alt_day_2,r.alt_day_3].filter(Boolean).join(', ')||'—'}</td><td class="mono">${esc(r.version||'—')}</td><td>${v22Fmt(r.published_on)}</td><td>${v22Status(r.status)}</td></tr>`).join('')}</tbody></table></div></section></div>`;
}

/* ---------------- Data Management (workbook upload) ---------------- */
let v22Csv='NAV_History';
function v22SchemaTable(s){const sch=V22_SCHEMA[s];return `<div class="table-scroll"><table class="v22-table v22-schema-table"><thead><tr><th>Column</th><th>Type</th><th>Required</th><th>Rules / allowed values</th></tr></thead><tbody>${Object.entries(sch.cols).map(([c,d])=>`<tr><td><code>${c}</code></td><td>${{id:'Text (ID)',str:'Text',num:'Number',int:'Whole number',date:'Date',month:'Month',enum:'List',email:'Email'}[d.t]}</td><td>${d.req?'<span class="v22-pill info">Required</span>':'<span class="v22-pill neutral">Optional</span>'}</td><td>${[d.v?d.v.join(' · '):'',d.t==='date'?'YYYY-MM-DD or Excel date':'',d.t==='month'?'YYYY-MM':'',d.gt!==undefined?`> ${d.gt}`:'',d.min!==undefined?`min ${d.min}`:'',d.max!==undefined?`max ${d.max}`:'',d.ref?`must exist in ${d.ref}`:'',d.notFuture?'not in the future':'',d.def?`default ${d.def}`:'',sch.key.length===1&&sch.key[0]===c?'unique':'',(sch.unique||[]).includes(c)?'unique':'',d.ex?`e.g. ${d.ex}`:''].filter(Boolean).join(' · ')}</td></tr>`).join('')}</tbody></table></div><p class="v22-hint">Unique key: <code>${sch.key.join(' + ')}</code></p>`}
function adminData(){
 const M=V22D.model,meta=V22D.meta||{},hist=V22D.history||[];
 const counts=M?{Funds:M.funds.length,NAV_History:M.navRows,Users:M.users.length,Subscriptions:M.subs.length,SIP_Dates:M.sip.length,Market_Holidays:M.holidays.length}:{};
 return `<div class="v22 v22-adm">${v22Head('Data Management','Upload, validate and publish the test-data workbook that drives every chart, KPI and table.',`<a class="v22-outline-btn" href="${V22_TEMPLATE_URL}" download>${ic('download')} Blank template</a><a class="v22-outline-btn" href="${V22_BUNDLED_URL}" download>${ic('download')} Sample test data</a>${M?`<button type="button" class="v22-outline-btn" data-v22-export-ds>${ic('file')} Export active dataset</button>`:''}`,'ADMIN · DATA')}${adminNotice()}
 ${M?v22Kpis([['db','Active dataset',V22D.source==='uploaded'?'Uploaded':'Bundled',esc(meta.fileName||''),''],['chart','NAV records',M.navRows.toLocaleString('en-IN'),`${M.funds.length} funds · till ${v22Fmt(M.funds.map(f=>f.navDate).sort().at(-1))}`,'pos'],['users','Users',M.users.length.toLocaleString('en-IN'),`${M.subs.length.toLocaleString('en-IN')} subscriptions`,''],['calendar','Dataset as-of',v22Fmt(M.asOf),`${M.sip.length} SIP months`,'']]):`<div class="v22-notice">${cic('warn',22)}<div><b>No dataset loaded.</b><span>${esc(V22D.error||'Loading…')}</span></div></div>`}
 <section class="v22-card"><div class="v22-card-head"><div><h2>Upload test-data workbook</h2><p>Sheets in the file replace the matching sheets of the active dataset; sheets you leave out are kept. The first upload must contain all required sheets.</p></div></div>
 <div class="v22-pipeline" id="v22-pipe">${[['upload','Upload'],['doc','Parse'],['shield','Validate'],['help','Review'],['check','Publish']].map((x,i)=>`<div data-step="${i}">${cic(x[0],28)}<b>${x[1]}</b></div>`).join('<i></i>')}</div>
 <div class="v22-upload-grid"><label class="v22-drop big" for="v22-wb-file">${cic('upload',52)}<b>Drop the .xlsx workbook here</b><small>Excel (.xlsx / .xls), or a single-sheet .csv · max 50MB · or <u>click to browse</u></small><span class="v22-outline-btn">Choose File</span><em id="v22-wb-name">No file selected</em><input type="file" id="v22-wb-file" accept=".xlsx,.xls,.csv" hidden></label>
 <div class="v22-upload-fields"><label class="v22-fl">If uploading a CSV, it contains${v22Sel('v22-csv-as',Object.keys(V22_SCHEMA))}<small>Workbooks are matched by sheet name; this only applies to CSV files.</small></label><div class="v22-callout">${cic('doc',20)} <span>Required sheets: <b>Funds, NAV_History, Users, Subscriptions, SIP_Dates</b>. Optional: Market_Holidays. Format: <code>docs/21_test_data_excel_format.md</code>.</span></div>${V22D.source==='uploaded'?`<button type="button" class="v22-danger-btn" data-v22-reset>${ic('refresh')} Reset to bundled test data</button>`:''}</div></div>
 <div id="v22-report"></div></section>
 <div class="v22-data-two"><section class="v22-card"><div class="v22-card-head"><h2>Workbook format</h2><div class="v22-seg-pills sm wrap" id="v22-schema-tabs">${Object.keys(V22_SCHEMA).map((s,i)=>`<button type="button" class="${i===1?'active':''}" data-v22-schema="${s}">${s.replace('_',' ')}</button>`).join('')}</div></div><div id="v22-schema-body"><p class="v22-sub" style="margin-bottom:10px">${V22_SCHEMA.NAV_History.desc}</p>${v22SchemaTable('NAV_History')}</div></section>
 <section class="v22-card"><div class="v22-card-head"><h2>Active dataset</h2>${M?v22Status(V22D.source==='uploaded'?'Published':'Active'):''}</div>${M?`<div class="v22-kv">${[['File',esc(meta.fileName||'—')],['Loaded',meta.loadedAt?new Date(meta.loadedAt).toLocaleString('en-IN'):'—'],['By',esc(meta.by||'—')],['Sheets replaced',esc((meta.replaced||Object.keys(V22_SCHEMA)).join(', '))]].map(x=>`<div><span>${x[0]}</span><b>${x[1]}</b></div>`).join('')}</div><div class="v22-sheet-counts">${Object.keys(V22_SCHEMA).map(s=>`<div>${cic({Funds:'bars',NAV_History:'chart',Users:'users',Subscriptions:'crown',SIP_Dates:'calendar',Market_Holidays:'clock'}[s]||'doc',24)}<span>${s}</span><b>${(counts[s]||0).toLocaleString('en-IN')}</b></div>`).join('')}</div>`:'<p class="v22-sub">Nothing loaded yet.</p>'}
 <h3 class="v22-set-h" style="margin:20px 0 10px!important;font-size:15px">Upload history</h3>${hist.length?hist.slice().reverse().map(h=>`<div class="v22-batch">${cic('doc',28)}<div><b>${esc(h.fileName)}</b><small>${new Date(h.loadedAt).toLocaleString('en-IN')} · ${esc((h.replaced||[]).join(', '))}</small></div>${v22Status(h.status||'Published')}</div>`).join(''):'<p class="v22-sub">No uploads in this browser yet.</p>'}</section></div></div>`;
}
let v22LastReport=null,v22LastFile=null;
function v22Pipe(n,fail){document.querySelectorAll('#v22-pipe>div').forEach(x=>{const s=+x.dataset.step;x.classList.toggle('done',s<n);x.classList.toggle('fail',!!fail&&s===n)})}
async function v22HandleFile(file){
 const name=document.getElementById('v22-wb-name'),out=document.getElementById('v22-report');if(!file||!out)return;
 if(!/\.(xlsx|xls|csv)$/i.test(file.name)){out.innerHTML=`<div class="v22-rep-fatal">${cic('warn',24)} Unsupported file type. Upload .xlsx, .xls or .csv.</div>`;return}
 if(file.size>50*1024*1024){out.innerHTML=`<div class="v22-rep-fatal">${cic('warn',24)} File exceeds the 50MB limit.</div>`;return}
 name.textContent=`${file.name} · ${(file.size/1024).toFixed(0)} KB`;v22Pipe(1);out.innerHTML=`<div class="v22-loading inline"><span class="v22-spin"></span><b>Parsing ${esc(file.name)}…</b></div>`;
 await new Promise(r=>setTimeout(r,30));
 try{
  const buf=await file.arrayBuffer();const wb=XLSX.read(buf,{type:'array',dense:true});v22Pipe(2);
  const rep=v22Validate(wb,V22D.sheets,/\.csv$/i.test(file.name)?document.getElementById('v22-csv-as').value:null);v22LastReport=rep;v22LastFile=file.name;v22Pipe(rep.fatal||rep.errors?2:4,rep.fatal||rep.errors);
  out.innerHTML=v22ReportHTML(rep,file.name);
 }catch(e){v22Pipe(1,1);out.innerHTML=`<div class="v22-rep-fatal">${cic('warn',24)} Could not read this file: ${esc(e.message)}</div>`}
}
function v22ReportHTML(rep,file){
 if(rep.fatal&&!Object.keys(rep.sheets).length)return `<div class="v22-rep-fatal">${cic('warn',24)} ${esc(rep.fatal)}</div>`;
 const ok=!rep.fatal&&!rep.errors;
 return `<div class="v22-report ${ok?'ok':'bad'}"><div class="v22-rep-head">${cic(ok?'check':'warn',30)}<div><b>${ok?'Validation passed':'Validation failed'} — ${esc(file)}</b><small>${rep.replaced.length} sheet(s) checked · ${rep.errors} error(s) · ${rep.warnings} warning(s)${rep.ignored.length?` · ignored sheets: ${esc(rep.ignored.join(', '))}`:''}</small></div><div class="v22-rep-actions">${rep.errors||rep.warnings?`<button type="button" class="v22-outline-btn sm" data-v22-errcsv>${ic('download')} Issues CSV</button>`:''}<button type="button" class="v22-outline-btn sm" data-v22-discard>Discard</button><button type="button" class="v22-grad-btn" data-v22-publish ${ok?'':'disabled'}>${ic('check')} Publish dataset</button></div></div>
 ${rep.fatal?`<div class="v22-rep-fatal">${cic('warn',22)} ${esc(rep.fatal)}</div>`:''}
 <div class="v22-rep-sheets">${Object.values(rep.sheets).map(s=>`<details class="v22-rep-sheet" ${s.errors.length?'open':''}><summary>${cic(s.errors.length?'warn':'check',22)}<b>${s.name}</b><span>${(s.total??s.rows.length).toLocaleString('en-IN')} rows · ${s.rows.length.toLocaleString('en-IN')} valid</span>${s.errors.length?`<span class="v22-pill bad">${s.errors.length} errors</span>`:''}${s.warnings.length?`<span class="v22-pill warn">${s.warnings.length} warnings</span>`:''}${!s.errors.length&&!s.warnings.length?'<span class="v22-pill ok">OK</span>':''}</summary>${[...s.errors.map(e=>['bad',e]),...s.warnings.map(e=>['warn',e])].slice(0,25).map(([k,e])=>`<div class="v22-issue ${k}"><span class="mono">Row ${e.row}</span>${e.col?`<code>${e.col}</code>`:''}<span>${esc(e.msg)}</span></div>`).join('')}${s.errors.length+s.warnings.length>25?`<div class="v22-issue more">…${s.errors.length+s.warnings.length-25} more — download the issues CSV.</div>`:''}</details>`).join('')}</div></div>`;
}
async function v22Publish(){
 const rep=v22LastReport;if(!rep||rep.fatal||rep.errors)return;
 const sheets=v22Strip(rep.merged),meta={fileName:v22LastFile,loadedAt:new Date().toISOString(),by:'Admin (demo)',replaced:rep.replaced,counts:Object.fromEntries(Object.entries(sheets).map(([k,v])=>[k,v.length]))};
 v22Apply(sheets,meta);V22D.source='uploaded';
 const hist=(await v22Get('history'))||[];hist.push({...meta,status:'Published'});V22D.history=hist.slice(-10);
 await v22Put('dataset',{sheets,meta});await v22Put('history',V22D.history);
 v22LastReport=null;notify('Dataset published. Dashboards, funds and tables now use the uploaded data.');renderAdmin('data');
}
function v22IssuesCsv(){const rep=v22LastReport;if(!rep)return;const rows=[['sheet','row','column','severity','message']];for(const s of Object.values(rep.sheets)){s.errors.forEach(e=>rows.push([s.name,e.row,e.col||'','error',e.msg]));s.warnings.forEach(e=>rows.push([s.name,e.row,e.col||'','warning',e.msg]))}const csv=rows.map(r=>r.map(x=>`"${String(x).replace(/"/g,'""')}"`).join(',')).join('\n');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.download='mod-alpha-validation-issues.csv';a.click()}
function v22ExportDataset(){if(!V22D.sheets)return;const wb=XLSX.utils.book_new();for(const s of Object.keys(V22_SCHEMA)){const cols=Object.keys(V22_SCHEMA[s].cols);XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([cols,...(V22D.sheets[s]||[]).map(r=>cols.map(c=>r[c]??''))]),s)}XLSX.writeFile(wb,'mod-alpha-active-dataset.xlsx')}

/* ---------------- Fund charts from NAV ---------------- */
function v22Sample(n,from,to,max){const len=to-from+1,step=Math.max(1,Math.ceil(len/max)),idx=[];for(let i=from;i<=to;i+=step)idx.push(i);if(idx.at(-1)!==to)idx.push(to);return idx}
function v22FundSpark(f,i){const n=V22D.model?.navBy[f.id];if(!n||n.v.length<30)return v22Seeded(f.id.charCodeAt(0)+f.id.charCodeAt(2)+i,12,6,22,5);const L=n.v.length-1,j=Math.max(0,v22NavAt(n,v22AddY(n.d[L],1)));return v22Sample(n,j,L,24).map(k=>n.v[k])}
function v22Since(f){return f.since2021||Math.pow(1+(f.returns[5]||0)/100,5.15)}
function v22PeriodStart(last,period){const d=v22D(last);({'1M':()=>d.setUTCMonth(d.getUTCMonth()-1),'3M':()=>d.setUTCMonth(d.getUTCMonth()-3),'6M':()=>d.setUTCMonth(d.getUTCMonth()-6),'1Y':()=>d.setUTCFullYear(d.getUTCFullYear()-1),'3Y':()=>d.setUTCFullYear(d.getUTCFullYear()-3),'5Y':()=>d.setUTCFullYear(d.getUTCFullYear()-5),'10Y':()=>d.setUTCFullYear(d.getUTCFullYear()-10)}[period]||(()=>0))();return v22Iso(d)}
const v22BaseDetailChart=v22DetailChart;
v22DetailChart=function(f,period){
 const n=V22D.model?.navBy[f.id];if(!n||n.v.length<5)return v22BaseDetailChart(f,period);
 const L=n.v.length-1,j=Math.max(0,v22NavAt(n,v22PeriodStart(n.d[L],period))),idx=v22Sample(n,j,L,32),vals=idx.map(k=>n.v[k]);
 const yMax=v22NiceMax(Math.max(...vals)*1.08),yMin=Math.min(...vals)>yMax*.5?Math.floor(Math.min(...vals)*.9/(yMax/5))*(yMax/5):0,step=(yMax-yMin)/5;
 const lab=[],pos=[],W=1080,l=56,r=22,iw=W-l-r-40;const long=['3Y','5Y','10Y'].includes(period);
 idx.forEach((k,i)=>{const d=v22D(n.d[k]),key=long?d.getUTCFullYear():d.getUTCMonth();const pk=i?v22D(n.d[idx[i-1]]):null;if(!i||(long?pk.getUTCFullYear()!==key:pk.getUTCMonth()!==key)){lab.push(long?String(key):V22_MON[key]+(period==='1Y'?" '"+String(d.getUTCFullYear()).slice(2):'')+(period==='1M'?' '+d.getUTCDate():''));pos.push(l+i*iw/(idx.length-1))}});
 const thin=lab.length>8?2:1;const ret=(vals.at(-1)/vals[0]-1)*100,yrs=(v22D(n.d[L])-v22D(n.d[j]))/(365.25*864e5),cagr=yrs>=1?(Math.pow(vals.at(-1)/vals[0],1/yrs)-1)*100:null;
 return v22Chart({w:W,h:330,pad:{l,r,t:18,b:40},yMin,yMax,yTicks:[0,1,2,3,4,5].map(i=>yMin+i*step),yFmt:v=>v?'₹'+Math.round(v):'0',xLabels:lab.filter((_,i)=>i%thin===0),xPos:pos.filter((_,i)=>i%thin===0),axisY:true,label:'Fund NAV from test data',
  series:[{values:vals,stops:[[0,'#3b82f6'],[.45,'#6d6cf6'],[1,'#c84cf0']],areaStops:[[0,'#2563eb'],[.6,'#7c3aed'],[1,'#c026d3']],area:.75,width:3.2,dots:2,r:4.5,endDot:7,glow:'#8b5cf6'}],
  overlays:[{at:[0,-1],cls:'v22-tip v22-tip-left',html:`<small>${v22Fmt(n.d[L])}</small><b>₹${vals.at(-1).toFixed(2)}</b><strong>${ret>=0?'+':''}${ret.toFixed(1)}%${cagr!=null?` <em>· ${cagr.toFixed(1)}% CAGR</em>`:''}</strong>`}]});
};
v22DetailSeries=function(f,period){const n=V22D.model?.navBy[f.id];if(!n)return v22Seeded(f.id.charCodeAt(1),20,f.nav/2,f.nav,f.nav*.03);const L=n.v.length-1,j=Math.max(0,v22NavAt(n,v22PeriodStart(n.d[L],period)));return v22Sample(n,j,L,40).map(k=>n.v[k])};
const v22BaseDash=v22DashChart;
v22DashChart=function(period){
 const M=V22D.model;if(!M)return v22BaseDash(period);
 const top=M.funds.filter(f=>f.returns[5]!=null).sort((a,b)=>b.returns[5]-a.returns[5]).slice(0,3),cols=['#2f8bff','#14d9c5','#d946ef'],tcol=['#2f8bff','#f5b13d','#d946ef'];
 const ser=top.map(f=>{const n=M.navBy[f.id],L=n.v.length-1,j=Math.max(0,v22NavAt(n,v22PeriodStart(n.d[L],period)));const idx=v22Sample(n,j,L,18);return{f,vals:idx.map(k=>(n.v[k]/n.v[j]-1)*100),dates:idx.map(k=>n.d[k])}});
 const all=ser.flatMap(s=>s.vals),hi=v22NiceMax(Math.max(...all)*1.05),lo=Math.min(0,Math.floor(Math.min(...all)/(hi/4))*(hi/4)),ticks=[];for(let v=lo;v<=hi+1e-9;v+=hi/4)ticks.push(+v.toFixed(0));
 const W=580,l=56,r=20,d0=ser[0].dates,long=['3Y','5Y','10Y'].includes(period),lab=[],pos=[];d0.forEach((ds,i)=>{const d=v22D(ds),k=long?d.getUTCFullYear():d.getUTCMonth(),p=i?v22D(d0[i-1]):null;if(i&&(long?p.getUTCFullYear()!==k:p.getUTCMonth()!==k)){lab.push(long?String(k):V22_MON[k]);pos.push(l+i*(W-l-r)/(d0.length-1))}});
 const tip=`<small>${v22Fmt(d0.at(-1))} · ${period} return</small>${ser.map((s,i)=>`<div><i style="--c:${cols[i]}"></i><span>${esc(s.f.short)}</span><b>${s.vals.at(-1)>=0?'+':''}${s.vals.at(-1).toFixed(1)}%</b></div>`).join('')}`;
 return v22Chart({w:W,h:330,pad:{l,r,t:20,b:40},yMin:lo,yMax:hi,yTicks:ticks,yFmt:v=>v+'%',xLabels:lab,xPos:pos,label:'Top funds cumulative return from NAV',series:ser.map((s,i)=>({values:s.vals,color:cols[i],area:i===0?.45:0,width:3,dots:true,r:4,endDot:7,glow:cols[i]})),overlays:[{x:W*.08,y:14,cls:'v22-multi-tip',html:tip}]})
  +`<div class="v22-dash-legend">${ser.map((s,i)=>`<a class="v22-dl-item" href="#/user/fund/${encodeURIComponent(s.f.id)}">${v22FundLogo(s.f)}<div class="v22-dl-txt"><b>${esc(s.f.short)}</b><em><i style="--c:${cols[i]}"></i>${s.vals.at(-1)>=0?'+':''}${s.vals.at(-1).toFixed(1)}% <small>· ${period}</small></em></div></a>`).join('')}</div>`;
};
function v22SipFor(y,m){const r=V22D.model?.sip.find(x=>x.month===`${y}-${String(m+1).padStart(2,'0')}`);if(!V22D.model)return y===2026&&m===9?{day:12,uplift:2.8,alts:[[5,1.6],[20,1.4],[28,1.2]]}:null;if(!r)return null;return{day:r.recommended_day,uplift:r.uplift_pct??0,alts:[[r.alt_day_1,r.alt_uplift_1],[r.alt_day_2,r.alt_uplift_2],[r.alt_day_3,r.alt_uplift_3]].filter(a=>a[0])}}
const v22BaseKpis=v22UserKpis;
v22UserKpis=function(){const M=V22D.model;if(!M)return v22BaseKpis();const t=M.funds.filter(f=>f.returns[5]!=null).sort((a,b)=>b.returns[5]-a.returns[5])[0];const a=v22D(M.asOf),sp=v22SipFor(a.getUTCFullYear(),a.getUTCMonth());const cat=t?.category,peers=M.funds.filter(f=>f.category===cat&&f.returns[5]!=null),avg=peers.reduce((s,f)=>s+f.returns[5],0)/(peers.length||1);
 return [['trophy','gold','Top Performing Fund','(5Y Returns)',t?t.returns[5].toFixed(1)+'%':'—',t?t.name:'—',t?t.type:''],['calendar','violet','Best AI Investment Date','This Month',sp?sp.day+(sp.day%10===1&&sp.day!==11?'st':sp.day%10===2&&sp.day!==12?'nd':sp.day%10===3&&sp.day!==13?'rd':'th'):'—',sp?`+${sp.uplift}% vs fixed SIP`:'Not published',''],['bars','blue','Average Category Return',`(${cat||'—'})`,avg.toFixed(1)+'%','5Y CAGR',''],['db','teal','Funds Tracked','In Our Database',M.funds.length.toLocaleString('en-IN'),'Mutual Funds','']]};

/* ---------------- Events ---------------- */
document.addEventListener('click',e=>{const t=e.target;let b;
 if((b=t.closest('[data-v22-ap-users],[data-v22-ap-subs]'))){const k=b.hasAttribute('data-v22-ap-users')?'users':'subs';v22AdmPeriod[k]=b.getAttribute('data-v22-ap-'+k);b.parentElement.querySelectorAll('button').forEach(x=>x.classList.toggle('active',x===b));document.getElementById('v22-ch-'+k).innerHTML=v22AdminChart(k,v22AdmPeriod[k]);e.stopPropagation();return}
 if((b=t.closest('#users-table [data-user]'))){e.stopPropagation();const u=D.users.find(x=>x.id===b.dataset.user);if(u)showModal(`User record · ${u.id}`,`<div class="v22-kv">${[['Name',esc(u.name)],['Email',esc(u.email)],['Mobile',esc(u.mobile||'—')],['Joined',u.joined],['Account',v22Status(u.status)],['KYC',v22Status(u.kyc)],['Plan',esc(u.plan)],['Subscription',v22Status(u.sub)]].map(x=>`<div><span>${x[0]}</span><b>${x[1]}</b></div>`).join('')}</div><p class="v22-hint">PII access is audited and permission-controlled in production. Test data record.</p><button class="secondary-btn" data-modal-close>Close</button>`);return}
 if((b=t.closest('[data-v22-upage]'))&&!b.disabled){v22UPage=+b.dataset.v22Upage;document.getElementById('users-table').innerHTML=usersTable(v22UList||D.users);return}
 if((b=t.closest('[data-v22-spage]'))&&!b.disabled){v22SPage=+b.dataset.v22Spage;document.getElementById('v22-sub-list').innerHTML=v22SubRows(v22SList);return}
 if(t.closest('[data-v22-publish]')){v22Publish();return}
 if(t.closest('[data-v22-discard]')){v22LastReport=null;document.getElementById('v22-report').innerHTML='';document.getElementById('v22-wb-name').textContent='No file selected';document.getElementById('v22-wb-file').value='';v22Pipe(0);return}
 if(t.closest('[data-v22-errcsv]')){v22IssuesCsv();return}
 if(t.closest('[data-v22-export-ds]')){v22ExportDataset();return}
 if(t.closest('[data-v22-reset]')){showModal('Reset to bundled test data?','<p>The uploaded dataset will be removed from this browser and the bundled <code>mod-alpha-test-data.xlsx</code> will be used again.</p><button class="v22-danger-btn" data-v22-reset-ok>Reset dataset</button>');return}
 if(t.closest('[data-v22-reset-ok]')){(async()=>{await v22Del('dataset');modalRoot.innerHTML='';V22D.ready=false;V22D.loaded=false;renderAdmin('data');await v22LoadDataset();notify('Bundled test data restored.');route()})();return}
 if((b=t.closest('[data-v22-schema]'))){b.parentElement.querySelectorAll('button').forEach(x=>x.classList.toggle('active',x===b));document.getElementById('v22-schema-body').innerHTML=`<p class="v22-sub" style="margin-bottom:10px">${V22_SCHEMA[b.dataset.v22Schema].desc}</p>`+v22SchemaTable(b.dataset.v22Schema);return}
 if(t.closest('[data-action="v22-export-users"]')){const rows=[['user_id','full_name','email','signup_date','account_status','kyc_status','plan','subscription']].concat((v22UList||D.users).map(u=>[u.id,u.name,u.email,u.signup||u.joined,u.status,u.kyc,u.plan,u.sub]));const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([rows.map(r=>r.map(x=>`"${String(x??'').replace(/"/g,'""')}"`).join(',')).join('\n')],{type:'text/csv'}));a.download='mod-alpha-users.csv';a.click();notify(`Exported ${rows.length-1} users (current filter).`);return}
},true);
document.addEventListener('change',e=>{if(e.target.id==='v22-wb-file'&&e.target.files[0])v22HandleFile(e.target.files[0])});
document.addEventListener('dragover',e=>{const d=e.target.closest?.('label[for="v22-wb-file"]');if(d){e.preventDefault();d.classList.add('over')}});
document.addEventListener('dragleave',e=>{e.target.closest?.('label[for="v22-wb-file"]')?.classList.remove('over')});
document.addEventListener('drop',e=>{const d=e.target.closest?.('label[for="v22-wb-file"]');if(!d)return;e.preventDefault();d.classList.remove('over');if(e.dataTransfer.files[0])v22HandleFile(e.dataTransfer.files[0])});

(async()=>{if(window.MA_API&&MA_API.enabled)return;V22D.history=(await v22Get('history'))||[];await v22LoadDataset();route()})();

/* hover: tooltip + highlighted bar follow the pointer */
function v22HovSet(el,i){const h=V22_HOV[el.dataset.v22Hov];if(!h)return;i=Math.max(0,Math.min(h.n-1,i));if(el._hi===i)return;el._hi=i;const x=(h.l+(i+.5)*h.iw/h.n)/h.W*100;const tip=el.querySelector('.v22-hov-tip'),ln=el.querySelector('.v22-hov-line');if(tip){tip.innerHTML=h.tips[i];tip.style.left=x+'%';tip.classList.toggle('left',i>h.n*.6)}if(ln){ln.style.left=x+'%';ln.classList.toggle('on',i!==h.def||el.matches(':hover'))}el.querySelectorAll('rect[data-i]').forEach(r=>{const on=+r.dataset.i===i;r.classList.toggle('hov',on);r.setAttribute('fill',r.getAttribute('fill').replace(/(b|bp)\)$/,on?'bp)':'b)'))})}
document.addEventListener('pointermove',e=>{const el=e.target.closest?.('[data-v22-hov]');if(!el)return;const h=V22_HOV[el.dataset.v22Hov];if(!h)return;const r=el.getBoundingClientRect(),x=(e.clientX-r.left)/r.width*h.W;v22HovSet(el,Math.floor((x-h.l)/h.iw*h.n))});
document.addEventListener('pointerout',e=>{const el=e.target.closest?.('[data-v22-hov]');if(!el||el.contains(e.relatedTarget))return;const h=V22_HOV[el.dataset.v22Hov];if(h){v22HovSet(el,h.def);el.querySelector('.v22-hov-line')?.classList.remove('on')}});
