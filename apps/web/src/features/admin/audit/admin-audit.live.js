/* ==========================================================================
   Live mode — audit log search (GET /admin/audit).
   ========================================================================== */
(function () {
  if (!window.MA_LIVE) return; // demo mode (no API): nothing to do
  const { API, asyncPage, fail, on } = MA_LIVE;
  // ---- audit log
  const AF = { q: '', category: '' };
  adminAudit = function () { return `<div class="v22 v22-adm">${v22Head('Audit Logs', 'Append-only record of administrative actions and sensitive events.', `<button type="button" class="v22-outline-btn" data-ma-audit-csv>${ic('download')} Export logs</button>`, 'ADMIN · SECURITY')}<section class="v22-card"><div class="v22-filters"><label class="v22-search">${ic('search')}<input id="ma-audit-q" placeholder="Search action, actor or resource" value="${esc(AF.q)}"></label>${v22Sel('ma-audit-cat', ['All event types', 'Configuration', 'Data', 'Access', 'Subscription', 'Notification', 'Account'])}</div><div id="ma-audit">${asyncPage('audit log', auditHtml)}</div></section></div>`; };
  const AICON = { Configuration: 'gear', Data: 'db', Access: 'shield', Subscription: 'crown', Notification: 'bell', Account: 'user' };
  // Audit log table from GET /admin/audit with the current filters.
  async function auditHtml() { const r = await API.get('/admin/audit', { q: AF.q, category: AF.category, pageSize: 100 }); return `${v22Kpis([['doc', 'Events (30 days)', r.stats.total.toLocaleString('en-IN'), 'Matching filters', ''], ['check', 'Successful', r.stats.ok.toLocaleString('en-IN'), '', 'pos'], ['shield', 'Blocked / failed', r.stats.blocked.toLocaleString('en-IN'), '', 'warn'], ['users', 'Admins', r.stats.admins, `${r.stats.superAdmins} super admin`, '']])}<div class="v22-timeline">${r.items.map((x) => `<div class="v22-tl">${cic({ gear: 'sliders', db: 'db', shield: 'shield', crown: 'crown', bell: 'bell', user: 'user' }[AICON[x.category]] || 'doc', 30)}<div class="v22-tl-main"><b class="mono">${esc(x.action)}</b><small><span class="v22-actor">${esc(x.actor)}</span> · ${esc(x.resource || '—')} · ${esc(x.category)}</small></div><time>${new Date(x.at).toLocaleString('en-IN')}</time>${v22Status(x.outcome === 'Success' ? 'Success' : 'Blocked')}</div>`).join('') || '<div class="v22-empty">No events.</div>'}</div>`; }
  // Redraw the audit table after a filter change.
  const reloadAudit = async () => { const el = document.getElementById('ma-audit'); if (el) { try { el.innerHTML = await auditHtml(); } catch (e) { fail(e); } } };
  on('[data-ma-audit-csv], [data-action="export-audit"]', async () => { try { await API.download('/admin/audit', { q: AF.q, category: AF.category, format: 'csv' }, 'mod-alpha-audit-log.csv'); } catch (e) { fail(e); } });

  // used by other live files
  Object.assign(MA_LIVE, { AF, reloadAudit });
})();
