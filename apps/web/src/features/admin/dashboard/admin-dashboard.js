/* ==========================================================================
   Feature: admin dashboard (#/admin/dashboard)
   KPIs (users, subscribers, conversion, revenue) with period comparison, the growth
   and subscription charts, the date-range picker and the recent sign-ups table.
   ========================================================================== */

/** Admin KPI tile with period comparison. */
function v22AdminKpi(icon,tone,label,val,delta,prev,cmp='vs last month'){const down=String(delta).trim().startsWith('-');return `<article class="v22-akpi"><span class="v22-tile ${tone} lg">${ic(icon)}</span><span class="v22-akpi-ghost">${ic(icon)}</span><div class="v22-akpi-main"><small>${label}</small><b>${val}</b><div class="v22-akpi-delta ${down?'down':'up'}"><em>${ic(down?'trend':'trend')}${delta}</em><span>${cmp}</span></div>${prev?`<small class="v22-akpi-prev">${cmp==='vs last month'?'Last month':'Previous period'}: <b>${prev}</b></small>`:''}</div></article>`}

/** Users / subscriptions / revenue for a period from the dataset. */
function v22MonthStats(){
 const M=V22D.model,a=v22D(M.asOf),y=a.getUTCFullYear(),m=a.getUTCMonth();
 // First / last day of the month i months ago (YYYY-MM-DD).
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

/** Selected period per admin chart. */
let v22AdmPeriod={users:'30D',subs:'30D'};

/** Admin dashboard screen. */
function adminDashboard(){
 if(!V22D.loaded)return v22Loading('Admin Dashboard');if(!V22D.ready)return v22NoData('Admin Dashboard');
 const M=V22D.model,S=v22KpiStats(),a=v22D(M.asOf);
 const cur=M.sip.find(r=>r.month===M.asOf.slice(0,7))||M.sip.at(-1),next=M.sip.find(r=>r.month>M.asOf.slice(0,7)&&r.status!=='Draft');
 const curD=cur?v22D(cur.month+'-'+String(cur.recommended_day).padStart(2,'0')):null,nextD=next?v22D(next.month+'-'+String(next.recommended_day).padStart(2,'0')):null;
 const signups=M.users.slice(-5).reverse(),subs=M.subs.slice(-5).reverse(),uById=new Map(M.users.map(u=>[u.user_id,u]));
 const lastNav=M.funds.map(f=>f.navDate).sort().at(-1),meta=V22D.meta||{},upTo=lastNav&&(v22D(M.asOf)-v22D(lastNav))/864e5<=4;
 const newFunds=M.funds.filter(f=>f.inception>=S.monthStart).length;
 return `<div class="v22 v22-adm v22-admin">
 <section class="v22-admin-head"><div><h1>Admin Dashboard</h1><p>Manage users, data, SIP notifications and monitor platform performance.</p></div><div class="v22-head-right"><span class="v22-src">${cic('db',18)} ${V22D.source==='uploaded'?'Uploaded dataset':'Dataset'} · as of ${v22Fmt(M.asOf)}</span><button type="button" class="v22-range" data-action="v22-range">${v22Fmt(S.from)} - ${v22Fmt(S.to)} ${ic('calendar')}</button></div></section>
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
   <div class="v22-upload-row"><a class="v22-drop" href="#/admin/data">${ic('cloudUp','up')}<b>Upload Data (Excel)</b><small>Funds, NAV, Users, Subscriptions and SIP dates in one workbook</small><span class="v22-outline-btn">Go to upload</span></a>
   <div class="v22-last"><b>Active Dataset</b><div class="v22-last-when">${ic('file')}<span>${esc(v22Fmt(meta.loadedAt?.slice(0,10)))}${meta.loadedAt?', '+new Date(meta.loadedAt).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'}):''}</span><em>${V22D.source==='uploaded'?'Uploaded':'Bundled'}</em></div><dl><dt>File:</dt><dd>${esc(meta.fileName||'—')}</dd><dt>NAV rows:</dt><dd>${M.navRows.toLocaleString('en-IN')} (${M.funds.length} funds)</dd><dt>Loaded by:</dt><dd>${esc(meta.by||'—')}</dd></dl><a class="v22-outline-btn sm" href="#/admin/data">View Details ${ic('arrowR')}</a></div></div>
   <p class="v22-supported">${ic('checkCircle')} Format: .xlsx workbook as per docs/21_test_data_excel_format.md · Max 50MB.</p></article>
 </section>
 <section class="v22-admin-lower">
  <article class="v22-card v22-tbl-card"><div class="v22-card-head"><h2>${ic('user','t-ic blue')} Recent User Signups</h2><a href="#/admin/users">View All ${ic('arrowR')}</a></div><table class="v22-mini-table v22-compact"><thead><tr><th>User</th><th>Signed up</th><th>Status</th></tr></thead><tbody>${signups.map(u=>`<tr><td><b>${esc(u.full_name)}</b><small>${esc(u.mobile||u.email)}</small></td><td>${v22Fmt(u.signup_date)}</td><td>${v22Status(u.account_status)}</td></tr>`).join('')}</tbody></table></article>
  <article class="v22-card v22-tbl-card"><div class="v22-card-head"><h2>${ic('crown','t-ic gold')} Recent Subscriptions</h2><a href="#/admin/subscriptions">View All ${ic('arrowR')}</a></div><table class="v22-mini-table v22-compact"><thead><tr><th>User</th><th>Plan</th><th>Status</th></tr></thead><tbody>${subs.map(s=>`<tr><td><b>${esc(uById.get(s.user_id)?.full_name||s.user_id)}</b><small>${v22Fmt(s.start_date)}</small></td><td><b>${s.plan} (${s.billing_cycle})</b><small>${inr(s.amount_inr)}</small></td><td>${v22Status(s.status)}</td></tr>`).join('')}</tbody></table></article>
  <article class="v22-card v22-summary-card"><div class="v22-card-head"><h2>${ic('db','t-ic teal')} Data Summary</h2><small class="v22-updated">${ic('refresh')} As of ${v22Fmt(M.asOf)}</small></div><div class="v22-dsum">${[['bars','teal','Total Mutual Funds',M.funds.length.toLocaleString('en-IN'),newFunds?`+${newFunds} new`:'No new funds this month','pos'],['grid','violet','Categories',M.categories.length,M.categories.slice(0,3).join(', ')+(M.categories.length>3?'…':''),''],['layers','green','Total NAV Records',M.navRows.toLocaleString('en-IN'),`Till ${v22Fmt(lastNav)}`,''],['calendar','blue','Last Data Date',v22Fmt(lastNav),upTo?'Up to date':'Stale — upload NAV',upTo?'badge':'warnb']].map(x=>`<div><span class="v22-tile ${x[1]}">${ic(x[0])}</span><div><small>${x[2]}</small><b>${x[3]}</b><em class="${x[5]}">${x[4]}</em></div></div>`).join('')}</div></article>
 </section></div>`;
}

/** Selected date range. */
let V22_RANGE=null;

/** Buckets for the selected range. */
function v22RangeBuckets(r){const f=v22D(r.from),t=v22D(r.to),days=Math.round((t-f)/864e5)+1,out=[];
 if(days<=45){for(let i=0;i<days;i++){const d=new Date(f);d.setUTCDate(d.getUTCDate()+i);const s=v22Iso(d);out.push({from:s,to:s,label:`${d.getUTCDate()} ${V22_MON[d.getUTCMonth()]}`})}}
 else if(days<=200){for(let s=new Date(f);s<=t;s.setUTCDate(s.getUTCDate()+7)){const e=new Date(s);e.setUTCDate(e.getUTCDate()+6);if(e>t)e.setTime(t);out.push({from:v22Iso(s),to:v22Iso(e),label:`${s.getUTCDate()} ${V22_MON[s.getUTCMonth()]}`,tip:`${v22Fmt(v22Iso(s))} – ${v22Fmt(v22Iso(e))}`})}}
 else{let s=new Date(Date.UTC(f.getUTCFullYear(),f.getUTCMonth(),1));while(s<=t){const e=new Date(Date.UTC(s.getUTCFullYear(),s.getUTCMonth()+1,0));out.push({from:v22Iso(s<f?f:s),to:v22Iso(e>t?t:e),label:`${V22_MON[s.getUTCMonth()]} ${String(s.getUTCFullYear()).slice(2)}`});s=new Date(Date.UTC(s.getUTCFullYear(),s.getUTCMonth()+1,1))}}
 return out}

/** KPIs for the selected range. */
function v22KpiStats(){
 const M=V22D.model;
 if(!V22_RANGE){const S=v22MonthStats();return{...S,from:S.monthStart,to:M.asOf,cmp:'vs last month'}}
 const{from,to}=V22_RANGE,len=Math.round((v22D(to)-v22D(from))/864e5);const pe=new Date(v22D(from));pe.setUTCDate(pe.getUTCDate()-1);const ps=new Date(pe);ps.setUTCDate(ps.getUTCDate()-len);const pFrom=v22Iso(ps),pTo=v22Iso(pe);
 const totalAt=iso=>v22CountIn(M.users,'signup_date','0000',iso),activeAt=iso=>M.subs.filter(s=>s.start_date<=iso&&(s.status==='Active'||s.status==='Past due'||(s.last_payment_date&&s.last_payment_date>=iso))).length;
 const total=totalAt(to),totalPrev=totalAt(pTo),activeNow=to>=M.asOf?M.subs.filter(s=>s.status==='Active').length:activeAt(to),activePrev=activeAt(pTo),revNow=v22SumPays(from,to),revPrev=v22SumPays(pFrom,pTo),conv=activeNow/(total||1)*100,convPrev=activePrev/(totalPrev||1)*100;
 return{from,to,cmp:'vs previous period',total,totalPrev,activeNow,activePrev,conv,convPrev,revNow,revPrev,dTotal:(total/(totalPrev||1)-1)*100,dActive:(activeNow/(activePrev||1)-1)*100,dConv:conv-convPrev,dRev:(revNow/(revPrev||1)-1)*100,monthStart:from};
}

/** Date-range dialog (presets + from / to). */
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
