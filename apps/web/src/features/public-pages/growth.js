/* ==========================================================================
   Feature: public growth content (no sign-in needed)
   • SIP date checker — a section on the landing page (#sip-checker), free tool: pick a fund, a monthly amount and 3 / 5 / 10 years; see what a SIP on the
     1st, 5th, 10th, 15th, 20th, 25th or 28th would be worth today (bought at the first NAV on/after that day
     each month), the best and worst fixed dates, and Mod Alpha's date as a blurred teaser with "Sign up free".
   • #/f/<fundId> — public fund page: key numbers, NAV chart, health score, SIP-date teaser, link to the checker.
   • Learn — a section on the landing page (#learn) with article cards; #/learn/<slug> opens an article.
   renderLanding() calls MA_GROWTH.landing() to insert both sections before Pricing. The top bar gets
   "SIP checker" and "Learn", scrolling to them. Old links (#/sip-date-checker, #/learn, #/pricing, #/faq)
   open the landing page at that section (landingAt() in core/router.js). NAV: the demo dataset, or GET /funds/:id/nav (live).
   Styles: src/styles/ux.css
   ========================================================================== */
(function () {
  const T = (s) => (window.MA_T ? MA_T(s) : s);
  const live = () => !!(window.MA_LIVE && MA_LIVE.API);
  const money = (n) => (typeof inr === 'function' ? inr(Math.round(n)) : '₹' + Math.round(n).toLocaleString('en-IN'));
  const funds = () => ((typeof D !== 'undefined' && D.funds) || []).filter((f) => f.returns && f.returns[5] != null);
  const page = (inner, title) => { app.innerHTML = `${topbar(true)}<main class="public-page ma-grow">${inner}</main>${publicFooter()}`; document.title = `${title} · Mod Alpha`; scrollTo(0, 0); };
  async function navOf(id) {
    const m = typeof V22D !== 'undefined' && V22D.model && V22D.model.navBy && V22D.model.navBy[id];
    if (m && m.v.length) return m;
    if (live() && MA_LIVE.ensureNav) { try { return await MA_LIVE.ensureNav(id); } catch (e) { return null; } }
    return null;
  }

  /* ---------- top bar links ---------- */
  if (typeof topbar === 'function') {
    const base = topbar;
    topbar = function (publicMode) { const h = base.apply(this, arguments); return publicMode ? h.replace('<a href="#/landing" data-public-scroll="pricing-preview">', `<a href="#/landing" data-public-scroll="sip-checker">${T('SIP checker')}</a><a href="#/landing" data-public-scroll="learn">${T('Learn')}</a><a href="#/landing" data-public-scroll="pricing-preview">`) : h; };
  }

  /* ---------- SIP date checker ---------- */
  const DAYS = [1, 5, 10, 15, 20, 25, 28];
  let ck = { fund: null, amount: 5000, years: 5, sel: 'fund' }, last = null;
  /** Value today of a monthly SIP bought on `day` for the last `years` years. */
  function simulate(n, day, amount, years) {
    const L = n.d.length - 1, end = String(n.d[L]).slice(0, 10), endD = new Date(end + 'T00:00:00Z');
    let units = 0, paid = 0, months = 0;
    for (let k = years * 12; k >= 1; k--) {
      const t = new Date(Date.UTC(endD.getUTCFullYear(), endD.getUTCMonth() - k, Math.min(day, 28)));
      const iso = t.toISOString().slice(0, 10);
      let i = typeof v22NavAt === 'function' ? v22NavAt(n, iso) : -1;
      if (i < 0) continue;
      if (String(n.d[i]).slice(0, 10) < iso && i < L) i++;
      units += amount / n.v[i]; paid += amount; months++;
    }
    return { value: units * n.v[L], paid, units, months };
  }
  function checkerHtml() {
    const F = funds(); if (!ck.fund && F.length) ck.fund = F[0].id;
    return `<section class="v22 ma-land-sec" id="sip-checker" data-v22-reveal><div class="v22-sec-head"><span class="v22-eyebrow">${T('FREE TOOL')}</span><h2>${T('Does your SIP date matter?')}</h2><p>${T('Pick a fund and see what the same monthly SIP would be worth today on different dates of the month. Real NAV history, no sign-up.')}</p></div>
      <div class="ma-ck"><div class="v22-card ma-ck-form">
        <label class="v22-fl">${T('Fund')}<span class="v22-select"><select id="ma-ck-fund">${F.map((f) => `<option value="${esc(f.id)}" ${f.id === ck.fund ? 'selected' : ''}>${esc(f.name)}</option>`).join('')}</select>${ic('chevDown')}</span></label>
        <div class="v22-fl">${T('Monthly SIP')}<div class="v22-seg-pills wrap">${[1000, 5000, 10000, 25000].map((a) => `<button type="button" class="${ck.amount === a ? 'active' : ''}" data-ma-ck-amt="${a}">${money(a)}</button>`).join('')}</div></div>
        <div class="v22-fl">${T('Over the last')}<div class="v22-seg-pills wrap">${[3, 5, 10].map((y) => `<button type="button" class="${ck.years === y ? 'active' : ''}" data-ma-ck-yrs="${y}">${y} ${T('years')}</button>`).join('')}</div></div>
      </div><div class="v22-card ma-ck-out" id="ma-ck-out">${window.MA_AI ? MA_AI.skelBlock(260) : ''}</div><div id="ma-ck-side" class="ma-side-slot"></div></div>
      <p class="v22-note ma-grow-note">${T('Illustrative backtest on historical NAV: the SIP buys at the first NAV on or after the chosen day each month. Past performance does not guarantee future returns. Not investment advice.')}</p></section>`;
  }
  async function run() {
    const out = document.getElementById('ma-ck-out'); if (!out) return;
    const f = funds().find((x) => x.id === ck.fund), n = f && await navOf(f.id);
    if (!f || !n || n.v.length < 40) { out.innerHTML = `<p class="v22-sub">${T('NAV history for this fund is not available yet. Try another fund.')}</p>`; return; }
    const res = DAYS.map((d) => ({ d, ...simulate(n, d, ck.amount, ck.years) })), max = Math.max(...res.map((r) => r.value)), min = Math.min(...res.map((r) => r.value));
    const best = res.find((r) => r.value === max), worst = res.find((r) => r.value === min), paid = res[0].paid;
    last = { f, res, best, worst, max, min };
    const teaser = max * 1.012;
    out.innerHTML = `<div class="ma-ck-head">${typeof v22FundLogo === 'function' ? v22FundLogo(f) : ''}<div><b>${esc(f.short || f.name)}</b><small>${money(ck.amount)} ${T('a month for')} ${ck.years} ${T('years')} · ${T('you invest')} ${money(paid)}</small></div></div>
      <div class="ma-ck-bars">${res.map((r) => `<button type="button" data-ma-ck-day="${r.d}" class="ma-ck-row${r === best ? ' best' : r === worst ? ' worst' : ''}${ck.sel === r.d ? ' sel' : ''}"><span>${T('SIP on the')} ${ord(r.d)}</span><i><em style="width:${(8 + (r.value - min) / (max - min || 1) * 92).toFixed(1)}%"></em></i><b>${money(r.value)}</b></button>`).join('')}
        <div class="ma-ck-row ma"><span>✦ ${T('Mod Alpha date')}</span><i><em style="width:100%"></em></i><b class="ma-blur">${money(teaser)}</b></div></div>
      <div class="ma-ck-sum"><div><small>${T('Best fixed date')}</small><b class="pos">${ord(best.d)} · ${money(best.value)}</b></div><div><small>${T('Worst fixed date')}</small><b>${ord(worst.d)} · ${money(worst.value)}</b></div><div><small>${T('Difference')}</small><b class="pos">${money(max - min)}</b></div></div>
      <div class="ma-ck-cta"><span>${T('Mod Alpha picks the historically strongest date each month and reminds you the day before.')}</span><a class="v22-grad-btn" href="#/signup">${T('Sign up free to see your date')} ${ic('arrowR')}</a><button type="button" class="v22-outline-btn${ck.sel === 'fund' ? ' active' : ''}" data-ma-ck-about>${ic('info')} ${T('About this fund')}</button></div>`;
    side();
  }
  /* ---------- detail panel on the right (fund details or one SIP date) ---------- */
  const ord = (d) => d + (d === 1 ? 'st' : d === 2 ? 'nd' : d === 3 ? 'rd' : 'th');
  const pct = (v) => (v == null ? '—' : `${(+v).toFixed(1)}%`);
  /** Shared panel markup: eyebrow + title, a headline value, label/value rows, a note and actions. */
  function panel({ icon, tint, eyebrow, title, bigLabel, big, bigCls = 'pos', rows, body = '', note, acts }) {
    return `<aside class="v22-card ma-side" aria-live="polite"><header class="ma-side-head"><span class="ma-side-ic"${tint ? ` style="--t:${tint}"` : ''}>${icon}</span><div><span class="ma-side-eb">${eyebrow}</span><h3>${title}</h3></div><button type="button" class="ma-side-x" data-ma-side-close aria-label="${T('Close')}">${ic('x')}</button></header>
      ${big != null ? `<div class="ma-side-big"><span>${bigLabel}</span><b class="${bigCls}">${big}</b></div>` : ''}${body}
      ${rows && rows.length ? `<dl class="ma-side-dl">${rows.map(([k, v, c]) => `<div><dt>${k}</dt><dd class="${c || ''}">${v}</dd></div>`).join('')}</dl>` : ''}
      ${note ? `<p class="ma-side-note">${note}</p>` : ''}${acts ? `<div class="ma-side-acts">${acts}</div>` : ''}</aside>`;
  }
  function side() {
    const slot = document.getElementById('ma-ck-side'), wrap = slot && slot.parentElement; if (!slot || !last) return;
    wrap.classList.toggle('has-side', ck.sel != null);
    if (ck.sel == null) { slot.innerHTML = ''; return; }
    const { f, res, best, worst } = last, logo = typeof v22FundLogo === 'function' ? v22FundLogo(f) : cic('chart', 40);
    if (ck.sel === 'fund') {
      const h = window.MA_FUNDX ? MA_FUNDX.health(f) : null;
      slot.innerHTML = panel({ icon: logo, eyebrow: T('FUND DETAILS'), title: esc(f.short || f.name), bigLabel: T('5-year CAGR'), big: pct(f.returns[5]),
        rows: [[T('1-year return'), pct(f.returns[1]), 'pos'], [T('3-year CAGR'), pct(f.returns[3]), 'pos'], [T('10-year CAGR'), pct(f.returns[10]), 'pos'], [T('Risk'), esc(f.riskLabel || f.risk || '—')], ...(h ? [[T('Health score'), `${h.score} / 100 · ${T(h.label)}`]] : []),
          ...[['AMC', f.amc], ['Category', f.category], ['Benchmark', f.benchmark], ['AUM', f.aum], ['Expense ratio', f.expense != null ? f.expense + '%' : null], ['Plan', [f.plan, f.option].filter(Boolean).join(' · ')]].filter(([, v]) => v && v !== '—').map(([k, v]) => [T(k), esc(String(v))])],
        note: T('Past performance does not guarantee future returns. Mutual fund investments are subject to market risks.'),
        acts: `<a class="v22-grad-btn" href="#/signup">${ic('star')} ${T('Follow this fund')}</a><a class="v22-outline-btn" href="#/f/${encodeURIComponent(f.id)}">${T('Full fund page')} ${ic('arrowR')}</a>` });
    } else {
      const r = res.find((x) => x.d === ck.sel); if (!r) { ck.sel = 'fund'; side(); return; }
      const gain = r.value - r.paid, rank = [...res].sort((a, b) => b.value - a.value).indexOf(r) + 1;
      slot.innerHTML = panel({ icon: cic('calendar', 40), eyebrow: T('SIP DATE DETAILS'), title: `${T('SIP on the')} ${ord(r.d)}`, bigLabel: T('Value today'), big: money(r.value),
        rows: [[T('You invested'), money(r.paid)], [T('Gain'), `${money(gain)} · ${pct(gain / r.paid * 100)}`, gain >= 0 ? 'pos' : 'neg'], [T('Monthly instalments'), String(r.months)], [T('Units bought'), r.units.toFixed(1)],
          [T('Rank among the 7 dates'), `${rank} ${T('of')} ${res.length}`], [T('Compared with the best date'), r === best ? T('This is the best date') : `−${money(best.value - r.value)}`, r === best ? 'pos' : 'neg'], [T('Compared with the worst date'), r === worst ? T('This is the worst date') : `+${money(r.value - worst.value)}`, r === worst ? 'neg' : 'pos']],
        note: `${esc(f.short || f.name)} · ${money(ck.amount)} ${T('a month for')} ${ck.years} ${T('years')}. ${T('Illustrative backtest on historical NAV. Not investment advice.')}`,
        acts: `<a class="v22-grad-btn" href="#/signup">${T('Sign up free to see your date')} ${ic('arrowR')}</a>` });
    }
  }
  const mobile = () => matchMedia('(max-width:1099px)').matches;
  const reveal = (id) => { if (mobile()) setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 30); };
  document.addEventListener('click', (e) => {
    const t = e.target; if (!t.closest) return;
    const day = t.closest('[data-ma-ck-day]'), about = t.closest('[data-ma-ck-about]');
    if (day || about) {
      ck.sel = day ? +day.dataset.maCkDay : 'fund';
      document.querySelectorAll('[data-ma-ck-day]').forEach((b) => b.classList.toggle('sel', +b.dataset.maCkDay === ck.sel));
      document.querySelector('[data-ma-ck-about]')?.classList.toggle('active', ck.sel === 'fund');
      side(); reveal('ma-ck-side'); return;
    }
    const x = t.closest('[data-ma-side-close]'); if (!x) return;
    if (x.closest('#ma-ck-side')) { ck.sel = null; document.querySelectorAll('[data-ma-ck-day].sel').forEach((b) => b.classList.remove('sel')); document.querySelector('[data-ma-ck-about]')?.classList.remove('active'); side(); }
    if (x.closest('#ma-learn-side')) { learnSel = null; learnSide(); }
  });
  document.addEventListener('change', (e) => { if (e.target.id === 'ma-ck-fund') { ck.fund = e.target.value; run(); } });
  document.addEventListener('click', (e) => {
    const a = e.target.closest && e.target.closest('[data-ma-ck-amt]'), y = e.target.closest && e.target.closest('[data-ma-ck-yrs]');
    if (a || y) { if (a) ck.amount = +a.dataset.maCkAmt; if (y) ck.years = +y.dataset.maCkYrs; (a || y).parentElement.querySelectorAll('button').forEach((b) => b.classList.toggle('active', b === (a || y))); run(); }
  });

  /* ---------- public fund page ---------- */
  async function fundPage(id) {
    const f = ((typeof D !== 'undefined' && D.funds) || []).find((x) => x.id === id);
    if (!f) { if (window.MA_SYS) MA_SYS.notFoundPage(); return; }
    const h = window.MA_FUNDX ? MA_FUNDX.health(f) : null;
    page(`<section class="ma-pf"><nav class="ma-crumbs"><a href="#/landing">${T('Home')}</a><span>›</span><a href="#/sip-date-checker">${T('Funds')}</a><span>›</span><b>${esc(f.short || f.name)}</b></nav>
      <header class="ma-pf-head">${typeof v22FundLogo === 'function' ? v22FundLogo(f, 'lg') : ''}<div><h1>${esc(f.name)}</h1>${typeof v22Tags === 'function' ? v22Tags(f) : ''}</div><a class="v22-grad-btn" href="#/signup">${ic('star')} ${T('Follow this fund')}</a></header>
      <div class="ma-pf-kpis">${[['1Y', f.returns[1]], ['3Y CAGR', f.returns[3]], ['5Y CAGR', f.returns[5]], ['10Y CAGR', f.returns[10]]].map(([l, v]) => `<div class="v22-card"><small>${l}</small><b class="pos">${pct(v)}</b></div>`).join('')}<div class="v22-card"><small>${T('Risk')}</small><b>${esc(f.riskLabel || f.risk || '—')}</b></div>${h ? `<div class="v22-card"><small>${T('Health score')}</small><b>${h.score}<em> / 100 · ${T(h.label)}</em></b></div>` : ''}</div>
      <section class="v22-card ma-pf-chart"><div class="v22-card-head"><h2>${T('NAV history')} · 5Y</h2><span class="v22-muted">${typeof maAsOf === 'function' && maAsOf() ? `${T('NAV as of')} ${maAsOf()} · AMFI` : 'AMFI'}</span></div><div id="ma-pf-chart">${window.MA_AI ? MA_AI.skelBlock(300) : ''}</div></section>
      <div class="ma-pf-two"><section class="v22-card ma-pf-sip"><h2>${T('Best SIP date this month')}</h2><b class="ma-blur big">12th</b><p>${T('Historically the strongest date for SIPs, with two backup dates and a reminder the day before.')}</p><a class="v22-grad-btn" href="#/signup">${T('Sign up free to see it')}</a></section>
        <section class="v22-card"><h2>${T('Fund details')}</h2><dl class="ma-pf-dl">${[['AMC', f.amc], ['Category', f.category], ['Benchmark', f.benchmark], ['AUM', f.aum], ['Expense ratio', f.expense != null ? f.expense + '%' : null], ['Plan', [f.plan, f.option].filter(Boolean).join(' · ')]].filter(([, v]) => v && v !== '—').map(([k, v]) => `<dt>${T(k)}</dt><dd>${esc(String(v))}</dd>`).join('')}</dl><a class="v22-outline-btn" href="#/sip-date-checker" data-ma-ck-pick="${esc(f.id)}">${T('Check SIP dates for this fund')} ${ic('arrowR')}</a></section></div>
      <p class="v22-note">${T('Past performance does not guarantee future returns. Mutual fund investments are subject to market risks.')}</p></section>`, f.short || f.name);
    const n = await navOf(f.id), el = document.getElementById('ma-pf-chart');
    if (el) el.innerHTML = n && typeof v22DetailChart === 'function' ? v22DetailChart(f, '5Y') : `<p class="v22-sub">${T('NAV history is not available yet.')}</p>`;
  }
  document.addEventListener('click', (e) => { const p = e.target.closest && e.target.closest('[data-ma-ck-pick]'); if (p) ck.fund = p.dataset.maCkPick; });

  /* ---------- learn hub ---------- */
  const ART = [
    ['sip-basics', 'Basics', 'What is a SIP, and why do people use one?', '4 min', ['A Systematic Investment Plan (SIP) invests a fixed amount in a mutual fund every month. Instead of trying to find the perfect moment, you buy a little each month: more units when prices are low, fewer when they are high.', 'This habit is called rupee-cost averaging. It smooths out the ups and downs and removes the stress of timing the market with a lump sum.', 'You choose the fund, the amount and the date. The money moves from your bank automatically through your broker or the fund house. Mod Alpha does not handle money; it helps you choose the date.']],
    ['why-sip-date', 'SIP dates', 'Does the date of my SIP really matter?', '5 min', ['Over a few months, the date makes little difference. Over years, buying on days when NAVs tend to be lower adds up: the same money buys more units.', 'Our backtests look at years of daily NAVs, market holidays and month-end patterns to find the dates that historically worked best for each month. The gains are modest (often 1–3% over a fixed date), but they are free money for the same effort.', 'History does not guarantee the future, which is why each date comes with a confidence level and two backup dates.']],
    ['what-is-cagr', 'Returns', 'CAGR, explained in one minute', '3 min', ['CAGR (compound annual growth rate) is the steady yearly rate that turns the starting value into the ending value. A fund that grew from ₹100 to ₹200 in 5 years has a CAGR of about 14.9%.', 'CAGR hides the bumps along the way: two funds with the same CAGR can feel very different to hold. Look at volatility and the worst year too.', 'For SIPs, where money goes in every month, XIRR is the fairer measure. Mod Alpha shows both where it matters.']],
    ['small-vs-large', 'Funds', 'Small cap vs large cap: which suits you?', '6 min', ['Large-cap funds invest in India’s biggest companies. They tend to fall less in bad years and grow steadily.', 'Small-cap funds invest in smaller companies. They can grow much faster but can also fall 30–40% in a bad year. They suit long horizons (7+ years) and investors who will not panic.', 'Many people hold both: a core of large or flexi cap, with a smaller slice of mid and small cap.']],
    ['expense-ratio', 'Costs', 'Why a 1% expense ratio is a big deal', '4 min', ['The expense ratio is the yearly fee the fund charges, taken from its NAV. Direct plans charge less than regular plans because there is no distributor commission.', 'On ₹10,000 a month for 20 years at 12%, a 1% higher fee can cost you more than ₹10 lakh by the end.', 'When two similar funds have similar returns, the cheaper one usually wins over time.']],
    ['kyc-for-investing', 'Getting started', 'KYC for mutual funds: what you need', '3 min', ['KYC (Know Your Customer) is a one-time identity check required by SEBI. You need your PAN, and Aadhaar-based verification through DigiLocker in most cases.', 'Once your KYC is registered with a KRA, any fund house or platform can use it; you do not repeat it.', 'Mod Alpha asks for KYC only before your first paid plan, through an approved verification partner.']],
  ];
  const art = (s) => ART.find((a) => a[0] === s);
  const TINT = { 'sip-basics': ['#10b981', 'doc'], 'why-sip-date': ['#3b82f6', 'calendar'], 'what-is-cagr': ['#8b5cf6', 'chart'], 'small-vs-large': ['#ec4899', 'bank'], 'expense-ratio': ['#f59e0b', 'rupee'], 'kyc-for-investing': ['#06b6d4', 'idcard'] };
  let learnSel = 'sip-basics';
  function learnCards() {
    return ART.map(([s, c, t, m, p]) => { const [col, icn] = TINT[s] || ['#3b82f6', 'doc'], on = learnSel === s;
      return `<a class="ma-learn-card ma-tcard${on ? ' sel' : ''}" style="--t:${col}" href="#/learn/${s}" data-ma-learn="${s}" aria-pressed="${on}"><span class="ma-tcard-top">${cic(icn, 40)}<i class="ma-tcard-mark">${on ? ic('check') : ic('arrowR')}</i></span><span class="ma-learn-c">${esc(T(c))} · ${m}</span><b>${esc(T(t))}</b><p>${esc(T(p[0]).slice(0, 110))}…</p><span class="ma-tcard-bar"><em></em></span></a>`; }).join('');
  }
  function learnSide() {
    const split = document.getElementById('ma-learn-split'), slot = document.getElementById('ma-learn-side'); if (!split || !slot) return;
    split.classList.toggle('closed', !learnSel);
    split.querySelector('.ma-learn-grid').innerHTML = learnCards();
    const a = learnSel && art(learnSel); if (!a) { slot.innerHTML = ''; return; }
    const [s, c, t, m, p] = a, [col, icn] = TINT[s] || ['', 'doc'], i = ART.indexOf(a), next = [ART[(i + 1) % ART.length], ART[(i + 2) % ART.length]];
    slot.innerHTML = panel({ icon: cic(icn, 40), tint: col, eyebrow: `${esc(T(c).toUpperCase())} · ${m} ${T('read').toUpperCase()}`, title: esc(T(t)),
      body: `<div class="ma-side-body">${p.map((x) => `<p>${esc(T(x))}</p>`).join('')}</div><div class="ma-side-next"><small>${T('Keep reading')}</small>${next.map(([ns, , nt]) => `<button type="button" data-ma-learn="${ns}">${esc(T(nt))} ${ic('arrowR')}</button>`).join('')}</div>`,
      note: T('For education only. Not investment advice. Past performance does not guarantee future returns.'),
      acts: `<a class="v22-grad-btn" href="#/signup">✦ ${T('Ask Alpha free')}</a><a class="v22-outline-btn" href="#/learn/${s}">${T('Open as a page')} ${ic('arrowR')}</a>` });
  }
  document.addEventListener('click', (e) => {
    const c = e.target.closest && e.target.closest('[data-ma-learn]'); if (!c || !c.closest('#ma-learn-split') || e.metaKey || e.ctrlKey || e.shiftKey) return;
    e.preventDefault(); learnSel = c.dataset.maLearn; learnSide(); reveal('ma-learn-side');
  });
  function learnHtml() {
    return `<section class="v22 ma-land-sec" id="learn" data-v22-reveal><div class="v22-sec-head"><span class="v22-eyebrow">${T('LEARN')}</span><h2>${T('Invest with more confidence')}</h2><p>${T('Short, plain-language guides to SIPs, returns and choosing funds.')}</p></div>
      <div class="ma-split" id="ma-learn-split"><div class="ma-learn-grid">${learnCards()}</div><div id="ma-learn-side" class="ma-side-slot"></div></div></section>`;
  }
  function article(slug) {
    const a = art(slug); if (!a) { if (window.MA_SYS) MA_SYS.notFoundPage(); return; }
    const [s, c, t, m, p] = a, rel = ART.filter((x) => x[0] !== s).slice(0, 3);
    page(`<article class="ma-article"><nav class="ma-crumbs"><a href="#/learn">${T('Learn')}</a><span>›</span><b>${esc(T(c))}</b></nav><h1>${esc(T(t))}</h1><p class="ma-art-meta">${m} ${T('read')} · Mod Alpha</p>
      ${p.map((x) => `<p>${esc(T(x))}</p>`).join('')}
      <aside class="v22-card ma-art-ask"><span>✦</span><div><b>${T('Have a question about this?')}</b><p>${T('Ask Alpha, our AI assistant: answers come from Mod Alpha’s own fund data.')}</p></div><a class="v22-grad-btn" href="#/signup">${T('Ask Alpha free')}</a></aside>
      <p class="v22-note">${T('For education only. Not investment advice. Past performance does not guarantee future returns.')}</p>
      <h2>${T('Keep reading')}</h2><div class="ma-learn-grid sm">${rel.map(([rs, rc, rt, rm]) => `<a class="v22-card ma-learn-card" href="#/learn/${rs}"><span class="ma-learn-c">${esc(T(rc))} · ${rm}</span><b>${esc(T(rt))}</b><span class="ma-learn-go">${T('Read')} ${ic('arrowR')}</span></a>`).join('')}</div></article>`, T(t));
  }

  const R = (window.MA_ROUTES = window.MA_ROUTES || {});
  /** Called by renderLanding(): the checker and Learn sit on the landing page, before pricing. */
  window.MA_GROWTH = { landing() {
    const at = document.getElementById('pricing-preview'); if (!at || document.getElementById('sip-checker')) return;
    at.insertAdjacentHTML('beforebegin', checkerHtml() + learnHtml()); run(); learnSide();
    if (typeof v22InitReveal === 'function') v22InitReveal();
  } };
  R['sip-date-checker'] = () => landingAt('sip-checker');
  R.f = (p) => fundPage(decodeURIComponent(p[1] || ''));
  R.learn = (p) => (p[1] ? article(p[1]) : landingAt('learn'));
})();
