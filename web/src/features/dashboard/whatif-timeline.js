/* ==========================================================================
   Feature: drag timeline in the dashboard "What if you had invested on this date?" card
   A slider from 10 years ago to last month. Dragging it (mouse, touch or arrow keys) sets the Investment
   Date field and updates the estimate live, with the same maths as "Run Calculation" (v22Lump).
   Typing a date or picking 5Y / 3Y / 1Y moves the knob. Styles: src/styles/ux.css
   ========================================================================== */
(function () {
  const T = (s) => (window.MA_T ? MA_T(s) : s);
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const end = () => { const a = (typeof V22_ASOF !== 'undefined' && V22_ASOF) || new Date(); return new Date(a.getFullYear(), a.getMonth() - 1, a.getDate()); };
  const start = () => { const e = end(); return new Date(e.getFullYear() - 10, e.getMonth(), 1); };
  const toP = (d) => Math.max(0, Math.min(1, (d - start()) / (end() - start())));
  const toD = (p) => { const s = start(), e = end(), d = new Date(s.getTime() + p * (e - s)); return new Date(d.getFullYear(), d.getMonth(), Math.min(15, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate())); };
  const ago = (d) => { const y = (end() - d) / (365.25 * 864e5) + 1 / 12; return y < 1 ? `${Math.max(1, Math.round(y * 12))} ${T('months ago')}` : `${y.toFixed(1)} ${T('years ago')}`; };

  /** Markup for the card (placed under the estimate). */
  function html() {
    const s = start(), e = end(), years = [];
    for (let y = s.getFullYear(); y <= e.getFullYear(); y += 2) years.push(y);
    return `<div class="ma-tl" id="ma-tl"><div class="ma-tl-head"><span>${T('Or drag to pick the date')}</span><b id="ma-tl-ago"></b></div>
      <div class="ma-tl-track" id="ma-tl-track" role="slider" tabindex="0" aria-label="${esc(T('Investment date'))}" aria-valuemin="0" aria-valuemax="100"><i class="ma-tl-bar"></i><i class="ma-tl-fill" id="ma-tl-fill"></i><span class="ma-tl-knob" id="ma-tl-knob"><em id="ma-tl-lbl"></em></span></div>
      <div class="ma-tl-years">${years.map((y) => `<span>${y}</span>`).join('')}</div></div>`;
  }
  function paint(d) {
    const p = toP(d), k = document.getElementById('ma-tl-knob'); if (!k) return;
    k.style.left = p * 100 + '%'; document.getElementById('ma-tl-fill').style.left = p * 100 + '%';
    const txt = MON[d.getMonth()] + ' ' + d.getFullYear();
    document.getElementById('ma-tl-lbl').textContent = txt; document.getElementById('ma-tl-ago').textContent = ago(d);
    const tr = document.getElementById('ma-tl-track'); tr.setAttribute('aria-valuenow', Math.round(p * 100)); tr.setAttribute('aria-valuetext', txt);
  }
  /** Set the date field and the estimate from a slider position. */
  function apply(p) {
    const d = toD(p), f = document.getElementById('quick-date');
    if (f) f.value = v22FmtDate(d);
    const a = v22Num(document.getElementById('quick-amount')?.value) || 100000, est = document.getElementById('v22-est');
    if (est && typeof v22Lump === 'function') est.innerHTML = v22EstHTML(v22Lump(a, d));
    document.querySelectorAll('[data-v22-qpreset]').forEach((b) => b.classList.toggle('active', b.dataset.v22Qpreset === 'custom'));
    paint(d);
  }
  /** Move the knob to whatever date the field holds. */
  function syncFromField() { const d = v22ParseDate(document.getElementById('quick-date')?.value); if (d) paint(d); }

  let drag = null;
  const at = (e) => { const r = drag.getBoundingClientRect(); apply(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width))); };
  document.addEventListener('pointerdown', (e) => { const t = e.target.closest('#ma-tl-track'); if (!t) return; drag = t; t.setPointerCapture(e.pointerId); t.classList.add('drag'); at(e); });
  document.addEventListener('pointermove', (e) => { if (drag) at(e); });
  const stop = () => { if (drag) { drag.classList.remove('drag'); drag = null; } };
  document.addEventListener('pointerup', stop); document.addEventListener('pointercancel', stop);
  document.addEventListener('keydown', (e) => {
    if (!e.target.closest || !e.target.closest('#ma-tl-track')) return;
    const d = v22ParseDate(document.getElementById('quick-date')?.value) || end();
    const step = { ArrowLeft: -1, ArrowDown: -1, ArrowRight: 1, ArrowUp: 1, PageDown: -12, PageUp: 12 }[e.key];
    if (e.key === 'Home' || e.key === 'End') { e.preventDefault(); apply(e.key === 'Home' ? 0 : 1); return; }
    if (!step) return; e.preventDefault();
    apply(toP(new Date(d.getFullYear(), d.getMonth() + step, 15)));
  });
  // the field or the 5Y/3Y/1Y buttons changed → follow
  document.addEventListener('input', (e) => { if (e.target.id === 'quick-date') syncFromField(); });
  document.addEventListener('change', (e) => { if (e.target.id === 'quick-date') syncFromField(); });
  document.addEventListener('click', (e) => { if (e.target.closest('[data-v22-qpreset],[data-action="v22-quick-calc"],.v22-dp-day,[data-dp-day]')) setTimeout(syncFromField, 30); });
  // first paint after the dashboard renders
  new MutationObserver(() => { const k = document.getElementById('ma-tl-knob'); if (k && !k.dataset.init) { k.dataset.init = '1'; syncFromField(); } }).observe(document.documentElement, { childList: true, subtree: true });

  window.maWhatIfTimeline = html;
})();
