/* ==========================================================================
   Live mode — settings
   Saves profile, notification channels, consents, password, data export / deletion
   requests through the API.
   ========================================================================== */
(function () {
  if (!window.MA_LIVE) return; // demo mode (no API): nothing to do
  const { API, S, busy, errMsg, fail, on } = MA_LIVE;
  // ------------------------------------------------------------------ settings (profile, preferences, notifications, privacy)
  const baseSettings = settingsPage;
  settingsPage = function () {
    let h = baseSettings();
    if (S.user) h = h.replace('<span class="v22-pill neutral">Free plan</span>', `<span class="v22-pill neutral">${esc(S.ent?.plan || 'Free')} plan</span><span id="ma-prof-kyc" class="v22-pill ${S.user.kycStatus === 'Verified' ? 'ok' : 'warn'}">KYC: ${esc(S.user.kycStatus)}</span>${S.user.email && !S.user.emailVerified ? '<button class="v22-pill warn" data-ma-verify-email>Verify email</button>' : ''}`);
    if (S.user) {
      // the email box shows only a real email address (mobile sign-ups may have none yet)
      h = h.replace(/(<input id="profile-email" type="email" value=")[^"]*(")/, `$1${esc(S.user.email || '')}$2 placeholder="No email added"`);
      // profile completeness from the account itself
      const steps = [[!!S.user.name && S.user.name !== 'Investor', 'Add your full name.'], [!!S.user.email, 'Add an email address.'], [!!S.user.emailVerified || !S.user.email, 'Verify your email address.'], [!!S.user.mobile, 'Add a mobile number to receive SMS reminders.'], [S.user.kycStatus === 'Verified', 'Complete your KYC (needed for paid plans).']];
      const pct = Math.round(steps.filter((x) => x[0]).length / steps.length * 100), next = steps.find((x) => !x[0]);
      h = h.replace(/<div class="v22-meter">[\s\S]*?<\/small><\/div>/, `<div class="v22-meter"><div><b>Profile completeness</b><span>${pct}%</span></div><i><em style="width:${pct}%"></em></i><small>${next ? next[1] : 'Your profile is complete.'}</small></div>`);
    }
    return h;
  };
  // Fill the settings forms with the saved profile, billing details, preferences and consents.
  async function hydrateSettings() {
    if (!/#\/user\/settings/.test(location.hash) || !S.user) return;
    const mob = document.getElementById('profile-mobile'); if (mob && S.user.mobile) mob.value = S.user.mobile;
    const bl = S.user.billing || {}, st = document.getElementById('bill-state'), gs = document.getElementById('bill-gstin'), ad = document.getElementById('bill-address');
    if (st) st.value = bl.stateCode || ''; if (gs) gs.value = bl.gstin || ''; if (ad) ad.value = bl.address || '';
    try {
      const { preferences: p, consents } = await API.get('/me/preferences');
      const ch = document.querySelectorAll('.v22-chan'); ['email', 'sms', 'push'].forEach((k, i) => { const t = ch[i]?.querySelector('input'); if (t) { t.checked = !!p.channels[k]; ch[i].classList.toggle('on', t.checked); } });
      document.querySelectorAll('[data-topic]').forEach((r) => { const t = r.querySelector('input[type=checkbox]'); if (t) t.checked = !!p.topics[r.dataset.topic]; });
      document.querySelectorAll('[data-consent]').forEach((r) => { const t = r.querySelector('input[type=checkbox]'); if (t) t.checked = !!consents[r.dataset.consent]; });
      const fd = document.querySelector('#ma-feed-row input[type=checkbox]'); if (fd) fd.checked = !!p.showInActivityFeed;
    } catch (e) {}
  }
  on('[data-action="save-profile-settings"]', async (b) => {
    const done = busy(b, 'Saving…');
    try {
      const v = (id) => document.getElementById(id)?.value?.trim();
      const r = await API.patch('/me', { name: v('profile-name') || undefined, mobile: v('profile-mobile') || undefined, billingStateCode: v('bill-state') || null, billingGstin: (v('bill-gstin') || '').toUpperCase() || null, billingAddress: v('bill-address') || null });
      S.user = r.user; currentUser.name = r.user.name; done(); notify('Profile saved.'); renderUser('settings');
    } catch (e) { done(); fail(e); }
  });
  on('[data-action="save-settings"]', async (b) => {
    const done = busy(b, 'Saving…');
    try {
      const ch = document.querySelectorAll('.v22-chan input');
      const topics = Object.fromEntries([...document.querySelectorAll('[data-topic]')].map((r) => [r.dataset.topic, !!r.querySelector('input[type=checkbox]')?.checked]));
      await API.put('/me/preferences', { channels: { email: ch[0]?.checked, sms: ch[1]?.checked, push: ch[2]?.checked }, topics });
      done(); notify('Preferences saved.');
    } catch (e) { done(); fail(e); }
  });
  window.addEventListener('change', async (e) => {
    if (!/#\/user\/settings/.test(location.hash) || !e.target.closest('#ma-privacy')) return;
    if (e.target.closest('#ma-feed-row')) { try { await API.put('/me/preferences', { showInActivityFeed: e.target.checked }); notify(e.target.checked ? 'You will appear as “first name + initial” on the home page.' : 'You will appear as “A new member”.'); } catch (er) { e.target.checked = !e.target.checked; fail(er); } return; }
    const row = e.target.closest('[data-consent]'); if (!row) return;
    try { await API.put('/me/consents', { [row.dataset.consent]: e.target.checked }); notify('Consent updated.'); } catch (er) { e.target.checked = !e.target.checked; fail(er); }
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

  // used by other live files
  Object.assign(MA_LIVE, { hydrateSettings });
})();
