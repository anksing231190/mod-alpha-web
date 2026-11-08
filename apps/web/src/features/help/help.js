/* ==========================================================================
   Feature: help & FAQ (#/user/help)
   Searchable FAQ by category and the support request form.
   ========================================================================== */

/** Help articles (category, question, answer). */
const V22_HELP=[['start','What is Mod Alpha?','Mod Alpha is a mutual fund analytics and SIP date intelligence platform. It provides historical analysis, calculators and monthly SIP date reminders.'],['start','Does Mod Alpha invest on my behalf?','No. Mod Alpha does not hold customer money, place SIP orders or connect to broker/demat accounts. You make investment decisions and transact through your own provider.'],['sip','Are historical results guaranteed?','No. Historical and simulated results are not forecasts or guarantees of future performance.'],['sip','How is the SIP date selected?','The platform publishes one common reminder date each month. It is chosen using historical NAV behaviour, volatility windows and multi-factor scoring; the detailed model is proprietary.'],['data','What data does Mod Alpha use?','Mod Alpha uses daily NAV data for Indian mutual fund schemes, validated before it is published.'],['billing','When is KYC required?','KYC/identity verification is required once, when you subscribe to a paid plan for the first time.'],['billing','Can I cancel a subscription?','Cancellation, renewal and refund terms will be shown before checkout. Billing is not connected in this demo.']];

/** Help category and search text. */
let v22HelpCat='all',v22HelpQ='';

/** Filtered help list. */
function v22HelpList(){const q=v22HelpQ.toLowerCase();const list=V22_HELP.filter(x=>(v22HelpCat==='all'||x[0]===v22HelpCat)&&(!q||(x[1]+' '+x[2]).toLowerCase().includes(q)));return list.length?list.map((x,i)=>`<div class="v22-acc-item ${i===0?'open':''}"><button type="button" class="v22-acc-q" data-v22-acc aria-expanded="${i===0}">${cic({start:'help',sip:'calendar',data:'db',billing:'idcard'}[x[0]],24)}<span>${x[1]}</span><i class="v22-acc-plus"></i></button><div class="v22-acc-a"><div><p>${x[2]}</p></div></div></div>`).join(''):(window.MA_EMPTY?MA_EMPTY.html({title:'No answers found',text:'Try another word, or ask Alpha or our support team below.',mood:'think'}):`<div class="v22-empty">No answers match “${esc(v22HelpQ)}”. Try another word, or send us a request.</div>`)}

/** Help & FAQ screen with the support form. */
function helpPage(){
 return `<div class="v22 v22-help">${v22Head('Help &amp; FAQ','Answers about the platform, data, reminders and subscriptions.','','HELP CENTRE')}${userBanner()}
 <section class="v22-help-hero"><h2>How can we help you today?</h2><label class="v22-help-search">${ic('search')}<input id="v22-help-q" placeholder="Search questions — e.g. KYC, SIP date, cancel" value="${esc(v22HelpQ)}" autocomplete="off"></label>
 <div class="v22-help-topics">${[['all','grid','All topics','7 articles'],['start','help','Getting started','What Mod Alpha does'],['sip','calendar','SIP dates','How dates are chosen'],['billing','idcard','Plans &amp; KYC','Billing and verification'],['data','db','Data &amp; privacy','Sources and your data']].map(t=>`<button type="button" class="${v22HelpCat===t[0]?'active':''}" data-v22-helpcat="${t[0]}">${t[0]==='all'?`<span class="v22-ht-ic">${ic('grid')}</span>`:cic(t[1],30)}<b>${t[2]}</b><small>${t[3]}</small></button>`).join('')}</div></section>
 <div class="v22-help-grid"><section class="v22-card"><div class="v22-card-head"><h2>Frequently asked questions</h2><span class="v22-muted" id="v22-help-count"></span></div><div class="v22-acc" id="v22-help-list">${v22HelpList()}</div></section>
 <aside class="v22-help-side"><section class="v22-card v22-contact"><div class="v22-contact-top">${cic('mail',36)}<div><h3>Still need help?</h3><p>Send us a message and our team will reply by email.</p></div></div>
  <label class="v22-fl">Your email<input id="support-email" type="email" value="${esc(currentUser.email)}"></label>
  <div class="v22-fl">Topic<div class="v22-seg-pills wrap" id="v22-topic">${['Product question','Fund data','Subscription','Account &amp; privacy'].map((x,i)=>`<button type="button" class="${i===0?'active':''}" data-v22-segpick>${x}</button>`).join('')}</div></div>
  <label class="v22-fl">Message<textarea id="support-message" rows="4" maxlength="500" placeholder="Tell us what you need help with…"></textarea><small class="v22-count"><span id="v22-msg-count">0</span>/500</small></label>
  <button type="button" class="v22-grad-btn wide" data-v22-support>Submit request ${ic('arrowR')}</button><div id="v22-support-ok" class="v22-ok" hidden>${cic('check',22)} Request received — reference <b>MA-${Math.floor(1000+Math.random()*9000)}</b></div></section>
  <section class="v22-quick"><button type="button" data-v22-chat-toggle>${cic('chat',30)}<span><b>Chat with Mod Alpha</b><small>Instant answers, 24×7</small></span>${ic('chevR')}</button><a href="#/user/subscription">${cic('crown',30)}<span><b>Plans &amp; billing</b><small>Compare Free, Pro and Premium</small></span>${ic('chevR')}</a></section></aside></div></div>`;
}

/* ---------- start-up steps (run once by core/boot.js, in this global order) ---------- */

MA_STARTUP(222, "input listener", () => {
document.addEventListener('input',e=>{const t=e.target;
 if(t.id==='v22-help-q'){v22HelpQ=t.value;document.getElementById('v22-help-list').innerHTML=v22HelpList()}
 if(t.id==='support-message'){const c=document.getElementById('v22-msg-count');if(c)c.textContent=t.value.length}
 if(t.id==='v22-sub-search')v22FilterSubs();
 if(t.id==='v22-audit-search')v22FilterAudit();
});
});
