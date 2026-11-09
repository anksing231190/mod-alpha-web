/* ==========================================================================
   Core: collapsible sidebar (desktop and tablet, wider than 900px)
   A small « button at the top of the menu (right end of the WORKSPACE / ADMIN CONSOLE label) shrinks the sidebar to an icon rail (76px) and gives the page the
   room; » expands it again. Hovering an icon shows its name. The choice is remembered on this device
   (localStorage 'ma-side-mini') and applied before first paint (index.html). Styles: src/styles/ux.css
   ========================================================================== */
(function () {
  const KEY = 'ma-side-mini', html = document.documentElement;
  const T = (s) => (window.MA_T ? MA_T(s) : s);
  const mini = () => html.classList.contains('ma-side-mini');
  function set(on) {
    html.classList.toggle('ma-side-mini', on);
    try { if (on) localStorage.setItem(KEY, '1'); else localStorage.removeItem(KEY); } catch (e) {}
    decorate();
    window.dispatchEvent(new Event('resize')); // charts and the sticky fund bar re-measure
  }
  /** Add the toggle and hover names to the current sidebar. */
  function decorate() {
    const side = document.querySelector('.sidebar.v22-side'); if (!side) return;
    side.querySelectorAll('.nav-link').forEach((a) => { const s = a.querySelector('span'); if (s && !a.title) a.title = s.textContent.trim(); });
    let b = side.querySelector('.ma-side-toggle');
    if (!b) {
      b = document.createElement('button'); b.type = 'button'; b.className = 'ma-side-toggle';
      const label = side.querySelector('.side-label'); if (label) label.appendChild(b); else side.insertBefore(b, side.firstChild.nextSibling);
    }
    const on = mini();
    b.innerHTML = ic(on ? 'chevR' : 'chevL');
    b.setAttribute('aria-label', T(on ? 'Expand menu' : 'Collapse menu')); b.title = T(on ? 'Expand menu' : 'Collapse menu');
    b.setAttribute('aria-expanded', String(!on));
  }
  document.addEventListener('click', (e) => { if (e.target.closest && e.target.closest('.ma-side-toggle')) { e.preventDefault(); set(!mini()); } });
  let q = false;
  new MutationObserver(() => { if (q) return; q = true; requestAnimationFrame(() => { q = false; const s = document.querySelector('.sidebar.v22-side'); if (s && !s.querySelector('.ma-side-toggle')) decorate(); }); }).observe(document.documentElement, { childList: true, subtree: true });
  window.MA_SIDEBAR = { set, mini };
})();
