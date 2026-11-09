/* ==========================================================================
   Feature: subscription edge cases — renewal failed (grace period), plan ending, renewing soon,
   and the cancellation survey
   • Banner on the dashboard and the Subscription page:
       Past due   → "Your renewal payment didn't go through. Pay by <grace end> to keep Pro." [Retry payment]
       Cancelling → "Your Premium plan ends on <date>. After that you move to Free." [Keep my plan]
       Renewing in ≤ 3 days → "Pro renews on <date> for ₹299."
   • Cancel → a short survey (why, optional comment) with "Keep my plan" as the easy way out; then cancel at
     period end. "Keep my plan" undoes a cancellation.
     live: GET /me/entitlements · POST /billing/subscriptions/:id/cancel { reason, comment } · …/resume
     demo: the state is kept in this browser; "Preview a state" on the Subscription page switches it
   Test accounts on stage: demo.pastdue@ / demo.cancelling@ / demo.pro@modalpha.test (apps/api/src/cli/seed.ts)
   Styles: src/styles/ux.css
   ========================================================================== */
(function () {
  const T = (s) => (window.MA_T ? MA_T(s) : s);
  const live = () => !!(window.MA_LIVE && MA_LIVE.API);
  const DKEY = 'ma-demo-substate';
  const day = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
  const fmt = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '');
  const money = (n) => (typeof inr === 'function' ? inr(n) : '₹' + n);
  const REASONS = [['too_expensive', 'It’s too expensive'], ['not_using', 'I’m not using it enough'], ['missing_feature', 'A feature I need is missing'], ['found_alternative', 'I found another service'], ['temporary', 'I’m taking a break'], ['other', 'Something else']];

  /** The current subscription in one shape for both modes. */
  function sub() {
    if (live()) { const e = MA_LIVE.S.ent; return e && e.subscription ? { ...e.subscription, plan: e.plan } : null; }
    let plan = null; try { plan = localStorage.getItem('mod-alpha-demo-plan') || (window.MA_STATE && MA_STATE.ent && MA_STATE.ent.plan !== 'Free' ? MA_STATE.ent.plan : null); } catch (e) {}
    if (!plan || plan === 'Free') return null;
    let st = 'active'; try { st = localStorage.getItem(DKEY) || 'active'; } catch (e) {}
    const price = ((typeof D !== 'undefined' && D.plans || []).find((p) => p.name === plan) || {}).price || 299;
    if (st === 'past_due') return { id: 'demo', plan, status: 'Past due', renewalDate: day(-3), graceEndsOn: day(4), amountInr: price, cycle: 'Monthly' };
    if (st === 'cancelling') return { id: 'demo', plan, status: 'Active', renewalDate: day(9), cancelAtPeriodEnd: true, amountInr: price, cycle: 'Monthly' };
    if (st === 'renewing') return { id: 'demo', plan, status: 'Active', renewalDate: day(2), amountInr: price, cycle: 'Monthly' };
    return { id: 'demo', plan, status: 'Active', renewalDate: day(20), amountInr: price, cycle: 'Monthly' };
  }
  function banner() {
    const s = sub(); if (!s) return '';
    const days = s.renewalDate ? Math.ceil((new Date(s.renewalDate) - Date.now()) / 864e5) : 99;
    if (s.status === 'Past due') return `<div class="ma-subbar bad" role="alert">${ic('warn')}<span><b>${T('Your renewal payment didn’t go through.')}</b> ${T('Pay by')} <b>${fmt(s.graceEndsOn)}</b> ${T('to keep')} ${esc(s.plan)}. ${T('Until then everything keeps working.')}</span><button type="button" class="v22-grad-btn" data-ma-sub-retry="${esc(s.plan)}">${T('Retry payment')}</button><a class="v22-outline-btn" href="#/user/help">${T('Get help')}</a></div>`;
    if (s.cancelAtPeriodEnd) return `<div class="ma-subbar warn" role="status">${ic('clock')}<span><b>${T('Your')} ${esc(s.plan)} ${T('plan ends on')} ${fmt(s.renewalDate)}.</b> ${T('After that you move to the Free plan; your watchlist and settings stay.')}</span><button type="button" class="v22-grad-btn" data-ma-sub-resume="${esc(s.id)}">${T('Keep my plan')}</button></div>`;
    if (s.status === 'Active' && days >= 0 && days <= 3) return `<div class="ma-subbar info" role="status">${ic('calendar')}<span>${esc(s.plan)} ${T('renews on')} <b>${fmt(s.renewalDate)}</b> ${T('for')} ${money(s.amountInr || 0)}. ${T('Nothing to do: we’ll email the GST invoice.')}</span></div>`;
    return '';
  }
  function demoPanel() {
    if (live()) return '';
    const s = sub(); let st = 'active'; try { st = localStorage.getItem(DKEY) || 'active'; } catch (e) {}
    return `<section class="v22-card ma-subdemo"><div><b>${T('Preview a state')}</b> <small>${T('Demo only: see how each situation looks.')}</small></div><div class="v22-seg-pills wrap">${[['active', 'Active'], ['renewing', 'Renews in 2 days'], ['past_due', 'Renewal failed'], ['cancelling', 'Cancelling']].map(([k, l]) => `<button type="button" class="${s && st === k ? 'active' : ''}" data-ma-sub-demo="${k}">${T(l)}</button>`).join('')}</div>
      <div class="v22-seg-pills wrap"><button type="button" class="${(() => { try { return localStorage.getItem('ma-demo-unverified') === '1'; } catch (e) { return false; } })() ? 'active' : ''}" data-ma-sub-unver>${T('Email not verified')}</button></div>
      ${s ? `<div class="ma-subdemo-cur"><span>${T('Your plan')}: <b>${esc(s.plan)}</b> · ${T(s.status)}${s.cancelAtPeriodEnd ? ` · ${T('ends')} ${fmt(s.renewalDate)}` : ` · ${T('renews')} ${fmt(s.renewalDate)}`}</span>${s.cancelAtPeriodEnd ? '' : `<button type="button" class="v22-outline-btn danger" data-ma-cancel="demo">${T('Cancel plan')}</button>`}</div>` : `<p class="ma-subdemo-cur">${T('Activate Pro or Premium below first (test checkout), then preview the states.')}</p>`}</section>`;
  }
  function paint() {
    const dash = document.querySelector('.v22-dash .v22-welcome'), subp = document.querySelector('.v22-subpage');
    document.querySelectorAll('.ma-subbar, .ma-subdemo').forEach((x) => x.remove());
    const b = banner();
    if (dash && b) dash.insertAdjacentHTML('afterend', b);
    if (subp) { const head = subp.querySelector('.v22-subhead') || subp.firstElementChild; head.insertAdjacentHTML('beforebegin', b + demoPanel()); }
  }

  /* ---------- cancellation survey ---------- */
  function survey(id) {
    const s = sub(); if (!s) return;
    const m = document.createElement('div'); m.className = 'ma-cmp-modal'; m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true');
    m.innerHTML = `<form class="ma-cmp-sheet ma-survey" id="ma-survey"><header><h2>${T('Before you go')}</h2><button type="button" class="ma-cmp-x" data-ma-sv-keep aria-label="${esc(T('Close'))}">×</button></header>
      <p class="ma-survey-sub">${T('Your')} ${esc(s.plan)} ${T('plan stays active until')} <b>${fmt(s.renewalDate)}</b>. ${T('Tell us why you’re leaving (optional), it helps us improve.')}</p>
      <div class="ma-survey-opts">${REASONS.map(([k, l]) => `<label><input type="radio" name="reason" value="${k}"> <span>${T(l)}</span></label>`).join('')}</div>
      <label class="v22-fl">${T('Anything else? (optional)')}<textarea name="comment" rows="3" maxlength="1000" placeholder="${esc(T('What would have made you stay?'))}"></textarea></label>
      <div class="ma-survey-offer">${ic('info')} <span>${T('Prefer to pay less? The yearly plan costs about 20% less.')}</span></div>
      <div class="ma-survey-acts"><button type="button" class="v22-grad-btn" data-ma-sv-keep>${T('Keep my plan')}</button><button type="submit" class="v22-outline-btn danger">${T('Cancel at period end')}</button></div></form>`;
    document.body.appendChild(m);
    m.querySelector('#ma-survey').onsubmit = async (e) => {
      e.preventDefault(); const f = new FormData(e.target), body = {}; if (f.get('reason')) body.reason = f.get('reason'); if ((f.get('comment') || '').trim()) body.comment = f.get('comment').trim();
      const btn = e.target.querySelector('[type=submit]'); btn.disabled = true;
      try {
        if (live()) { const r = await MA_LIVE.API.post(`/billing/subscriptions/${id}/cancel`, body); MA_LIVE.S.ent = await MA_LIVE.API.get('/me/entitlements'); notify(r.message); }
        else { localStorage.setItem(DKEY, 'cancelling'); notify(T('Your plan stays active until the end of the current billing period.')); }
        m.remove(); rerender();
      } catch (err) { btn.disabled = false; notify(err.message || T('Could not cancel. Please try again.')); }
    };
  }
  async function resume(id, b) {
    if (b) b.disabled = true;
    try {
      if (live()) { const r = await MA_LIVE.API.post(`/billing/subscriptions/${id}/resume`); MA_LIVE.S.ent = await MA_LIVE.API.get('/me/entitlements'); notify(r.message); }
      else { localStorage.setItem(DKEY, 'active'); notify(T('Your plan will renew as usual.')); }
      rerender();
    } catch (err) { if (b) b.disabled = false; notify(err.message || T('Please try again.')); }
  }
  function retry(plan) {
    const click = () => { const card = [...document.querySelectorAll('.v22-plan')].find((c) => (c.querySelector('h3')?.textContent || '').trim() === plan); const btn = card && card.querySelector('[data-plan]'); if (btn) { btn.click(); return; } if (window.MA_CHECKOUT) { MA_CHECKOUT(plan); return; } const tmp = document.createElement('button'); tmp.type = 'button'; tmp.hidden = true; tmp.dataset.plan = plan; document.body.appendChild(tmp); tmp.click(); tmp.remove(); };
    if (!/user\/subscription/.test(location.hash)) { go('user/subscription'); setTimeout(click, 450); } else click();
  }
  const rerender = () => { if (typeof route === 'function') route(); };

  // window + capture, registered before the live files: the survey replaces their plain confirm() for Cancel
  window.addEventListener('click', (e) => {
    const t = e.target; if (!t.closest) return;
    const c = t.closest('[data-ma-cancel]'); if (c) { e.preventDefault(); e.stopImmediatePropagation(); survey(c.dataset.maCancel); return; }
    if (t.closest('[data-ma-sv-keep]')) { t.closest('.ma-cmp-modal')?.remove(); notify(T('Great, your plan continues as usual.')); return; }
    const r = t.closest('[data-ma-sub-resume]'); if (r) { resume(r.dataset.maSubResume, r); return; }
    const p = t.closest('[data-ma-sub-retry]'); if (p) { retry(p.dataset.maSubRetry); return; }
    if (t.closest('[data-ma-sub-unver]')) { try { localStorage.setItem('ma-demo-unverified', localStorage.getItem('ma-demo-unverified') === '1' ? '0' : '1'); } catch (err) {} rerender(); return; }
    const d = t.closest('[data-ma-sub-demo]'); if (d) { try { localStorage.setItem(DKEY, d.dataset.maSubDemo); } catch (err) {} rerender(); }
  }, true);
  let q = false;
  new MutationObserver(() => { if (q) return; q = true; requestAnimationFrame(() => { q = false; const need = document.querySelector('.v22-dash .v22-welcome, .v22-subpage'); if (need && !document.querySelector('.ma-subbar, .ma-subdemo') && (banner() || document.querySelector('.v22-subpage'))) paint(); }); }).observe(document.documentElement, { childList: true, subtree: true });
  window.MA_SUBSTATE = { sub, banner, paint };
})();
