/* ==========================================================================
   Live mode — fund watchlist (POST /me/watchlist/:fundId).
   ========================================================================== */
(function () {
  if (!window.MA_LIVE) return; // demo mode (no API): nothing to do
  const { API, fail, on } = MA_LIVE;
  // ------------------------------------------------------------------ watchlist, support, assistant
  on('[data-action="watchlist"]', async () => { try { await API.post(`/me/watchlist/${encodeURIComponent(selectedFund)}`); notify('Added to your watchlist.'); } catch (e) { fail(e); } });
})();
