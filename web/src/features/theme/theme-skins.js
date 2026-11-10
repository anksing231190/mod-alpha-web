/* ==========================================================================
   Feature: theme picker — three looks
     Midnight  (dark, the original)                         data-theme="dark"
     Sand      (cream & beige)                              data-theme="light"
     Espresso  (DEFAULT for new visitors — Sand's cream pages, brown sidebar, top bar,  data-theme="light" data-skin="duo"   → theme-skins.css
                footer and phone tab bar)
     Graphite  (charcoal sidebar / top bar, white pages;  theme-graphite.generated.css)         data-theme="light" data-skin="slate"
   The skin is stored in localStorage 'mod-alpha-skin' (applied before first paint by index.html).
   The sun/moon button in the top bar opens this picker; Settings → Appearance shows the three as cards.
   The earlier "Auto" (clock) and "Ivory" options were removed; a saved Auto/Ivory choice falls back to Sand.
   ========================================================================== */
(function () {
  const html = document.documentElement, KEY = 'mod-alpha-skin';
  const T = (s) => (window.MA_T ? MA_T(s) : s);
  const THEMES = [
    { id: 'dark', name: 'Midnight', desc: 'Dark, the original', sw: ['#080b18', '#141d3d', '#6366f1'] },
    { id: 'light', name: 'Sand', desc: 'Cream & beige', sw: ['#f4ecdd', '#fffaf1', '#9c5f2a'] },
    { id: 'duo', name: 'Espresso', desc: 'Cream pages, brown sidebar', sw: ['#1e1813', '#f4ecdd', '#c08548'] },
    { id: 'slate', name: 'Graphite', desc: 'Charcoal & white', sw: ['#1f2227', '#ffffff', '#4a5a72'] },
  ];
  const META = { dark: '#080b18', light: '#f4ecdd', duo: '#1e1813', slate: '#1f2227' };
  const SKINS = ['duo', 'slate'];
  // retire the removed options
  try { if (localStorage.getItem(KEY) && !SKINS.includes(localStorage.getItem(KEY))) localStorage.removeItem(KEY); localStorage.removeItem('mod-alpha-theme-auto'); } catch (e) {}
  if (window.MA_THEME && MA_THEME.setAuto) MA_THEME.setAuto(false);
  const skin = () => { try { const v = localStorage.getItem(KEY); return SKINS.includes(v) ? v : ''; } catch (e) { return ''; } };
  const current = () => (html.dataset.theme === 'light' ? (skin() || 'light') : 'dark');
  function applySkin() {
    const s = html.dataset.theme === 'light' ? skin() : '';
    if (s) html.dataset.skin = s; else delete html.dataset.skin;
    const m = document.querySelector('meta[name=theme-color]'); if (m) m.content = META[current()];
  }
  function pick(id) {
    try { if (SKINS.includes(id)) localStorage.setItem(KEY, id); else localStorage.removeItem(KEY); } catch (e) {}
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
    const cur = current();
    const el = document.createElement('div'); el.id = 'ma-th-menu'; el.className = 'ma-th-menu'; el.setAttribute('role', 'menu');
    el.innerHTML = `<b class="ma-th-h">${T('Theme')}</b>${THEMES.map((t) => `<button type="button" role="menuitemradio" aria-checked="${cur === t.id}" class="${cur === t.id ? 'on' : ''}" data-ma-th="${t.id}">${swatch(t)}<span><b>${T(t.name)}</b><small>${T(t.desc)}</small></span>${cur === t.id ? ic('check') : ''}</button>`).join('')}`;
    document.body.appendChild(el);
    const z = parseFloat(getComputedStyle(html).zoom) || 1, r = anchor.getBoundingClientRect();
    const w = el.offsetWidth, left = Math.max(8, Math.min(innerWidth / z - w - 8, r.right / z - w));
    el.style.left = left + 'px'; el.style.top = (r.bottom / z + 8) + 'px';
    el.querySelector('.on, button')?.focus();
  }

  /* ---------- Settings → Appearance: Midnight, Sand, Espresso ---------- */
  function paintCards() {
    const cards = document.querySelector('.v22-theme-cards'); if (!cards) return;
    cards.querySelectorAll('[data-pick="auto"],[data-pick="ivory"]').forEach((x) => x.remove());
    THEMES.slice(2).forEach((t) => { if (!cards.querySelector(`[data-pick="${t.id}"]`)) cards.insertAdjacentHTML('beforeend', `<label class="v22-theme" data-pick="${t.id}"><input type="radio" name="v22-theme" value="${t.id}"><span class="v22-theme-prev ${t.id}"><i></i><i></i><i></i></span><b>${T(t.name)}</b><small>${T(t.desc)}</small></label>`); });
    const cur = current();
    cards.querySelectorAll('.v22-theme').forEach((l) => { const on = l.dataset.pick === cur; l.classList.toggle('on', on); const i = l.querySelector('input'); if (i) i.checked = on; });
  }

  // capture phase: runs before theme.js's own toggle / card handlers
  window.addEventListener('click', (e) => {
    const t = e.target; if (!t.closest) return;
    const tg = t.closest('[data-theme-toggle]'); if (tg) { e.preventDefault(); e.stopImmediatePropagation(); if (document.getElementById('ma-th-menu')) closeMenu(); else openMenu(tg); return; }
    const m = t.closest('[data-ma-th]'); if (m) { e.preventDefault(); e.stopImmediatePropagation(); pick(m.dataset.maTh); return; }
    const c = t.closest('.v22-theme-cards [data-pick]'); if (c) { e.preventDefault(); e.stopImmediatePropagation(); pick(c.dataset.pick); return; }
    if (!t.closest('#ma-th-menu')) closeMenu();
  }, true);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });
  addEventListener('ma:theme', () => { applySkin(); setTimeout(paintCards, 30); });
  addEventListener('hashchange', closeMenu);
  let q = false;
  new MutationObserver(() => { if (q) return; q = true; requestAnimationFrame(() => { q = false; const c = document.querySelector('.v22-theme-cards'); if (c && (!c.querySelector('[data-pick="slate"]') || c.querySelector('[data-pick="auto"]'))) paintCards(); }); }).observe(document.documentElement, { childList: true, subtree: true });
  applySkin();
  window.MA_SKIN = { pick, current, openMenu, THEMES };
})();
