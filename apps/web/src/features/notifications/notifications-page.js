/* ==========================================================================
   Feature: notification centre (#/user/notifications)
   Every notice in one place: filter by type (Reminders, Billing, Insights, Account), unread marked with a
   dot, grouped by day; clicking a notice marks it read and opens its link; "Mark all read". The bell's
   pop-over links here ("View all notifications").
     live: GET /me/notifications · POST /me/notifications/read { ids? }
     demo: sample notices; read state kept in this browser ('ma-notif-read')
   Styles: src/styles/ux.css
   ========================================================================== */
(function () {
  const T = (s) => (window.MA_T ? MA_T(s) : s);
  const live = () => !!(window.MA_LIVE && MA_LIVE.API);
  const RKEY = 'ma-notif-read';
  const GROUPS = { reminders: ['sip_date', 'reminder'], billing: ['billing', 'refund', 'payment'], insights: ['insight', 'campaign', 'announcement'], account: ['kyc', 'security', 'account'] };
  const KIND_ICON = { sip_date: ['calendar', 'violet'], reminder: ['alarm', 'violet'], billing: ['rupee', 'green'], refund: ['refund', 'rose'], payment: ['rupee', 'green'], insight: ['chart', 'blue'], campaign: ['bell', 'blue'], announcement: ['bell', 'blue'], kyc: ['idcard', 'amber'], security: ['shield', 'amber'], account: ['user', 'amber'] };
  let filter = 'all', items = null, loading = false;

  const ago = (h) => new Date(Date.now() - h * 3600e3).toISOString();
  function demoItems() {
    let read = []; try { read = JSON.parse(localStorage.getItem(RKEY) || '[]'); } catch (e) {}
    return [
      { id: 'd1', kind: 'sip_date', title: 'Tomorrow is your best SIP date', body: '12 Nov · historically +2.8% vs a fixed date. Invest through your own platform.', link: '#/user/overview', created_at: ago(2) },
      { id: 'd2', kind: 'insight', title: 'New AI insight: small caps cooling off', body: 'Small cap funds’ 3-month momentum slowed. Review risk before adding.', link: '#/user/overview', created_at: ago(5) },
      { id: 'd3', kind: 'billing', title: 'Payment received · ₹299', body: 'Your Pro plan is active until 9 Dec 2026. Your GST invoice is ready.', link: '#/user/subscription', created_at: ago(26) },
      { id: 'd4', kind: 'security', title: 'New sign-in on Safari, iPhone', body: 'If this wasn’t you, sign it out from Settings → Signed-in devices.', link: '#/user/settings', created_at: ago(30) },
      { id: 'd5', kind: 'insight', title: 'Quant Small Cap reached a new high', body: 'It is on your watchlist.', link: '#/user/fund/QSC01', created_at: ago(80) },
      { id: 'd6', kind: 'sip_date', title: 'November SIP date published', body: 'Subscribers can see the date and two backup dates on the dashboard.', link: '#/user/overview', created_at: ago(200) },
    ].map((n) => ({ ...n, read: read.includes(n.id) }));
  }
  async function load(force) {
    if (!live()) { items = demoItems(); return; }
    if (loading) return; loading = true;
    try { const r = MA_LIVE.S.notifs && !force ? MA_LIVE.S.notifs : await MA_LIVE.API.get('/me/notifications'); MA_LIVE.S.notifs = r; items = r.items || []; } catch (e) { items = items || []; }
    loading = false; redraw();
  }
  async function markRead(ids) {
    if (!live()) { let read = []; try { read = JSON.parse(localStorage.getItem(RKEY) || '[]'); } catch (e) {} ids = ids || items.map((n) => n.id); localStorage.setItem(RKEY, JSON.stringify([...new Set([...read, ...ids])])); items = demoItems(); redraw(); return; }
    items.forEach((n) => { if (!ids || ids.includes(n.id)) n.read = true; }); redraw();
    try { await MA_LIVE.API.post('/me/notifications/read', ids ? { ids } : {}); if (MA_LIVE.refreshBell) MA_LIVE.refreshBell(); } catch (e) {}
  }
  const groupOf = (n) => Object.keys(GROUPS).find((g) => GROUPS[g].includes(n.kind)) || 'insights';
  function dayLabel(t) {
    const d = new Date(t), now = new Date(), y = new Date(now); y.setDate(now.getDate() - 1);
    if (d.toDateString() === now.toDateString()) return T('Today');
    if (d.toDateString() === y.toDateString()) return T('Yesterday');
    return T('Earlier');
  }
  const when = (t) => { const m = Math.round((Date.now() - new Date(t)) / 60000); return m < 60 ? `${Math.max(1, m)} ${T('min ago')}` : m < 1440 ? `${Math.round(m / 60)} ${T('h ago')}` : new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }); };

  function page() {
    if (!items) { load(); return `<div class="v22 ma-nc" id="ma-nc">${head(0)}${window.MA_AI ? MA_AI.skel(4) : ''}</div>`; }
    return `<div class="v22 ma-nc" id="ma-nc">${body()}</div>`;
  }
  function head(unread) {
    return `<div class="ma-nc-head"><header class="v22-title"><h1>${T('Notifications')}</h1><p>${unread ? `${unread} ${T('unread')}` : T('You’re all caught up')}</p></header>
      <div class="ma-nc-acts"><button type="button" class="v22-outline-btn" data-ma-nc-all ${unread ? '' : 'disabled'}>${ic('check')} ${T('Mark all read')}</button><button type="button" class="v22-outline-btn" data-ma-nc-settings>${ic('gear')} ${T('Notification settings')}</button></div></div>`;
  }
  function body() {
    const unread = items.filter((n) => !n.read).length;
    const F = [['all', 'All'], ['reminders', 'Reminders'], ['billing', 'Billing'], ['insights', 'Insights'], ['account', 'Account']];
    const list = items.filter((n) => filter === 'all' || groupOf(n) === filter);
    let g = '';
    const rows = list.map((n) => {
      const [icn] = KIND_ICON[n.kind] || ['bell'], d = dayLabel(n.created_at), h = d !== g ? `<p class="ma-nc-day">${esc(d)}</p>` : ''; g = d;
      return `${h}<button type="button" class="ma-nc-it${n.read ? '' : ' unread'}" data-ma-nc="${esc(n.id)}">${cic(icn, 40)}<span class="ma-nc-txt"><span class="ma-nc-top"><b>${esc(n.title)}</b><time>${esc(when(n.created_at))}</time></span><span class="ma-nc-body">${esc(n.body)}</span>${n.link ? `<span class="ma-nc-open">${T('Open')} ${ic('arrowR')}</span>` : ''}</span></button>`;
    }).join('');
    return `${head(unread)}<div class="v22-chips ma-nc-chips" role="toolbar" aria-label="${esc(T('Filter notifications'))}">${F.map(([k, l]) => { const c = items.filter((n) => !n.read && (k === 'all' || groupOf(n) === k)).length; return `<button type="button" class="${filter === k ? 'active' : ''}" data-ma-nc-f="${k}">${T(l)}${c ? ` <em>${c}</em>` : ''}</button>`; }).join('')}</div>
      <div class="ma-nc-list">${rows || (window.MA_EMPTY ? MA_EMPTY.html({ title: 'Nothing here', text: 'Reminders and updates of this type will show up here.', mood: 'sleep' }) : '')}</div>`;
  }
  function redraw() { const el = document.getElementById('ma-nc'); if (el && items) el.innerHTML = body(); }

  document.addEventListener('click', (e) => {
    const t = e.target; if (!t.closest || !t.closest('#ma-nc')) return;
    const f = t.closest('[data-ma-nc-f]'); if (f) { filter = f.dataset.maNcF; redraw(); return; }
    if (t.closest('[data-ma-nc-all]')) { markRead(null); return; }
    if (t.closest('[data-ma-nc-settings]')) { if (typeof settingsTab !== 'undefined') settingsTab = 'notifications'; go('user/settings'); return; }
    const it = t.closest('[data-ma-nc]'); if (it) { const n = items.find((x) => String(x.id) === it.dataset.maNc); if (n && !n.read) markRead([n.id]); if (n && n.link) location.hash = n.link.replace(/^#?/, '#'); }
  });
  addEventListener('ma:logout', () => { items = null; filter = 'all'; });
  addEventListener('hashchange', () => { if (/^#\/user\/notifications\b/.test(location.hash) && live()) load(true); });

  window.maNotificationsPage = page;
})();
