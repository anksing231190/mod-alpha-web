/* ==========================================================================
   Feature: fund page breadcrumbs + sticky fund bar
   • crumbs(f): "Explore Funds › Equity › Small Cap › <fund>" above the fund title. The middle steps open
     Explore Funds already filtered to that asset class / category.
   • bar(f): a slim bar (logo, name, latest NAV and its daily change, 5Y CAGR, this month's SIP date, watchlist
     button) that slides in under the top bar once the fund title scrolls out of view.
   Styles: src/styles/ux.css
   ========================================================================== */
(function () {
  const T = (s) => (window.MA_T ? MA_T(s) : s);
  const ord = (d) => d + (d % 10 === 1 && d !== 11 ? 'st' : d % 10 === 2 && d !== 12 ? 'nd' : d % 10 === 3 && d !== 13 ? 'rd' : 'th');

  function crumbs(f) {
    const step = (label, attr) => `<a href="#/user/funds" ${attr}>${esc(T(label))}</a><span aria-hidden="true">›</span>`;
    return `<nav class="ma-crumbs" aria-label="${esc(T('Breadcrumb'))}">${step('Explore Funds', 'data-ma-crumb="All"')}${f.type ? step(f.type, `data-ma-crumb="${esc(f.type)}"`) : ''}${f.category && f.category !== f.type ? step(f.category, `data-ma-crumb="${esc(f.category)}"`) : ''}<b aria-current="page">${esc(f.short || f.name)}</b></nav>`;
  }
  /** Latest NAV and the change from the previous NAV (dataset), or the fund's NAV only. */
  function nav(f) {
    const n = typeof V22D !== 'undefined' && V22D.model && V22D.model.navBy ? V22D.model.navBy[f.id] : null;
    if (n && n.v.length > 1) { const L = n.v.length - 1; return { v: n.v[L], ch: (n.v[L] / n.v[L - 1] - 1) * 100, d: n.d[L] }; }
    return f.nav ? { v: f.nav, ch: null, d: f.navDate || null } : null;
  }
  function bar(f) {
    const nv = nav(f), r5 = f.returns && f.returns[5];
    let sip = '';
    if (typeof v22ThisMonth === 'function' && typeof v22SipFor === 'function') {
      const tm = v22ThisMonth(), sp = v22SipFor(tm.y, tm.m);
      if (sp) sip = sp.locked ? `<a class="ma-fb-chip lock" href="#/user/subscription">${ic('lock')} ${T('SIP date with Pro')}</a>` : `<span class="ma-fb-chip ai">✦ ${T('Best SIP date')} · ${ord(sp.day)}</span>`;
    }
    return `<div class="ma-fundbar" id="ma-fundbar" aria-hidden="true" inert>
      ${typeof v22FundIcon === 'function' ? `<span class="ma-fb-logo">${v22FundIcon(f)}</span>` : ''}<b class="ma-fb-name">${esc(f.short || f.name)}</b>
      ${nv ? `<span class="ma-fb-chip">${T('NAV')} ₹${nv.v.toFixed(2)}${nv.ch != null ? ` <em class="${nv.ch >= 0 ? 'up' : 'down'}">${nv.ch >= 0 ? '▲' : '▼'} ${Math.abs(nv.ch).toFixed(2)}%</em>` : ''}</span>` : ''}
      ${r5 != null ? `<span class="ma-fb-chip">5Y CAGR <em class="up">${r5.toFixed(1)}%</em></span>` : ''}
      ${sip}<span class="ma-fb-gap"></span>${window.MA_WATCH ? MA_WATCH.button(f.id, 'sm') : ''}
      <button type="button" class="ma-fb-top" data-ma-fb-top aria-label="${esc(T('Back to top'))}" title="${esc(T('Back to top'))}">${ic('chevUp')}</button></div>`;
  }

  /* ---------- show the bar when the title has scrolled away ---------- */
  let raf = 0;
  function place() {
    raf = 0;
    const h = document.querySelector('.v22-detail-head');
    // the page container is animated (transform), which would trap a fixed bar: move the newest bar to <body>
    const fresh = document.querySelector('.v22-detail #ma-fundbar');
    if (fresh) { document.querySelectorAll('body > .ma-fundbar').forEach((x) => x.remove()); document.body.appendChild(fresh); }
    const b = document.querySelector('body > .ma-fundbar');
    if (b && !h) { b.remove(); return; }
    if (!b || !h) return;
    const top = document.querySelector('.workspace-topbar'), main = document.querySelector('.main-area');
    // the top bar can slide away while scrolling: the fund bar then sits at the very top
    const z = parseFloat(getComputedStyle(document.documentElement).zoom) || 1; // rects are zoomed (85%), style values are not
    const tb = Math.max(0, top ? top.getBoundingClientRect().bottom : 0) / z, ml = (main ? main.getBoundingClientRect().left : 0) / z;
    b.style.top = tb + 'px'; b.style.left = ml + 'px';
    const show = h.getBoundingClientRect().bottom / z < tb + 4;
    if (show !== b.classList.contains('on')) { b.classList.toggle('on', show); b.setAttribute('aria-hidden', String(!show)); b.inert = !show; }
  }
  const queue = () => { if (!raf) raf = requestAnimationFrame(place); };
  window.addEventListener('scroll', queue, { passive: true, capture: true });
  window.addEventListener('resize', queue, { passive: true });
  window.addEventListener('hashchange', queue);
  new MutationObserver(() => { if (document.getElementById('ma-fundbar')) queue(); }).observe(document.documentElement, { childList: true, subtree: true });

  document.addEventListener('click', (e) => {
    const c = e.target.closest && e.target.closest('[data-ma-crumb]');
    if (c) { e.preventDefault(); if (typeof filters !== 'undefined') { filters.q = ''; filters.category = 'All'; } if (typeof v22Chip !== 'undefined') { v22Chip = c.dataset.maCrumb; v22Page = 1; } go('user/funds'); return; }
    if (e.target.closest && e.target.closest('[data-ma-fb-top]')) { const s = document.scrollingElement; window.scrollTo({ top: 0, behavior: 'smooth' }); if (s) s.scrollTo({ top: 0, behavior: 'smooth' }); document.querySelector('.main-area')?.scrollTo?.({ top: 0, behavior: 'smooth' }); }
  });

  window.MA_FUNDBAR = { crumbs, bar };
})();
