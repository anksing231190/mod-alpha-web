/* ==========================================================================
   Feature: admin — audit logs (#/admin/audit)
   Searchable list of security- and data-relevant actions.
   ========================================================================== */

/** Demo audit entries. */
const V22_AUDIT=[['28 Oct 2026 10:42','admin.demo','SIP_DATE_PUBLISHED','November 2026 · v1.0','Success','Configuration','calendar'],['27 Oct 2026 16:18','data.ops','NAV_BATCH_PUBLISHED','NAV-DEMO-028','Success','Data','db'],['26 Oct 2026 13:04','superadmin.demo','PLAN_CONFIGURATION_UPDATED','Premium plan','Success','Subscription','crown'],['25 Oct 2026 11:32','admin.demo','NOTIFICATION_TEMPLATE_EDITED','SIP reminder','Success','Configuration','bell'],['24 Oct 2026 09:12','system.demo','LOGIN_RATE_LIMIT_EVENT','Auth service','Blocked','Access','shield'],['23 Oct 2026 18:47','admin.demo','USER_SUSPENDED','U-10024','Success','Access','user']];

/** Audit log screen. */
function adminAudit(){return `<div class="v22 v22-adm">${v22Head('Audit Logs','Review administrative actions and sensitive platform events.',`<button type="button" class="v22-outline-btn" data-action="export-audit">${ic('download')} Export logs</button>`,'ADMIN · SECURITY')}${adminNotice()}
 ${v22Kpis([['doc','Events (30 days)','1,284','All event types',''],['check','Successful','1,261','98.2%','pos'],['shield','Blocked','23','Rate-limit & policy','warn'],['users','Active admins','4','2 with super-admin','']])}
 <section class="v22-card"><div class="v22-filters"><label class="v22-search">${ic('search')}<input id="v22-audit-search" placeholder="Search action, actor or reference"></label>${v22Sel('v22-audit-type',['All event types','Configuration','Data','Access','Subscription'])}${v22Sel('',['Last 30 days','Last 7 days','Last 90 days'])}</div>
 <div class="v22-timeline" id="v22-audit-list">${V22_AUDIT.map(r=>`<div class="v22-tl" data-type="${r[5]}">${cic(r[6],30)}<div class="v22-tl-main"><b class="mono">${r[2]}</b><small><span class="v22-actor">${r[1]}</span> · ${r[3]} · ${r[5]}</small></div><time>${r[0]}</time>${v22Status(r[4])}</div>`).join('')}</div>
 <p class="v22-callout">${cic('lock',20)} Audit records are append-only in production. This page contains static sample events; no real security monitoring is connected.</p></section></div>`}

/** Apply audit filters. */
function v22FilterAudit(){const q=(document.getElementById('v22-audit-search')?.value||'').toLowerCase(),ty=document.getElementById('v22-audit-type')?.value;document.querySelectorAll('#v22-audit-list .v22-tl').forEach(r=>{r.hidden=!(r.innerText.toLowerCase().includes(q)&&(ty==='All event types'||r.dataset.type===ty))})}
