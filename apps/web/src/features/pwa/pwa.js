/* ==========================================================================
   Feature: install as an app + phone notifications
   • Service worker (sw.js) and manifest (manifest.webmanifest) make the site installable. It is registered on
     stage/prod/local builds only (not the raw demo folder, so edits there are never served from a cache).
   • "Install Mod Alpha" card on the dashboard: from the 2nd signed-in visit, when the browser offers installing
     (Chrome/Edge/Android), or with the two steps for iPhone/iPad Safari. "Not now" hides it for 30 days; never
     shown when already installed.
   • Notification permission is asked at a useful moment, not on first load: on the MOD Alpha SIP page, a card
     offers "an alert the day before your SIP date". The browser's own prompt appears only after "Turn on".
     Once allowed, a confirmation notification is shown. Sending pushes from the server needs web-push keys
     (MA_ENV.VAPID_PUBLIC_KEY); when set, the device subscription is sent to POST /me/push-subscriptions.
   Styles: src/styles/ux.css (.ma-pwa)
   ========================================================================== */
(function () {
  const T = (s) => (window.MA_T ? MA_T(s) : s);
  const ENV = window.MA_ENV || {};
  const ls = { get: (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} } };
  const standalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const ios = () => /iphone|ipad|ipod/i.test(navigator.userAgent) && !/crios|fxios/i.test(navigator.userAgent);
  const snoozed = (k) => { const t = +ls.get(k) || 0; return Date.now() - t < 30 * 864e5; };
  const signedIn = () => /^#\/(user|guest)/.test(location.hash) || (window.MA_STATE && MA_STATE.user);
  let deferred = null, reg = null;

  if ('serviceWorker' in navigator && ENV.APP_ENV && ENV.APP_ENV !== 'demo' && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
    addEventListener('load', () => navigator.serviceWorker.register('sw.js').then((r) => { reg = r; }).catch(() => {}));
  }
  addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e; paint(); });
  addEventListener('appinstalled', () => { deferred = null; ls.set('ma-pwa-installed', '1'); document.querySelectorAll('.ma-pwa.install').forEach((x) => x.remove()); });
  // count signed-in visits (one per browser session)
  try { if (!sessionStorage.getItem('ma-visit')) { sessionStorage.setItem('ma-visit', '1'); ls.set('ma-visits', String((+ls.get('ma-visits') || 0) + 1)); } } catch (e) {}

  const card = (cls, icon, title, text, acts) => `<section class="v22-card ma-pwa ${cls}" role="region" aria-label="${title}"><span class="ma-pwa-ic" aria-hidden="true">${icon}</span><div><b>${title}</b><p>${text}</p></div><div class="ma-pwa-acts">${acts}</div></section>`;
  function installCard() {
    if (standalone() || ls.get('ma-pwa-installed') === '1' || snoozed('ma-pwa-snooze') || (+ls.get('ma-visits') || 0) < 2) return '';
    if (!deferred && !ios()) return '';
    return card('install', typeof cic === 'function' ? cic('phone', 40) : '', T('Install Mod Alpha on this device'), T('It opens like an app from your home screen, starts faster and can alert you the day before your SIP date.'),
      `<button type="button" class="v22-grad-btn" data-ma-pwa="install">${T('Install')}</button><button type="button" class="v22-outline-btn" data-ma-pwa="snooze">${T('Not now')}</button>`);
  }
  function notifyCard() {
    if (!('Notification' in window) || Notification.permission !== 'default' || snoozed('ma-push-snooze')) return '';
    return card('push', typeof cic === 'function' ? cic('bell', 40) : '', T('Get an alert the day before your SIP date'), T('We’ll send one notification a month on this device, plus a note if the date changes. You can turn it off any time in Settings.'),
      `<button type="button" class="v22-grad-btn" data-ma-pwa="push">${T('Turn on alerts')}</button><button type="button" class="v22-outline-btn" data-ma-pwa="push-snooze">${T('Not now')}</button>`);
  }
  function paint() {
    if (!signedIn()) return;
    const dash = document.querySelector('.v22-dash'), sip = document.querySelector('.v22-sip');
    if (dash && !dash.querySelector('.ma-pwa.install')) { const h = installCard(); if (h) (dash.querySelector('.v22-welcome') || dash.firstElementChild).insertAdjacentHTML('afterend', h); }
    if (sip && !sip.querySelector('.ma-pwa.push')) { const h = notifyCard(); if (h) (sip.querySelector('.v22-title, header') || sip.firstElementChild).insertAdjacentHTML('afterend', h); }
  }
  async function install() {
    if (deferred) { deferred.prompt(); const r = await deferred.userChoice.catch(() => null); deferred = null; document.querySelectorAll('.ma-pwa.install').forEach((x) => x.remove()); if (r && r.outcome === 'accepted') ls.set('ma-pwa-installed', '1'); return; }
    if (typeof showModal === 'function') showModal(T('Add Mod Alpha to your Home Screen'), `<div class="v22 ma-pwa-ios"><ol><li>${T('Tap the Share button')} <span aria-hidden="true">⬆︎</span> ${T('at the bottom of Safari.')}</li><li>${T('Choose “Add to Home Screen”, then tap Add.')}</li></ol><p>${T('Mod Alpha then opens like an app from your home screen.')}</p></div>`);
  }
  async function askPush(btn) {
    if (btn) btn.disabled = true;
    const p = await Notification.requestPermission().catch(() => 'denied');
    document.querySelectorAll('.ma-pwa.push').forEach((x) => x.remove());
    if (p !== 'granted') { if (typeof notify === 'function') notify(T('Alerts stay off. You can allow them later from your browser settings.')); return; }
    const r = reg || (navigator.serviceWorker && await navigator.serviceWorker.getRegistration().catch(() => null));
    const msg = { body: T('You’ll get a reminder the day before your SIP date.'), icon: 'assets/app/icon-192.png', tag: 'ma-welcome' };
    try { if (r) await r.showNotification(T('Alerts are on'), msg); else new Notification(T('Alerts are on'), msg); } catch (e) {}
    // server push (needs web-push keys on the server)
    if (r && ENV.VAPID_PUBLIC_KEY && window.MA_LIVE && MA_LIVE.API) {
      try { const sub = await r.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: ENV.VAPID_PUBLIC_KEY }); await MA_LIVE.API.post('/me/push-subscriptions', sub.toJSON()); } catch (e) {}
    }
    if (typeof notify === 'function') notify(T('Alerts are on for this device.'));
  }
  window.addEventListener('click', (e) => {
    const b = e.target.closest && e.target.closest('[data-ma-pwa]'); if (!b) return;
    const a = b.dataset.maPwa;
    if (a === 'install') install();
    else if (a === 'snooze') { ls.set('ma-pwa-snooze', String(Date.now())); b.closest('.ma-pwa')?.remove(); }
    else if (a === 'push') askPush(b);
    else if (a === 'push-snooze') { ls.set('ma-push-snooze', String(Date.now())); b.closest('.ma-pwa')?.remove(); }
  });
  let q = false;
  new MutationObserver(() => { if (q) return; q = true; requestAnimationFrame(() => { q = false; if (document.querySelector('.v22-dash:not(:has(.ma-pwa.install)), .v22-sip:not(:has(.ma-pwa.push))')) paint(); }); }).observe(document.documentElement, { childList: true, subtree: true });
  window.MA_PWA = { install, askPush, paint };
})();
