/* ==========================================================================
   Live mode — support form (POST /support/tickets).
   ========================================================================== */
(function () {
  if (!window.MA_LIVE) return; // demo mode (no API): nothing to do
  const { API, busy, fail, on } = MA_LIVE;
  on('[data-v22-support]', async (b) => {
    const em = document.getElementById('support-email').value.trim(), msg = document.getElementById('support-message').value.trim(), topic = (document.querySelector('#v22-topic button.active')?.textContent || 'Product question').replace('&amp;', '&');
    const done = busy(b, 'Sending…');
    try { const r = await API.post('/support/tickets', { email: em, topic: topic.includes('privacy') ? 'Account & privacy' : topic, message: msg }); done(); const ok = document.getElementById('v22-support-ok'); ok.hidden = false; ok.innerHTML = `${cic('check', 22)} ${esc(r.message)}`; document.getElementById('support-message').value = ''; }
    catch (e) { done(); fail(e.details?.[0] ? new Error(e.details[0].path === 'message' ? 'Please describe your question (at least 10 characters).' : e.details[0].message) : e); }
  });
})();
