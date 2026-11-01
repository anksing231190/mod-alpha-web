/* ==========================================================================
   Feature: admin — user management (#/admin/users)
   Searchable, filterable user table with paging and CSV export.
   ========================================================================== */

/** Filtered users and current page. */
let v22UList=null,v22UPage=1;

/** Users per page. */
const V22_UPER=15;

/** Users table. */
function usersTable(users){
 v22UList=users;const pages=Math.max(1,Math.ceil(users.length/V22_UPER));v22UPage=Math.min(v22UPage,pages);const shown=users.slice((v22UPage-1)*V22_UPER,v22UPage*V22_UPER);
 if(!users.length)return `<div class="v22-empty">No users match these filters.</div>`;
 return `<div class="table-scroll"><table class="v22-table v22-admin-table"><thead><tr><th>User</th><th>User ID</th><th>Joined</th><th>Account</th><th>KYC</th><th>Plan</th><th>Subscription</th><th></th></tr></thead><tbody>${shown.map((u,i)=>`<tr><td><div class="v22-who">${v22Avatar(u.name,i)}<div><b>${esc(u.name)}</b><small>${esc(u.email)}</small></div></div></td><td class="mono">${u.id}</td><td>${u.joined}</td><td>${v22Status(u.status)}</td><td>${v22Status(u.kyc)}</td><td>${esc(u.plan)}</td><td>${v22Status(u.sub)}</td><td><button type="button" class="v22-row-btn" data-user="${u.id}">${ic('eye')} View</button></td></tr>`).join('')}</tbody></table></div>${v22Pager(users.length,v22UPage,pages,'data-v22-upage')}`;
}

/** Apply the search / status filters. */
function filterUsers(){const q=(document.getElementById('user-search')?.value||'').toLowerCase(),s=document.getElementById('user-status')?.value,k=document.getElementById('user-kyc')?.value;v22UPage=1;document.getElementById('users-table').innerHTML=usersTable(D.users.filter(u=>(!q||(u.name+' '+u.email+' '+u.id).toLowerCase().includes(q))&&(s==='All statuses'||u.status===s)&&(k==='All KYC states'||u.kyc===k)))}

/** User management screen. */
function adminUsers(){
 if(!V22D.loaded)return v22Loading('User Management');
 const U=D.users,c=f=>U.filter(f).length,ms=V22D.ready?v22MonthStats().monthStart:null;
 return `<div class="v22 v22-adm">${v22Head('User Management','Search user records and review verification, consent and subscription status.',`<button type="button" class="v22-outline-btn" data-action="v22-export-users">${ic('download')} Export CSV</button>`,'ADMIN · USERS')}${adminNotice()}
 ${v22Kpis([['users','Total users',U.length.toLocaleString('en-IN'),ms?`${c(u=>u.signup>=ms)} joined this month`:'Sample','pos'],['check','Active accounts',c(u=>u.status==='Active').toLocaleString('en-IN'),`${(c(u=>u.status==='Active')/U.length*100).toFixed(1)}% of users`,''],['idcard','KYC pending / in review',c(u=>u.kyc==='Pending'||u.kyc==='In review').toLocaleString('en-IN'),'Needs review','warn'],['warn','Suspended / closed',c(u=>u.status!=='Active').toLocaleString('en-IN'),'Policy or user request','bad']])}
 <section class="v22-card"><div class="v22-filters"><label class="v22-search">${ic('search')}<input id="user-search" placeholder="Search name, email or user ID"></label>${v22Sel('user-status',['All statuses',...V22_ENUM.acct])}${v22Sel('user-kyc',['All KYC states',...V22_ENUM.kyc])}</div><div id="users-table">${(v22UPage=1,usersTable(U))}</div></section></div>`;
}
