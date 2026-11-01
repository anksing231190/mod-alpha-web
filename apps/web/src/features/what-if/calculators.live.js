/* ==========================================================================
   Live mode — calculators on real NAV data
   What-if (POST /calc/lumpsum) and SIP comparison (POST /calc/sip-compare).
   ========================================================================== */
(function () {
  if (!window.MA_LIVE) return; // demo mode (no API): nothing to do
  const { API, dmyToIso, fail, fmt, isoToDmy } = MA_LIVE;
  // ------------------------------------------------------------------ calculators (server-side, real NAV)
  const topFundId = () => D.funds[0]?.id;
  runCalc = async function () {
    const amt = v22Num(document.getElementById('calc-amount')?.value), dIso = dmyToIso(document.getElementById('calc-date')?.value);
    if (!dIso) { notify('Enter a valid past date as dd/mm/yyyy.'); return; }
    if (!amt || amt < 500) { notify('Enter an amount of at least ₹500.'); return; }
    try {
      const r = await API.post('/calc/lumpsum', { fundId: selectedFund && D.funds.some((f) => f.id === selectedFund) ? selectedFund : topFundId(), date: dIso, amount: amt });
      v22WhatIf = { date: isoToDmy(dIso), amount: amt };
      const rr = { value: r.value, gain: r.gain, ret: r.totalReturnPct, cagr: r.cagrPct ?? 0, yrs: r.years, mult: r.value / amt };
      const vals = r.journey.map((j) => j.value), yMax = v22NiceMax(Math.max(...vals) * 1.05), y0 = +r.investedOn.slice(0, 4), y1 = +r.asOf.slice(0, 4);
      const years = Array.from({ length: Math.min(6, y1 - y0 + 1) }, (_, i) => String(Math.round(y0 + ((y1 - y0) * i) / Math.max(1, Math.min(5, y1 - y0)))));
      document.getElementById('v22-journey').innerHTML = v22Chart({ w: 620, h: 310, pad: { l: 50, r: 24, t: 20, b: 40 }, yMin: 0, yMax, yTicks: [0, 1, 2, 3, 4, 5].map((i) => (i * yMax) / 5), yFmt: (v) => (!v ? '0' : v >= 1e7 ? '₹' + (v / 1e7).toFixed(1) + 'Cr' : v >= 1e5 ? '₹' + (v / 1e5).toFixed(1) + 'L' : '₹' + Math.round(v / 1e3) + 'K'), xLabels: years, axisY: true, label: 'Investment journey from NAV', series: [{ values: vals, stops: [[0, '#22d3ee'], [1, '#38bdf8']], area: 0.7, areaStops: [[0, '#0ea5e9'], [1, '#22d3ee']], width: 3.6, dots: 2, r: 5, endDot: 8, glow: '#22d3ee', dotColor: '#5fe3ff' }], overlays: [{ at: [0, -1], cls: 'v22-tip v22-tip-up', html: `<small>Value on ${fmt(r.asOf)}</small><b>${inr(r.value)}</b>` }] });
      document.getElementById('v22-results').innerHTML = v22ResultRows(rr);
      const f = D.funds.find((x) => x.id === r.fundId);
      document.getElementById('v22-insight-text').textContent = `${inr(amt)} invested in ${f?.name || r.fundId} on ${fmt(r.investedOn)} (NAV ₹${r.buyNav}) is worth ${inr(r.value)} on ${fmt(r.asOf)}${r.cagrPct != null ? ` — ${r.cagrPct}% CAGR over ${r.years} years` : ''}. Past performance does not guarantee future returns.`;
      document.querySelectorAll('[data-v22-amount]').forEach((b) => b.classList.toggle('active', Number(b.dataset.v22Amount) === amt));
    } catch (e) { fail(e); }
  };
  runSip = async function () {
    const a = v22Num(document.getElementById('sip-amount')?.value), s = dmyToIso(document.getElementById('sip-start')?.value), e = dmyToIso(document.getElementById('sip-end')?.value);
    if (!a || a < 500) { notify('Enter a monthly SIP amount of at least ₹500.'); return; }
    if (!s || !e || e <= s) { notify('Enter a valid start and end date (dd/mm/yyyy), end after start.'); return; }
    try {
      const r = await API.post('/calc/sip-compare', { fundId: topFundId(), amount: a, start: s, end: e });
      v22SipState = { amount: a, start: isoToDmy(s), end: isoToDmy(e) };
      // Six evenly spaced points of the value path for the chart.
      const pick = (k) => { const p = r.path; return Array.from({ length: 6 }, (_, i) => p[Math.round(((p.length - 1) * i) / 5)][k]); };
      const rr = { invested: r.invested, mod: r.modAlphaValue, trad: r.fixedValue, extra: r.extra, pct: r.extraPct, months: r.months, yrs: +(r.months / 12).toFixed(1), modPath: pick('modAlpha'), tradPath: pick('fixed') };
      document.getElementById('v22-sip-chart').innerHTML = v22SipChart(rr, v22D(s), v22D(e));
      document.getElementById('v22-sip-results').innerHTML = v22SipResults(rr) + (r.note ? `<div><span class="v22-muted" style="font-size:12px">${esc(r.note)}</span></div>` : '');
      document.querySelectorAll('[data-v22-sip]').forEach((b) => b.classList.toggle('active', Number(b.dataset.v22Sip) === a));
    } catch (er) { fail(er); }
  };
})();
