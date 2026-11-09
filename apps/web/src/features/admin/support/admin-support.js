/* ==========================================================================
   Admin: Support inbox (#/admin/support)
   Every request sent from Help & FAQ: open ones first. Left — filter by status (with counts) and search;
   right — the request, the customer, an earlier reply, and a reply box with quick starters. Sending a reply
   marks it Answered, emails the customer and adds a notice to their bell / Help → My requests.
   "In progress" and "Close" change the status only.
     live: GET /admin/support/tickets?status=&q= · PATCH /admin/support/tickets/:number { status?, reply? }
     demo: sample requests kept in this browser
   Styles: src/styles/ux.css (.ma-inbox)
   ========================================================================== */
(function () {
  const T = (s) => (window.MA_T ? MA_T(s) : s);
  const live = () => !!(window.MA_LIVE && MA_LIVE.API);
  const STATUSES = ['Open', 'In progress', 'Answered', 'Closed'];
  const TONE = { Open: 'blue', 'In progress': 'amber', Answered: 'green', Closed: 'grey' };
  const STARTERS = [
    ['Thanks', 'Thanks for writing to us. '],
    ['Billing', 'I have checked your billing history: '],
    ['Refund', 'We have issued a refund of ₹… to your original payment method. It usually arrives in 5–7 working days, and the GST credit note is in Subscription → Billing history.'],
    ['SIP date', 'This month’s recommended SIP date is published on the dashboard calendar for subscribers, with two backup dates.'],
    ['Data', 'NAV data is updated every evening from AMFI; returns use the latest NAV.'],
  ];
  let st = { filter: 'open', q: '', items: null, counts: {}, sel: null, loading: false };
  const DKEY = 'ma-demo-admin-tickets';
  const ago = (h) => new Date(Date.now() - h * 3600e3).toISOString();
  function demo() {
    try { const s = JSON.parse(localStorage.getItem(DKEY) || 'null'); if (s) return s; } catch (e) {}
    return [
      { number: 'MA-261109-4821', full_name: 'Riya Mehta', email: 'riya.m@example.com', topic: 'Subscription', message: 'I was charged ₹299 twice this month for Pro. Can you check and refund the extra one?', status: 'Open', created_at: ago(1) },
      { number: 'MA-261109-3377', full_name: 'Arjun Nair', email: 'arjun.n@example.com', topic: 'Fund data', message: 'Quant Small Cap NAV on the fund page looks a day old. Is the data delayed?', status: 'Open', created_at: ago(3) },
      { number: 'MA-261108-9012', full_name: 'Sneha Kulkarni', email: 'sneha.k@example.com', topic: 'Product question', message: 'How is the best SIP date chosen? Does it change every month?', status: 'In progress', created_at: ago(20) },
      { number: 'MA-261107-1450', full_name: 'Vikram Shah', email: 'vikram.s@example.com', topic: 'Account & privacy', message: 'Please delete my account and all my data.', status: 'Answered', reply: 'Your deletion request is registered. Your account will be removed in 30 days; you can cancel it from Settings until then.', replied_at: ago(40), created_at: ago(46) },
      { number: 'MA-261102-0077', full_name: 'Neha Gupta', email: 'neha.g@example.com', topic: 'Subscription', message: 'Can I switch from monthly to yearly?', status: 'Closed', reply: 'Yes — choose Yearly on the Subscription page; you pay the yearly price minus the unused days of this month.', replied_at: ago(160), created_at: ago(170) },
    ];
  }
  const saveDemo = () => { try { localStorage.setItem(DKEY, JSON.stringify(st.items)); } catch (e) {} };
  const when = (t) => { const m = Math.round((Date.now() - new Date(t)) / 60000); return m < 60 ? `${Math.max(1, m)} ${T('min ago')}` : m < 1440 ? `${Math.round(m / 60)} ${T('h ago')}` : new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }); };
  const pill = (s) => `<span class="ma-tk-st ${TONE[s] || 'grey'}">${T(s)}</span>`;

  async function load() {
    if (st.loading) return; st.loading = true;
    if (!live()) {
      st.items = demo(); st.counts = STATUSES.reduce((a, s) => ({ ...a, [s]: st.items.filter((t) => t.status === s).length }), {});
    } else {
      try { const r = await MA_LIVE.API.get('/admin/support/tickets'); st.items = r.items; st.counts = r.counts || {}; } catch (e) { st.items = []; st.err = MA_LIVE.errMsg ? MA_LIVE.errMsg(e) : e.message; }
    }
    st.loading = false;
    if (!st.sel && st.items.length) st.sel = (st.items.find((t) => t.status === 'Open' || t.status === 'In progress') || st.items[0]).number;
    paint();
  }
  function visible() {
    const q = st.q.toLowerCase();
    return (st.items || []).filter((t) => (st.filter === 'all' ? true : st.filter === 'open' ? (t.status === 'Open' || t.status === 'In progress') : t.status === st.filter)
      && (!q || [t.number, t.email, t.topic, t.message, t.full_name].some((x) => String(x || '').toLowerCase().includes(q))));
  }
  function listHtml() {
    const v = visible(), openN = (st.counts.Open || 0) + (st.counts['In progress'] || 0);
    const F = [['open', 'Needs a reply', openN], ['Answered', 'Answered', st.counts.Answered || 0], ['Closed', 'Closed', st.counts.Closed || 0], ['all', 'All', (st.items || []).length]];
    return `<div class="ma-inbox-filters"><div class="v22-seg-pills wrap">${F.map(([k, l, n]) => `<button type="button" class="${st.filter === k ? 'active' : ''}" data-tk-f="${k}">${T(l)} <em>${n}</em></button>`).join('')}</div>
      <label class="ma-inbox-q">${ic('search')}<input type="search" placeholder="${esc(T('Search name, email, request no.'))}" value="${esc(st.q)}" data-tk-q></label></div>
      <div class="ma-inbox-list" role="list">${v.map((t) => `<button type="button" role="listitem" class="ma-tk ${st.sel === t.number ? 'on' : ''} ${t.status === 'Open' ? 'unread' : ''}" data-tk="${esc(t.number)}">
        <span class="ma-tk-av" aria-hidden="true">${esc((t.full_name || t.email || '?').trim()[0].toUpperCase())}</span>
        <span class="ma-tk-body"><span class="ma-tk-top"><b>${esc(t.full_name || t.email)}</b><time>${esc(when(t.created_at))}</time></span>
        <span class="ma-tk-sub">${esc(t.topic)} · ${esc(t.number)}</span><span class="ma-tk-msg">${esc(t.message)}</span>${pill(t.status)}</span></button>`).join('') || `<p class="ma-inbox-empty">${T('Nothing here. New requests from Help & FAQ appear in this list.')}</p>`}</div>`;
  }
  function detailHtml() {
    const t = (st.items || []).find((x) => x.number === st.sel);
    if (!t) return `<div class="ma-inbox-none">${cic('chat', 48)}<b>${T('Pick a request')}</b><p>${T('Its message and the reply box open here.')}</p></div>`;
    return `<header class="ma-tkd-head"><div><span class="ma-tkd-no">${esc(t.number)} · ${esc(t.topic)}</span><h2>${esc(t.full_name || t.email)}</h2><a href="mailto:${esc(t.email)}">${esc(t.email)}</a></div>${pill(t.status)}</header>
      <div class="ma-tkd-thread">
        <article class="ma-msg them"><small>${T('Customer')} · ${esc(new Date(t.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }))}</small><p>${esc(t.message)}</p></article>
        ${t.reply ? `<article class="ma-msg us"><small>${T('Mod Alpha support')}${t.replied_at ? ` · ${esc(new Date(t.replied_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }))}` : ''}</small><p>${esc(t.reply)}</p></article>` : ''}
      </div>
      ${t.status === 'Closed' ? `<div class="ma-tkd-closed">${ic('check')} ${T('This request is closed.')} <button type="button" class="ma-linkbtn" data-tk-st="Open">${T('Reopen')}</button></div>` : `
      <div class="ma-tkd-reply"><div class="ma-tkd-starters">${STARTERS.map(([l, x]) => `<button type="button" data-tk-starter="${esc(x)}">+ ${esc(T(l))}</button>`).join('')}</div>
        <textarea rows="5" data-tk-reply placeholder="${esc(T('Write a reply. The customer gets it by email and in the app.'))}"></textarea>
        <div class="ma-tkd-acts"><button type="button" class="v22-grad-btn" data-tk-send>${ic('mail')} ${T('Send reply')}</button>${t.status !== 'In progress' ? `<button type="button" class="v22-outline-btn" data-tk-st="In progress">${T('Mark in progress')}</button>` : ''}<button type="button" class="v22-outline-btn" data-tk-st="Closed">${T('Close request')}</button></div></div>`}`;
  }
  function page() {
    if (!st.items) setTimeout(load, 0);
    const openN = (st.counts.Open || 0) + (st.counts['In progress'] || 0);
    return `<div class="v22 v22-adm ma-inbox-page">${v22Head(T('Support Inbox'), st.items ? `${openN} ${T(openN === 1 ? 'request needs a reply' : 'requests need a reply')}` : T('Requests sent from Help & FAQ'), `<button type="button" class="v22-outline-btn" data-tk-refresh>${ic('refresh')} ${T('Refresh')}</button>`, 'ADMIN')}
      ${st.items ? `<section class="ma-inbox"><div class="v22-card ma-inbox-left">${listHtml()}</div><div class="v22-card ma-inbox-right">${detailHtml()}</div></section>` : `<section class="v22-card">${window.MA_AI ? MA_AI.skel(4) : ''}</section>`}</div>`;
  }
  function paint() { const el = document.querySelector('.ma-inbox-page'); if (el) el.outerHTML = page(); }

  async function update(number, body, btn) {
    const t = st.items.find((x) => x.number === number); if (!t) return;
    if (btn) btn.disabled = true;
    try {
      if (live()) { await MA_LIVE.API.patch(`/admin/support/tickets/${encodeURIComponent(number)}`, body); }
      if (body.reply) { t.reply = body.reply; t.replied_at = new Date().toISOString(); t.status = body.status || 'Answered'; } else if (body.status) t.status = body.status;
      if (!live()) saveDemo();
      st.counts = STATUSES.reduce((a, s) => ({ ...a, [s]: st.items.filter((x) => x.status === s).length }), {});
      notify(body.reply ? T('Reply sent. The customer gets it by email and in the app.') : `${T('Status changed to')} ${T(t.status)}.`);
      paint();
    } catch (e) { if (btn) btn.disabled = false; notify((e.details && e.details[0] && e.details[0].message) || e.message || T('Please try again.')); }
  }
  document.addEventListener('click', (e) => {
    const t = e.target; if (!t.closest || !t.closest('.ma-inbox-page')) return;
    const f = t.closest('[data-tk-f]'); if (f) { st.filter = f.dataset.tkF; paint(); return; }
    const it = t.closest('[data-tk]'); if (it) { st.sel = it.dataset.tk; paint(); return; }
    if (t.closest('[data-tk-refresh]')) { st.items = null; paint(); load(); return; }
    const s = t.closest('[data-tk-starter]'); if (s) { const ta = document.querySelector('[data-tk-reply]'); ta.value = (ta.value ? ta.value.trimEnd() + ' ' : '') + s.dataset.tkStarter; ta.focus(); return; }
    if (t.closest('[data-tk-send]')) { const v = document.querySelector('[data-tk-reply]').value.trim(); if (v.length < 2) { notify(T('Write a reply first.')); return; } update(st.sel, { reply: v }, t.closest('[data-tk-send]')); return; }
    const ch = t.closest('[data-tk-st]'); if (ch) update(st.sel, { status: ch.dataset.tkSt }, ch);
  });
  document.addEventListener('input', (e) => { if (e.target.matches && e.target.matches('[data-tk-q]')) { st.q = e.target.value; const l = document.querySelector('.ma-inbox-left'); if (l) { l.innerHTML = listHtml(); const q = l.querySelector('[data-tk-q]'); q.focus(); q.setSelectionRange(q.value.length, q.value.length); } } });
  addEventListener('ma:logout', () => { st = { filter: 'open', q: '', items: null, counts: {}, sel: null, loading: false }; });

  if (typeof V22_ADMIN_NAV !== 'undefined' && !V22_ADMIN_NAV.some((x) => x[0] === 'support')) { const i = V22_ADMIN_NAV.findIndex((x) => x[0] === 'subscriptions'); V22_ADMIN_NAV.splice(i + 1, 0, ['support', 'msg', 'Support Inbox']); }
  const base = renderAdmin;
  renderAdmin = function (p) { if (p === 'support') { if (window.MA_LIVE && st.items) { st.items = null; } shell('admin', 'support', page()); return; } return base(p); };
})();
