/* ==========================================================================
   Phone: theme and language move from the crowded top bar into the slide-out menu (≤ 760 px).
   The buttons here press the real top-bar toggles (hidden on phones by ux.css), so behaviour is identical.
   ========================================================================== */
(function () {
  const T = (s) => (window.MA_T ? MA_T(s) : s);
  function add() {
    const side = document.querySelector('.sidebar.v22-side'); if (!side || side.querySelector('.ma-m-prefs')) return;
    const box = document.createElement('div'); box.className = 'ma-m-prefs';
    const dark = document.documentElement.dataset.theme !== 'light', hi = document.documentElement.lang === 'hi';
    box.innerHTML = `<button type="button" data-ma-mp="theme">${ic(dark ? 'spark' : 'bulb')}<span>${T(dark ? 'Light theme' : 'Dark theme')}</span></button><button type="button" data-ma-mp="lang"><b>${hi ? 'A' : 'अ'}</b><span>${hi ? 'English' : 'हिन्दी'}</span></button>`;
    const nav = side.querySelector('nav'); if (nav) nav.after(box); else side.appendChild(box);
  }
  document.addEventListener('click', (e) => {
    const b = e.target.closest && e.target.closest('[data-ma-mp]'); if (!b) return;
    document.querySelector(`.workspace-topbar ${b.dataset.maMp === 'theme' ? '.ma-theme-toggle' : '.ma-lang-toggle'}`)?.click();
    document.querySelectorAll('.ma-m-prefs').forEach((x) => x.remove()); setTimeout(add, 60);
  });
  let q = false;
  new MutationObserver(() => { if (q) return; q = true; requestAnimationFrame(() => { q = false; add(); }); }).observe(document.documentElement, { childList: true, subtree: true });
})();
