/* Mod Alpha — admin notification templates: tiles + wide editor with live preview.
   Used by the demo (admin-notifications.js) and by live mode (admin-notifications.live.js → PUT /admin/notification-templates/:key). */
(function () {
  // Escape text for HTML.
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  // Translate (Hindi) when available.
  const T = (s) => (window.MA_T ? window.MA_T(s) : s);
  const CH = { email: ['mail', 'Email'], sms: ['sms', 'SMS'], push: ['phone', 'Push'], inapp: ['bell', 'In-app'], whatsapp: ['chat', 'WhatsApp'] };
  const ICON = { sip_reminder: 'calendar', subscription_confirmation: 'check', payment_status: 'rupee', security_alert: 'shield' };
  const SAMPLE = { name: 'Ankit', date: '12 November', month: 'November 2026', plan: 'Pro', amount: '₹299' };
  // Fill {{name}}, {{date}}… with sample values for the preview.
  const fill = (s) => String(s || '').replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => SAMPLE[k] ?? `{{${k}}}`);
  // Coloured icon helper.
  const ic = (n, s) => (typeof cic === 'function' ? cic(n, s) : '');

  // demo defaults (same content as the API seed)
  const DEMO = [
    { key: 'sip_reminder', name: 'SIP date reminder', desc: 'Sent 2 days before the published date', channels: ['email', 'sms', 'push', 'inapp'], status: 'Active', subject: 'Your SIP date is {{date}}', body: 'Hi {{name}},\n\nYour Mod Alpha recommended SIP date this month is {{date}}. Review your decision and, if appropriate, invest through your own mutual fund provider. Mod Alpha does not place orders.\n\nPast performance does not guarantee future returns.', sms_text: 'Mod Alpha: your SIP date this month is {{date}}. Invest via your own provider. Not advice.', updated: '28 Oct 2026' },
    { key: 'subscription_confirmation', name: 'Subscription confirmation', desc: 'Sent after successful checkout', channels: ['email', 'inapp'], status: 'Active', subject: 'Welcome to Mod Alpha {{plan}}', body: 'Hi {{name}},\n\nYour {{plan}} plan is active. Your GST invoice for {{amount}} is available under Billing history.\n\nThank you for subscribing.', sms_text: '', updated: '21 Oct 2026' },
    { key: 'payment_status', name: 'Payment status update', desc: 'Renewals, failures and receipts', channels: ['email', 'push'], status: 'Active', subject: 'Payment update for your {{plan}} plan', body: 'Hi {{name}},\n\nWe could not process your renewal payment of {{amount}}. Please update your payment method to keep your plan active.', sms_text: 'Mod Alpha: renewal payment of {{amount}} failed. Update your payment method in the app.', updated: '14 Oct 2026' },
    { key: 'security_alert', name: 'Security alert', desc: 'New sign-in and password changes', channels: ['email', 'sms'], status: 'Draft', subject: 'New sign-in to your Mod Alpha account', body: 'Hi {{name}},\n\nWe noticed a new sign-in to your account. If this was not you, reset your password immediately.', sms_text: 'Mod Alpha: new sign-in to your account. Not you? Reset your password now.', updated: '09 Oct 2026' },
  ];
  // Demo templates (edits kept for this browser session).
  function demoList() { try { const s = JSON.parse(sessionStorage.getItem('ma-demo-templates')); if (Array.isArray(s)) return s; } catch (e) {} return DEMO.map((x) => ({ ...x })); }
  // Save an edited demo template.
  function demoSave(t) { const l = demoList().map((x) => (x.key === t.key ? { ...x, ...t, updated: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) } : x)); try { sessionStorage.setItem('ma-demo-templates', JSON.stringify(l)); } catch (e) {} }

  // One template tile: icon, status, name, subject, channels, Edit button.
  function tile(t, attr) {
    const status = typeof v22Status === 'function' ? v22Status(t.status) : esc(t.status);
    return `<article class="ma-tpl">
      <header><div class="ma-tpl-top">${ic(ICON[t.key] || 'mail', 36)}${status}</div><b>${esc(t.name)}</b><small>${esc(t.desc || t.subject)}</small></header>
      <div class="ma-tpl-subj"><span>${T('Subject')}</span><p>${esc(fill(t.subject))}</p></div>
      <div class="ma-tpl-ch">${(t.channels || []).map((c) => `<span class="ma-ch on">${ic((CH[c] || [c])[0], 16)}${T((CH[c] || [, c])[1])}</span>`).join('')}</div>
      <footer><small>${t.updated ? `${T('Updated')} ${esc(t.updated)}` : esc(t.key)}</small><button type="button" class="v22-row-btn" ${attr}="${esc(t.key)}">${T('Edit template')} →</button></footer>
    </article>`;
  }
  // Grid of template tiles.
  function grid(list, attr) { return `<div class="ma-tpl-grid">${list.map((t) => tile(t, attr)).join('')}</div>`; }

  // SMS length and number of SMS parts (160 characters each).
  function smsInfo(s) { const n = s.length; return `${n}/160 · ${Math.max(1, Math.ceil(n / 160))} SMS`; }
  // Live preview as email, SMS, push or in-app message.
  function preview(st, tab) {
    const subj = esc(fill(st.subject)), body = esc(fill(st.body)).replace(/\n/g, '<br>'), sms = esc(fill(st.sms_text || st.subject));
    if (tab === 'sms') return `<div class="ma-pv-phone"><div class="ma-pv-sms"><small>MODALP · ${T('now')}</small><p>${sms || '—'}</p></div><em>${smsInfo(fill(st.sms_text || ''))}</em></div>`;
    if (tab === 'push' || tab === 'inapp') return `<div class="ma-pv-phone"><div class="ma-pv-push"><span class="ma-pv-app">α</span><div><b>Mod Alpha</b><strong>${subj}</strong><p>${sms}</p></div><small>${T('now')}</small></div></div>`;
    return `<div class="ma-pv-mail"><div class="ma-pv-mail-h"><span>From</span><b>Mod Alpha &lt;no-reply@modalpha.in&gt;</b><span>To</span><b>${SAMPLE.name} &lt;ankit@example.com&gt;</b><span>Subject</span><b>${subj}</b></div><div class="ma-pv-mail-b">${body}<hr><small>${T('You receive this because SIP reminders are on. Unsubscribe: Settings → Notifications.')}</small></div></div>`;
  }

  // Template editor dialog with live preview; onSave receives the changes.
  function edit(t, onSave) {
    const st = { ...t, channels: [...(t.channels || [])] };
    let tab = st.channels.includes('email') ? 'email' : st.channels[0] || 'email';
    showModal(`${T('Edit template')} · ${esc(t.name)}`, `<div class="v22 ma-tpl-ed">
      <form id="ma-tpl-ed-f" class="ma-tpl-form">
        <label class="v22-fl">${T('Template name')}<input name="name" value="${esc(st.name)}" required></label>
        <div class="v22-fl">${T('Channels')}<div class="ma-ch-pick">${Object.keys(CH).map((c) => `<button type="button" class="ma-ch ${st.channels.includes(c) ? 'on' : ''}" data-ch="${c}" aria-pressed="${st.channels.includes(c)}">${ic(CH[c][0], 16)}${T(CH[c][1])}</button>`).join('')}</div></div>
        <label class="v22-fl">${T('Subject / title')} <small class="ma-vars">${T('Variables')}: <code>{{name}}</code> <code>{{date}}</code> <code>{{plan}}</code> <code>{{amount}}</code></small><input name="subject" value="${esc(st.subject)}" required></label>
        <label class="v22-fl">${T('Email body')}<textarea name="body" rows="8" required>${esc(st.body)}</textarea></label>
        <label class="v22-fl">${T('SMS / push text')} <small id="ma-sms-n">${smsInfo(st.sms_text || '')}</small><input name="sms_text" maxlength="160" value="${esc(st.sms_text || '')}"></label>
        <div class="v22-fl">${T('Status')}<div class="ma-status-pick">${['Draft', 'Active', 'Archived'].map((s) => `<button type="button" class="${st.status === s ? 'on' : ''}" data-st="${s}">${T(s)}</button>`).join('')}</div></div>
        <div class="v22-err" id="ma-tpl-ed-err"></div>
      </form>
      <aside class="ma-tpl-pv"><div class="ma-pv-tabs">${['email', 'sms', 'push', 'inapp'].map((c) => `<button type="button" data-pv="${c}" class="${c === tab ? 'on' : ''}">${ic(CH[c][0], 15)}${T(CH[c][1])}</button>`).join('')}</div><div id="ma-tpl-pv-body">${preview(st, tab)}</div><p class="ma-pv-note">${T('Preview uses sample values (Ankit, 12 November). Users who switched a channel off are skipped.')}</p></aside>
      <div class="ma-tpl-actions"><button type="button" class="v22-ghost-btn" data-modal-close>${T('Cancel')}</button><button type="button" class="v22-grad-btn" data-tpl-save>${T('Save template')}</button></div>
    </div>`);
    const root = document.getElementById('modal-root');
    root.querySelector('.modal')?.classList.add('ma-modal-wide');
    root.querySelectorAll('[data-modal-close]').forEach((b) => (b.onclick = () => (root.innerHTML = '')));
    const f = root.querySelector('#ma-tpl-ed-f');
    // Refresh the preview while typing.
    const repaint = () => { root.querySelector('#ma-tpl-pv-body').innerHTML = preview(st, tab); root.querySelector('#ma-sms-n').textContent = smsInfo(st.sms_text || ''); };
    f.addEventListener('input', (e) => { if (e.target.name) { st[e.target.name] = e.target.value; repaint(); } });
    root.querySelectorAll('[data-ch]').forEach((b) => (b.onclick = () => { const c = b.dataset.ch, on = !st.channels.includes(c); st.channels = on ? [...st.channels, c] : st.channels.filter((x) => x !== c); b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); }));
    root.querySelectorAll('[data-st]').forEach((b) => (b.onclick = () => { st.status = b.dataset.st; root.querySelectorAll('[data-st]').forEach((x) => x.classList.toggle('on', x === b)); }));
    root.querySelectorAll('[data-pv]').forEach((b) => (b.onclick = () => { tab = b.dataset.pv; root.querySelectorAll('[data-pv]').forEach((x) => x.classList.toggle('on', x === b)); repaint(); }));
    root.querySelector('[data-tpl-save]').onclick = async (e) => {
      const err = root.querySelector('#ma-tpl-ed-err'); err.textContent = '';
      if (!st.channels.length) { err.textContent = T('Choose at least one channel.'); return; }
      if (!f.reportValidity()) return;
      e.currentTarget.disabled = true;
      try { await onSave({ name: st.name, channels: st.channels, subject: st.subject, body: st.body, sms_text: st.sms_text, status: st.status }); root.innerHTML = ''; }
      catch (ex) { e.currentTarget.disabled = false; err.textContent = ex.details?.[0] ? `${ex.details[0].path}: ${ex.details[0].message}` : (ex.message || 'Could not save'); }
    };
  }

  // demo mode: tiles come from admin-notifications.js; clicking Edit opens the editor and saves in this browser session
  window.addEventListener('click', (e) => {
    const b = e.target.closest && e.target.closest('[data-ma-tpl-demo]');
    if (!b) return;
    e.preventDefault(); e.stopImmediatePropagation();
    const t = demoList().find((x) => x.key === b.dataset.maTplDemo);
    if (t) edit(t, async (d) => { demoSave({ key: t.key, ...d }); notify(T('Template saved.')); if (typeof route === 'function') route(); });
  }, true);

  window.MA_TPL = { tile, grid, edit, demoList };
})();
