/* Mod Alpha — "Set Reminder" on the dashboard SIP calendar.
   • Not subscribed (Free / no active plan) → go to the Subscription page.
   • Subscribed and a different day is picked → ask: "Do you want your customised SIP notification instead of
     the Mod Alpha notification?" → saves { mode:'custom', day } (PUT /me/preferences, sipReminder).
   • Subscribed, custom reminder active, Mod Alpha's date picked → ask to switch back → { mode:'modalpha' }.
   • Subscribed, already on Mod Alpha's date → confirms the reminder.
   API mode uses /me/entitlements + /me/preferences. Demo mode keeps the plan and the choice in this browser
   (localStorage) and lets you activate a demo plan from the Subscription page to try the subscriber flow. */
(function () {
  const API = window.MA_API;
  const live = !!(API && API.enabled);
  const LS_PLAN = 'mod-alpha-demo-plan', LS_REM = 'mod-alpha-demo-reminder';
  // Translate (Hindi) when available.
  const T = (s) => (window.MA_T ? window.MA_T(s) : s);
  const ls = { get: (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (e) {} } };
  let prefs = null;   // live mode cache of preferences.sipReminder

  /* ---------- demo plan (so the subscriber flow can be tried without the API) ---------- */
  function demoPlan() { return ls.get(LS_PLAN); }
  // Demo: reflect the saved demo plan in the shared plan state.
  function applyDemoState() {
    if (live) return;
    const p = demoPlan();
    window.MA_STATE = window.MA_STATE || {};
    window.MA_STATE.ent = p ? { plan: p, subscription: { status: 'Active', demo: true } } : { plan: 'Free', subscription: null };
  }
  applyDemoState();

  // Is the user on a paid plan?
  function subscribed() {
    const e = window.MA_STATE && window.MA_STATE.ent;
    return !!(e && e.plan && e.plan !== 'Free' && e.subscription && e.subscription.status === 'Active');
  }
  // Current reminder choice.
  function get() {
    if (live) return prefs || { mode: 'modalpha', day: null };
    try { return JSON.parse(ls.get(LS_REM)) || { mode: 'modalpha', day: null }; } catch (e) { return { mode: 'modalpha', day: null }; }
  }
  // Save the reminder choice (API or this browser).
  async function save(rem) {
    if (live) {
      const r = await API.put('/me/preferences', { sipReminder: rem.mode === 'custom' ? { mode: 'custom', day: rem.day } : { mode: 'modalpha' } });
      prefs = r.preferences.sipReminder;
    } else ls.set(LS_REM, JSON.stringify(rem.mode === 'custom' ? rem : { mode: 'modalpha', day: null }));
  }
  // Live: load the saved reminder choice.
  async function loadPrefs() {
    if (!live) return;
    try { const r = await API.get('/me/preferences', null, { onUnauthorized: false }); prefs = r.preferences.sipReminder || null; } catch (e) {}
  }

  // Month, recommended day and the picked day from the calendar.
  function context() {
    const SP = typeof v22SipFor === 'function' ? v22SipFor(v22CalMonth.y, v22CalMonth.m) : null;
    const MN = typeof V22_MON !== 'undefined' ? V22_MON[v22CalMonth.m] : '';
    return { SP, MN, y: v22CalMonth.y };
  }

  // Confirmation dialog with two buttons.
  function dialog(title, bodyHtml, yesLabel, noLabel, onYes) {
    showModal(T(title), `<div class="ma-rem-dlg">${bodyHtml}<div class="ma-rem-actions"><button type="button" class="v22-ghost-btn" data-rem-no>${T(noLabel)}</button><button type="button" class="v22-grad-btn" data-rem-yes>${T(yesLabel)}</button></div></div>`);
    const root = document.getElementById('modal-root');
    root.querySelector('[data-rem-no]').onclick = () => (root.innerHTML = '');
    root.querySelector('[data-rem-yes]').onclick = async (e) => {
      const b = e.currentTarget; b.disabled = true;
      try { await onYes(); root.innerHTML = ''; } catch (err) {
        b.disabled = false;
        if (err && err.code === 'subscription_required') { root.innerHTML = ''; toPlans(); } else notify(T((err && err.message) || 'Something went wrong'));
      }
    };
  }
  // Send a Free user to the Subscription page.
  function toPlans() {
    notify(T('SIP reminders are part of Pro and Premium. Choose a plan to continue.'));
    location.hash = '#/user/subscription';
  }

  // Set Reminder: Free → plans; paid → confirm the custom day, or switch back to Mod Alpha's date.
  async function onSet(btn) {
    if (live && !(window.MA_STATE && window.MA_STATE.ent)) { try { window.MA_STATE.ent = await API.get('/me/entitlements'); } catch (e) {} }
    if (!subscribed()) return toPlans();
    if (live && !prefs) await loadPrefs();
    const { SP, MN, y } = context();
    const cur = get();
    const picked = btn && btn.dataset.day ? +btn.dataset.day : null;
    if (picked && SP && picked !== SP.day) {
      const sameAsNow = cur.mode === 'custom' && cur.day === picked;
      if (sameAsNow) return notify(T(`You're all set — you'll be reminded on day ${picked} of every month.`));
      return dialog(
        'Use your own SIP reminder?',
        `<p class="ma-rem-q">${T('Do you want your customised SIP notification instead of the Mod Alpha notification?')}</p>
         <ul class="ma-rem-list">
           <li>${T(`You'll be reminded on day ${picked} of every month.`)}</li>
           <li>${T(`Mod Alpha's recommended-date notification (${SP.day} ${MN} ${y} this month) will be turned off for you.`)}</li>
           <li>${T('You can switch back to the Mod Alpha date at any time.')}</li>
         </ul>`,
        `Yes, use day ${picked}`, 'Keep Mod Alpha notification',
        async () => { await save({ mode: 'custom', day: picked }); v22PickDay = null; route(); notify(T(`Done — you'll be reminded on day ${picked} of every month.`)); },
      );
    }
    // Mod Alpha's date selected
    if (cur.mode === 'custom') {
      return dialog(
        'Switch back to Mod Alpha’s date?',
        `<p class="ma-rem-q">${T(`You're currently reminded on day ${cur.day} of every month.`)}</p><ul class="ma-rem-list"><li>${T(`Switch to Mod Alpha's recommended date (${SP ? SP.day + ' ' + MN + ' ' + y : 'published monthly'}) instead?`)}</li></ul>`,
        'Use Mod Alpha date', 'Keep my date',
        async () => { await save({ mode: 'modalpha' }); route(); notify(T("Done — you'll get Mod Alpha's recommended-date reminder each month.")); },
      );
    }
    notify(SP ? T(`You're all set — you'll be reminded on ${SP.day} ${MN} ${y}, Mod Alpha's recommended date.`) : T("You're all set — you'll get Mod Alpha's reminder when this month's date is published."));
  }

  /* demo mode: Subscription page plan buttons activate a demo plan (live mode uses real checkout in subscription.live.js) */
  if (!live) {
    // demo "Log out": forget the demo plan and reminder choice, then go to the login screen (no back-navigation into the app)
    window.addEventListener('click', (e) => {
      if (e.target.closest && e.target.closest('[data-action="logout-all"]')) { e.preventDefault(); e.stopImmediatePropagation(); notify(T('Sign out of all devices is available when you are signed in to a real account.')); return; }
      if (!(e.target.closest && e.target.closest('[data-action="logout"]'))) return;
      e.preventDefault(); e.stopImmediatePropagation();
      ls.set(LS_PLAN, null); ls.set(LS_REM, null); applyDemoState();
      history.replaceState(null, '', '#/login'); route(); notify(T('You have been logged out.'));
    }, true);
    window.addEventListener('click', (e) => {
      const b = e.target.closest && e.target.closest('[data-plan]');
      if (!b || !/^#\/(user|guest)/.test(location.hash)) return;
      e.preventDefault(); e.stopImmediatePropagation();
      const plan = b.dataset.plan;
      if (plan === 'Free') { ls.set(LS_PLAN, null); ls.set(LS_REM, null); applyDemoState(); route(); notify(T('You are on the Free plan.')); return; }
      // first paid plan: KYC first (features/subscription/kyc.js), then the demo activation below
      if (window.MA_KYC && MA_KYC.state.status !== 'Verified' && (MA_KYC.status(), MA_KYC.state.status) !== 'Verified') { MA_KYC.open({ onVerified: () => b.click() }); return; }
      dialog(`Activate ${plan} (demo)?`,
        `<p class="ma-rem-q">${T('Payments are not connected in demo mode.')}</p><ul class="ma-rem-list"><li>${T(`Activate ${plan} in this browser to try subscriber features such as custom SIP reminders.`)}</li><li>${T('In the live app this step is secure checkout.')}</li></ul>`,
        `Activate ${plan} (demo)`, 'Cancel',
        async () => { ls.set(LS_PLAN, plan); applyDemoState(); route(); notify(T(`${plan} plan activated (demo).`)); });
    }, true);
  } else {
    window.addEventListener('ma:unauthorized', () => { prefs = null; });
    loadPrefs().then(() => { if (/user\/overview/.test(location.hash) && typeof route === 'function') route(); });
  }

  window.MA_REMINDER = { get, onSet, subscribed };
})();
