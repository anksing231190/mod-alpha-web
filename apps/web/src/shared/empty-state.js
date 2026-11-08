/* ==========================================================================
   Shared: empty states
   MA_EMPTY.html({ title, text, action, mood, small }) → a card with the animated α mark, a title, one line and an
   optional button, used instead of a bare "nothing here" line.
     action: ['Label', 'data-attr'] → <button data-attr>   or ['Label', '#/route'] → link
     mood:   'happy' (default) · 'think' (no search results) · 'sleep' (all caught up)
     small:  compact version for pop-overs (notifications)
   Styles: src/styles/ux.css
   ========================================================================== */
(function () {
  const T = (s) => (window.MA_T ? MA_T(s) : s);
  // the animated α mark: quiet when there is nothing, drawing faster for "no results"
  const bot = (mood) => maAlphaMark({ cls: 'ma-empty-bot ' + (mood === 'sleep' ? 'dim' : mood === 'think' ? 'think' : '') });
  function html(o) {
    const a = o.action;
    const btn = !a ? '' : String(a[1]).startsWith('#') ? `<a class="v22-grad-btn ma-empty-go" href="${a[1]}">${esc(T(a[0]))}</a>` : `<button type="button" class="v22-grad-btn ma-empty-go" ${a[1]}>${esc(T(a[0]))}</button>`;
    return `<div class="ma-empty${o.small ? ' sm' : ''}" role="status">${bot(o.mood || 'happy')}<div class="ma-empty-txt"><b>${esc(T(o.title))}</b>${o.text ? `<p>${esc(T(o.text))}</p>` : ''}${btn}</div></div>`;
  }
  window.MA_EMPTY = { html };
})();
