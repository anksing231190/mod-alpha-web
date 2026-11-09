/* ==========================================================================
   Feature: getting started — onboarding tour, "Getting started" checklist, AI usage meter, data stamps
   • MA_TOUR.start(): five short tips that spotlight the key numbers, the SIP calendar, Ctrl+K, My Watchlist
     and Alpha. Opens by itself the first time someone reaches the dashboard (then 'ma-tour-done' is saved);
     can be replayed from the checklist or Ctrl+K.
   • Checklist: a "Getting started 2/5" button next to the greeting with a ring; its list links to each step
     (mobile number, KYC, first watchlist fund, first question to Alpha, the tour). Hides when all are done
     or when dismissed.
   • AI usage meter: a small ring in the top bar showing today's AI questions left (and this month's), with
     a nudge to the plans when close to the limit. Data: MA_AI.quota() (live) or a count kept in this
     browser (demo, Free plan limits).
   • maAsOf(): the "as of" date for number cards ("NAV as of 31 Oct · AMFI").
   Styles: src/styles/ux.css
   ========================================================================== */
(function () {
  const T = (s) => (window.MA_T ? MA_T(s) : s);
  const ls = { get: (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} } };
  const live = () => !!(window.MA_API && MA_API.enabled);
  const onDash = () => /^#\/(user\/overview|guest\/user)?$|^#\/user\/?$|^#\/user\/overview\b/.test(location.hash || '#/user/overview');

  /* ---------- "as of" date for number cards ---------- */
  function asOf() {
    let d = typeof V22D !== 'undefined' && V22D.model && V22D.model.asOf;
    if (!d && typeof D !== 'undefined' && D.funds) d = D.funds.map((f) => f.navDate).filter(Boolean).sort().pop();
    if (!d) return '';
    const x = typeof v22D === 'function' ? v22D(d) : new Date(d);
    return isNaN(x) ? '' : x.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
  }
  window.maAsOf = asOf;

  /* ---------- tour ---------- */
  const STEPS = [
    ['.v22-kpis', 'Your numbers at a glance', 'Top fund, this month’s best SIP date, category return and how many funds we track. Each card says how fresh its data is.'],
    ['.v22-cal-card', 'This month’s SIP date', 'The calendar marks the historically strongest date. Set a reminder and we will nudge you the day before.'],
    ['.workspace-topbar .ma-cmd', 'Search everything: Ctrl + K', 'Find a fund, jump to any page, switch theme or ask Alpha, all from the keyboard.'],
    ['.sidebar a[href="#/user/watchlist"]', 'Follow funds', 'Tap “Add to Watchlist” on any fund. Your list lives here with each fund’s health score.'],
    ['.v22-fab', 'Ask Alpha', 'Questions about funds, returns or SIP dates, answered from Mod Alpha’s own data.'],
  ];
  let tour = null;
  const Z = () => parseFloat(getComputedStyle(document.documentElement).zoom) || 1; // the app runs at 85% zoom on wide screens: rects are zoomed, style values are not
  function start() {
    if (!onDash() && typeof go === 'function') { go('user/overview'); setTimeout(start, 600); return; }
    stop(); const steps = STEPS.filter(([s]) => { const e = document.querySelector(s); return e && e.getClientRects().length; });
    if (!steps.length) return;
    const hole = document.createElement('div'); hole.className = 'ma-tour-hole';
    const card = document.createElement('div'); card.className = 'ma-tour-card'; card.setAttribute('role', 'dialog'); card.setAttribute('aria-live', 'polite');
    document.body.append(hole, card);
    tour = { steps, i: 0, hole, card };
    show();
  }
  function show() {
    const { steps, i, hole, card } = tour, [sel, title, text] = steps[i], el = document.querySelector(sel);
    if (!el) { next(); return; }
    el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    card.innerHTML = `<small>${i + 1} / ${steps.length}</small><b>${esc(T(title))}</b><p>${esc(T(text))}</p>
      <div class="ma-tour-act"><button type="button" class="ma-tour-skip" data-ma-tour="skip">${T('Skip tour')}</button><span></span>${i ? `<button type="button" class="v22-outline-btn" data-ma-tour="back">${T('Back')}</button>` : ''}<button type="button" class="v22-grad-btn" data-ma-tour="next">${T(i === steps.length - 1 ? 'Done' : 'Next')}</button></div>
      <div class="ma-tour-dots">${steps.map((_, k) => `<i class="${k === i ? 'on' : ''}"></i>`).join('')}</div>`;
    setTimeout(place, 320); place();
    card.querySelector('[data-ma-tour="next"]').focus({ preventScroll: true });
  }
  function place() {
    if (!tour) return;
    const el = document.querySelector(tour.steps[tour.i][0]); if (!el) return;
    const z = Z(), q = el.getBoundingClientRect(), r = { left: q.left / z, top: q.top / z, right: q.right / z, bottom: q.bottom / z, width: q.width / z, height: q.height / z }, pad = 8, h = tour.hole, c = tour.card, W = innerWidth / z, H = innerHeight / z;
    Object.assign(h.style, { left: r.left - pad + 'px', top: r.top - pad + 'px', width: r.width + pad * 2 + 'px', height: r.height + pad * 2 + 'px' });
    const side = r.left < 300 && r.width < 260 && r.height < 80; // menu items on the left: the card sits beside them
    const cw = Math.min(340, W - 24), below = r.bottom + 200 < H;
    let left = Math.min(W - cw - 12, Math.max(12, r.left + r.width / 2 - cw / 2));
    if (side) left = Math.min(W - cw - 12, r.right + 18);
    c.style.width = cw + 'px'; c.style.left = left + 'px';
    c.style.top = (side ? Math.max(12, r.top - 20) : below ? r.bottom + 16 : Math.max(12, r.top - 16 - c.offsetHeight / 1)) + 'px';
  }
  function next() { if (!tour) return; if (tour.i >= tour.steps.length - 1) return finish(); tour.i++; show(); }
  function back() { if (tour && tour.i) { tour.i--; show(); } }
  function stop() { if (tour) { tour.hole.remove(); tour.card.remove(); tour = null; } }
  function finish() { stop(); ls.set('ma-tour-done', '1'); paintStart(); }
  document.addEventListener('click', (e) => { const b = e.target.closest && e.target.closest('[data-ma-tour]'); if (!b) return; const a = b.dataset.maTour; if (a === 'next') next(); else if (a === 'back') back(); else finish(); });
  document.addEventListener('keydown', (e) => { if (!tour) return; if (e.key === 'Escape') finish(); else if (e.key === 'ArrowRight') next(); else if (e.key === 'ArrowLeft') back(); });
  addEventListener('resize', () => place(), { passive: true }); addEventListener('scroll', () => place(), { passive: true, capture: true });
  addEventListener('hashchange', () => { if (tour && !onDash()) stop(); });
  window.MA_TOUR = { start, stop };

  /* ---------- getting started checklist ---------- */
  const user = () => (window.MA_STATE && MA_STATE.user) || (typeof currentUser !== 'undefined' ? currentUser : {});
  const kycDone = () => { const u = user(); if (u && u.kycStatus) return /verified/i.test(u.kycStatus); try { return /verified/i.test((JSON.parse(ls.get('mod-alpha-demo-kyc')) || {}).status || ''); } catch (e) { return false; } };
  const ITEMS = [
    ['mobile', 'Add your mobile number', 'For SMS reminders', () => !!(user().mobile || user().phone || ls.get('ma-demo-mobile')), () => { go('user/settings'); setTimeout(() => document.getElementById('profile-mobile')?.focus(), 400); }],
    ['kyc', 'Complete KYC', 'Needed before your first paid plan', kycDone, () => { go('user/subscription'); setTimeout(() => window.MA_KYC && MA_KYC.open(), 500); }],
    ['watch', 'Add a fund to your watchlist', 'Follow its SIP date and health', () => !!(window.MA_WATCH && MA_WATCH.size()), () => go('user/funds')],
    ['ask', 'Ask Alpha a question', 'Answers from Mod Alpha data', () => !!(ls.get('ma-asked') || (window.MA_AI_QUOTA && MA_AI_QUOTA.today > 0)), () => { if (typeof v22OpenChat === 'function') v22OpenChat(); }],
    ['tour', 'Take the 30-second tour', 'See where everything is', () => !!ls.get('ma-tour-done'), () => start()],
  ];
  function paintStart() {
    const host = document.querySelector('.v22-dash .v22-welcome'); if (!host) return;
    const done = ITEMS.filter((x) => x[3]()).length, all = ITEMS.length;
    let b = host.querySelector('.ma-start');
    if (done === all || ls.get('ma-start-hide')) { if (b) b.remove(); return; }
    const r = 15, c = 2 * Math.PI * r, open = b && b.classList.contains('open');
    const html = `<button type="button" class="ma-start-btn" data-ma-start aria-expanded="${!!open}"><svg viewBox="0 0 36 36" aria-hidden="true"><circle cx="18" cy="18" r="${r}" class="bg"/><circle cx="18" cy="18" r="${r}" class="fg" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - done / all)}"/></svg><span><b>${T('Getting started')}</b><small>${done} / ${all} ${T('done')}</small></span>${ic(open ? 'chevUp' : 'chevDown')}</button>
      <div class="ma-start-pop" role="list">${ITEMS.map(([k, t, s, ok]) => { const d = ok(); return `<button type="button" role="listitem" class="ma-start-it${d ? ' done' : ''}" data-ma-start-go="${k}" ${d ? 'tabindex="-1"' : ''}><i>${d ? '✓' : ''}</i><span><b>${esc(T(t))}</b><small>${esc(T(s))}</small></span>${d ? '' : ic('arrowR')}</button>`; }).join('')}<button type="button" class="ma-start-hide" data-ma-start-hide>${T('Hide this list')}</button></div>`;
    if (!b) { b = document.createElement('div'); b.className = 'ma-start'; host.appendChild(b); }
    b.innerHTML = html; b.classList.toggle('open', open);
  }
  document.addEventListener('click', (e) => {
    const s = e.target.closest && e.target.closest('.ma-start');
    if (e.target.closest && e.target.closest('[data-ma-start]')) { s.classList.toggle('open'); paintStart(); return; }
    const g = e.target.closest && e.target.closest('[data-ma-start-go]'); if (g) { const it = ITEMS.find((x) => x[0] === g.dataset.maStartGo); s?.classList.remove('open'); if (it && !it[3]()) it[4](); return; }
    if (e.target.closest && e.target.closest('[data-ma-start-hide]')) { ls.set('ma-start-hide', '1'); paintStart(); return; }
    if (!s) document.querySelectorAll('.ma-start.open').forEach((x) => { x.classList.remove('open'); paintStart(); });
  });

  /* ---------- AI usage meter (top bar) ---------- */
  const today = () => new Date().toISOString().slice(0, 10);
  function demoUsage() { let u = {}; try { u = JSON.parse(ls.get('ma-ai-used')) || {}; } catch (e) {} if (u.day !== today()) u = { day: today(), today: 0, month: u.month && u.mon === today().slice(0, 7) ? u.month : 0, mon: today().slice(0, 7) }; return u; }
  function usage() {
    const q = window.MA_AI_QUOTA;
    if (q && q.limit != null) return { today: q.today || 0, limit: q.limit, month: q.month || 0, monthLimit: q.monthLimit };
    if (live()) return null;
    const u = demoUsage(), paid = window.MA_REMINDER && MA_REMINDER.subscribed();
    return { today: u.today, limit: paid ? 10 : 1, month: u.month, monthLimit: paid ? 200 : 20 };
  }
  function paintMeter() {
    const bar = document.querySelector('.workspace-topbar .workspace-actions'); if (!bar || typeof currentRole !== 'undefined' && currentRole !== 'user') { document.querySelector('.ma-usage')?.remove(); return; }
    const u = usage(); let m = bar.querySelector('.ma-usage');
    if (!u || u.limit < 0) { if (m) m.remove(); return; }
    const left = Math.max(0, u.limit - u.today), frac = u.limit ? left / u.limit : 0, r = 13, c = 2 * Math.PI * r, low = left <= Math.max(0, Math.floor(u.limit * 0.2));
    const mLeft = u.monthLimit >= 0 ? Math.max(0, u.monthLimit - u.month) : null, open = m && m.classList.contains('open');
    const html = `<button type="button" class="ma-usage-btn${low ? ' low' : ''}" data-ma-usage aria-expanded="${!!open}" title="${esc(T('AI questions left today'))}"><svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="${r}" class="bg"/><circle cx="16" cy="16" r="${r}" class="fg" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - frac)}"/></svg><span>✦ ${left}/${u.limit}</span></button>
      <div class="ma-usage-pop"><b>${T('AI questions')}</b>
        <div class="ma-usage-row"><span>${T('Today')}</span><em>${left} ${T('of')} ${u.limit} ${T('left')}</em></div><i class="ma-usage-bar"><i style="width:${(frac * 100).toFixed(0)}%"></i></i>
        ${mLeft != null ? `<div class="ma-usage-row"><span>${T('This month')}</span><em>${mLeft} ${T('of')} ${u.monthLimit} ${T('left')}</em></div><i class="ma-usage-bar"><i style="width:${(u.monthLimit ? mLeft / u.monthLimit * 100 : 0).toFixed(0)}%"></i></i>` : ''}
        <div class="ma-usage-act"><button type="button" class="v22-outline-btn" data-ma-usage-ask>✦ ${T('Ask Alpha')}</button>${u.limit <= 1 || low ? `<a class="v22-grad-btn" href="#/user/subscription">${T('Get more questions')}</a>` : ''}</div></div>`;
    if (!m) { m = document.createElement('div'); m.className = 'ma-usage'; bar.insertBefore(m, bar.querySelector('.v22-bell, [data-v22-bell], .icon-action') || bar.firstChild); }
    m.innerHTML = html; m.classList.toggle('open', open);
  }
  document.addEventListener('click', (e) => {
    const m = e.target.closest && e.target.closest('.ma-usage');
    if (e.target.closest && e.target.closest('[data-ma-usage]')) { m.classList.toggle('open'); paintMeter(); return; }
    if (e.target.closest && e.target.closest('[data-ma-usage-ask]')) { m?.classList.remove('open'); if (typeof v22OpenChat === 'function') v22OpenChat(); return; }
    if (!m) document.querySelectorAll('.ma-usage.open').forEach((x) => { x.classList.remove('open'); });
  });
  // count questions: demo keeps its own count; both modes remember that Alpha was asked (checklist)
  const asked = () => { ls.set('ma-asked', '1'); if (!live()) { const u = demoUsage(); u.today++; u.month++; ls.set('ma-ai-used', JSON.stringify(u)); } setTimeout(() => { paintMeter(); paintStart(); }, 50); };
  document.addEventListener('click', (e) => { if (e.target.closest && e.target.closest('[data-v22-chat-send],[data-v22-prompt],[data-ma-ask]') && (e.target.closest('[data-v22-prompt],[data-ma-ask]') || (document.getElementById('v22-chat-input')?.value || '').trim())) asked(); }, true);
  document.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.id === 'v22-chat-input' && e.target.value.trim()) asked(); }, true);
  if (window.MA_AI && MA_AI.quota) { const base = MA_AI.quota; MA_AI.quota = (u) => { base(u); paintMeter(); }; }

  /* ---------- keep everything painted ---------- */
  let q = false;
  new MutationObserver(() => {
    if (q) return; q = true;
    requestAnimationFrame(() => {
      q = false;
      if (document.querySelector('.v22-dash .v22-welcome') && !document.querySelector('.v22-dash .ma-start') && !ls.get('ma-start-hide')) paintStart();
      if (document.querySelector('.workspace-topbar .workspace-actions') && !document.querySelector('.ma-usage')) paintMeter();
      if (!ls.get('ma-tour-done') && !tour && onDash() && document.querySelector('.v22-kpis') && !start.queued) { start.queued = true; setTimeout(() => { start.queued = false; if (!ls.get('ma-tour-done') && onDash() && !tour) start(); }, 1400); }
    });
  }).observe(document.documentElement, { childList: true, subtree: true });
  addEventListener('storage', () => { paintStart(); paintMeter(); });
})();
