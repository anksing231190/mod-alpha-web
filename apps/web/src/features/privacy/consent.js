/* ==========================================================================
   Feature: cookie and consent banner
   First visit (public or signed-in): a card at the bottom of the screen explains that essential cookies keep
   people signed in, and asks before using analytics or marketing cookies.
   • Accept all · Essential only · Choose (two switches: Analytics, Marketing; Essential is always on).
   • The choice is kept on this device (localStorage 'ma-consent', with the date and the policy version) and,
     when signed in on stage/prod, saved on the account with PUT /me/consents (kept as consent history).
     A choice made before sign-in is copied to the account at the next sign-in.
   • "Cookie settings" in the footer (and MA_CONSENT.open()) brings the card back to change the choice.
   • Other code asks MA_CONSENT.allowed('analytics') before loading any analytics script, and can listen for
     the 'ma:consent' event. Nothing optional is loaded today, so the banner only records the choice.
   Styles: src/styles/ux.css (.ma-cc)
   ========================================================================== */
(function () {
  const KEY = 'ma-consent', VERSION = 1;
  const T = (s) => (window.MA_T ? MA_T(s) : s);
  const read = () => { try { const v = JSON.parse(localStorage.getItem(KEY) || 'null'); return v && v.v === VERSION ? v : null; } catch (e) { return null; } };
  const live = () => !!(window.MA_LIVE && MA_LIVE.API);
  const signedIn = () => live() && MA_LIVE.S && MA_LIVE.S.user;
  let open = false, choosing = false;

  async function sync(c) {
    if (!signedIn() || !c) return;
    try { await MA_LIVE.API.put('/me/consents', { analytics: !!c.analytics, marketing: !!c.marketing }); c.synced = MA_LIVE.S.user.id || true; localStorage.setItem(KEY, JSON.stringify(c)); } catch (e) { /* kept locally; retried at next sign-in */ }
  }
  function save(analytics, marketing) {
    const c = { v: VERSION, analytics: !!analytics, marketing: !!marketing, at: new Date().toISOString() };
    try { localStorage.setItem(KEY, JSON.stringify(c)); } catch (e) {}
    close(); window.dispatchEvent(new CustomEvent('ma:consent', { detail: c })); sync(c);
    if (typeof notify === 'function') notify(T('Cookie choice saved.'));
  }
  function html() {
    const c = read() || { analytics: false, marketing: false };
    const sw = (k, on, label, desc, locked) => `<div class="ma-cc-row"><span><b>${T(label)}</b><small>${T(desc)}</small></span><label class="v22-switch${locked ? ' locked' : ''}"><input type="checkbox" data-ma-cc-k="${k}" ${on ? 'checked' : ''} ${locked ? 'disabled' : ''} aria-label="${T(label)}"><span></span></label></div>`;
    return `<section class="ma-cc" role="dialog" aria-modal="false" aria-labelledby="ma-cc-h" aria-describedby="ma-cc-p">
      <div class="ma-cc-top"><span class="ma-cc-ic" aria-hidden="true">${typeof cic === 'function' ? cic('shield', 36) : ''}</span><div><h2 id="ma-cc-h">${T('Your privacy choices')}</h2>
      <p id="ma-cc-p">${T('We use essential cookies to keep you signed in and secure. With your permission we also use analytics cookies to see which pages help people, and marketing cookies to measure our campaigns. We never sell your data.')} <a href="#/landing" data-public-scroll="faq-preview">${T('Learn more')}</a></p></div></div>
      ${choosing ? `<div class="ma-cc-opts">${sw('essential', true, 'Essential', 'Sign-in, security and your settings. Always on.', true)}${sw('analytics', c.analytics, 'Analytics', 'Anonymous usage counts that help us improve pages.')}${sw('marketing', c.marketing, 'Marketing', 'Measures which campaigns bring people to Mod Alpha.')}</div>` : ''}
      <div class="ma-cc-acts">${choosing
        ? `<button type="button" class="v22-grad-btn" data-ma-cc="save">${T('Save my choices')}</button><button type="button" class="v22-outline-btn" data-ma-cc="all">${T('Accept all')}</button>`
        : `<button type="button" class="v22-grad-btn" data-ma-cc="all">${T('Accept all')}</button><button type="button" class="v22-outline-btn" data-ma-cc="essential">${T('Essential only')}</button><button type="button" class="ma-cc-link" data-ma-cc="choose">${T('Choose')}</button>`}</div></section>`;
  }
  function render() {
    let el = document.getElementById('ma-cc');
    if (!open) { el?.remove(); document.body.classList.remove('ma-cc-open'); return; }
    if (!el) { el = document.createElement('div'); el.id = 'ma-cc'; document.body.appendChild(el); }
    el.innerHTML = html(); document.body.classList.add('ma-cc-open');
  }
  function show(choose) { open = true; choosing = !!choose; render(); setTimeout(() => document.querySelector('#ma-cc [data-ma-cc]')?.focus({ preventScroll: true }), 50); }
  function close() { open = false; choosing = false; render(); }

  document.addEventListener('click', (e) => {
    const s = e.target.closest && e.target.closest('[data-ma-cookie-settings]'); if (s) { e.preventDefault(); show(true); return; }
    const b = e.target.closest && e.target.closest('[data-ma-cc]'); if (!b) return;
    const a = b.dataset.maCc;
    if (a === 'all') save(true, true);
    else if (a === 'essential') save(false, false);
    else if (a === 'choose') { choosing = true; render(); }
    else if (a === 'save') { const v = (k) => !!document.querySelector(`#ma-cc [data-ma-cc-k="${k}"]`)?.checked; save(v('analytics'), v('marketing')); }
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && open && read()) close(); });

  // first visit: show once the page has drawn; a choice made before sign-in goes to the account afterwards
  const start = () => { if (!read()) setTimeout(() => show(false), 900); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
  let lastUser = null;
  setInterval(() => { const u = signedIn() ? MA_LIVE.S.user.id : null; if (u && u !== lastUser) { lastUser = u; const c = read(); if (c && c.synced !== u) sync(c); } if (!u) lastUser = null; }, 2000);

  window.MA_CONSENT = { get: read, allowed: (k) => k === 'essential' || !!(read() || {})[k], open: () => show(true) };
})();
