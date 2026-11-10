/* ==========================================================================
   Live mode — fund watchlist (POST /me/watchlist/:fundId).
   ========================================================================== */
(function () {
  if (!window.MA_LIVE) return; // demo mode (no API): nothing to do
  const { API, fail, on } = MA_LIVE;
  // ------------------------------------------------------------------ watchlist, support, assistant
  // the watchlist button is handled by features/funds/watchlist.js (toggle, rollback, demo + live)
})();
