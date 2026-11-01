/* ==========================================================================
   Live mode — notifications bell
   Unread count and the list from GET /me/notifications; mark as read.
   ========================================================================== */
(function () {
  if (!window.MA_LIVE) return; // demo mode (no API): nothing to do
  const { API, S, fail, on } = MA_LIVE;
  // ------------------------------------------------------------------ notifications bell
  async function refreshBell() {
    if (!S.user) return;
    paintBell();
    try { S.notifs = await API.get('/me/notifications'); paintBell(); } catch (e) {}
  }
  // Show the unread count on the bell.
  function paintBell() {
    if (!S.notifs) return;
    try {
      const bell = document.querySelector('.v22-bell'), pop = document.getElementById('v22-notif-pop'); if (!bell || !pop) return;
      bell.querySelector('.v22-bell-badge')?.remove();
      if (S.notifs.unread) bell.insertAdjacentHTML('beforeend', `<em class="v22-bell-badge">${S.notifs.unread > 9 ? '9+' : S.notifs.unread}</em>`);
      const ico = { billing: 'rupee', kyc: 'idcard', sip_date: 'calendar', campaign: 'bell' };
      pop.querySelectorAll('.v22-np-item').forEach((x) => x.remove());
      pop.querySelector('.v22-np-head').insertAdjacentHTML('afterend', S.notifs.items.length ? S.notifs.items.slice(0, 8).map((n) => `<a class="v22-np-item ${n.read ? '' : 'unread'}" href="${esc(n.link || '#/user/overview')}">${cic(ico[n.kind] || 'bell', 30)}<div><b>${esc(n.title)}</b><small>${esc(n.body)}</small></div><time>${timeAgo(n.created_at)}</time></a>`).join('') : '<div class="v22-np-item"><div><small>No notifications yet.</small></div></div>');
    } catch (e) {}
  }
  // '5 min ago' / '3 h ago' / date.
  const timeAgo = (t) => { const m = Math.round((Date.now() - new Date(t)) / 60000); return m < 60 ? `${Math.max(1, m)}m ago` : m < 1440 ? `${Math.round(m / 60)}h ago` : `${Math.round(m / 1440)}d ago`; };
  on('[data-v22-markread]', async () => { try { await API.post('/me/notifications/read', {}); refreshBell(); } catch (e) { fail(e); } });

  // used by other live files
  Object.assign(MA_LIVE, { refreshBell, paintBell });
})();
