/* ==========================================================================
   Live mode — system settings: platform settings, live provider status
   ("integrated later") and the integration backlog.
   ========================================================================== */
(function () {
  if (!window.MA_LIVE) return; // demo mode (no API): nothing to do
  const { API, S, asyncPage, errMsg, on } = MA_LIVE;
  // ---- system settings: live provider status ("integrated later") + backlog
  const baseSettingsAdmin = adminSettings;
  adminSettings = function () { return `<div class="v22 v22-adm">${asyncPage('system settings', sysHtml)}</div>`; };
  // System settings page: platform settings, provider status, backlog.
  async function sysHtml() {
    const [st, ints] = await Promise.all([API.get('/admin/settings'), API.get('/admin/integrations')]);
    const s = st.settings, mocks = ints.providers.filter((p) => p.mode === 'mock'), live = ints.providers.filter((p) => p.mode === 'live');
    let base = baseSettingsAdmin(); // static backlog section (v22-integrations.js)
    const backlog = base.slice(base.indexOf('<section class="v22-card" id="integrations">'));
    return `${v22Head('System Settings', 'Environment, access controls and the status of every external integration.', `<span class="v22-pill ${st.environment === 'prod' ? 'ok' : 'warn'} lg">Environment: ${esc(st.environment)}</span>`, 'ADMIN · SYSTEM')}
    <div class="v22-sys-two"><section class="v22-card"><div class="v22-card-head"><h2>Platform configuration</h2><button type="button" class="v22-row-btn" data-ma-settings-edit>${ic('sliders')} Edit</button></div><div class="v22-kv icons">${[['globe', 'Platform name', s.platformName], ['clock', 'Default timezone', s.timezone], ['rupee', 'Default currency', s.currency], ['calendar', 'SIP date model', s.sipDateModel], ['bell', 'Reminder lead time', `${s.reminderLeadDays} days before`], ['mail', 'Support email', s.supportEmail]].map((x) => `<div>${cic(x[0], 24)}<span>${x[1]}</span><b>${esc(String(x[2]))}</b></div>`).join('')}</div></section>
    <section class="v22-card"><div class="v22-card-head"><h2>Access &amp; security</h2></div><div class="v22-kv icons">${[['users', 'Role-based access', st.security.rbac, 'ok'], ['clock', 'Sessions', st.security.sessions, 'ok'], ['doc', 'Audit trail', st.security.auditTrail, 'ok'], ['key', 'Admin MFA', st.security.adminMfa, 'warn']].map((x) => `<div>${cic(x[0], 24)}<span>${x[1]}</span><b class="t-${x[3]}">${esc(x[2])}</b></div>`).join('')}</div></section></div>
    <section class="v22-card" id="ma-mocks"><div class="v22-card-head"><div><h2>External providers</h2><p>${live.length} live · ${mocks.length} running on mocks — <b>mocks will be replaced by the real providers later</b> (see <code>docs/23_mocks_and_replacements.md</code>).</p></div></div>
      <div class="v22-ints">${ints.providers.map((p) => `<article title="${esc(p.mockBehaviour)}">${cic({ payments: 'rupee', kyc: 'idcard', email: 'mail', sms: 'sms', push: 'phone', whatsapp: 'chat', ai: 'brain', nav: 'chart', google: 'key', support: 'help' }[p.key] || 'plug', 36)}<div><b>${esc(p.label)}</b><small>${p.mode === 'mock' ? `Mock now → <b>${esc(p.replacement)}</b>` : `Live: ${esc(p.active)}`}</small><small class="v22-muted">Env: ${esc(p.env)}=${esc(p.real)} + ${esc(p.vars.join(', '))}</small></div>${p.mode === 'mock' ? '<span class="v22-pill warn">Integrated later</span>' : '<span class="v22-pill ok">Live</span>'}</article>`).join('')}</div>
      <h3 class="v22-set-h" style="margin:20px 0 10px!important;font-size:15px">Not built yet — planned</h3><div class="v22-ints">${ints.notYetBuilt.map((p) => `<article>${cic('plug', 30)}<div><b>${esc(p.label)}</b><small>${esc(p.replacement)}</small></div><span class="v22-pill neutral">${esc(p.backlog)}</span></article>`).join('')}</div></section>
    ${backlog}`;
  }
  on('[data-ma-settings-edit], [data-action="settings-edit"]', async () => {
    const { settings: s } = await API.get('/admin/settings');
    showModal('Platform configuration', `<div class="v22"><form id="ma-set-f" style="display:grid;gap:12px"><label class="v22-fl">Platform name<input name="platformName" value="${esc(s.platformName)}"></label><label class="v22-fl">Reminder lead time (days before SIP date)<input type="number" min="0" max="7" name="reminderLeadDays" value="${s.reminderLeadDays}"></label><label class="v22-fl">Support email<input type="email" name="supportEmail" value="${esc(s.supportEmail)}"></label><div class="v22-err" id="ma-set-err"></div><button class="v22-grad-btn">Save</button><p class="v22-hint">Super admin only. Changes are audited.</p></form></div>`);
    document.getElementById('ma-set-f').onsubmit = async (e) => { e.preventDefault(); const f = new FormData(e.target); try { await API.put('/admin/settings', { platformName: f.get('platformName'), reminderLeadDays: +f.get('reminderLeadDays'), supportEmail: f.get('supportEmail') }); modalRoot.innerHTML = ''; notify('Settings saved.'); renderAdmin('settings'); } catch (ex) { document.getElementById('ma-set-err').textContent = errMsg(ex); } };
  });
  // admin profile card → real data
  window.v22AdminProfile = () => showModal('Admin profile', `<div class="v22"><div class="v22-prof"><span class="v22-prof-av">${esc((S.user?.name || 'A')[0])}</span><div class="v22-prof-main"><b>${esc(S.user?.name || '')}</b><span>${esc(S.user?.email || '')}</span><div class="v22-prof-tags"><span class="v22-pill info">${esc(S.user?.role || '')}</span></div></div></div><div class="v22-modal-actions"><button class="v22-outline-btn" data-action="change-password">Change password</button><button class="v22-danger-btn" data-action="logout">${ic('logout')} Sign out</button></div></div>`);
  v22AdminProfile = window.v22AdminProfile;
  // charts wait for NAV instead of crashing / showing synthetic data
  const baseDash = v22DashChart;
  v22DashChart = function (p) { const top = D.funds.filter((f) => f.returns[5] != null).slice(0, 3); return top.some((f) => !S.navCache[f.id]) ? '<div class="v22-loading inline"><span class="v22-spin"></span><b>Loading NAV…</b></div>' : baseDash(p); };
  const baseDetail = v22DetailChart;
  v22DetailChart = function (f, p) { return S.navCache[f.id] ? baseDetail(f, p) : '<div class="v22-loading inline"><span class="v22-spin"></span><b>Loading NAV…</b></div>'; };
})();
