/* ==========================================================================
   Feature: email verification — banner in the app + the page the emailed link opens
   • Banner (signed-in, email not verified): "Please verify your email (you@…)" with Resend link, Change
     email and a close button (hidden for this visit).
   • #/verify-email?token=… : "Verifying…" → "Email verified" (Continue) or "This link has expired"
     (Send a new link — needs sign-in).
     live: POST /auth/verify-email { token } · POST /me/verify-email (resend; mock email → outbox on stage)
     demo: token "demo-ok" verifies, anything else shows the expired screen; the banner shows when
           localStorage 'ma-demo-unverified' is '1' (switch it under Subscription → Preview a state).
   Styles: src/styles/ux.css
   ========================================================================== */
(function () {
  const T = (s) => (window.MA_T ? MA_T(s) : s);
  const live = () => !!(window.MA_LIVE && MA_LIVE.API);
  const user = () => (live() ? MA_LIVE.S.user : (typeof currentUser !== 'undefined' ? currentUser : null));
  const unverified = () => { const u = user(); if (!u) return false; if (live()) return u.emailVerified === false && !!u.email; try { return localStorage.getItem('ma-demo-unverified') === '1'; } catch (e) { return false; } };
  let hidden = false;

  /* ---------- banner ---------- */
  function paintBanner() {
    const main = document.querySelector('.main-area'), top = main && main.querySelector('.workspace-topbar');
    const has = document.querySelector('.ma-verify-bar');
    if (!main || !top || hidden || !unverified() || (typeof currentRole !== 'undefined' && currentRole !== 'user')) { if (has) has.remove(); return; }
    if (has) return;
    const u = user();
    top.insertAdjacentHTML('afterend', `<div class="ma-verify-bar" role="status">${ic('mail')}<span><b>${T('Please verify your email address')}</b> ${T('We sent a link to')} <b>${esc(u.email || '')}</b>. ${T('Verified emails get reminders and invoices.')}</span>
      <button type="button" class="v22-outline-btn" data-ma-ver-resend>${T('Resend link')}</button><a href="#/user/settings" class="ma-verify-link">${T('Change email')}</a><button type="button" class="ma-verify-x" data-ma-ver-hide aria-label="${esc(T('Hide for now'))}">×</button></div>`);
  }
  async function resend(b) {
    if (b) { b.disabled = true; b.textContent = T('Sending…'); }
    try {
      if (live()) { const r = await MA_LIVE.API.post('/me/verify-email'); if (r.alreadyVerified) { MA_LIVE.S.user.emailVerified = true; hidden = true; paintBanner(); notify(T('Your email is already verified.')); return; } }
      notify(T('A new verification link is on its way. It works for 3 days.'));
      if (b) { b.textContent = T('Link sent ✓'); setTimeout(() => { b.disabled = false; b.textContent = T('Resend link'); }, 30000); }
    } catch (e) { if (b) { b.disabled = false; b.textContent = T('Resend link'); } notify(e.message || T('Could not send the link. Please try again.')); }
  }

  /* ---------- #/verify-email page ---------- */
  function shell(state, title, text, actions) {
    const icon = state === 'ok' ? `<span class="ma-ver-ic ok"><svg viewBox="0 0 52 52" aria-hidden="true"><circle cx="26" cy="26" r="23"/><path d="M15 27l8 8 15-17"/></svg></span>` : state === 'bad' ? `<span class="ma-ver-ic bad">${ic('clock')}</span>` : `<span class="ma-orb" aria-hidden="true"></span>`;
    app.innerHTML = `${topbar(true)}<main class="public-page ma-sys-wrap"><div class="ma-sys"><div class="ma-sys-card ma-ver-card">${icon}<h1>${esc(T(title))}</h1><p>${esc(T(text))}</p><div class="ma-sys-acts">${actions || ''}</div></div></div></main>${publicFooter()}`;
    document.title = T(title) + ' · Mod Alpha';
  }
  async function page() {
    const token = new URLSearchParams(location.hash.split('?')[1] || '').get('token') || '';
    shell('wait', 'Verifying your email…', 'This takes a second.');
    let ok = false, why = '';
    if (live()) { try { await MA_LIVE.API.post('/auth/verify-email', { token }); ok = true; } catch (e) { why = e.message; } }
    else { await new Promise((r) => setTimeout(r, 700)); ok = token === 'demo-ok'; }
    if (ok) {
      if (live() && MA_LIVE.S.user) MA_LIVE.S.user.emailVerified = true; else { try { localStorage.removeItem('ma-demo-unverified'); } catch (e) {} }
      shell('ok', 'Email verified', 'Thank you. Your reminders, receipts and GST invoices will reach this address.', `<a class="v22-grad-btn" href="#/${live() && !MA_LIVE.S.user ? 'login' : 'user/overview'}">${T(live() && !MA_LIVE.S.user ? 'Sign in' : 'Continue to dashboard')} ${ic('arrowR')}</a>`);
    } else {
      shell('bad', 'This link has expired', why && !/expired|invalid/i.test(why) ? why : 'Verification links work for 3 days and only once. Send yourself a new one.',
        live() && MA_LIVE.S.user ? `<button type="button" class="v22-grad-btn" data-ma-ver-resend>${T('Send a new link')}</button><a class="v22-outline-btn" href="#/user/overview">${T('Go to dashboard')}</a>`
          : live() ? `<a class="v22-grad-btn" href="#/login">${T('Sign in to get a new link')}</a>` : `<button type="button" class="v22-grad-btn" data-ma-ver-resend>${T('Send a new link')}</button><a class="v22-outline-btn" href="#/user/overview">${T('Go to dashboard')}</a>`);
    }
  }
  (window.MA_ROUTES = window.MA_ROUTES || {})['verify-email'] = () => page();

  document.addEventListener('click', (e) => {
    const r = e.target.closest && e.target.closest('[data-ma-ver-resend]'); if (r) { resend(r); return; }
    if (e.target.closest && e.target.closest('[data-ma-ver-hide]')) { hidden = true; paintBanner(); }
  });
  let q = false;
  new MutationObserver(() => { if (q) return; q = true; requestAnimationFrame(() => { q = false; paintBanner(); }); }).observe(document.documentElement, { childList: true, subtree: true });
  window.MA_VERIFY = { page, paintBanner, resend };
})();
