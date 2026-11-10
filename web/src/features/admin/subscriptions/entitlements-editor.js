/* ==========================================================================
   Admin: plan entitlements editor (inside "Pricing configuration", demo and live)
   Replaces the "one per line" text box with a list people can work with:
   • each entitlement is a row — ✓, the text (edit in place), move up / down, remove;
   • "Add an entitlement" (Enter adds it) and one-click suggestions taken from the other plans;
   • the count and the order match what the pricing card shows.
   AI question limits get a number box plus an "Unlimited" switch instead of typing −1.
   The original textarea / number inputs stay in the form (hidden) and are kept in sync, so the existing
   save code (admin-subscriptions.js / .live.js) is unchanged.
   Styles: src/styles/ux.css (.ma-ent)
   ========================================================================== */
(function () {
  const T = (s) => (window.MA_T ? MA_T(s) : s);
  const read = (ta) => ta.value.split('\n').map((x) => x.trim()).filter(Boolean);
  const allFeatures = () => [...document.querySelectorAll('.v22-pc [data-pc-feat]')].flatMap(read);

  function row(text, i, n) {
    return `<li class="ma-ent-row" data-i="${i}"><span class="ma-ent-ck" aria-hidden="true">${ic('check')}</span>
      <input class="ma-ent-txt" value="${esc(text)}" aria-label="${esc(T('Entitlement'))} ${i + 1}" maxlength="80">
      <span class="ma-ent-btns"><button type="button" data-ent="up" ${i === 0 ? 'disabled' : ''} aria-label="${esc(T('Move up'))}" title="${esc(T('Move up'))}">${ic('chevUp')}</button><button type="button" data-ent="down" ${i === n - 1 ? 'disabled' : ''} aria-label="${esc(T('Move down'))}" title="${esc(T('Move down'))}">${ic('chevDown')}</button><button type="button" data-ent="del" class="del" aria-label="${esc(T('Remove'))}" title="${esc(T('Remove'))}">${ic('x')}</button></span></li>`;
  }
  function render(box) {
    const ta = box._ta, items = read(ta), mine = new Set(items.map((x) => x.toLowerCase()));
    const sugg = [...new Set(allFeatures())].filter((x) => !mine.has(x.toLowerCase())).slice(0, 6);
    box.innerHTML = `<div class="ma-ent-head"><b>${T('Entitlements')}</b><span class="ma-ent-count">${items.length} ${T(items.length === 1 ? 'item' : 'items')} · ${T('shown on the pricing card in this order')}</span></div>
      <ul class="ma-ent-list">${items.map((t, i) => row(t, i, items.length)).join('') || `<li class="ma-ent-empty">${T('No entitlements yet. Add the first one below.')}</li>`}</ul>
      <div class="ma-ent-add"><span aria-hidden="true">${ic('spark') || '+'}</span><input class="ma-ent-new" placeholder="${esc(T('Add an entitlement, e.g. “Priority support”'))}" aria-label="${esc(T('Add an entitlement'))}" maxlength="80"><button type="button" class="v22-outline-btn" data-ent="add">${T('Add')}</button></div>
      ${sugg.length ? `<div class="ma-ent-sugg"><small>${T('From other plans')}:</small>${sugg.map((s) => `<button type="button" data-ent-sugg="${esc(s)}">+ ${esc(s)}</button>`).join('')}</div>` : ''}`;
  }
  function write(box, items) { box._ta.value = items.join('\n'); box._ta.dispatchEvent(new Event('input', { bubbles: true })); render(box); }
  function enhanceFeatures(ta) {
    const label = ta.closest('label') || ta.parentElement;
    const box = document.createElement('div'); box.className = 'ma-ent'; box._ta = ta;
    label.after(box); label.classList.add('ma-ent-src');
    render(box);
  }
  function enhanceLimit(inp, title) {
    const label = inp.closest('label'); if (!label || label.dataset.maLim) return; label.dataset.maLim = '1';
    const unl = Number(inp.value) < 0;
    const w = document.createElement('div'); w.className = 'ma-lim';
    w.innerHTML = `<b>${T(title)}</b><div class="ma-lim-row"><input type="number" min="0" class="ma-lim-n" value="${unl ? '' : inp.value}" ${unl ? 'disabled' : ''} aria-label="${esc(T(title))}" placeholder="${unl ? '∞' : ''}"><label class="ma-lim-unl"><input type="checkbox" ${unl ? 'checked' : ''}><span>${T('Unlimited')}</span></label></div>`;
    label.after(w); label.classList.add('ma-ent-src');
    const n = w.querySelector('.ma-lim-n'), c = w.querySelector('input[type=checkbox]');
    const sync = () => { inp.value = c.checked ? -1 : Math.max(0, Number(n.value || 0)); n.disabled = c.checked; n.placeholder = c.checked ? '∞' : ''; if (c.checked) n.value = ''; else if (n.value === '') n.value = 0; };
    n.addEventListener('input', sync); c.addEventListener('change', sync);
  }
  function enhance() {
    document.querySelectorAll('.v22-pc [data-pc-feat]:not([data-ma-ent])').forEach((ta) => { ta.dataset.maEnt = '1'; enhanceFeatures(ta); });
    document.querySelectorAll('.v22-pc [data-pc-ai]').forEach((i) => enhanceLimit(i, 'AI questions per day'));
    document.querySelectorAll('.v22-pc [data-pc-aim]').forEach((i) => enhanceLimit(i, 'AI questions per month'));
    // the limit pairs sit in one row with a short heading
    document.querySelectorAll('.v22-pc .v22-pc-grid:has([data-pc-ai]):not([data-ma-lim-h])').forEach((g) => { g.dataset.maLimH = '1'; g.classList.add('ma-lim-grid'); g.insertAdjacentHTML('beforebegin', `<div class="ma-ent-head ma-lim-head"><b>${T('AI assistant limits')}</b><span class="ma-ent-count">${T('Questions a subscriber on this plan can ask')}</span></div>`); });
  }

  document.addEventListener('click', (e) => {
    const box = e.target.closest && e.target.closest('.ma-ent'); if (!box) return;
    const items = read(box._ta), b = e.target.closest('[data-ent]'), s = e.target.closest('[data-ent-sugg]');
    if (s) { write(box, [...items, s.dataset.entSugg]); return; }
    if (!b) return;
    if (b.dataset.ent === 'add') { const inp = box.querySelector('.ma-ent-new'), v = inp.value.trim(); if (!v) { inp.focus(); return; } write(box, [...items, v]); box.querySelector('.ma-ent-new').focus(); return; }
    const i = +b.closest('.ma-ent-row').dataset.i;
    if (b.dataset.ent === 'del') items.splice(i, 1);
    if (b.dataset.ent === 'up' && i > 0) [items[i - 1], items[i]] = [items[i], items[i - 1]];
    if (b.dataset.ent === 'down' && i < items.length - 1) [items[i + 1], items[i]] = [items[i], items[i + 1]];
    write(box, items);
    const sel = box.querySelector(`.ma-ent-row[data-i="${b.dataset.ent === 'up' ? i - 1 : b.dataset.ent === 'down' ? i + 1 : Math.min(i, items.length - 1)}"] .ma-ent-txt`); if (sel) sel.focus();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' || !e.target.classList) return;
    if (e.target.classList.contains('ma-ent-new')) { e.preventDefault(); e.target.closest('.ma-ent').querySelector('[data-ent="add"]').click(); }
    if (e.target.classList.contains('ma-ent-txt')) { e.preventDefault(); e.target.closest('.ma-ent').querySelector('.ma-ent-new').focus(); }
  });
  // editing a row in place updates the hidden textarea without redrawing (keeps the cursor)
  document.addEventListener('input', (e) => {
    if (!e.target.classList || !e.target.classList.contains('ma-ent-txt')) return;
    const box = e.target.closest('.ma-ent'), vals = [...box.querySelectorAll('.ma-ent-txt')].map((x) => x.value.trim()).filter(Boolean);
    box._ta.value = vals.join('\n');
  });
  let q = false;
  new MutationObserver(() => { if (q) return; q = true; requestAnimationFrame(() => { q = false; if (document.querySelector('.v22-pc [data-pc-feat]:not([data-ma-ent]), .v22-pc label:not([data-ma-lim]) > [data-pc-ai], .v22-pc label:not([data-ma-lim]) > [data-pc-aim]')) enhance(); }); }).observe(document.documentElement, { childList: true, subtree: true });
})();
