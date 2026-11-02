/* ==========================================================================
   Mod Alpha — session timeouts in the browser
   --------------------------------------------------------------------------
   Rules (the API enforces them too, so closing the tab or sleeping the laptop
   cannot keep a session alive):
     • Inactivity: no mouse / keyboard / touch / scroll for 15 minutes → signed out.
       60 seconds before that, a dialog asks "Are you still there?" with
       [Sign out now] and [Stay signed in].
     • Absolute limit: 12 hours for users, 8 hours for admins after signing in.
       5 minutes before the end a notice says when the session will end.
   Activity is shared between tabs through localStorage, so working in one tab
   keeps the other tabs signed in, and a sign-out in one tab signs out all tabs.

   API mode  — timers come from GET /auth/session; activity is reported with
               POST /auth/activity (at most once a minute while the person is active);
               sign-out calls POST /auth/logout { reason } so the audit log records why.
   Demo mode — same behaviour with local timers (no server).
   Public:  window.MA_SESSION = { start, stop, state }
   ========================================================================== */
(function () {
  const API = window.MA_API || {};
  const live = !!API.enabled;
  // Translate (Hindi) when available.
  const T = (s) => (window.MA_T ? window.MA_T(s) : s);
  const ENV = window.MA_ENV || {};

  /* ---------- settings ---------- */
  const DEFAULTS = {
    idleTimeoutSec: Math.round((Number(ENV.SESSION_IDLE_MIN) || 15) * 60), // inactivity limit
    warnBeforeSec: 60,                                                    // dialog shown this long before sign-out
    maxHoursUser: 12, maxHoursAdmin: 8,                                    // absolute limits (demo mode)
  };
  const ABS_NOTICE_SEC = 5 * 60;          // notice before the absolute limit
  const HEARTBEAT_MS = 60 * 1000;         // how often activity is reported to the API (at most)
  const SHARE_KEY = 'ma-last-activity';   // localStorage key shared by all tabs
  const ACTIVITY_EVENTS = ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart', 'scroll'];

  /* ---------- state ---------- */
  const st = {
    running: false,
    info: null,          // { idleTimeoutSec, warnBeforeSec, absoluteExpiresAt (ms) }
    lastActivity: 0,     // this tab's last activity (ms)
    lastShared: 0,       // last time this tab wrote SHARE_KEY
    lastPing: 0,         // last heartbeat sent to the API
    timer: null,         // 1-second check interval
    absNoticed: false,   // absolute-limit notice shown?
    expiring: false,     // sign-out in progress
  };

  /* ---------- small helpers ---------- */
  const now = () => Date.now();
  const ls = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
  };
  /** Latest activity across all tabs. */
  const lastActivityAnyTab = () => Math.max(st.lastActivity, Number(ls.get(SHARE_KEY)) || 0);
  /** "1:05" style countdown. */
  const mmss = (sec) => `${Math.floor(sec / 60)}:${String(Math.max(0, sec % 60)).padStart(2, '0')}`;
  /** Is the person on a signed-in screen? (demo mode has no server session) */
  const onSignedInRoute = () => /^#\/(user|admin|guest\/(user|admin))/.test(location.hash);

  /* ---------- activity tracking ---------- */
  /** Called for every input event; cheap: only timestamps, shared with other tabs every 5 s. */
  function onActivity() {
    if (!st.running || warningOpen()) return;   // while the dialog is open only its buttons count
    const t = now();
    st.lastActivity = t;
    if (t - st.lastShared > 5000) { st.lastShared = t; ls.set(SHARE_KEY, String(t)); }
  }
  /** Report activity to the API (resets the server's inactivity clock). */
  async function heartbeat() {
    st.lastPing = now();
    if (!live) return true;
    try { const r = await API.post('/auth/activity', {}, { onUnauthorized: false }); applyInfo(r); return true; }
    catch (e) { if (e.status === 401) expire(e.details?.reason || 'idle'); return false; }
  }

  /* ---------- the 1-second check ---------- */
  function tick() {
    if (!st.running || st.expiring || !st.info) return;
    if (!live && !onSignedInRoute()) { stop(); return; }   // demo: left the signed-in screens
    const t = now(), info = st.info;
    const last = lastActivityAnyTab();
    const idleMs = t - last;
    // 1) absolute limit
    if (info.absoluteExpiresAt && t >= info.absoluteExpiresAt) return expire('absolute');
    if (info.absoluteExpiresAt && !st.absNoticed && info.absoluteExpiresAt - t <= ABS_NOTICE_SEC * 1000) {
      st.absNoticed = true;
      const at = new Date(info.absoluteExpiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      notifyLong(`${T('For your security, this session ends at')} ${at}. ${T('Save your changes; you will need to sign in again.')}`);
    }
    // 2) inactivity
    if (idleMs >= info.idleTimeoutSec * 1000) return expire('idle');
    const left = Math.ceil((info.idleTimeoutSec * 1000 - idleMs) / 1000);
    if (left <= info.warnBeforeSec) showWarning(left); else if (warningOpen()) hideWarning(); // another tab was used
    // 3) heartbeat while the person is active (so the server's clock follows real activity)
    if (last > st.lastPing && t - st.lastPing >= HEARTBEAT_MS) heartbeat();
  }

  /* ---------- warning dialog ---------- */
  const warnEl = () => document.getElementById('ma-session-warn');
  // Is the warning dialog showing?
  const warningOpen = () => !!warnEl();
  // Show (or update) the 'Are you still there?' dialog with the seconds left.
  function showWarning(left) {
    let el = warnEl();
    if (!el) {
      el = document.createElement('div');
      el.id = 'ma-session-warn';
      el.className = 'ma-sw-backdrop';
      el.innerHTML = `<div class="ma-sw" role="alertdialog" aria-modal="true" aria-labelledby="ma-sw-title" aria-describedby="ma-sw-text">
        <span class="ma-sw-ic" aria-hidden="true"><svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5M9 2.5h6"/></svg></span>
        <h3 id="ma-sw-title">${T('Are you still there?')}</h3>
        <p id="ma-sw-text">${T('For your security, you will be signed out because there has been no activity.')}</p>
        <div class="ma-sw-count" aria-live="polite"><b id="ma-sw-left"></b><small>${T('until sign-out')}</small></div>
        <div class="ma-sw-actions"><button type="button" class="v22-ghost-btn" data-sw-out>${T('Sign out now')}</button><button type="button" class="v22-grad-btn" data-sw-stay>${T('Stay signed in')}</button></div>
      </div>`;
      document.body.appendChild(el);
      el.querySelector('[data-sw-stay]').onclick = stay;
      el.querySelector('[data-sw-out]').onclick = () => expire('user');
      el.querySelector('[data-sw-stay]').focus();
    }
    el.querySelector('#ma-sw-left').textContent = mmss(left);
  }
  // Close the warning dialog.
  function hideWarning() { warnEl()?.remove(); }
  /** "Stay signed in": count as activity everywhere and tell the server. */
  async function stay() {
    const t = now();
    st.lastActivity = t; st.lastShared = t; ls.set(SHARE_KEY, String(t));
    hideWarning();
    await heartbeat();
  }

  /* ---------- sign-out ---------- */
  /** "You were signed out after 15 minutes of inactivity." — the number follows the configured limit. */
  const idleMessage = () => {
    const min = Math.round(((st.info && st.info.idleTimeoutSec) || DEFAULTS.idleTimeoutSec) / 6) / 10; // 1 decimal
    return `You were signed out after ${min} minutes of inactivity.`;
  };
  const MESSAGES = {
    absolute: 'Your session reached its time limit. Please sign in again.',
    user: 'You have been logged out.',
  };
  /** End the session: tell the API why (audit log), then show the login screen with the reason. */
  async function expire(reason) {
    if (st.expiring) return;
    st.expiring = true;
    hideWarning();
    stop();
    const msg = T(reason === 'idle' || !MESSAGES[reason] ? idleMessage() : MESSAGES[reason]);
    if (live) {
      try { await API.post('/auth/logout', reason === 'user' ? {} : { reason }, { onUnauthorized: false }); } catch (e) {}
      if (window.MA_AUTH) window.MA_AUTH.signedOut(msg);
    } else {
      // demo: reuse the demo "Log out" handler, then explain why
      const b = document.createElement('button'); b.type = 'button'; b.dataset.action = 'logout'; b.hidden = true;
      document.body.appendChild(b); b.click(); b.remove();
      try { sessionStorage.removeItem('ma-demo-session-start'); } catch (e) {}
      setTimeout(() => showNotice(msg, reason === 'idle' || !MESSAGES[reason] ? 'idle' : reason), 50);
    }
    st.expiring = false;
  }
  /** A toast that stays a little longer than the default. */
  function notifyLong(msg) { if (typeof notify === 'function') notify(msg); }

  /* ---------- sign-out notice on the login card ----------
     Instead of a small toast, the reason is shown as a card at the top of the login form (icon, title, reason,
     close button). It stays until the person signs in again or closes it, and survives the page switch. */
  const NOTICE_KEY = 'ma-signout-notice';
  const NOTICE_TITLES = { idle: 'Signed out for your security', absolute: 'Session time limit reached', expired: 'Your session has ended', user: 'You have been logged out' };
  function showNotice(msg, kind) {
    const k = kind || (/inactivity/i.test(msg) ? 'idle' : /time limit/i.test(msg) ? 'absolute' : /logged out/i.test(msg) ? 'user' : 'expired');
    try { sessionStorage.setItem(NOTICE_KEY, JSON.stringify({ k, msg, at: now() })); } catch (e) {}
    paintNotice();
  }
  function clearNotice() { try { sessionStorage.removeItem(NOTICE_KEY); } catch (e) {} document.querySelector('.ma-signout-note')?.remove(); }
  function paintNotice() {
    let n = null; try { n = JSON.parse(sessionStorage.getItem(NOTICE_KEY)); } catch (e) {}
    const card = document.querySelector('.v22-auth-card'); if (!n || !card) return;
    card.querySelector('.ma-signout-note')?.remove();
    const security = n.k !== 'user';
    const icon = security
      ? '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 7v5l3.2 2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>'
      : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.2 4.2L19 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    const tip = n.k === 'idle' ? T('Nothing was lost. Sign in again to continue where you left off.') : n.k === 'absolute' ? T('For safety, every session has a maximum length. Sign in again to continue.') : n.k === 'user' ? T('See you soon.') : T('Please sign in again to continue.');
    const el = document.createElement('div');
    el.className = `ma-signout-note ${security ? 'security' : 'info'}`; el.setAttribute('role', 'status'); el.setAttribute('aria-live', 'polite');
    el.innerHTML = `<span class="ma-sn-ic">${icon}</span><div class="ma-sn-txt"><b>${T(NOTICE_TITLES[n.k] || NOTICE_TITLES.expired)}</b><p>${esc(n.msg)}</p><small>${tip}</small></div><button type="button" class="ma-sn-x" aria-label="${T('Close')}">×</button>`;
    el.querySelector('.ma-sn-x').onclick = clearNotice;
    card.prepend(el);
  }
  // draw it whenever the login / sign-up screen is drawn; forget it once signed in
  if (typeof renderAuth === 'function') { const baseRenderAuth = renderAuth; renderAuth = function () { const r = baseRenderAuth.apply(this, arguments); paintNotice(); return r; }; }
  window.addEventListener('ma:signed-in', clearNotice);

  /* ---------- start / stop ---------- */
  function applyInfo(r) {
    if (!r) return;
    st.info = { idleTimeoutSec: r.idleTimeoutSec || DEFAULTS.idleTimeoutSec, warnBeforeSec: r.warnBeforeSec || DEFAULTS.warnBeforeSec, absoluteExpiresAt: r.absoluteExpiresAt ? Date.parse(r.absoluteExpiresAt) : null };
  }
  /** Begin watching a signed-in session. `info` (optional) is the `session` object returned by login. */
  async function start(info) {
    const t = now();
    st.lastActivity = t; st.lastShared = t; st.lastPing = t; st.absNoticed = false; st.expiring = false;
    ls.set(SHARE_KEY, String(t));
    if (live) {
      if (info) applyInfo(info);
      else { try { applyInfo(await API.get('/auth/session', null, { onUnauthorized: false, background: true })); } catch (e) { return; } }
    } else {
      // demo: absolute limit counted from the first signed-in screen in this tab
      let started = Number(sessionStorage.getItem('ma-demo-session-start')) || 0;
      if (!started) { started = t; try { sessionStorage.setItem('ma-demo-session-start', String(t)); } catch (e) {} }
      const admin = /^#\/(admin|guest\/admin)/.test(location.hash);
      st.info = { idleTimeoutSec: DEFAULTS.idleTimeoutSec, warnBeforeSec: DEFAULTS.warnBeforeSec, absoluteExpiresAt: started + (admin ? DEFAULTS.maxHoursAdmin : DEFAULTS.maxHoursUser) * 3600_000 };
    }
    if (st.running) return;
    st.running = true;
    ACTIVITY_EVENTS.forEach((ev) => window.addEventListener(ev, onActivity, { passive: true, capture: true }));
    st.timer = setInterval(tick, 1000);
  }
  /** Stop watching (after sign-out). */
  function stop() {
    st.running = false;
    clearInterval(st.timer); st.timer = null;
    ACTIVITY_EVENTS.forEach((ev) => window.removeEventListener(ev, onActivity, { capture: true }));
    hideWarning();
  }

  /* ---------- wiring ---------- */
  if (live) {
    // auth.live.js fires these after sign-in / page load with a session, and on sign-out
    window.addEventListener('ma:signed-in', (e) => start(e.detail && e.detail.session));
    window.addEventListener('ma:logout', stop);
  } else {
    // demo: watch while a signed-in demo screen is open
    const sync = () => { if (onSignedInRoute()) { if (!st.running) start(); } else if (st.running) { stop(); try { sessionStorage.removeItem('ma-demo-session-start'); } catch (e) {} } };
    window.addEventListener('hashchange', sync);
    window.addEventListener('load', sync);
    sync();
  }
  // another tab signed out because of a timeout → this tab hides its dialog too (the logout sync does the rest)
  window.addEventListener('storage', (e) => { if (e.key === 'mod-alpha-logout') hideWarning(); });

  window.MA_SESSION = { start, stop, state: st, idleMessage, showNotice, clearNotice };
})();
