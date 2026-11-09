/* ==========================================================================
   Feature: My Watchlist page (#/user/watchlist)
   Every fund the person starred, in one list: logo, name, health score, 1Y / 5Y return, this month's SIP
   date (or the lock for the Free plan), View and Remove. Empty: the α mark with a link to Explore Funds.
   The list comes from MA_WATCH (features/funds/watchlist.js); the page redraws when it changes.
   Styles: src/styles/ux.css
   ========================================================================== */
(function () {
  const T = (s) => (window.MA_T ? MA_T(s) : s);
  const ord = (d) => d + (d % 10 === 1 && d !== 11 ? 'st' : d % 10 === 2 && d !== 12 ? 'nd' : d % 10 === 3 && d !== 13 ? 'rd' : 'th');

  function page() {
    const ids = window.MA_WATCH ? MA_WATCH.list() : [];
    const funds = ids.map((id) => (typeof D !== 'undefined' ? D.funds.find((f) => f.id === id) : null)).filter(Boolean);
    let sip = '';
    if (typeof v22ThisMonth === 'function') { const tm = v22ThisMonth(), sp = v22SipFor(tm.y, tm.m); if (sp) sip = sp.locked ? `<a class="ma-fb-chip lock" href="#/user/subscription">${ic('lock')} ${T('SIP date with Pro')}</a>` : `<span class="ma-fb-chip ai">✦ ${T('Best SIP date')} · ${ord(sp.day)}</span>`; }
    const pct = (v) => (v == null ? '—' : `${v >= 0 ? '+' : ''}${(+v).toFixed(1)}%`);
    const head = `<header class="v22-title"><h1>${T('My Watchlist')}</h1><p>${T('Funds you are following. Their SIP date and health score in one place.')}</p></header>`;
    if (!funds.length) return `<div class="v22 ma-watch-page">${head}${window.MA_EMPTY ? MA_EMPTY.html({ title: 'Your watchlist is empty', text: 'Open a fund and tap “Add to Watchlist”. It will show up here with its SIP date and health score.', action: ['Explore funds', '#/user/funds'] }) : ''}</div>`;
    return `<div class="v22 ma-watch-page">${head}
      <div class="ma-wl-bar"><span>${funds.length} ${T(funds.length === 1 ? 'fund' : 'funds')}</span>${sip}${funds.length >= 2 && window.MA_FUNDX ? `<button type="button" class="v22-outline-btn" data-ma-wl-compare>${ic('layers')} ${T('Compare these')}</button>` : ''}</div>
      <div class="v22-fund-list ma-wl-list">${funds.map((f) => `<article class="v22-fund-row ma-wl-row">
        <div class="v22-fund-id">${v22FundIcon(f)}<div><b>${esc(f.name)}</b>${v22Tags(f)}</div></div>
        <div class="ma-wl-ret"><small>1Y</small><b class="${(f.returns[1] ?? 0) >= 0 ? 'pos' : 'neg'}">${pct(f.returns[1])}</b></div>
        <div class="ma-wl-ret"><small>5Y CAGR</small><b class="pos">${pct(f.returns[5])}</b></div>
        <div class="ma-wl-hs">${window.MA_FUNDX ? MA_FUNDX.gauge(f) : ''}</div>
        <div class="ma-wl-act"><button type="button" class="v22-view" data-fund="${esc(f.id)}">${T('View')} ${ic('arrowR')}</button><button type="button" class="ma-wl-x" data-ma-watch="${esc(f.id)}" aria-label="${esc(T('Remove'))} ${esc(f.short || f.name)}" title="${esc(T('Remove from watchlist'))}">${ic('x')}</button></div>
      </article>`).join('')}</div>
      <p class="v22-note">${T('Past performance does not guarantee future returns.')}</p></div>`;
  }
  // redraw when the list changes while the page is open
  function refresh() { if (/^#\/user\/watchlist\b/.test(location.hash) && typeof renderUser === 'function') renderUser('watchlist'); }
  document.addEventListener('click', (e) => { if (e.target.closest && e.target.closest('[data-ma-wl-compare]') && window.MA_FUNDX) MA_FUNDX.compare(MA_WATCH.list().slice(0, 3)); });

  window.maWatchlistPage = page;
  window.maWatchlistRefresh = refresh;
})();
