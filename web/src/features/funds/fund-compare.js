/* ==========================================================================
   Feature: fund health score + compare funds (Explore Funds)
   • MA_FUNDX.health(f)  → { score 0–100, label, parts } from 5Y return (vs all funds), volatility / risk and
     how steady the 1Y / 3Y / 5Y returns are. Shown as a small gauge on each fund row and in the compare table.
   • "+ Compare" on each row adds the fund to a tray at the bottom of the screen (up to 3). "Compare now" opens
     a side-by-side table that marks the better value in each row.
   The picks are kept in memory only. Styles: src/styles/ux.css
   ========================================================================== */
(function () {
  const MAX = 3;
  const picks = [];               // fund ids, in the order they were added
  const T = (s) => (window.MA_T ? MA_T(s) : s);
  const funds = () => (typeof D !== 'undefined' && D.funds) || [];
  const byId = (id) => funds().find((f) => f.id === id);

  /* ---------- health score ---------- */
  const RISK = { low: 0.9, 'low to moderate': 0.8, moderate: 0.7, 'moderately high': 0.55, high: 0.45, 'very high': 0.35 };
  const pct = (arr, v) => (arr.length < 2 ? 0.5 : arr.filter((x) => x < v).length / (arr.length - 1));
  function health(f) {
    const all = funds();
    const r5 = f.returns && f.returns[5];
    if (r5 == null) return null;
    const ret = pct(all.map((x) => x.returns && x.returns[5]).filter((x) => x != null), r5);
    const vols = all.map((x) => x.vol).filter((x) => x != null);
    const calm = f.vol != null && vols.length > 2 ? 1 - pct(vols, f.vol) : (RISK[String(f.riskLabel || f.risk || '').toLowerCase()] ?? 0.6);
    const rs = [1, 3, 5].map((k) => f.returns[k]).filter((x) => x != null);
    const mean = rs.reduce((a, b) => a + b, 0) / rs.length, sd = Math.sqrt(rs.reduce((a, b) => a + (b - mean) ** 2, 0) / rs.length);
    const steady = mean > 0 ? Math.max(0, 1 - sd / mean) : 0.3;
    const score = Math.round(Math.max(0, Math.min(100, 10 + 90 * (0.45 * ret + 0.3 * calm + 0.25 * steady))));
    const label = score >= 80 ? 'Strong' : score >= 65 ? 'Good' : score >= 50 ? 'Fair' : 'Weak';
    return { score, label, parts: { ret: Math.round(ret * 100), calm: Math.round(calm * 100), steady: Math.round(steady * 100) } };
  }
  const tone = (s) => (s >= 80 ? 'g' : s >= 65 ? 'c' : s >= 50 ? 'y' : 'r');
  /** Semicircle gauge + score. */
  function gauge(f) {
    const h = health(f); if (!h) return '';
    const a = Math.PI * (1 - h.score / 100), x = 32 + 26 * Math.cos(a), y = 34 - 26 * Math.sin(a);
    const tip = `${T('Health score')} ${h.score}/100 · ${T('Returns')} ${h.parts.ret} · ${T('Stability')} ${h.parts.calm} · ${T('Consistency')} ${h.parts.steady}`;
    return `<div class="ma-hs ${tone(h.score)}" title="${esc(tip)}" aria-label="${esc(tip)}"><svg viewBox="0 0 64 38" aria-hidden="true"><path class="bg" d="M6 34a26 26 0 0 1 52 0"/><path class="fg" d="M6 34a26 26 0 0 1 ${(x - 6).toFixed(1)} ${(y - 34).toFixed(1)}"/><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.6"/></svg><div><b>${h.score}</b><small>${T(h.label)}</small></div></div>`;
  }
  /** Extra cell for a fund row: gauge + compare toggle. */
  function rowExtra(f) {
    const on = picks.includes(f.id);
    return `<div class="ma-fx">${gauge(f)}<button type="button" class="ma-cmp-btn${on ? ' on' : ''}" data-ma-cmp="${esc(f.id)}" aria-pressed="${on}">${on ? '✓ ' + T('Added') : '＋ ' + T('Compare')}</button></div>`;
  }

  /* ---------- tray ---------- */
  function tray() {
    let t = document.getElementById('ma-cmp-tray');
    const show = picks.length > 0 && /^#\/user\/funds\b/.test(location.hash);
    if (!show) { if (t) { t.classList.remove('on'); setTimeout(() => { if (!picks.length || !/^#\/user\/funds\b/.test(location.hash)) t.remove(); }, 300); } return; }
    if (!t) { t = document.createElement('div'); t.id = 'ma-cmp-tray'; t.className = 'ma-cmp-tray'; t.setAttribute('role', 'region'); t.setAttribute('aria-label', T('Compare funds')); document.body.appendChild(t); requestAnimationFrame(() => t.classList.add('on')); }
    else t.classList.add('on');
    const logo = (f) => (typeof v22FundIcon === 'function' ? v22FundIcon(f) : '');
    t.innerHTML = `<div class="ma-cmp-picks">${picks.map((id) => { const f = byId(id); return f ? `<span class="ma-cmp-pick">${logo(f)}<b>${esc(f.short || f.name)}</b><button type="button" data-ma-cmp="${esc(id)}" aria-label="${esc(T('Remove'))} ${esc(f.short || f.name)}">×</button></span>` : ''; }).join('')}${picks.length < MAX ? `<span class="ma-cmp-slot">${T('Add up to')} ${MAX - picks.length} ${T('more')}</span>` : ''}</div>
      <button type="button" class="ma-cmp-clear" data-ma-cmp-clear>${T('Clear')}</button>
      <button type="button" class="v22-grad-btn ma-cmp-go" data-ma-cmp-go ${picks.length < 2 ? 'disabled' : ''}>${T('Compare now')} ${typeof ic === 'function' ? ic('arrowR') : '→'}</button>`;
  }
  function sync() {
    document.querySelectorAll('.ma-cmp-btn[data-ma-cmp]').forEach((b) => { const on = picks.includes(b.dataset.maCmp); b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); b.textContent = on ? '✓ ' + T('Added') : '＋ ' + T('Compare'); });
    tray();
  }
  function toggle(id) {
    const i = picks.indexOf(id);
    if (i >= 0) picks.splice(i, 1);
    else if (picks.length >= MAX) { if (typeof notify === 'function') notify(T('You can compare up to 3 funds. Remove one first.')); return; }
    else picks.push(id);
    sync();
  }

  /* ---------- compare table ---------- */
  function openCompare() {
    const F = picks.map(byId).filter(Boolean); if (F.length < 2) return;
    const H = F.map(health);
    const num = (v, d = 1) => (v == null || isNaN(v) ? null : +(+v).toFixed(d));
    const rows = [
      [T('5Y return (CAGR)'), F.map((f) => num(f.returns[5])), '%', 'hi'],
      [T('3Y return (CAGR)'), F.map((f) => num(f.returns[3])), '%', 'hi'],
      [T('1Y return'), F.map((f) => num(f.returns[1])), '%', 'hi'],
      [T('10Y return (CAGR)'), F.map((f) => num(f.returns[10])), '%', 'hi'],
      [T('Health score'), H.map((h) => (h ? h.score : null)), '', 'hi'],
      [T('Volatility'), F.map((f) => num(f.vol)), '%', 'lo'],
      [T('Sharpe ratio'), F.map((f) => num(f.sharpe, 2) || null), '', 'hi'],
      [T('Expense ratio'), F.map((f) => num(f.expense, 2)), '%', 'lo'],
      [T('Risk'), F.map((f) => f.riskLabel || f.risk || null), '', ''],
      [T('Category'), F.map((f) => f.category || null), '', ''],
      [T('AUM'), F.map((f) => f.aum || null), '', ''],
    ].filter((r) => r[1].some((v) => v != null && v !== '—'));
    const best = (vals, dir) => { if (!dir) return -1; const n = vals.map((v) => (typeof v === 'number' ? v : null)); if (n.filter((v) => v != null).length < 2) return -1; const t = dir === 'hi' ? Math.max(...n.filter((v) => v != null)) : Math.min(...n.filter((v) => v != null)); return n.indexOf(t); };
    const logo = (f) => (typeof v22FundIcon === 'function' ? v22FundIcon(f) : '');
    const m = document.createElement('div'); m.className = 'ma-cmp-modal'; m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true'); m.setAttribute('aria-label', T('Compare funds'));
    m.innerHTML = `<div class="ma-cmp-sheet"><header><h2>${T('Compare funds')}</h2><button type="button" class="ma-cmp-x" aria-label="${esc(T('Close'))}">×</button></header>
      <div class="table-scroll"><table class="ma-cmp-table"><thead><tr><th></th>${F.map((f) => `<th><a href="#/user/fund/${encodeURIComponent(f.id)}">${logo(f)}<span>${esc(f.short || f.name)}</span></a></th>`).join('')}</tr></thead>
      <tbody>${rows.map(([name, vals, unit, dir]) => { const b = best(vals, dir); return `<tr><td>${name}</td>${vals.map((v, i) => `<td class="${i === b ? 'win' : ''}">${v == null ? '—' : esc(String(v)) + (typeof v === 'number' ? unit : '')}</td>`).join('')}</tr>`; }).join('')}</tbody></table></div>
      <p class="ma-cmp-note">★ ${T('marks the better value in each row.')} ${T('Past performance does not guarantee future returns.')}</p></div>`;
    const close = () => { m.remove(); document.removeEventListener('keydown', esc_); };
    const esc_ = (e) => { if (e.key === 'Escape') close(); };
    m.addEventListener('click', (e) => { if (e.target === m || e.target.closest('.ma-cmp-x') || e.target.closest('a')) close(); });
    document.addEventListener('keydown', esc_);
    document.body.appendChild(m); m.querySelector('.ma-cmp-x').focus();
  }

  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-ma-cmp]'); if (b) { e.preventDefault(); e.stopPropagation(); toggle(b.dataset.maCmp); return; }
    if (e.target.closest('[data-ma-cmp-clear]')) { picks.length = 0; sync(); return; }
    if (e.target.closest('[data-ma-cmp-go]')) openCompare();
    if (e.target.closest('[data-ma-funds-reset]') && typeof filters !== 'undefined') { filters.q = ''; filters.category = 'All'; if (typeof v22Chip !== 'undefined') { v22Chip = 'All'; v22Page = 1; } renderUser('funds'); }
  }, true);
  window.addEventListener('hashchange', () => setTimeout(tray, 0));
  window.addEventListener('ma:logout', () => { picks.length = 0; tray(); });

  window.MA_FUNDX = { health, gauge, rowExtra, sync, add: (id) => { if (!picks.includes(id)) toggle(id); }, compare: (ids) => { picks.splice(0, picks.length, ...ids.slice(0, MAX)); sync(); openCompare(); } };
})();
