/* ==========================================================================
   Live mode — AI assistant
   Sends the conversation (last 10 messages) to POST /assistant/messages and shows the
   reply with the daily usage; a 429 means the plan's daily limit is reached.
   ========================================================================== */
(function () {
  if (!window.MA_LIVE) return; // demo mode (no API): nothing to do
  const { API, errMsg } = MA_LIVE;
  const chatHistory = [];
  v22ChatSend = async function (q) {
    q = (q || '').trim(); if (!q) return;
    const box = document.getElementById('chat-messages'); box.querySelector('.v22-chat-prompts')?.remove();
    box.insertAdjacentHTML('beforeend', `<div class="v22-bubble me">${esc(q)}</div><div class="v22-bubble bot typing"><i></i><i></i><i></i></div>`); box.scrollTop = box.scrollHeight;
    chatHistory.push({ role: 'user', content: q });
    const t = box.querySelector('.typing');
    try {
      const r = await API.post('/assistant/messages', { messages: chatHistory.slice(-10) });
      chatHistory.push({ role: 'assistant', content: r.reply });
      t.classList.remove('typing'); t.innerHTML = esc(r.reply).replace(/\n/g, '<br>') + `<small>${r.usage.limit >= 0 ? `${r.usage.today}/${r.usage.limit} today · ` : ''}${esc(r.disclaimer)}</small>`;
    } catch (e) { chatHistory.pop(); t.classList.remove('typing'); t.innerHTML = `${esc(errMsg(e))}${e.status === 429 ? ' <a href="#/user/subscription" style="color:#7cb3ff">Upgrade</a>' : ''}`; }
    box.scrollTop = box.scrollHeight;
  };
})();
