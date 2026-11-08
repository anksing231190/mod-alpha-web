/* ==========================================================================
   Feature: sparkline hover card (Explore Funds)
   Hovering (or focusing / tapping) a fund's mini chart opens a card with its 1-year NAV line and the high,
   the low and today's NAV, each with its date. Without NAV data (sample mode) it shows the shape only.
   Styles: src/styles/ux.css
   ========================================================================== */
(function () {
  const T = (s) => (window.MA_T ? MA_T(s) : s);
  let card = null, hideT = 0;
  function data(f) {
    const n = typeof V22D !== 'undefined' && V22D.model && V22D.model.navBy ? V22D.model.navBy[f.id] : null;
    if (n && n.v.length > 30 && typeof v22NavAt === 'function') {
      const L = n.v.length - 1, j = Math.max(0, v22NavAt(n, v22AddY(n.d[L], 1))), idx = v22Sample(n, j, L, 80);
      return { v: idx.map((k) => n.v[k]), d: idx.map((k) => n.d[k]), real: true };
    }
    const v = typeof v22FundSpark === 'function' ? v22FundSpark(f, 0) : [];
    return { v, d: v.map(() => null), real: false };
  }
  function html(f) {
    const { v, d, real } = data(f); if (v.length < 2) return '';
    const W = 300, H = 110, mn = Math.min(...v), mx = Math.max(...v), X = (i) => i / (v.length - 1) * W, Y = (x) => 8 + (1 - (x - mn) / (mx - mn || 1)) * (H - 16);
    const hi = v.indexOf(mx), lo = v.indexOf(mn), L = v.length - 1, up = v[L] >= v[0];
    const pts = v.map((x, i) => `${X(i).toFixed(1)},${Y(x).toFixed(1)}`).join(' ');
    const fmtD = (s) => (s && typeof v22Fmt === 'function' ? v22Fmt(s) : '');
    const val = (x) => (real ? '₹' + x.toFixed(2) : '');
    const chg = (v[L] / v[0] - 1) * 100;
    return `<div class="ma-spc-head"><b>${esc(f.short || f.name)}</b><span class="${up ? 'up' : 'down'}">${up ? '▲' : '▼'} ${Math.abs(chg).toFixed(1)}% · ${T('1 year')}</span></div>
      <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="maSpcG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${up ? '#34d399' : '#fb7185'}" stop-opacity=".35"/><stop offset="1" stop-color="${up ? '#34d399' : '#fb7185'}" stop-opacity="0"/></linearGradient></defs>
      <polygon points="0,${H} ${pts} ${W},${H}" fill="url(#maSpcG)"/><polyline points="${pts}" fill="none" stroke="${up ? '#34d399' : '#fb7185'}" stroke-width="2.2" vector-effect="non-scaling-stroke"/>
      <circle cx="${X(hi)}" cy="${Y(mx)}" r="4" class="hi"/><circle cx="${X(lo)}" cy="${Y(mn)}" r="4" class="lo"/><circle cx="${X(L)}" cy="${Y(v[L])}" r="4.5" class="now"/></svg>
      ${real ? `<div class="ma-spc-stats"><div><small>${T('High')}</small><b class="hi">${val(mx)}</b><em>${fmtD(d[hi])}</em></div><div><small>${T('Low')}</small><b class="lo">${val(mn)}</b><em>${fmtD(d[lo])}</em></div><div><small>${T('Latest')}</small><b>${val(v[L])}</b><em>${fmtD(d[L])}</em></div></div>` : `<p class="ma-spc-note">${T('Illustrative shape (sample data)')}</p>`}`;
  }
  function show(box) {
    const row = box.closest('.v22-fund-row'), id = row && row.querySelector('[data-fund]')?.dataset.fund;
    const f = id && typeof D !== 'undefined' ? D.funds.find((x) => x.id === id) : null; if (!f) return;
    clearTimeout(hideT);
    if (!card) { card = document.createElement('div'); card.className = 'ma-spc'; card.setAttribute('role', 'tooltip'); card.addEventListener('mouseenter', () => clearTimeout(hideT)); card.addEventListener('mouseleave', hide); document.body.appendChild(card); }
    if (card.dataset.id !== id) { card.innerHTML = html(f); card.dataset.id = id; }
    const r = box.getBoundingClientRect(), w = 340;
    let left = r.left + r.width / 2 - w / 2; left = Math.max(12, Math.min(innerWidth - w - 12, left));
    const below = r.bottom + 230 < innerHeight;
    card.style.left = left + 'px'; card.style.top = (below ? r.bottom + 10 : r.top - 10) + 'px'; card.classList.toggle('above', !below);
    card.classList.add('on'); box.setAttribute('aria-describedby', 'ma-spc');
  }
  function hide() { hideT = setTimeout(() => { if (card) { card.classList.remove('on'); card.dataset.id = ''; } }, 120); }
  document.addEventListener('mouseover', (e) => { const b = e.target.closest && e.target.closest('.v22-fund-row .v22-spark-box'); if (b) show(b); });
  document.addEventListener('mouseout', (e) => { const b = e.target.closest && e.target.closest('.v22-fund-row .v22-spark-box'); if (b && !b.contains(e.relatedTarget)) hide(); });
  document.addEventListener('focusin', (e) => { const b = e.target.closest && e.target.closest('.v22-fund-row .v22-spark-box'); if (b) show(b); });
  document.addEventListener('focusout', (e) => { if (e.target.closest && e.target.closest('.v22-fund-row .v22-spark-box')) hide(); });
  document.addEventListener('click', (e) => { const b = e.target.closest && e.target.closest('.v22-fund-row .v22-spark-box'); if (b) show(b); else if (card && !e.target.closest('.ma-spc')) hide(); });
  window.addEventListener('scroll', () => { if (card && card.classList.contains('on')) { card.classList.remove('on'); card.dataset.id = ''; } }, { passive: true, capture: true });
  window.addEventListener('hashchange', () => { if (card) { card.classList.remove('on'); card.dataset.id = ''; } });
})();
