/* ==========================================================================
   Live mode — sessions and sign-in
   Loads the signed-in user (GET /auth/me), guards #/user and #/admin pages, logout /
   sign out everywhere (+ sync across tabs), and the real login / sign-up / OTP /
   Google / forgot-password calls. Admins continue with the 2-code step (admin-mfa.js).
   ========================================================================== */
(function () {
  if (!window.MA_LIVE) return; // demo mode (no API): nothing to do
  const { API, ENV, S, busy, ensureNav, errMsg, fail, on } = MA_LIVE;
  // ------------------------------------------------------------------ session
  async function loadSession() {
    try { S.user = (await API.get('/auth/me', null, { onUnauthorized: false })).user; }
    catch (e) { S.user = null; }
    if (S.user) {
      currentUser = { name: S.user.name, email: S.user.email || S.user.mobile || '' };
      window.dispatchEvent(new CustomEvent('ma:signed-in', { detail: {} }));   // page reload with a live session → restart the timer
      try { S.ent = await API.get('/me/entitlements'); } catch (e) { S.ent = null; }
    }
  }
  // The API answered 401 (session ended elsewhere, or a timeout the server noticed first) → back to login.
  window.addEventListener('ma:unauthorized', (e) => {
    if (!S.user) return;
    const reason = e.detail && e.detail.reason;
    signedOut(reason === 'idle' ? (window.MA_SESSION ? MA_SESSION.idleMessage() : 'You were signed out after a period of inactivity.') : reason === 'absolute' ? 'Your session reached its time limit. Please sign in again.' : 'Your session expired. Please log in again.');
  });
  // Is the signed-in person an admin?
  const isAdmin = () => S.user && S.user.role !== 'user';
  // route guard + extra routes
  const baseRoute = route;
  route = function () {
    const h = location.hash.replace(/^#\/?/, '');
    if (!S.ready) return;
    if (/^guest\//.test(h)) { go(S.user ? (h.includes('admin') && isAdmin() ? 'admin/dashboard' : 'user/overview') : 'login'); return; }
    if (/^(user|admin)\b/.test(h) && !S.user) { sessionStorage.setItem('ma-next', h); go('login'); return; }
    if (/^admin\b/.test(h) && !isAdmin()) { notify('Admin access required.'); go('user/overview'); return; }
    if ((h === 'login' || h === 'signup') && S.user) { go(isAdmin() ? 'admin/dashboard' : 'user/overview'); return; }
    if (h.startsWith('reset-password')) return renderResetPassword();
    if (h.startsWith('verify-email')) return renderVerifyEmail();
    if (h.startsWith('kyc/mock')) return MA_LIVE.renderMockKyc();
    if (/^user\/fund\//.test(h)) { const id = h.split('/')[2]; baseRoute(); ensureNav(id).then(() => { const el = document.getElementById('v22-detail-chart'); const f = D.funds.find((x) => x.id === id); if (el && f) el.innerHTML = v22DetailChart(f, v22DetailPeriod); }).catch(() => {}); return; }
    if (h === 'user/overview' || h === 'user') { baseRoute(); Promise.all(D.funds.slice(0, 3).map((f) => ensureNav(f.id))).then(() => { const el = document.getElementById('v22-dash-chart'); if (el) el.innerHTML = v22DashChart(v22DashPeriod); }).catch(() => {}); MA_LIVE.refreshBell(); return; }
    baseRoute();
    if (/^(user|admin)\b/.test(h)) MA_LIVE.refreshBell();
  };
  // After sign-in: remember the user, start the inactivity timer, load the plan, go to the requested page (or the
  // dashboard).
  const afterLogin = async (user, session) => {
    S.user = user; currentUser = { name: user.name, email: user.email || user.mobile || '' };
    window.dispatchEvent(new CustomEvent('ma:signed-in', { detail: { session } }));   // starts the inactivity timer
    try { S.ent = await API.get('/me/entitlements'); } catch (e) {}
    await MA_LIVE.refreshSip();   // the best SIP date is only sent to subscribers
    const next = sessionStorage.getItem('ma-next'); sessionStorage.removeItem('ma-next');
    go(next && (!next.startsWith('admin') || user.role !== 'user') ? next : user.role !== 'user' ? 'admin/dashboard' : 'user/overview');
  };
  // Logout: the API revokes the session (refresh + access token) and clears the cookies; locally we drop all
  // user state, tell other open tabs, and replace history so Back does not return to signed-in pages.
  function signedOut(msg) {
    S.user = null; S.ent = null; S.notifs = null;
    try { localStorage.setItem('mod-alpha-logout', String(Date.now())); } catch (e) {}
    window.dispatchEvent(new CustomEvent('ma:logout'));
    history.replaceState(null, '', '#/login'); route();
    if (msg) notify(msg);
  }
  // Log out: end the session on the server, then locally.
  async function logout() { try { await API.post('/auth/logout'); } catch (e) {} signedOut('You have been logged out.'); }
  window.MA_AUTH = { signedOut, logout };
   // used by session-timeout.js
  on('[data-action="logout"]', logout);
  on('[data-action="logout-all"]', () => {
    showModal('Sign out of all devices?', `<div class="v22"><p style="margin:0 0 18px;line-height:1.55">This ends every Mod Alpha session on all your phones, tablets and computers, including this one. You will need to log in again.</p><div class="ma-rem-actions"><button type="button" class="v22-ghost-btn" data-modal-close>Cancel</button><button type="button" class="v22-grad-btn" data-ma-logout-all>Sign out everywhere</button></div></div>`);
    document.querySelectorAll('[data-modal-close]').forEach((b) => (b.onclick = () => (document.getElementById('modal-root').innerHTML = '')));
    document.querySelector('[data-ma-logout-all]').onclick = async (e) => {
      const done = busy(e.currentTarget, 'Signing out…');
      try { const r = await API.post('/auth/logout-all'); document.getElementById('modal-root').innerHTML = ''; signedOut(`Signed out of ${r.sessionsEnded} session${r.sessionsEnded === 1 ? '' : 's'} on all devices.`); } catch (err) { done(); fail(err); }
    };
  });
  // another tab logged out → this tab follows
  window.addEventListener('storage', (e) => { if (e.key === 'mod-alpha-logout' && S.user) { S.user = null; S.ent = null; history.replaceState(null, '', '#/login'); route(); notify('You have been logged out.'); } });
  // ------------------------------------------------------------------ login / signup / OTP / Google / forgot
  // admins: step 2 (email code + SMS code) before a session is issued
  async function loginResult(r) {
    if (!r || !r.mfaRequired) return afterLogin(r.user, r.session);
    MA_MFA.show(r, {
      verify: async (emailCode, smsCode) => { const v = await API.post('/auth/login/verify', { challengeId: r.challengeId, emailCode, smsCode }); await afterLogin(v.user, v.session); },
      resend: () => API.post('/auth/login/resend', { challengeId: r.challengeId }),
      cancel: () => { location.hash = '#/login'; },
    });
  }
  const baseAuth = renderAuth;
  renderAuth = function () {
    baseAuth();
    document.querySelector('.v22-auth-guest')?.remove();
    const form = document.getElementById('auth-form'); if (!form) return;
    const err = document.getElementById('form-error');
    const mobile = maAuthMethod === 'mobile', signup = authMode === 'signup';
    if (!mobile && !signup) { try { const saved = localStorage.getItem('ma-remember-email'); const em = form.querySelector('input[name=email]'); if (saved && em && !em.value) em.value = saved; } catch (e) {} }
    if (mobile) {
      form.querySelector('input[name=password]')?.closest('label')?.remove();
      form.querySelector('input[name=confirm]')?.closest('label')?.remove();
      form.querySelector('.v22-auth-opts')?.remove();
      form.querySelector('button[type=submit]').innerHTML = `Send OTP ${ic('arrowR')}`;
    }
    form.onsubmit = async (e) => {
      e.preventDefault(); err.textContent = '';
      const fd = new FormData(form), id = String(fd.get('email') || '').trim(), btn = form.querySelector('button[type=submit]');
      const done = busy(btn, mobile ? 'Please wait…' : signup ? 'Creating account…' : 'Signing in…');
      try {
        if (mobile) {
          const codeInput = form.querySelector('input[name=otp]');
          if (!codeInput) {
            const r = await API.post('/auth/otp/send', { mobile: id, intent: signup ? 'signup' : 'login' });   // Login: existing accounts only
            done();
            btn.insertAdjacentHTML('beforebegin', `<label class="v22-auth-in">${ic('lock')}<input name="otp" inputmode="numeric" maxlength="6" placeholder="6-digit OTP" required autocomplete="one-time-code"></label>${signup ? '' : ''}`);
            btn.innerHTML = `Verify & continue ${ic('arrowR')}`;
            err.textContent = r.devCode ? `Test OTP (stage only): ${r.devCode}` : 'OTP sent. It expires in 10 minutes.';
            err.style.color = '#7cb3ff';
            form.querySelector('input[name=otp]').focus();
            return;
          }
          const r = await API.post('/auth/otp/verify', { mobile: id, code: codeInput.value.trim(), name: String(fd.get('name') || '') || undefined, intent: signup ? 'signup' : 'login' });
          await loginResult(r); return;
        }
        if (signup) {
          if (fd.get('password') !== fd.get('confirm')) throw new Error('Passwords do not match.');
          const r = await API.post('/auth/signup', { name: String(fd.get('name') || ''), email: id, password: String(fd.get('password') || '') });
          notify('Account created. Check your email to verify your address.'); await afterLogin(r.user, r.session); return;
        }
        // "Remember my email" only pre-fills the email next time; it does not lengthen the session
        const remember = form.querySelector('.v22-auth-opts input[type=checkbox]')?.checked !== false;
        try { remember ? localStorage.setItem('ma-remember-email', id) : localStorage.removeItem('ma-remember-email'); } catch (e2) {}
        const r = await API.post('/auth/login', { email: id, password: String(fd.get('password') || ''), remember });
        await loginResult(r);
      } catch (ex) {
        done(); err.style.color = '';
        // Login with a number / Google account that has no account yet → point to Create account
        if (ex.code === 'no_account') { err.innerHTML = `${esc(errMsg(ex))} <a href="#/signup" class="ma-auth-link">Create an account</a>`; return; }
        err.textContent = ex.details?.[0]?.message || errMsg(ex);
      }
    };
  };
  on('.v22-auth [data-action="forgot"]', async () => {
    const email = document.querySelector('#auth-form input[name=email]')?.value?.trim();
    if (!email || !/@/.test(email)) { document.getElementById('form-error').textContent = 'Enter your email above, then click “Forgot Password?”.'; return; }
    try { const r = await API.post('/auth/password/forgot', { email }); notify(r.message); } catch (e) { fail(e); }
  });
  on('[data-v22-social]', async (b) => {
    if (b.dataset.v22Social === 'Apple') { notify('Sign in with Apple is coming later (AUTH-05).'); return; }
    try {
      let token;
      if (ENV.GOOGLE_CLIENT_ID && window.google?.accounts?.id) {
        token = await new Promise((res) => { google.accounts.id.initialize({ client_id: ENV.GOOGLE_CLIENT_ID, callback: (r) => res(r.credential) }); google.accounts.id.prompt(); });
      } else {
        if (API.env === 'prod') { notify('Google sign-in is not configured yet.'); return; }
        const email = prompt('Stage test: Google sign-in is mocked. Enter an email to sign in as:'); if (!email) return; token = `mock:${email.trim()}`;
      }
      const r = await API.post('/auth/oauth/google', { idToken: token, intent: authMode === 'signup' ? 'signup' : 'login' }); await loginResult(r);
    } catch (e) {
      const er = document.getElementById('form-error');
      if (e.code === 'no_account' && er) { er.style.color = ''; er.innerHTML = `${esc(errMsg(e))} <a href="#/signup" class="ma-auth-link">Create an account</a>`; return; }
      fail(e);
    }
  });
  // Simple card page (reset password, verify email).
  function authShell(title, inner) { app.innerHTML = `${topbar(true)}<main class="v22 v22-auth"><section class="v22-auth-card"><div class="v22-auth-brand">${v22Mark(36)}<b>Mod Alpha</b></div><h1>${title}</h1>${inner}</section></main>${publicFooter()}`; }
  // #/reset-password?token=… — choose a new password.
  function renderResetPassword() {
    const token = new URLSearchParams(location.hash.split('?')[1] || '').get('token') || '';
    authShell('Choose a new password', `<p>Enter a new password for your account.</p><form id="ma-reset" style="display:grid;gap:14px;margin-top:20px;text-align:left"><label class="v22-auth-in">${ic('lock')}<input name="p1" type="password" minlength="8" placeholder="New password (min 8 characters)" required></label><label class="v22-auth-in">${ic('lock')}<input name="p2" type="password" placeholder="Repeat new password" required></label><div class="v22-err" id="ma-reset-err"></div><button class="v22-grad-btn wide lg">Update password ${ic('arrowR')}</button></form>`);
    document.getElementById('ma-reset').onsubmit = async (e) => { e.preventDefault(); const f = new FormData(e.target), er = document.getElementById('ma-reset-err'); if (f.get('p1') !== f.get('p2')) { er.textContent = 'Passwords do not match.'; return; } try { await API.post('/auth/password/reset', { token, password: f.get('p1') }); notify('Password updated. Please log in.'); go('login'); } catch (ex) { er.textContent = errMsg(ex); } };
  }
  // #/verify-email?token=… — confirm the email address.
  async function renderVerifyEmail() {
    const token = new URLSearchParams(location.hash.split('?')[1] || '').get('token') || '';
    authShell('Verifying your email…', '<p id="ma-ver">Please wait.</p>');
    try { await API.post('/auth/verify-email', { token }); document.querySelector('.v22-auth h1').textContent = 'Email verified'; document.getElementById('ma-ver').innerHTML = `Thank you. <a href="#/${S.user ? 'user/overview' : 'login'}" style="color:#4ea8ff">Continue</a>`; }
    catch (e) { document.querySelector('.v22-auth h1').textContent = 'Link expired'; document.getElementById('ma-ver').textContent = errMsg(e); }
  }

  // used by other live files
  Object.assign(MA_LIVE, { authShell, loadSession });
})();
