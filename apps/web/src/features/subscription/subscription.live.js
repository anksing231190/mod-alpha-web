/* ==========================================================================
   Live mode — checkout
   Plan buttons start POST /billing/checkout (KYC first if needed). On stage a test
   payment dialog confirms; with Razorpay the real checkout opens. Also cancel and invoices.
   ========================================================================== */
(function () {
  if (!window.MA_LIVE) return; // demo mode (no API): nothing to do
  const { API, S, busy, fail, fmt, on } = MA_LIVE;
  // ------------------------------------------------------------------ checkout
  async function startCheckout(planName, btn, method) {
    const plan = S.plans?.find((p) => p.name === planName); if (!plan) return;
    if (plan.id === 'Free') { notify('You are on the Free plan.'); return; }
    const cycle = pricingBilling === 'yearly' ? 'Yearly' : 'Monthly';
    const done = busy(btn, 'Starting checkout…');
    try {
      const co = await API.post('/billing/checkout', { planId: plan.id, cycle });
      done();
      if (co.order.provider === 'razorpay') {
        await loadScript('https://checkout.razorpay.com/v1/checkout.js');
        const rz = new window.Razorpay({ key: co.order.keyId, order_id: co.order.orderId, amount: co.order.amountPaise, currency: 'INR', name: 'Mod Alpha', description: co.order.description, prefill: co.order.prefill, theme: { color: '#5b5cf6' },
          handler: async (r) => { try { await API.post('/billing/verify', { orderId: r.razorpay_order_id, paymentId: r.razorpay_payment_id, signature: r.razorpay_signature }); await paid(); } catch (e) { fail(e); } } });
        // a failed attempt in Razorpay's window → our "Payment failed" screen with Try again (features/subscription/checkout.js)
        rz.on('payment.failed', (f) => { try { rz.close(); } catch (e) {} if (window.MA_PAY) MA_PAY.open({ planName: plan.name, cycle, amount: co.amountInr, retry: () => startCheckout(planName, btn) }).failed(f && f.error && f.error.description); });
        rz.open(); return;
      }
      // stage: payments are mocked — our checkout screens; the chosen outcome goes through the same signed webhook
      // the real gateway uses ("pending" sends nothing until Check status)
      if (window.MA_PAY) {
        const complete = (outcome) => API.post('/billing/mock/complete', { orderId: co.order.orderId, outcome });
        MA_PAY.open({ planName: plan.name, cycle, amount: co.amountInr, orderId: co.order.orderId, test: true, method,
          pay: async (m, outcome) => { await new Promise((r) => setTimeout(r, 1200)); if (outcome === 'pending') return 'pending'; await complete(outcome); return outcome; },
          check: async () => { await complete('success'); return 'success'; },
          onSuccess: () => paid(true), retry: (m) => startCheckout(planName, btn, m) });
        return;
      }
    } catch (e) {
      done();
      // first paid plan: PAN-first KYC (features/subscription/kyc.js), then continue to payment
      if (e.code === 'kyc_required') {
        if (window.MA_KYC) MA_KYC.open({ onVerified: () => startCheckout(planName, btn) });
      } else fail(e);
    }
  }
  // After payment: reload the plan and go to the dashboard.
  async function paid(quiet) { S.ent = await API.get('/me/entitlements'); await MA_LIVE.refreshSip(); if (quiet) return; notify(`${S.ent.plan} plan activated. Thank you!`); go('user/subscription'); renderUser('subscription'); }
  // Load an external script once (Razorpay checkout).
  const loadScript = (src) => new Promise((res, rej) => { if (document.querySelector(`script[src="${src}"]`)) return res(); const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('Could not load payment checkout')); document.head.appendChild(s); });
  window.MA_CHECKOUT = (plan, method) => startCheckout(plan, null, method);
  on('[data-plan]', (b) => startCheckout(b.dataset.plan, b));
  // public pricing CTAs: signed-in users go straight to checkout
  on('.v22-plan a[href="#/signup"], .v22-plan .v22-grad-btn', (b) => { const name = b.closest('.v22-plan')?.querySelector('h3')?.textContent; if (!S.user) { sessionStorage.setItem('ma-next', 'user/subscription'); go('signup'); return; } go('user/subscription'); setTimeout(() => startCheckout(name, null), 300); });
  // subscription page: show current plan, invoices, cancel
  const baseSubPage = subscriptionPage;
  subscriptionPage = function () {
    const e = S.ent, sub = e?.subscription;
    const cur = `<section class="v22 v22-card ma-cur-plan"><div class="v22-card-head"><div><h2>Your plan: ${esc(e?.plan || 'Free')}</h2><p>${sub ? `${sub.cycle} · ${sub.status}${sub.cancelAtPeriodEnd ? ` · ends ${fmt(sub.renewalDate)}` : ` · renews ${fmt(sub.renewalDate)}`}` : 'Upgrade any time. KYC is required before the first paid plan.'}</p></div><div class="v22-phead-actions">${sub && !sub.cancelAtPeriodEnd ? `<button class="v22-danger-btn" data-ma-cancel="${sub.id}">Cancel plan</button>` : ''}<button class="v22-outline-btn" data-ma-invoices>${ic('file')} Billing history</button></div></div></section>`;
    return cur + baseSubPage().replace(/<div class="subscription-footnote">[\s\S]*?<\/div>/, '<div class="subscription-footnote">Prices include GST. First-time subscribers complete KYC before activation.</div>');
  };
  on('[data-ma-cancel]', async (b) => { if (!confirm('Cancel your plan? It stays active until the end of the current billing period.')) return; try { const r = await API.post(`/billing/subscriptions/${b.dataset.maCancel}/cancel`); S.ent = await API.get('/me/entitlements'); notify(r.message); renderUser('subscription'); } catch (e) { fail(e); } });
  // Billing history: every GST tax invoice, each one downloadable as a PDF (GET /billing/invoices/:id/pdf).
  on('[data-ma-invoices], [data-action="billing-details"]', async () => {
    try {
      const r = await API.get('/billing/invoices');
      const b = S.user && S.user.billing, noState = !(b && b.stateCode);
      showModal('Billing history', `<div class="v22 ma-inv-hist">${r.items.length ? `<table class="v22-table"><thead><tr><th>Invoice no.</th><th>Plan</th><th>Date</th><th style="text-align:right">Amount (incl. GST)</th><th></th></tr></thead><tbody>${r.items.map((i) => `<tr><td class="mono">${esc(i.number)}</td><td>${esc(i.plan_id || '')} · ${esc(i.billing_cycle || '')}</td><td>${fmt(i.issued_at)}</td><td style="text-align:right">${inr(i.amount_inr)}</td><td><div class="ma-inv-acts"><button class="v22-row-btn" data-ma-inv="${i.id}">${ic('eye')} View</button><button class="v22-row-btn" data-ma-inv-dl="${i.id}" data-no="${esc(i.number)}">${ic('download')} PDF</button></div></td></tr>`).join('')}</tbody></table>` : (window.MA_EMPTY?MA_EMPTY.html({title:'No invoices yet',text:'A GST tax invoice is created after every payment.',mood:'sleep'}):'<p class="v22-sub">No invoices yet. A GST tax invoice is created after every payment.</p>')}
        ${noState ? `<p class="v22-hint" style="margin-top:12px">${ic('info')} Add your state (and GSTIN, for a business) under <a href="#/user/settings" data-ma-goto-billing>Settings → Profile → Billing details</a> so your next invoice shows the right place of supply.</p>` : ''}</div>`);
    } catch (e) { fail(e); }
  });
  // Open the invoice PDF in a new tab (blob URL, so the session cookie stays with the API).
  on('[data-ma-inv]', async (b) => {
    const w = window.open('', '_blank');
    try { const r = await API.get(`/billing/invoices/${b.dataset.maInv}/pdf`, null, { raw: true }); const url = URL.createObjectURL(await r.blob()); if (w) w.location.href = url; else location.href = url; }
    catch (e) { if (w) w.close(); fail(e); }
  });
  on('[data-ma-inv-dl]', async (b) => { try { await API.download(`/billing/invoices/${b.dataset.maInvDl}/pdf`, null, `Mod-Alpha-invoice-${b.dataset.no.replace(/\//g, '-')}.pdf`); } catch (e) { fail(e); } });
  on('[data-ma-goto-billing]', () => { modalRoot.innerHTML = ''; settingsTab = 'profile'; });
})();
