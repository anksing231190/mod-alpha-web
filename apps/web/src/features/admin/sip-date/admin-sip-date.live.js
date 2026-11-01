/* ==========================================================================
   Live mode — SIP date configuration (validate and publish through the API).
   ========================================================================== */
(function () {
  if (!window.MA_LIVE) return; // demo mode (no API): nothing to do
  const { API, asyncPage, busy, errMsg, fail, fmt, loadPublicData, on } = MA_LIVE;
  // ---- SIP date configuration
  adminSipDate = function () { return `<div class="v22 v22-adm">${asyncPage('SIP dates', sipHtml)}</div>`; };
  let SIPDAY = null;
  // SIP date page from the API (published history and the next month).
  async function sipHtml() {
    const [{ current: c }, { items }] = await Promise.all([API.get('/sip-dates/current'), API.get('/sip-dates')]);
    const nd = new Date(); nd.setUTCMonth(nd.getUTCMonth() + 1); const nextM = nd.toISOString().slice(0, 7), thisM = new Date().toISOString().slice(0, 7);
    SIPDAY = c?.recommended_day || 12; const alts = c ? [c.alt_day_1, c.alt_day_2, c.alt_day_3].filter(Boolean) : [];
    const cd = c ? v22D(`${c.month}-${String(c.recommended_day).padStart(2, '0')}`) : null;
    return `${v22Head('SIP Date Configuration', 'Validate, preview and publish the monthly platform-wide reminder date.', c ? `<span class="v22-pill ok lg">● Current: ${c.recommended_day} ${V22_MON[+c.month.slice(5) - 1]} ${c.month.slice(0, 4)}</span>` : '', 'ADMIN · SIP DATES')}
    <div class="v22-sip-cfg"><section class="v22-card"><h2 class="v22-h2">Configure monthly reminder</h2><p class="v22-sub">One common date across all mutual funds. Publishing schedules the reminder campaign 2 days before the date.</p>
      <div class="v22-steps" id="v22-steps">${['Draft', 'Validate', 'Preview', 'Publish'].map((s, i) => `<div class="${i === 0 ? 'done' : ''}"><i>${i + 1}</i><span>${s}</span></div>`).join('')}</div>
      <div class="v22-form-grid"><label class="v22-fl">Effective month<input type="month" id="ma-sip-month" value="${c && c.month >= thisM ? nextM : thisM}"></label><label class="v22-fl">Expected uplift vs fixed date (%)<input type="number" step="0.1" id="ma-sip-uplift" value="${c?.uplift_pct ?? ''}" placeholder="e.g. 2.8"></label></div>
      <div class="v22-fl">Reminder date <small class="v22-muted">· selected <b id="v22-day-label">${SIPDAY}</b></small><div class="v22-daygrid">${Array.from({ length: 28 }, (_, i) => i + 1).map((n) => `<button type="button" class="${n === SIPDAY ? 'active' : ''} ${alts.includes(n) ? 'alt' : ''}" data-ma-day="${n}">${n}</button>`).join('')}</div></div>
      <label class="v22-fl">Internal change reason<textarea id="sip-reason" rows="3" placeholder="Reason for this date (required, audited)"></textarea></label>
      <button type="button" class="v22-grad-btn wide" data-ma-sip-validate>Validate configuration ${ic('arrowR')}</button><div id="ma-sip-val" class="v22-valbox"></div></section>
    <aside class="v22-sip-side"><section class="v22-card v22-orb-card"><h2 class="v22-h2 sm">Current published date</h2>${c ? `<div class="v22-orb"><div><small>${esc(c.month)}</small><strong>${c.recommended_day}</strong><span>${['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'][cd.getUTCDay()]}</span></div></div><div class="v22-kv">${[['Status', v22Status(c.status)], ['Uplift', c.uplift_pct != null ? `+${c.uplift_pct}%` : '—'], ['Published on', fmt(c.published_on)], ['Version', esc(c.version || '—')]].map((x) => `<div><span>${x[0]}</span><b>${x[1]}</b></div>`).join('')}</div>` : '<p class="v22-sub">Nothing published yet.</p>'}</section></aside></div>
    <section class="v22-card"><div class="v22-card-head"><h2>Publishing history</h2></div><div class="table-scroll"><table class="v22-table v22-admin-table"><thead><tr><th>Month</th><th>Date</th><th>Uplift</th><th>Alternatives</th><th>Version</th><th>Published on</th><th>Status</th></tr></thead><tbody>${items.map((r) => `<tr><td><b>${esc(r.month)}</b></td><td>${r.recommended_day}</td><td class="pos">${r.uplift_pct != null ? '+' + r.uplift_pct + '%' : '—'}</td><td>${[r.alt_day_1, r.alt_day_2, r.alt_day_3].filter(Boolean).join(', ') || '—'}</td><td class="mono">${esc(r.version || '—')}</td><td>${fmt(r.published_on)}</td><td>${v22Status(r.status)}</td></tr>`).join('')}</tbody></table></div></section>`;
  }
  on('[data-ma-day]', (b) => { SIPDAY = +b.dataset.maDay; b.parentElement.querySelectorAll('button').forEach((x) => x.classList.toggle('active', x === b)); document.getElementById('v22-day-label').textContent = SIPDAY; });
  // Request body from the form (month, day, reason, alternatives).
  const sipBody = () => ({ month: document.getElementById('ma-sip-month').value, day: SIPDAY, reason: document.getElementById('sip-reason').value.trim(), upliftPct: document.getElementById('ma-sip-uplift').value ? +document.getElementById('ma-sip-uplift').value : undefined });
  on('[data-ma-sip-validate]', async () => {
    const out = document.getElementById('ma-sip-val');
    try {
      const v = await API.post('/admin/sip-dates/validate', sipBody());
      document.querySelectorAll('#v22-steps>div').forEach((x, i) => x.classList.toggle('done', i < (v.ok ? 3 : 2)));
      out.innerHTML = `${v.checks.map((c) => `<div>${c.level === 'ok' ? '✓' : c.level === 'warn' ? '⚠' : '✕'} ${esc(c.msg)}</div>`).join('')}<p style="margin-top:8px">${v.recipients.toLocaleString('en-IN')} active subscribers will be reminded.</p>${v.ok ? `<button class="v22-grad-btn" style="margin-top:10px" data-ma-sip-publish>Publish ${esc(v.date)}</button>` : ''}`;
    } catch (e) { out.innerHTML = `<b class="neg">${esc(e.details?.[0]?.message || errMsg(e))}</b>`; }
  });
  on('[data-ma-sip-publish]', async (b) => {
    if (!confirm('Publish this SIP date to all subscribers?')) return;
    const done = busy(b, 'Publishing…');
    try { const r = await API.post('/admin/sip-dates/publish', sipBody()); notify(`Published ${r.date} (${r.version}). Reminder scheduled for ${r.reminderOn}.`); await loadPublicData(); renderAdmin('sipdate'); }
    catch (e) { done(); fail(e); }
  });
})();
