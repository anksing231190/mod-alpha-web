/* ==========================================================================
   Feature: My requests (Help & FAQ) — the person's support requests with status and our reply
   Each request shows its reference, topic, date and status (Open · In progress · Answered · Closed); open
   one to read the message and the team's reply. A new request appears here as soon as it is sent.
     live: GET /me/support-tickets (replies come from PATCH /admin/support/tickets/:number)
     demo: two sample requests plus the ones sent from this browser
   Styles: src/styles/ux.css
   ========================================================================== */
(function () {
  const T = (s) => (window.MA_T ? MA_T(s) : s);
  const live = () => !!(window.MA_LIVE && MA_LIVE.API);
  const KEY = 'ma-demo-tickets';
  let items = null, open = null;
  const ago = (h) => new Date(Date.now() - h * 3600e3).toISOString();
  function demo() {
    let mine = []; try { mine = JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) {}
    return [...mine, { number: 'MA-261106-4821', topic: 'Fund data', message: 'The NAV for Quant Small Cap looks a day old today.', status: 'In progress', reply: null, created_at: ago(5) },
      { number: 'MA-261104-1937', topic: 'Subscription', message: 'I was charged twice this month. Can you check?', status: 'Answered', reply: 'Thanks for flagging this. The second charge was a pending authorisation and has been released; it should disappear from your statement within 5 working days.', replied_at: ago(26), created_at: ago(72) }];
  }
  async function load() {
    if (!live()) { items = demo(); paint(); return; }
    try { items = (await MA_LIVE.API.get('/me/support-tickets')).items; } catch (e) { items = []; }
    paint();
  }
  const date = (t) => new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  const pill = (s) => `<span class="ma-req-st ${String(s).toLowerCase().replace(/\s+/g, '-')}">${esc(T(s))}</span>`;
  function html() {
    if (!items) return window.MA_AI ? MA_AI.skel(2) : '';
    if (!items.length) return `<p class="ma-req-none">${T('No requests yet. Questions you send with the form appear here with our reply.')}</p>`;
    return items.map((t) => `<div class="ma-req-it${open === t.number ? ' open' : ''}"><button type="button" class="ma-req-row" data-ma-req="${esc(t.number)}" aria-expanded="${open === t.number}">
        <span class="ma-req-main"><b>${esc(T(t.topic))}</b><small>${esc(t.number)} · ${date(t.created_at)}</small></span>${t.reply && t.status === 'Answered' ? `<span class="ma-req-new">${T('Reply')}</span>` : ''}${pill(t.status)}${ic(open === t.number ? 'chevUp' : 'chevDown')}</button>
      <div class="ma-req-detail"><div class="ma-req-msg"><small>${T('You wrote')}</small><p>${esc(t.message)}</p></div>
        ${t.reply ? `<div class="ma-req-reply"><small>${T('Mod Alpha support')}${t.replied_at ? ' · ' + date(t.replied_at) : ''}</small><p>${esc(t.reply)}</p></div>` : `<p class="ma-req-wait">${ic('clock')} ${T(t.status === 'Closed' ? 'This request is closed.' : 'We reply within one business day. You will also get our reply by email.')}</p>`}</div></div>`).join('');
  }
  function paint() {
    const host = document.querySelector('.v22-help'); if (!host) return;
    let s = document.getElementById('ma-req');
    if (!s) { s = document.createElement('section'); s.className = 'v22-card ma-req'; s.id = 'ma-req'; host.appendChild(s); }
    s.innerHTML = `<div class="v22-card-head"><h2>${cic('chat', 28)} ${T('My requests')}</h2>${items && items.length ? `<span class="v22-muted">${items.filter((t) => t.status !== 'Closed' && t.status !== 'Answered').length} ${T('open')}</span>` : ''}</div><div class="ma-req-list">${html()}</div>`;
  }
  document.addEventListener('click', (e) => {
    const r = e.target.closest && e.target.closest('[data-ma-req]'); if (r) { open = open === r.dataset.maReq ? null : r.dataset.maReq; paint(); return; }
    // a request was sent from the form: show it here
    if (e.target.closest && e.target.closest('[data-v22-support]')) {
      if (live()) { setTimeout(load, 1500); return; }
      const em = document.getElementById('support-email')?.value.trim() || '', msg = document.getElementById('support-message')?.value.trim() || '';
      if (!/^\S+@\S+\.\S+$/.test(em) || msg.length < 10) return;
      const topic = (document.querySelector('#v22-topic button.active')?.textContent || 'Product question').trim();
      const t = { number: `MA-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`, topic, message: msg, status: 'Open', reply: null, created_at: new Date().toISOString() };
      try { const mine = JSON.parse(localStorage.getItem(KEY) || '[]'); mine.unshift(t); localStorage.setItem(KEY, JSON.stringify(mine.slice(0, 10))); } catch (err) {}
      setTimeout(load, 200);
    }
  }, true);
  let q = false;
  new MutationObserver(() => { if (q) return; q = true; requestAnimationFrame(() => { q = false; if (document.querySelector('.v22-help') && !document.getElementById('ma-req')) { paint(); load(); } }); }).observe(document.documentElement, { childList: true, subtree: true });
  addEventListener('ma:logout', () => { items = null; open = null; });
})();
