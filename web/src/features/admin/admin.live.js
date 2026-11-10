/* ==========================================================================
   Live mode — admin console helpers
   asyncPage() (render a loading placeholder, then the page from the API), pager(),
   percentage formatting. Used by every admin *.live.js file.
   ========================================================================== */
(function () {
  if (!window.MA_LIVE) return; // demo mode (no API): nothing to do
  const { errMsg } = MA_LIVE;
  // Show a placeholder now and replace it with the page built by `loader()` from the API.
  const asyncPage = (title, loader) => { setTimeout(async () => { const el = document.getElementById('ma-async'); if (!el) return; try { el.outerHTML = await loader(); } catch (e) { el.innerHTML = `<section class="v22-card v22-loading"><span>${cic('warn', 36)}</span><div><b>Could not load ${esc(title)}</b><small>${esc(errMsg(e))}</small></div></section>`; } }, 0); return `<div id="ma-async">${window.MA_AI ? `<section class="v22-card">${MA_AI.skel(5)}</section>` : `<section class="v22-card v22-loading"><span class="v22-spin"></span><div><b>Loading ${esc(title)}…</b></div></section>`}</div>`; };
  // Pager for API lists.
  const pager = (total, page, size, attr) => { const pages = Math.max(1, Math.ceil(total / size)); if (pages <= 1) return `<div class="v22-tfoot">Showing ${total.toLocaleString('en-IN')} record(s)</div>`; const nums = [...new Set([1, page - 1, page, page + 1, pages])].filter((n) => n >= 1 && n <= pages).sort((a, b) => a - b); let h = '', prev = 0; for (const n of nums) { if (n - prev > 1) h += '<span class="v22-ell">…</span>'; h += `<button type="button" ${attr}="${n}" class="${n === page ? 'active' : ''}">${n}</button>`; prev = n; } return `<div class="v22-tfoot v22-tpager"><span>Showing ${((page - 1) * size + 1).toLocaleString('en-IN')}–${Math.min(page * size, total).toLocaleString('en-IN')} of ${total.toLocaleString('en-IN')}</span><nav class="v22-pager sm"><button type="button" ${attr}="${page - 1}" ${page === 1 ? 'disabled' : ''}>${ic('chevL')}</button>${h}<button type="button" ${attr}="${page + 1}" ${page === pages ? 'disabled' : ''}>${ic('chevR')}</button></nav></div>`; };
  // Signed percentage or percentage points.
  const pctTxt = (v, pp) => (v == null ? '—' : `${v >= 0 ? '+' : ''}${(+v).toFixed(1)}${pp ? ' pp' : '%'}`);

  // used by other live files
  Object.assign(MA_LIVE, { asyncPage, pctTxt, pager });
})();
