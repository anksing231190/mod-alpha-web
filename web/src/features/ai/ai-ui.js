/* ==========================================================================
   Feature: "AI feel" for the signed-in app (window.MA_AI)
   Small, shared pieces used by the dashboard, insights, fund page, What-if and the chat:
   • badge()        ✦ AI tag on generated content
   • orb()/skel()   pulsing AI orb while data loads (all loading states; the app's .v22-spin is restyled too)
   • type()         text that writes itself (once per browser session per item; instant in Hindi / reduced motion)
   • chips()/ask()  one-tap questions that open the assistant and ask (each uses 1 of the plan's AI questions)
   • strength()     confidence of the best SIP date — derived from how far it leads the next-best date
   • why()          plain reasons behind the best date (from the published numbers, no AI call)
   • greeting()     time-of-day greeting   • ticker()   live strip of real figures
   • term()         glossary terms (CAGR, Sharpe ratio…) with "✦ Explained" cards; selecting a known term
                    anywhere shows "Explain this" — static text, so it costs no AI questions
   • maAiShell()    run by shell() on every signed-in page: command bar (Ctrl/⌘ K), chat side panel, glossary
   Styles: styles/ai.css. Hindi: features/i18n/i18n-hi.js (template keys with {n}).
   ========================================================================== */
(function () {
  const html = document.documentElement;
  const T = (s) => (window.MA_T ? window.MA_T(s) : s);
  const isHi = () => html.dataset.lang === 'hi' || html.lang === 'hi';
  // the app's datasets are top-level consts (not on window)
  const allFunds = () => (typeof D !== 'undefined' && D.funds) || [];
  const asOfDate = () => (typeof V22D !== 'undefined' && V22D.model && V22D.model.asOf) || (typeof D !== 'undefined' && D.asOf) || '';
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ses = { get: (k) => { try { return sessionStorage.getItem('ma-ai-' + k); } catch (e) { return '1'; } }, set: (k) => { try { sessionStorage.setItem('ma-ai-' + k, '1'); } catch (e) {} } };
  const ord = (d) => d + (d % 10 === 1 && d !== 11 ? 'st' : d % 10 === 2 && d !== 12 ? 'nd' : d % 10 === 3 && d !== 13 ? 'rd' : 'th');

  /* ---------- small markup helpers ---------- */
  const badge = (label = 'AI') => `<span class="ma-ai-badge"><i aria-hidden="true">✦</i> ${esc(T(label))}</span>`;
  // pulsing AI orb — used for every loading state (lists, charts, admin pages, chat "thinking")
  const orb = (label = 'Loading…', h) => `<div class="ma-orb-load" role="status" aria-live="polite"${h ? ` style="min-height:${h}px"` : ''}><span class="ma-orb" aria-hidden="true"></span><small>${esc(T(label))}</small></div>`;
  // content-shaped placeholders: grey shapes in the real layout of what is loading (list rows / a chart), with a
  // small AI orb in the corner, so nothing jumps when the data arrives
  const skHead = () => `<span class="ma-sk-tag"><span class="ma-orb" aria-hidden="true"></span>${esc(T('Loading…'))}</span>`;
  const skel = (rows = 3) => `<div class="ma-sk-list" role="status" aria-live="polite">${skHead()}${Array.from({ length: rows }, (_, i) => `<div class="ma-sk-row"><i class="ma-sk ic"></i><div><i class="ma-sk" style="width:${[58, 46, 64, 52, 40][i % 5]}%"></i><i class="ma-sk sm" style="width:${[84, 72, 90, 78, 66][i % 5]}%"></i></div><i class="ma-sk end"></i></div>`).join('')}</div>`;
  const skelBlock = (h = 280) => `<div class="ma-sk-chart" role="status" aria-live="polite" style="height:${h}px">${skHead()}<svg viewBox="0 0 600 260" preserveAspectRatio="none" aria-hidden="true">${[0, 1, 2, 3, 4].map((i) => `<line x1="40" x2="600" y1="${20 + i * 55}" y2="${20 + i * 55}"/>`).join('')}<path d="M40 230 C 120 212 160 222 220 182 S 330 150 380 122 S 470 72 600 52"/></svg><div class="ma-sk-axis">${Array.from({ length: 6 }, () => '<i class="ma-sk sm"></i>').join('')}</div></div>`;

  /** Text that writes itself once per session (key). Mark with data-ma-type="key" and call animate(). */
  function type(el, text, speed = 18) {
    if (!el) return;
    const t = text != null ? text : el.textContent;
    if (reduced() || isHi()) { el.textContent = t; return; }
    el.textContent = ''; el.classList.add('ma-typing'); let i = 0;
    const step = () => { if (!el.isConnected) return; el.textContent = t.slice(0, ++i); if (i < t.length) setTimeout(step, speed); else el.classList.remove('ma-typing'); };
    step();
  }
  function animate(root = document) {
    root.querySelectorAll('[data-ma-type]').forEach((el) => {
      const k = el.dataset.maType; el.removeAttribute('data-ma-type');
      if (ses.get('type-' + k)) return; ses.set('type-' + k); type(el);
    });
  }
  /** Reveal an HTML answer by typing its text first (chat bubbles). */
  function reveal(el, htmlStr, done) {
    if (reduced() || isHi()) { el.innerHTML = htmlStr; done && done(); return; }
    const tmp = document.createElement('div'); tmp.innerHTML = htmlStr; const t = tmp.textContent;
    el.textContent = ''; el.classList.add('ma-typing'); let i = 0;
    const step = () => { if (!el.isConnected) return; i = Math.min(t.length, i + 3); el.textContent = t.slice(0, i); const box = el.closest('.v22-chat-body'); if (box) box.scrollTop = box.scrollHeight;
      if (i < t.length) setTimeout(step, 14); else { el.classList.remove('ma-typing'); el.innerHTML = htmlStr; done && done(); } };
    step();
  }

  /* ---------- asking the assistant ---------- */
  function ask(q) {
    if (typeof v22OpenChat === 'function') v22OpenChat();
    if (typeof v22ChatSend === 'function') setTimeout(() => v22ChatSend(q), 120);
  }
  const chips = (qs, note = true) => `<div class="ma-chips">${qs.map((q) => `<button type="button" class="ma-chip" data-ma-ask="${esc(q)}"><i aria-hidden="true">✦</i>${esc(T(q))}</button>`).join('')}</div>${note ? `<p class="ma-chips-note">${esc(T('Each question uses 1 of your AI questions.'))}</p>` : ''}`;

  /* ---------- best SIP date: confidence + reasons ---------- */
  /** How strongly the best date leads: gap (percentage points) over the best alternative date. */
  function strength(SP) {
    const best = Number(SP.uplift) || 0, alts = (SP.alts || []).filter((a) => a && a[1] != null).sort((a, b) => b[1] - a[1]);
    const next = alts[0] || null, gap = next ? Math.max(0, best - Number(next[1])) : best;
    const pct = Math.round(Math.max(40, Math.min(95, 55 + gap * 25)));
    return { pct, gap: gap.toFixed(1), next, label: pct >= 80 ? 'High' : pct >= 62 ? 'Medium' : 'Low' };
  }
  function confidence(SP) {
    const s = strength(SP);
    const sub = s.next ? T('Leads the next-best date by {n} points').replace('{n}', s.gap) : T('No close alternative this month');
    return `<div class="ma-conf" title="${esc(T('Confidence is based on how far the best date is ahead of the next-best date in the backtest.'))}"><div class="ma-conf-r"><span>${esc(T('Confidence'))}</span><b>${esc(T(s.label))} · ${s.pct}%</b></div><div class="ma-meter"><i style="--w:${s.pct}%"></i></div><small>${esc(sub)}</small></div>`;
  }
  function why(SP, MN) {
    const s = strength(SP), r = [];
    r.push(T('Historically {n}% better than investing on a fixed date').replace('{n}', '+' + SP.uplift));
    if (s.next) r.push(T('Ahead of the next-best date ({d}) by {n} points').replace('{d}', `${s.next[0]} ${MN}`).replace('{n}', s.gap));
    if ((SP.alts || []).length) r.push(T('Backup dates if it does not suit you: {d}').replace('{d}', SP.alts.map((a) => `${a[0]} ${MN}`).join(', ')));
    r.push(T('Same date for every fund — set one reminder and invest through your own provider'));
    return `<details class="ma-why"><summary><i aria-hidden="true">✦</i>${esc(T('Why this date?'))}</summary><ul>${r.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></details>`;
  }
  /** "Analysing…" overlay, shown once per session per month (CSS-only animation). */
  function analysing(key) {
    if (reduced() || ses.get('anal-' + key)) return '';
    ses.set('anal-' + key);
    const st = ['Scanning NAV history', 'Comparing 28 SIP dates', 'Ranking by average buy cost'];
    return `<div class="ma-anal" aria-hidden="true"><b>${badge()} ${esc(T('Finding this month’s best date'))}</b>${st.map((x, i) => `<span style="--d:${i * 0.55}s"><i></i>${esc(T(x))}</span>`).join('')}</div>`;
  }

  /* ---------- dashboard: greeting + ticker ---------- */
  // time-of-day greeting (the insight line under it was removed on request)
  function greeting(name) {
    const h = new Date().getHours(), first = String(name || '').split(' ')[0] || '';
    const hi = h < 5 ? 'Good evening' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
    return `<h1>${esc(T(hi))}, ${esc(first)} 👋</h1>`;
  }
  function ticker(SP, MN) {
    const F = allFunds(), items = [];
    const asOf = asOfDate();
    if (F.length) items.push(`<span><b>${F.length.toLocaleString('en-IN')}</b> ${esc(T('funds tracked'))}</span>`);
    if (asOf) items.push(`<span>${esc(T('NAV data as of'))} <b>${esc(typeof v22Fmt === 'function' && /\d{4}-\d{2}-\d{2}/.test(asOf) ? v22Fmt(asOf) : asOf)}</b></span>`);
    const top = F.filter((f) => f.returns && f.returns[1] != null).sort((a, b) => b.returns[1] - a.returns[1])[0];
    if (top) items.push(`<span>${esc(T('Top 1Y'))}: <b>${esc(top.short || top.name)}</b> <em class="${top.returns[1] >= 0 ? 'up' : 'down'}">${top.returns[1] >= 0 ? '▲' : '▼'} ${Math.abs(top.returns[1]).toFixed(1)}%</em></span>`);
    const cats = {}; F.forEach((f) => { if (f.returns && f.returns[5] != null && f.category) (cats[f.category] = cats[f.category] || []).push(f.returns[5]); });
    const bestCat = Object.entries(cats).map(([c, v]) => [c, v.reduce((a, b) => a + b, 0) / v.length]).sort((a, b) => b[1] - a[1])[0];
    if (bestCat) items.push(`<span>${esc(T('Best category (5Y)'))}: <b>${esc(bestCat[0])}</b> <em class="up">${bestCat[1].toFixed(1)}%</em></span>`);
    if (SP) items.push(`<span>${esc(MN)} ${esc(T('SIP date'))}: <b>${SP.locked ? '🔒 ' + esc(T('published')) : ord(SP.day)}</b></span>`);
    const ins = window.MA_INSIGHTS && MA_INSIGHTS.items && MA_INSIGHTS.items[0];
    if (ins) items.push(`<span>${badge('Insight')} ${esc(ins.title)}</span>`);
    if (!items.length) return '';
    const row = items.join('');
    return `<div class="ma-ticker" role="status" aria-label="${esc(T('Latest figures'))}"><span class="ma-live"><i></i>${esc(T('Live'))}</span><div class="ma-tk-wrap"><div class="ma-tk">${row}<span aria-hidden="true" class="ma-tk-gap"></span>${row}</div></div></div>`;
  }

  /* ---------- glossary ("Explain this") ---------- */
  const G = {
    cagr: ['CAGR', 'Compound annual growth rate: the steady yearly rate that turns the starting value into the ending value. It hides the ups and downs along the way.'],
    sharpe: ['Sharpe ratio', 'Return earned for each unit of risk (volatility). Higher is better; above 1 is generally considered good.'],
    volatility: ['Volatility', 'How much a fund’s value swings up and down. Higher volatility means a bumpier ride.'],
    nav: ['NAV', 'Net asset value: the price of one unit of the fund, published every business day.'],
    expense: ['Expense ratio', 'The yearly fee a fund charges, as a % of your money. 1% on ₹1 lakh is ₹1,000 a year.'],
    aum: ['AUM', 'Assets under management: the total money invested in the fund.'],
    xirr: ['XIRR', 'Your yearly return when money goes in on different dates, such as a monthly SIP.'],
    sip: ['SIP', 'Systematic investment plan: investing a fixed amount every month.'],
    risk: ['Risk level', 'SEBI’s riskometer grade for the fund, from Low to Very High.'],
    benchmark: ['Benchmark', 'The market index a fund is compared against, such as the Nifty 50.'],
    drawdown: ['Drawdown', 'The fall from a peak to the lowest point before it recovers.'],
    direct: ['Direct plan', 'Bought straight from the fund house with no distributor commission, so the expense ratio is lower.'],
    lumpsum: ['Lump sum', 'Investing the whole amount at once instead of monthly.'],
    absolute: ['Absolute return', 'Total gain as a % of what you invested, without adjusting for time.'],
  };
  const ALIAS = { 'cagr': 'cagr', '5y cagr': 'cagr', '3y cagr': 'cagr', 'sharpe ratio': 'sharpe', 'sharpe': 'sharpe', 'volatility': 'volatility', 'nav': 'nav', 'expense ratio': 'expense', 'aum': 'aum', 'xirr': 'xirr', 'sip': 'sip', 'risk level': 'risk', 'riskometer': 'risk', 'benchmark': 'benchmark', 'drawdown': 'drawdown', 'direct plan': 'direct', 'lump sum': 'lumpsum', 'lumpsum': 'lumpsum', 'absolute return': 'absolute', 'total return': 'absolute' };
  const term = (label, key) => `<span class="ma-term" data-ma-term="${key}" tabindex="0" role="button" aria-label="${esc(T(label))}: ${esc(T('explain'))}">${esc(T(label))}</span>`;
  let pop = null;
  function showExplain(key, rect) {
    const g = G[key]; if (!g) return;
    if (!pop) { pop = document.createElement('div'); pop.className = 'ma-explain'; pop.setAttribute('role', 'tooltip'); document.body.appendChild(pop); }
    pop.innerHTML = `<b>${badge('Explained')} ${esc(T(g[0]))}</b><p>${esc(T(g[1]))}</p>`;
    pop.hidden = false; pop.classList.add('show');
    const w = Math.min(300, innerWidth - 24), x = Math.max(12, Math.min(innerWidth - w - 12, rect.left + rect.width / 2 - w / 2));
    pop.style.width = w + 'px'; pop.style.left = x + 'px';
    const below = rect.bottom + 10, h = pop.offsetHeight; pop.style.top = (below + h > innerHeight - 8 ? Math.max(8, rect.top - h - 10) : below) + 'px';
  }
  function hideExplain() { if (pop) { pop.classList.remove('show'); pop.hidden = true; } hidePill(); }
  let pill = null;
  function hidePill() { if (pill) pill.hidden = true; }
  function initGlossary() {
    if (initGlossary.done) return; initGlossary.done = true;
    document.addEventListener('mouseover', (e) => { const t = e.target.closest && e.target.closest('.ma-term'); if (t && matchMedia('(hover: hover)').matches) showExplain(t.dataset.maTerm, t.getBoundingClientRect()); });
    document.addEventListener('mouseout', (e) => { const t = e.target.closest && e.target.closest('.ma-term'); if (t && (!e.relatedTarget || !t.contains(e.relatedTarget))) hideExplain(); });
    document.addEventListener('focusin', (e) => { const t = e.target.closest && e.target.closest('.ma-term'); if (t) showExplain(t.dataset.maTerm, t.getBoundingClientRect()); });
    document.addEventListener('focusout', (e) => { if (e.target.closest && e.target.closest('.ma-term')) hideExplain(); });
    document.addEventListener('click', (e) => {
      const t = e.target.closest('.ma-term'); if (t) { e.preventDefault(); showExplain(t.dataset.maTerm, t.getBoundingClientRect()); return; }
      const p = e.target.closest('.ma-explain-pill'); if (p) { e.preventDefault(); showExplain(p.dataset.maTerm, p.getBoundingClientRect()); hidePill(); return; }
      const a = e.target.closest('[data-ma-ask]'); if (a) { e.preventDefault(); ask(a.dataset.maAsk); return; }
      if (!e.target.closest('.ma-explain')) hideExplain();
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') hideExplain(); });
    addEventListener('scroll', hideExplain, { passive: true });
    // select a known term anywhere in the app → "✦ Explain this"
    document.addEventListener('mouseup', () => setTimeout(() => {
      const sel = getSelection(); const txt = String(sel || '').trim().toLowerCase().replace(/\s+/g, ' ');
      const key = ALIAS[txt]; if (!key || !sel.rangeCount || !document.querySelector('.main-area')?.contains(sel.anchorNode)) return hidePill();
      const r = sel.getRangeAt(0).getBoundingClientRect();
      if (!pill) { pill = document.createElement('button'); pill.type = 'button'; pill.className = 'ma-explain-pill'; document.body.appendChild(pill); }
      pill.innerHTML = `<i aria-hidden="true">✦</i> ${esc(T('Explain this'))}`; pill.dataset.maTerm = key; pill.hidden = false;
      pill.style.left = Math.max(8, r.left + r.width / 2 - 60) + 'px'; pill.style.top = Math.max(8, r.top - 44) + 'px';
    }, 10));
  }

  /* ---------- command bar (Ctrl/⌘ K) ---------- */
  const CMD_Q = ['Best SIP date this month?', 'What is CAGR?', 'Compare Quant Small Cap vs SBI Contra'];
  function initCommandBar() {
    const top = document.querySelector('.workspace-topbar'); if (!top || top.querySelector('.ma-cmd')) return;
    const box = document.createElement('div'); box.className = 'ma-cmd';
    box.innerHTML = `<span class="ma-cmd-ic" aria-hidden="true">✦</span><input id="ma-cmd-input" type="search" role="combobox" aria-autocomplete="list" autocomplete="off" placeholder="${esc(T('Search funds or ask Mod Alpha…'))}" aria-label="${esc(T('Search funds or ask Mod Alpha'))}" aria-controls="ma-cmd-list" aria-expanded="false"><kbd>${/Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl'} K</kbd><div class="ma-cmd-list" id="ma-cmd-list" role="listbox" hidden></div>`;
    top.insertBefore(box, top.querySelector('.workspace-actions'));
    const input = box.querySelector('input'), list = box.querySelector('.ma-cmd-list'); let rows = [], hl = 0;
    // grouped results: Funds · Ask Alpha · Pages · Actions (↑↓ move, ↵ open, Esc close)
    const PAGES = [['user/overview', 'Overview', 'chart'], ['user/funds', 'Explore Funds', 'search'], ['user/whatif', 'What If Calculator', 'rupee'], ['user/sip', 'MOD Alpha SIP', 'calendar'], ['user/subscription', 'Subscription', 'crown'], ['user/settings', 'Settings', 'sliders'], ['user/help', 'Help & FAQ', 'help']];
    const mark = (s, ql) => { const e = esc(s); if (!ql) return e; const i = s.toLowerCase().indexOf(ql); return i < 0 ? e : esc(s.slice(0, i)) + '<mark>' + esc(s.slice(i, i + ql.length)) + '</mark>' + esc(s.slice(i + ql.length)); };
    const draw = () => {
      const q = input.value.trim(), ql = q.toLowerCase(), F = allFunds(), hit = (s) => !ql || T(s).toLowerCase().includes(ql) || s.toLowerCase().includes(ql);
      rows = [];
      const funds = q ? F.filter((f) => (f.name + ' ' + (f.short || '') + ' ' + (f.amc || '') + ' ' + (f.category || '')).toLowerCase().includes(ql)).slice(0, 5) : [];
      funds.forEach((f) => rows.push({ g: 'Funds', k: 'fund', id: f.id, f, label: f.short || f.name, tag: `${f.category || T('Fund')}${f.returns && f.returns[5] != null ? ` · ${f.returns[5].toFixed(1)}% 5Y` : ''}` }));
      if (q) rows.push({ g: 'Ask Alpha', k: 'ask', q, label: `“${q}”`, tag: T('Ask AI') });
      else CMD_Q.forEach((x) => rows.push({ g: 'Ask Alpha', k: 'ask', q: x, label: T(x), tag: T('Ask AI') }));
      PAGES.filter((p) => hit(p[1])).slice(0, q ? 4 : 7).forEach((p) => rows.push({ g: 'Pages', k: 'go', to: p[0], icon: p[2], label: T(p[1]), tag: T('Page') }));
      const light = document.documentElement.dataset.theme === 'light', hi = document.documentElement.dataset.lang === 'hi';
      const acts = [
        { k: 'act', a: 'theme', icon: 'palette', label: light ? T('Switch to dark theme') : T('Switch to light theme'), words: 'theme dark light mode night day' },
        { k: 'act', a: 'lang', icon: 'globe', label: hi ? 'Switch to English' : 'हिन्दी में बदलें (Hindi)', words: 'language hindi english हिन्दी' },
        { k: 'act', a: 'chat', icon: 'chat', label: T('Open chat with Alpha'), words: 'chat alpha assistant ai help' },
        { k: 'act', a: 'tour', icon: 'sliders', label: T('Take the quick tour'), words: 'tour help guide start onboarding' },
      ];
      if (funds[0] && window.MA_FUNDX) acts.unshift({ k: 'act', a: 'compare', id: funds[0].id, icon: 'brain', label: `${T('Compare')} ${funds[0].short || funds[0].name} ${T('with…')}`, words: '' });
      acts.filter((a) => !ql || a.a === 'compare' || (a.label + ' ' + a.words).toLowerCase().includes(ql)).forEach((a) => rows.push(Object.assign({ g: 'Actions', tag: T('Action') }, a)));
      hl = 0;
      let g0 = '';
      const icon = (r) => r.k === 'ask' ? '<i class="ai" aria-hidden="true">✦</i>' : r.k === 'fund' ? (typeof v22FundIcon === 'function' ? `<span class="ma-cmd-logo">${v22FundIcon(r.f)}</span>` : ic('search')) : `<span class="ma-cmd-gi">${typeof cic === 'function' ? cic(r.icon || 'search', 24) : ic('arrowR')}</span>`;
      list.innerHTML = rows.length ? rows.map((r, i) => { const head = r.g !== g0 ? `<p class="ma-cmd-g" role="presentation">${esc(T(r.g))}</p>` : ''; g0 = r.g; return `${head}<div role="option" id="ma-cmd-o${i}" class="ma-cmd-it${i === hl ? ' hl' : ''}" data-i="${i}">${icon(r)}<span>${r.k === 'fund' || r.k === 'go' ? mark(r.label, ql) : esc(r.label)}</span><small>${esc(r.tag)}</small></div>`; }).join('') + `<p class="ma-cmd-keys" role="presentation"><kbd>↑</kbd><kbd>↓</kbd> ${esc(T('move'))} · <kbd>↵</kbd> ${esc(T('open'))} · <kbd>Esc</kbd> ${esc(T('close'))}</p>` : `<p class="ma-cmd-empty">${esc(T('No matching funds'))}</p>`;
      list.hidden = false; input.setAttribute('aria-expanded', 'true'); box.classList.add('open');
    };
    const close = () => { list.hidden = true; input.setAttribute('aria-expanded', 'false'); box.classList.remove('open'); };
    const pick = (r) => {
      if (!r) return; close(); input.blur(); input.value = '';
      if (r.k === 'ask') ask(r.q);
      else if (r.k === 'fund') go('user/fund/' + encodeURIComponent(r.id));
      else if (r.k === 'act') {
        if (r.a === 'theme') { if (window.MA_THEME) MA_THEME.set(document.documentElement.dataset.theme === 'light' ? 'dark' : 'light'); }
        else if (r.a === 'lang') { if (window.MA_I18N) MA_I18N.set(document.documentElement.dataset.lang === 'hi' ? 'en' : 'hi'); }
        else if (r.a === 'chat') { if (typeof v22OpenChat === 'function') v22OpenChat(); }
        else if (r.a === 'tour') { if (window.MA_TOUR) MA_TOUR.start(); }
        else if (r.a === 'compare') { go('user/funds'); setTimeout(() => window.MA_FUNDX && MA_FUNDX.add(r.id), 80); }
      } else go(r.to);
    };
    input.addEventListener('focus', draw); input.addEventListener('input', draw);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); hl = (hl + (e.key === 'ArrowDown' ? 1 : -1) + rows.length) % rows.length; list.querySelectorAll('.ma-cmd-it').forEach((x, i) => x.classList.toggle('hl', i === hl)); input.setAttribute('aria-activedescendant', 'ma-cmd-o' + hl); list.querySelector('.ma-cmd-it.hl')?.scrollIntoView({ block: 'nearest' }); }
      else if (e.key === 'Enter') { e.preventDefault(); pick(rows[hl]); }
      else if (e.key === 'Escape') { close(); input.blur(); }
    });
    list.addEventListener('mousedown', (e) => { const it = e.target.closest('.ma-cmd-it'); if (it) { e.preventDefault(); pick(rows[+it.dataset.i]); } });
    input.addEventListener('blur', () => setTimeout(close, 120));
  }
  function initHotkey() {
    if (initHotkey.done) return; initHotkey.done = true;
    document.addEventListener('keydown', (e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { const i = document.getElementById('ma-cmd-input'); if (i) { e.preventDefault(); i.focus(); } } });
  }

  /* ---------- chat: side panel, ✦ badge, remaining questions ---------- */
  function decorateChat() {
    const d = document.getElementById('chat-drawer'); if (!d || d.dataset.maAi) return; d.dataset.maAi = '1';
    d.classList.add('ma-side');
    const b = d.querySelector('.v22-chat-head b'); if (b) b.insertAdjacentHTML('beforeend', ' ' + badge());
    const st = d.querySelector('.v22-chat-head small'); if (st) st.innerHTML = `<i></i> ${esc(T('Answers from Mod Alpha data'))}`;
    const note = d.querySelector('.v22-chat-note'); if (note) note.insertAdjacentHTML('afterbegin', '<span class="ma-quota" id="ma-quota"></span> ');
    if (window.MA_AI_QUOTA) quota(window.MA_AI_QUOTA);
  }
  /** Show "N of M questions left today · K this month" under the chat box. */
  function quota(u) {
    window.MA_AI_QUOTA = u; const el = document.getElementById('ma-quota'); if (!el || !u) return;
    const parts = [];
    if (u.limit >= 0) parts.push(T('{n} of {n} AI questions left today').replace('{n}', Math.max(0, u.limit - u.today)).replace('{n}', u.limit));
    if (u.monthLimit >= 0) parts.push(T('{n} left this month').replace('{n}', Math.max(0, u.monthLimit - u.month)));
    el.textContent = parts.join(' · ') + (parts.length ? ' ·' : '');
  }
  function thinking(on) { document.querySelector('.v22-fab')?.classList.toggle('ma-thinking', !!on); document.getElementById('chat-drawer')?.classList.toggle('ma-thinking', !!on); }

  /** Run by shell() for every signed-in page (users and admins). */
  window.maAiShell = function (role) {
    initGlossary(); hideExplain();
    if (role === 'user') { initCommandBar(); initHotkey(); decorateChat(); }
    setTimeout(() => animate(), 30);
  };

  window.MA_AI = { badge, orb, skel, skelBlock, type, animate, reveal, ask, chips, strength, confidence, why, analysing, greeting, ticker, term, quota, thinking, ord };
})();
