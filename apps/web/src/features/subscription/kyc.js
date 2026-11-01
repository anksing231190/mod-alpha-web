/* ==========================================================================
   Feature: KYC before the first paid plan (PAN-first, SEBI)
   --------------------------------------------------------------------------
   Step 1  PAN, name as on PAN, date of birth, consent
   Step 2  only when there is no KYC record in the registry (KRA):
           "Verify with DigiLocker" → the KYC provider's page (Aadhaar, selfie, e-sign)
   Step 3  verified → checkout continues
   Live mode: POST /kyc/pan (apps/api/src/modules/kyc/routes.ts). Demo mode: the same
   test PANs as the API mock, kept in this browser:
     ABCDE1234F  KRA record found → verified at once
     ABCDE5678G  no KRA record → DigiLocker step (any other valid PAN too)
     …0000X      PAN not found → error
   Only the masked PAN (ABCDE••••F) is ever shown or kept in the browser.
   Public: window.MA_KYC = { open({ onVerified }), status(), refreshStrip() }
   ========================================================================== */
(function () {
  const API = window.MA_API || {};
  const live = !!API.enabled;
  const T = (s) => (window.MA_T ? window.MA_T(s) : s);
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const icon = (n, s) => (typeof cic === 'function' ? cic(n, s) : '');
  const DEMO_KEY = 'mod-alpha-demo-kyc';
  const PAN_RE = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
  const mask = (p) => `${p.slice(0, 5)}••••${p.slice(-1)}`;

  /* ---------- state ---------- */
  let state = { status: 'Not started' };   // { status, method, panMasked, kraRef }
  /** Demo: saved KYC result in this browser. */
  function demoGet() { try { return JSON.parse(localStorage.getItem(DEMO_KEY)) || { status: 'Not started' }; } catch (e) { return { status: 'Not started' }; } }
  function demoSet(v) { v = { ...v, updatedAt: new Date().toISOString() }; try { localStorage.setItem(DEMO_KEY, JSON.stringify(v)); } catch (e) {} state = v; }
  /** Current KYC state (live: from the API; demo: this browser). */
  async function status() {
    if (!live) return (state = demoGet());
    try {
      const r = await API.get('/kyc/status', null, { onUnauthorized: false });
      state = { status: r.kyc_status, method: r.method, panMasked: r.pan_masked, kraRef: r.kra_ref, reason: r.reason, updatedAt: r.updated_at };
      if (window.MA_STATE && MA_STATE.user) MA_STATE.user.kycStatus = state.status;   // keep the signed-in user in sync
    } catch (e) {}
    return state;
  }

  /* ---------- the dialog ---------- */
  let onDone = null;
  /** Open the KYC dialog; `onVerified` runs once KYC is complete (e.g. continue to payment). */
  function open(opts = {}) {
    onDone = opts.onVerified || null;
    stepPan();
  }
  function frame(stepNo, body) {
    const steps = ['PAN details', 'Aadhaar via DigiLocker', 'Done'];
    showModal(T('Complete your KYC'), `<div class="v22 ma-kyc">
      <ol class="ma-kyc-steps">${steps.map((s, i) => `<li class="${i + 1 < stepNo ? 'done' : i + 1 === stepNo ? 'on' : ''}"><span>${i + 1 < stepNo ? '✓' : i + 1}</span>${T(s)}</li>`).join('')}</ol>
      ${body}</div>`);
    document.querySelectorAll('#modal-root [data-modal-close]').forEach((b) => (b.onclick = () => (modalRoot.innerHTML = '')));
  }
  /** Step 1: PAN form. */
  function stepPan(prefill = {}) {
    const today = new Date(); const max = `${today.getFullYear() - 18}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    frame(1, `<p class="ma-kyc-lead">${T('SEBI requires a one-time KYC before your first paid plan. If you have done KYC with a broker or mutual fund before, it usually completes instantly.')}</p>
      <form id="ma-kyc-f" class="ma-kyc-form" novalidate>
        <label class="v22-fl">${T('PAN')}<input name="pan" maxlength="10" autocomplete="off" spellcheck="false" placeholder="ABCDE1234F" value="${esc(prefill.pan || '')}" required></label>
        <label class="v22-fl">${T('Name as on PAN')}<input name="name" maxlength="100" placeholder="${T('Full name')}" value="${esc(prefill.name || (typeof currentUser !== 'undefined' ? currentUser.name : ''))}" required></label>
        <label class="v22-fl">${T('Date of birth')}<input name="dob" type="date" max="${max}" value="${esc(prefill.dob || '')}" required></label>
        <label class="ma-kyc-consent"><input type="checkbox" name="consent"${prefill.consent ? ' checked' : ''}> <span>${T('I agree that Mod Alpha and its KYC partner may verify my PAN with the Income Tax Department and fetch / register my KYC record with a KYC Registration Agency (KRA). Mod Alpha stores only the result, never my full PAN or Aadhaar.')}</span></label>
        <div class="v22-err" id="ma-kyc-err" role="alert"></div>
        <div class="ma-kyc-actions"><button type="button" class="v22-ghost-btn" data-modal-close>${T('Later')}</button><button type="submit" class="v22-grad-btn">${T('Verify PAN')}</button></div>
      </form>`);
    const f = document.getElementById('ma-kyc-f'), err = document.getElementById('ma-kyc-err');
    f.pan.addEventListener('input', () => { const p = f.pan.selectionStart; f.pan.value = f.pan.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); f.pan.setSelectionRange(p, p); });
    f.pan.focus();
    f.onsubmit = async (e) => {
      e.preventDefault(); err.textContent = '';
      const v = { pan: f.pan.value.trim().toUpperCase(), name: f.name.value.trim(), dob: f.dob.value, consent: f.consent.checked };
      if (!PAN_RE.test(v.pan)) { err.textContent = T('Enter a valid PAN (5 letters, 4 digits, 1 letter — e.g. ABCDE1234F).'); f.pan.focus(); return; }
      if (v.name.length < 2) { err.textContent = T('Enter your name as printed on your PAN card.'); f.name.focus(); return; }
      if (!v.dob) { err.textContent = T('Enter your date of birth.'); return; }
      if (!v.consent) { err.textContent = T('Please give your consent to continue.'); return; }
      const btn = f.querySelector('[type=submit]'); btn.disabled = true; btn.textContent = T('Verifying…');
      try { await submitPan(v); }
      catch (ex) { btn.disabled = false; btn.textContent = T('Verify PAN'); err.textContent = T((ex.details && ex.details[0] && ex.details[0].message) || ex.message || 'Could not verify your PAN.'); }
    };
  }
  /** Send the PAN (API or demo rules) and move to the next step. */
  async function submitPan(v) {
    let r;
    if (live) r = await API.post('/kyc/pan', v);
    else {
      await new Promise((res) => setTimeout(res, 600));
      if (/0000[A-Z]$/.test(v.pan)) throw new Error('PAN not found in the Income Tax database (test PAN ending 0000X). Check the details and try again.');
      r = v.pan === 'ABCDE1234F' ? { status: 'Verified', method: 'kra', panMasked: mask(v.pan) } : { status: 'Pending', next: 'digilocker', panMasked: mask(v.pan) };
      demoSet({ status: r.status, method: r.method || 'digilocker', panMasked: r.panMasked });
    }
    if (r.status === 'Verified') return stepDone(r);
    if (r.status === 'In review') {
      frame(2, `<div class="ma-kyc-result warn">${icon('shield', 44)}<b>${T('KYC is being reviewed')}</b><p>${esc(T(r.message || 'Our team will review your KYC within 1 business day.'))}</p></div><div class="ma-kyc-actions"><button type="button" class="v22-grad-btn" data-modal-close>${T('OK')}</button></div>`);
      return;
    }
    stepDigiLocker(r);
  }
  /** Step 2: no KRA record — full KYC with DigiLocker at the provider. */
  function stepDigiLocker(r) {
    frame(2, `<div class="ma-kyc-result">${icon('shield', 44)}<b>${T('PAN verified')} · ${esc(r.panMasked || '')}</b>
      <p>${T('We could not find an existing KYC record for this PAN, so one more step is needed: verify your Aadhaar through DigiLocker on our KYC partner\'s secure page (about 3 minutes, with an OTP on your Aadhaar-linked mobile).')}</p></div>
      <div class="ma-kyc-actions"><button type="button" class="v22-ghost-btn" data-modal-close>${T('Later')}</button><button type="button" class="v22-grad-btn" data-kyc-digi>${T('Verify with DigiLocker')}</button></div>`);
    document.querySelector('[data-kyc-digi]').onclick = async () => {
      if (live) { try { sessionStorage.setItem('ma-kyc-return', location.hash); } catch (e) {} location.href = r.redirectUrl; return; }
      // demo: the DigiLocker step completes immediately
      const b = document.querySelector('[data-kyc-digi]'); b.disabled = true; b.textContent = T('Verifying…');
      await new Promise((res) => setTimeout(res, 900));
      demoSet({ status: 'Verified', method: 'digilocker', panMasked: r.panMasked });
      stepDone({ status: 'Verified', method: 'digilocker', panMasked: r.panMasked });
    };
  }
  /** Step 3: verified. */
  function stepDone(r) {
    state = { status: 'Verified', method: r.method, panMasked: r.panMasked, updatedAt: new Date().toISOString() };
    if (window.MA_STATE && MA_STATE.user) MA_STATE.user.kycStatus = 'Verified';
    frame(4, `<div class="ma-kyc-result ok">${icon('check', 44)}<b>${T('KYC verified')}</b><p>${r.method === 'kra' ? T('Your existing KYC record was found in the KYC registry.') : T('Your Aadhaar was verified through DigiLocker and your KYC record has been registered.')}</p><small>PAN ${esc(r.panMasked || '')}</small></div>
      <div class="ma-kyc-actions"><button type="button" class="v22-grad-btn" data-kyc-continue>${onDone ? T('Continue to payment') : T('Done')}</button></div>`);
    document.querySelector('[data-kyc-continue]').onclick = () => { modalRoot.innerHTML = ''; const f = onDone; onDone = null; refreshStrip(); refreshProfile(); if (f) f(); };
  }

  /* ---------- status strip on the subscription page ---------- */
  const METHOD = { kra: 'KYC registry (KRA)', digilocker: 'DigiLocker', manual: 'Mod Alpha review' };
  function stripHtml(s) {
    if (s.status === 'Verified') return `<div class="ma-kyc-strip ok">${icon('shield', 26)}<span><b>${T('KYC verified')}</b> · ${T('via')} ${T(METHOD[s.method] || 'KYC partner')}${s.panMasked ? ` · PAN ${esc(s.panMasked)}` : ''}</span></div>`;
    if (s.status === 'Pending') return `<div class="ma-kyc-strip warn">${icon('shield', 26)}<span><b>${T('KYC in progress')}</b> · ${T('finish the DigiLocker step to subscribe')}</span><button type="button" class="v22-row-btn" data-kyc-open>${T('Continue KYC')}</button></div>`;
    if (s.status === 'In review') return `<div class="ma-kyc-strip warn">${icon('shield', 26)}<span><b>${T('KYC under review')}</b> · ${T('we will update you within 1 business day')}</span></div>`;
    return `<div class="ma-kyc-strip">${icon('shield', 26)}<span><b>${T('KYC not done yet')}</b> · ${T('a one-time check with your PAN before your first paid plan')}</span><button type="button" class="v22-row-btn" data-kyc-open>${T('Start KYC')}</button></div>`;
  }
  /** Fill / refresh the KYC strip if the subscription page is open. */
  async function refreshStrip() {
    const el = document.getElementById('ma-kyc-strip'); if (!el) return;
    el.innerHTML = stripHtml(await status());
  }
  // (No strip on the subscription page: KYC is shown in Settings → Profile and opens on the first paid plan.)
  window.addEventListener('click', (e) => { if (e.target.closest && e.target.closest('[data-kyc-open]')) { e.preventDefault(); open({}); } });

  /* ---------- "Identity (KYC)" card on Settings → Profile ---------- */
  const fmtDate = (t) => { const d = t ? new Date(t) : null; return d && !isNaN(d) ? d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'; };
  const STATUS_TONE = { Verified: 'ok', Pending: 'warn', 'In review': 'warn', Rejected: 'bad', 'Not started': 'neutral' };
  function cardHtml(s) {
    const st = s.status || 'Not started';
    const rows = st === 'Verified' || s.panMasked ? [
      ['Status', `<span class="v22-pill ${STATUS_TONE[st] || 'neutral'}">${esc(T(st))}</span>`],
      ['Verified through', esc(T(METHOD[s.method] || '—'))],
      ['PAN', s.panMasked ? `<span class="mono">${esc(s.panMasked)}</span>` : '—'],
      ['KYC registry reference', s.kraRef ? `<span class="mono">${esc(s.kraRef)}</span>` : '—'],
      [st === 'Verified' ? 'Verified on' : 'Last update', esc(fmtDate(s.updatedAt))],
    ] : [];
    const action = st === 'Verified' || st === 'In review' ? '' : `<button type="button" class="v22-grad-btn" data-kyc-open>${T(st === 'Pending' ? 'Continue KYC' : 'Start KYC')}</button>`;
    return `<h3 class="v22-set-h">${icon('shield', 24)} ${T('Identity (KYC)')}</h3>
      ${rows.length ? `<div class="v22-kv ma-kyc-kv">${rows.map((r) => `<div><span>${T(r[0])}</span><b>${r[1]}</b></div>`).join('')}</div>` : `<p class="v22-hint top">${T('A one-time check with your PAN, required by SEBI before your first paid plan.')}</p>`}
      ${s.reason && st !== 'Verified' ? `<p class="v22-hint">${esc(s.reason)}</p>` : ''}
      <p class="v22-hint">${T('Only the masked PAN and the result are stored — never your full PAN, Aadhaar number or documents.')}</p>${action ? `<div class="ma-kyc-actions" style="justify-content:flex-start">${action}</div>` : ''}`;
  }
  /** Refresh the profile's KYC tag and card from the latest KYC state. */
  async function refreshProfile() {
    const card = document.getElementById('ma-kyc-card'), tag = document.getElementById('ma-prof-kyc');
    if (!card && !tag) return;
    const s = await status();
    if (card) card.innerHTML = cardHtml(s);
    if (tag) { tag.className = `v22-pill ${STATUS_TONE[s.status] || 'neutral'}`; tag.textContent = `KYC: ${T(s.status || 'Not started')}${s.panMasked && s.status === 'Verified' ? ` · ${s.panMasked}` : ''}`; }
  }
  // add the card after "Personal details" on the profile tab
  const baseSettingsPage = settingsPage;
  settingsPage = function () {
    let h = baseSettingsPage();
    if (typeof settingsTab !== 'undefined' && settingsTab === 'profile') {
      h = h.replace(/(<section class="v22-card v22-set-card" id="ma-personal">[\s\S]*?<\/section>)/, `$1<section class="v22-card v22-set-card" id="ma-kyc-card"></section>`);
      setTimeout(refreshProfile, 0);
    }
    return h;
  };

  window.MA_KYC = { open, status, refreshStrip, refreshProfile, get state() { return state; } };
})();
