/* ==========================================================================
   Mod Alpha — core: page-wide event handlers
   A few click / change / input handlers cover several features at once (they were
   written as one handler per screen group). Each is a start-up step so it is
   registered in the original order. The selectors listed in each step say which
   buttons it handles.
   ========================================================================== */

/* ---------- start-up steps (run once by core/boot.js, in this global order) ---------- */

MA_STARTUP(84, "click listener: [data-billing] · [data-public-scroll],[data-scroll-inline] · [data-action=\"replay-flow\"] · [data-action=\"chat-toggle\"]", () => {
document.addEventListener('click',e=>{
 const billingButton=e.target.closest('[data-billing]');if(billingButton){pricingBilling=billingButton.dataset.billing;const yearly=pricingBilling==='yearly';document.querySelectorAll('[data-billing]').forEach(x=>x.classList.toggle('active',x.dataset.billing===pricingBilling));document.querySelectorAll('[data-month-price]').forEach(el=>{const monthly=Number(el.dataset.monthPrice),yearMonth=Number(el.dataset.yearMonthPrice||Math.round(monthly*.8)),yearTotal=Number(el.dataset.yearTotal||yearMonth*12);el.textContent=monthly===0?'₹0':money(yearly?yearMonth:monthly);const meta=el.parentElement?.querySelector('span');if(meta)meta.textContent=yearly?`/month · ${money(yearTotal)}/year`:'/month';});return}
 const scroll=e.target.closest('[data-public-scroll],[data-scroll-inline]');
 if(scroll){e.preventDefault();const id=scroll.dataset.publicScroll||'how-it-works';if(!location.hash.includes('/landing')){location.hash='#/landing';setTimeout(()=>document.getElementById(id)?.scrollIntoView({behavior:'smooth',block:'start'}),80)}else document.getElementById(id)?.scrollIntoView({behavior:'smooth',block:'start'});return}
 const replay=e.target.closest('[data-action="replay-flow"]');if(replay){document.querySelector('[data-flow-animation]')?._replayFlow?.();return}
 if(e.target.closest('[data-action="chat-toggle"]'))return;
});
});

MA_STARTUP(85, "click listener: [data-ma-category] · [data-amount] · [data-sip-amount] · [data-action=\"clear-fund-search\"] · [data-page-number] · [data-page-dir] …", () => {
document.addEventListener('click',e=>{
 const cat=e.target.closest('[data-ma-category]');if(cat){const v=cat.dataset.maCategory;filters.category=v==='All'?'All':v;filters.type=['Equity','Debt','Hybrid'].includes(v)?v:'All';filters.q='';renderUser('funds');return}
 const amount=e.target.closest('[data-amount]');if(amount){const input=document.getElementById('calc-amount');if(input)input.value=amount.dataset.amount;amount.parentElement.querySelectorAll('button').forEach(b=>b.classList.toggle('active',b===amount));return}
 const sipAmount=e.target.closest('[data-sip-amount]');if(sipAmount){const input=document.getElementById('sip-amount');if(input)input.value=sipAmount.dataset.sipAmount;sipAmount.parentElement.querySelectorAll('button').forEach(b=>b.classList.toggle('active',b===sipAmount));return}
 if(e.target.closest('[data-action="clear-fund-search"]')){filters.q='';const i=document.getElementById('fund-search');if(i)i.value='';renderUser('funds');return}
 const pg=e.target.closest('[data-page-number]');if(pg){maFundPage=Number(pg.dataset.pageNumber);renderUser('funds');return}
 const dir=e.target.closest('[data-page-dir]');if(dir&&!dir.disabled){maFundPage=Math.max(1,maFundPage+Number(dir.dataset.pageDir));renderUser('funds');return}
 if(e.target.closest('[data-action="watchlist"]')){notify('Fund added to your demo watchlist.');return}
});
});

MA_STARTUP(161, "click listener: [data-v22-chip] · [data-v22-page] · [data-v22-clear] · [data-v22-dperiod] · [data-v22-dash] · [data-v22-apill] …", () => {
document.addEventListener('click',e=>{
 const t=e.target;let b;
 if((b=t.closest('[data-v22-chip]'))){v22Chip=b.dataset.v22Chip;v22Page=1;renderUser('funds');return}
 if((b=t.closest('[data-v22-page]'))&&!b.disabled){v22Page=Number(b.dataset.v22Page);renderUser('funds');document.querySelector('.v22-explore')?.scrollIntoView({block:'start'});return}
 if(t.closest('[data-v22-clear]')){filters.q='';v22Page=1;renderUser('funds');document.getElementById('fund-search')?.focus();return}
 if((b=t.closest('[data-v22-dperiod]'))){v22DetailPeriod=b.dataset.v22Dperiod;b.parentElement.querySelectorAll('button').forEach(x=>x.classList.toggle('active',x===b));const f=D.funds.find(x=>x.id===selectedFund);document.getElementById('v22-detail-chart').innerHTML=v22DetailChart(f,v22DetailPeriod);return}
 if((b=t.closest('[data-v22-dash]'))){v22DashPeriod=b.dataset.v22Dash;b.parentElement.querySelectorAll('button').forEach(x=>x.classList.toggle('active',x===b));document.getElementById('v22-dash-chart').innerHTML=v22DashChart(v22DashPeriod);return}
 if((b=t.closest('[data-v22-apill]'))){b.parentElement.querySelectorAll('button').forEach(x=>x.classList.toggle('active',x===b));notify(`${b.dataset.v22Apill} view · illustrative sample data`);return}
 if((b=t.closest('[data-v22-month]'))){let m=v22CalMonth.m+Number(b.dataset.v22Month),y=v22CalMonth.y;if(m<0){m=11;y--}if(m>11){m=0;y++}v22CalMonth={y,m};renderUser('overview');return}
 if((b=t.closest('[data-v22-preset]'))){const k=b.dataset.v22Preset,inp=document.getElementById('calc-date');b.parentElement.querySelectorAll('button').forEach(x=>x.classList.toggle('active',x===b));if(k==='custom'){inp.focus();inp.select();return}const d=new Date(V22_ASOF);d.setFullYear(d.getFullYear()-Number(k));inp.value=v22FmtDate(d);runCalc();return}
 if((b=t.closest('[data-v22-amount]'))){document.getElementById('calc-amount').value=Number(b.dataset.v22Amount).toLocaleString('en-IN');runCalc();return}
 if((b=t.closest('[data-v22-sip]'))){document.getElementById('sip-amount').value=Number(b.dataset.v22Sip).toLocaleString('en-IN');runSip();return}
 if((b=t.closest('[data-v22-qpreset]'))){const k=b.dataset.v22Qpreset,inp=document.getElementById('quick-date');b.parentElement.querySelectorAll('button').forEach(x=>x.classList.toggle('active',x===b));if(k==='custom'){inp.focus();inp.select();return}const d=new Date(V22_ASOF);d.setFullYear(d.getFullYear()-Number(k));inp.value=v22FmtDate(d);v22QuickCalc();return}
 if((b=t.closest('[data-v22-qamount]'))){b.parentElement.querySelectorAll('button').forEach(x=>x.classList.toggle('active',x===b));document.getElementById('quick-amount').value=Number(b.dataset.v22Qamount).toLocaleString('en-IN');v22QuickCalc();return}
 if(t.closest('[data-action="v22-quick-calc"]')){v22QuickCalc(true);return}
 if((b=t.closest('[data-v22-cal]'))){const h=document.querySelector(`[data-v22-date-for="${b.dataset.v22Cal}"]`),d=v22ParseDate(document.getElementById(b.dataset.v22Cal).value);if(d)h.value=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');try{h.showPicker()}catch(_){h.focus();h.click()}return}
 if(t.closest('[data-v22-navgroup]')){v22DataOpen=!v22DataOpen;const g=t.closest('[data-v22-navgroup]');g.setAttribute('aria-expanded',v22DataOpen);g.nextElementSibling.classList.toggle('open',v22DataOpen);g.querySelector('.caret').outerHTML=ic(v22DataOpen?'chevUp':'chevDown','caret');return}
 if(t.closest('[data-action="set-reminder"]')){window.MA_REMINDER?MA_REMINDER.onSet(t.closest('[data-action="set-reminder"]')):notify('Reminder set.');return}
 if(t.closest('[data-v22-pick]')){const d=+t.closest('[data-v22-pick]').dataset.v22Pick,SP=v22SipFor(v22CalMonth.y,v22CalMonth.m);v22PickDay=SP&&d===SP.day?null:(v22PickDay===d?null:d);route();return}
 if(t.closest('[data-v22-pick-reset]')){v22PickDay=null;route();return}
 
 if(t.closest('[data-action="v22-update-date"]')){const d=v22ParseDate(document.getElementById('admin-sip-date').value);if(!d){notify('Enter a valid date as dd/mm/yyyy.');return}const s=d.getDate()+' '+V22_MON[d.getMonth()]+' '+d.getFullYear();document.getElementById('v22-upcoming-date').textContent=s;notify(`SIP notification date set to ${s} (demo only).`);return}
 if(t.closest('[data-action="v22-preview-notif"]')){showModal('Notification preview',`<div class="v22-notif modal"><span class="v22-notif-logo">${v22Mark(22,'pvM')}</span><div><div class="v22-notif-top"><b>Mod Alpha</b><small>now</small></div><b class="t">Best SIP date this month!</b><p>Our analysis suggests investing on ${document.getElementById('v22-upcoming-date').textContent} for potentially better long-term returns.</p></div></div><p class="v22-muted">Preview only — nothing is sent in this prototype.</p><button class="secondary-btn full" data-modal-close>Close</button>`);return}
},true);
});

MA_STARTUP(162, "change listener", () => {
document.addEventListener('change',e=>{
 const t=e.target;
 if(t.matches('[data-v22-date-for]')&&t.value){const[y,m,d]=t.value.split('-');const inp=document.getElementById(t.dataset.v22DateFor);inp.value=`${d}/${m}/${y}`;inp.dispatchEvent(new Event('change',{bubbles:true}))}
 if(t.id==='calc-date'||t.id==='calc-amount')runCalc();
 if(t.id==='sip-amount'||t.id==='sip-start'||t.id==='sip-end')runSip();
 if(t.id==='quick-date'||t.id==='quick-amount')v22QuickCalc();
 if(t.id==='v22-nav-file'&&t.files[0]){const f=t.files[0];if(!/\.(csv|xlsx|xls)$/i.test(f.name)){notify('Unsupported file type. Upload CSV or Excel (.xlsx).');return}if(f.size>50*1024*1024){notify('File exceeds the 50MB limit.');return}document.getElementById('v22-last-file').textContent=f.name;document.getElementById('v22-last-when').textContent=new Date().toLocaleString('en-GB',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});notify('File accepted for demo validation. Row-level processing is not connected.')}
});
});

MA_STARTUP(163, "keydown listener", () => {
document.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.matches('#calc-date,#calc-amount,#sip-amount,#sip-start,#sip-end,#quick-date,#quick-amount'))e.target.dispatchEvent(new Event('change',{bubbles:true}))});
});

MA_STARTUP(191, "click listener: [data-v22-chat-toggle] · [data-v22-prompt] · [data-v22-chat-send] · [data-v22-billing] · [data-v22-acc] · [data-v22-faqcat] …", () => {
document.addEventListener('click',e=>{
 const t=e.target;let b;
 if((b=t.closest('[data-v22-chat-toggle]'))){e.stopPropagation();const d=document.getElementById('chat-drawer');const open=!d.classList.contains('open');d.classList.toggle('open',open);document.querySelector('.v22-fab')?.classList.toggle('is-open',open);document.querySelector('.v22-fab')?.setAttribute('aria-expanded',open);if(open)setTimeout(()=>document.getElementById('v22-chat-input')?.focus(),60);return}
 if((b=t.closest('[data-v22-prompt]'))){v22ChatSend(b.dataset.v22Prompt);return}
 if(t.closest('[data-v22-chat-send]')){const i=document.getElementById('v22-chat-input');v22ChatSend(i.value);i.value='';return}
 if((b=t.closest('[data-v22-billing]'))){v22Billing=b.dataset.v22Billing;document.querySelectorAll('.v22-billing').forEach(x=>{x.dataset.state=v22Billing;x.querySelectorAll('button').forEach(y=>y.setAttribute('aria-pressed',y.dataset.v22Billing===v22Billing))});document.querySelectorAll('[data-v22-price]').forEach(el=>{const p=D.plans.find(x=>x.price===Number(el.dataset.v22Price));v22AnimatePrice(el,v22PlanPrice(p,v22Billing).per)});document.querySelectorAll('[data-v22-note]').forEach(el=>{const p=D.plans.find(x=>x.price===Number(el.dataset.v22Note));el.textContent=v22PlanPrice(p,v22Billing).note});return}
 if((b=t.closest('[data-v22-acc]'))){const item=b.parentElement,open=!item.classList.contains('open');item.parentElement.querySelectorAll('.v22-acc-item').forEach(x=>{x.classList.remove('open');x.querySelector('[data-v22-acc]').setAttribute('aria-expanded','false')});item.classList.toggle('open',open);b.setAttribute('aria-expanded',open);return}
 if((b=t.closest('[data-v22-faqcat]'))){v22FaqCat=b.dataset.v22Faqcat;b.parentElement.querySelectorAll('button').forEach(x=>x.classList.toggle('active',x===b));let first=true;document.querySelectorAll('.v22-acc-item').forEach(x=>{const show=v22FaqCat==='all'||x.dataset.cat===v22FaqCat;x.hidden=!show;x.classList.toggle('open',show&&first);if(show)first=false});return}
 if((b=t.closest('[data-v22-socialnet]'))){e.preventDefault();notify(`${b.dataset.v22Socialnet} profile link will be added before launch.`);return}
},true);
});

MA_STARTUP(221, "click listener: [data-v22-bell] · #v22-notif-pop · [data-v22-markread] · [data-v22-notifsettings] · [data-v22-prevtab] · .v22-card …", () => {
document.addEventListener('click',e=>{
 const t=e.target;let b;
 const pop=document.getElementById('v22-notif-pop');
 if(t.closest('[data-v22-bell]')){e.stopPropagation();if(pop)pop.hidden=!pop.hidden;return}
 if(pop&&!pop.hidden&&!t.closest('#v22-notif-pop'))pop.hidden=true;
 if(t.closest('[data-v22-markread]')){document.querySelectorAll('.v22-np-item.unread').forEach(x=>x.classList.remove('unread'));V22_NOTIFS.forEach(n=>n[4]=0);document.querySelector('.v22-bell-badge')?.remove();return}
 if(t.closest('[data-v22-notifsettings]')){settingsTab='notifications'}
 if((b=t.closest('[data-v22-prevtab]'))){b.parentElement.querySelectorAll('button').forEach(x=>x.classList.toggle('active',x===b));b.closest('.v22-card').querySelectorAll('[data-prev]').forEach(x=>x.hidden=x.dataset.prev!==b.dataset.v22Prevtab);return}
 if((b=t.closest('[data-v22-segpick]'))){b.parentElement.querySelectorAll('button').forEach(x=>x.classList.toggle('active',x===b));return}
 if((b=t.closest('[data-v22-helpcat]'))){v22HelpCat=b.dataset.v22Helpcat;b.parentElement.querySelectorAll('button').forEach(x=>x.classList.toggle('active',x===b));document.getElementById('v22-help-list').innerHTML=v22HelpList();return}
 if(t.closest('[data-v22-support]')){const em=document.getElementById('support-email').value.trim(),msg=document.getElementById('support-message').value.trim();if(!/^\S+@\S+\.\S+$/.test(em)){notify('Enter a valid email address.');return}if(msg.length<10){notify('Please describe your question (at least 10 characters).');return}document.getElementById('v22-support-ok').hidden=false;document.getElementById('support-message').value='';document.getElementById('v22-msg-count').textContent='0';notify('Demo support request recorded locally (not sent).');return}
 if((b=t.closest('[data-v22-day]'))){b.parentElement.querySelectorAll('button').forEach(x=>x.classList.toggle('active',x===b));const n=Number(b.dataset.v22Day),sfx=n%100>=11&&n%100<=13?'th':({1:'st',2:'nd',3:'rd'}[n%10]||'th');document.getElementById('admin-sip-day').value=n;document.getElementById('v22-day-label').textContent=n+sfx;return}
 if(t.closest('[data-action="validate-date"]')){setTimeout(()=>{document.querySelectorAll('#v22-steps>div').forEach((x,i)=>x.classList.toggle('done',i<3))},0)}
 if(t.closest('[data-v22-confirm-publish],[data-confirm-publish]')){setTimeout(()=>document.querySelectorAll('#v22-steps>div').forEach(x=>x.classList.add('done')),0)}
},true);
});

MA_STARTUP(223, "change listener: .v22-chan", () => {
document.addEventListener('change',e=>{const t=e.target;
 if(t.id==='v22-sub-state'||t.id==='v22-sub-plan')v22FilterSubs();
 if(t.id==='v22-audit-type')v22FilterAudit();
 if(t.matches('[data-v22-gate]')){const all=[...document.querySelectorAll('[data-v22-gate]')],n=all.filter(x=>x.checked).length;document.getElementById('v22-gate-count').textContent=n;document.getElementById('v22-gate-bar').style.width=(n/all.length*100)+'%';if(n===all.length)notify('All release gates checked (demo). Production approval still requires sign-off.')}
 if(t.matches('[data-v22-chan]'))t.closest('.v22-chan')?.classList.toggle('on',t.checked);
 if(t.id==='nav-file'){const n=document.getElementById('v22-file-name');if(n)n.textContent=t.files[0]?`${t.files[0].name} · ${(t.files[0].size/1024).toFixed(0)} KB`:'No file selected';document.querySelector('.v22-pipeline>div:nth-child(1)')?.classList.add('done')}
});
});

MA_STARTUP(299, "click listener: [data-v22-ap-users],[data-v22-ap-subs] · #users-table [data-user] · [data-v22-upage] · [data-v22-spage] · [data-v22-publish] · [data-v22-discard] …", () => {
document.addEventListener('click',e=>{const t=e.target;let b;
 if((b=t.closest('[data-v22-ap-users],[data-v22-ap-subs]'))){const k=b.hasAttribute('data-v22-ap-users')?'users':'subs';v22AdmPeriod[k]=b.getAttribute('data-v22-ap-'+k);b.parentElement.querySelectorAll('button').forEach(x=>x.classList.toggle('active',x===b));document.getElementById('v22-ch-'+k).innerHTML=v22AdminChart(k,v22AdmPeriod[k]);e.stopPropagation();return}
 if((b=t.closest('#users-table [data-user]'))){e.stopPropagation();const u=D.users.find(x=>x.id===b.dataset.user);if(u)showModal(`User record · ${u.id}`,`<div class="v22-kv">${[['Name',esc(u.name)],['Email',esc(u.email)],['Mobile',esc(u.mobile||'—')],['Joined',u.joined],['Account',v22Status(u.status)],['KYC',v22Status(u.kyc)],['Plan',esc(u.plan)],['Subscription',v22Status(u.sub)]].map(x=>`<div><span>${x[0]}</span><b>${x[1]}</b></div>`).join('')}</div><p class="v22-hint">PII access is audited and permission-controlled in production. Test data record.</p><button class="secondary-btn" data-modal-close>Close</button>`);return}
 if((b=t.closest('[data-v22-upage]'))&&!b.disabled){v22UPage=+b.dataset.v22Upage;document.getElementById('users-table').innerHTML=usersTable(v22UList||D.users);return}
 if((b=t.closest('[data-v22-spage]'))&&!b.disabled){v22SPage=+b.dataset.v22Spage;document.getElementById('v22-sub-list').innerHTML=v22SubRows(v22SList);return}
 if(t.closest('[data-v22-publish]')){v22Publish();return}
 if(t.closest('[data-v22-discard]')){v22LastReport=null;document.getElementById('v22-report').innerHTML='';document.getElementById('v22-wb-name').textContent='No file selected';document.getElementById('v22-wb-file').value='';v22Pipe(0);return}
 if(t.closest('[data-v22-errcsv]')){v22IssuesCsv();return}
 if(t.closest('[data-v22-export-ds]')){v22ExportDataset();return}
 if(t.closest('[data-v22-reset]')){showModal('Reset to bundled test data?','<p>The uploaded dataset will be removed from this browser and the bundled <code>mod-alpha-test-data.xlsx</code> will be used again.</p><button class="v22-danger-btn" data-v22-reset-ok>Reset dataset</button>');return}
 if(t.closest('[data-v22-reset-ok]')){(async()=>{await v22Del('dataset');modalRoot.innerHTML='';V22D.ready=false;V22D.loaded=false;renderAdmin('data');await v22LoadDataset();notify('Bundled test data restored.');route()})();return}
 if((b=t.closest('[data-v22-schema]'))){b.parentElement.querySelectorAll('button').forEach(x=>x.classList.toggle('active',x===b));document.getElementById('v22-schema-body').innerHTML=`<p class="v22-sub" style="margin-bottom:10px">${V22_SCHEMA[b.dataset.v22Schema].desc}</p>`+v22SchemaTable(b.dataset.v22Schema);return}
 if(t.closest('[data-action="v22-export-users"]')){const rows=[['user_id','full_name','email','signup_date','account_status','kyc_status','plan','subscription']].concat((v22UList||D.users).map(u=>[u.id,u.name,u.email,u.signup||u.joined,u.status,u.kyc,u.plan,u.sub]));const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([rows.map(r=>r.map(x=>`"${String(x??'').replace(/"/g,'""')}"`).join(',')).join('\n')],{type:'text/csv'}));a.download='mod-alpha-users.csv';a.click();notify(`Exported ${rows.length-1} users (current filter).`);return}
},true);
});

MA_STARTUP(330, "click listener: [data-v22-profile] · [data-action=\"v22-range\"] · [data-v22-rpre] · [data-v22-rapply] · [data-v22-rreset] · [data-action=\"manage-plans\"],[data-action=\"edit-plan\"] …", () => {
document.addEventListener('click',e=>{const t=e.target;let b;
 if((b=t.closest('[data-v22-profile]'))){e.stopPropagation();if(b.dataset.v22Profile==='admin')v22AdminProfile();else{settingsTab='profile';if(location.hash==='#/user/settings')renderUser('settings');else go('user/settings')}return}
 if(t.closest('[data-action="v22-range"]')){e.stopPropagation();v22RangeModal();return}
 if((b=t.closest('[data-v22-rpre]'))){const[f,to]=b.dataset.v22Rpre.split('|');document.getElementById('v22-r-from').value=f;document.getElementById('v22-r-to').value=to;b.parentElement.querySelectorAll('button').forEach(x=>x.classList.toggle('active',x===b));return}
 if(t.closest('[data-v22-rapply]')){const f=document.getElementById('v22-r-from').value,to=document.getElementById('v22-r-to').value,err=document.getElementById('v22-r-err');if(!f||!to){err.textContent='Choose both dates.';return}if(f>to){err.textContent='“From” must be on or before “To”.';return}V22_RANGE={from:f,to};v22AdmPeriod.users=v22AdmPeriod.subs={from:f,to};modalRoot.innerHTML='';renderAdmin('dashboard');notify(`Showing ${v22Fmt(f)} – ${v22Fmt(to)}`);return}
 if(t.closest('[data-v22-rreset]')){V22_RANGE=null;v22AdmPeriod.users=v22AdmPeriod.subs='30D';modalRoot.innerHTML='';renderAdmin('dashboard');return}
 if((b=t.closest('[data-action="manage-plans"],[data-action="edit-plan"]'))){e.stopPropagation();v22PricingModal(b.dataset.plan);return}
 if(t.closest('[data-v22-pc-save]')){v22PricingSave();return}
 if(t.closest('[data-v22-pc-reset]')){try{localStorage.removeItem(V22_PRICE_KEY)}catch(_){};location.reload();return}
 if((b=t.closest('[data-v22-intcat]'))){v22IntCat=b.dataset.v22Intcat;b.parentElement.querySelectorAll('button').forEach(x=>x.classList.toggle('active',x===b));document.getElementById('v22-int-list').innerHTML=v22IntList();return}
 if((b=t.closest('[data-v22-intstatus]'))){v22IntStatus=v22IntStatus===b.dataset.v22Intstatus?'All':b.dataset.v22Intstatus;renderAdmin('settings');document.getElementById('integrations')?.scrollIntoView({block:'start'});return}
 if(t.closest('[data-v22-int-csv]')){v22IntCsv();return}
 if((b=t.closest('[data-v22-ap-users],[data-v22-ap-subs]'))){V22_RANGE&&(V22_RANGE=V22_RANGE)}
},true);
});
