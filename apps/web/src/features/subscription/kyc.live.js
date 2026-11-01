/* ==========================================================================
   Live mode — KYC
   The stage-only mock KYC page (#/kyc/mock) with Approve / Reject, and starting KYC
   with the provider before the first paid plan.
   ========================================================================== */
(function () {
  if (!window.MA_LIVE) return; // demo mode (no API): nothing to do
  const { API, authShell, fail } = MA_LIVE;
  // ------------------------------------------------------------------ KYC (mock page on stage; real provider redirects)
  function renderMockKyc() {
    const ref = new URLSearchParams(location.hash.split('?')[1] || '').get('ref') || '';
    authShell('Test KYC verification', `<p>This stage-only page stands in for the KYC provider (Digio). Choose the outcome to simulate the provider's signed webhook.</p><div class="v22-modal-actions" style="justify-content:center;margin-top:24px"><button class="v22-danger-btn" data-ma-kyc="Rejected">Reject</button><button class="v22-grad-btn" data-ma-kyc="Verified">Approve</button></div><p class="v22-hint">Reference: ${esc(ref)}</p>`);
    document.querySelectorAll('[data-ma-kyc]').forEach((b) => (b.onclick = async () => { try { await API.post('/kyc/mock/complete', { ref, decision: b.dataset.maKyc }); notify(`KYC ${b.dataset.maKyc.toLowerCase()} (test).`); go('user/subscription'); } catch (e) { fail(e); } }));
  }

  // used by other live files
  Object.assign(MA_LIVE, { renderMockKyc });
})();
