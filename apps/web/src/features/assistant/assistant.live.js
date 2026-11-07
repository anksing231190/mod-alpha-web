/* ==========================================================================
   Live mode — AI assistant
   Sends the conversation (last 6 messages) to POST /assistant/messages and types the reply out, with the
   questions left today / this month (caps come from the plan). A 429 means a cap is reached.
   ========================================================================== */
(function () {
  if (!window.MA_LIVE) return; // demo mode (no API): nothing to do
  const { API, errMsg } = MA_LIVE;
  const chatHistory = [];
  // questions left (today / this month) for the chat footer — from the plan's caps
  const loadQuota = async () => { try { const e = await API.get('/me/entitlements'); MA_AI.quota({ today: e.usage.aiQueriesToday, month: e.usage.aiQueriesMonth, limit: Number(e.limits?.ai_queries_per_day ?? 1), monthLimit: Number(e.limits?.ai_queries_per_month ?? -1) }); } catch (e) { /* signed out */ } };
  // capture phase: the chat button's own handler stops the click from bubbling
  document.addEventListener('click', (e) => { if (e.target.closest('[data-v22-chat-toggle]')) loadQuota(); }, true);
  v22ChatSend = async function (q) {
    q = (q || '').trim(); if (!q) return;
    const box = document.getElementById('chat-messages'); box.querySelector('.v22-chat-prompts')?.remove();
    box.insertAdjacentHTML('beforeend', `<div class="v22-bubble me">${esc(q)}</div><div class="v22-bubble bot typing">${MA_AI.orb('Thinking…')}</div>`); box.scrollTop = box.scrollHeight;
    chatHistory.push({ role: 'user', content: q });
    const t = box.querySelector('.typing');
    try {
      MA_AI.thinking(true);
      const r = await API.post('/assistant/messages', { messages: chatHistory.slice(-6) });
      chatHistory.push({ role: 'assistant', content: r.reply });
      MA_AI.quota(r.usage);
      t.classList.remove('typing'); t.innerHTML = MA_AI.badge() + '<div></div>';
      MA_AI.reveal(t.lastChild, esc(r.reply).replace(/\n/g, '<br>') + `<small>${esc(r.disclaimer)}</small>`);
    } catch (e) { chatHistory.pop(); t.classList.remove('typing'); t.innerHTML = `${esc(errMsg(e))}${e.status === 429 ? ' <a href="#/user/subscription" style="color:#7cb3ff">Upgrade</a>' : ''}`; }
    finally { MA_AI.thinking(false); }
    box.scrollTop = box.scrollHeight;
  };
})();
