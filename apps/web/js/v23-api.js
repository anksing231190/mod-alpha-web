/* ==========================================================================
   Mod Alpha — v23 API integration layer
   Active only when config/env.js sets API_BASE_URL (stage / prod / local).
   Without it the site stays the static demo (v22 behaviour).
   Handlers are registered on `window` in the capture phase so they run before
   the demo handlers and stop them.
   ========================================================================== */
(function () {
  const API = window.MA_API;
  if (!API || !API.enabled) return;
  const ENV = window.MA_ENV || {};
  document.documentElement.dataset.env = API.env;
  const S = { user: null, ent: null, plans: null, notifs: null, sip: [], navCache: {}, ready: false };
  window.MA_STATE = S;
  const errMsg = (e) => (e && e.message) || 'Something went wrong';
  const fail = (e) => notify(errMsg(e));
  const on = (sel, fn) => window.addEventListener('click', (e) => { const b = e.target.closest?.(sel); if (!b) return; e.preventDefault(); e.stopImmediatePropagation(); fn(b, e); }, true);
  const busy = (b, label = 'Working…') => { if (!b) return () => {}; const h = b.innerHTML; b.disabled = true; b.innerHTML = label; return () => { b.disabled = false; b.innerHTML = h; }; };
  const isoToDmy = (s) => (s ? `${s.slice(8, 10)}/${s.slice(5, 7)}/${s.slice(0, 4)}` : '');
  const dmyToIso = (s) => { const d = v22ParseDate(s); return d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` : null; };
  const fmt = (s) => (s ? v22Fmt(String(s).slice(0, 10)) : '—');

  // ------------------------------------------------------------------ environment badge
  if (API.env !== 'prod') {
    // no on-screen environment badge (removed on request); the environment is still shown in Admin → System Settings
  }

  // ------------------------------------------------------------------ data bootstrap (replaces the bundled workbook)
  function toFund(f, i) { const seed = (window.V22_SEED_FUNDS || []).find((x) => x.id === f.id) || {}; return { ...f, sharpe: f.sharpe ?? 0, returns: { 1: f.returns['1'], 3: f.returns['3'], 5: f.returns['5'], 10: f.returns['10'] }, icon: seed.icon || (i === 0 ? 'trophy' : 'mark'), color: seed.color || ['#2f86f6', '#16c784', '#b42ee8', '#f4b72f', '#ef3340'][i % 5] }; }
  async function loadPublicData() {
    const [funds, plans, sip] = await Promise.all([API.get('/funds', { pageSize: 500, sort: '5y' }), API.get('/plans'), API.get('/sip-dates')]);
    D.funds = funds.items.map(toFund);
    D.categories = [...new Set(D.funds.map((f) => f.category))];
    S.plans = plans.plans;
    D.plans = plans.plans.map((p) => ({ name: p.name, price: p.prices.Monthly, prices: p.prices, period: 'Monthly', tagline: p.tagline, features: p.features, active: p.active, id: p.id }));
    S.sip = sip.items;
    const asOf = D.funds.map((f) => f.navDate).filter(Boolean).sort().at(-1) || new Date().toISOString().slice(0, 10);
    V22D.model = { asOf, funds: D.funds, navBy: S.navCache, navRows: 0, users: [], uView: [], subs: [], pays: [], sip: S.sip, holidays: [], categories: D.categories };
    V22D.ready = true; V22D.loaded = true; V22D.source = 'api'; V22D.meta = { fileName: 'Live database', by: API.env };
    const a = v22D(asOf); v22CalMonth = { y: a.getUTCFullYear(), m: a.getUTCMonth() };
  }
  // Stop the bundled-workbook loader from overwriting API data.
  window.v22LoadDataset = async () => {};
  v22LoadDataset = async () => {};
  v22FundSpark = function (f, i) { return f.spark && f.spark.length > 2 ? f.spark : v22Seeded(i + 3, 12, 6, 22, 5); };

  async function ensureNav(id) {
    if (S.navCache[id]) return S.navCache[id];
    const r = await API.get(`/funds/${encodeURIComponent(id)}/nav`, { period: 'MAX', points: 1500 });
    S.navCache[id] = { d: r.points.map((p) => p.d), v: r.points.map((p) => p.v) };
    return S.navCache[id];
  }

  // ------------------------------------------------------------------ session
  async function loadSession() {
    try { S.user = (await API.get('/auth/me', null, { onUnauthorized: false })).user; }
    catch (e) { S.user = null; }
    if (S.user) {
      currentUser = { name: S.user.name, email: S.user.email || S.user.mobile || '' };
      try { S.ent = await API.get('/me/entitlements'); } catch (e) { S.ent = null; }
    }
  }
  window.addEventListener('ma:unauthorized', () => { if (S.user) { S.user = null; notify('Your session expired. Please log in again.'); go('login'); } });
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
    if (h.startsWith('kyc/mock')) return renderMockKyc();
    if (/^user\/fund\//.test(h)) { const id = h.split('/')[2]; baseRoute(); ensureNav(id).then(() => { const el = document.getElementById('v22-detail-chart'); const f = D.funds.find((x) => x.id === id); if (el && f) el.innerHTML = v22DetailChart(f, v22DetailPeriod); }).catch(() => {}); return; }
    if (h === 'user/overview' || h === 'user') { baseRoute(); Promise.all(D.funds.slice(0, 3).map((f) => ensureNav(f.id))).then(() => { const el = document.getElementById('v22-dash-chart'); if (el) el.innerHTML = v22DashChart(v22DashPeriod); }).catch(() => {}); refreshBell(); return; }
    baseRoute();
    if (/^(user|admin)\b/.test(h)) refreshBell();
  };
  const afterLogin = async (user) => {
    S.user = user; currentUser = { name: user.name, email: user.email || user.mobile || '' };
    try { S.ent = await API.get('/me/entitlements'); } catch (e) {}
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
  async function logout() { try { await API.post('/auth/logout'); } catch (e) {} signedOut('You have been logged out.'); }
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
    if (!r || !r.mfaRequired) return afterLogin(r.user);
    MA_MFA.show(r, {
      verify: async (emailCode, smsCode) => { const v = await API.post('/auth/login/verify', { challengeId: r.challengeId, emailCode, smsCode }); await afterLogin(v.user); },
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
            const r = await API.post('/auth/otp/send', { mobile: id });
            done();
            btn.insertAdjacentHTML('beforebegin', `<label class="v22-auth-in">${ic('lock')}<input name="otp" inputmode="numeric" maxlength="6" placeholder="6-digit OTP" required autocomplete="one-time-code"></label>${signup ? '' : ''}`);
            btn.innerHTML = `Verify & continue ${ic('arrowR')}`;
            err.textContent = r.devCode ? `Test OTP (stage only): ${r.devCode}` : 'OTP sent. It expires in 10 minutes.';
            err.style.color = '#7cb3ff';
            form.querySelector('input[name=otp]').focus();
            return;
          }
          const r = await API.post('/auth/otp/verify', { mobile: id, code: codeInput.value.trim(), name: String(fd.get('name') || '') || undefined });
          await loginResult(r); return;
        }
        if (signup) {
          if (fd.get('password') !== fd.get('confirm')) throw new Error('Passwords do not match.');
          const r = await API.post('/auth/signup', { name: String(fd.get('name') || ''), email: id, password: String(fd.get('password') || '') });
          notify('Account created. Check your email to verify your address.'); await afterLogin(r.user); return;
        }
        const remember = form.querySelector('.v22-auth-opts input[type=checkbox]')?.checked !== false;
        const r = await API.post('/auth/login', { email: id, password: String(fd.get('password') || ''), remember });
        await loginResult(r);
      } catch (ex) { done(); err.style.color = ''; err.textContent = ex.details?.[0]?.message || errMsg(ex); }
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
      const r = await API.post('/auth/oauth/google', { idToken: token }); await loginResult(r);
    } catch (e) { fail(e); }
  });
  function authShell(title, inner) { app.innerHTML = `${topbar(true)}<main class="v22 v22-auth"><section class="v22-auth-card"><div class="v22-auth-brand">${v22Mark(36)}<b>Mod Alpha</b></div><h1>${title}</h1>${inner}</section></main>${publicFooter()}`; }
  function renderResetPassword() {
    const token = new URLSearchParams(location.hash.split('?')[1] || '').get('token') || '';
    authShell('Choose a new password', `<p>Enter a new password for your account.</p><form id="ma-reset" style="display:grid;gap:14px;margin-top:20px;text-align:left"><label class="v22-auth-in">${ic('lock')}<input name="p1" type="password" minlength="8" placeholder="New password (min 8 characters)" required></label><label class="v22-auth-in">${ic('lock')}<input name="p2" type="password" placeholder="Repeat new password" required></label><div class="v22-err" id="ma-reset-err"></div><button class="v22-grad-btn wide lg">Update password ${ic('arrowR')}</button></form>`);
    document.getElementById('ma-reset').onsubmit = async (e) => { e.preventDefault(); const f = new FormData(e.target), er = document.getElementById('ma-reset-err'); if (f.get('p1') !== f.get('p2')) { er.textContent = 'Passwords do not match.'; return; } try { await API.post('/auth/password/reset', { token, password: f.get('p1') }); notify('Password updated. Please log in.'); go('login'); } catch (ex) { er.textContent = errMsg(ex); } };
  }
  async function renderVerifyEmail() {
    const token = new URLSearchParams(location.hash.split('?')[1] || '').get('token') || '';
    authShell('Verifying your email…', '<p id="ma-ver">Please wait.</p>');
    try { await API.post('/auth/verify-email', { token }); document.querySelector('.v22-auth h1').textContent = 'Email verified'; document.getElementById('ma-ver').innerHTML = `Thank you. <a href="#/${S.user ? 'user/overview' : 'login'}" style="color:#4ea8ff">Continue</a>`; }
    catch (e) { document.querySelector('.v22-auth h1').textContent = 'Link expired'; document.getElementById('ma-ver').textContent = errMsg(e); }
  }

  // ------------------------------------------------------------------ KYC (mock page on stage; real provider redirects)
  function renderMockKyc() {
    const ref = new URLSearchParams(location.hash.split('?')[1] || '').get('ref') || '';
    authShell('Test KYC verification', `<p>This stage-only page stands in for the KYC provider (Digio). Choose the outcome to simulate the provider's signed webhook.</p><div class="v22-modal-actions" style="justify-content:center;margin-top:24px"><button class="v22-danger-btn" data-ma-kyc="Rejected">Reject</button><button class="v22-grad-btn" data-ma-kyc="Verified">Approve</button></div><p class="v22-hint">Reference: ${esc(ref)}</p>`);
    document.querySelectorAll('[data-ma-kyc]').forEach((b) => (b.onclick = async () => { try { await API.post('/kyc/mock/complete', { ref, decision: b.dataset.maKyc }); notify(`KYC ${b.dataset.maKyc.toLowerCase()} (test).`); go('user/subscription'); } catch (e) { fail(e); } }));
  }

  // ------------------------------------------------------------------ checkout
  async function startCheckout(planName, btn) {
    const plan = S.plans?.find((p) => p.name === planName); if (!plan) return;
    if (plan.id === 'Free') { notify('You are on the Free plan.'); return; }
    const cycle = pricingBilling === 'yearly' ? 'Yearly' : 'Monthly';
    const done = busy(btn, 'Starting checkout…');
    try {
      const co = await API.post('/billing/checkout', { planId: plan.id, cycle });
      done();
      if (co.order.provider === 'razorpay') {
        await loadScript('https://checkout.razorpay.com/v1/checkout.js');
        const rz = new window.Razorpay({ key: co.order.keyId, order_id: co.order.orderId, amount: co.order.amountPaise, currency: 'INR', name: 'Mod Alpha', description: co.order.description, prefill: co.order.prefill, theme: { color: '#5b5cf6' },
          handler: async (r) => { try { await API.post('/billing/verify', { orderId: r.razorpay_order_id, paymentId: r.razorpay_payment_id, signature: r.razorpay_signature }); await paid(); } catch (e) { fail(e); } } });
        rz.open(); return;
      }
      showModal('Test payment (stage)', `<div class="v22"><p class="v22-sub">Payments are mocked on this environment. Choose an outcome — it is sent through the same signed webhook the real gateway (Razorpay) will use.</p><div class="v22-kv" style="margin-top:12px"><div><span>Plan</span><b>${esc(plan.name)} · ${cycle}</b></div><div><span>Amount</span><b>${inr(co.amountInr)}</b></div><div><span>Order</span><b class="mono">${esc(co.order.orderId)}</b></div></div><div class="v22-modal-actions"><button class="v22-outline-btn" data-ma-pay="failure">Simulate failure</button><button class="v22-grad-btn" data-ma-pay="success">Pay ${inr(co.amountInr)} (test)</button></div></div>`);
      document.querySelectorAll('[data-ma-pay]').forEach((b) => (b.onclick = async () => { const d2 = busy(b); try { await API.post('/billing/mock/complete', { orderId: co.order.orderId, outcome: b.dataset.maPay }); modalRoot.innerHTML = ''; if (b.dataset.maPay === 'success') await paid(); else notify('Payment failed (test). Nothing was charged.'); } catch (e) { d2(); fail(e); } }));
    } catch (e) {
      done();
      if (e.code === 'kyc_required') {
        showModal('Complete KYC first', `<div class="v22"><p class="v22-sub">KYC is required once before your first paid subscription. It takes about 3 minutes with PAN and DigiLocker.</p><div class="v22-modal-actions"><button class="v22-outline-btn" data-modal-close>Later</button><button class="v22-grad-btn" data-ma-kyc-start>Start KYC ${ic('arrowR')}</button></div></div>`);
        document.querySelector('[data-ma-kyc-start]').onclick = async () => { try { const k = await API.post('/kyc/sessions'); modalRoot.innerHTML = ''; if (k.redirectUrl) location.href = k.redirectUrl; } catch (er) { fail(er); } };
      } else fail(e);
    }
  }
  async function paid() { S.ent = await API.get('/me/entitlements'); notify(`${S.ent.plan} plan activated. Thank you!`); go('user/subscription'); renderUser('subscription'); }
  const loadScript = (src) => new Promise((res, rej) => { if (document.querySelector(`script[src="${src}"]`)) return res(); const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('Could not load payment checkout')); document.head.appendChild(s); });
  on('[data-plan]', (b) => startCheckout(b.dataset.plan, b));
  // public pricing CTAs: signed-in users go straight to checkout
  on('.v22-plan a[href="#/signup"], .v22-plan .v22-grad-btn', (b) => { const name = b.closest('.v22-plan')?.querySelector('h3')?.textContent; if (!S.user) { sessionStorage.setItem('ma-next', 'user/subscription'); go('signup'); return; } go('user/subscription'); setTimeout(() => startCheckout(name, null), 300); });

  // subscription page: show current plan, invoices, cancel
  const baseSubPage = subscriptionPage;
  subscriptionPage = function () {
    const e = S.ent, sub = e?.subscription;
    const cur = `<section class="v22 v22-card ma-cur-plan"><div class="v22-card-head"><div><h2>Your plan: ${esc(e?.plan || 'Free')}</h2><p>${sub ? `${sub.cycle} · ${sub.status}${sub.cancelAtPeriodEnd ? ` · ends ${fmt(sub.renewalDate)}` : ` · renews ${fmt(sub.renewalDate)}`}` : 'Upgrade any time. KYC is required before the first paid plan.'}</p></div><div class="v22-phead-actions">${sub && !sub.cancelAtPeriodEnd ? `<button class="v22-danger-btn" data-ma-cancel="${sub.id}">Cancel plan</button>` : ''}<button class="v22-outline-btn" data-ma-invoices>${ic('file')} Billing history</button></div></div></section>`;
    return cur + baseSubPage().replace(/<div class="subscription-footnote">[\s\S]*?<\/div>/, '<div class="subscription-footnote">Prices include GST. First-time subscribers complete KYC before activation.</div>');
  };
  on('[data-ma-cancel]', async (b) => { if (!confirm('Cancel your plan? It stays active until the end of the current billing period.')) return; try { const r = await API.post(`/billing/subscriptions/${b.dataset.maCancel}/cancel`); S.ent = await API.get('/me/entitlements'); notify(r.message); renderUser('subscription'); } catch (e) { fail(e); } });
  on('[data-ma-invoices], [data-action="billing-details"]', async () => {
    try { const r = await API.get('/billing/invoices'); showModal('Billing history', r.items.length ? `<div class="v22"><table class="v22-table"><thead><tr><th>Invoice</th><th>Plan</th><th>Amount</th><th>Date</th><th></th></tr></thead><tbody>${r.items.map((i) => `<tr><td class="mono">${esc(i.number)}</td><td>${esc(i.plan_id || '')} ${esc(i.billing_cycle || '')}</td><td>${inr(i.amount_inr)}</td><td>${fmt(i.issued_at)}</td><td><button class="v22-row-btn" data-ma-inv="${i.id}">View</button></td></tr>`).join('')}</tbody></table></div>` : '<p class="v22-sub">No invoices yet.</p>'); } catch (e) { fail(e); }
  });
  on('[data-ma-inv]', async (b) => { try { const { invoice: i } = await API.get(`/billing/invoices/${b.dataset.maInv}`); const w = window.open('', '_blank'); w.document.write(`<title>${i.number}</title><body style="font-family:Inter,sans-serif;padding:40px;max-width:640px"><h2>${i.seller}</h2><p>Tax invoice <b>${i.number}</b><br>Date: ${fmt(i.issued_at)}</p><p>Billed to: ${esc(i.full_name)}<br>${esc(i.email || '')}</p><table style="width:100%;border-collapse:collapse" border="1" cellpadding="8"><tr><td>Mod Alpha ${esc(i.plan_id)} plan (${esc(i.billing_cycle)})</td><td align="right">₹${i.taxable}</td></tr><tr><td>GST 18%</td><td align="right">₹${i.gst_inr}</td></tr><tr><td><b>Total</b></td><td align="right"><b>₹${i.amount_inr}</b></td></tr></table><p style="color:#666;font-size:12px">${i.note}</p><button onclick="print()">Print</button></body>`); } catch (e) { fail(e); } });

  // ------------------------------------------------------------------ settings (profile, preferences, notifications, privacy)
  const baseSettings = settingsPage;
  settingsPage = function () {
    let h = baseSettings();
    if (S.user) h = h.replace('<span class="v22-pill neutral">Free plan</span>', `<span class="v22-pill neutral">${esc(S.ent?.plan || 'Free')} plan</span>`).replace('<span class="v22-pill info">Guest demo profile</span>', `<span class="v22-pill ${S.user.kycStatus === 'Verified' ? 'ok' : 'warn'}">KYC: ${esc(S.user.kycStatus)}</span>${S.user.email && !S.user.emailVerified ? '<button class="v22-pill warn" data-ma-verify-email>Verify email</button>' : ''}`);
    h = h.replace(/Changes are stored for this demo session only\.|Preferences apply to this browser session\.|Delivery is not connected in this prototype\./g, 'Saved to your account.');
    return h;
  };
  async function hydrateSettings() {
    if (!/#\/user\/settings/.test(location.hash) || !S.user) return;
    const mob = document.getElementById('profile-mobile'); if (mob && S.user.mobile) mob.value = S.user.mobile;
    try {
      const { preferences: p, consents } = await API.get('/me/preferences');
      const inv = document.getElementById('default-investment'), sip = document.getElementById('default-sip');
      if (inv) inv.value = p.defaultInvestment; if (sip) sip.value = p.defaultSip;
      const ch = document.querySelectorAll('.v22-chan'); ['email', 'sms', 'push'].forEach((k, i) => { const t = ch[i]?.querySelector('input'); if (t) { t.checked = !!p.channels[k]; ch[i].classList.toggle('on', t.checked); } });
      const topics = ['sipReminder', 'datePublished', 'billing', 'weeklyDigest', 'announcements'];
      if (settingsTab === 'notifications') document.querySelectorAll('.v22-set-card:nth-of-type(2) .v22-trow input[type=checkbox]').forEach((t, i) => { if (topics[i]) t.checked = !!p.topics[topics[i]]; });
      if (settingsTab === 'privacy') { const t = document.querySelectorAll('.v22-set-card .v22-trow input[type=checkbox]'); if (t[0]) t[0].checked = !!consents.analytics; if (t[1]) t[1].checked = !!consents.marketing; }
    } catch (e) {}
  }
  on('[data-action="save-profile-settings"]', async (b) => {
    const done = busy(b, 'Saving…');
    try {
      const r = await API.patch('/me', { name: document.getElementById('profile-name')?.value?.trim() || undefined, mobile: document.getElementById('profile-mobile')?.value?.trim() || undefined });
      await API.put('/me/preferences', { defaultInvestment: +document.getElementById('default-investment').value, defaultSip: +document.getElementById('default-sip').value });
      S.user = r.user; currentUser.name = r.user.name; done(); notify('Profile saved.'); renderUser('settings');
    } catch (e) { done(); fail(e); }
  });
  on('[data-action="save-settings"]', async (b) => {
    const done = busy(b, 'Saving…');
    try {
      if (settingsTab === 'notifications') {
        const ch = document.querySelectorAll('.v22-chan input'); const tg = document.querySelectorAll('.v22-set-card:nth-of-type(2) .v22-trow input[type=checkbox]');
        const topics = ['sipReminder', 'datePublished', 'billing', 'weeklyDigest', 'announcements'];
        await API.put('/me/preferences', { channels: { email: ch[0]?.checked, sms: ch[1]?.checked, push: ch[2]?.checked }, topics: Object.fromEntries(topics.map((k, i) => [k, !!tg[i]?.checked])), reminderTiming: document.querySelector('.v22-set-card:nth-of-type(2) select')?.value });
      } else {
        const nums = document.querySelectorAll('.v22-set-card input[type=number]'); const per = document.querySelector('.v22-seg-pills button.active')?.textContent;
        await API.put('/me/preferences', { defaultInvestment: +nums[0]?.value || undefined, defaultSip: +nums[1]?.value || undefined, defaultPeriod: ['1Y', '3Y', '5Y', '10Y'].includes(per) ? per : undefined });
      }
      done(); notify('Preferences saved.');
    } catch (e) { done(); fail(e); }
  });
  window.addEventListener('change', async (e) => {
    if (!/#\/user\/settings/.test(location.hash) || settingsTab !== 'privacy') return;
    const rows = [...document.querySelectorAll('.v22-set-card .v22-trow input[type=checkbox]')], i = rows.indexOf(e.target);
    if (i < 0 || i > 1) return;
    try { await API.put('/me/consents', i === 0 ? { analytics: e.target.checked } : { marketing: e.target.checked }); notify('Consent updated.'); } catch (er) { e.target.checked = !e.target.checked; fail(er); }
  }, true);
  on('[data-ma-verify-email]', async () => { try { await API.post('/me/verify-email'); notify('Verification email sent.'); } catch (e) { fail(e); } });
  on('[data-action="change-password"]', () => {
    showModal('Change password', `<div class="v22"><form id="ma-pw" style="display:grid;gap:12px"><label class="v22-fl">Current password<input type="password" name="c" autocomplete="current-password"></label><label class="v22-fl">New password<input type="password" name="n" minlength="8" required autocomplete="new-password"></label><label class="v22-fl">Repeat new password<input type="password" name="r" required></label><div class="v22-err" id="ma-pw-err"></div><button class="v22-grad-btn">Update password</button></form></div>`);
    document.getElementById('ma-pw').onsubmit = async (e) => { e.preventDefault(); const f = new FormData(e.target), er = document.getElementById('ma-pw-err'); if (f.get('n') !== f.get('r')) { er.textContent = 'Passwords do not match.'; return; } try { await API.post('/me/password', { currentPassword: f.get('c') || undefined, newPassword: f.get('n') }); modalRoot.innerHTML = ''; notify('Password updated.'); } catch (ex) { er.textContent = errMsg(ex); } };
  });
  on('[data-action="export-account"]', async (b) => { const done = busy(b, 'Requesting…'); try { const r = await API.post('/me/data-export'); done(); notify('Export requested. We will email you when it is ready.'); const poll = async (n) => { const s = await API.get(`/me/data-export/${r.id}`); if (s.status === 'Completed') { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(s.data, null, 2)], { type: 'application/json' })); a.download = 'mod-alpha-my-data.json'; a.click(); } else if (n > 0) setTimeout(() => poll(n - 1), 15000); }; setTimeout(() => poll(8), 5000); } catch (e) { done(); fail(e); } });
  on('[data-action="delete-account"]', () => {
    showModal('Delete account', `<div class="v22"><p class="v22-sub">Your account will be deleted after a 30-day grace period. Billing records are kept as required by law. Type <b>DELETE</b> to confirm.</p><form id="ma-del" style="display:grid;gap:12px;margin-top:12px"><label class="v22-fl">Password<input type="password" name="p"></label><label class="v22-fl">Confirmation<input name="c" placeholder="DELETE"></label><div class="v22-err" id="ma-del-err"></div><button class="v22-danger-btn">Request deletion</button></form></div>`);
    document.getElementById('ma-del').onsubmit = async (e) => { e.preventDefault(); const f = new FormData(e.target); try { const r = await API.post('/me/deletion-request', { password: f.get('p') || undefined, confirm: f.get('c') }); modalRoot.innerHTML = ''; notify(r.message); } catch (ex) { document.getElementById('ma-del-err').textContent = ex.code === 'bad_request' ? 'Type DELETE to confirm.' : errMsg(ex); } };
  });

  // ------------------------------------------------------------------ notifications bell
  async function refreshBell() {
    if (!S.user) return;
    paintBell();
    try { S.notifs = await API.get('/me/notifications'); paintBell(); } catch (e) {}
  }
  function paintBell() {
    if (!S.notifs) return;
    try {
      const bell = document.querySelector('.v22-bell'), pop = document.getElementById('v22-notif-pop'); if (!bell || !pop) return;
      bell.querySelector('.v22-bell-badge')?.remove();
      if (S.notifs.unread) bell.insertAdjacentHTML('beforeend', `<em class="v22-bell-badge">${S.notifs.unread > 9 ? '9+' : S.notifs.unread}</em>`);
      const ico = { billing: 'rupee', kyc: 'idcard', sip_date: 'calendar', campaign: 'bell' };
      pop.querySelectorAll('.v22-np-item').forEach((x) => x.remove());
      pop.querySelector('.v22-np-head').insertAdjacentHTML('afterend', S.notifs.items.length ? S.notifs.items.slice(0, 8).map((n) => `<a class="v22-np-item ${n.read ? '' : 'unread'}" href="${esc(n.link || '#/user/overview')}">${cic(ico[n.kind] || 'bell', 30)}<div><b>${esc(n.title)}</b><small>${esc(n.body)}</small></div><time>${timeAgo(n.created_at)}</time></a>`).join('') : '<div class="v22-np-item"><div><small>No notifications yet.</small></div></div>');
    } catch (e) {}
  }
  const timeAgo = (t) => { const m = Math.round((Date.now() - new Date(t)) / 60000); return m < 60 ? `${Math.max(1, m)}m ago` : m < 1440 ? `${Math.round(m / 60)}h ago` : `${Math.round(m / 1440)}d ago`; };
  on('[data-v22-markread]', async () => { try { await API.post('/me/notifications/read', {}); refreshBell(); } catch (e) { fail(e); } });

  // ------------------------------------------------------------------ watchlist, support, assistant
  on('[data-action="watchlist"]', async () => { try { await API.post(`/me/watchlist/${encodeURIComponent(selectedFund)}`); notify('Added to your watchlist.'); } catch (e) { fail(e); } });
  on('[data-v22-support]', async (b) => {
    const em = document.getElementById('support-email').value.trim(), msg = document.getElementById('support-message').value.trim(), topic = (document.querySelector('#v22-topic button.active')?.textContent || 'Product question').replace('&amp;', '&');
    const done = busy(b, 'Sending…');
    try { const r = await API.post('/support/tickets', { email: em, topic: topic.includes('privacy') ? 'Account & privacy' : topic, message: msg }); done(); const ok = document.getElementById('v22-support-ok'); ok.hidden = false; ok.innerHTML = `${cic('check', 22)} ${esc(r.message)}`; document.getElementById('support-message').value = ''; }
    catch (e) { done(); fail(e.details?.[0] ? new Error(e.details[0].path === 'message' ? 'Please describe your question (at least 10 characters).' : e.details[0].message) : e); }
  });
  const chatHistory = [];
  v22ChatSend = async function (q) {
    q = (q || '').trim(); if (!q) return;
    const box = document.getElementById('chat-messages'); box.querySelector('.v22-chat-prompts')?.remove();
    box.insertAdjacentHTML('beforeend', `<div class="v22-bubble me">${esc(q)}</div><div class="v22-bubble bot typing"><i></i><i></i><i></i></div>`); box.scrollTop = box.scrollHeight;
    chatHistory.push({ role: 'user', content: q });
    const t = box.querySelector('.typing');
    try {
      const r = await API.post('/assistant/messages', { messages: chatHistory.slice(-10) });
      chatHistory.push({ role: 'assistant', content: r.reply });
      t.classList.remove('typing'); t.innerHTML = esc(r.reply).replace(/\n/g, '<br>') + `<small>${r.usage.limit >= 0 ? `${r.usage.today}/${r.usage.limit} today · ` : ''}${esc(r.disclaimer)}</small>`;
    } catch (e) { chatHistory.pop(); t.classList.remove('typing'); t.innerHTML = `${esc(errMsg(e))}${e.status === 429 ? ' <a href="#/user/subscription" style="color:#7cb3ff">Upgrade</a>' : ''}`; }
    box.scrollTop = box.scrollHeight;
  };

  // ------------------------------------------------------------------ calculators (server-side, real NAV)
  const topFundId = () => D.funds[0]?.id;
  runCalc = async function () {
    const amt = v22Num(document.getElementById('calc-amount')?.value), dIso = dmyToIso(document.getElementById('calc-date')?.value);
    if (!dIso) { notify('Enter a valid past date as dd/mm/yyyy.'); return; }
    if (!amt || amt < 500) { notify('Enter an amount of at least ₹500.'); return; }
    try {
      const r = await API.post('/calc/lumpsum', { fundId: selectedFund && D.funds.some((f) => f.id === selectedFund) ? selectedFund : topFundId(), date: dIso, amount: amt });
      v22WhatIf = { date: isoToDmy(dIso), amount: amt };
      const rr = { value: r.value, gain: r.gain, ret: r.totalReturnPct, cagr: r.cagrPct ?? 0, yrs: r.years, mult: r.value / amt };
      const vals = r.journey.map((j) => j.value), yMax = v22NiceMax(Math.max(...vals) * 1.05), y0 = +r.investedOn.slice(0, 4), y1 = +r.asOf.slice(0, 4);
      const years = Array.from({ length: Math.min(6, y1 - y0 + 1) }, (_, i) => String(Math.round(y0 + ((y1 - y0) * i) / Math.max(1, Math.min(5, y1 - y0)))));
      document.getElementById('v22-journey').innerHTML = v22Chart({ w: 620, h: 310, pad: { l: 50, r: 24, t: 20, b: 40 }, yMin: 0, yMax, yTicks: [0, 1, 2, 3, 4, 5].map((i) => (i * yMax) / 5), yFmt: (v) => (!v ? '0' : v >= 1e7 ? '₹' + (v / 1e7).toFixed(1) + 'Cr' : v >= 1e5 ? '₹' + (v / 1e5).toFixed(1) + 'L' : '₹' + Math.round(v / 1e3) + 'K'), xLabels: years, axisY: true, label: 'Investment journey from NAV', series: [{ values: vals, stops: [[0, '#22d3ee'], [1, '#38bdf8']], area: 0.7, areaStops: [[0, '#0ea5e9'], [1, '#22d3ee']], width: 3.6, dots: 2, r: 5, endDot: 8, glow: '#22d3ee', dotColor: '#5fe3ff' }], overlays: [{ at: [0, -1], cls: 'v22-tip v22-tip-up', html: `<small>Value on ${fmt(r.asOf)}</small><b>${inr(r.value)}</b>` }] });
      document.getElementById('v22-results').innerHTML = v22ResultRows(rr);
      const f = D.funds.find((x) => x.id === r.fundId);
      document.getElementById('v22-insight-text').textContent = `${inr(amt)} invested in ${f?.name || r.fundId} on ${fmt(r.investedOn)} (NAV ₹${r.buyNav}) is worth ${inr(r.value)} on ${fmt(r.asOf)}${r.cagrPct != null ? ` — ${r.cagrPct}% CAGR over ${r.years} years` : ''}. Past performance does not guarantee future returns.`;
      document.querySelectorAll('[data-v22-amount]').forEach((b) => b.classList.toggle('active', Number(b.dataset.v22Amount) === amt));
    } catch (e) { fail(e); }
  };
  runSip = async function () {
    const a = v22Num(document.getElementById('sip-amount')?.value), s = dmyToIso(document.getElementById('sip-start')?.value), e = dmyToIso(document.getElementById('sip-end')?.value);
    if (!a || a < 500) { notify('Enter a monthly SIP amount of at least ₹500.'); return; }
    if (!s || !e || e <= s) { notify('Enter a valid start and end date (dd/mm/yyyy), end after start.'); return; }
    try {
      const r = await API.post('/calc/sip-compare', { fundId: topFundId(), amount: a, start: s, end: e });
      v22SipState = { amount: a, start: isoToDmy(s), end: isoToDmy(e) };
      const pick = (k) => { const p = r.path; return Array.from({ length: 6 }, (_, i) => p[Math.round(((p.length - 1) * i) / 5)][k]); };
      const rr = { invested: r.invested, mod: r.modAlphaValue, trad: r.fixedValue, extra: r.extra, pct: r.extraPct, months: r.months, yrs: +(r.months / 12).toFixed(1), modPath: pick('modAlpha'), tradPath: pick('fixed') };
      document.getElementById('v22-sip-chart').innerHTML = v22SipChart(rr, v22D(s), v22D(e));
      document.getElementById('v22-sip-results').innerHTML = v22SipResults(rr) + (r.note ? `<div><span class="v22-muted" style="font-size:12px">${esc(r.note)}</span></div>` : '');
      document.querySelectorAll('[data-v22-sip]').forEach((b) => b.classList.toggle('active', Number(b.dataset.v22Sip) === a));
    } catch (er) { fail(er); }
  };

  // ------------------------------------------------------------------ public content

  // ================================================================== ADMIN
  const asyncPage = (title, loader) => { setTimeout(async () => { const el = document.getElementById('ma-async'); if (!el) return; try { el.outerHTML = await loader(); } catch (e) { el.innerHTML = `<section class="v22-card v22-loading"><span>${cic('warn', 36)}</span><div><b>Could not load ${esc(title)}</b><small>${esc(errMsg(e))}</small></div></section>`; } }, 0); return `<div id="ma-async"><section class="v22-card v22-loading"><span class="v22-spin"></span><div><b>Loading ${esc(title)}…</b></div></section></div>`; };
  const pager = (total, page, size, attr) => { const pages = Math.max(1, Math.ceil(total / size)); if (pages <= 1) return `<div class="v22-tfoot">Showing ${total.toLocaleString('en-IN')} record(s)</div>`; const nums = [...new Set([1, page - 1, page, page + 1, pages])].filter((n) => n >= 1 && n <= pages).sort((a, b) => a - b); let h = '', prev = 0; for (const n of nums) { if (n - prev > 1) h += '<span class="v22-ell">…</span>'; h += `<button type="button" ${attr}="${n}" class="${n === page ? 'active' : ''}">${n}</button>`; prev = n; } return `<div class="v22-tfoot v22-tpager"><span>Showing ${((page - 1) * size + 1).toLocaleString('en-IN')}–${Math.min(page * size, total).toLocaleString('en-IN')} of ${total.toLocaleString('en-IN')}</span><nav class="v22-pager sm"><button type="button" ${attr}="${page - 1}" ${page === 1 ? 'disabled' : ''}>${ic('chevL')}</button>${h}<button type="button" ${attr}="${page + 1}" ${page === pages ? 'disabled' : ''}>${ic('chevR')}</button></nav></div>`; };
  const pctTxt = (v, pp) => (v == null ? '—' : `${v >= 0 ? '+' : ''}${(+v).toFixed(1)}${pp ? ' pp' : '%'}`);

  // ---- dashboard
  let RANGE = null, PER = { users: null, subs: null };
  function rangeFor(p) { if (!p) return RANGE || {}; const to = RANGE?.to || null; const d = new Date((to || new Date().toISOString().slice(0, 10)) + 'T00:00:00Z'); if (p === '7D') d.setUTCDate(d.getUTCDate() - 6); else if (p === '30D') d.setUTCDate(d.getUTCDate() - 30); else if (p === '3M') d.setUTCMonth(d.getUTCMonth() - 3); else d.setUTCFullYear(d.getUTCFullYear() - 1); return { from: d.toISOString().slice(0, 10), to: to || undefined, granularity: p === '1Y' ? 'month' : p === '3M' ? 'week' : 'day' }; }
  function apiChart(kind, m) {
    const s = m.series, n = s.length, bars = s.map((x) => +(kind === 'users' ? x.new_users : x.new_subs)), line = s.map((x) => +(kind === 'users' ? x.total_users : x.revenue));
    const g = m.range.granularity, lab = (b) => { const d = v22D(b); return g === 'month' ? `${V22_MON[d.getUTCMonth()]} ${String(d.getUTCFullYear()).slice(2)}` : `${d.getUTCDate()} ${V22_MON[d.getUTCMonth()]}`; };
    const barMax = v22NiceMax(Math.max(1, ...bars) * 1.15), lineMax = v22NiceMax(Math.max(1, ...line) * 1.05), scaled = line.map((v) => (v / lineMax) * barMax);
    let def = n - 1; while (def > 0 && !bars[def]) def--;
    const W = 540, l = 44, r = 54, iw = W - l - r, step = Math.max(1, Math.ceil(n / 7)), idx = s.map((_, i) => i).filter((i) => i % step === 0 || i === n - 1);
    const tipAt = (k) => `<small>${lab(s[k].bucket)}${g !== 'day' ? ` (${g})` : ''}</small>` + (kind === 'users' ? `<div><i style="--c:#3b82f6"></i><span>New Users: ${bars[k].toLocaleString('en-IN')}</span></div><div><i style="--c:#c04cf5"></i><span>Total Users: ${line[k].toLocaleString('en-IN')}</span></div>` : `<div><i style="--c:#3b82f6"></i><span>Subscriptions: ${bars[k]}</span></div><div><i style="--c:#c04cf5"></i><span>Revenue: ${inr(line[k])}</span></div>`);
    V22_HOV[kind] = { n, l, iw, W, tips: s.map((_, k) => tipAt(k)), def };
    return v22Chart({ w: W, h: 220, pad: { l, r, t: 12, b: 34 }, yMin: 0, yMax: barMax, yTicks: [0, 1, 2, 3, 4].map((i) => (barMax * i) / 4), yFmt: (v) => (v >= 1000 ? v / 1000 + 'K' : Math.round(v)), yRight: { ticks: [0, 1, 2, 3, 4].map((i) => (kind === 'users' ? ((lineMax * i) / 4 >= 1000 ? ((lineMax * i) / 4 / 1000).toFixed(1) + 'K' : Math.round((lineMax * i) / 4)) : v22Short((lineMax * i) / 4))) }, xLabels: idx.map((i) => lab(s[i].bucket)), xPos: idx.map((i) => l + ((i + 0.5) * iw) / n), vGrid: false, label: kind, bars: { values: bars, purple: [def] }, series: [{ values: scaled, color: '#c04cf5', width: 2.6, dots: Math.max(1, Math.round(n / 8)), r: 4.5, endDot: 6, glow: '#c04cf5', bandX: true }], overlays: [{ x: l + ((def + 0.5) * iw) / n, y: 6, cls: 'v22-multi-tip compact v22-tip-auto v22-hov-tip ' + (def > n * 0.6 ? 'left' : ''), html: tipAt(def) }, { x: l + ((def + 0.5) * iw) / n, y: 0, cls: 'v22-hov-line', html: '' }] }).replace('<div class="v22-chart', `<div data-v22-hov="${kind}" class="v22-chart v22-hov`);
  }
  adminDashboard = function () { return `<div class="v22 v22-adm v22-admin">${asyncPage('dashboard', dashHtml)}</div>`; };
  async function dashHtml() {
    const [m, rec, sum, sip, mu, ms] = await Promise.all([API.get('/admin/metrics', RANGE || {}), API.get('/admin/recent'), API.get('/admin/data/summary'), API.get('/sip-dates/current'), API.get('/admin/metrics', rangeFor(PER.users)), API.get('/admin/metrics', rangeFor(PER.subs))]);
    const K = m.kpis, cmp = RANGE ? 'vs previous period' : 'vs last month', cur = sip.current;
    const curDate = cur ? `${String(cur.recommended_day).padStart(2, '0')}/${cur.month.slice(5)}/${cur.month.slice(0, 4)}` : '';
    return `<section class="v22-admin-head"><div><h1>Admin Dashboard</h1><p>Manage users, data, SIP notifications and monitor platform performance.</p></div><div class="v22-head-right"><span class="v22-src">${cic('db', 18)} Live data · ${esc(API.env)} · as of ${fmt(m.range.asOf)}</span><button type="button" class="v22-range" data-ma-range>${fmt(m.range.from)} - ${fmt(m.range.to)} ${ic('calendar')}</button></div></section>
    <section class="v22-akpis">${v22AdminKpi('users', 'blue', 'Total Users', (+K.totalUsers.value).toLocaleString('en-IN'), pctTxt(K.totalUsers.changePct), (+K.totalUsers.previous).toLocaleString('en-IN'), cmp)}${v22AdminKpi('crown', 'gold', 'Subscribed Users', (+K.activeSubscriptions.value).toLocaleString('en-IN'), pctTxt(K.activeSubscriptions.changePct), (+K.activeSubscriptions.previous).toLocaleString('en-IN'), cmp)}${v22AdminKpi('percent', 'teal', 'Conversion Rate', K.conversionRate.value.toFixed(1) + '%', pctTxt(K.conversionRate.changePp, 1), K.conversionRate.previous.toFixed(1) + '%', cmp)}${v22AdminKpi('rupee', 'purple', RANGE ? 'Revenue (Period)' : 'Monthly Revenue', inr(K.revenue.value), pctTxt(K.revenue.changePct), inr(K.revenue.previous), cmp)}</section>
    <section class="v22-admin-charts"><article class="v22-card"><div class="v22-card-head"><div><h2>User Growth</h2><p>New user registrations over time</p></div>${v22Pills(['7D', '30D', '3M', '1Y'], PER.users || '', 'data-ma-per-users')}</div><div class="v22-legend center sq"><span><i style="--c:#3b82f6"></i>New Users</span><span><i style="--c:#a855f7"></i>Total Users</span></div><div id="v22-ch-users">${apiChart('users', mu)}</div></article>
    <article class="v22-card"><div class="v22-card-head"><div><h2>Subscription Trends</h2><p>New subscriptions and revenue collected</p></div>${v22Pills(['7D', '30D', '3M', '1Y'], PER.subs || '', 'data-ma-per-subs')}</div><div class="v22-legend center sq"><span><i style="--c:#3b82f6"></i>New Subscriptions</span><span><i style="--c:#a855f7"></i>Revenue (₹)</span></div><div id="v22-ch-subs">${apiChart('subs', ms)}</div></article></section>
    <section class="v22-admin-ops"><article class="v22-card v22-sipcfg"><div class="v22-op-head"><span class="v22-tile violet lg">${ic('calendar')}</span><div><h2>SIP Notification Date Configuration</h2><p>Current published date. Change it from SIP Date Configuration (validated, versioned and audited).</p></div></div>
      <div class="v22-sipcfg-row"><div><label class="v22-label">Published date ${cur ? `(${esc(cur.month)})` : ''}</label><div class="v22-field">${ic('calendar')}<input value="${curDate || 'Not published'}" readonly></div></div><div class="v22-sipcfg-note"><p>Reminders go to active subscribers ${cur ? `before the ${cur.recommended_day}` : ''} via email, SMS, push and in-app (consent-aware).</p><a class="v22-grad-btn" href="#/admin/sipdate">Change date</a></div></div>
      <b class="v22-upcoming-t">Status</b><div class="v22-upcoming"><span class="d">${cur ? fmt(`${cur.month}-${String(cur.recommended_day).padStart(2, '0')}`) : '—'}</span><span>${cur ? `${esc(cur.status)} · ${esc(cur.version || '')}${cur.uplift_pct != null ? ` · +${cur.uplift_pct}% historical uplift` : ''}` : 'No date published yet'}</span><a class="v22-outline-btn" href="#/admin/notifications">${ic('eye')} Campaigns</a></div></article>
    <article class="v22-card v22-upload"><div class="v22-op-head"><span class="v22-tile blue lg">${ic('db')}</span><div><h2>Data Upload &amp; Management</h2><p>Funds, NAV and SIP dates in the live database.</p></div><a class="v22-outline-btn sm" href="#/admin/data">Open Data Management ${ic('arrowR')}</a></div>
      <div class="v22-upload-row"><a class="v22-drop" href="#/admin/data">${ic('cloudUp', 'up')}<b>Upload workbook (Excel)</b><small>Validated on the server before publishing</small><span class="v22-outline-btn">Go to upload</span></a>
      <div class="v22-last"><b>Last published</b><div class="v22-last-when">${ic('file')}<span>${sum.lastPublished ? new Date(sum.lastPublished.published_at).toLocaleString('en-IN') : 'Never'}</span></div><dl><dt>File:</dt><dd>${esc(sum.lastPublished?.file_name || '—')}</dd><dt>NAV rows:</dt><dd>${(+sum.nav_rows).toLocaleString('en-IN')} (${sum.funds} funds)</dd><dt>Last NAV:</dt><dd>${fmt(sum.last_nav)}</dd></dl></div></div></article></section>
    <section class="v22-admin-lower"><article class="v22-card v22-tbl-card"><div class="v22-card-head"><h2>${ic('user', 't-ic blue')} Recent User Signups</h2><a href="#/admin/users">View All ${ic('arrowR')}</a></div><table class="v22-mini-table v22-compact"><thead><tr><th>User</th><th>Signed up</th><th>Status</th></tr></thead><tbody>${rec.signups.map((u) => `<tr><td><b>${esc(u.name)}</b><small>${esc(u.contact || '')}</small></td><td>${fmt(u.signup_date)}</td><td>${v22Status(u.status)}</td></tr>`).join('')}</tbody></table></article>
    <article class="v22-card v22-tbl-card"><div class="v22-card-head"><h2>${ic('crown', 't-ic gold')} Recent Subscriptions</h2><a href="#/admin/subscriptions">View All ${ic('arrowR')}</a></div><table class="v22-mini-table v22-compact"><thead><tr><th>User</th><th>Plan</th><th>Status</th></tr></thead><tbody>${rec.subscriptions.map((s) => `<tr><td><b>${esc(s.name)}</b><small>${fmt(s.start_date)}</small></td><td><b>${esc(s.plan)} (${esc(s.cycle)})</b><small>${inr(s.amount)}</small></td><td>${v22Status(s.status)}</td></tr>`).join('')}</tbody></table></article>
    <article class="v22-card v22-summary-card"><div class="v22-card-head"><h2>${ic('db', 't-ic teal')} Data Summary</h2><small class="v22-updated">${ic('refresh')} Live</small></div><div class="v22-dsum">${[['bars', 'teal', 'Total Mutual Funds', (+sum.funds).toLocaleString('en-IN'), 'Active schemes'], ['grid', 'violet', 'Categories', sum.categories, ''], ['layers', 'green', 'Total NAV Records', (+sum.nav_rows).toLocaleString('en-IN'), `Till ${fmt(sum.last_nav)}`], ['calendar', 'blue', 'Last Data Date', fmt(sum.last_nav), '']].map((x) => `<div><span class="v22-tile ${x[1]}">${ic(x[0])}</span><div><small>${x[2]}</small><b>${x[3]}</b><em>${x[4]}</em></div></div>`).join('')}</div></article></section>`;
  }
  on('[data-ma-per-users], [data-ma-per-subs]', async (b) => { const k = b.hasAttribute('data-ma-per-users') ? 'users' : 'subs'; PER[k] = b.getAttribute(`data-ma-per-${k}`); b.parentElement.querySelectorAll('button').forEach((x) => x.classList.toggle('active', x === b)); try { document.getElementById(`v22-ch-${k}`).innerHTML = apiChart(k, await API.get('/admin/metrics', rangeFor(PER[k]))); } catch (e) { fail(e); } });
  on('[data-ma-range]', () => {
    const t = new Date().toISOString().slice(0, 10), f = (n, u) => { const d = new Date(t + 'T00:00:00Z'); if (u === 'd') d.setUTCDate(d.getUTCDate() - n + 1); else d.setUTCMonth(d.getUTCMonth() - n); return d.toISOString().slice(0, 10); };
    const pre = [['This month', t.slice(0, 8) + '01', t], ['Last 7 days', f(7, 'd'), t], ['Last 30 days', f(30, 'd'), t], ['Last 90 days', f(90, 'd'), t], ['Year to date', t.slice(0, 4) + '-01-01', t], ['Last 12 months', f(12, 'm'), t]];
    showModal('Select date range', `<div class="v22 v22-range-modal"><div class="v22-range-pre">${pre.map((p) => `<button type="button" data-ma-rp="${p[1]}|${p[2]}">${p[0]}</button>`).join('')}</div><div class="v22-form-grid"><label class="v22-fl">From<input type="date" id="ma-rf" value="${RANGE?.from || pre[0][1]}" max="${t}"></label><label class="v22-fl">To<input type="date" id="ma-rt" value="${RANGE?.to || t}" max="${t}"></label></div><div class="v22-err" id="ma-re"></div><div class="v22-modal-actions"><button class="v22-outline-btn" data-ma-rreset>Reset to this month</button><button class="v22-grad-btn" data-ma-rapply>Apply range</button></div></div>`);
  });
  on('[data-ma-rp]', (b) => { const [a, c] = b.dataset.maRp.split('|'); document.getElementById('ma-rf').value = a; document.getElementById('ma-rt').value = c; });
  on('[data-ma-rapply]', () => { const a = document.getElementById('ma-rf').value, c = document.getElementById('ma-rt').value; if (!a || !c || a > c) { document.getElementById('ma-re').textContent = '“From” must be on or before “To”.'; return; } RANGE = { from: a, to: c }; PER = { users: null, subs: null }; modalRoot.innerHTML = ''; renderAdmin('dashboard'); });
  on('[data-ma-rreset]', () => { RANGE = null; PER = { users: null, subs: null }; modalRoot.innerHTML = ''; renderAdmin('dashboard'); });

  // ---- users
  const UF = { q: '', status: '', kyc: '', page: 1 };
  adminUsers = function () { return `<div class="v22 v22-adm">${v22Head('User Management', 'Search user records and review verification, consent and subscription status.', `<button type="button" class="v22-outline-btn" data-ma-users-csv>${ic('download')} Export CSV</button>`, 'ADMIN · USERS')}<section class="v22-card"><div class="v22-filters"><label class="v22-search">${ic('search')}<input id="ma-user-q" placeholder="Search name, email, mobile or ID" value="${esc(UF.q)}"></label>${v22Sel('ma-user-status', ['All statuses', 'Active', 'Suspended', 'Closed'])}${v22Sel('ma-user-kyc', ['All KYC states', 'Not started', 'Pending', 'In review', 'Verified', 'Rejected'])}</div><div id="ma-users">${asyncPage('users', usersHtml)}</div></section></div>`; };
  async function usersHtml() {
    const r = await API.get('/admin/users', { q: UF.q, status: UF.status, kyc: UF.kyc, page: UF.page, pageSize: 15 });
    if (!r.items.length) return '<div class="v22-empty">No users match these filters.</div>';
    return `<div class="table-scroll"><table class="v22-table v22-admin-table"><thead><tr><th>User</th><th>ID</th><th>Joined</th><th>Account</th><th>KYC</th><th>Plan</th><th>Subscription</th><th></th></tr></thead><tbody>${r.items.map((u, i) => `<tr><td><div class="v22-who">${v22Avatar(u.name, i)}<div><b>${esc(u.name)}</b><small>${esc(u.email || u.mobile || '')}</small></div></div></td><td class="mono">${esc(u.ref)}</td><td>${fmt(u.signup_date)}</td><td>${v22Status(u.status)}</td><td>${v22Status(u.kyc)}</td><td>${esc(u.plan)}</td><td>${v22Status(u.sub)}</td><td><button type="button" class="v22-row-btn" data-ma-user="${u.id}">${ic('eye')} View</button></td></tr>`).join('')}</tbody></table></div>${pager(r.total, r.page, r.pageSize, 'data-ma-upage')}`;
  }
  const reloadUsers = async () => { const el = document.getElementById('ma-users'); if (el) { try { el.innerHTML = await usersHtml(); } catch (e) { fail(e); } } };
  let uqT; window.addEventListener('input', (e) => { if (e.target.id === 'ma-user-q') { UF.q = e.target.value; UF.page = 1; clearTimeout(uqT); uqT = setTimeout(reloadUsers, 300); } if (e.target.id === 'ma-sub-q') { SF.q = e.target.value; SF.page = 1; clearTimeout(uqT); uqT = setTimeout(reloadSubs, 300); } if (e.target.id === 'ma-audit-q') { AF.q = e.target.value; clearTimeout(uqT); uqT = setTimeout(reloadAudit, 300); } }, true);
  window.addEventListener('change', (e) => { const id = e.target.id; if (id === 'ma-user-status' || id === 'ma-user-kyc') { UF[id === 'ma-user-status' ? 'status' : 'kyc'] = e.target.value; UF.page = 1; reloadUsers(); } if (id === 'ma-sub-state' || id === 'ma-sub-plan') { SF[id === 'ma-sub-state' ? 'status' : 'plan'] = e.target.value; SF.page = 1; reloadSubs(); } if (id === 'ma-audit-cat') { AF.category = e.target.value; reloadAudit(); } }, true);
  on('[data-ma-upage]', (b) => { if (b.disabled) return; UF.page = +b.dataset.maUpage; reloadUsers(); });
  on('[data-ma-users-csv]', async () => { try { await API.download('/admin/users', { q: UF.q, status: UF.status, kyc: UF.kyc, format: 'csv' }, 'mod-alpha-users.csv'); } catch (e) { fail(e); } });
  on('[data-ma-user]', async (b) => {
    try {
      const r = await API.get(`/admin/users/${b.dataset.maUser}`), u = r.user;
      showModal(`User · ${esc(u.full_name)}`, `<div class="v22"><div class="v22-kv">${[['Email', esc(u.email || '—')], ['Mobile', esc(u.mobile || '—')], ['Joined', fmt(u.signup_date)], ['Role', esc(u.role)], ['Account', v22Status(u.account_status)], ['KYC', v22Status(u.kyc_status)], ['Marketing consent', u.marketing_consent ? 'Yes' : 'No']].map((x) => `<div><span>${x[0]}</span><b>${x[1]}</b></div>`).join('')}</div>
        <h3 class="v22-set-h" style="margin:16px 0 8px!important;font-size:15px">Subscriptions</h3>${r.subscriptions.length ? r.subscriptions.map((s) => `<div class="v22-batch">${cic('crown', 24)}<div><b>${esc(s.plan_id)} · ${esc(s.billing_cycle)}</b><small>${inr(s.amount_inr)} · from ${fmt(s.start_date)}</small></div>${v22Status(s.status)}</div>`).join('') : '<p class="v22-sub">Free plan</p>'}
        <div class="v22-form-grid" style="margin-top:14px"><label class="v22-fl">Reason (audited)<input id="ma-u-reason" placeholder="Why are you making this change?"></label><label class="v22-fl">KYC decision${v22Sel('ma-u-kyc', ['—', 'Verified', 'Rejected', 'In review'])}</label></div>
        <div class="v22-modal-actions">${u.account_status === 'Active' ? `<button class="v22-danger-btn" data-ma-uact="Suspended" data-id="${u.id}">Suspend</button>` : `<button class="v22-outline-btn" data-ma-uact="Active" data-id="${u.id}">Reactivate</button>`}<button class="v22-grad-btn" data-ma-ukyc="${u.id}">Save KYC decision</button></div><p class="v22-hint">Viewing this record is recorded in the audit log.</p></div>`);
    } catch (e) { fail(e); }
  });
  on('[data-ma-uact]', async (b) => { const reason = document.getElementById('ma-u-reason').value.trim(); if (reason.length < 3) { notify('Enter a reason first.'); return; } try { await API.patch(`/admin/users/${b.dataset.id}`, { accountStatus: b.dataset.maUact, reason }); modalRoot.innerHTML = ''; notify(`User ${b.dataset.maUact.toLowerCase()}.`); reloadUsers(); } catch (e) { fail(e); } });
  on('[data-ma-ukyc]', async (b) => { const reason = document.getElementById('ma-u-reason').value.trim(), d = document.getElementById('ma-u-kyc').value; if (d === '—' || reason.length < 3) { notify('Choose a KYC decision and enter a reason.'); return; } try { await API.post(`/admin/kyc/${b.dataset.maUkyc}/decision`, { decision: d, reason }); modalRoot.innerHTML = ''; notify('KYC decision saved.'); reloadUsers(); } catch (e) { fail(e); } });

  // ---- subscriptions & pricing
  const SF = { q: '', status: '', plan: '', page: 1 };
  adminSubs = function () { return `<div class="v22 v22-adm">${v22Head('Subscriptions', 'Review plans, subscription lifecycle, invoices and payment reconciliation.', `<button type="button" class="v22-outline-btn" data-ma-pricing>${ic('gear')} Manage plans</button>`, 'ADMIN · BILLING')}<div id="ma-subs">${asyncPage('subscriptions', subsHtml)}</div></div>`; };
  async function subsHtml(listOnly) {
    const r = await API.get('/admin/subscriptions', { q: SF.q, status: SF.status, plan: SF.plan, page: SF.page, pageSize: 15 }), K = r.kpis;
    const list = r.items.length ? `<div class="table-scroll"><table class="v22-table v22-admin-table"><thead><tr><th>Subscription</th><th>User</th><th>Plan</th><th>Amount</th><th>Started</th><th>Renewal</th><th>Status</th><th>Provider</th></tr></thead><tbody>${r.items.map((s, i) => `<tr><td class="mono">${esc(s.id)}</td><td><div class="v22-who">${v22Avatar(s.user_name, i)}<div><b>${esc(s.user_name)}</b><small>${esc(s.user_ref)}</small></div></div></td><td>${esc(s.plan)} <small class="v22-muted">· ${esc(s.cycle)}</small></td><td><b>${inr(s.amount)}</b></td><td>${fmt(s.start_date)}</td><td>${s.cancel_at_period_end ? 'Ends ' : ''}${fmt(s.renewal_date)}</td><td>${v22Status(s.status)}</td><td>${esc(s.provider)}</td></tr>`).join('')}</tbody></table></div>${pager(r.total, r.page, r.pageSize, 'data-ma-spage')}` : '<div class="v22-empty">No subscriptions match these filters.</div>';
    if (listOnly) return list;
    const tot = K.totalUsers || 1, cnt = { Free: tot - (K.byPlan.Pro || 0) - (K.byPlan.Premium || 0), Pro: K.byPlan.Pro || 0, Premium: K.byPlan.Premium || 0 };
    return `${v22Kpis([['check', 'Active subscriptions', (+K.active).toLocaleString('en-IN'), `${K.past_due} past due`, 'pos'], ['rupee', 'MRR (monthly equivalent)', inr(K.mrr), 'Active plans only', 'pos'], ['warn', 'Past due', (+K.past_due).toLocaleString('en-IN'), 'Requires follow-up', 'warn'], ['refund', 'Cancelled this month', (+K.cancelled_month).toLocaleString('en-IN'), `${K.cancelled} cancelled in total`, '']])}
    <section class="v22-plan-admin">${(S.plans || []).map((p, i) => `<article class="v22-card"><div class="v22-pa-top">${cic(['sprout', 'rocket', 'crown'][i] || 'doc', 34)}<div><b>${esc(p.name)}</b><small>${esc(p.tagline)}</small></div><span class="v22-pill ${p.active ? 'ok' : 'neutral'}">${p.active ? 'Active' : 'Hidden'}</span></div><div class="v22-pa-price">${inr(p.prices.Monthly)}<span>/month</span></div><div class="v22-pa-stats"><div><small>${i ? 'Active subs' : 'Users'}</small><b>${(cnt[p.id] || 0).toLocaleString('en-IN')}</b></div><div><small>Entitlements</small><b>${p.features.length}</b></div><div><small>Share</small><b>${(((cnt[p.id] || 0) / tot) * 100).toFixed(1)}%</b></div></div><i class="v22-bar"><em style="width:${(((cnt[p.id] || 0) / tot) * 100).toFixed(1)}%"></em></i></article>`).join('')}</section>
    <section class="v22-card"><div class="v22-card-head"><h2>All subscriptions</h2><span class="v22-muted">${r.total.toLocaleString('en-IN')} records</span></div><div class="v22-filters"><label class="v22-search">${ic('search')}<input id="ma-sub-q" placeholder="Search subscription ID, user or email" value="${esc(SF.q)}"></label>${v22Sel('ma-sub-state', ['All states', 'Active', 'Past due', 'Cancelled', 'Expired'])}${v22Sel('ma-sub-plan', ['All plans', 'Pro', 'Premium'])}</div><div id="ma-sub-list">${list}</div><p class="v22-callout">${cic('shield', 20)} Status changes come only from signed payment webhooks; refunds are issued through the payment provider and audited.</p></section>`;
  }
  const reloadSubs = async () => { const el = document.getElementById('ma-sub-list'); if (el) { try { el.innerHTML = await subsHtml(true); } catch (e) { fail(e); } } };
  on('[data-ma-spage]', (b) => { if (b.disabled) return; SF.page = +b.dataset.maSpage; reloadSubs(); });
  on('[data-ma-pricing], [data-action="manage-plans"], [data-action="edit-plan"]', (b) => {
    const focus = b.dataset.maPricing || b.dataset.plan;
    showModal('Pricing configuration', `<div class="v22 v22-pricing-cfg"><p class="v22-sub">Changes apply immediately to the public pricing and new checkouts. Existing subscribers keep their price until renewal. Every change is versioned and audited.</p><div class="v22-pc-list">${(S.plans || []).map((p, i) => `<section class="v22-pc ${focus === p.id ? 'focus' : ''}" data-ma-pc="${p.id}"><header>${cic(['sprout', 'rocket', 'crown'][i] || 'doc', 30)}<b>${esc(p.name)} <small class="v22-muted">v${p.version}</small></b><label class="v22-pc-active">${v22Toggle(p.active, 'data-pc-active')}<span>Active</span></label></header><div class="v22-pc-grid">${['Monthly', 'Quarterly', 'Yearly'].map((c) => `<label class="v22-fl">${c} (₹)<input type="number" min="0" data-pc="${c}" value="${p.prices[c]}"></label>`).join('')}</div><label class="v22-fl">Tagline<input data-pc-tag value="${esc(p.tagline)}"></label><label class="v22-fl">Entitlements <small>one per line</small><textarea rows="${Math.max(3, p.features.length)}" data-pc-feat>${esc(p.features.join('\n'))}</textarea></label><label class="v22-fl">AI queries per day <small>-1 = unlimited</small><input type="number" data-pc-ai value="${p.limits?.ai_queries_per_day ?? 1}"></label></section>`).join('')}</div><div id="ma-pc-err" class="v22-err"></div><div class="v22-modal-actions"><button class="v22-outline-btn" data-modal-close>Cancel</button><button class="v22-grad-btn" data-ma-pc-save>Save pricing</button></div></div>`);
  });
  on('[data-ma-pc-save]', async (b) => {
    const done = busy(b, 'Saving…');
    try {
      for (const sec of document.querySelectorAll('[data-ma-pc]')) {
        const prices = Object.fromEntries([...sec.querySelectorAll('[data-pc]')].map((i) => [i.dataset.pc, Number(i.value)]));
        await API.put(`/admin/plans/${sec.dataset.maPc}`, { prices, tagline: sec.querySelector('[data-pc-tag]').value.trim(), features: sec.querySelector('[data-pc-feat]').value.split('\n').map((x) => x.trim()).filter(Boolean), active: sec.querySelector('[data-pc-active]').checked, limits: { ai_queries_per_day: Number(sec.querySelector('[data-pc-ai]').value) } });
      }
      await loadPublicData(); modalRoot.innerHTML = ''; notify('Pricing saved.'); route();
    } catch (e) { done(); document.getElementById('ma-pc-err').textContent = e.details?.[0]?.message || errMsg(e); }
  });

  // ---- SIP date configuration
  adminSipDate = function () { return `<div class="v22 v22-adm">${asyncPage('SIP dates', sipHtml)}</div>`; };
  let SIPDAY = null;
  async function sipHtml() {
    const [{ current: c }, { items }] = await Promise.all([API.get('/sip-dates/current'), API.get('/sip-dates')]);
    const nd = new Date(); nd.setUTCMonth(nd.getUTCMonth() + 1); const nextM = nd.toISOString().slice(0, 7), thisM = new Date().toISOString().slice(0, 7);
    SIPDAY = c?.recommended_day || 12; const alts = c ? [c.alt_day_1, c.alt_day_2, c.alt_day_3].filter(Boolean) : [];
    const cd = c ? v22D(`${c.month}-${String(c.recommended_day).padStart(2, '0')}`) : null;
    return `${v22Head('SIP Date Configuration', 'Validate, preview and publish the monthly platform-wide reminder date.', c ? `<span class="v22-pill ok lg">● Current: ${c.recommended_day} ${V22_MON[+c.month.slice(5) - 1]} ${c.month.slice(0, 4)}</span>` : '', 'ADMIN · SIP DATES')}
    <div class="v22-sip-cfg"><section class="v22-card"><h2 class="v22-h2">Configure monthly reminder</h2><p class="v22-sub">One common date across all mutual funds. Publishing schedules the reminder campaign 2 days before the date.</p>
      <div class="v22-steps" id="v22-steps">${['Draft', 'Validate', 'Preview', 'Publish'].map((s, i) => `<div class="${i === 0 ? 'done' : ''}"><i>${i + 1}</i><span>${s}</span></div>`).join('')}</div>
      <div class="v22-form-grid"><label class="v22-fl">Effective month<input type="month" id="ma-sip-month" value="${c && c.month >= thisM ? nextM : thisM}"></label><label class="v22-fl">Expected uplift vs fixed date (%)<input type="number" step="0.1" id="ma-sip-uplift" value="${c?.uplift_pct ?? ''}" placeholder="e.g. 2.8"></label></div>
      <div class="v22-fl">Reminder date <small class="v22-muted">· selected <b id="v22-day-label">${SIPDAY}</b></small><div class="v22-daygrid">${Array.from({ length: 28 }, (_, i) => i + 1).map((n) => `<button type="button" class="${n === SIPDAY ? 'active' : ''} ${alts.includes(n) ? 'alt' : ''}" data-ma-day="${n}">${n}</button>`).join('')}</div></div>
      <label class="v22-fl">Internal change reason<textarea id="sip-reason" rows="3" placeholder="Reason for this date (required, audited)"></textarea></label>
      <button type="button" class="v22-grad-btn wide" data-ma-sip-validate>Validate configuration ${ic('arrowR')}</button><div id="ma-sip-val" class="v22-valbox"></div></section>
    <aside class="v22-sip-side"><section class="v22-card v22-orb-card"><h2 class="v22-h2 sm">Current published date</h2>${c ? `<div class="v22-orb"><div><small>${esc(c.month)}</small><strong>${c.recommended_day}</strong><span>${['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'][cd.getUTCDay()]}</span></div></div><div class="v22-kv">${[['Status', v22Status(c.status)], ['Uplift', c.uplift_pct != null ? `+${c.uplift_pct}%` : '—'], ['Published on', fmt(c.published_on)], ['Version', esc(c.version || '—')]].map((x) => `<div><span>${x[0]}</span><b>${x[1]}</b></div>`).join('')}</div>` : '<p class="v22-sub">Nothing published yet.</p>'}</section></aside></div>
    <section class="v22-card"><div class="v22-card-head"><h2>Publishing history</h2></div><div class="table-scroll"><table class="v22-table v22-admin-table"><thead><tr><th>Month</th><th>Date</th><th>Uplift</th><th>Alternatives</th><th>Version</th><th>Published on</th><th>Status</th></tr></thead><tbody>${items.map((r) => `<tr><td><b>${esc(r.month)}</b></td><td>${r.recommended_day}</td><td class="pos">${r.uplift_pct != null ? '+' + r.uplift_pct + '%' : '—'}</td><td>${[r.alt_day_1, r.alt_day_2, r.alt_day_3].filter(Boolean).join(', ') || '—'}</td><td class="mono">${esc(r.version || '—')}</td><td>${fmt(r.published_on)}</td><td>${v22Status(r.status)}</td></tr>`).join('')}</tbody></table></div></section>`;
  }
  on('[data-ma-day]', (b) => { SIPDAY = +b.dataset.maDay; b.parentElement.querySelectorAll('button').forEach((x) => x.classList.toggle('active', x === b)); document.getElementById('v22-day-label').textContent = SIPDAY; });
  const sipBody = () => ({ month: document.getElementById('ma-sip-month').value, day: SIPDAY, reason: document.getElementById('sip-reason').value.trim(), upliftPct: document.getElementById('ma-sip-uplift').value ? +document.getElementById('ma-sip-uplift').value : undefined });
  on('[data-ma-sip-validate]', async () => {
    const out = document.getElementById('ma-sip-val');
    try {
      const v = await API.post('/admin/sip-dates/validate', sipBody());
      document.querySelectorAll('#v22-steps>div').forEach((x, i) => x.classList.toggle('done', i < (v.ok ? 3 : 2)));
      out.innerHTML = `${v.checks.map((c) => `<div>${c.level === 'ok' ? '✓' : c.level === 'warn' ? '⚠' : '✕'} ${esc(c.msg)}</div>`).join('')}<p style="margin-top:8px">${v.recipients.toLocaleString('en-IN')} active subscribers will be reminded.</p>${v.ok ? `<button class="v22-grad-btn" style="margin-top:10px" data-ma-sip-publish>Publish ${esc(v.date)}</button>` : ''}`;
    } catch (e) { out.innerHTML = `<b class="neg">${esc(e.details?.[0]?.message || errMsg(e))}</b>`; }
  });
  on('[data-ma-sip-publish]', async (b) => {
    if (!confirm('Publish this SIP date to all subscribers?')) return;
    const done = busy(b, 'Publishing…');
    try { const r = await API.post('/admin/sip-dates/publish', sipBody()); notify(`Published ${r.date} (${r.version}). Reminder scheduled for ${r.reminderOn}.`); await loadPublicData(); renderAdmin('sipdate'); }
    catch (e) { done(); fail(e); }
  });

  // ---- data management (server-side validation & publish)
  let LAST_UP = null;
  adminData = function () { return `<div class="v22 v22-adm">${asyncPage('data management', dataHtml)}</div>`; };
  async function dataHtml() {
    const [s, h] = await Promise.all([API.get('/admin/data/summary'), API.get('/admin/data/uploads')]);
    return `${v22Head('Data Management', 'Upload a workbook — it is validated on the server, then published to the live database.', `<a class="v22-outline-btn" href="${V22_TEMPLATE_URL}" download>${ic('download')} Blank template</a><button type="button" class="v22-outline-btn" data-ma-export>${ic('file')} Export active dataset</button><button type="button" class="v22-outline-btn" data-ma-recompute>${ic('refresh')} Recompute metrics</button>`, 'ADMIN · DATA')}
    ${v22Kpis([['bars', 'Funds', (+s.funds).toLocaleString('en-IN'), `${s.categories} categories`, ''], ['chart', 'NAV records', (+s.nav_rows).toLocaleString('en-IN'), `Last NAV ${fmt(s.last_nav)}`, 'pos'], ['users', 'Users', (+s.users).toLocaleString('en-IN'), `${(+s.subscriptions).toLocaleString('en-IN')} subscriptions`, ''], ['calendar', 'SIP months', s.sip_months, `${s.holidays} market holidays`, '']])}
    <section class="v22-card"><div class="v22-card-head"><div><h2>Upload workbook</h2><p>Sheets in the file replace the matching tables; sheets you leave out are kept.${API.env === 'prod' ? ' In production, Users and Subscriptions cannot be imported.' : ''}</p></div></div>
      <div class="v22-pipeline" id="v22-pipe">${[['upload', 'Upload'], ['shield', 'Validate (server)'], ['help', 'Review'], ['check', 'Publish']].map((x, i) => `<div data-step="${i}">${cic(x[0], 28)}<b>${x[1]}</b></div>`).join('<i></i>')}</div>
      <div class="v22-upload-grid"><label class="v22-drop big" for="ma-wb-file">${cic('upload', 52)}<b>Drop the .xlsx workbook here</b><small>Excel (.xlsx / .xls) or single-sheet .csv · max 50MB · or <u>click to browse</u></small><span class="v22-outline-btn">Choose File</span><em id="ma-wb-name">No file selected</em><input type="file" id="ma-wb-file" accept=".xlsx,.xls,.csv" hidden></label>
      <div class="v22-upload-fields"><label class="v22-fl">If uploading a CSV, it contains${v22Sel('ma-csv-as', ['Funds', 'NAV_History', 'SIP_Dates', 'Market_Holidays', 'Users', 'Subscriptions'])}</label><div class="v22-callout">${cic('doc', 20)} <span>Format: <code>docs/21_test_data_excel_format.md</code>. The daily NAV feed job imports new NAVs automatically.</span></div></div></div><div id="ma-report"></div></section>
    <section class="v22-card"><div class="v22-card-head"><h2>Upload history</h2></div>${h.items.length ? h.items.map((u) => `<div class="v22-batch">${cic('doc', 28)}<div><b>${esc(u.file_name)}</b><small>${new Date(u.created_at).toLocaleString('en-IN')} · ${esc((u.sheets || []).join(', ') || '—')} · ${u.errors} errors · ${esc(u.uploaded_by || '')}</small></div>${v22Status(u.status === 'validated' ? 'Pending' : u.status === 'published' ? 'Published' : u.status === 'failed' ? 'Blocked' : 'Archived')}</div>`).join('') : '<p class="v22-sub">No uploads yet.</p>'}</section>`;
  }
  const pipe = (n, failAt) => document.querySelectorAll('#v22-pipe>div').forEach((x) => { const s = +x.dataset.step; x.classList.toggle('done', s < n); x.classList.toggle('fail', failAt != null && s === failAt); });
  async function uploadFile(file) {
    const out = document.getElementById('ma-report'); if (!out || !file) return;
    document.getElementById('ma-wb-name').textContent = `${file.name} · ${(file.size / 1024).toFixed(0)} KB`; pipe(1); out.innerHTML = '<div class="v22-loading inline"><span class="v22-spin"></span><b>Uploading and validating on the server…</b></div>';
    const fd = new FormData(); fd.append('csvAs', document.getElementById('ma-csv-as').value); fd.append('file', file);
    try {
      const r = await API.post('/admin/data/uploads', fd); LAST_UP = r.id; const rep = r.report;
      pipe(rep.ok ? 3 : 1, rep.ok ? null : 1);
      out.innerHTML = rep.fatal && !rep.sheets.length ? `<div class="v22-rep-fatal">${cic('warn', 24)} ${esc(rep.fatal)}</div>` : `<div class="v22-report ${rep.ok ? 'ok' : 'bad'}"><div class="v22-rep-head">${cic(rep.ok ? 'check' : 'warn', 30)}<div><b>${rep.ok ? 'Validation passed' : 'Validation failed'} — ${esc(r.fileName)}</b><small>${rep.sheets.length} sheet(s) · ${rep.errors} error(s) · ${rep.warnings} warning(s)${rep.ignored.length ? ` · ignored: ${esc(rep.ignored.join(', '))}` : ''}</small></div><div class="v22-rep-actions"><button type="button" class="v22-outline-btn sm" data-ma-discard>Discard</button><button type="button" class="v22-grad-btn" data-ma-publish ${rep.ok ? '' : 'disabled'}>${ic('check')} Publish dataset</button></div></div>${rep.fatal ? `<div class="v22-rep-fatal">${esc(rep.fatal)}</div>` : ''}<div class="v22-rep-sheets">${rep.sheets.map((s) => `<details class="v22-rep-sheet" ${s.errors.length ? 'open' : ''}><summary>${cic(s.errors.length ? 'warn' : 'check', 22)}<b>${s.name}</b><span>${s.total.toLocaleString('en-IN')} rows · ${s.valid.toLocaleString('en-IN')} valid</span>${s.errors.length ? `<span class="v22-pill bad">${s.errors.length} errors</span>` : ''}${s.warnings.length ? `<span class="v22-pill warn">${s.warnings.length} warnings</span>` : ''}${!s.errors.length && !s.warnings.length ? '<span class="v22-pill ok">OK</span>' : ''}</summary>${[...s.errors.map((e) => ['bad', e]), ...s.warnings.map((e) => ['warn', e])].slice(0, 30).map(([k, e]) => `<div class="v22-issue ${k}"><span class="mono">Row ${e.row}</span>${e.col ? `<code>${e.col}</code>` : ''}<span>${esc(e.msg)}</span></div>`).join('')}</details>`).join('')}</div></div>`;
    } catch (e) { pipe(1, 1); out.innerHTML = `<div class="v22-rep-fatal">${cic('warn', 24)} ${esc(errMsg(e))}</div>`; }
  }
  window.addEventListener('change', (e) => { if (e.target.id === 'ma-wb-file' && e.target.files[0]) uploadFile(e.target.files[0]); }, true);
  window.addEventListener('dragover', (e) => { if (e.target.closest?.('label[for="ma-wb-file"]')) e.preventDefault(); }, true);
  window.addEventListener('drop', (e) => { const d = e.target.closest?.('label[for="ma-wb-file"]'); if (!d) return; e.preventDefault(); e.stopImmediatePropagation(); if (e.dataTransfer.files[0]) uploadFile(e.dataTransfer.files[0]); }, true);
  on('[data-ma-publish]', async (b) => { if (!LAST_UP || !confirm('Publish this dataset to the live database?')) return; const done = busy(b, 'Publishing…'); try { const r = await API.post(`/admin/data/uploads/${LAST_UP}/publish`); pipe(4); notify(`Published: ${Object.entries(r.counts).map(([k, v]) => `${k} ${v}`).join(', ')}`); S.navCache = {}; await loadPublicData(); renderAdmin('data'); } catch (e) { done(); fail(e); } });
  on('[data-ma-discard]', async () => { if (LAST_UP) await API.post(`/admin/data/uploads/${LAST_UP}/discard`).catch(() => {}); LAST_UP = null; renderAdmin('data'); });
  on('[data-ma-export]', async () => { try { await API.download('/admin/data/export.xlsx', null, 'mod-alpha-active-dataset.xlsx'); } catch (e) { fail(e); } });
  on('[data-ma-recompute]', async (b) => { const d = busy(b); try { const r = await API.post('/admin/data/recompute-metrics'); d(); notify(`Metrics recomputed for ${r.funds} funds.`); await loadPublicData(); } catch (e) { d(); fail(e); } });

  // ---- notifications & campaigns
  adminNotifications = function () { return `<div class="v22 v22-adm">${asyncPage('notifications', notifHtml)}</div>`; };
  let TPLS = [];
  async function notifHtml() {
    const [t, c, o] = await Promise.all([API.get('/admin/notification-templates'), API.get('/admin/campaigns'), API.get('/admin/mock-outbox', { limit: 10 })]); TPLS = t.items; const K = c.kpis;
    return `${v22Head('Notifications', 'Templates, consent-aware campaigns and delivery status.', `<button type="button" class="v22-grad-btn" data-ma-campaign>${ic('spark')} Send announcement</button>`, 'ADMIN · MESSAGING')}
    ${v22Kpis([['users', 'Active-subscriber audience', (+K.scheduledRecipients).toLocaleString('en-IN'), K.next ? `Next: ${esc(K.next.name)}` : 'No campaign scheduled', ''], ['check', 'Delivery success (30d)', K.successRate != null ? K.successRate + '%' : '—', `${K.sent} sent`, 'pos'], ['refund', 'Failed (30d)', (+K.failed).toLocaleString('en-IN'), 'See delivery log', 'warn'], ['bell', 'Marketing opt-in', (K.optInPct ?? 0) + '%', 'Consent-aware sends', '']])}
    <section class="v22-card"><div class="v22-card-head"><h2>Templates</h2><span class="v22-muted">${TPLS.length} templates</span></div>${MA_TPL.grid(TPLS.map((x) => ({ ...x, desc: x.subject, updated: x.updated_at ? new Date(x.updated_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '' })), 'data-ma-tpl')}</section>
    <div class="v22-notif-two"><section class="v22-card"><div class="v22-card-head"><h2>Campaigns</h2></div>${c.items.length ? c.items.map((x) => { const st = x.stats || {}; const tot = (st.delivered || 0) + (st.failed || 0); return `<div class="v22-camp"><div><b>${esc(x.name)}</b><small>${esc(x.channels.join(' + '))} · ${esc(x.audience.replace(/_/g, ' '))} · ${new Date(x.scheduled_for).toLocaleString('en-IN')}</small></div><div class="v22-camp-bar"><i class="v22-bar"><em style="width:${tot ? (100 * (st.delivered || 0)) / tot : 0}%"></em></i><small>${st.delivered ?? 0} delivered · ${st.failed ?? 0} failed · ${st.skipped ?? 0} skipped (no consent/contact)</small></div>${x.status === 'Scheduled' ? `<button class="v22-row-btn" data-ma-camp-cancel="${x.id}">Cancel</button>` : v22Status(x.status)}</div>`; }).join('') : '<p class="v22-sub">No campaigns yet.</p>'}</section>
    <section class="v22-card"><div class="v22-card-head"><h2>Mock outbox</h2><span class="v22-pill warn">Stage — not sent</span></div><p class="v22-sub" style="margin-bottom:10px">Messages the mock email/SMS/push providers would have sent. Replaced by real delivery once the providers are integrated.</p>${o.items.length ? o.items.map((m) => `<div class="v22-batch">${cic({ email: 'mail', sms: 'sms', push: 'phone', whatsapp: 'chat', support: 'help' }[m.channel] || 'doc', 26)}<div><b>${esc(m.subject || m.channel.toUpperCase())}</b><small>${esc(m.recipient)} · ${esc(m.body.slice(0, 90))}${m.body.length > 90 ? '…' : ''}</small></div><span class="v22-pill neutral">${esc(m.channel)}</span></div>`).join('') : '<p class="v22-sub">Empty.</p>'}</section></div>`;
  }
  on('[data-ma-tpl]', (b) => {
    const t = TPLS.find((x) => x.key === b.dataset.maTpl); if (!t) return;
    MA_TPL.edit(t, async (d) => { await API.put(`/admin/notification-templates/${t.key}`, { name: d.name, channels: d.channels, subject: d.subject, body: d.body, smsText: d.sms_text || undefined, status: d.status }); notify('Template saved.'); renderAdmin('notifications'); });
  });
  on('[data-ma-tpl-prev]', async (b) => { try { const p = await API.post(`/admin/notification-templates/${b.dataset.maTplPrev}/preview`); document.getElementById('ma-tpl-prev').innerHTML = `<div class="v22-mailprev" style="margin-top:12px"><h3>${esc(p.email.subject)}</h3><p style="white-space:pre-line">${esc(p.email.body)}</p><small>SMS: ${esc(p.sms)}</small></div>`; } catch (e) { fail(e); } });
  on('[data-ma-campaign], [data-action="new-campaign"]', () => { showModal('Send announcement', `<div class="v22"><p class="v22-hint" style="margin:0 0 14px">One-off message to a group of users (e.g. a new feature or a service notice). Monthly SIP reminders are sent automatically when a SIP date is published — you don't need this for them.</p><form id="ma-camp-f" style="display:grid;gap:12px"><label class="v22-fl">Name<input name="name" required value="SIP reminder"></label><label class="v22-fl">Template${v22Sel('ma-camp-tpl', TPLS.filter((t) => t.status === 'Active').map((t) => t.key))}</label><div class="v22-fl">Channels<div class="v22-seg-pills wrap">${['inapp', 'email', 'sms', 'push'].map((c) => `<label style="display:flex;gap:6px;align-items:center;padding:6px 10px"><input type="checkbox" name="ch" value="${c}" ${c === 'inapp' || c === 'email' ? 'checked' : ''}> ${c}</label>`).join('')}</div></div><label class="v22-fl">Audience${v22Sel('ma-camp-aud', ['active_subscribers', 'all_users', 'marketing_opt_in'])}</label><label class="v22-fl">Send at <small>leave empty to send now</small><input type="datetime-local" name="at"></label><div class="v22-err" id="ma-camp-err"></div><button class="v22-grad-btn">Schedule campaign</button></form><p class="v22-hint">Users who switched a channel off in their notification settings are skipped.</p></div>`); document.getElementById('ma-camp-f').onsubmit = async (e) => { e.preventDefault(); const f = new FormData(e.target), at = f.get('at'); try { const r = await API.post('/admin/campaigns', { name: f.get('name'), templateKey: document.getElementById('ma-camp-tpl').value, channels: f.getAll('ch'), audience: document.getElementById('ma-camp-aud').value, scheduledFor: at ? new Date(at).toISOString() : undefined, sendNow: !at }); modalRoot.innerHTML = ''; notify(r.sending ? 'Sending now — delivery stats appear here in a minute.' : 'Campaign scheduled.'); renderAdmin('notifications'); } catch (ex) { document.getElementById('ma-camp-err').textContent = errMsg(ex); } }; });
  on('[data-ma-camp-cancel]', async (b) => { try { await API.post(`/admin/campaigns/${b.dataset.maCampCancel}/cancel`); renderAdmin('notifications'); } catch (e) { fail(e); } });
  on('[data-action="v22-preview-notif"]', () => go('admin/notifications'));

  // ---- AI models & release gates
  const GATE_LABEL = { data_quality: 'Historical data quality and provenance verified', bias_tests: 'Look-ahead and survivorship bias tests passed', walk_forward: 'Out-of-sample / walk-forward evaluation completed', holiday_rules: 'Holiday and missing-NAV rules validated', compliance_review: 'Legal and compliance review approved', admin_approval: 'Admin approval and audit event recorded' };
  adminMethodology = function () { return `<div class="v22 v22-adm">${asyncPage('model releases', modelHtml)}</div>`; };
  async function modelHtml() {
    const [{ items }, ints] = await Promise.all([API.get('/admin/models'), API.get('/admin/integrations')]); const m = items[0]; const ai = ints.providers.find((p) => p.key === 'ai');
    if (!m) return '<p class="v22-sub">No model releases.</p>';
    const done = Object.values(m.gates).filter(Boolean).length, tot = Object.keys(m.gates).length;
    return `${v22Head('AI Models &amp; Insights', 'Version governance, release gates and model service configuration.', '<span class="v22-pill warn lg">Internal only</span>', 'ADMIN · METHODOLOGY')}
    <div class="v22-lockbox">${cic('lock', 40)}<div><b>Proprietary methodology is internal information</b><p>Model parameters, feature weights and thresholds are restricted to authorised administrators.</p></div></div>
    <div class="v22-method-two"><section class="v22-card"><div class="v22-card-head"><h2>Methodology release</h2>${v22Status(m.status === 'Approved' ? 'Published' : 'Pending')}</div><div class="v22-release">${cic('brain', 44)}<div><b>${esc(m.version)}</b><small>${esc(m.status)}${m.approved_at ? ` · approved ${fmt(m.approved_at)}` : ''}</small></div></div><button class="v22-grad-btn" data-ma-approve="${esc(m.version)}" ${done < tot || m.status === 'Approved' ? 'disabled' : ''}>Approve release</button><p class="v22-hint">Super admin only; all gates must pass.</p></section>
    <section class="v22-card"><div class="v22-card-head"><h2>Model service</h2></div><div class="v22-kv icons"><div>${cic('plug', 24)}<span>AI provider</span><b class="t-${ai.mode === 'mock' ? 'warn' : 'ok'}">${ai.mode === 'mock' ? 'Mock (rule-based) — integrated later' : esc(ai.active)}</b></div><div>${cic('db', 24)}<span>Grounding</span><b class="t-ok">Top funds + current SIP date from DB</b></div><div>${cic('rupee', 24)}<span>Quota</span><b>Per plan (Free: 1/day)</b></div></div></section></div>
    <section class="v22-card"><div class="v22-card-head"><div><h2>Release gates</h2><p>${done} of ${tot} gates passed</p></div><div class="v22-gate-meter"><i class="v22-bar big"><em style="width:${(100 * done) / tot}%"></em></i></div></div><div class="v22-gates">${Object.entries(m.gates).map(([k, v]) => `<label class="v22-gate"><input type="checkbox" data-ma-gate="${k}" data-version="${esc(m.version)}" ${v ? 'checked' : ''}><span class="v22-gate-box">${ic('check')}</span><b>${GATE_LABEL[k] || k}</b></label>`).join('')}</div></section>`;
  }
  window.addEventListener('change', async (e) => { const g = e.target.closest?.('[data-ma-gate]'); if (!g) return; e.stopImmediatePropagation(); try { await API.put(`/admin/models/${encodeURIComponent(g.dataset.version)}/gates`, { gates: { [g.dataset.maGate]: g.checked } }); renderAdmin('methodology'); } catch (er) { g.checked = !g.checked; fail(er); } }, true);
  on('[data-ma-approve]', async (b) => { try { await API.post(`/admin/models/${encodeURIComponent(b.dataset.maApprove)}/approve`); notify('Release approved.'); renderAdmin('methodology'); } catch (e) { fail(e); } });

  // ---- audit log
  const AF = { q: '', category: '' };
  adminAudit = function () { return `<div class="v22 v22-adm">${v22Head('Audit Logs', 'Append-only record of administrative actions and sensitive events.', `<button type="button" class="v22-outline-btn" data-ma-audit-csv>${ic('download')} Export logs</button>`, 'ADMIN · SECURITY')}<section class="v22-card"><div class="v22-filters"><label class="v22-search">${ic('search')}<input id="ma-audit-q" placeholder="Search action, actor or resource" value="${esc(AF.q)}"></label>${v22Sel('ma-audit-cat', ['All event types', 'Configuration', 'Data', 'Access', 'Subscription', 'Notification', 'Account'])}</div><div id="ma-audit">${asyncPage('audit log', auditHtml)}</div></section></div>`; };
  const AICON = { Configuration: 'gear', Data: 'db', Access: 'shield', Subscription: 'crown', Notification: 'bell', Account: 'user' };
  async function auditHtml() { const r = await API.get('/admin/audit', { q: AF.q, category: AF.category, pageSize: 100 }); return `${v22Kpis([['doc', 'Events (30 days)', r.stats.total.toLocaleString('en-IN'), 'Matching filters', ''], ['check', 'Successful', r.stats.ok.toLocaleString('en-IN'), '', 'pos'], ['shield', 'Blocked / failed', r.stats.blocked.toLocaleString('en-IN'), '', 'warn'], ['users', 'Admins', r.stats.admins, `${r.stats.superAdmins} super admin`, '']])}<div class="v22-timeline">${r.items.map((x) => `<div class="v22-tl">${cic({ gear: 'sliders', db: 'db', shield: 'shield', crown: 'crown', bell: 'bell', user: 'user' }[AICON[x.category]] || 'doc', 30)}<div class="v22-tl-main"><b class="mono">${esc(x.action)}</b><small><span class="v22-actor">${esc(x.actor)}</span> · ${esc(x.resource || '—')} · ${esc(x.category)}</small></div><time>${new Date(x.at).toLocaleString('en-IN')}</time>${v22Status(x.outcome === 'Success' ? 'Success' : 'Blocked')}</div>`).join('') || '<div class="v22-empty">No events.</div>'}</div>`; }
  const reloadAudit = async () => { const el = document.getElementById('ma-audit'); if (el) { try { el.innerHTML = await auditHtml(); } catch (e) { fail(e); } } };
  on('[data-ma-audit-csv], [data-action="export-audit"]', async () => { try { await API.download('/admin/audit', { q: AF.q, category: AF.category, format: 'csv' }, 'mod-alpha-audit-log.csv'); } catch (e) { fail(e); } });

  // ---- system settings: live provider status ("integrated later") + backlog
  const baseSettingsAdmin = adminSettings;
  adminSettings = function () { return `<div class="v22 v22-adm">${asyncPage('system settings', sysHtml)}</div>`; };
  async function sysHtml() {
    const [st, ints] = await Promise.all([API.get('/admin/settings'), API.get('/admin/integrations')]);
    const s = st.settings, mocks = ints.providers.filter((p) => p.mode === 'mock'), live = ints.providers.filter((p) => p.mode === 'live');
    let base = baseSettingsAdmin(); // static backlog section (v22-integrations.js)
    const backlog = base.slice(base.indexOf('<section class="v22-card" id="integrations">'));
    return `${v22Head('System Settings', 'Environment, access controls and the status of every external integration.', `<span class="v22-pill ${st.environment === 'prod' ? 'ok' : 'warn'} lg">Environment: ${esc(st.environment)}</span>`, 'ADMIN · SYSTEM')}
    <div class="v22-sys-two"><section class="v22-card"><div class="v22-card-head"><h2>Platform configuration</h2><button type="button" class="v22-row-btn" data-ma-settings-edit>${ic('sliders')} Edit</button></div><div class="v22-kv icons">${[['globe', 'Platform name', s.platformName], ['clock', 'Default timezone', s.timezone], ['rupee', 'Default currency', s.currency], ['calendar', 'SIP date model', s.sipDateModel], ['bell', 'Reminder lead time', `${s.reminderLeadDays} days before`], ['mail', 'Support email', s.supportEmail]].map((x) => `<div>${cic(x[0], 24)}<span>${x[1]}</span><b>${esc(String(x[2]))}</b></div>`).join('')}</div></section>
    <section class="v22-card"><div class="v22-card-head"><h2>Access &amp; security</h2></div><div class="v22-kv icons">${[['users', 'Role-based access', st.security.rbac, 'ok'], ['clock', 'Sessions', st.security.sessions, 'ok'], ['doc', 'Audit trail', st.security.auditTrail, 'ok'], ['key', 'Admin MFA', st.security.adminMfa, 'warn']].map((x) => `<div>${cic(x[0], 24)}<span>${x[1]}</span><b class="t-${x[3]}">${esc(x[2])}</b></div>`).join('')}</div></section></div>
    <section class="v22-card" id="ma-mocks"><div class="v22-card-head"><div><h2>External providers</h2><p>${live.length} live · ${mocks.length} running on mocks — <b>mocks will be replaced by the real providers later</b> (see <code>docs/23_mocks_and_replacements.md</code>).</p></div></div>
      <div class="v22-ints">${ints.providers.map((p) => `<article title="${esc(p.mockBehaviour)}">${cic({ payments: 'rupee', kyc: 'idcard', email: 'mail', sms: 'sms', push: 'phone', whatsapp: 'chat', ai: 'brain', nav: 'chart', google: 'key', support: 'help' }[p.key] || 'plug', 36)}<div><b>${esc(p.label)}</b><small>${p.mode === 'mock' ? `Mock now → <b>${esc(p.replacement)}</b>` : `Live: ${esc(p.active)}`}</small><small class="v22-muted">Env: ${esc(p.env)}=${esc(p.real)} + ${esc(p.vars.join(', '))}</small></div>${p.mode === 'mock' ? '<span class="v22-pill warn">Integrated later</span>' : '<span class="v22-pill ok">Live</span>'}</article>`).join('')}</div>
      <h3 class="v22-set-h" style="margin:20px 0 10px!important;font-size:15px">Not built yet — planned</h3><div class="v22-ints">${ints.notYetBuilt.map((p) => `<article>${cic('plug', 30)}<div><b>${esc(p.label)}</b><small>${esc(p.replacement)}</small></div><span class="v22-pill neutral">${esc(p.backlog)}</span></article>`).join('')}</div></section>
    ${backlog}`;
  }
  on('[data-ma-settings-edit], [data-action="settings-edit"]', async () => {
    const { settings: s } = await API.get('/admin/settings');
    showModal('Platform configuration', `<div class="v22"><form id="ma-set-f" style="display:grid;gap:12px"><label class="v22-fl">Platform name<input name="platformName" value="${esc(s.platformName)}"></label><label class="v22-fl">Reminder lead time (days before SIP date)<input type="number" min="0" max="7" name="reminderLeadDays" value="${s.reminderLeadDays}"></label><label class="v22-fl">Support email<input type="email" name="supportEmail" value="${esc(s.supportEmail)}"></label><div class="v22-err" id="ma-set-err"></div><button class="v22-grad-btn">Save</button><p class="v22-hint">Super admin only. Changes are audited.</p></form></div>`);
    document.getElementById('ma-set-f').onsubmit = async (e) => { e.preventDefault(); const f = new FormData(e.target); try { await API.put('/admin/settings', { platformName: f.get('platformName'), reminderLeadDays: +f.get('reminderLeadDays'), supportEmail: f.get('supportEmail') }); modalRoot.innerHTML = ''; notify('Settings saved.'); renderAdmin('settings'); } catch (ex) { document.getElementById('ma-set-err').textContent = errMsg(ex); } };
  });

  // admin profile card → real data
  window.v22AdminProfile = () => showModal('Admin profile', `<div class="v22"><div class="v22-prof"><span class="v22-prof-av">${esc((S.user?.name || 'A')[0])}</span><div class="v22-prof-main"><b>${esc(S.user?.name || '')}</b><span>${esc(S.user?.email || '')}</span><div class="v22-prof-tags"><span class="v22-pill info">${esc(S.user?.role || '')}</span></div></div></div><div class="v22-modal-actions"><button class="v22-outline-btn" data-action="change-password">Change password</button><button class="v22-danger-btn" data-action="logout">${ic('logout')} Sign out</button></div></div>`);
  v22AdminProfile = window.v22AdminProfile;

  // charts wait for NAV instead of crashing / showing synthetic data
  const baseDash = v22DashChart;
  v22DashChart = function (p) { const top = D.funds.filter((f) => f.returns[5] != null).slice(0, 3); return top.some((f) => !S.navCache[f.id]) ? '<div class="v22-loading inline"><span class="v22-spin"></span><b>Loading NAV…</b></div>' : baseDash(p); };
  const baseDetail = v22DetailChart;
  v22DetailChart = function (f, p) { return S.navCache[f.id] ? baseDetail(f, p) : '<div class="v22-loading inline"><span class="v22-spin"></span><b>Loading NAV…</b></div>'; };
  // ------------------------------------------------------------------ boot
  const baseShell = shell;
  shell = function (role, active, content) { baseShell(role, active, content); paintBell(); if (role === 'user') hydrateSettings(); const pm = document.querySelector('[data-v22-profile] span:last-child'); if (pm && S.user) pm.textContent = role === 'admin' ? S.user.name : S.user.name; };
  (async () => {
    app.innerHTML = '<div style="display:grid;place-items:center;height:100vh"><span class="v22-spin"></span></div>';
    try { await Promise.all([loadPublicData(), loadSession()]); } catch (e) { console.error(e); notify('Could not reach the Mod Alpha API. Some data may be unavailable.'); }
    S.ready = true; route();
  })();
})();
