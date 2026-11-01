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
    if (S.user) h = h.replace('<span class="v22-pill neutral">Free plan</span>', `<span class="v22-pill neutral">${esc(S.ent?.plan || 'Free')} plan</span>`).replace('<span class="v22-pill info">Guest demo profile</span>', `<span class="v22-pill ${S.user.kycStatus === 'Verified' ? 'ok' : 'warn'}">KYC: ${esc(S.user.kycStatus)}</span>${S.user.email && !S.user.emailVerified ? '<button class="v22-pill warn" data-ma-verify-email>Verify email</button>' : ''}`);
    h = h.replace(/Changes are stored for this demo session only\.|Preferences apply to this browser session\.|Delivery is not connected in this prototype\./g, 'Saved to your account.');
    return h;
  };
  // Fill the settings forms with the saved profile, preferences and consents.
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
      if (settingsTab === 'privacy') { const t = document.querySelectorAll('.v22-set-card .v22-trow input[type=checkbox]'); if (t[0]) t[0].checked = !!consents.analytics; if (t[1]) t[1].checked = !!consents.marketing; const fd = document.querySelector('#ma-feed-row input[type=checkbox]'); if (fd) fd.checked = !!p.showInActivityFeed; }
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
    if (e.target.closest('#ma-feed-row')) { try { await API.put('/me/preferences', { showInActivityFeed: e.target.checked }); notify(e.target.checked ? 'You will appear as “first name + initial” on the home page.' : 'You will appear as “A new member”.'); } catch (er) { e.target.checked = !e.target.checked; fail(er); } return; }
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

  // used by other live files
  Object.assign(MA_LIVE, { hydrateSettings });
})();
