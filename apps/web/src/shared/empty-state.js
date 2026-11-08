/* ==========================================================================
   Shared: empty states
   MA_EMPTY.html({ title, text, action, mood, small }) → a card with the Alpha robot, a title, one line and an
   optional button, used instead of a bare "nothing here" line.
     action: ['Label', 'data-attr'] → <button data-attr>   or ['Label', '#/route'] → link
     mood:   'happy' (default) · 'think' (no search results) · 'sleep' (all caught up)
     small:  compact version for pop-overs (notifications)
   Styles: src/styles/ux.css
   ========================================================================== */
(function () {
  const T = (s) => (window.MA_T ? MA_T(s) : s);
  let n = 0;
  function bot(mood) {
    const k = 'mae' + (++n), H = `url(#${k})`;
    const eyes = mood === 'sleep' ? '<path d="M42 41h12M66 41h12" stroke="#2ed3f5" stroke-width="3" stroke-linecap="round"/>'
      : mood === 'think' ? '<ellipse cx="50" cy="38" rx="5" ry="6.5" fill="#2ed3f5"/><ellipse cx="74" cy="38" rx="5" ry="6.5" fill="#2ed3f5"/>'
      : '<path d="M42 44q6-9 12 0M66 44q6-9 12 0" fill="none" stroke="#2ed3f5" stroke-width="3" stroke-linecap="round"/>';
    const arm = mood === 'think' ? '<rect x="92" y="62" width="14" height="34" rx="7" fill="' + H + '" transform="rotate(-150 99 79)"/>' : '<rect x="92" y="70" width="14" height="34" rx="7" fill="' + H + '" transform="rotate(-30 99 87)"/>';
    return `<svg class="ma-empty-bot ${mood}" viewBox="0 0 120 140" aria-hidden="true"><defs><linearGradient id="${k}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff"/><stop offset=".6" stop-color="#cfe0ff"/><stop offset="1" stop-color="#7f9cf5"/></linearGradient></defs>
<rect x="14" y="84" width="14" height="34" rx="7" fill="${H}"/>${arm}<rect x="30" y="78" width="60" height="50" rx="18" fill="${H}"/><circle cx="60" cy="102" r="9" fill="#2ed3f5"/>
<line x1="60" y1="14" x2="60" y2="4" stroke="#9fb4ea" stroke-width="3"/><circle cx="60" cy="4" r="4.5" fill="#2ed3f5"/><rect x="22" y="13" width="76" height="60" rx="25" fill="${H}"/><rect x="30" y="25" width="60" height="36" rx="17" fill="#0b1430"/>${eyes}
${mood === 'sleep' ? '' : '<path d="M54 52q6 4 12 0" fill="none" stroke="#2ed3f5" stroke-width="2.2" stroke-linecap="round"/>'}${mood === 'think' ? '<text x="100" y="22" font-size="22" font-weight="800" fill="#a855f7" font-family="Inter,sans-serif">?</text>' : mood === 'sleep' ? '<text x="96" y="22" font-size="16" font-weight="800" fill="#7f9cf5" font-family="Inter,sans-serif">z</text>' : ''}</svg>`;
  }
  function html(o) {
    const a = o.action;
    const btn = !a ? '' : String(a[1]).startsWith('#') ? `<a class="v22-grad-btn ma-empty-go" href="${a[1]}">${esc(T(a[0]))}</a>` : `<button type="button" class="v22-grad-btn ma-empty-go" ${a[1]}>${esc(T(a[0]))}</button>`;
    return `<div class="ma-empty${o.small ? ' sm' : ''}" role="status">${bot(o.mood || 'happy')}<div class="ma-empty-txt"><b>${esc(T(o.title))}</b>${o.text ? `<p>${esc(T(o.text))}</p>` : ''}${btn}</div></div>`;
  }
  window.MA_EMPTY = { html };
})();
