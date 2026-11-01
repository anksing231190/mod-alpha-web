/* ==========================================================================
   Live mode — boot
   Adds live parts to the page shell (bell, profile), shows a spinner, loads public data
   and the session in parallel, then renders the first screen.
   ========================================================================== */
(function () {
  if (!window.MA_LIVE) return; // demo mode (no API): nothing to do
  const { S, hydrateSettings, loadPublicData, loadSession, paintBell } = MA_LIVE;
  // ------------------------------------------------------------------ boot
  const baseShell = shell;
  shell = function (role, active, content) { baseShell(role, active, content); paintBell(); if (role === 'user') hydrateSettings(); const pm = document.querySelector('[data-v22-profile] span:last-child'); if (pm && S.user) pm.textContent = role === 'admin' ? S.user.name : S.user.name; };
  (async () => {
    app.innerHTML = '<div style="display:grid;place-items:center;height:100vh"><span class="v22-spin"></span></div>';
    try { await Promise.all([loadPublicData(), loadSession()]); } catch (e) { console.error(e); notify('Could not reach the Mod Alpha API. Some data may be unavailable.'); }
    S.ready = true; route();
  })();
})();
