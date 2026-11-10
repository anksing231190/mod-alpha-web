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
  /* ---------- payment logos: banks (SBI, HDFC, Axis use the marks in assets/funds; others a brand-coloured
     monogram), UPI apps and card networks. Logos only identify the payment option. ---------- */
  const BANKS = [
    { id: 'sbi', name: 'State Bank of India', img: 'assets/funds/sbi.png' }, { id: 'hdfc', name: 'HDFC Bank', img: 'assets/funds/hdfc.png' },
    { id: 'icici', name: 'ICICI Bank', mono: 'i', bg: '#ae282e', fg: '#fff' }, { id: 'axis', name: 'Axis Bank', img: 'assets/funds/axis.png' },
    { id: 'kotak', name: 'Kotak Mahindra Bank', mono: 'k', bg: '#ed1c24', fg: '#fff' }, { id: 'bob', name: 'Bank of Baroda', mono: 'b', bg: '#f15a22', fg: '#fff' },
    { id: 'pnb', name: 'Punjab National Bank', mono: 'pnb', bg: '#a6192e', fg: '#ffd200' }, { id: 'canara', name: 'Canara Bank', mono: 'C', bg: '#0072bc', fg: '#ffd400' },
    { id: 'union', name: 'Union Bank of India', mono: 'U', bg: '#d71920', fg: '#fff' }, { id: 'yes', name: 'Yes Bank', mono: 'Y', bg: '#00518f', fg: '#fff' },
    { id: 'idfc', name: 'IDFC FIRST Bank', mono: 'ID', bg: '#9c1d26', fg: '#fff' }, { id: 'indusind', name: 'IndusInd Bank', mono: 'IB', bg: '#8a1538', fg: '#fff' },
    { id: 'other', name: 'Other bank', icon: 'bank' }];
  const POPULAR = ['sbi', 'hdfc', 'icici', 'axis'];
  const bankLogo = (b, size = 30) => `<span class="ma-pl" style="--s:${size}px${b.bg ? `;--bg:${b.bg};--fg:${b.fg}` : ''}" aria-hidden="true">${b.img ? `<img src="${b.img}" alt="" loading="lazy">` : b.mono ? `<b class="l${b.mono.length}">${b.mono}</b>` : ic(b.icon || 'bank')}</span>`;
  const G_SVG = '<svg viewBox="0 0 24 24"><path d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.3z" fill="#4285F4"/><path d="M12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22z" fill="#34A853"/><path d="M6.4 14c-.2-.6-.3-1.3-.3-2s.1-1.4.3-2V7.4H3.1a10 10 0 0 0 0 9.2L6.4 14z" fill="#FBBC05"/><path d="M12 6c1.5 0 2.8.5 3.8 1.5l2.9-2.9A10 10 0 0 0 3.1 7.4L6.4 10C7.2 7.7 9.4 6 12 6z" fill="#EA4335"/></svg>';
  const UPI_APPS = [
    { id: 'gpay', name: 'Google Pay', suffix: '@okaxis', logo: `<span class="ma-pl app" aria-hidden="true">${G_SVG}</span>` },
    { id: 'phonepe', name: 'PhonePe', suffix: '@ybl', logo: '<span class="ma-pl app" style="--bg:#5f259f;--fg:#fff" aria-hidden="true"><b class="l1">पे</b></span>' },
    { id: 'paytm', name: 'Paytm', suffix: '@paytm', logo: '<span class="ma-pl app wm" aria-hidden="true"><b><i style="color:#002e6e">pay</i><i style="color:#00baf2">tm</i></b></span>' },
    { id: 'bhim', name: 'BHIM', suffix: '@upi', logo: '<span class="ma-pl app" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M7 4l7 8-7 8z" fill="#f47920"/><path d="M12 4l7 8-7 8z" fill="#109247"/></svg></span>' }];
  /** Card network from the first digits (shown inside the card-number field). */
  function cardNet(d) {
    if (/^4/.test(d)) return ['visa', '<b class="ma-cn visa">VISA</b>'];
    if (/^(5[1-5]|2[2-7])/.test(d)) return ['mastercard', '<span class="ma-cn mc" title="Mastercard"><i></i><i></i></span>'];
    if (/^(60|65|81|82|508|353|356)/.test(d)) return ['rupay', '<b class="ma-cn rupay">Ru<em>Pay</em></b>'];
    if (/^3[47]/.test(d)) return ['amex', '<b class="ma-cn amex">AMEX</b>'];
    return ['', ''];
  }
  let o = null, method = 'upi', outcome = 'success', el = null, bank = '';

  const luhn = (n) => { let s = 0, alt = false; for (let i = n.length - 1; i >= 0; i--) { let d = +n[i]; if (alt) { d *= 2; if (d > 9) d -= 9; } s += d; alt = !alt; } return n.length >= 12 && s % 10 === 0; };
  function valid() {
    if (method === 'upi') return /^[\w.\-]{2,}@[a-z]{2,}$/i.test(el.querySelector('#ma-pay-vpa')?.value.trim() || '');
    if (method === 'card') { const n = (el.querySelector('#ma-pay-card')?.value || '').replace(/\D/g, ''), ex = el.querySelector('#ma-pay-exp')?.value || '', cv = el.querySelector('#ma-pay-cvv')?.value || ''; const m = ex.match(/^(\d{2})\/(\d{2})$/); return luhn(n) && m && +m[1] >= 1 && +m[1] <= 12 && /^\d{3,4}$/.test(cv); }
    return !!bank;
  }
  function frame(inner) { el.querySelector('.ma-pay-body').innerHTML = inner; }

  function payView() {
    const base = o.amount / 1.18, gst = o.amount - base;
    frame(`<div class="ma-pay-grid"><section class="ma-pay-sum"><small>${T('You are subscribing to')}</small><b class="ma-pay-plan">${esc(o.planName)} · ${T(o.cycle)}</b>
        <dl><dt>${T('Plan price')}</dt><dd>${money(base)}</dd><dt>GST (18%)</dt><dd>${money(gst)}</dd><dt class="tot">${T('Total')}</dt><dd class="tot">${money(o.amount)}</dd></dl>
        <p>${T('Renews automatically each')} ${T(o.cycle === 'Yearly' ? 'year' : 'month')}. ${T('Cancel any time from Subscription.')}</p>
        <p class="ma-pay-safe">${ic('shield')} ${T('Payments are processed by our gateway partner. Mod Alpha never sees your card or UPI PIN.')}</p></section>
      <section class="ma-pay-form"><div class="ma-pay-tabs" role="tablist">${[['upi', 'UPI', 'smartphone'], ['card', 'Card', 'credit-card'], ['nb', 'Netbanking', 'bank']].map(([k, l, i]) => `<button type="button" role="tab" aria-selected="${method === k}" class="${method === k ? 'on' : ''}" data-ma-pay-m="${k}">${ic(i)}<span>${T(l)}</span></button>`).join('')}</div>
        <div class="ma-pay-fields">${method === 'upi' ? `<label class="v22-fl">${T('UPI ID')}<input id="ma-pay-vpa" placeholder="yourname@okbank" autocomplete="off" spellcheck="false"></label><div class="ma-pay-apps" role="group" aria-label="UPI apps">${UPI_APPS.map((a) => `<button type="button" data-ma-pay-app="${a.id}" title="${a.name} (${a.suffix})">${a.logo}<span>${a.name}</span></button>`).join('')}</div><small class="ma-pay-help">${T('You will approve the payment in your UPI app.')}</small>`
          : method === 'card' ? `<label class="v22-fl">${T('Card number')}<span class="ma-card-wrap"><input id="ma-pay-card" inputmode="numeric" placeholder="4111 1111 1111 1111" maxlength="23" autocomplete="cc-number"><span class="ma-card-net" id="ma-pay-net"></span></span></label><div class="ma-card-nets" aria-hidden="true"><b class="ma-cn visa">VISA</b><span class="ma-cn mc"><i></i><i></i></span><b class="ma-cn rupay">Ru<em>Pay</em></b><b class="ma-cn amex">AMEX</b></div><div class="ma-pay-row"><label class="v22-fl">${T('Expiry (MM/YY)')}<input id="ma-pay-exp" inputmode="numeric" placeholder="08/29" maxlength="5" autocomplete="cc-exp"></label><label class="v22-fl">CVV<input id="ma-pay-cvv" inputmode="numeric" placeholder="123" maxlength="4" type="password" autocomplete="cc-csc"></label></div><label class="v22-fl">${T('Name on card')}<input id="ma-pay-name" autocomplete="cc-name" value="${esc((typeof currentUser !== 'undefined' && currentUser.name) || '')}"></label>`
          : `<div class="v22-fl"><span id="ma-bank-lbl">${T('Popular banks')}</span><div class="ma-bank-pop">${POPULAR.map((id) => { const b = BANKS.find((x) => x.id === id); return `<button type="button" class="${bank === id ? 'on' : ''}" data-ma-bank="${id}">${bankLogo(b, 34)}<span>${esc(b.name.replace(' Bank', '').replace('State Bank of India', 'SBI'))}</span></button>`; }).join('')}</div></div>
          <div class="v22-fl"><span id="ma-bank-all">${T('All banks')}</span>${bankSelect()}</div><input type="hidden" id="ma-pay-bank" value="${bank}"><small class="ma-pay-help">${T('You will be taken to your bank’s page to approve.')}</small>`}</div>
        ${o.test ? `<div class="ma-pay-test"><b>${T('Test mode')}</b> · ${T('no money moves. Outcome:')} <span>${[['success', 'Success'], ['failure', 'Failure'], ['pending', 'Pending']].map(([k, l]) => `<button type="button" class="${outcome === k ? 'on' : ''}" data-ma-pay-o="${k}">${T(l)}</button>`).join('')}</span>${method === 'card' ? `<small>${T('Test card')}: 4111 1111 1111 1111 · 12/30 · 123</small>` : method === 'upi' ? `<small>${T('Test UPI ID')}: success@razorpay</small>` : ''}</div>` : ''}
        <button type="button" class="v22-grad-btn ma-pay-go" data-ma-pay-go disabled>${ic('lock')} ${T('Pay')} ${money(o.amount)}</button></section></div>`);
    check();
  }
  function bankSelect() {
    const b = BANKS.find((x) => x.id === bank);
    return `<div class="ma-bsel"><button type="button" class="ma-bsel-btn" data-ma-bsel aria-haspopup="listbox" aria-expanded="false" aria-labelledby="ma-bank-all ma-bsel-v">${b ? bankLogo(b, 28) : `<span class="ma-pl" style="--s:28px">${ic('bank')}</span>`}<span id="ma-bsel-v" class="${b ? '' : 'ph'}">${b ? esc(b.name) : T('Choose your bank')}</span>${ic('chevDown')}</button>
      <div class="ma-bsel-pop" hidden><input type="search" class="ma-bsel-q" placeholder="${esc(T('Search banks'))}" aria-label="${esc(T('Search banks'))}"><ul role="listbox" aria-labelledby="ma-bank-all">${BANKS.map((x) => `<li role="option" tabindex="-1" aria-selected="${x.id === bank}" data-ma-bank="${x.id}" data-n="${esc(x.name.toLowerCase())}">${bankLogo(x, 28)}<span>${esc(x.name)}</span>${x.id === bank ? ic('check') : ''}</li>`).join('')}</ul></div></div>`;
  }
  function pickBank(id) { bank = id; const fl = el.querySelector('.ma-pay-fields'); if (!fl) return; payView(); }
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
    close(); o = opts; method = opts.method || 'upi'; outcome = 'success'; bank = '';
    el = document.createElement('div'); el.className = 'ma-pay'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', T('Checkout'));
    el.innerHTML = `<div class="ma-pay-sheet"><header><span class="ma-pay-brand"><i>α</i> Mod Alpha · ${T('Secure checkout')}</span><button type="button" class="ma-cmp-x ma-pay-x" data-ma-pay-close aria-label="${esc(T('Close'))}">×</button></header><div class="ma-pay-body"></div></div>`;
    document.body.appendChild(el); payView();
    return { failed: (r) => failed(r), close };
  }

  document.addEventListener('input', (e) => {
    if (!el || !el.contains(e.target)) return;
    const t = e.target;
    if (t.id === 'ma-pay-card') { const d = t.value.replace(/\D/g, '').slice(0, 19); t.value = d.replace(/(.{4})/g, '$1 ').trim(); const [k, h] = cardNet(d), n = el.querySelector('#ma-pay-net'); if (n) { n.innerHTML = h; n.dataset.net = k; } el.querySelectorAll('.ma-card-nets .ma-cn').forEach((x) => x.classList.toggle('dim', !!k && !x.classList.contains(k === 'mastercard' ? 'mc' : k))); }
    if (t.classList.contains('ma-bsel-q')) { const q = t.value.trim().toLowerCase(); el.querySelectorAll('.ma-bsel-pop li').forEach((li) => { li.hidden = q && !li.dataset.n.includes(q); }); }
    if (t.id === 'ma-pay-exp') { const d = t.value.replace(/\D/g, '').slice(0, 4); t.value = d.length > 2 ? d.slice(0, 2) + '/' + d.slice(2) : d; }
    if (t.id === 'ma-pay-cvv') t.value = t.value.replace(/\D/g, '').slice(0, 4);
    check();
  });
  document.addEventListener('change', (e) => { if (el && el.contains(e.target)) check(); });
  document.addEventListener('click', (e) => {
    if (!el || !e.target.closest) return;
    const t = e.target;
    const m = t.closest('[data-ma-pay-m]'); if (m) { method = m.dataset.maPayM; payView(); return; }
    const ap = t.closest('[data-ma-pay-app]'); if (ap) { const a = UPI_APPS.find((x) => x.id === ap.dataset.maPayApp), inp = el.querySelector('#ma-pay-vpa'); const user = (inp.value.split('@')[0] || '').trim(); inp.value = user + a.suffix; el.querySelectorAll('[data-ma-pay-app]').forEach((x) => x.classList.toggle('on', x === ap)); inp.focus(); if (!user) inp.setSelectionRange(0, 0); check(); return; }
    const sb = t.closest('[data-ma-bsel]'); if (sb) { toggleBank(sb); return; }
    const bk = t.closest('[data-ma-bank]'); if (bk) { pickBank(bk.dataset.maBank); return; }
    if (!t.closest('.ma-bsel')) closeBank();
    const oc = t.closest('[data-ma-pay-o]'); if (oc) { outcome = oc.dataset.maPayO; el.querySelectorAll('[data-ma-pay-o]').forEach((x) => x.classList.toggle('on', x === oc)); return; }
    if (t.closest('[data-ma-pay-go]')) { go(); return; }
    if (t.closest('[data-ma-pay-retry]')) { if (o.retry) { close(); o.retry(); } else payView(); return; }
    if (t.closest('[data-ma-pay-other]')) { method = method === 'upi' ? 'card' : 'upi'; if (o.retry) { const keep = method; close(); o.retry(keep); } else payView(); return; }
    const d = t.closest('[data-ma-pay-done]'); if (d) { close(); go_(d.dataset.maPayDone); return; }
    const c = t.closest('[data-ma-pay-check]'); if (c) { checkStatus(c); return; }
    if (t.closest('[data-ma-pay-close]') || t === el) close();
  });
  const go_ = (h) => { if (typeof go === 'function') window.go(h); else location.hash = '#/' + h; };
  function toggleBank(btn) {
    const pop = el.querySelector('.ma-bsel-pop'), open = pop.hidden;
    pop.hidden = !open; btn.setAttribute('aria-expanded', String(open));
    if (open) { const q = pop.querySelector('.ma-bsel-q'); q.value = ''; pop.querySelectorAll('li').forEach((li) => { li.hidden = false; }); setTimeout(() => q.focus(), 20); }
  }
  function closeBank() { const pop = el && el.querySelector('.ma-bsel-pop'); if (pop && !pop.hidden) { pop.hidden = true; el.querySelector('[data-ma-bsel]')?.setAttribute('aria-expanded', 'false'); } }
  document.addEventListener('keydown', (e) => {
    if (!el) return;
    const pop = el.querySelector('.ma-bsel-pop');
    if (pop && !pop.hidden) {
      const opts = [...pop.querySelectorAll('li:not([hidden])')], i = opts.indexOf(document.activeElement);
      if (e.key === 'ArrowDown') { e.preventDefault(); (opts[i + 1] || opts[0])?.focus(); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); (opts[i - 1] || opts[opts.length - 1])?.focus(); return; }
      if (e.key === 'Enter' && document.activeElement.matches('li[data-ma-bank]')) { e.preventDefault(); pickBank(document.activeElement.dataset.maBank); return; }
      if (e.key === 'Enter' && document.activeElement.classList.contains('ma-bsel-q') && opts[0]) { e.preventDefault(); pickBank(opts[0].dataset.maBank); return; }
      if (e.key === 'Escape') { e.preventDefault(); closeBank(); el.querySelector('[data-ma-bsel]')?.focus(); return; }
    }
    if (e.key === 'Escape' && !el.querySelector('.ma-pay-x')?.hidden) close();
  });

  // leaving the page closes checkout (never while a payment is being confirmed)
  addEventListener('hashchange', () => { if (el && !el.querySelector('.ma-pay-x')?.hidden) close(); });
  window.MA_PAY = { open, close, setMethod: (m) => { method = m; } };
})();
