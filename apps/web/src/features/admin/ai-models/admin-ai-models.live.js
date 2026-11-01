/* ==========================================================================
   Live mode — model releases and quality gates.
   ========================================================================== */
(function () {
  if (!window.MA_LIVE) return; // demo mode (no API): nothing to do
  const { API, asyncPage, fail, fmt, on } = MA_LIVE;
  // ---- AI models & release gates
  const GATE_LABEL = { data_quality: 'Historical data quality and provenance verified', bias_tests: 'Look-ahead and survivorship bias tests passed', walk_forward: 'Out-of-sample / walk-forward evaluation completed', holiday_rules: 'Holiday and missing-NAV rules validated', compliance_review: 'Legal and compliance review approved', admin_approval: 'Admin approval and audit event recorded' };
  adminMethodology = function () { return `<div class="v22 v22-adm">${asyncPage('model releases', modelHtml)}</div>`; };
  // AI models page from GET /admin/models.
  async function modelHtml() {
    const [{ items }, ints] = await Promise.all([API.get('/admin/models'), API.get('/admin/integrations')]); const m = items[0]; const ai = ints.providers.find((p) => p.key === 'ai');
    if (!m) return '<p class="v22-sub">No model releases.</p>';
    const done = Object.values(m.gates).filter(Boolean).length, tot = Object.keys(m.gates).length;
    return `${v22Head('AI Models &amp; Insights', 'Version governance, release gates and model service configuration.', '<span class="v22-pill warn lg">Internal only</span>', 'ADMIN · METHODOLOGY')}
    <div class="v22-lockbox">${cic('lock', 40)}<div><b>Proprietary methodology is internal information</b><p>Model parameters, feature weights and thresholds are restricted to authorised administrators.</p></div></div>
    <div class="v22-method-two"><section class="v22-card"><div class="v22-card-head"><h2>Methodology release</h2>${v22Status(m.status === 'Approved' ? 'Published' : 'Pending')}</div><div class="v22-release">${cic('brain', 44)}<div><b>${esc(m.version)}</b><small>${esc(m.status)}${m.approved_at ? ` · approved ${fmt(m.approved_at)}` : ''}</small></div></div><button class="v22-grad-btn" data-ma-approve="${esc(m.version)}" ${done < tot || m.status === 'Approved' ? 'disabled' : ''}>Approve release</button><p class="v22-hint">Super admin only; all gates must pass.</p></section>
    <section class="v22-card"><div class="v22-card-head"><h2>Model service</h2></div><div class="v22-kv icons"><div>${cic('plug', 24)}<span>AI provider</span><b class="t-${ai.mode === 'mock' ? 'warn' : 'ok'}">${ai.mode === 'mock' ? 'Mock (rule-based) — integrated later' : esc(ai.active)}</b></div><div>${cic('db', 24)}<span>Grounding</span><b class="t-ok">Top funds + current SIP date from DB</b></div><div>${cic('rupee', 24)}<span>Quota</span><b>Per plan (Free: 1/day)</b></div></div></section></div>
    <section class="v22-card"><div class="v22-card-head"><div><h2>Release gates</h2><p>${done} of ${tot} gates passed</p></div><div class="v22-gate-meter"><i class="v22-bar big"><em style="width:${(100 * done) / tot}%"></em></i></div></div><div class="v22-gates">${Object.entries(m.gates).map(([k, v]) => `<label class="v22-gate"><input type="checkbox" data-ma-gate="${k}" data-version="${esc(m.version)}" ${v ? 'checked' : ''}><span class="v22-gate-box">${ic('check')}</span><b>${GATE_LABEL[k] || k}</b></label>`).join('')}</div></section>`;
  }
  window.addEventListener('change', async (e) => { const g = e.target.closest?.('[data-ma-gate]'); if (!g) return; e.stopImmediatePropagation(); try { await API.put(`/admin/models/${encodeURIComponent(g.dataset.version)}/gates`, { gates: { [g.dataset.maGate]: g.checked } }); renderAdmin('methodology'); } catch (er) { g.checked = !g.checked; fail(er); } }, true);
  on('[data-ma-approve]', async (b) => { try { await API.post(`/admin/models/${encodeURIComponent(b.dataset.maApprove)}/approve`); notify('Release approved.'); renderAdmin('methodology'); } catch (e) { fail(e); } });
})();
