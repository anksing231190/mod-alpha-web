/* ==========================================================================
   Feature: system pages — "Page not found", "Something went wrong", "Down for maintenance"
   • Not found: any address the site does not know (public, user or admin), with links back.
   • Something went wrong: shown when drawing a page throws; offers Try again / Go home and a reference
     code to quote to support. The error is logged to the console.
   • Maintenance: the API answers 503 'maintenance' (MAINTENANCE_MODE=true) → a full-page notice with the
     expected end time; "Check again" retries. Test without the API: add ?maintenance to the address.
   Styles: src/styles/ux.css
   ========================================================================== */
(function () {
  const T = (s) => (window.MA_T ? MA_T(s) : s);
  const signedIn = () => (window.MA_STATE && MA_STATE.user) || (!(window.MA_API && MA_API.enabled) && /^#\/(user|admin|guest)/.test(location.hash));
  const home = () => (typeof currentRole !== 'undefined' && currentRole === 'admin' ? '#/admin/dashboard' : signedIn() ? '#/user/overview' : '#/landing');
  const mark = (cls) => (typeof maAlphaMark === 'function' ? maAlphaMark({ cls: 'ma-sys-mark ' + (cls || '') }) : '');

  function card({ code, title, text, actions, extra = '', cls = '' }) {
    return `<div class="ma-sys ${cls}" role="main"><div class="ma-sys-card">${mark(cls === 'down' ? 'think' : 'dim')}${code ? `<span class="ma-sys-code">${esc(code)}</span>` : ''}
      <h1>${esc(T(title))}</h1><p>${esc(T(text))}</p>${extra}<div class="ma-sys-acts">${actions}</div></div></div>`;
  }
  /** "Page not found" content (inside the app shell, or full page for public addresses). */
  function notFound() {
    return card({ code: '404', title: 'Page not found', text: 'This page doesn’t exist or has moved. Check the address, or go back to somewhere familiar.',
      actions: `<a class="v22-grad-btn" href="${home()}">${ic('back')} ${T('Go to home')}</a><a class="v22-outline-btn" href="#/${signedIn() ? 'user/funds' : 'faq'}">${T(signedIn() ? 'Explore funds' : 'Read the FAQ')}</a><a class="v22-outline-btn" href="#/${signedIn() ? 'user/help' : 'faq'}">${T('Get help')}</a>` });
  }
  function notFoundPage() {
    if (typeof app === 'undefined') return;
    app.innerHTML = `${typeof topbar === 'function' ? topbar(true) : ''}<main class="public-page ma-sys-wrap">${notFound()}</main>${typeof publicFooter === 'function' ? publicFooter() : ''}`;
    document.title = 'Page not found · Mod Alpha';
  }
  /** "Something went wrong" — full page, with a short reference for support. */
  function errorPage(err) {
    const ref = 'ERR-' + Date.now().toString(36).toUpperCase().slice(-6);
    console.error('[Mod Alpha] page error', ref, err);
    if (typeof app === 'undefined') return;
    app.innerHTML = `<main class="ma-sys-wrap full">${card({ code: '', title: 'Something went wrong', text: 'We couldn’t show this page. Your data is safe. Try again in a moment.',
      extra: `<p class="ma-sys-ref">${T('Reference')}: <b>${ref}</b> · ${T('quote it if you contact support')}</p>`,
      actions: `<button type="button" class="v22-grad-btn" data-ma-sys-retry>${ic('refresh')} ${T('Try again')}</button><a class="v22-outline-btn" href="${home()}">${T('Go to home')}</a>`, cls: 'err' })}</main>`;
  }
  /** "Down for maintenance" — full page until the API answers again. */
  let down = false;
  function maintenancePage(d) {
    if (typeof app === 'undefined') return; down = true;
    app.innerHTML = `<main class="ma-sys-wrap full">${card({ code: '', title: 'Down for maintenance', text: 'We’re upgrading Mod Alpha to serve you better. Your data and plan are safe, and reminders will still be sent.',
      extra: `${d && d.until ? `<p class="ma-sys-until">${ic('clock')} ${T('Expected back by')} <b>${esc(d.until)}</b></p>` : ''}<p class="ma-sys-ref">${T('This page checks again by itself every minute.')}</p>`,
      actions: `<button type="button" class="v22-grad-btn" data-ma-sys-check>${ic('refresh')} ${T('Check again')}</button>`, cls: 'down' })}</main>`;
    document.title = 'Down for maintenance · Mod Alpha';
  }
  async function checkAgain() {
    if (window.MA_API && MA_API.enabled) { try { await MA_API.get('/plans', null, { background: true }); down = false; location.reload(); } catch (e) { if (e.code !== 'maintenance') location.reload(); } }
    else { down = false; history.replaceState(null, '', location.pathname + location.hash); location.reload(); }
  }
  addEventListener('ma:maintenance', (e) => maintenancePage(e.detail));
  setInterval(() => { if (down && !document.hidden) checkAgain(); }, 60000);
  document.addEventListener('click', (e) => {
    if (e.target.closest && e.target.closest('[data-ma-sys-retry]')) { location.reload(); return; }
    if (e.target.closest && e.target.closest('[data-ma-sys-check]')) checkAgain();
  });

  /* ---------- hook into the router ---------- */
  const KNOWN_USER = ['overview', 'funds', 'fund', 'whatif', 'sip', 'insights', 'subscription', 'settings', 'help', 'watchlist', 'notifications'];
  if (typeof renderUserPage === 'function') {
    const baseUser = renderUserPage;
    renderUserPage = function (page = 'overview', sub = '') {
      if (page && !KNOWN_USER.includes(page)) { shell('user', '', notFound()); return; }
      if (page === 'fund' && sub && typeof D !== 'undefined' && D.funds && D.funds.length && !D.funds.some((f) => f.id === sub)) { shell('user', 'funds', notFound()); return; }
      return baseUser.apply(this, arguments);
    };
  }
  if (typeof route === 'function') {
    const baseRoute = route;
    route = function () {
      if (down) return;
      if (/[?&]maintenance\b/.test(location.search) && !(window.MA_API && MA_API.enabled)) { maintenancePage({ until: '10:30 PM IST (demo)' }); return; }
      try { return baseRoute.apply(this, arguments); } catch (err) { errorPage(err); }
    };
  }
  // extra public addresses registered by other features: MA_ROUTES['learn'] = (parts) => { … } (see core/router.js)
  window.MA_ROUTES = window.MA_ROUTES || {};
  window.maPublicRoute = (parts) => { const fn = window.MA_ROUTES[parts[0]]; if (!fn) return false; fn(parts); return true; };
  window.MA_SYS = { notFound, notFoundPage, errorPage, maintenancePage };
})();
