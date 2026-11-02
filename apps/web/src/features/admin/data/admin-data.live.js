/* ==========================================================================
   Live mode — data management (upload, server-side validation report, publish, export).
   ========================================================================== */
(function () {
  if (!window.MA_LIVE) return; // demo mode (no API): nothing to do
  const { API, S, asyncPage, busy, errMsg, fail, fmt, loadPublicData, on } = MA_LIVE;
  // ---- data management (server-side validation & publish)
  let LAST_UP = null;
  adminData = function () { return `<div class="v22 v22-adm">${asyncPage('data management', dataHtml)}</div>`; };
  // Data management page: summary, uploads history, sheet rules.
  async function dataHtml() {
    const [s, h] = await Promise.all([API.get('/admin/data/summary'), API.get('/admin/data/uploads')]);
    return `${v22Head('Data Management', 'Upload a workbook — it is validated on the server, then published to the live database.', `<a class="v22-outline-btn" href="${V22_TEMPLATE_URL}" download>${ic('download')} Blank template</a><button type="button" class="v22-outline-btn" data-ma-export>${ic('file')} Export active dataset</button><button type="button" class="v22-outline-btn" data-ma-recompute>${ic('refresh')} Recompute metrics</button>`, 'ADMIN · DATA')}
    ${v22Kpis([['bars', 'Funds', (+s.funds).toLocaleString('en-IN'), `${s.categories} categories`, ''], ['chart', 'NAV records', (+s.nav_rows).toLocaleString('en-IN'), `Last NAV ${fmt(s.last_nav)}`, 'pos'], ['users', 'Users', (+s.users).toLocaleString('en-IN'), `${(+s.subscriptions).toLocaleString('en-IN')} subscriptions`, ''], ['calendar', 'SIP months', s.sip_months, `${s.holidays} market holidays`, '']])}
    <section class="v22-card"><div class="v22-card-head"><div><h2>Upload workbook</h2><p>Sheets in the file replace the matching tables; sheets you leave out are kept. Users and Subscriptions are never uploaded: they come from sign-ups and payments, or from a database backup.</p></div></div>
      <div class="v22-pipeline" id="v22-pipe">${[['upload', 'Upload'], ['shield', 'Validate (server)'], ['help', 'Review'], ['check', 'Publish']].map((x, i) => `<div data-step="${i}">${cic(x[0], 28)}<b>${x[1]}</b></div>`).join('<i></i>')}</div>
      <div class="v22-upload-grid"><label class="v22-drop big" for="ma-wb-file">${cic('upload', 52)}<b>Drop the .xlsx workbook here</b><small>Excel (.xlsx / .xls) or single-sheet .csv · max 50MB · or <u>click to browse</u></small><span class="v22-outline-btn">Choose File</span><em id="ma-wb-name">No file selected</em><input type="file" id="ma-wb-file" accept=".xlsx,.xls,.csv" hidden></label>
      <div class="v22-upload-fields"><label class="v22-fl">If uploading a CSV, it contains${v22Sel('ma-csv-as', ['Funds', 'NAV_History', 'SIP_Dates', 'Market_Holidays', 'Users', 'Subscriptions'])}</label><div class="v22-callout">${cic('doc', 20)} <span>Format: <code>docs/21_test_data_excel_format.md</code>. The daily NAV feed job imports new NAVs automatically.</span></div></div></div><div id="ma-report"></div></section>
    <section class="v22-card"><div class="v22-card-head"><h2>Upload history</h2></div>${h.items.length ? h.items.map((u) => `<div class="v22-batch">${cic('doc', 28)}<div><b>${esc(u.file_name)}</b><small>${new Date(u.created_at).toLocaleString('en-IN')} · ${esc((u.sheets || []).join(', ') || '—')} · ${u.errors} errors · ${esc(u.uploaded_by || '')}</small></div>${v22Status(u.status === 'validated' ? 'Pending' : u.status === 'published' ? 'Published' : u.status === 'failed' ? 'Blocked' : 'Archived')}</div>`).join('') : '<p class="v22-sub">No uploads yet.</p>'}</section>`;
  }
  // Update the upload progress steps.
  const pipe = (n, failAt) => document.querySelectorAll('#v22-pipe>div').forEach((x) => { const s = +x.dataset.step; x.classList.toggle('done', s < n); x.classList.toggle('fail', failAt != null && s === failAt); });
  // Upload a workbook, show the server's validation report and the Publish / Discard buttons.
  async function uploadFile(file) {
    const out = document.getElementById('ma-report'); if (!out || !file) return;
    document.getElementById('ma-wb-name').textContent = `${file.name} · ${(file.size / 1024).toFixed(0)} KB`; pipe(1); out.innerHTML = '<div class="v22-loading inline"><span class="v22-spin"></span><b>Uploading and validating on the server…</b></div>';
    const fd = new FormData(); fd.append('csvAs', document.getElementById('ma-csv-as').value); fd.append('file', file);
    try {
      const r = await API.post('/admin/data/uploads', fd); LAST_UP = r.id; const rep = r.report;
      pipe(rep.ok ? 3 : 1, rep.ok ? null : 1);
      out.innerHTML = rep.fatal && !rep.sheets.length ? `<div class="v22-rep-fatal">${cic('warn', 24)} ${esc(rep.fatal)}</div>` : `<div class="v22-report ${rep.ok ? 'ok' : 'bad'}"><div class="v22-rep-head">${cic(rep.ok ? 'check' : 'warn', 30)}<div><b>${rep.ok ? 'Validation passed' : 'Validation failed'} — ${esc(r.fileName)}</b><small>${rep.sheets.length} sheet(s) · ${rep.errors} error(s) · ${rep.warnings} warning(s)${rep.ignored.length ? ` · ignored: ${esc(rep.ignored.join(', '))}` : ''}</small></div><div class="v22-rep-actions"><button type="button" class="v22-outline-btn sm" data-ma-discard>Discard</button><button type="button" class="v22-grad-btn" data-ma-publish ${rep.ok ? '' : 'disabled'}>${ic('check')} Publish dataset</button></div></div>${rep.fatal ? `<div class="v22-rep-fatal">${esc(rep.fatal)}</div>` : ''}<div class="v22-rep-sheets">${rep.sheets.map((s) => `<details class="v22-rep-sheet" ${s.errors.length ? 'open' : ''}><summary>${cic(s.errors.length ? 'warn' : 'check', 22)}<b>${s.name}</b><span>${s.total.toLocaleString('en-IN')} rows · ${s.valid.toLocaleString('en-IN')} valid</span>${s.errors.length ? `<span class="v22-pill bad">${s.errors.length} errors</span>` : ''}${s.warnings.length ? `<span class="v22-pill warn">${s.warnings.length} warnings</span>` : ''}${!s.errors.length && !s.warnings.length ? '<span class="v22-pill ok">OK</span>' : ''}</summary>${[...s.errors.map((e) => ['bad', e]), ...s.warnings.map((e) => ['warn', e])].slice(0, 30).map(([k, e]) => `<div class="v22-issue ${k}"><span class="mono">Row ${e.row}</span>${e.col ? `<code>${e.col}</code>` : ''}<span>${esc(e.msg)}</span></div>`).join('')}</details>`).join('')}</div></div>`;
    } catch (e) { pipe(1, 1); out.innerHTML = `<div class="v22-rep-fatal">${cic('warn', 24)} ${esc(errMsg(e))}</div>`; }
  }
  window.addEventListener('change', (e) => { if (e.target.id === 'ma-wb-file' && e.target.files[0]) uploadFile(e.target.files[0]); }, true);
  window.addEventListener('dragover', (e) => { if (e.target.closest?.('label[for="ma-wb-file"]')) e.preventDefault(); }, true);
  window.addEventListener('drop', (e) => { const d = e.target.closest?.('label[for="ma-wb-file"]'); if (!d) return; e.preventDefault(); e.stopImmediatePropagation(); if (e.dataTransfer.files[0]) uploadFile(e.dataTransfer.files[0]); }, true);
  on('[data-ma-publish]', async (b) => { if (!LAST_UP || !confirm('Publish this dataset to the live database?')) return; const done = busy(b, 'Publishing…'); try { const r = await API.post(`/admin/data/uploads/${LAST_UP}/publish`); pipe(4); notify(`Published: ${Object.entries(r.counts).map(([k, v]) => `${k} ${v}`).join(', ')}`); S.navCache = {}; await loadPublicData(); renderAdmin('data'); } catch (e) { done(); fail(e); } });
  on('[data-ma-discard]', async () => { if (LAST_UP) await API.post(`/admin/data/uploads/${LAST_UP}/discard`).catch(() => {}); LAST_UP = null; renderAdmin('data'); });
  on('[data-ma-export]', async () => { try { await API.download('/admin/data/export.xlsx', null, 'mod-alpha-active-dataset.xlsx'); } catch (e) { fail(e); } });
  on('[data-ma-recompute]', async (b) => { const d = busy(b); try { const r = await API.post('/admin/data/recompute-metrics'); d(); notify(`Metrics recomputed for ${r.funds} funds.`); await loadPublicData(); } catch (e) { d(); fail(e); } });
})();
