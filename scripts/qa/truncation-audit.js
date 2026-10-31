/* Truncation / overflow audit: text clipped by its box or spilling out of buttons, pills and tiles.
   Start the site, then:  node scripts/qa/truncation-audit.js [routes] [light|dark] [en|hi] [width]
   e.g. node scripts/qa/truncation-audit.js "" light hi 1280   (WEB_URL overrides http://127.0.0.1:8081) */
const { chromium } = require('playwright');
const routes=(process.argv[2]||'landing,login,signup,user/overview,user/funds,user/fund/QSC01,user/whatif,user/sip,user/subscription,user/settings,user/help,admin/dashboard,admin/users,admin/subscriptions,admin/sipdate,admin/data,admin/notifications,admin/methodology,admin/audit,admin/settings').split(',');
const theme=process.argv[3]||'light', lang=process.argv[4]||'en', width=+(process.argv[5]||1440);
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width,height:900}});
await ctx.addInitScript(([t,l])=>{try{localStorage.setItem('mod-alpha-theme',t);localStorage.setItem('mod-alpha-lang',l)}catch(e){}},[theme,lang]);
const agg={};
for(const r of routes){const p=await ctx.newPage();await p.goto((process.env.WEB_URL||'http://127.0.0.1:8081')+'/#/'+r);await p.waitForTimeout(1500);
 await p.evaluate(async()=>{for(let y=0;y<document.body.scrollHeight;y+=700){scrollTo(0,y);await new Promise(r=>setTimeout(r,90))}scrollTo(0,0)});await p.waitForTimeout(500);
 const res=await p.evaluate(()=>{const out=[];const sig=e=>{const p=[];let x=e;for(let i=0;i<3&&x&&x!==document.body;i++){p.unshift(x.tagName.toLowerCase()+(x.classList.length?'.'+[...x.classList].slice(0,2).join('.'):''));x=x.parentElement}return p.join(' > ')};
  const vis=e=>{const r=e.getBoundingClientRect();if(r.width<4||r.height<4)return false;let x=e;while(x&&x.nodeType===1){const c=getComputedStyle(x);if(c.display==='none'||c.visibility==='hidden'||+c.opacity<.2)return false;x=x.parentElement}return true};
  document.querySelectorAll('button,a,label,td,th,span,b,strong,small,em,h1,h2,h3,h4,p,div,li,summary,option').forEach(e=>{
   if(!vis(e))return;const own=[...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim());if(!own)return;
   const cs=getComputedStyle(e);const clipX=cs.overflowX!=='visible'||cs.textOverflow==='ellipsis';
   if(e.scrollWidth>e.clientWidth+2&&clipX&&e.clientWidth>0){out.push({k:'clipped',sig:sig(e),t:e.textContent.trim().slice(0,40),over:e.scrollWidth-e.clientWidth});return}
   // text spilling out of its (bordered/filled) box
   const rng=document.createRange();rng.selectNodeContents(e);const tr=rng.getBoundingClientRect();const er=e.getBoundingClientRect();
   const boxed=cs.borderLeftWidth!=='0px'||(cs.backgroundColor!=='rgba(0, 0, 0, 0)')||cs.backgroundImage!=='none'||/^(BUTTON|A|TD|TH)$/.test(e.tagName);
   if(boxed&&(tr.right>er.right+2||tr.left<er.left-2)&&e.tagName!=='TD'){out.push({k:'spill',sig:sig(e),t:e.textContent.trim().slice(0,40),over:Math.round(Math.max(tr.right-er.right,er.left-tr.left))})}
   // clipped by an ancestor with overflow hidden
   let a=e.parentElement,d=0;while(a&&d<4){const ac=getComputedStyle(a);if(ac.overflow==='hidden'||ac.overflowX==='hidden'){const ar=a.getBoundingClientRect();if(tr.right>ar.right+2&&tr.width<ar.width*3){out.push({k:'cut-by-parent',sig:sig(e),t:e.textContent.trim().slice(0,40),over:Math.round(tr.right-ar.right)});}break}a=a.parentElement;d++}
  });return out});
 for(const it of res){const k=it.k+' | '+it.sig;(agg[k]=agg[k]||{n:0,routes:new Set(),ex:it}).n++;agg[k].routes.add(r)}
 await p.close()}
for(const [k,v] of Object.entries(agg).sort((a,b)=>b[1].ex.over-a[1].ex.over))console.log(`${v.ex.over}px\t${k}\t"${v.ex.t}"\t[${[...v.routes].slice(0,3).join(',')}]`);
console.log('TOTAL',Object.keys(agg).length);await b.close()})();
