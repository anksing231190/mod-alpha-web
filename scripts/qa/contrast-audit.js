/* Contrast & icon audit for the website (WCAG: text ≥ 4.5:1, large text ≥ 3:1; flags dark icon tiles).
   Start the site (npm run local or npm run dev:web), then:  node scripts/qa/contrast-audit.js [routes,comma,separated] [light|dark]
   Prints one line per unique problem (ratio, element path, text, colours); full JSON in var/contrast-<theme>.json */
const { chromium } = require('playwright');
const fs=require("fs");
const routes=(process.argv[2]||'landing,login,signup,user/overview,user/funds,user/fund/QSC01,user/whatif,user/sip,user/subscription,user/settings,user/help,admin/dashboard,admin/users,admin/subscriptions,admin/sipdate,admin/data,admin/notifications,admin/methodology,admin/audit,admin/settings,admin/integrations').split(',');
const theme=process.argv[3]||'light';
const AUDIT=()=>{
 const parse=s=>{const m=s.match(/rgba?\(([^)]+)\)/);if(!m)return null;const p=m[1].split(/[\s,\/]+/).map(Number);return [p[0],p[1],p[2],p[3]===undefined?1:p[3]]};
 const lum=([r,g,b])=>{const f=v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)};return .2126*f(r)+.7152*f(g)+.0722*f(b)};
 const cr=(a,b)=>{const x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)};
 const over=(top,bot)=>{const a=top[3];return [top[0]*a+bot[0]*(1-a),top[1]*a+bot[1]*(1-a),top[2]*a+bot[2]*(1-a),1]};
 const gradColors=s=>(s.match(/rgba?\([^)]+\)/g)||[]).map(parse);
 function layers(el){const L=[];let e=el;while(e&&e.nodeType===1){const cs=getComputedStyle(e);if(cs.backgroundImage&&cs.backgroundImage.includes('gradient')&&cs.backgroundClip!=='text'&&cs.webkitBackgroundClip!=='text'){const g=gradColors(cs.backgroundImage);if(g.length){const avg=[0,1,2,3].map(i=>g.reduce((s,c)=>s+c[i],0)/g.length);L.push({c:avg,g});}}
  const bc=parse(cs.backgroundColor);if(bc&&bc[3]>0)L.push({c:bc});
  if(L.length&&L[L.length-1].c[3]>=.95)break;e=e.parentElement}
  let base=parse(getComputedStyle(document.body).backgroundColor)||[255,255,255,1];if(base[3]<1)base=over(base,[255,255,255,1]);
  const res=[];let acc=base;for(let i=L.length-1;i>=0;i--)acc=over(L[i].c,acc);
  // worst-case over gradient stops of the nearest gradient layer
  const gl=L.find(l=>l.g);let alts=[acc];if(gl){alts=gl.g.map(c=>over(c,base))}
  return {bg:acc,alts}}
 const vis=e=>{const r=e.getBoundingClientRect();if(r.width<2||r.height<2)return false;let x=e;while(x&&x.nodeType===1){const cs=getComputedStyle(x);if(cs.visibility==='hidden'||cs.display==='none'||+cs.opacity<.35)return false;x=x.parentElement}return true};
 const sig=e=>{const p=[];let x=e;for(let i=0;i<3&&x&&x!==document.body;i++){p.unshift(x.tagName.toLowerCase()+(x.classList.length?'.'+[...x.classList].slice(0,2).join('.'):''));x=x.parentElement}return p.join(' > ')};
 const out=[];
 const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let n;const seen=new Set();
 while(n=walker.nextNode()){const t=n.textContent.trim();if(!t)continue;const el=n.parentElement;if(seen.has(el))continue;seen.add(el);if(!vis(el))continue;
  const cs=getComputedStyle(el);let fg=parse(cs.webkitTextFillColor&&cs.webkitTextFillColor!==cs.color?cs.webkitTextFillColor:cs.color);
  let fgs=[fg];
  if(fg&&fg[3]===0){ // gradient text
    let x=el;let g=null;while(x&&!g){const s=getComputedStyle(x);if((s.backgroundClip==='text'||s.webkitBackgroundClip==='text')&&s.backgroundImage.includes('gradient'))g=gradColors(s.backgroundImage);x=x.parentElement}
    if(!g)continue;fgs=g;}
  const {bg,alts}=layers(el.parentElement&&getComputedStyle(el).backgroundClip==='text'?el.parentElement:el);
  let worst=99,wf,wb;for(const f of fgs)for(const b of alts){if(!f)continue;const fc=f[3]<1?over(f,b):f;const r=cr(fc,b);if(r<worst){worst=r;wf=f;wb=b}}
  const size=parseFloat(cs.fontSize),bold=+cs.fontWeight>=600,large=size>=24||(size>=18.6&&bold);
  if(worst<(large?3:4.5)) out.push({kind:'text',r:+worst.toFixed(2),t:t.slice(0,40),sig:sig(el),fg:wf&&wf.map(v=>Math.round(v*100)/100).join(','),bg:wb.map(Math.round).join(',')});}
 // icons: svg elements
 document.querySelectorAll('svg').forEach(svg=>{if(!vis(svg))return;const r=svg.getBoundingClientRect();if(r.width>64||r.height>64)return;
  const cs=getComputedStyle(svg);let col=null;const pths=svg.querySelectorAll('path,circle,rect,line,polyline');
  for(const p of pths){const s=getComputedStyle(p);for(const v of [s.stroke,s.fill]){if(v&&v.startsWith('rgb')){const c=parse(v);if(c[3]>0.3&&!(c[0]>245&&c[1]>245&&c[2]>245)){col=c;break}}}if(col)break}
  // icons fully white?
  let allWhite=true;for(const p of pths){const s=getComputedStyle(p);for(const v of [s.stroke,s.fill]){if(v&&v.startsWith('rgb')){const c=parse(v);if(c[3]>.3&&!(c[0]>235&&c[1]>235&&c[2]>235))allWhite=false}else if(v&&v.startsWith('url'))allWhite=false}}
  const {bg}=layers(svg.parentElement);
  if(allWhite&&pths.length){const ratio=cr([255,255,255],bg);if(ratio<2.2)out.push({kind:'icon-white',r:+ratio.toFixed(2),sig:sig(svg),bg:bg.map(Math.round).join(',')});return}
  if(col){const ratio=cr(col[3]<1?over(col,bg):col,bg);if(ratio<1.9)out.push({kind:'icon',r:+ratio.toFixed(2),sig:sig(svg),fg:col.join(','),bg:bg.map(Math.round).join(',')})}
 });
 // icon tile backgrounds: small boxes containing svg/img with grey/blue mid tone
 document.querySelectorAll('span,div,i,b,em,a,button').forEach(e=>{const r=e.getBoundingClientRect();if(r.width<20||r.width>72||Math.abs(r.width-r.height)>6)return;if(!e.querySelector('svg,img'))return;if(!vis(e))return;const cs=getComputedStyle(e);const bc=parse(cs.backgroundColor);let c=null;if(cs.backgroundImage.includes('gradient')){const g=gradColors(cs.backgroundImage);if(g.length)c=g[0]}else if(bc&&bc[3]>.05)c=bc;if(!c)return;
  const [R,G,B]=c;const mx=Math.max(R,G,B),mn=Math.min(R,G,B);const l=(mx+mn)/510;const s=mx===mn?0:(mx-mn)/(255-Math.abs(mx+mn-255));const h=(()=>{if(mx===mn)return 0;let hh=mx===R?(G-B)/(mx-mn):mx===G?2+(B-R)/(mx-mn):4+(R-G)/(mx-mn);return (hh*60+360)%360})();
  const cool=h>190&&h<290; const darkish=l<.45&&c[3]>.4;
  if((cool&&s<.5&&c[3]>.2)||darkish) out.push({kind:'tile',sig:sig(e),bg:c.map(v=>Math.round(v*100)/100).join(','),h:Math.round(h),l:+l.toFixed(2),s:+s.toFixed(2)})});
 return out};
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1440,height:900}});
await ctx.addInitScript(t=>{try{localStorage.setItem('mod-alpha-theme',t)}catch(e){}},theme);
const all={};
for(const r of routes){const p=await ctx.newPage();await p.goto((process.env.WEB_URL||'http://127.0.0.1:8081')+'/#/'+r);await p.waitForFunction(()=>typeof V22D!=='undefined'&&V22D.loaded,null,{timeout:20000}).catch(()=>{});await p.waitForTimeout(800);
 // scroll through to trigger reveals
 await p.evaluate(async()=>{for(let y=0;y<document.body.scrollHeight;y+=600){scrollTo(0,y);await new Promise(r=>setTimeout(r,120))}scrollTo(0,0)});await p.waitForTimeout(600);
 all[r]=await p.evaluate(AUDIT);await p.close()}
fs.writeFileSync('var/contrast-'+theme+'.json',JSON.stringify(all,null,1));
const agg={};for(const [r,list] of Object.entries(all))for(const it of list){const k=it.kind+' | '+it.sig;(agg[k]=agg[k]||{n:0,routes:new Set(),ex:it}).n++;agg[k].routes.add(r)}
const rows=Object.entries(agg).sort((a,b)=>(a[1].ex.r||0)-(b[1].ex.r||0));
for(const [k,v] of rows)console.log(`${v.ex.r??''}\t${k}\t"${v.ex.t||''}"\tfg=${v.ex.fg||''} bg=${v.ex.bg}\t[${[...v.routes].slice(0,3).join(',')}]`);
console.log('TOTAL unique',rows.length);await b.close()})();
