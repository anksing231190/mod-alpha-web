/* ==========================================================================
   Shared: chart crosshair
   On charts drawn with v22Chart({ crosshair: { labels, fmt } }) a vertical line follows the pointer (mouse or
   finger), snaps to the nearest point and shows the date under the axis, a dot on each line and a small card
   with every series' value. The chart's fixed summary card fades out while the crosshair is showing.
   Data comes from V22_XH (shared/charts.js). Styles: src/styles/ux.css
   ========================================================================== */
(function () {
  function show(el, clientX) {
    const h = V22_XH[el.dataset.maXh]; if (!h) return;
    const r = el.getBoundingClientRect(), vx = (clientX - r.left) / r.width * h.W, xs = h.series[0].x;
    let i = 0, best = Infinity; xs.forEach((x, k) => { const d = Math.abs(x - vx); if (d < best) { best = d; i = k; } });
    if (el._xi === i && el.classList.contains('xh-on')) return; el._xi = i;
    const box = el.querySelector('.ma-xh'), px = xs[i] / h.W * 100;
    box.querySelector('.ma-xh-line').style.cssText = `left:${px}%;top:${h.top / h.H * 100}%;bottom:${(1 - h.bot / h.H) * 100}%`;
    const dt = box.querySelector('.ma-xh-date'); dt.textContent = h.labels[i] || ''; dt.style.left = px + '%'; dt.style.top = h.bot / h.H * 100 + '%'; dt.hidden = !h.labels[i];
    box.querySelectorAll('.ma-xh-dot').forEach((d) => d.remove());
    let html = '';
    h.series.forEach((s) => {
      if (s.y[i] == null || isNaN(s.y[i])) return;
      const d = document.createElement('i'); d.className = 'ma-xh-dot'; d.style.cssText = `left:${s.x[i] / h.W * 100}%;top:${s.y[i] / h.H * 100}%;--c:${s.color}`; box.appendChild(d);
      html += `<div><i style="--c:${s.color}"></i>${s.name ? `<span>${esc(s.name)}</span>` : ''}<b>${esc(String(h.fmt(s.v[i])))}</b></div>`;
    });
    const tip = box.querySelector('.ma-xh-tip'); tip.innerHTML = (h.labels[i] ? `<small>${esc(h.labels[i])}</small>` : '') + html;
    const ys = h.series.map((s) => s.y[i]).filter((y) => y != null), top = Math.min(...ys) / h.H * 100;
    tip.style.top = Math.max(2, Math.min(60, top - 4)) + '%';
    // beside the line, on whichever side has room, never outside the chart
    const cw = el.clientWidth, tw = tip.offsetWidth, x = px / 100 * cw;
    let left = x + 14; if (left + tw > cw) left = x - 14 - tw; if (left < 0) left = Math.max(0, Math.min(cw - tw, x - tw / 2));
    tip.style.left = left + 'px';
    el.classList.add('xh-on');
  }
  const hide = (el) => { el.classList.remove('xh-on'); el._xi = null; };
  document.addEventListener('pointermove', (e) => { const el = e.target.closest && e.target.closest('[data-ma-xh]'); if (el) show(el, e.clientX); });
  document.addEventListener('pointerdown', (e) => { const el = e.target.closest && e.target.closest('[data-ma-xh]'); if (el) show(el, e.clientX); });
  document.addEventListener('pointerout', (e) => { const el = e.target.closest && e.target.closest('[data-ma-xh]'); if (el && !el.contains(e.relatedTarget)) hide(el); });
  document.addEventListener('pointercancel', (e) => { const el = e.target.closest && e.target.closest('[data-ma-xh]'); if (el) hide(el); });
})();
