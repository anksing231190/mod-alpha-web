/* ==========================================================================
   Admin: Billing & Refunds (#/admin/billing) — two tabs
   • Payments & refunds: this month's collected / refunded / net, and every payment with its invoice, kind
     (new, upgrade), refunded amount and credit notes. "Refund" (super admins) opens a form: amount (up to
     what is left), a reason (duplicate charge, charged after cancelling, service outage, goodwill, first-
     payment refund) and a note. Confirming refunds through the gateway and issues a GST credit note
     (docs/29_subscription_rules.md), shown on the row and in the customer's Billing history.
   • Cancellation reasons: answers from the cancellation survey for the last 30 / 90 / 365 days — a bar per
     reason, the share of active plans, and the latest comments.
     live: GET /admin/payments · POST /admin/payments/:id/refund · GET /admin/cancellations?days=
     demo: sample data kept in this browser
   Styles: src/styles/ux.css (.ma-bill)
   ========================================================================== */
(function () {
  const T = (s) => (window.MA_T ? MA_T(s) : s);
  const live = () => !!(window.MA_LIVE && MA_LIVE.API);
  const money = (n) => '₹' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: Number(n) % 1 ? 2 : 0, maximumFractionDigits: 2 });
  const day = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
  const REASONS = { too_expensive: ['It’s too expensive', '#f43f5e'], not_using: ['Not using it enough', '#f59e0b'], missing_feature: ['A feature is missing', '#8b5cf6'], found_alternative: ['Found another service', '#3b82f6'], temporary: ['Taking a break', '#06b6d4'], other: ['Something else', '#64748b'], no_answer: ['Skipped the survey', '#475569'] };
  const REFUND_WHY = ['Charged twice for the same period', 'Charged after the customer cancelled', 'Service unavailable for a long period', 'Goodwill refund', 'First-payment refund (within 7 days)'];
  let st = { tab: 'payments', pays: null, month: null, can: null, days: 90, q: '' };
  const DKEY = 'ma-demo-admin-pays';
  const dago = (n) => new Date(Date.now() - n * 864e5).toISOString().slice(0, 10);
  function demoPays() {
    try { const s = JSON.parse(localStorage.getItem(DKEY) || 'null'); if (s) return s; } catch (e) {}
    return [
      { id: 'p1', full_name: 'Riya Mehta', email: 'riya.m@example.com', plan_id: 'Pro', billing_cycle: 'Monthly', kind: 'new', amount_inr: 299, refunded_inr: 0, status: 'captured', paid_on: dago(0), invoice_number: 'MA/26-27/00231', credit_notes: null },
      { id: 'p2', full_name: 'Riya Mehta', email: 'riya.m@example.com', plan_id: 'Pro', billing_cycle: 'Monthly', kind: 'new', amount_inr: 299, refunded_inr: 0, status: 'captured', paid_on: dago(0), invoice_number: 'MA/26-27/00230', credit_notes: null },
      { id: 'p3', full_name: 'Arjun Nair', email: 'arjun.n@example.com', plan_id: 'Premium', billing_cycle: 'Monthly', kind: 'upgrade', amount_inr: 122.58, refunded_inr: 0, status: 'captured', paid_on: dago(2), invoice_number: 'MA/26-27/00226', credit_notes: null },
      { id: 'p4', full_name: 'Sneha Kulkarni', email: 'sneha.k@example.com', plan_id: 'Premium', billing_cycle: 'Yearly', kind: 'new', amount_inr: 4788, refunded_inr: 0, status: 'captured', paid_on: dago(5), invoice_number: 'MA/26-27/00219', credit_notes: null },
      { id: 'p5', full_name: 'Vikram Shah', email: 'vikram.s@example.com', plan_id: 'Pro', billing_cycle: 'Monthly', kind: 'new', amount_inr: 299, refunded_inr: 299, status: 'refunded', paid_on: dago(9), invoice_number: 'MA/26-27/00204', credit_notes: [{ number: 'CN/26-27/00003', amount: 299, reason: 'Charged after the customer cancelled', issued_at: dago(8) }] },
      { id: 'p6', full_name: 'Neha Gupta', email: 'neha.g@example.com', plan_id: 'Pro', billing_cycle: 'Yearly', kind: 'new', amount_inr: 2868, refunded_inr: 0, status: 'captured', paid_on: dago(14), invoice_number: 'MA/26-27/00188', credit_notes: null },
    ];
  }
  function demoCan(days) {
    const k = days / 90, r = [['too_expensive', 14], ['not_using', 11], ['temporary', 7], ['missing_feature', 5], ['found_alternative', 4], ['other', 2], ['no_answer', 3]].map(([reason, n]) => ({ reason, n: Math.max(1, Math.round(n * k)) }));
    return { days, reasons: r, total: r.reduce((a, x) => a + x.n, 0), active: 1240, latest: [
      { full_name: 'Karan Malhotra', email: 'karan.m@example.com', plan_id: 'Pro', billing_cycle: 'Monthly', reason: 'too_expensive', comment: 'A cheaper plan with just the SIP date would work for me.', updated_at: dago(1), renewal_date: dago(-12) },
      { full_name: 'Ananya Rao', email: 'ananya.r@example.com', plan_id: 'Premium', billing_cycle: 'Monthly', reason: 'missing_feature', comment: 'I need tax-saving (ELSS) fund comparisons.', updated_at: dago(3), renewal_date: dago(-20) },
      { full_name: 'Rahul Verma', email: 'rahul.v@example.com', plan_id: 'Pro', billing_cycle: 'Yearly', reason: 'temporary', comment: '', updated_at: dago(6), renewal_date: dago(-140) },
      { full_name: 'Pooja Iyer', email: 'pooja.i@example.com', plan_id: 'Pro', billing_cycle: 'Monthly', reason: 'not_using', comment: 'I only check once a month.', updated_at: dago(9), renewal_date: dago(-4) },
    ] };
  }
  const saveDemo = () => { try { localStorage.setItem(DKEY, JSON.stringify(st.pays)); } catch (e) {} };
  const monthOf = (p) => { const m = new Date().toISOString().slice(0, 7), mine = p.filter((x) => String(x.paid_on || '').slice(0, 7) === m); return { gross: mine.reduce((a, x) => a + Number(x.amount_inr), 0), refunded: p.filter((x) => (x.credit_notes || []).some((c) => String(c.issued_at).slice(0, 7) === m)).reduce((a, x) => a + Number(x.refunded_inr), 0), refunds: p.filter((x) => Number(x.refunded_inr) > 0).length }; };

  async function load() {
    if (st.tab === 'payments') {
      if (!live()) { st.pays = demoPays(); st.month = monthOf(st.pays); }
      else { try { const r = await MA_LIVE.API.get('/admin/payments'); st.pays = r.items; st.month = r.month; } catch (e) { st.pays = []; st.month = { gross: 0, refunded: 0, refunds: 0 }; notify(e.message); } }
    } else {
      if (!live()) st.can = demoCan(st.days);
      else { try { st.can = await MA_LIVE.API.get(`/admin/cancellations?days=${st.days}`); } catch (e) { st.can = { days: st.days, reasons: [], latest: [], total: 0, active: 0 }; notify(e.message); } }
    }
    paint();
  }

  function paymentsHtml() {
    if (!st.pays) return `<section class="v22-card">${window.MA_AI ? MA_AI.skel(5) : ''}</section>`;
    const m = st.month || { gross: 0, refunded: 0, refunds: 0 }, q = st.q.toLowerCase();
    const rows = st.pays.filter((p) => !q || [p.full_name, p.email, p.invoice_number, p.provider_payment_id].some((x) => String(x || '').toLowerCase().includes(q)));
    return `${v22Kpis([['rupee', T('Collected this month'), money(m.gross), T('incl. GST'), ''], ['refund', T('Refunded this month'), money(m.refunded), `${m.refunds} ${T(m.refunds === 1 ? 'refund' : 'refunds')}`, m.refunded ? 'neg' : ''], ['chart', T('Net this month'), money(m.gross - m.refunded), T('after refunds'), 'pos'], ['doc', T('Payments listed'), String(st.pays.length), T('latest 200'), '']])}
      <section class="v22-card ma-bill-card"><div class="ma-bill-tools"><label class="ma-inbox-q">${ic('search')}<input type="search" placeholder="${esc(T('Search customer, email or invoice no.'))}" value="${esc(st.q)}" data-bill-q></label><small class="v22-muted">${T('Refunds are for billing errors and exceptions only (docs/29). Each refund issues a GST credit note.')}</small></div>
      <div class="ma-bill-tbl-wrap"><table class="v22-table ma-bill-tbl"><thead><tr><th>${T('Date')}</th><th>${T('Customer')}</th><th>${T('Plan')}</th><th>${T('Invoice')}</th><th class="r">${T('Amount')}</th><th class="r">${T('Refunded')}</th><th>${T('Status')}</th><th></th></tr></thead><tbody>
      ${rows.map((p) => { const left = Number(p.amount_inr) - Number(p.refunded_inr || 0), cns = p.credit_notes || [];
        return `<tr><td>${day(p.paid_on || p.created_at)}</td><td><b>${esc(p.full_name || '—')}</b><small>${esc(p.email || '')}</small></td><td>${esc(p.plan_id || '')} · ${esc(p.billing_cycle || '')}${p.kind === 'upgrade' ? ` <span class="ma-bill-kind">${T('upgrade')}</span>` : ''}</td>
          <td class="mono">${esc(p.invoice_number || '—')}${cns.map((c) => `<small class="ma-bill-cn">${esc(c.number)} · −${money(c.amount)}</small>`).join('')}</td>
          <td class="r">${money(p.amount_inr)}</td><td class="r ${Number(p.refunded_inr) ? 'neg' : 'mut'}">${Number(p.refunded_inr) ? '−' + money(p.refunded_inr) : '—'}</td>
          <td><span class="ma-tk-st ${p.status === 'captured' ? 'green' : p.status === 'refunded' ? 'grey' : 'rose'}">${T(p.status === 'captured' ? 'Paid' : p.status === 'refunded' ? 'Refunded' : 'Failed')}</span></td>
          <td class="r">${p.status !== 'failed' && left > 0 ? `<button type="button" class="v22-row-btn" data-bill-refund="${esc(p.id)}">${ic('refund')} ${T('Refund')}</button>` : ''}</td></tr>`; }).join('') || `<tr><td colspan="8" class="ma-inbox-empty">${T('No payments match.')}</td></tr>`}
      </tbody></table></div></section>`;
  }
  function cancelHtml() {
    if (!st.can) return `<section class="v22-card">${window.MA_AI ? MA_AI.skel(4) : ''}</section>`;
    const c = st.can, max = Math.max(1, ...c.reasons.map((r) => r.n)), top = c.reasons[0], rate = c.active ? (c.total / (c.active + c.total)) * 100 : 0;
    return `<div class="ma-bill-period v22-seg-pills">${[30, 90, 365].map((d) => `<button type="button" class="${st.days === d ? 'active' : ''}" data-bill-days="${d}">${d === 365 ? T('12 months') : `${d} ${T('days')}`}</button>`).join('')}</div>
      ${v22Kpis([['cross', T('Cancellations'), String(c.total), `${T('last')} ${c.days} ${T('days')}`, ''], ['chart', T('Of paying customers'), `${rate.toFixed(1)}%`, `${c.active} ${T('active plans now')}`, rate > 5 ? 'neg' : ''], ['warn', T('Top reason'), top ? T(REASONS[top.reason]?.[0] || top.reason) : '—', top ? `${Math.round(top.n / Math.max(1, c.total) * 100)}% ${T('of answers')}` : '', ''], ['chat', T('With a comment'), String(c.latest.filter((x) => x.comment).length), T('in the latest 30'), '']])}
      <section class="ma-bill-two"><div class="v22-card"><h2 class="v22-h2">${T('Why people cancel')}</h2><div class="ma-why">${c.reasons.map((r) => { const [l, col] = REASONS[r.reason] || [r.reason, '#64748b']; return `<div class="ma-why-row"><span>${esc(T(l))}</span><i><em style="width:${(r.n / max * 100).toFixed(1)}%;background:${col}"></em></i><b>${r.n}</b><small>${Math.round(r.n / Math.max(1, c.total) * 100)}%</small></div>`; }).join('') || `<p class="ma-inbox-empty">${T('No cancellations in this period.')}</p>`}</div></div>
      <div class="v22-card"><h2 class="v22-h2">${T('Latest comments')}</h2><div class="ma-cmts">${c.latest.map((x) => { const [l, col] = REASONS[x.reason || 'no_answer'] || [x.reason, '#64748b']; return `<article class="ma-cmt" style="--c:${col}"><header><b>${esc(x.full_name || x.email)}</b><span>${esc(x.plan_id || '')} · ${esc(x.billing_cycle || '')}</span><time>${day(x.updated_at)}</time></header><span class="ma-cmt-r">${esc(T(l))}</span>${x.comment ? `<p>“${esc(x.comment)}”</p>` : `<p class="mut">${T('No comment.')}</p>`}<small>${T('Plan ends')} ${day(x.renewal_date)}</small></article>`; }).join('') || `<p class="ma-inbox-empty">${T('No comments yet.')}</p>`}</div></div></section>`;
  }
  function page() {
    const loaded = st.tab === 'payments' ? st.pays : st.can; if (!loaded) setTimeout(load, 0);
    return `<div class="v22 v22-adm ma-bill">${v22Head(T('Billing & Refunds'), T('Payments, refunds with GST credit notes, and why people cancel.'), '', 'ADMIN')}
      <div class="v22-tabs ma-bill-tabs" role="tablist">${[['payments', 'Payments & refunds', 'rupee'], ['cancel', 'Cancellation reasons', 'chart']].map(([k, l, i]) => `<button type="button" role="tab" aria-selected="${st.tab === k}" class="${st.tab === k ? 'active' : ''}" data-bill-tab="${k}">${ic(i)} ${T(l)}</button>`).join('')}</div>
      ${st.tab === 'payments' ? paymentsHtml() : cancelHtml()}</div>`;
  }
  function paint() { const el = document.querySelector('.ma-bill'); if (el) el.outerHTML = page(); }

  /* ---------- refund form ---------- */
  function refundForm(id) {
    const p = st.pays.find((x) => String(x.id) === String(id)); if (!p) return;
    const left = Number(p.amount_inr) - Number(p.refunded_inr || 0);
    showModal(T('Refund a payment'), `<form class="v22 ma-refund" data-refund-form="${esc(p.id)}">
      <div class="ma-refund-sum"><div><small>${T('Customer')}</small><b>${esc(p.full_name || p.email)}</b></div><div><small>${T('Invoice')}</small><b class="mono">${esc(p.invoice_number || '—')}</b></div><div><small>${T('Paid')}</small><b>${money(p.amount_inr)}</b></div><div><small>${T('Can still be refunded')}</small><b>${money(left)}</b></div></div>
      <label class="v22-fl">${T('Amount to refund (₹, incl. GST)')}<div class="ma-refund-amt"><input type="number" step="0.01" min="1" max="${left}" value="${left}" data-refund-amt required><button type="button" class="v22-outline-btn" data-refund-full="${left}">${T('Full')} ${money(left)}</button></div></label>
      <fieldset class="ma-refund-why"><legend>${T('Reason')}</legend>${REFUND_WHY.map((r, i) => `<label><input type="radio" name="why" value="${esc(r)}" ${i === 0 ? 'checked' : ''}><span>${T(r)}</span></label>`).join('')}</fieldset>
      <label class="v22-fl">${T('Note for the record (optional)')}<input data-refund-note maxlength="200" placeholder="${esc(T('e.g. duplicate UPI debit on 9 Nov'))}"></label>
      <p class="ma-refund-gst" data-refund-gst></p>
      <div class="ma-chg-acts"><button type="submit" class="v22-grad-btn">${ic('refund')} ${T('Refund and issue credit note')}</button><button type="button" class="v22-outline-btn" data-modal-close>${T('Cancel')}</button></div></form>`);
    gst();
  }
  function gst() {
    const a = Number(document.querySelector('[data-refund-amt]')?.value || 0), el = document.querySelector('[data-refund-gst]'); if (!el) return;
    const taxable = Math.round(a / 1.18 * 100) / 100;
    el.innerHTML = a > 0 ? `${ic('info')} ${T('A GST credit note will be issued against the invoice')}: ${T('taxable')} ${money(taxable)} + GST ${money(Math.round((a - taxable) * 100) / 100)} = ${money(a)}. ${T('The money goes back to the original payment method in 5–7 working days.')}` : '';
  }
  async function submitRefund(form) {
    const p = st.pays.find((x) => String(x.id) === form.dataset.refundForm), left = Number(p.amount_inr) - Number(p.refunded_inr || 0);
    const amt = Math.round(Number(form.querySelector('[data-refund-amt]').value) * 100) / 100, why = form.querySelector('input[name=why]:checked').value, note = form.querySelector('[data-refund-note]').value.trim();
    if (!(amt > 0) || amt > left + 0.001) { notify(`${T('Enter an amount between ₹1 and')} ${money(left)}.`); return; }
    const btn = form.querySelector('[type=submit]'); btn.disabled = true;
    try {
      let cn;
      if (live()) { const r = await MA_LIVE.API.post(`/admin/payments/${p.id}/refund`, { amountInr: amt, reason: note ? `${why} — ${note}` : why }); cn = r.creditNote; st.pays = null; }
      else { const n = 1 + st.pays.reduce((a, x) => a + (x.credit_notes || []).length, 0) + 3; cn = { number: `CN/26-27/${String(n).padStart(5, '0')}` }; p.refunded_inr = Number(p.refunded_inr || 0) + amt; if (p.refunded_inr >= Number(p.amount_inr)) p.status = 'refunded'; p.credit_notes = [...(p.credit_notes || []), { number: cn.number, amount: amt, reason: why, issued_at: new Date().toISOString() }]; saveDemo(); st.month = monthOf(st.pays); }
      if (typeof modalRoot !== 'undefined') modalRoot.innerHTML = '';
      notify(`${T('Refund of')} ${money(amt)} ${T('issued. Credit note')} ${cn.number}.`);
      paint(); if (!st.pays) load();
    } catch (e) { btn.disabled = false; notify((e.details && e.details[0] && e.details[0].message) || (e.status === 403 ? T('Only a super admin can issue refunds.') : e.message)); }
  }

  document.addEventListener('click', (e) => {
    const t = e.target; if (!t.closest) return;
    const full = t.closest('[data-refund-full]'); if (full) { const i = document.querySelector('[data-refund-amt]'); i.value = full.dataset.refundFull; gst(); return; }
    if (!t.closest('.ma-bill')) return;
    const tab = t.closest('[data-bill-tab]'); if (tab) { st.tab = tab.dataset.billTab; paint(); return; }
    const d = t.closest('[data-bill-days]'); if (d) { st.days = +d.dataset.billDays; st.can = null; paint(); return; }
    const r = t.closest('[data-bill-refund]'); if (r) refundForm(r.dataset.billRefund);
  });
  document.addEventListener('input', (e) => {
    if (e.target.matches && e.target.matches('[data-refund-amt]')) gst();
    if (e.target.matches && e.target.matches('[data-bill-q]')) { st.q = e.target.value; paint(); const q = document.querySelector('[data-bill-q]'); q.focus(); q.setSelectionRange(q.value.length, q.value.length); }
  });
  document.addEventListener('submit', (e) => { const f = e.target.closest && e.target.closest('[data-refund-form]'); if (f) { e.preventDefault(); submitRefund(f); } });
  addEventListener('ma:logout', () => { st = { tab: 'payments', pays: null, month: null, can: null, days: 90, q: '' }; });

  if (typeof V22_ADMIN_NAV !== 'undefined' && !V22_ADMIN_NAV.some((x) => x[0] === 'billing')) { const i = V22_ADMIN_NAV.findIndex((x) => x[0] === 'subscriptions'); V22_ADMIN_NAV.splice(i + 1, 0, ['billing', 'rupee', 'Billing & Refunds']); }
  const base = renderAdmin;
  renderAdmin = function (p) { if (p === 'billing') { if (live()) { st.pays = null; st.can = null; } shell('admin', 'billing', page()); return; } return base(p); };
})();
