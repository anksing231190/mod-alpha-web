/* ==========================================================================
   Live mode — admin users (GET /admin/users, CSV export, status / role changes).
   ========================================================================== */
(function () {
  if (!window.MA_LIVE) return; // demo mode (no API): nothing to do
  const { API, S, asyncPage, busy, fail, errMsg, fmt, on, pager } = MA_LIVE;
  const isSuper = () => S.user && S.user.role === 'superadmin';
  // ---- users
  const UF = { q: '', status: '', kyc: '', page: 1 };
  adminUsers = function () { return `<div class="v22 v22-adm">${v22Head('User Management', 'Search user records and review verification, consent and subscription status.', `${isSuper() ? `<button type="button" class="v22-grad-btn" data-ma-add-admin>${ic('shield')} Add admin</button>` : ''}<button type="button" class="v22-outline-btn" data-ma-users-csv>${ic('download')} Export CSV</button>`, 'ADMIN · USERS')}<section class="v22-card"><div class="v22-filters"><label class="v22-search">${ic('search')}<input id="ma-user-q" placeholder="Search name, email, mobile or ID" value="${esc(UF.q)}"></label>${v22Sel('ma-user-status', ['All statuses', 'Active', 'Suspended', 'Closed'])}${v22Sel('ma-user-kyc', ['All KYC states', 'Not started', 'Pending', 'In review', 'Verified', 'Rejected'])}</div><div id="ma-users">${asyncPage('users', usersHtml)}</div></section></div>`; };
  // Users page from GET /admin/users with search, filters and paging.
  async function usersHtml() {
    const r = await API.get('/admin/users', { q: UF.q, status: UF.status, kyc: UF.kyc, page: UF.page, pageSize: 15 });
    if (!r.items.length) return '<div class="v22-empty">No users match these filters.</div>';
    return `<div class="table-scroll"><table class="v22-table v22-admin-table"><thead><tr><th>User</th><th>ID</th><th>Joined</th><th>Account</th><th>KYC</th><th>Plan</th><th>Subscription</th><th></th></tr></thead><tbody>${r.items.map((u, i) => `<tr><td><div class="v22-who">${v22Avatar(u.name, i)}<div><b>${esc(u.name)}</b><small>${esc(u.email || u.mobile || '')}</small></div></div></td><td class="mono">${esc(u.ref)}</td><td>${fmt(u.signup_date)}</td><td>${v22Status(u.status)}</td><td>${v22Status(u.kyc)}</td><td>${esc(u.plan)}</td><td>${v22Status(u.sub)}</td><td><button type="button" class="v22-row-btn" data-ma-user="${u.id}">${ic('eye')} View</button></td></tr>`).join('')}</tbody></table></div>${pager(r.total, r.page, r.pageSize, 'data-ma-upage')}`;
  }
  // Redraw the list after a filter change.
  const reloadUsers = async () => { const el = document.getElementById('ma-users'); if (el) { try { el.innerHTML = await usersHtml(); } catch (e) { fail(e); } } };
  let uqT;
 window.addEventListener('input', (e) => { if (e.target.id === 'ma-user-q') { UF.q = e.target.value; UF.page = 1; clearTimeout(uqT); uqT = setTimeout(reloadUsers, 300); } if (e.target.id === 'ma-sub-q') { MA_LIVE.SF.q = e.target.value; MA_LIVE.SF.page = 1; clearTimeout(uqT); uqT = setTimeout(MA_LIVE.reloadSubs, 300); } if (e.target.id === 'ma-audit-q') { MA_LIVE.AF.q = e.target.value; clearTimeout(uqT); uqT = setTimeout(MA_LIVE.reloadAudit, 300); } }, true);
  window.addEventListener('change', (e) => { const id = e.target.id; if (id === 'ma-user-status' || id === 'ma-user-kyc') { UF[id === 'ma-user-status' ? 'status' : 'kyc'] = e.target.value; UF.page = 1; reloadUsers(); } if (id === 'ma-sub-state' || id === 'ma-sub-plan') { MA_LIVE.SF[id === 'ma-sub-state' ? 'status' : 'plan'] = e.target.value; MA_LIVE.SF.page = 1; MA_LIVE.reloadSubs(); } if (id === 'ma-audit-cat') { MA_LIVE.AF.category = e.target.value; MA_LIVE.reloadAudit(); } }, true);
  on('[data-ma-upage]', (b) => { if (b.disabled) return; UF.page = +b.dataset.maUpage; reloadUsers(); });
  on('[data-ma-users-csv]', async () => { try { await API.download('/admin/users', { q: UF.q, status: UF.status, kyc: UF.kyc, format: 'csv' }, 'mod-alpha-users.csv'); } catch (e) { fail(e); } });
  on('[data-ma-user]', async (b) => {
    try {
      const r = await API.get(`/admin/users/${b.dataset.maUser}`), u = r.user;
      showModal(`User · ${esc(u.full_name)}`, `<div class="v22"><div class="v22-kv">${[['Email', esc(u.email || '—')], ['Mobile', esc(u.mobile || '—')], ['Joined', fmt(u.signup_date)], ['Role', esc(u.role)], ['Account', v22Status(u.account_status)], ['KYC', v22Status(u.kyc_status)], ['Marketing consent', u.marketing_consent ? 'Yes' : 'No']].map((x) => `<div><span>${x[0]}</span><b>${x[1]}</b></div>`).join('')}</div>
        <h3 class="v22-set-h" style="margin:16px 0 8px!important;font-size:15px">Subscriptions</h3>${r.subscriptions.length ? r.subscriptions.map((s) => `<div class="v22-batch">${cic('crown', 24)}<div><b>${esc(s.plan_id)} · ${esc(s.billing_cycle)}</b><small>${inr(s.amount_inr)} · from ${fmt(s.start_date)}</small></div>${v22Status(s.status)}</div>`).join('') : '<p class="v22-sub">Free plan</p>'}
        <div class="v22-form-grid" style="margin-top:14px"><label class="v22-fl">Reason (audited)<input id="ma-u-reason" placeholder="Why are you making this change?"></label><label class="v22-fl">KYC decision${v22Sel('ma-u-kyc', ['—', 'Verified', 'Rejected', 'In review'])}</label></div>
        ${isSuper() && u.id !== S.user.id ? `<div class="v22-form-grid" style="margin-top:10px"><label class="v22-fl">Role<label class="v22-select"><select id="ma-u-role">${[['user', 'User'], ['admin', 'Admin'], ['superadmin', 'Super admin']].map((o) => `<option value="${o[0]}"${u.role === o[0] ? ' selected' : ''}>${o[1]}</option>`).join('')}</select>${ic('chevDown')}</label><small>Admins need an email and a mobile number (they sign in with both codes).</small></label><div class="v22-fl" style="align-self:end"><button class="v22-outline-btn" data-ma-urole="${u.id}">Change role</button></div></div>` : ''}
        <div class="v22-modal-actions">${u.account_status === 'Active' ? `<button class="v22-danger-btn" data-ma-uact="Suspended" data-id="${u.id}">Suspend</button>` : `<button class="v22-outline-btn" data-ma-uact="Active" data-id="${u.id}">Reactivate</button>`}<button class="v22-grad-btn" data-ma-ukyc="${u.id}">Save KYC decision</button></div><p class="v22-hint">Viewing this record is recorded in the audit log.</p></div>`);
    } catch (e) { fail(e); }
  });
  on('[data-ma-uact]', async (b) => { const reason = document.getElementById('ma-u-reason').value.trim(); if (reason.length < 3) { notify('Enter a reason first.'); return; } try { await API.patch(`/admin/users/${b.dataset.id}`, { accountStatus: b.dataset.maUact, reason }); modalRoot.innerHTML = ''; notify(`User ${b.dataset.maUact.toLowerCase()}.`); reloadUsers(); } catch (e) { fail(e); } });
  on('[data-ma-ukyc]', async (b) => { const reason = document.getElementById('ma-u-reason').value.trim(), d = document.getElementById('ma-u-kyc').value; if (d === '—' || reason.length < 3) { notify('Choose a KYC decision and enter a reason.'); return; } try { await API.post(`/admin/kyc/${b.dataset.maUkyc}/decision`, { decision: d, reason }); modalRoot.innerHTML = ''; notify('KYC decision saved.'); reloadUsers(); } catch (e) { fail(e); } });
  // Super admin: change a user's role (audited; needs a reason).
  on('[data-ma-urole]', async (b) => {
    const reason = document.getElementById('ma-u-reason').value.trim(), role = document.getElementById('ma-u-role').value;
    if (reason.length < 3) { notify('Enter a reason first.'); return; }
    try { await API.patch(`/admin/users/${b.dataset.maUrole}`, { role, reason }); modalRoot.innerHTML = ''; notify('Role changed.'); reloadUsers(); } catch (e) { fail(e); }
  });
  // Super admin: add an admin. The API emails them a link to set their password (valid 3 days).
  on('[data-ma-add-admin]', () => {
    showModal('Add admin', `<div class="v22"><p class="v22-sub">They get an email with a link to set their password. At every sign-in they also enter a code sent to their email and a code sent by SMS.</p>
      <form id="ma-add-admin" style="display:grid;gap:12px;margin-top:14px"><label class="v22-fl">Full name<input name="name" required minlength="2"></label><label class="v22-fl">Work email<input name="email" type="email" required></label>
      <label class="v22-fl">Mobile number<input name="mobile" required inputmode="tel" placeholder="+91 98765 43210"></label><label class="v22-fl">Role<label class="v22-select"><select name="role"><option value="admin">Admin</option><option value="superadmin">Super admin</option></select>${ic('chevDown')}</label></label>
      <p class="v22-err" id="ma-add-admin-err"></p><div class="v22-modal-actions"><button type="submit" class="v22-grad-btn">Send invitation</button></div></form></div>`);
    document.getElementById('ma-add-admin').onsubmit = async (e) => {
      e.preventDefault(); const f = new FormData(e.target), er = document.getElementById('ma-add-admin-err'), done = busy(e.target.querySelector('button[type=submit]'), 'Sending…');
      try {
        const r = await API.post('/admin/admins', { name: f.get('name'), email: f.get('email'), mobile: f.get('mobile'), role: f.get('role') });
        done(); reloadUsers();
        if (r.devLink) { er.style.color = ''; er.innerHTML = `Invitation created. Email is not connected on this environment, so send them this set-password link yourself (valid 3 days): <a href="${esc(r.devLink)}" target="_blank" rel="noopener" class="ma-auth-link">open link</a> · <button type="button" class="v22-link-btn" id="ma-copy-invite">Copy link</button>`;
          document.getElementById('ma-copy-invite').onclick = () => { navigator.clipboard?.writeText(r.devLink).then(() => notify('Link copied.')); };
          e.target.querySelector('button[type=submit]').remove(); return; }
        modalRoot.innerHTML = ''; notify('Invitation sent.');
      } catch (ex) { done(); er.textContent = ex.details?.[0]?.message || errMsg(ex); }
    };
  });
})();
