/* ==========================================================================
   Feature: changing plan or billing cycle (rules: docs/29_subscription_rules.md)
   For someone who already pays, the plan cards on the Subscription page stop being "buy" buttons:
   • a higher plan, or the same plan on a longer cycle → "Upgrade" → a preview ("You pay ₹100 today, then ₹499 a
     month from 25 Nov", with the credit for unused days) → the usual checkout for that amount only;
   • a lower plan, or a shorter cycle → "Switch on <renewal date>" → a preview → scheduled, no charge; a banner
     "Changes to Pro on 25 Nov · Undo" (sub-states.js) lets them undo it until then;
   • Free → the cancellation flow (cancel at period end, survey);
   • a higher plan on a shorter cycle is refused with the reason.
   live: GET /billing/change/preview · POST /billing/change · POST /billing/change/undo (amounts come from the API)
   demo: the same rules worked out here; the state is kept in this browser.
   Styles: src/styles/ux.css (.ma-chg)
   ========================================================================== */
(function () {
  const T = (s) => (window.MA_T ? MA_T(s) : s);
  const live = () => !!(window.MA_LIVE && MA_LIVE.API);
  const money = (n) => '₹' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: Number(n) % 1 ? 2 : 0, maximumFractionDigits: 2 });
  const fmt = (d) => (d ? new Date(d + (String(d).length === 10 ? 'T00:00:00' : '')).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '');
  const MONTHS = { Monthly: 1, Quarterly: 3, Yearly: 12 };
  const iso = (d) => d.toISOString().slice(0, 10);
  const addMonths = (s, n) => { const d = new Date(s + 'T00:00:00Z'); d.setUTCMonth(d.getUTCMonth() + n); return iso(d); };
  const days = (a, b) => Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 864e5);
  const todayIST = () => iso(new Date(Date.now() + 5.5 * 3600e3));
  const r2 = (n) => Math.round(n * 100) / 100;
  const cycleNow = () => ((typeof v22Billing !== 'undefined' ? v22Billing : typeof pricingBilling !== 'undefined' ? pricingBilling : 'monthly') === 'yearly' ? 'Yearly' : 'Monthly');
  const sub = () => (window.MA_SUBSTATE ? MA_SUBSTATE.sub() : null);
  const plans = () => {
    const src = (live() && MA_LIVE.S.plans) || (typeof D !== 'undefined' && D.plans) || [];
    return src.map((p) => ({ id: p.id || p.name, name: p.name, prices: p.prices && p.prices.Yearly != null ? p.prices : { Monthly: p.price, Quarterly: p.price * 3, Yearly: Math.round(p.price * 0.8) * 12 } }));
  };

  /** Same rules as apps/api/src/modules/billing/plan-change.ts (the API is the authority in live mode). */
  function preview(s, target) {
    const ps = plans(), tp = ps.find((p) => p.id === target.planId || p.name === target.planId);
    if (!tp) return { kind: 'blocked', message: T('Unknown plan') };
    const price = Number(tp.prices[target.cycle] || 0);
    if (!s) return tp.prices.Monthly ? { kind: 'new' } : { kind: 'same' };
    if (s.status === 'Past due') return { kind: 'blocked', message: T('Please pay your renewal first; then you can change your plan.') };
    const cp = ps.find((p) => p.id === s.plan || p.name === s.plan), from = { plan: s.plan, cycle: s.cycle }, to = { plan: tp.name, cycle: target.cycle };
    if (tp.name === (cp && cp.name) && target.cycle === s.cycle) return { kind: 'same' };
    if (!tp.prices.Monthly) return { kind: 'scheduled', from, to, chargeNow: 0, effectiveOn: s.renewalDate, nextAmount: 0, toFree: true };
    const rank = tp.prices.Monthly - ((cp && cp.prices.Monthly) || 0), dm = MONTHS[target.cycle] - MONTHS[s.cycle];
    if (rank > 0 && dm < 0) return { kind: 'blocked', message: `${T('To move to')} ${tp.name} ${T('on a shorter cycle, first switch to')} ${tp.name} ${T(s.cycle.toLowerCase())}.` };
    if (!(rank > 0 || (rank === 0 && dm > 0))) return { kind: 'scheduled', from, to, chargeNow: 0, effectiveOn: s.renewalDate, nextAmount: price, toFree: false };
    const today = todayIST(), dic = Math.max(1, days(addMonths(s.renewalDate, -MONTHS[s.cycle]), s.renewalDate)), left = Math.min(dic, Math.max(0, days(today, s.renewalDate)));
    const credit = r2(Number(s.amountInr) * left / dic), newCycle = target.cycle !== s.cycle, newPart = newCycle ? price : r2(price * left / dic);
    const renewsOn = newCycle ? addMonths(today, MONTHS[target.cycle]) : s.renewalDate;
    return { kind: 'upgrade', from, to, chargeNow: Math.max(1, r2(newPart - credit)), credit, newPart, daysLeft: left, daysInCycle: dic, renewsOn, nextAmount: price, newCycle };
  }

  /* ---------- plan cards: buy buttons become change buttons for paying customers ---------- */
  function decorate() {
    const page = document.querySelector('.v22-subpage'), s = sub(); if (!page || !s) return;
    const cyc = cycleNow();
    page.querySelectorAll('.v22-plan').forEach((card) => {
      const name = (card.querySelector('h3')?.textContent || '').trim();
      const btn = card.querySelector('[data-plan], .v22-plan-btn, .v22-grad-btn, [data-ma-change]'); if (!btn) return;
      const pv = preview(s, { planId: name, cycle: cyc }), pend = s.pendingChange;
      btn.removeAttribute('data-plan'); btn.disabled = false; btn.removeAttribute('title');
      btn.dataset.maChange = name;
      const label = (txt) => { btn.innerHTML = `${esc(txt)} ${pv.kind === 'upgrade' ? ic('arrowR') : ''}`; };
      if (pend && pend.plan === name && pend.cycle === cyc) { label(`${T('Starts')} ${fmt(pend.effectiveOn)}`); btn.disabled = true; delete btn.dataset.maChange; }
      else if (s.cancelAtPeriodEnd && !pv.toFree) { label(pv.kind === 'same' ? T('Current plan') : T('Keep your plan first')); btn.disabled = true; btn.title = T('Your plan is set to end. Choose “Keep my plan” first.'); delete btn.dataset.maChange; }
      else if (pv.kind === 'same') { label(T('Current plan')); btn.disabled = true; delete btn.dataset.maChange; }
      else if (pv.kind === 'blocked') { label(T('Not available')); btn.disabled = true; btn.title = pv.message; delete btn.dataset.maChange; }
      else if (pv.kind === 'upgrade') label(pv.to.plan === s.plan ? `${T('Switch to')} ${T(cyc.toLowerCase())}` : `${T('Upgrade to')} ${name}`);
      else if (pv.toFree) label(`${T('Switch to Free on')} ${fmt(s.renewalDate)}`);
      else label(pv.to.plan === s.plan ? `${T('Switch to')} ${T(cyc.toLowerCase())} ${T('on')} ${fmt(s.renewalDate)}` : `${T('Switch on')} ${fmt(s.renewalDate)}`);
      card.classList.toggle('is-current', pv.kind === 'same');
    });
  }

  /* ---------- preview → confirm ---------- */
  function body(pv, s) {
    const per = (c) => ({ Monthly: T('a month'), Quarterly: T('a quarter'), Yearly: T('a year') }[c]);
    if (pv.kind === 'blocked') return `<p class="ma-chg-lead">${esc(pv.message)}</p>`;
    if (pv.kind === 'upgrade') {
      const taxable = r2(pv.chargeNow / 1.18);
      return `<p class="ma-chg-lead">${T('You pay')} <b>${money(pv.chargeNow)}</b> ${T('today, then')} <b>${money(pv.nextAmount)}</b> ${per(pv.to.cycle)} ${T('from')} <b>${fmt(pv.renewsOn)}</b>.</p>
        <table class="v22-table ma-chg-tbl"><tbody>
          <tr><td>${pv.newCycle ? `${esc(pv.to.plan)} ${T(pv.to.cycle.toLowerCase())}, ${T('new cycle from today')}` : `${esc(pv.to.plan)} ${T('for the')} ${pv.daysLeft} ${T('days left')} (${money(pv.nextAmount)} × ${pv.daysLeft}/${pv.daysInCycle})`}</td><td>${money(pv.newPart)}</td></tr>
          <tr><td>${T('Credit for unused')} ${esc(pv.from.plan)} ${T('days')} (${money(s.amountInr)} × ${pv.daysLeft}/${pv.daysInCycle})</td><td>−${money(pv.credit)}</td></tr>
          <tr class="tot"><td>${T('Charged today')}</td><td>${money(pv.chargeNow)}</td></tr>
          <tr class="sub"><td>${T('of which GST at 18%')}</td><td>${money(r2(pv.chargeNow - taxable))}</td></tr>
        </tbody></table>
        <ul class="ma-chg-notes"><li>${T('Your new plan starts as soon as the payment goes through.')}</li><li>${pv.newCycle ? `${T('A new billing cycle starts today; your plan renews on')} ${fmt(pv.renewsOn)}.` : T('Your renewal date stays the same.')}</li><li>${T('A GST tax invoice for this amount appears in Billing history.')}</li></ul>
        <div class="ma-chg-acts"><button type="button" class="v22-grad-btn" data-ma-change-go>${T('Pay')} ${money(pv.chargeNow)}</button><button type="button" class="v22-outline-btn" data-modal-close>${T('Not now')}</button></div>`;
    }
    if (pv.toFree) return `<p class="ma-chg-lead">${T('Your')} ${esc(s.plan)} ${T('plan stays active until')} <b>${fmt(s.renewalDate)}</b>; ${T('after that you move to Free. Nothing is refunded for the remaining days.')}</p>
        <div class="ma-chg-acts"><button type="button" class="v22-outline-btn danger" data-ma-change-tofree>${T('Continue to cancel')}</button><button type="button" class="v22-outline-btn" data-modal-close>${T('Keep my plan')}</button></div>`;
    return `<p class="ma-chg-lead">${T('Changes to')} <b>${esc(pv.to.plan)}${pv.to.cycle !== pv.from.cycle ? ` (${T(pv.to.cycle.toLowerCase())})` : ''}</b> ${T('on')} <b>${fmt(pv.effectiveOn)}</b>.</p>
      <ul class="ma-chg-notes"><li>${T('You keep')} ${esc(pv.from.plan)} ${T('until then, and nothing is charged today.')}</li><li>${T('From')} ${fmt(pv.effectiveOn)} ${T('you pay')} ${money(pv.nextAmount)} ${per(pv.to.cycle)}.</li><li>${T('You can undo this any time before that date.')}</li></ul>
      <div class="ma-chg-acts"><button type="button" class="v22-grad-btn" data-ma-change-go>${T('Schedule the change')}</button><button type="button" class="v22-outline-btn" data-modal-close>${T('Not now')}</button></div>`;
  }
  let cur = null; // { pv, s, target }
  async function open(name) {
    const s = sub(), target = { planId: name, cycle: cycleNow() };
    let pv = preview(s, target);
    if (live()) {
      const p = (MA_LIVE.S.plans || []).find((x) => x.name === name);
      try { pv = (await MA_LIVE.API.get(`/billing/change/preview?planId=${encodeURIComponent(p ? p.id : name)}&cycle=${target.cycle}`)).preview; } catch (e) { MA_LIVE.fail(e); return; }
      target.planId = p ? p.id : name;
    }
    if (pv.kind === 'new' && window.MA_CHECKOUT) { MA_CHECKOUT(name); return; }
    cur = { pv, s, target };
    const title = pv.kind === 'upgrade' ? `${T('Upgrade to')} ${esc(pv.to.plan)}${pv.to.plan === pv.from.plan ? ` ${T(pv.to.cycle.toLowerCase())}` : ''}` : pv.kind === 'blocked' ? T('This change isn’t available') : pv.toFree ? T('Switch to Free') : `${T('Switch to')} ${esc(pv.to.plan)}`;
    showModal(title, `<div class="v22 ma-chg">${body(pv, s)}</div>`);
  }
  const close = () => { if (typeof modalRoot !== 'undefined') modalRoot.innerHTML = ''; };
  const rerender = () => { if (typeof route === 'function') route(); };

  async function go(btn) {
    if (!cur) return; const { pv, target } = cur;
    if (btn) btn.disabled = true;
    if (!live()) {
      if (pv.kind === 'scheduled') { try { localStorage.setItem('ma-demo-pending', JSON.stringify({ plan: pv.to.plan, cycle: pv.to.cycle, effectiveOn: pv.effectiveOn, amountInr: pv.nextAmount })); } catch (e) {} close(); notify(`${T('Scheduled: changes to')} ${pv.to.plan} ${T('on')} ${fmt(pv.effectiveOn)}.`); rerender(); return; }
      close();
      const done = () => { try { localStorage.setItem('mod-alpha-demo-plan', pv.to.plan); localStorage.setItem('ma-demo-cycle', pv.to.cycle); localStorage.removeItem('ma-demo-pending'); localStorage.removeItem('ma-demo-substate'); } catch (e) {} if (window.MA_STATE) MA_STATE.ent = { plan: pv.to.plan, subscription: { status: 'Active', demo: true } }; rerender(); };
      const openPay = (m) => MA_PAY.open({ planName: pv.to.plan, cycle: pv.to.cycle, amount: pv.chargeNow, test: true, method: m, pay: async (mm, outcome) => { await new Promise((r) => setTimeout(r, 1200)); return outcome; }, check: async () => 'success', onSuccess: done, retry: (mm) => openPay(mm) });
      if (window.MA_PAY) openPay(); else done();
      return;
    }
    const { API, fail } = MA_LIVE;
    try {
      const r = await API.post('/billing/change', { planId: target.planId, cycle: target.cycle });
      if (r.scheduled) { MA_LIVE.S.ent = await API.get('/me/entitlements'); close(); notify(`${T('Scheduled: changes to')} ${pv.to.plan} ${T('on')} ${fmt(pv.effectiveOn)}.`); rerender(); return; }
      close();
      const paid = async () => { MA_LIVE.S.ent = await API.get('/me/entitlements'); notify(`${T('Upgraded to')} ${pv.to.plan}.`); rerender(); };
      if (r.order.provider === 'razorpay') {
        await window.MA_LIVE_LOADSCRIPT('https://checkout.razorpay.com/v1/checkout.js');
        const rz = new window.Razorpay({ key: r.order.keyId, order_id: r.order.orderId, amount: r.order.amountPaise, currency: 'INR', name: 'Mod Alpha', description: r.order.description, prefill: r.order.prefill, theme: { color: '#5b5cf6' },
          handler: async (x) => { try { await API.post('/billing/verify', { orderId: x.razorpay_order_id, paymentId: x.razorpay_payment_id, signature: x.razorpay_signature }); await paid(); } catch (e) { fail(e); } } });
        rz.on('payment.failed', (f) => { try { rz.close(); } catch (e) {} if (window.MA_PAY) MA_PAY.open({ planName: pv.to.plan, cycle: pv.to.cycle, amount: r.amountInr, retry: () => go() }).failed(f && f.error && f.error.description); });
        rz.open(); return;
      }
      const complete = (outcome) => API.post('/billing/mock/complete', { orderId: r.order.orderId, outcome });
      MA_PAY.open({ planName: pv.to.plan, cycle: pv.to.cycle, amount: r.amountInr, orderId: r.order.orderId, test: true,
        pay: async (m, outcome) => { await new Promise((z) => setTimeout(z, 1200)); if (outcome === 'pending') return 'pending'; await complete(outcome); return outcome; },
        check: async () => { await complete('success'); return 'success'; }, onSuccess: () => paid(), retry: () => go() });
    } catch (e) { if (btn) btn.disabled = false; fail(e); }
  }
  async function undo(btn) {
    if (btn) btn.disabled = true;
    if (!live()) { try { localStorage.removeItem('ma-demo-pending'); } catch (e) {} notify(T('Scheduled change undone. Your plan continues as it is.')); rerender(); return; }
    try { await MA_LIVE.API.post('/billing/change/undo'); MA_LIVE.S.ent = await MA_LIVE.API.get('/me/entitlements'); notify(T('Scheduled change undone. Your plan continues as it is.')); rerender(); } catch (e) { if (btn) btn.disabled = false; MA_LIVE.fail(e); }
  }

  // window + capture: runs before the live and demo checkout handlers, so a change never starts a second subscription
  window.addEventListener('click', (e) => {
    const t = e.target; if (!t.closest) return;
    const c = t.closest('[data-ma-change]'); if (c && !c.disabled) { e.preventDefault(); e.stopImmediatePropagation(); open(c.dataset.maChange); return; }
    if (t.closest('[data-ma-change-go]')) { e.preventDefault(); go(t.closest('[data-ma-change-go]')); return; }
    if (t.closest('[data-ma-change-undo]')) { e.preventDefault(); undo(t.closest('[data-ma-change-undo]')); return; }
    if (t.closest('[data-ma-change-tofree]')) { e.preventDefault(); close(); const s = sub(); const b = document.createElement('button'); b.hidden = true; b.dataset.maCancel = s ? s.id : 'demo'; document.body.appendChild(b); b.click(); b.remove(); return; }
    if (t.closest('[data-v22-billing]')) setTimeout(decorate, 30);
  }, true);
  let q = false;
  new MutationObserver(() => { if (q) return; q = true; requestAnimationFrame(() => { q = false; const p = document.querySelector('.v22-subpage'); if (p && !p.dataset.maChg) { p.dataset.maChg = '1'; decorate(); } }); }).observe(document.documentElement, { childList: true, subtree: true });
  window.MA_PLANCHANGE = { preview, decorate, open };
})();
