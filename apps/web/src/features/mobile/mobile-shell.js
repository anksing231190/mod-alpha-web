/* ==========================================================================
   Feature: phone layout for the signed-in app (≤ 760 px wide — Android / iPhone)
   --------------------------------------------------------------------------
   • Top bar: menu button + Mod Alpha mark on the left, theme / language / bell / profile on the right.
   • The sidebar becomes a slide-out drawer (menu button, swipe-free; closes on scrim tap, Esc, or navigation).
   • Bottom tab bar with the five most used screens, like an Android app.
   • Every screen change opens at the top of the page.
   Wider screens are unchanged (all of this is hidden by CSS above 760 px).
   ========================================================================== */
(function () {
  const T = (s) => (window.MA_T ? window.MA_T(s) : s);
  const TABS = {
    user: [['overview', 'dash', 'Home'], ['funds', 'grid', 'Funds'], ['sip', 'calendar', 'SIP Date'], ['whatif', 'trend', 'What If'], ['settings', 'gear', 'Account']],
    admin: [['dashboard', 'dash', 'Dashboard'], ['users', 'users', 'Users'], ['sipdate', 'calCheck', 'SIP Date'], ['insights', 'bulb', 'Insights'], ['settings', 'gear', 'Settings']],
  };
  const burger = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  const open = (on) => { document.documentElement.classList.toggle('ma-drawer-open', on); const b = document.querySelector('.ma-m-menu'); if (b) b.setAttribute('aria-expanded', String(on)); };

  function enhance(role, active) {
    const top = document.querySelector('.workspace-topbar'); if (!top || top.querySelector('.ma-m-menu')) return;
    top.insertAdjacentHTML('afterbegin', `<div class="ma-m-lead"><button type="button" class="ma-m-menu" aria-label="${T('Menu')}" aria-expanded="false">${burger}</button><a class="ma-m-logo" href="#/${role === 'admin' ? 'admin/dashboard' : 'user/overview'}" aria-label="Mod Alpha"><img src="assets/brand/mod-alpha-mark.png" alt=""><b>Mod Alpha</b></a></div>`);
    const shellEl = document.querySelector('.app-shell');
    if (shellEl && !shellEl.querySelector('.ma-drawer-scrim')) shellEl.insertAdjacentHTML('beforeend', '<div class="ma-drawer-scrim" aria-hidden="true"></div>');
    const tabs = TABS[role] || TABS.user;
    if (shellEl) shellEl.insertAdjacentHTML('beforeend', `<nav class="ma-bottom-nav" aria-label="${T('Main')}">${tabs.map(([id, icon, label]) => `<a href="#/${role}/${id}" class="${active === id ? 'on' : ''}"${active === id ? ' aria-current="page"' : ''}>${ic(icon)}<span>${T(label)}</span></a>`).join('')}</nav>`);
    open(false);
  }
  if (typeof shell === 'function') { const baseShell = shell; shell = function (role, active, content) { const r = baseShell.apply(this, arguments); try { enhance(role, active); } catch (e) {} return r; }; }

  document.addEventListener('click', (e) => {
    if (e.target.closest('.ma-m-menu')) { e.preventDefault(); open(!document.documentElement.classList.contains('ma-drawer-open')); return; }
    if (e.target.closest('.ma-drawer-scrim')) { open(false); return; }
    if (document.documentElement.classList.contains('ma-drawer-open') && e.target.closest('.sidebar a, .sidebar button[data-go], .sidebar [data-nav]')) open(false);
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') open(false); });
  // new screen → close the drawer and start at the top (only when the screen itself changes)
  let lastPath = location.hash.split('?')[0];
  window.addEventListener('hashchange', () => { open(false); const pth = location.hash.split('?')[0]; if (pth !== lastPath) { lastPath = pth; window.scrollTo(0, 0); } });
})();
