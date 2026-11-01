/* ==========================================================================
   Feature: admin — SIP date configuration (#/admin/sipdate)
   Pick the month's recommended day, run the checks (weekend, holiday, past date) and publish.
   ========================================================================== */

/** SIP date configuration screen. */
function adminSipDate(){
 if(!V22D.loaded)return v22Loading('SIP Date Configuration');if(!V22D.ready)return v22NoData('SIP Date Configuration');
 const M=V22D.model,pub=M.sip.filter(r=>r.status==='Published').at(-1)||M.sip.at(-1),d=v22D(pub.month+'-'+String(pub.recommended_day).padStart(2,'0'));
 const dn=['SUNDAY','MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY'][d.getUTCDay()],act=M.subs.filter(s=>s.status==='Active').length;
 const alts=[pub.alt_day_1,pub.alt_day_2,pub.alt_day_3].filter(Boolean),months=[...new Set([...M.sip.map(r=>r.month),pub.month])];
 // Next month (YYYY-MM).
 const nextM=(()=>{const x=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,1));return `${x.getUTCFullYear()}-${String(x.getUTCMonth()+1).padStart(2,'0')}`})();
 // '2026-11' → 'November 2026'.
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
