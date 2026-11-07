/* ==========================================================================
   Feature: pricing
   The pricing cards (monthly / quarterly / yearly), prices saved by the admin
   (demo: localStorage) and the billing-period switch.
   ========================================================================== */

/** Selected billing period on the pricing cards. */
let v22Billing='monthly';

/** Plan icons and highlights. */
const V22_PLAN_META={Free:{ic:'sprout',no:['Advanced analytics','More AI questions'],cta:'Get Started'},Pro:{ic:'rocket',no:[],cta:'Start Pro Plan'},Premium:{ic:'crown',no:[],cta:'Start Premium Plan'}};

/** Pricing cards for Free / Pro / Premium. */
function pricingSection(){
 return `<section class="v22 v22-pricing" id="pricing" data-v22-reveal><div class="v22-sec-head"><span class="v22-eyebrow">SIMPLE, TRANSPARENT PRICING</span><h2>Choose Your Plan</h2><p>Simple and transparent pricing for mutual fund intelligence and monthly SIP insights.</p>
 <div class="v22-billing" data-state="${v22Billing}" role="group" aria-label="Billing period"><i class="v22-billing-thumb"></i><button type="button" data-v22-billing="monthly" aria-pressed="${v22Billing==='monthly'}">Monthly</button><button type="button" data-v22-billing="yearly" aria-pressed="${v22Billing==='yearly'}">Yearly <em>Save 20%</em></button></div></div>
 <div class="v22-plans">${D.plans.filter(p=>p.active!==false).map((p,i)=>{const m=V22_PLAN_META[p.name]||{ic:'sprout',no:[],cta:'Choose'},pr=v22PlanPrice(p,v22Billing),pop=p.name==='Pro';return `<article class="v22-plan ${pop?'popular':''}" style="--i:${i}">${pop?'<span class="v22-pop">MOST POPULAR</span>':''}<div class="v22-plan-head"><div><h3>${p.name}</h3><p>${esc(p.tagline)}</p></div><span class="v22-plan-ic">${cic(m.ic,30)}</span></div><div class="v22-price"><b data-v22-price="${p.price}">${inr(pr.per)}</b><span>/month</span></div><small class="v22-price-note" data-v22-note="${p.price}">${pr.note}</small><ul>${p.features.map(f=>`<li>${cic('check',20)}<span>${esc(f)}</span></li>`).join('')}${m.no.map(f=>`<li class="no">${cic('cross',20)}<span>${f}</span></li>`).join('')}</ul><a class="${pop?'v22-grad-btn':'v22-plan-btn'}" href="#/signup">${m.cta} ${ic('arrowR')}</a></article>`}).join('')}</div>
 <div class="v22-trust">${[['shield','You stay in control','Mod Alpha never places orders or holds your money'],['idcard','One-time KYC','Required before your first paid subscription'],['lock','Secure by design','Payments and data protection confirmed before launch']].map(x=>`<div>${cic(x[0],30)}<span><b>${x[1]}</b><small>${x[2]}</small></span></div>`).join('')}</div>
</section>`;
}

/** Animate the price when the billing period changes. */
function v22AnimatePrice(el,to){const from=v22Num(el.textContent),t0=performance.now(),dur=450;const step=t=>{const k=Math.min(1,(t-t0)/dur),e=1-Math.pow(1-k,3);el.textContent=inr(from+(to-from)*e);if(k<1)requestAnimationFrame(step)};requestAnimationFrame(step)}

/** localStorage key for admin-edited prices (demo). */
const V22_PRICE_KEY='mod-alpha-pricing';

/** Apply admin-edited prices (demo). */
function v22PricingLoad(){try{const c=JSON.parse(localStorage.getItem(V22_PRICE_KEY)||'null');if(c&&Array.isArray(c.plans))c.plans.forEach(p=>{const t=D.plans.find(x=>x.name===p.name);if(t)Object.assign(t,p)})}catch(e){}D.plans.forEach(p=>{if(!p.prices)p.prices={Monthly:p.price,Quarterly:p.price*3,Yearly:Math.round(p.price*.8)*12};if(p.active===undefined)p.active=true})}

/** Price of a plan for a billing period (yearly = 20 % off unless set). */
function v22PlanPrice(p,billing){const m=p.price,y=p.prices?.Yearly??Math.round(m*.8)*12,ym=Math.round(y/12);return billing==='yearly'?{per:ym,note:m?`Billed ${inr(y)} per year`:'Free forever'}:{per:m,note:m?'Billed monthly':'Free forever'}}

/* ---------- start-up steps (run once by core/boot.js, in this global order) ---------- */

MA_STARTUP(321, "v22PricingLoad();", () => {
v22PricingLoad();
});

MA_STARTUP(342, "click listener: [data-v22-billing]", () => {
// keep the checkout's billing cycle in sync with the toggle
window.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-v22-billing]');if(b)pricingBilling=b.dataset.v22Billing},true);
});
