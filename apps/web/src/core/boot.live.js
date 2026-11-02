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
  shell = function (role, active, content) { baseShell(role, active, content); paintBell(); if (role === 'user') hydrateSettings(); const pm = document.querySelector('[data-v22-profile] span:last-child'); if (pm && S.user) pm.textContent = role === 'admin' ? S.user.name : S.user.name;
    // an admin looking at the investor view: "Admin Console" instead of "Upgrade Plan"
    if (role === 'user' && S.user && S.user.role !== 'user') { const up = document.querySelector('.workspace-actions .v22-upgrade, .workspace-actions .upgrade-link'); if (up) up.outerHTML = `<a class="v22-role-chip ma-to-admin" href="#/admin/dashboard">${cic('shield', 20)} <span>Admin Console</span></a>`; } };
  (async () => {
    app.innerHTML = '<div style="display:grid;place-items:center;height:var(--vh100,100vh)"><span class="v22-spin"></span></div>';
    try { await Promise.all([loadPublicData(), loadSession()]); } catch (e) { console.error(e); notify('Could not reach the Mod Alpha API. Some data may be unavailable.'); }
    if (S.user) await MA_LIVE.refreshSip();   // session cookie known now → subscriber view of the SIP dates
    S.ready = true; route();
  })();
})();
