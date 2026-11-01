/* Mod Alpha — admin sign-in, step 2: email code + SMS code (both required).
   API mode: js/v23-api.js calls MA_MFA.show() when /auth/login (or OTP / Google) answers { mfaRequired }.
   Demo mode: "Explore as Admin" walks through the same screen with demo codes. */
(function () {
  const T = (s) => (window.MA_T ? window.MA_T(s) : s);
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const icn = (n) => (typeof ic === 'function' ? ic(n) : '');
  let timer = null;

  function show(ch, h) {
    const card = document.querySelector('.v22-auth-card');
    if (!card) return;
    clearInterval(timer);
    card.classList.add('ma-mfa');
    card.innerHTML = `
      <div class="v22-auth-brand">${typeof v22Mark === 'function' ? v22Mark(36) : ''}<b>Mod Alpha</b></div>
      <span class="ma-mfa-badge">${icn('shield')} ${T('Admin sign-in')}</span>
      <h1>${T('Verify it’s you')}</h1>
      <p class="ma-mfa-sub">${T('We sent one 6-digit code to your email and another to your mobile. Enter both to continue.')}</p>
      <form id="ma-mfa-f" class="ma-mfa-form" novalidate>
        <label class="ma-mfa-field"><span class="ma-mfa-lbl">${icn('mail')}<b>${T('Email code')}</b><small>${esc(ch.email)}</small></span>
          <input name="emailCode" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="\\d{6}" placeholder="••••••" required></label>
        <label class="ma-mfa-field"><span class="ma-mfa-lbl">${icn('msg')}<b>${T('SMS code')}</b><small>${esc(ch.mobile)}</small></span>
          <input name="smsCode" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="\\d{6}" placeholder="••••••" required></label>
        ${ch.devCodes ? `<p class="ma-mfa-dev">${T('Test codes (stage / demo only)')}: ${T('email')} <b>${esc(ch.devCodes.email)}</b> · SMS <b>${esc(ch.devCodes.sms)}</b></p>` : ''}
        <div class="v22-err" id="ma-mfa-err" role="alert"></div>
        <button type="submit" class="v22-grad-btn wide">${T('Verify & sign in')} ${icn('arrowR')}</button>
        <div class="ma-mfa-foot"><span id="ma-mfa-exp"></span><button type="button" class="ma-mfa-link" data-mfa-resend disabled>${T('Resend codes')}</button></div>
        <button type="button" class="ma-mfa-back" data-mfa-back>← ${T('Use a different account')}</button>
      </form>`;
    const f = card.querySelector('#ma-mfa-f'), err = card.querySelector('#ma-mfa-err'), btn = f.querySelector('button[type=submit]');
    const resend = card.querySelector('[data-mfa-resend]'), exp = card.querySelector('#ma-mfa-exp');
    let left = ch.expiresIn || 600, cool = 30;
    const tick = () => {
      left--; cool--;
      exp.textContent = left > 0 ? `${T('Codes expire in')} ${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}` : T('Codes expired — resend or log in again.');
      resend.disabled = cool > 0; resend.textContent = cool > 0 ? `${T('Resend codes')} (${cool}s)` : T('Resend codes');
      if (left <= 0) btn.disabled = true;
    };
    tick(); timer = setInterval(() => { if (!card.isConnected) return clearInterval(timer); tick(); }, 1000);
    f.querySelectorAll('input').forEach((i) => i.addEventListener('input', () => { i.value = i.value.replace(/\D/g, '').slice(0, 6); i.classList.remove('bad'); if (i.value.length === 6) { const nx = [...f.querySelectorAll('input')].find((x) => x.value.length < 6); (nx || btn).focus(); } }));
    f.querySelector('input').focus();
    f.onsubmit = async (e) => {
      e.preventDefault(); err.textContent = '';
      const ec = f.emailCode.value, sc = f.smsCode.value;
      if (!/^\d{6}$/.test(ec) || !/^\d{6}$/.test(sc)) { err.textContent = T('Enter both 6-digit codes.'); (!/^\d{6}$/.test(ec) ? f.emailCode : f.smsCode).focus(); return; }
      btn.disabled = true; const label = btn.innerHTML; btn.textContent = T('Verifying…');
      try { await h.verify(ec, sc); clearInterval(timer); }
      catch (ex) {
        btn.disabled = false; btn.innerHTML = label;
        err.textContent = T(ex.message || 'Could not verify');
        const d = ex.details || {};
        if (d.email === false) f.emailCode.classList.add('bad');
        if (d.sms === false) f.smsCode.classList.add('bad');
        (d.email === false ? f.emailCode : f.smsCode).select();
      }
    };
    resend.onclick = async () => {
      resend.disabled = true;
      try { const r = await h.resend(); left = r.expiresIn || 600; cool = 30; if (r.devCodes) { const p = card.querySelector('.ma-mfa-dev'); if (p) p.innerHTML = `${T('Test codes (stage / demo only)')}: ${T('email')} <b>${esc(r.devCodes.email)}</b> · SMS <b>${esc(r.devCodes.sms)}</b>`; } notify(T('New codes sent to your email and mobile.')); }
      catch (ex) { err.textContent = T(ex.message || 'Could not resend'); }
    };
    card.querySelector('[data-mfa-back]').onclick = () => { clearInterval(timer); h.cancel ? h.cancel() : (location.hash = '#/login'); if (typeof route === 'function') route(); };
  }

  /* demo mode: "Explore as Admin" → the same two-code step with demo codes */
  const live = !!(window.MA_API && window.MA_API.enabled);
  if (!live) {
    window.addEventListener('click', (e) => {
      const a = e.target.closest && e.target.closest('a[href="#/guest/admin"]');
      if (!a || sessionStorage.getItem('ma-demo-admin-ok')) return;
      e.preventDefault(); e.stopImmediatePropagation();
      const code = () => String(Math.floor(100000 + Math.random() * 900000));
      let codes = { email: code(), sms: code() };
      if (!document.querySelector('.v22-auth-card')) { location.hash = '#/login'; if (typeof route === 'function') route(); }
      show({ email: 'a•••n@modalpha.in', mobile: '+91 •••••• 0001', expiresIn: 600, devCodes: codes }, {
        verify: async (ec, sc) => {
          const okE = ec === codes.email, okS = sc === codes.sms;
          if (!okE || !okS) { const er = new Error(!okE && !okS ? 'Both codes are incorrect.' : !okE ? 'The email code is incorrect.' : 'The SMS code is incorrect.'); er.details = { email: okE, sms: okS }; throw er; }
          sessionStorage.setItem('ma-demo-admin-ok', '1'); location.hash = '#/guest/admin';
        },
        resend: async () => { codes = { email: code(), sms: code() }; return { expiresIn: 600, devCodes: codes }; },
        cancel: () => { location.hash = '#/login'; },
      });
    }, true);
    window.addEventListener('ma:logout', () => sessionStorage.removeItem('ma-demo-admin-ok'));
    window.addEventListener('click', (e) => { if (e.target.closest && e.target.closest('[data-action="logout"]')) sessionStorage.removeItem('ma-demo-admin-ok'); }, true);
  }
  window.MA_MFA = { show };
})();
