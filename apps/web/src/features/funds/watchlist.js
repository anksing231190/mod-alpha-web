/* ==========================================================================
   Feature: watchlist — the "Add to Watchlist" button on fund pages (and in the sticky fund bar)
   The button shows the real state (☆ Add to Watchlist / ★ In your watchlist) and toggles on click.
   It changes at once and rolls back with a message if the server says no.
     demo: saved in this browser (localStorage 'ma-watchlist')
     live: GET /me/watchlist · POST /me/watchlist/:fundId · DELETE /me/watchlist/:fundId
   ========================================================================== */
(function () {
  const KEY = 'ma-watchlist';
  const T = (s) => (window.MA_T ? MA_T(s) : s);
  const live = () => !!(window.MA_LIVE && MA_LIVE.API);
  let ids = new Set(), loaded = false, loading = null;
  try { (JSON.parse(localStorage.getItem(KEY) || '[]') || []).forEach((x) => ids.add(x)); } catch (e) {}
  const saveLocal = () => { try { localStorage.setItem(KEY, JSON.stringify([...ids])); } catch (e) {} };

  /** Load the server list once (live mode). */
  function load() {
    if (!live() || loaded) return Promise.resolve();
    if (!loading) loading = MA_LIVE.API.get('/me/watchlist', null, { background: true, onUnauthorized: false })
      .then((r) => { ids = new Set((r.items || []).map((x) => x.fund_id)); loaded = true; paint(); })
      .catch(() => { loading = null; });
    return loading;
  }
  const label = (on) => on ? `${ic('star')}<span>${T('In your watchlist')}</span>` : `${ic('star')}<span>${T('Add to Watchlist')}</span>`;
  /** Button markup for a fund (fund page header and sticky bar). */
  function button(id, extra = '') {
    const on = ids.has(id);
    return `<button type="button" class="v22-watch ma-watch${on ? ' on' : ''}${extra ? ' ' + extra : ''}" data-ma-watch="${esc(id)}" aria-pressed="${on}">${label(on)}</button>`;
  }
  /** Bring every watch button on the page in line with the current state. */
  function paint() {
    document.querySelectorAll('[data-ma-watch]').forEach((b) => { const on = ids.has(b.dataset.maWatch); b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); b.innerHTML = label(on); });
  }
  async function toggle(id) {
    const was = ids.has(id);
    if (was) ids.delete(id); else ids.add(id);
    paint();
    if (!live()) { saveLocal(); notify(was ? T('Removed from your watchlist.') : T('Added to your watchlist.')); return; }
    try {
      if (was) await MA_LIVE.API.del(`/me/watchlist/${encodeURIComponent(id)}`); else await MA_LIVE.API.post(`/me/watchlist/${encodeURIComponent(id)}`);
      notify(was ? T('Removed from your watchlist.') : T('Added to your watchlist.'));
    } catch (e) {
      if (was) ids.add(id); else ids.delete(id); // roll back
      paint();
      notify(T('Could not update your watchlist. Check your connection and try again.'));
    }
  }
  // capture phase: runs before the old demo/live handlers, which no longer exist for this button
  document.addEventListener('click', (e) => {
    const b = e.target.closest && e.target.closest('[data-ma-watch]');
    if (!b) return;
    e.preventDefault(); e.stopPropagation();
    toggle(b.dataset.maWatch);
  }, true);
  window.addEventListener('ma:logout', () => { loaded = false; loading = null; if (live()) ids = new Set(); });
  // fund page drawn → make sure the live list is known
  new MutationObserver(() => { if (document.querySelector('[data-ma-watch]')) load(); }).observe(document.documentElement, { childList: true, subtree: true });

  window.MA_WATCH = { button, has: (id) => ids.has(id), toggle, paint };
})();
