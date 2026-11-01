/* ==========================================================================
   Mod Alpha — live mode (talking to the API)
   Active only when config/env.js sets API_BASE_URL (local, stage, prod). Without it
   the site is the self-contained demo.
   This file creates window.MA_LIVE with what every *.live.js file shares:
     API (src/core/api-client.js), S (signed-in user, plan, notifications, caches),
     on(selector, fn) — click handler that runs BEFORE the demo handlers and stops them,
     busy(button) — disable a button while working, fail(error) — show the error,
     date helpers isoToDmy / dmyToIso / fmt.
   Load order matters: the *.live.js files run in the order listed in index.html.
   ========================================================================== */
(function () {
  const API = window.MA_API;
  if (!API || !API.enabled) return;
  const ENV = window.MA_ENV || {};
  document.documentElement.dataset.env = API.env;
  const S = { user: null, ent: null, plans: null, notifs: null, sip: [], navCache: {}, ready: false };
  window.MA_STATE = S;
  // Readable message for an error.
  const errMsg = (e) => (e && e.message) || 'Something went wrong';
  // Show an error as a toast.
  const fail = (e) => notify(errMsg(e));
  // Click handler for live mode: runs before the demo handlers (capture phase) and stops them.
  const on = (sel, fn) => window.addEventListener('click', (e) => { const b = e.target.closest?.(sel); if (!b) return; e.preventDefault(); e.stopImmediatePropagation(); fn(b, e); }, true);
  // Disable a button and show a label while working; returns a function that restores it.
  const busy = (b, label = 'Working…') => { if (!b) return () => {}; const h = b.innerHTML; b.disabled = true; b.innerHTML = label; return () => { b.disabled = false; b.innerHTML = h; }; };
  // Date conversions between the API (YYYY-MM-DD) and the forms (DD/MM/YYYY), and display format.
  const isoToDmy = (s) => (s ? `${s.slice(8, 10)}/${s.slice(5, 7)}/${s.slice(0, 4)}` : '');
  const dmyToIso = (s) => { const d = v22ParseDate(s); return d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` : null; };
  const fmt = (s) => (s ? v22Fmt(String(s).slice(0, 10)) : '—');
  // ------------------------------------------------------------------ environment badge
  if (API.env !== 'prod') {
    // no on-screen environment badge (removed on request); the environment is still shown in Admin → System Settings
  }

  // shared with the other live files
  window.MA_LIVE = { API, S, on, busy, fail, errMsg, ENV, fmt, dmyToIso, isoToDmy };
})();
