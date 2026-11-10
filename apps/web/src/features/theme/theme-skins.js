/* ==========================================================================
   Feature: theme picker — five looks
     Midnight  (dark, the original)         data-theme="dark"
     Sand      (cream & beige)              data-theme="light"
     Ivory     (white & cream)              data-theme="light" data-skin="ivory"   → theme-ivory.generated.css
     Espresso  (cream pages, dark sidebar   data-theme="light" data-skin="duo"     → theme-skins.css
                and top bar)
     Auto      (Sand by day, Midnight at night; theme.js)
   Ivory and Espresso are built on Sand, so every screen, chart and dialog that works in Sand works in them.
   The skin is stored in localStorage 'mod-alpha-skin' (and applied before first paint by index.html).
   The sun/moon button in the top bar opens this picker; Settings → Appearance shows all five as cards.
   ========================================================================== */
(function () {
  const html = document.documentElement, KEY = 'mod-alpha-skin';
  const T = (s) => (window.MA_T ? MA_T(s) : s);
  const THEMES = [
    { id: 'dark', name: 'Midnight', desc: 'Dark, the original', sw: ['#080b18', '#141d3d', '#6366f1'] },
    { id: 'light', name: 'Sand', desc: 'Cream & beige', sw: ['#f4ecdd', '#fffaf1', '#9c5f2a'] },
    { id: 'ivory', name: 'Ivory', desc: 'White & cream', sw: ['#fdfbf7', '#ffffff', '#b07a45'] },
    { id: 'duo', name: 'Espresso', desc: 'Cream pages, dark sidebar', sw: ['#1e1813', '#f4ecdd', '#c08548'] },
  ];
  const META = { dark: '#080b18', light: '#f4ecdd', ivory: '#fdfbf7', duo: '#1e1813' };
  const skin = () => { try { return localStorage.getItem(KEY) || ''; } catch (e) { return ''; } };
  const current = () => (html.dataset.theme === 'light' ? (skin() || 'light') : 'dark');
  function applySkin() {
    const s = html.dataset.theme === 'light' ? skin() : '';
    if (s) html.dataset.skin = s; else delete html.dataset.skin;
    const m = document.querySelector('meta[name=theme-color]'); if (m) m.content = META[current()];
  }
  function pick(id) {
    try { if (id === 'ivory' || id === 'duo') localStorage.setItem(KEY, id); else localStorage.removeItem(KEY); } catch (e) {}
    const base = id === 'dark' ? 'dark' : 'light';
    if (window.MA_THEME) MA_THEME.set(base); else if (typeof setTheme === 'function') setTheme(base);
    applySkin(); paintCards(); closeMenu();
    if (typeof notify === 'function') notify(`${T(THEMES.find((t) => t.id === id).name)} ${T('theme applied')}`);
  }
  const swatch = (t) => `<span class="ma-th-sw" aria-hidden="true">${t.sw.map((c) => `<em style="background-color:${c}"></em>`).join('')}</span>`;

  /* ---------- picker pop-over (from the sun/moon button) ---------- */
  function closeMenu() { document.getElementById('ma-th-menu')?.remove(); }
  function openMenu(anchor) {
    closeMenu();
    const cur = current(), auto = window.MA_THEME && MA_THEME.isAuto();
    const el = document.createElement('div'); el.id = 'ma-th-menu'; el.className = 'ma-th-menu'; el.setAttribute('role', 'menu');
    el.innerHTML = `<b class="ma-th-h">${T('Theme')}</b>${THEMES.map((t) => `<button type="button" role="menuitemradio" aria-checked="${!auto && cur === t.id}" class="${!auto && cur === t.id ? 'on' : ''}" data-ma-th="${t.id}">${swatch(t)}<span><b>${T(t.name)}</b><small>${T(t.desc)}</small></span>${!auto && cur === t.id ? ic('check') : ''}</button>`).join('')}
      <button type="button" role="menuitemradio" aria-checked="${!!auto}" class="${auto ? 'on' : ''}" data-ma-th="auto"><span class="ma-th-sw auto" aria-hidden="true"><em></em><em></em></span><span><b>${T('Auto')}</b><small>${T('Sand by day, Midnight at night')}</small></span>${auto ? ic('check') : ''}</button>`;
    document.body.appendChild(el);
    const z = parseFloat(getComputedStyle(html).zoom) || 1, r = anchor.getBoundingClientRect();
    const w = el.offsetWidth, left = Math.max(8, Math.min(innerWidth / z - w - 8, r.right / z - w));
    el.style.left = left + 'px'; el.style.top = (r.bottom / z + 8) + 'px';
    if (r.bottom / z + el.offsetHeight + 16 > innerHeight / z) el.style.top = Math.max(8, r.top / z - el.offsetHeight - 8) + 'px';
    el.querySelector('.on, button')?.focus();
  }

  /* ---------- Settings → Appearance: add Ivory and Espresso cards, mark the current one ---------- */
  function paintCards() {
    const cards = document.querySelector('.v22-theme-cards'); if (!cards) return;
    if (!cards.querySelector('[data-pick="ivory"]')) {
      const auto = cards.querySelector('[data-pick="auto"]');
      const add = (t) => `<label class="v22-theme" data-pick="${t.id}"><input type="radio" name="v22-theme" value="${t.id}"><span class="v22-theme-prev ${t.id}"><i></i><i></i><i></i></span><b>${T(t.name)}</b><small>${T(t.desc)}</small></label>`;
      const html2 = add(THEMES[2]) + add(THEMES[3]);
      if (auto) auto.insertAdjacentHTML('beforebegin', html2); else cards.insertAdjacentHTML('beforeend', html2);
    }
    const auto = window.MA_THEME && MA_THEME.isAuto(), cur = current();
    cards.querySelectorAll('.v22-theme').forEach((l) => { const on = auto ? l.dataset.pick === 'auto' : l.dataset.pick === cur; l.classList.toggle('on', on); const i = l.querySelector('input'); if (i) i.checked = on; });
  }

  // capture phase: runs before theme.js's own toggle / card handlers
  window.addEventListener('click', (e) => {
    const t = e.target; if (!t.closest) return;
    const tg = t.closest('[data-theme-toggle]'); if (tg) { e.preventDefault(); e.stopImmediatePropagation(); if (document.getElementById('ma-th-menu')) closeMenu(); else openMenu(tg); return; }
    const m = t.closest('[data-ma-th]'); if (m) { e.preventDefault(); e.stopImmediatePropagation(); if (m.dataset.maTh === 'auto') { try { localStorage.removeItem(KEY); } catch (er) {} if (window.MA_THEME) { MA_THEME.setAuto(true); const h = new Date().getHours(); if (typeof setTheme === 'function') setTheme(h >= 7 && h < 19 ? 'light' : 'dark'); } applySkin(); paintCards(); closeMenu(); return; } pick(m.dataset.maTh); return; }
    const c = t.closest('.v22-theme-cards [data-pick]'); if (c && c.dataset.pick !== 'auto') { e.preventDefault(); e.stopImmediatePropagation(); pick(c.dataset.pick); return; }
    if (c && c.dataset.pick === 'auto') { try { localStorage.removeItem(KEY); } catch (er) {} setTimeout(() => { applySkin(); paintCards(); }, 30); return; }
    if (!t.closest('#ma-th-menu')) closeMenu();
  }, true);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });
  addEventListener('ma:theme', () => { applySkin(); setTimeout(paintCards, 30); });
  addEventListener('hashchange', closeMenu);
  let q = false;
  new MutationObserver(() => { if (q) return; q = true; requestAnimationFrame(() => { q = false; const c = document.querySelector('.v22-theme-cards'); if (c && !c.querySelector('[data-pick="ivory"]')) paintCards(); }); }).observe(document.documentElement, { childList: true, subtree: true });
  applySkin();
  window.MA_SKIN = { pick, current, openMenu, THEMES };
})();
