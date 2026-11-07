/* ==========================================================================
   Live mode — admin subscriptions and plan pricing (GET /admin/subscriptions, PUT /admin/plans/:id).
   ========================================================================== */
(function () {
  if (!window.MA_LIVE) return; // demo mode (no API): nothing to do
  const { API, S, asyncPage, busy, errMsg, fail, fmt, loadPublicData, on, pager } = MA_LIVE;
  // ---- subscriptions & pricing
  const SF = { q: '', status: '', plan: '', page: 1 };
  adminSubs = function () { return `<div class="v22 v22-adm">${v22Head('Subscriptions', 'Review plans, subscription lifecycle, invoices and payment reconciliation.', `<button type="button" class="v22-outline-btn" data-ma-pricing>${ic('gear')} Manage plans</button>`, 'ADMIN · BILLING')}<div id="ma-subs">${asyncPage('subscriptions', subsHtml)}</div></div>`; };
  // Subscriptions page (or only the list) from GET /admin/subscriptions.
  async function subsHtml(listOnly) {
    const r = await API.get('/admin/subscriptions', { q: SF.q, status: SF.status, plan: SF.plan, page: SF.page, pageSize: 15 }), K = r.kpis;
    const list = r.items.length ? `<div class="table-scroll"><table class="v22-table v22-admin-table"><thead><tr><th>Subscription</th><th>User</th><th>Plan</th><th>Amount</th><th>Started</th><th>Renewal</th><th>Status</th><th>Provider</th></tr></thead><tbody>${r.items.map((s, i) => `<tr><td class="mono">${esc(s.id)}</td><td><div class="v22-who">${v22Avatar(s.user_name, i)}<div><b>${esc(s.user_name)}</b><small>${esc(s.user_ref)}</small></div></div></td><td>${esc(s.plan)} <small class="v22-muted">· ${esc(s.cycle)}</small></td><td><b>${inr(s.amount)}</b></td><td>${fmt(s.start_date)}</td><td>${s.cancel_at_period_end ? 'Ends ' : ''}${fmt(s.renewal_date)}</td><td>${v22Status(s.status)}</td><td>${esc(s.provider)}</td></tr>`).join('')}</tbody></table></div>${pager(r.total, r.page, r.pageSize, 'data-ma-spage')}` : '<div class="v22-empty">No subscriptions match these filters.</div>';
    if (listOnly) return list;
    const tot = K.totalUsers || 1, cnt = { Free: tot - (K.byPlan.Pro || 0) - (K.byPlan.Premium || 0), Pro: K.byPlan.Pro || 0, Premium: K.byPlan.Premium || 0 };
    return `${v22Kpis([['check', 'Active subscriptions', (+K.active).toLocaleString('en-IN'), `${K.past_due} past due`, 'pos'], ['rupee', 'MRR (monthly equivalent)', inr(K.mrr), 'Active plans only', 'pos'], ['warn', 'Past due', (+K.past_due).toLocaleString('en-IN'), 'Requires follow-up', 'warn'], ['refund', 'Cancelled this month', (+K.cancelled_month).toLocaleString('en-IN'), `${K.cancelled} cancelled in total`, '']])}
    <section class="v22-plan-admin">${(S.plans || []).map((p, i) => `<article class="v22-card"><div class="v22-pa-top">${cic(['sprout', 'rocket', 'crown'][i] || 'doc', 34)}<div><b>${esc(p.name)}</b><small>${esc(p.tagline)}</small></div><span class="v22-pill ${p.active ? 'ok' : 'neutral'}">${p.active ? 'Active' : 'Hidden'}</span></div><div class="v22-pa-price">${inr(p.prices.Monthly)}<span>/month</span></div><div class="v22-pa-stats"><div><small>${i ? 'Active subs' : 'Users'}</small><b>${(cnt[p.id] || 0).toLocaleString('en-IN')}</b></div><div><small>Entitlements</small><b>${p.features.length}</b></div><div><small>Share</small><b>${(((cnt[p.id] || 0) / tot) * 100).toFixed(1)}%</b></div></div><i class="v22-bar"><em style="width:${(((cnt[p.id] || 0) / tot) * 100).toFixed(1)}%"></em></i></article>`).join('')}</section>
    <section class="v22-card"><div class="v22-card-head"><h2>All subscriptions</h2><span class="v22-muted">${r.total.toLocaleString('en-IN')} records</span></div><div class="v22-filters"><label class="v22-search">${ic('search')}<input id="ma-sub-q" placeholder="Search subscription ID, user or email" value="${esc(SF.q)}"></label>${v22Sel('ma-sub-state', ['All states', 'Active', 'Past due', 'Cancelled', 'Expired'])}${v22Sel('ma-sub-plan', ['All plans', 'Pro', 'Premium'])}</div><div id="ma-sub-list">${list}</div><p class="v22-callout">${cic('shield', 20)} Status changes come only from signed payment webhooks; refunds are issued through the payment provider and audited.</p></section>`;
  }
  // Redraw the list after a filter change.
  const reloadSubs = async () => { const el = document.getElementById('ma-sub-list'); if (el) { try { el.innerHTML = await subsHtml(true); } catch (e) { fail(e); } } };
  on('[data-ma-spage]', (b) => { if (b.disabled) return; SF.page = +b.dataset.maSpage; reloadSubs(); });
  on('[data-ma-pricing], [data-action="manage-plans"], [data-action="edit-plan"]', (b) => {
    const focus = b.dataset.maPricing || b.dataset.plan;
    showModal('Pricing configuration', `<div class="v22 v22-pricing-cfg"><p class="v22-sub">Changes apply immediately to the public pricing and new checkouts. Existing subscribers keep their price until renewal. Every change is versioned and audited.</p><div class="v22-pc-list">${(S.plans || []).map((p, i) => `<section class="v22-pc ${focus === p.id ? 'focus' : ''}" data-ma-pc="${p.id}"><header>${cic(['sprout', 'rocket', 'crown'][i] || 'doc', 30)}<b>${esc(p.name)} <small class="v22-muted">v${p.version}</small></b><label class="v22-pc-active">${v22Toggle(p.active, 'data-pc-active')}<span>Active</span></label></header><div class="v22-pc-grid">${['Monthly', 'Quarterly', 'Yearly'].map((c) => `<label class="v22-fl">${c} (₹)<input type="number" min="0" data-pc="${c}" value="${p.prices[c]}"></label>`).join('')}</div><label class="v22-fl">Tagline<input data-pc-tag value="${esc(p.tagline)}"></label><label class="v22-fl">Entitlements <small>one per line</small><textarea rows="${Math.max(3, p.features.length)}" data-pc-feat>${esc(p.features.join('\n'))}</textarea></label><div class="v22-pc-grid"><label class="v22-fl">AI questions per day <small>-1 = no cap</small><input type="number" min="-1" data-pc-ai value="${p.limits?.ai_queries_per_day ?? 1}"></label><label class="v22-fl">AI questions per month <small>-1 = no cap</small><input type="number" min="-1" data-pc-aim value="${p.limits?.ai_queries_per_month ?? -1}"></label></div></section>`).join('')}</div><div id="ma-pc-err" class="v22-err"></div><div class="v22-modal-actions"><button class="v22-outline-btn" data-modal-close>Cancel</button><button class="v22-grad-btn" data-ma-pc-save>Save pricing</button></div></div>`);
  });
  on('[data-ma-pc-save]', async (b) => {
    const done = busy(b, 'Saving…');
    try {
      for (const sec of document.querySelectorAll('[data-ma-pc]')) {
        const prices = Object.fromEntries([...sec.querySelectorAll('[data-pc]')].map((i) => [i.dataset.pc, Number(i.value)]));
        await API.put(`/admin/plans/${sec.dataset.maPc}`, { prices, tagline: sec.querySelector('[data-pc-tag]').value.trim(), features: sec.querySelector('[data-pc-feat]').value.split('\n').map((x) => x.trim()).filter(Boolean), active: sec.querySelector('[data-pc-active]').checked, limits: { ...(S.plans.find((x) => x.id === sec.dataset.maPc)?.limits || {}), ai_queries_per_day: Number(sec.querySelector('[data-pc-ai]').value), ai_queries_per_month: Number(sec.querySelector('[data-pc-aim]').value) } });
      }
      await loadPublicData(); modalRoot.innerHTML = ''; notify('Pricing saved.'); route();
    } catch (e) { done(); document.getElementById('ma-pc-err').textContent = e.details?.[0]?.message || errMsg(e); }
  });

  // used by other live files
  Object.assign(MA_LIVE, { SF, reloadSubs });
})();
