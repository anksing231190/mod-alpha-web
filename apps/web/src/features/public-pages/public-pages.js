/* ==========================================================================
   Feature: public pages (#/pricing, #/faq) and the public footer
   ========================================================================== */

/** Public footer: brand, links, disclaimer, social links. */
function publicFooterBase(){
 return `<footer class="public-footer">
   <div class="public-footer-inner">
     <div class="footer-main-grid">
       <div class="footer-brand-col">
         <div class="footer-brand-name">Mod Alpha</div>
         <p>AI-powered SIP timing for smarter mutual fund investing. We analyze fund data, you stay in control.</p>
         <div class="footer-socials" aria-label="Social media">
           <span aria-label="WhatsApp" title="WhatsApp">◉</span>
           <span aria-label="X" title="X">𝕏</span>
           <span aria-label="Instagram" title="Instagram">◎</span>
           <span aria-label="YouTube" title="YouTube">▶</span>
           <span aria-label="LinkedIn" title="LinkedIn">in</span>
         </div>
       </div>
       <nav class="footer-link-col" aria-label="Platform">
         <h3>PLATFORM</h3>
         <a href="#/landing" data-public-scroll="features">Explore</a>
         <a href="#/login">AI Insights</a>
         <a href="#/pricing">Subscription</a>
       </nav>
       <nav class="footer-link-col" aria-label="Help">
         <h3>HELP</h3>
         <a href="#/faq">Support &amp; FAQs</a>
         <a href="#/faq">Email Us</a>
       </nav>
     </div>
     <div class="footer-bottom">
       <span>© 2026 Mod Alpha Ventures LLP</span>
       <span class="footer-disclaimer">Historical insights are illustrative and not a guarantee of future returns.</span>
       <span class="footer-legal-links"><a href="#/faq">Privacy</a><i>·</i><a href="#/faq">Terms</a></span>
     </div>
   </div>
 </footer>`;
}

/** Pricing / FAQ page. */
function renderPublicBase(type){if(type==='pricing'){app.innerHTML=`${topbar(true)}<main class="public-page simple-public">${pricingSection(true)}<div class="disclosure">All displayed amounts are illustrative prototype prices. Final taxes, billing terms, cancellation and refunds will be confirmed before launch.</div></main>${publicFooter()}`}else{let q=[['What is Mod Alpha?','An AI-powered mutual fund analytics and SIP date intelligence platform.'],['Does Mod Alpha execute SIPs?','No. You invest through your own mutual fund provider.'],['Is the SIP date guaranteed to improve returns?','No. Historical analysis is not a guarantee or forecast.'],['Is the algorithm public?','No. The website explains the high-level workflow; proprietary model logic remains internal.'],['When is KYC required?','At the first subscription, through an approved secure verification process.'],['How is NAV data updated?','Initially, administrators upload Excel/CSV files which go through validation and publishing.']];app.innerHTML=`${topbar(true)}<main class="public-page simple-public">${pageHead('Help & FAQ','Understand how Mod Alpha works and what it does—and does not—do.','')}<section class="glass-panel faq-panel">${q.map(x=>`<details><summary>${x[0]}<span>＋</span></summary><p>${x[1]}</p></details>`).join('')}</section><div class="public-disclosure"><a href="#/signup">Create your account →</a></div></main>${publicFooter()}`}}

/** Public FAQ (category, question, answer). */
const V22_FAQ=[
 ['product','shield','Does Mod Alpha place SIP orders or hold my money?','No. Mod Alpha provides analytics, a monthly SIP date insight and reminders. You invest through your own broker or mutual fund platform — we never execute transactions or hold customer money.'],
 ['product','calendar','How is the monthly SIP date chosen?','Our engine analyses historical NAV data, volatility windows, market holidays and multiple statistical factors to identify the historically strongest date each month. The detailed model remains proprietary.'],
 ['product','chart','Is the recommended date guaranteed to give higher returns?','No. Recommendations are based on historical analysis, which does not predict or guarantee future performance. Each insight comes with a confidence level so you can decide for yourself.'],
 ['pricing','idcard','When do I need to complete KYC?','KYC is required once, before your first paid subscription is activated, through an approved secure verification flow. The Free plan does not require KYC.'],
 ['pricing','rocket','Can I upgrade, downgrade or cancel my plan?','Plan changes will be available from the Subscription page. Final billing, cancellation and refund terms will be confirmed before launch.'],
 ['data','db','Where does the fund data come from?','NAV data is uploaded by administrators and validated before it is published. A licensed live data source is planned; all figures on this test website are illustrative.']
];

/** Selected FAQ category. */
let v22FaqCat='all';

/** FAQ section with category chips and accordions. */
function v22Faq(full=false){
 const cats=[['all','All'],['product','Product'],['pricing','Pricing & KYC'],['data','Data']];
 return `<section class="v22 v22-faq" id="faq-preview" data-v22-reveal><div class="v22-faq-grid"><div class="v22-faq-side"><span class="v22-eyebrow">NEED TO KNOW MORE?</span><h2>Frequently asked questions</h2><p>Everything you need to know about how Mod Alpha works, pricing and your data.</p>
 <div class="v22-faq-help">${cic('help',36)}<div><b>Still have questions?</b><small>Our assistant explains funds, returns and SIP concepts in plain language.</small><div class="v22-faq-actions"><a class="v22-grad-btn" href="#/user/chat">Ask Mod Alpha ${ic('arrowR')}</a><a class="v22-plan-btn sm" href="#/faq">${full?'Contact support':'View all FAQs'}</a></div></div></div></div>
 <div class="v22-faq-main"><div class="v22-faq-cats" role="tablist">${cats.map(c=>`<button type="button" data-v22-faqcat="${c[0]}" class="${v22FaqCat===c[0]?'active':''}">${c[1]}</button>`).join('')}</div>
 <div class="v22-acc">${V22_FAQ.map((q,i)=>`<div class="v22-acc-item ${i===0?'open':''}" data-cat="${q[0]}" ${v22FaqCat!=='all'&&v22FaqCat!==q[0]?'hidden':''}><button type="button" class="v22-acc-q" aria-expanded="${i===0}" data-v22-acc>${cic(q[1],26)}<span>${q[2]}</span><i class="v22-acc-plus"></i></button><div class="v22-acc-a"><div><p>${q[3]}</p></div></div></div>`).join('')}</div></div></div></section>`;
}

/** Social network icons. */
const V22_SOCIAL=[
 ['WhatsApp','<rect width="32" height="32" rx="9" fill="#25D366"/><path d="M16 6.5a9.4 9.4 0 0 0-8.1 14.2L6.6 25.5l4.9-1.3A9.4 9.4 0 1 0 16 6.5z" fill="#fff"/><path d="M12.6 11.3c.3-.6.6-.6.9-.6h.7c.2 0 .5 0 .7.5l1 2.3c.1.2.1.4 0 .6l-.5.7c-.2.2-.2.4 0 .7.7 1.2 1.7 2.1 2.9 2.7.3.1.5.1.7-.1l.8-.9c.2-.2.4-.3.7-.2l2.2 1c.3.2.4.3.4.5 0 .5-.2 1.4-1 1.9-.7.5-1.8.7-3.4.1a11.6 11.6 0 0 1-5.6-5c-.9-1.6-.7-3 0-4.2z" fill="#25D366"/>'],
 ['X','<rect width="32" height="32" rx="9" fill="#000"/><rect x=".5" y=".5" width="31" height="31" rx="8.5" stroke="#3f3f46" fill="none"/><path d="M8.5 8h4.6l3.6 5 4.3-5h2.2l-5.5 6.4L24 24h-4.6l-3.9-5.4-4.7 5.4H8.6l6-6.9z" fill="#fff"/>'],
 ['Instagram','<defs><radialGradient id="igG" cx="30%" cy="107%" r="150%"><stop offset="0" stop-color="#fdf497"/><stop offset=".1" stop-color="#fdf497"/><stop offset=".5" stop-color="#fd5949"/><stop offset=".68" stop-color="#d6249f"/><stop offset="1" stop-color="#285AEB"/></radialGradient></defs><rect width="32" height="32" rx="9" fill="url(#igG)"/><rect x="8" y="8" width="16" height="16" rx="5" stroke="#fff" stroke-width="2" fill="none"/><circle cx="16" cy="16" r="3.8" stroke="#fff" stroke-width="2" fill="none"/><circle cx="20.8" cy="11.2" r="1.2" fill="#fff"/>'],
 ['YouTube','<rect width="32" height="32" rx="9" fill="#FF0000"/><path d="M13 11.2v9.6l8.2-4.8z" fill="#fff"/>'],
 ['LinkedIn','<rect width="32" height="32" rx="9" fill="#0A66C2"/><rect x="8" y="13" width="3.4" height="11" fill="#fff"/><circle cx="9.7" cy="9.7" r="2" fill="#fff"/><path d="M14.3 13h3.2v1.6c.5-.9 1.7-1.9 3.5-1.9 3.3 0 3.9 2.1 3.9 4.9V24h-3.4v-5.6c0-1.3 0-3-1.8-3s-2.1 1.4-2.1 2.9V24h-3.3z" fill="#fff"/>']
];

/** publicFooterBase() with the social icons. */
function publicFooterWithSocial(){return publicFooterBase().replace(/<div class="footer-socials"[\s\S]*?<\/div>/,`<div class="footer-socials v22-socials" aria-label="Social media">${V22_SOCIAL.map(s=>`<a href="#" data-v22-socialnet="${s[0]}" aria-label="${s[0]}" title="${s[0]}"><svg viewBox="0 0 32 32" width="40" height="40" aria-hidden="true">${s[1]}</svg></a>`).join('')}</div>`)}

/** renderPublicBase() using the new FAQ section. */
function renderPublicWithFaq(type){if(type==='faq'){app.innerHTML=`${topbar(true)}<main class="public-page v22-public-faq">${v22Faq(true)}</main>${publicFooter()}`;v22InitReveal();return}renderPublicBase(type);v22InitReveal()}

/** renderPublicWithFaq() without the old duplicate disclaimers. */
function renderPublic(type){renderPublicWithFaq(type);document.querySelectorAll('.simple-public>.disclosure,.public-page .pricing-disclaimer').forEach(x=>x.remove())}

/** publicFooterWithSocial() with the brand mark column. */
/* Footer: Mod Alpha mark to the left of the brand block (name + text + socials) */
function publicFooter(){return publicFooterWithSocial().replace(/<div class="footer-brand-col">([\s\S]*?<div class="footer-socials[\s\S]*?<\/div>)\s*<\/div>/,(m,inner)=>`<div class="footer-brand-col v22-foot-brand"><img class="v22-foot-mark" src="assets/brand/mod-alpha-mark.png" alt="Mod Alpha"><div class="v22-foot-copy">${inner}</div></div>`)}
