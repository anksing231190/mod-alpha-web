/* ==========================================================================
   Feature: subscription page (#/user/subscription)
   Current plan, plan cards with Activate buttons, billing FAQ. Live checkout and KYC:
   subscription.live.js and kyc.live.js.
   ========================================================================== */

/** Billing FAQ on the subscription page. */
const V22_SUB_FAQ=[
 ['Can I change my plan later?','Yes. Upgrade or switch plans at any time from this page. A new plan starts immediately and your next renewal date moves accordingly.'],
 ['What happens when I cancel?','Your plan stays active until the end of the current billing period. After that your account moves to the Free plan; your settings and watchlist are kept.'],
 ['Why is KYC required?','Regulations require identity verification before a paid subscription. You complete it once, through our verification partner, using PAN and DigiLocker.'],
 ['Do prices include GST?','Yes. All prices shown include 18% GST. A GST invoice is available under Billing history after every payment.'],
 ['Does Mod Alpha place investments for me?','No. Mod Alpha provides analytics and SIP-date reminders. You invest through your own broker or mutual fund platform.']
];

/** Subscription screen: current plan, plan cards, billing FAQ. */
function subscriptionPage(){
 const cur=(window.MA_STATE&&MA_STATE.ent&&MA_STATE.ent.plan)||null;
 const cards=D.plans.filter(p=>p.active!==false).map((p,i)=>{const m=V22_PLAN_META[p.name]||{ic:'sprout',no:[],cta:'Choose'},pr=v22PlanPrice(p,v22Billing),pop=p.name==='Pro',isCur=cur&&cur===(p.id||p.name);
  return `<article class="v22-plan ${pop?'popular':''} ${isCur?'is-current':''}">${pop?'<span class="v22-pop">MOST POPULAR</span>':''}${isCur?'<span class="v22-pop cur">YOUR PLAN</span>':''}<div class="v22-plan-head"><div><h3>${esc(p.name)}</h3><p>${esc(p.tagline)}</p></div><span class="v22-plan-ic">${cic(m.ic,30)}</span></div><div class="v22-price"><b data-v22-price="${p.price}">${inr(pr.per)}</b><span>/month</span></div><small class="v22-price-note" data-v22-note="${p.price}">${pr.note}</small><ul>${p.features.map(f=>`<li>${cic('check',20)}<span>${esc(f)}</span></li>`).join('')}${m.no.map(f=>`<li class="no">${cic('cross',20)}<span>${f}</span></li>`).join('')}</ul>${isCur?`<button type="button" class="v22-plan-btn" disabled>Current plan</button>`:`<button type="button" class="${pop?'v22-grad-btn':'v22-plan-btn'}" data-plan="${esc(p.name)}">${p.name==='Free'?'Switch to Free':m.cta} ${ic('arrowR')}</button>`}</article>`}).join('');
 return `<div class="v22 v22-subpage">
 <section class="v22-subhead"><div><span class="v22-eyebrow">MOD ALPHA MEMBERSHIP</span><h1>Choose Your Plan</h1><p>Start free, upgrade when you need more insight.</p></div><div class="v22-billing" data-state="${v22Billing}" role="group" aria-label="Billing period"><i class="v22-billing-thumb"></i><button type="button" data-v22-billing="monthly" aria-pressed="${v22Billing==='monthly'}">Monthly</button><button type="button" data-v22-billing="yearly" aria-pressed="${v22Billing==='yearly'}">Yearly <em>Save 20%</em></button></div></section>
 <div class="v22-plans">${cards}</div>
 <p class="v22-subnote">Prices include GST. First-time subscribers complete KYC before activation.</p>
 <section class="v22-two-act v22-subinfo"><article class="v22-card v22-act">${cic('idcard',40)}<div><b>Secure identity verification</b><p>KYC is required once, when you subscribe for the first time. It is done through an approved verification partner using PAN and DigiLocker.</p><span class="v22-pill warn lg">Required before first paid activation</span></div></article>
 <article class="v22-card v22-act">${cic('refund',40)}<div><b>Manage your subscription</b><p>See your current plan, billing cycle, invoices and renewal date, or cancel at the end of the period.</p><button type="button" class="v22-outline-btn" data-action="billing-details">${ic('file')} View billing details</button></div></article></section>
 <section class="v22-card v22-subfaq"><h2 class="v22-h2">Subscription FAQs</h2><div class="v22-acc">${V22_SUB_FAQ.map((q,i)=>`<div class="v22-acc-item ${i===0?'open':''}"><button type="button" class="v22-acc-q" data-v22-acc aria-expanded="${i===0}">${cic(['rocket','refund','idcard','rupee','shield'][i],24)}<span>${q[0]}</span><i class="v22-acc-plus"></i></button><div class="v22-acc-a"><div><p>${q[1]}</p></div></div></div>`).join('')}</div></section></div>`;
}
