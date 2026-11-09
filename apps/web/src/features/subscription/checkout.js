/* ==========================================================================
   Feature: checkout screens — pay, processing, success, failed, pending
   MA_PAY.open({ planName, cycle, amount, orderId, test, pay(method, outcome), check(), onSuccess(), retry() })
   • Pay: order summary (price, 18% GST, total), method tabs — UPI (ID checked as you type), Card (number
     grouped + Luhn check, expiry, CVV), Netbanking (bank) — and the Pay button.
   • On stage / demo ("test": true) a Test mode strip picks the outcome: Success, Failure or Pending. No money
     moves; the live mock sends the same signed webhook the real gateway will (see subscription.live.js).
   • Processing → Success (plan active, invoice in Billing history) · Failed (no money taken; try again /
     another method / support) · Pending (bank has not confirmed; Check status).
   With the real gateway (Razorpay) its own window takes the payment and this file shows the failed screen
   when Razorpay reports a failure.
   Styles: src/styles/ux.css
   ========================================================================== */
(function () {
  const T = (s) => (window.MA_T ? MA_T(s) : s);
  const money = (n) => (typeof inr === 'function' ? inr(Math.round(n)) : '₹' + Math.round(n).toLocaleString('en-IN'));
  const BANKS = ['State Bank of India', 'HDFC Bank', 'ICICI Bank', 'Axis Bank', 'Kotak Mahindra Bank', 'Bank of Baroda', 'Punjab National Bank', 'Other bank'];
  let o = null, method = 'upi', outcome = 'success', el = null;

  const luhn = (n) => { let s = 0, alt = false; for (let i = n.length - 1; i >= 0; i--) { let d = +n[i]; if (alt) { d *= 2; if (d > 9) d -= 9; } s += d; alt = !alt; } return n.length >= 12 && s % 10 === 0; };
  function valid() {
    if (method === 'upi') return /^[\w.\-]{2,}@[a-z]{2,}$/i.test(el.querySelector('#ma-pay-vpa')?.value.trim() || '');
    if (method === 'card') { const n = (el.querySelector('#ma-pay-card')?.value || '').replace(/\D/g, ''), ex = el.querySelector('#ma-pay-exp')?.value || '', cv = el.querySelector('#ma-pay-cvv')?.value || ''; const m = ex.match(/^(\d{2})\/(\d{2})$/); return luhn(n) && m && +m[1] >= 1 && +m[1] <= 12 && /^\d{3,4}$/.test(cv); }
    return !!el.querySelector('#ma-pay-bank')?.value;
  }
  function frame(inner) { el.querySelector('.ma-pay-body').innerHTML = inner; }

  function payView() {
    const base = o.amount / 1.18, gst = o.amount - base;
    frame(`<div class="ma-pay-grid"><section class="ma-pay-sum"><small>${T('You are subscribing to')}</small><b class="ma-pay-plan">${esc(o.planName)} · ${T(o.cycle)}</b>
        <dl><dt>${T('Plan price')}</dt><dd>${money(base)}</dd><dt>GST (18%)</dt><dd>${money(gst)}</dd><dt class="tot">${T('Total')}</dt><dd class="tot">${money(o.amount)}</dd></dl>
        <p>${T('Renews automatically each')} ${T(o.cycle === 'Yearly' ? 'year' : 'month')}. ${T('Cancel any time from Subscription.')}</p>
        <p class="ma-pay-safe">${ic('shield')} ${T('Payments are processed by our gateway partner. Mod Alpha never sees your card or UPI PIN.')}</p></section>
      <section class="ma-pay-form"><div class="ma-pay-tabs" role="tablist">${[['upi', 'UPI'], ['card', 'Card'], ['nb', 'Netbanking']].map(([k, l]) => `<button type="button" role="tab" aria-selected="${method === k}" class="${method === k ? 'on' : ''}" data-ma-pay-m="${k}">${T(l)}</button>`).join('')}</div>
        <div class="ma-pay-fields">${method === 'upi' ? `<label class="v22-fl">${T('UPI ID')}<input id="ma-pay-vpa" placeholder="yourname@okbank" autocomplete="off" spellcheck="false"></label><div class="ma-pay-apps">${['Google Pay', 'PhonePe', 'Paytm', 'BHIM'].map((a) => `<span>${a}</span>`).join('')}</div><small class="ma-pay-help">${T('You will approve the payment in your UPI app.')}</small>`
          : method === 'card' ? `<label class="v22-fl">${T('Card number')}<input id="ma-pay-card" inputmode="numeric" placeholder="4111 1111 1111 1111" maxlength="23" autocomplete="cc-number"></label><div class="ma-pay-row"><label class="v22-fl">${T('Expiry (MM/YY)')}<input id="ma-pay-exp" inputmode="numeric" placeholder="08/29" maxlength="5" autocomplete="cc-exp"></label><label class="v22-fl">CVV<input id="ma-pay-cvv" inputmode="numeric" placeholder="123" maxlength="4" type="password" autocomplete="cc-csc"></label></div><label class="v22-fl">${T('Name on card')}<input id="ma-pay-name" autocomplete="cc-name" value="${esc((typeof currentUser !== 'undefined' && currentUser.name) || '')}"></label>`
          : `<label class="v22-fl">${T('Your bank')}<span class="v22-select"><select id="ma-pay-bank"><option value="">${T('Choose your bank')}</option>${BANKS.map((b) => `<option>${b}</option>`).join('')}</select>${ic('chevDown')}</span></label><small class="ma-pay-help">${T('You will be taken to your bank’s page to approve.')}</small>`}</div>
        ${o.test ? `<div class="ma-pay-test"><b>${T('Test mode')}</b> · ${T('no money moves. Outcome:')} <span>${[['success', 'Success'], ['failure', 'Failure'], ['pending', 'Pending']].map(([k, l]) => `<button type="button" class="${outcome === k ? 'on' : ''}" data-ma-pay-o="${k}">${T(l)}</button>`).join('')}</span>${method === 'card' ? `<small>${T('Test card')}: 4111 1111 1111 1111 · 12/30 · 123</small>` : method === 'upi' ? `<small>${T('Test UPI ID')}: success@razorpay</small>` : ''}</div>` : ''}
        <button type="button" class="v22-grad-btn ma-pay-go" data-ma-pay-go disabled>${ic('lock')} ${T('Pay')} ${money(o.amount)}</button></section></div>`);
    check();
  }
  function check() { const b = el.querySelector('[data-ma-pay-go]'); if (b) b.disabled = !valid(); }
  async function go() {
    frame(`<div class="ma-pay-state"><span class="ma-orb big" aria-hidden="true"></span><h2>${T('Confirming with your bank…')}</h2><p>${T('Please don’t close this window or press back.')}</p></div>`);
    el.querySelector('.ma-pay-x').hidden = true;
    let r = 'failure';
    try { r = await o.pay(method, outcome); } catch (e) { r = 'failure'; }
    el.querySelector('.ma-pay-x').hidden = false;
    if (r === 'success') success(); else if (r === 'pending') pending(); else failed();
  }
  function success() {
    frame(`<div class="ma-pay-state ok"><span class="ma-ver-ic ok"><svg viewBox="0 0 52 52" aria-hidden="true"><circle cx="26" cy="26" r="23"/><path d="M15 27l8 8 15-17"/></svg></span><h2>${T('Payment successful')}</h2>
      <p><b>${money(o.amount)}</b> ${T('paid')} · ${esc(o.planName)} ${T(o.cycle)}. ${T('Your plan is active now.')}</p><p class="muted">${T('Your GST invoice is in Subscription → Billing history and on its way to your email.')}</p>
      <div class="ma-sys-acts"><button type="button" class="v22-grad-btn" data-ma-pay-done="user/overview">${T('Go to dashboard')} ${ic('arrowR')}</button><button type="button" class="v22-outline-btn" data-ma-pay-done="user/subscription">${T('View my plan')}</button></div></div>`);
    if (o.onSuccess) Promise.resolve(o.onSuccess()).catch(() => {});
  }
  function failed(reason) {
    frame(`<div class="ma-pay-state bad"><span class="ma-ver-ic bad">${ic('x')}</span><h2>${T('Payment failed')}</h2>
      <p>${esc(T(reason || (method === 'upi' ? 'The payment was declined or timed out in your UPI app.' : method === 'card' ? 'Your bank declined the card payment.' : 'Your bank did not complete the payment.')))} <b>${T('No money was taken.')}</b></p>
      <p class="muted">${T('If money was deducted, it is refunded to you automatically within 5–7 working days.')}</p>
      <div class="ma-sys-acts"><button type="button" class="v22-grad-btn" data-ma-pay-retry>${ic('refresh')} ${T('Try again')}</button><button type="button" class="v22-outline-btn" data-ma-pay-other>${T('Use another method')}</button><a class="v22-outline-btn" href="#/user/help" data-ma-pay-close>${T('Contact support')}</a></div></div>`);
  }
  function pending() {
    frame(`<div class="ma-pay-state wait"><span class="ma-ver-ic wait">${ic('clock')}</span><h2>${T('Payment pending')}</h2>
      <p>${T('Your bank hasn’t confirmed the payment yet. This usually takes a few minutes.')}</p><p class="muted">${T('We’ll activate your plan and email you as soon as it’s confirmed. Please don’t pay again.')}</p>
      <div class="ma-sys-acts"><button type="button" class="v22-grad-btn" data-ma-pay-check>${ic('refresh')} ${T('Check status')}</button><button type="button" class="v22-outline-btn" data-ma-pay-close>${T('I’ll wait')}</button></div></div>`);
  }
  async function checkStatus(b) {
    if (b) { b.disabled = true; b.textContent = T('Checking…'); }
    let r = 'pending'; try { r = o.check ? await o.check() : 'pending'; } catch (e) { r = 'pending'; }
    if (r === 'success') success(); else if (r === 'failure') failed(); else { pending(); notify(T('Still waiting for your bank. We’ll email you once it’s confirmed.')); }
  }
  function close() { el?.remove(); el = null; }
  function open(opts) {
    close(); o = opts; method = opts.method || 'upi'; outcome = 'success';
    el = document.createElement('div'); el.className = 'ma-pay'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', T('Checkout'));
    el.innerHTML = `<div class="ma-pay-sheet"><header><span class="ma-pay-brand"><i>α</i> Mod Alpha · ${T('Secure checkout')}</span><button type="button" class="ma-cmp-x ma-pay-x" data-ma-pay-close aria-label="${esc(T('Close'))}">×</button></header><div class="ma-pay-body"></div></div>`;
    document.body.appendChild(el); payView();
    return { failed: (r) => failed(r), close };
  }

  document.addEventListener('input', (e) => {
    if (!el || !el.contains(e.target)) return;
    const t = e.target;
    if (t.id === 'ma-pay-card') { const d = t.value.replace(/\D/g, '').slice(0, 19); t.value = d.replace(/(.{4})/g, '$1 ').trim(); }
    if (t.id === 'ma-pay-exp') { const d = t.value.replace(/\D/g, '').slice(0, 4); t.value = d.length > 2 ? d.slice(0, 2) + '/' + d.slice(2) : d; }
    if (t.id === 'ma-pay-cvv') t.value = t.value.replace(/\D/g, '').slice(0, 4);
    check();
  });
  document.addEventListener('change', (e) => { if (el && el.contains(e.target)) check(); });
  document.addEventListener('click', (e) => {
    if (!el || !e.target.closest) return;
    const t = e.target;
    const m = t.closest('[data-ma-pay-m]'); if (m) { method = m.dataset.maPayM; payView(); return; }
    const oc = t.closest('[data-ma-pay-o]'); if (oc) { outcome = oc.dataset.maPayO; el.querySelectorAll('[data-ma-pay-o]').forEach((x) => x.classList.toggle('on', x === oc)); return; }
    if (t.closest('[data-ma-pay-go]')) { go(); return; }
    if (t.closest('[data-ma-pay-retry]')) { if (o.retry) { close(); o.retry(); } else payView(); return; }
    if (t.closest('[data-ma-pay-other]')) { method = method === 'upi' ? 'card' : 'upi'; if (o.retry) { const keep = method; close(); o.retry(keep); } else payView(); return; }
    const d = t.closest('[data-ma-pay-done]'); if (d) { close(); go_(d.dataset.maPayDone); return; }
    const c = t.closest('[data-ma-pay-check]'); if (c) { checkStatus(c); return; }
    if (t.closest('[data-ma-pay-close]') || t === el) close();
  });
  const go_ = (h) => { if (typeof go === 'function') window.go(h); else location.hash = '#/' + h; };
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && el && !el.querySelector('.ma-pay-x')?.hidden) close(); });

  window.MA_PAY = { open, close, setMethod: (m) => { method = m; } };
})();
