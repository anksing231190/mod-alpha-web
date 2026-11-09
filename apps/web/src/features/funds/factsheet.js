/* ==========================================================================
   Feature: printable fund factsheet (fund page → "Factsheet")
   A one-page A4 summary of a fund: key numbers, 5-year NAV chart, returns vs the category average, this
   month's SIP date (or "with Pro"), health score, risk and the required disclaimers. Sections can be left
   out; "Save as PDF / Print" prints only the sheet (the browser's print dialog offers Save as PDF);
   "Share on WhatsApp" sends a short text summary with a link.
   Styles: src/styles/ux.css (screen + @media print)
   ========================================================================== */
(function () {
  const T = (s) => (window.MA_T ? MA_T(s) : s);
  const opts = { chart: true, ret: true, sip: true, hs: true, name: false };
  let fund = null;
  const ord = (d) => d + (d % 10 === 1 && d !== 11 ? 'st' : d % 10 === 2 && d !== 12 ? 'nd' : d % 10 === 3 && d !== 13 ? 'rd' : 'th');
  const pct = (v) => (v == null || isNaN(v) ? '—' : `${(+v).toFixed(1)}%`);

  function button(id) { return `<button type="button" class="v22-outline-btn ma-fs-btn" data-ma-fs="${esc(id)}">${ic('file')}<span>${T('Factsheet')}</span></button>`; }

  function series(f) {
    if (typeof v22DetailSeries === 'function') { try { const v = v22DetailSeries(f, '5Y'); if (v && v.length > 3) return v; } catch (e) {} }
    return [];
  }
  function sheet(f) {
    const all = (typeof D !== 'undefined' && D.funds) || [], peers = all.filter((x) => x.category === f.category);
    const avg = (k) => { const v = peers.map((x) => x.returns && x.returns[k]).filter((x) => x != null); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };
    const n = typeof V22D !== 'undefined' && V22D.model && V22D.model.navBy ? V22D.model.navBy[f.id] : null, nav = n && n.v.length ? n.v[n.v.length - 1] : f.nav;
    const asOf = typeof maAsOf === 'function' ? maAsOf() : '';
    const s = series(f), mn = Math.min(...s), mx = Math.max(...s);
    const pts = s.map((v, i) => `${(i / (s.length - 1) * 560).toFixed(1)},${(130 - (v - mn) / (mx - mn || 1) * 118).toFixed(1)}`).join(' ');
    let sip = '';
    if (typeof v22ThisMonth === 'function') { const tm = v22ThisMonth(), sp = v22SipFor(tm.y, tm.m), mon = new Date(tm.y, tm.m, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }); if (sp) sip = sp.locked ? `<b class="big">${T('Available with Pro')}</b><div class="muted">${T('Subscribers see the date and two backup dates.')}</div>` : `<b class="big">${ord(sp.day)} ${mon.split(' ')[0]}</b><div class="pos">+${(+sp.uplift).toFixed(1)}% ${T('vs a fixed date (backtest)')}</div>${sp.alts && sp.alts.length ? `<div class="muted">${T('Backup dates')}: ${sp.alts.map((a) => ord(a[0])).join(', ')}</div>` : ''}`; sip = sip ? `<h5>${T('SIP date')} · ${mon}</h5>${sip}` : ''; }
    const h = window.MA_FUNDX ? MA_FUNDX.health(f) : null;
    const who = opts.name && typeof currentUser !== 'undefined' && currentUser.name ? `${T('Prepared for')} ${esc(currentUser.name)}` : 'modalpha.in';
    return `<div class="ma-fs-paper" id="ma-fs-paper">
      <div class="ph"><div class="brand"><i>α</i>Mod Alpha</div><div class="right">${T('Fund factsheet')}${asOf ? ` · ${T('NAV as of')} ${asOf}` : ''}<br>${who}</div></div>
      <div class="id">${typeof v22FundLogo === 'function' ? v22FundLogo(f) : ''}<div><h4>${esc(f.name)}</h4><div class="tags">${[f.type, f.category, f.riskLabel || f.risk ? `${f.riskLabel || f.risk} ${T('risk')}` : '', f.benchmark && f.benchmark !== '—' ? `${T('Benchmark')}: ${f.benchmark}` : ''].filter(Boolean).map((x) => `<span>${esc(x)}</span>`).join('')}</div></div></div>
      <div class="kp"><div><small>NAV</small><b>${nav ? '₹' + (+nav).toFixed(2) : '—'}</b></div><div><small>5Y CAGR</small><b class="pos">${pct(f.returns[5])}</b></div><div><small>AUM</small><b>${esc(f.aum || '—')}</b></div><div><small>${T('Expense ratio')}</small><b>${f.expense != null ? (+f.expense).toFixed(2) + '%' : '—'}</b></div></div>
      ${opts.chart && s.length ? `<div class="box"><h5>NAV · ${T('last 5 years')}</h5><svg viewBox="0 0 560 140" preserveAspectRatio="none"><polygon points="0,140 ${pts} 560,140" fill="rgba(79,70,229,.08)"/><polyline points="${pts}" fill="none" stroke="#4f46e5" stroke-width="2"/></svg><div class="muted">${T('Low')} ₹${mn.toFixed(2)} · ${T('High')} ₹${mx.toFixed(2)}</div></div>` : ''}
      ${opts.ret ? `<table><tr><th>${T('Returns')}</th><th>1Y</th><th>3Y</th><th>5Y</th><th>10Y</th></tr><tr><td>${T('This fund')}</td>${[1, 3, 5, 10].map((k) => `<td>${pct(f.returns[k])}</td>`).join('')}</tr><tr><td>${T('Category average')} (${esc(f.category)})</td>${[1, 3, 5, 10].map((k) => `<td>${pct(avg(k))}</td>`).join('')}</tr></table>` : ''}
      <div class="two">${opts.sip && sip ? `<div class="box">${sip}</div>` : ''}${opts.hs && h ? `<div class="box"><h5>${T('Health score')}</h5><b class="big">${h.score} / 100 · ${T(h.label)}</b><div class="muted">${T('Returns')} ${h.parts.ret} · ${T('Stability')} ${h.parts.calm} · ${T('Consistency')} ${h.parts.steady}</div></div>` : ''}</div>
      <div class="foot">${T('Mutual fund investments are subject to market risks; read all scheme-related documents carefully. Past performance does not guarantee future returns. Mod Alpha provides research and SIP-date insights only and does not execute transactions or hold money. Data: AMFI and AMC disclosures.')} ${T('Generated')} ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}.</div></div>`;
  }
  function open(id) {
    fund = (typeof D !== 'undefined' ? D.funds.find((x) => x.id === id) : null); if (!fund) return;
    close();
    const m = document.createElement('div'); m.className = 'ma-fs-modal'; m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true'); m.setAttribute('aria-label', T('Fund factsheet'));
    m.innerHTML = `<div class="ma-fs-shell"><div class="ma-fs-view" id="ma-fs-view">${sheet(fund)}</div>
      <aside class="ma-fs-side"><div class="ma-fs-sidehead"><b>${T('Factsheet')}</b><button type="button" class="ma-cmp-x" data-ma-fs-close aria-label="${esc(T('Close'))}">×</button></div>
        <p class="ma-fs-hint">${T('Include')}</p>${[['chart', 'NAV chart'], ['ret', 'Returns table'], ['sip', 'This month’s SIP date'], ['hs', 'Health score'], ['name', 'Your name on the page']].map(([k, l]) => `<label class="ma-fs-opt"><input type="checkbox" data-ma-fs-opt="${k}" ${opts[k] ? 'checked' : ''}> ${T(l)}</label>`).join('')}
        <button type="button" class="v22-grad-btn" data-ma-fs-print>${ic('download')} ${T('Save as PDF / Print')}</button>
        <button type="button" class="v22-outline-btn" data-ma-fs-wa>${ic('msg')} ${T('Share on WhatsApp')}</button>
        <p class="ma-fs-note">${T('In the print window choose “Save as PDF” as the printer.')}</p></aside></div>`;
    document.body.appendChild(m); m.querySelector('[data-ma-fs-print]').focus();
  }
  function close() { document.querySelector('.ma-fs-modal')?.remove(); document.body.classList.remove('ma-fs-printing'); }
  function share() {
    const f = fund; if (!f) return;
    const txt = `${f.name}: 5Y CAGR ${pct(f.returns[5])}, 3Y ${pct(f.returns[3])}, 1Y ${pct(f.returns[1])}. ${T('See its SIP date and health score on Mod Alpha')}: ${location.origin}${location.pathname}#/user/fund/${encodeURIComponent(f.id)}`;
    const a = document.createElement('a'); a.href = 'https://wa.me/?text=' + encodeURIComponent(txt); a.target = '_blank'; a.rel = 'noopener'; document.body.appendChild(a); a.click(); a.remove();
  }
  document.addEventListener('click', (e) => {
    const t = e.target; if (!t.closest) return;
    const b = t.closest('[data-ma-fs]'); if (b) { open(b.dataset.maFs); return; }
    if (!t.closest('.ma-fs-modal')) return;
    if (t.closest('[data-ma-fs-close]') || t.classList.contains('ma-fs-modal')) { close(); return; }
    if (t.closest('[data-ma-fs-print]')) { document.body.classList.add('ma-fs-printing'); setTimeout(() => { window.print(); setTimeout(() => document.body.classList.remove('ma-fs-printing'), 300); }, 50); return; }
    if (t.closest('[data-ma-fs-wa]')) share();
  });
  document.addEventListener('change', (e) => { const o = e.target.closest && e.target.closest('[data-ma-fs-opt]'); if (o && fund) { opts[o.dataset.maFsOpt] = o.checked; document.getElementById('ma-fs-view').innerHTML = sheet(fund); } });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && document.querySelector('.ma-fs-modal')) close(); });
  addEventListener('hashchange', close);

  window.MA_FACTSHEET = { button, open };
})();
