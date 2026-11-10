/* ==========================================================================
   Core: accessibility helpers used on every page
   • "Skip to content": the first thing a keyboard user reaches; moves focus to the page's main area
     (a button, not a link, because the router owns the # part of the address).
   • Icon-only buttons and links get a name for screen readers from their title, or from a short list of
     known controls, when the markup did not give one.
   • Focus rings (:focus-visible) and reduced motion are in src/styles/ux.css.
   ========================================================================== */
(function () {
  const T = (s) => (window.MA_T ? MA_T(s) : s);
  function skip() {
    if (document.getElementById('ma-skip')) return;
    const b = document.createElement('button'); b.type = 'button'; b.id = 'ma-skip'; b.className = 'ma-skip'; b.textContent = T('Skip to content');
    b.addEventListener('click', () => {
      const m = document.querySelector('.main-area .workspace-content, .main-area, main, #app');
      if (!m) return; if (!m.hasAttribute('tabindex')) m.setAttribute('tabindex', '-1'); m.focus({ preventScroll: false });
    });
    document.body.insertBefore(b, document.body.firstChild);
  }
  const KNOWN = [['.ma-theme-toggle', 'Switch light or dark theme'], ['.ma-lang-toggle', 'Switch language'], ['[data-modal-close]', 'Close'], ['.v22-fab, .chat-fab', 'Ask Mod Alpha'], ['[data-action="profile"]', 'Account menu'], ['.ma-bell, [data-ma-bell]', 'Notifications'], ['[data-v22-chat-close]', 'Close assistant'], ['[data-v22-chat-send]', 'Send question']];
  function names(root) {
    root.querySelectorAll('button:not([aria-label]):not([aria-labelledby]), a[href]:not([aria-label]):not([aria-labelledby]), [role="button"]:not([aria-label])').forEach((el) => {
      if ((el.textContent || '').replace(/\s+/g, '').length) return; // has visible text
      if (el.querySelector('img[alt]:not([alt=""])')) return;
      let n = el.getAttribute('title');
      if (!n) for (const [sel, label] of KNOWN) if (el.matches(sel)) { n = label; break; }
      if (n) el.setAttribute('aria-label', T(n));
    });
  }
  let q = false;
  const run = () => { q = false; skip(); names(document.body); };
  new MutationObserver(() => { if (!q) { q = true; requestAnimationFrame(run); } }).observe(document.documentElement, { childList: true, subtree: true });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run); else run();
})();
