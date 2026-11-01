/* ==========================================================================
   Live mode — data from the API instead of the bundled workbook
   Loads funds (GET /funds), the SIP dates and plans, and NAV series on demand.
   ========================================================================== */
(function () {
  if (!window.MA_LIVE) return; // demo mode (no API): nothing to do
  const { API, S } = MA_LIVE;
  // ------------------------------------------------------------------ data bootstrap (replaces the bundled workbook)
  function toFund(f, i) { const seed = (window.V22_SEED_FUNDS || []).find((x) => x.id === f.id) || {}; return { ...f, sharpe: f.sharpe ?? 0, returns: { 1: f.returns['1'], 3: f.returns['3'], 5: f.returns['5'], 10: f.returns['10'] }, icon: seed.icon || (i === 0 ? 'trophy' : 'mark'), color: seed.color || ['#2f86f6', '#16c784', '#b42ee8', '#f4b72f', '#ef3340'][i % 5] }; }
  // Load funds, SIP dates and plans from the API into the shared data.
  async function loadPublicData() {
    const [funds, plans, sip] = await Promise.all([API.get('/funds', { pageSize: 500, sort: '5y' }), API.get('/plans'), API.get('/sip-dates')]);
    D.funds = funds.items.map(toFund);
    D.categories = [...new Set(D.funds.map((f) => f.category))];
    S.plans = plans.plans;
    D.plans = plans.plans.map((p) => ({ name: p.name, price: p.prices.Monthly, prices: p.prices, period: 'Monthly', tagline: p.tagline, features: p.features, active: p.active, id: p.id }));
    S.sip = sip.items;
    const asOf = D.funds.map((f) => f.navDate).filter(Boolean).sort().at(-1) || new Date().toISOString().slice(0, 10);
    V22D.model = { asOf, funds: D.funds, navBy: S.navCache, navRows: 0, users: [], uView: [], subs: [], pays: [], sip: S.sip, holidays: [], categories: D.categories };
    V22D.ready = true; V22D.loaded = true; V22D.source = 'api'; V22D.meta = { fileName: 'Live database', by: API.env };
    const a = v22D(asOf); v22CalMonth = { y: a.getUTCFullYear(), m: a.getUTCMonth() };
  }
  // Stop the bundled-workbook loader from overwriting API data.
  window.v22LoadDataset = async () => {};
  v22LoadDataset = async () => {};
  v22FundSpark = function (f, i) { return f.spark && f.spark.length > 2 ? f.spark : v22Seeded(i + 3, 12, 6, 22, 5); };
  // Load (once) the NAV series of a fund.
  async function ensureNav(id) {
    if (S.navCache[id]) return S.navCache[id];
    const r = await API.get(`/funds/${encodeURIComponent(id)}/nav`, { period: 'MAX', points: 1500 });
    S.navCache[id] = { d: r.points.map((p) => p.d), v: r.points.map((p) => p.v) };
    return S.navCache[id];
  }

  // used by other live files
  Object.assign(MA_LIVE, { ensureNav, loadPublicData });
})();
