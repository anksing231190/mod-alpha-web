/* Mod Alpha — theme switcher (Dark "Midnight" / Light "Sand").
   • Adds a sun/moon toggle to the public top bar and the app top bar.
   • Wires the Appearance cards in Settings → Preferences.
   • Re-colours charts drawn at runtime (SVG fill/stroke/stop-color and legend dots)
     with the same palette that generated theme-light.css (js/theme-palette.js).
   The choice is stored in localStorage ('mod-alpha-theme') and applied before first paint
   by the inline snippet in index.html. */
(function () {
  const P = window.MA_PALETTE;
  const html = document.documentElement;
  const isLight = () => html.dataset.theme === 'light';
  const ATTRS = ['fill', 'stroke', 'stop-color'];
  const SUN = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4.2" fill="currentColor"/><path d="M12 2.5v2.2M12 19.3v2.2M4.6 4.6l1.6 1.6M17.8 17.8l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.6 19.4l1.6-1.6M17.8 6.2l1.6-1.6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
  const MOON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.2 14.6A8.4 8.4 0 0 1 9.4 3.8a8.4 8.4 0 1 0 10.8 10.8Z" fill="currentColor"/></svg>';

  /* ---------- runtime chart recolouring ---------- */
  const isChartSvg = (svg) => {
    if (svg.closest('[class*="-ic"],[class*="icon"],.brand,.v22-logo')) return false;
    const vb = (svg.getAttribute('viewBox') || '').split(/[\s,]+/).map(Number);
    return (vb[2] || svg.clientWidth || 0) > 64;
  };
  function mapAttr(el, attr, val) {
    if (!/^#|^rgb/i.test(val)) return val;
    const accent = P.isAccent(val);
    if (accent) return P.mapColor(val, 'chart');
    const c = P.parse(val);
    if (!c) return val;
    if (attr === 'stroke' && c[3] < 0.7) return P.mapColor(val, 'border');
    if (el.tagName.toLowerCase() === 'text' || attr === 'stroke') return P.mapColor(val, 'text');
    return P.mapColor(val, 'text', { keepWhite: true });
  }
  function paintSvg(svg, light) {
    svg.querySelectorAll('[fill],[stroke],[stop-color]').forEach((el) => {
      for (const a of ATTRS) {
        if (!el.hasAttribute(a) && !el.hasAttribute(`data-dk-${a}`)) continue;
        const key = `data-dk-${a}`;
        if (light) {
          const orig = el.getAttribute(key) ?? el.getAttribute(a);
          if (el.getAttribute(key) === null) el.setAttribute(key, orig);
          el.setAttribute(a, mapAttr(el, a, orig));
        } else if (el.hasAttribute(key)) { el.setAttribute(a, el.getAttribute(key)); el.removeAttribute(key); }
      }
    });
  }
  const VARS = ['--glow', '--fund-color', '--c'];
  function paintVars(el, light) {
    for (const v of VARS) {
      if (v === '--c' && el.tagName !== 'I') continue;   // legend dots only; icon tiles keep their colours
      const key = `data-dk${v.replace(/-/g, '_')}`;
      const cur = el.style.getPropertyValue(v);
      if (!cur && !el.hasAttribute(key)) continue;
      if (light) { const orig = el.getAttribute(key) ?? cur.trim(); el.setAttribute(key, orig); el.style.setProperty(v, P.mapColor(orig, 'chart')); }
      else if (el.hasAttribute(key)) { el.style.setProperty(v, el.getAttribute(key)); el.removeAttribute(key); }
    }
    // legend swatches painted with inline background (e.g. <i style="background:#3b82f6">)
    if (el.tagName === 'I' && el.style.background && !el.closest('[class*="-ic"]')) {
      const key = 'data-dk-bg';
      if (light) { const orig = el.getAttribute(key) ?? el.style.background; el.setAttribute(key, orig); el.style.background = P.mapValue(orig, 'chart'); }
      else if (el.hasAttribute(key)) { el.style.background = el.getAttribute(key); el.removeAttribute(key); }
    }
  }
  function paint(rootEl) {
    const light = isLight();
    const r = rootEl || document.body;
    if (!r.querySelectorAll) return;
    const svgs = r.tagName === 'svg' ? [r] : r.querySelectorAll('svg');
    svgs.forEach((svg) => { if (isChartSvg(svg)) paintSvg(svg, light); });
    const styled = r.querySelectorAll('[style*="--glow"],[style*="--fund-color"],i[style*="--c"],i[style*="background"]');
    styled.forEach((el) => paintVars(el, light));
  }

  /* ---------- toggle button ---------- */
  function toggleHtml() {
    const light = isLight();
    return `<button type="button" class="ma-theme-toggle" data-theme-toggle data-next="${light ? 'dark' : 'light'}" aria-label="Switch to ${light ? 'dark' : 'light'} theme" title="Switch to ${light ? 'dark (Midnight)' : 'light (Sand)'} theme">${light ? MOON : SUN}</button>`;
  }
  function ensureToggles() {
    const spots = document.querySelectorAll('.workspace-actions, .topbar .top-actions');
    spots.forEach((s) => {
      const existing = s.querySelector(':scope > [data-theme-toggle]');
      if (existing) {
        const want = isLight() ? 'dark' : 'light';
        if (existing.dataset.next !== want) existing.outerHTML = toggleHtml();   // only when the theme changed
        return;
      }
      s.insertAdjacentHTML('afterbegin', toggleHtml());
    });
    // Settings → Preferences → Appearance cards
    const cards = document.querySelector('.v22-theme-cards');
    if (cards && !cards.dataset.wired) {
      cards.dataset.wired = '1';
      cards.innerHTML = `
        <label class="v22-theme" data-pick="dark"><input type="radio" name="v22-theme" value="dark"><span class="v22-theme-prev dark"><i></i><i></i><i></i></span><b>Midnight</b><small>Dark — the original theme</small></label>
        <label class="v22-theme" data-pick="light"><input type="radio" name="v22-theme" value="light"><span class="v22-theme-prev light"><i></i><i></i><i></i></span><b>Sand</b><small>Light — beige &amp; cream</small></label>`;
      const sel = document.getElementById('theme-select');
      if (sel && !sel.querySelector('option[value=light]')) sel.insertAdjacentHTML('beforeend', '<option value="light">Light</option>');
    }
    if (cards) cards.querySelectorAll('.v22-theme').forEach((l) => {
      const on = l.dataset.pick === (isLight() ? 'light' : 'dark');
      l.classList.toggle('on', on); l.classList.remove('off');
      const inp = l.querySelector('input'); if (inp) { inp.checked = on; inp.disabled = false; }
    });
    const hint = document.querySelector('.settings-hint');
    if (hint && /Light theme is temporarily unavailable/.test(hint.textContent)) hint.textContent = 'Choose Midnight (dark) or Sand (light).';
  }
  function setThemeAndRepaint(t) {
    if (typeof window.setTheme === 'function') window.setTheme(t);
    else { html.dataset.theme = t; try { localStorage.setItem('mod-alpha-theme', t); } catch (e) {} }
  }

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-theme-toggle]');
    if (btn) { e.preventDefault(); setThemeAndRepaint(isLight() ? 'dark' : 'light'); return; }
    const pick = e.target.closest('.v22-theme-cards [data-pick]');
    if (pick) { e.preventDefault(); setThemeAndRepaint(pick.dataset.pick); if (window.toast) try { window.toast(`${pick.dataset.pick === 'light' ? 'Sand (light)' : 'Midnight (dark)'} theme applied`); } catch (err) {} }
  });

  window.addEventListener('ma:theme', () => { html.classList.add('ma-theme-anim'); paint(); ensureToggles(); setTimeout(() => html.classList.remove('ma-theme-anim'), 450); });

  let queued = false;
  const mo = new MutationObserver((muts) => {
    if (isLight()) for (const m of muts) m.addedNodes.forEach((n) => { if (n.nodeType === 1) paint(n); });
    else for (const m of muts) m.addedNodes.forEach((n) => { if (n.nodeType === 1 && n.querySelector && n.querySelector('[data-dk-fill],[data-dk-stroke]')) paint(n); });
    if (!queued) { queued = true; requestAnimationFrame(() => { queued = false; ensureToggles(); }); }
  });
  const start = () => { mo.observe(document.body, { childList: true, subtree: true }); paint(); ensureToggles(); };
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
  window.MA_THEME = { isLight, set: setThemeAndRepaint, repaint: paint };
})();
