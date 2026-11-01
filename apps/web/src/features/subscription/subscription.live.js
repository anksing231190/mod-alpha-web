/* ==========================================================================
   Live mode — checkout
   Plan buttons start POST /billing/checkout (KYC first if needed). On stage a test
   payment dialog confirms; with Razorpay the real checkout opens. Also cancel and invoices.
   ========================================================================== */
(function () {
  if (!window.MA_LIVE) return; // demo mode (no API): nothing to do
  const { API, S, busy, fail, fmt, on } = MA_LIVE;
  // ------------------------------------------------------------------ checkout
  async function startCheckout(planName, btn) {
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
        rz.open(); return;
      }
      showModal('Test payment (stage)', `<div class="v22"><p class="v22-sub">Payments are mocked on this environment. Choose an outcome — it is sent through the same signed webhook the real gateway (Razorpay) will use.</p><div class="v22-kv" style="margin-top:12px"><div><span>Plan</span><b>${esc(plan.name)} · ${cycle}</b></div><div><span>Amount</span><b>${inr(co.amountInr)}</b></div><div><span>Order</span><b class="mono">${esc(co.order.orderId)}</b></div></div><div class="v22-modal-actions"><button class="v22-outline-btn" data-ma-pay="failure">Simulate failure</button><button class="v22-grad-btn" data-ma-pay="success">Pay ${inr(co.amountInr)} (test)</button></div></div>`);
      document.querySelectorAll('[data-ma-pay]').forEach((b) => (b.onclick = async () => { const d2 = busy(b); try { await API.post('/billing/mock/complete', { orderId: co.order.orderId, outcome: b.dataset.maPay }); modalRoot.innerHTML = ''; if (b.dataset.maPay === 'success') await paid(); else notify('Payment failed (test). Nothing was charged.'); } catch (e) { d2(); fail(e); } }));
    } catch (e) {
      done();
      // first paid plan: PAN-first KYC (features/subscription/kyc.js), then continue to payment
      if (e.code === 'kyc_required') {
        if (window.MA_KYC) MA_KYC.open({ onVerified: () => startCheckout(planName, btn) });
      } else fail(e);
    }
  }
  // After payment: reload the plan and go to the dashboard.
  async function paid() { S.ent = await API.get('/me/entitlements'); notify(`${S.ent.plan} plan activated. Thank you!`); go('user/subscription'); renderUser('subscription'); }
  // Load an external script once (Razorpay checkout).
  const loadScript = (src) => new Promise((res, rej) => { if (document.querySelector(`script[src="${src}"]`)) return res(); const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('Could not load payment checkout')); document.head.appendChild(s); });
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
  on('[data-ma-invoices], [data-action="billing-details"]', async () => {
    try { const r = await API.get('/billing/invoices'); showModal('Billing history', r.items.length ? `<div class="v22"><table class="v22-table"><thead><tr><th>Invoice</th><th>Plan</th><th>Amount</th><th>Date</th><th></th></tr></thead><tbody>${r.items.map((i) => `<tr><td class="mono">${esc(i.number)}</td><td>${esc(i.plan_id || '')} ${esc(i.billing_cycle || '')}</td><td>${inr(i.amount_inr)}</td><td>${fmt(i.issued_at)}</td><td><button class="v22-row-btn" data-ma-inv="${i.id}">View</button></td></tr>`).join('')}</tbody></table></div>` : '<p class="v22-sub">No invoices yet.</p>'); } catch (e) { fail(e); }
  });
  on('[data-ma-inv]', async (b) => { try { const { invoice: i } = await API.get(`/billing/invoices/${b.dataset.maInv}`); const w = window.open('', '_blank'); w.document.write(`<title>${i.number}</title><body style="font-family:Inter,sans-serif;padding:40px;max-width:640px"><h2>${i.seller}</h2><p>Tax invoice <b>${i.number}</b><br>Date: ${fmt(i.issued_at)}</p><p>Billed to: ${esc(i.full_name)}<br>${esc(i.email || '')}</p><table style="width:100%;border-collapse:collapse" border="1" cellpadding="8"><tr><td>Mod Alpha ${esc(i.plan_id)} plan (${esc(i.billing_cycle)})</td><td align="right">₹${i.taxable}</td></tr><tr><td>GST 18%</td><td align="right">₹${i.gst_inr}</td></tr><tr><td><b>Total</b></td><td align="right"><b>₹${i.amount_inr}</b></td></tr></table><p style="color:#666;font-size:12px">${i.note}</p><button onclick="print()">Print</button></body>`); } catch (e) { fail(e); } });
})();
