/* ==========================================================================
   Feature: admin — subscriptions (#/admin/subscriptions)
   Subscription KPIs and table, plus the "Manage plans" price editor.
   ========================================================================== */

/** Filtered subscriptions and current page. */
let v22SList=null,v22SPage=1;

/** Subscription table rows. */
function v22SubRows(list){const pages=Math.max(1,Math.ceil(list.length/V22_UPER));v22SPage=Math.min(v22SPage,pages);const uById=new Map((V22D.model?.users||[]).map(u=>[u.user_id,u]));
 return list.length?`<div class="table-scroll"><table class="v22-table v22-admin-table"><thead><tr><th>Subscription</th><th>User</th><th>Plan</th><th>Amount</th><th>Started</th><th>Renewal</th><th>Status</th><th>Payment ref</th></tr></thead><tbody>${list.slice((v22SPage-1)*V22_UPER,v22SPage*V22_UPER).map((r,i)=>`<tr><td class="mono">${r.subscription_id}</td><td><div class="v22-who">${v22Avatar(uById.get(r.user_id)?.full_name||r.user_id,i)}<div><b>${esc(uById.get(r.user_id)?.full_name||r.user_id)}</b><small>${r.user_id}</small></div></div></td><td>${r.plan} <small class="v22-muted">· ${r.billing_cycle}</small></td><td><b>${inr(r.amount_inr)}</b></td><td>${v22Fmt(r.start_date)}</td><td>${v22Fmt(r.renewal_date)}</td><td>${v22Status(r.status)}</td><td class="mono">${esc(r.payment_ref||'—')}</td></tr>`).join('')}</tbody></table></div>${v22Pager(list.length,v22SPage,pages,'data-v22-spage')}`:`<div class="v22-empty">No subscriptions match these filters.</div>`}

/** Apply subscription filters. */
function v22FilterSubs(){const q=(document.getElementById('v22-sub-search')?.value||'').toLowerCase(),st=document.getElementById('v22-sub-state')?.value,pl=document.getElementById('v22-sub-plan')?.value,uById=new Map(V22D.model.users.map(u=>[u.user_id,u.full_name]));v22SPage=1;v22SList=V22D.model.subs.slice().reverse().filter(r=>(!q||(r.subscription_id+' '+r.user_id+' '+(uById.get(r.user_id)||'')).toLowerCase().includes(q))&&(st==='All states'||r.status===st)&&(pl==='All plans'||r.plan===pl));document.getElementById('v22-sub-list').innerHTML=v22SubRows(v22SList)}

/** Subscriptions screen. */
function adminSubs(){
 if(!V22D.loaded)return v22Loading('Subscriptions');if(!V22D.ready)return v22NoData('Subscriptions');
 const M=V22D.model,S=v22MonthStats(),act=M.subs.filter(s=>s.status==='Active'),pd=M.subs.filter(s=>s.status==='Past due').length,canc=M.subs.filter(s=>s.status==='Cancelled'&&s.last_payment_date>=S.monthStart).length;
 const paidUsers=new Set(act.map(s=>s.user_id)).size,free=M.users.length-paidUsers,mrr=act.reduce((a,s)=>a+s.amount_inr/({Monthly:1,Quarterly:3,Yearly:12}[s.billing_cycle]),0);
 const cnt={Free:free,Pro:act.filter(s=>s.plan==='Pro').length,Premium:act.filter(s=>s.plan==='Premium').length},tot=M.users.length;
 v22SPage=1;v22SList=M.subs.slice().reverse();
 return `<div class="v22 v22-adm">${v22Head('Subscriptions','Review plans, subscription lifecycle, invoices and payment reconciliation.',`<button type="button" class="v22-outline-btn" data-action="manage-plans">${ic('gear')} Manage plans</button>`,'ADMIN · BILLING')}${adminNotice()}
 ${v22Kpis([['check','Active subscriptions',act.length.toLocaleString('en-IN'),v22Pct(S.dActive)+' vs last month','pos'],['rupee','MRR (monthly equivalent)',inr(mrr),`Collected this month ${inr(S.revNow)}`,'pos'],['warn','Past due',pd.toLocaleString('en-IN'),'Requires follow-up','warn'],['refund','Cancelled this month',canc.toLocaleString('en-IN'),`${M.subs.filter(s=>s.status==='Cancelled').length} cancelled in total`,'']])}
 <section class="v22-plan-admin">${D.plans.map((p,i)=>`<article class="v22-card"><div class="v22-pa-top">${cic(['sprout','rocket','crown'][i],34)}<div><b>${p.name}</b><small>${esc(p.tagline)}</small></div><span class="v22-pill ${i===1?'info':'neutral'}">${i===1?'Most popular':p.period}</span></div><div class="v22-pa-price">${p.price?inr(p.price):'₹0'}<span>/month</span></div><div class="v22-pa-stats"><div><small>${i?'Active subs':'Users'}</small><b>${cnt[p.name].toLocaleString('en-IN')}</b></div><div><small>Entitlements</small><b>${p.features.length}</b></div><div><small>Share</small><b>${(cnt[p.name]/tot*100).toFixed(1)}%</b></div></div><i class="v22-bar"><em style="width:${(cnt[p.name]/tot*100).toFixed(1)}%"></em></i></article>`).join('')}</section>
 <section class="v22-card"><div class="v22-card-head"><h2>All subscriptions</h2><span class="v22-muted">${M.subs.length.toLocaleString('en-IN')} records</span></div><div class="v22-filters"><label class="v22-search">${ic('search')}<input id="v22-sub-search" placeholder="Search subscription ID, user ID or name"></label>${v22Sel('v22-sub-state',['All states',...V22_ENUM.subStatus])}${v22Sel('v22-sub-plan',['All plans',...V22_ENUM.subPlan])}</div><div id="v22-sub-list">${v22SubRows(v22SList)}</div>
 <p class="v22-callout">${cic('shield',20)} Payment status must be verified through signed provider webhooks and reconciliation.</p></section></div>`;
}

/** 'Manage plans' price editor dialog. */
function v22PricingModal(focus){
 showModal('Pricing configuration',`<div class="v22 v22-pricing-cfg"><p class="v22-sub">Edit plan prices, taglines and entitlements. Changes update the public Pricing section and Subscription page in <b>this browser only</b> until the Pricing Configuration API (BILL-04) is connected.</p>
 <div class="v22-pc-list">${D.plans.map((p,i)=>`<section class="v22-pc ${focus===p.name?'focus':''}" data-v22-pc="${i}"><header>${cic(['sprout','rocket','crown'][i]||'doc',30)}<b>${p.name}</b><label class="v22-pc-active">${v22Toggle(p.active!==false,'data-pc-active')}<span>Active</span></label></header>
  <div class="v22-pc-grid"><label class="v22-fl">Monthly (₹)<input type="number" min="0" step="1" data-pc="Monthly" value="${p.prices.Monthly}"></label><label class="v22-fl">Quarterly (₹)<input type="number" min="0" step="1" data-pc="Quarterly" value="${p.prices.Quarterly}"></label><label class="v22-fl">Yearly (₹)<input type="number" min="0" step="1" data-pc="Yearly" value="${p.prices.Yearly}"><small data-pc-save>${p.prices.Monthly?`Saves ${Math.max(0,Math.round((1-p.prices.Yearly/(p.prices.Monthly*12))*100))}% vs monthly`:'Free'}</small></label></div>
  <label class="v22-fl">Tagline<input data-pc-tag value="${esc(p.tagline)}"></label><label class="v22-fl">Entitlements <small>one per line</small><textarea rows="${Math.max(3,p.features.length)}" data-pc-feat>${esc(p.features.join('\n'))}</textarea></label></section>`).join('')}</div>
 <div id="v22-pc-err" class="v22-err"></div><div class="v22-modal-actions"><button type="button" class="v22-outline-btn" data-v22-pc-reset>Restore defaults</button><button type="button" class="v22-grad-btn" data-v22-pc-save>Save pricing</button></div></div>`);
 setTimeout(()=>document.querySelector('.v22-pc.focus')?.scrollIntoView({block:'center'}),50);
}

/** Save edited prices (demo: this browser). */
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
