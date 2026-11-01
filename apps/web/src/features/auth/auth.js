/* ==========================================================================
   Feature: sign-in and sign-up screens (#/login, #/signup)
   Email + password, mobile OTP and Google buttons, with the particle animation
   behind the card. Live-mode behaviour: auth.live.js. Admin 2-code step:
   admin-mfa.js. Inactivity sign-out: session-timeout.js.
   ========================================================================== */

/** Sign-in / sign-up card (email or mobile tab, password, social buttons). */
function renderAuthForm(){
 const signup=authMode==='signup',mobile=maAuthMethod==='mobile';
 app.innerHTML=`${topbar(true)}<main class="v22 v22-auth"><div class="v22-auth-bg" aria-hidden="true">${v22NetworkBg()}</div><section class="v22-auth-card">
 <div class="v22-auth-brand">${v22Mark(36)}<b>Mod Alpha</b></div>
 <h1>${signup?'Create Account':'Welcome Back'}</h1><p>${signup?'Start your AI-powered investment insights':'Continue to your AI-powered investment insights'}</p>
 <div class="v22-seg" role="tablist"><button type="button" class="${!mobile?'active':''}" data-auth-method="email">Email</button><button type="button" class="${mobile?'active':''}" data-auth-method="mobile">Mobile</button></div>
 <form id="auth-form" novalidate>
  ${signup?`<label class="v22-auth-in">${ic('user')}<input name="name" placeholder="Full name" required autocomplete="name"></label>`:''}
  <label class="v22-auth-in">${ic(mobile?'msg':'user')}<input name="email" type="${mobile?'tel':'email'}" placeholder="${mobile?'+91 98765 43210':'you@example.com'}" required autocomplete="${mobile?'tel':'email'}"></label>
  <label class="v22-auth-in">${ic('lock')}<input name="password" id="v22-pass" type="password" placeholder="••••••••••" minlength="6" required autocomplete="${signup?'new-password':'current-password'}"><button type="button" class="v22-eye" data-v22-eye aria-label="Show password">${ic('eye')}</button></label>
  ${signup?`<label class="v22-auth-in">${ic('lock')}<input name="confirm" type="password" placeholder="Confirm password" required autocomplete="new-password"></label>`:''}
  <div class="v22-auth-opts"><label><input type="checkbox" checked> Remember my email</label><button type="button" data-action="forgot">Forgot Password?</button></div>
  <div id="form-error" class="v22-err" role="alert"></div>
  <button class="v22-grad-btn wide lg" type="submit">${signup?'Create Account':'Login'} ${ic('arrowR')}</button>
 </form>
 <div class="v22-or"><span>or continue with</span></div>
 <div class="v22-social"><button type="button" data-v22-social="Google"><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="#4285F4" d="M22.6 12.3c0-.8-.1-1.5-.2-2.3H12v4.3h6a5.1 5.1 0 0 1-2.2 3.4v2.8h3.6c2-1.9 3.2-4.7 3.2-8.2z"/><path fill="#34A853" d="M12 23c3 0 5.5-1 7.4-2.7l-3.6-2.8c-1 .7-2.3 1.1-3.8 1.1-2.9 0-5.4-2-6.3-4.6H2v2.9A11 11 0 0 0 12 23z"/><path fill="#FBBC05" d="M5.7 14c-.2-.7-.4-1.4-.4-2s.1-1.4.4-2V7.1H2a11 11 0 0 0 0 9.8z"/><path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.2-3.2A11 11 0 0 0 2 7.1L5.7 10c.9-2.6 3.4-4.6 6.3-4.6z"/></svg>Google</button><button type="button" data-v22-social="Apple"><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="#fff" d="M16.4 12.6c0-2.6 2.1-3.8 2.2-3.9-1.2-1.8-3.1-2-3.7-2-1.6-.2-3.1.9-3.9.9s-2-.9-3.4-.9a5 5 0 0 0-4.2 2.6c-1.8 3.1-.5 7.7 1.3 10.2.9 1.2 1.9 2.6 3.2 2.6 1.3-.1 1.8-.8 3.3-.8s2 .8 3.4.8 2.2-1.3 3.1-2.5c1-1.4 1.4-2.8 1.4-2.9 0 0-2.7-1-2.7-4.1zM13.9 5c.7-.9 1.2-2 1-3.2-1 0-2.3.7-3 1.5-.6.7-1.2 1.9-1 3.1 1.1.1 2.3-.6 3-1.4z"/></svg>Apple</button></div>
 <div class="v22-auth-foot">${signup?`Already have an account? <button type="button" data-mode="login">Log in</button>`:`New to Mod Alpha? <button type="button" data-mode="signup">Create an account</button>`}</div>
 <div class="v22-auth-guest"><a href="#/guest/user">Explore as User</a><span>·</span><a href="#/guest/admin">Explore as Admin</a></div>
 </section></main>${publicFooter()}`;
 app.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{authMode=b.dataset.mode==='signup'?'signup':'login';history.replaceState(null,'','#/'+authMode);renderAuth()});
 app.querySelectorAll('[data-auth-method]').forEach(b=>b.onclick=()=>{maAuthMethod=b.dataset.authMethod;renderAuth()});
 app.querySelector('[data-v22-eye]').onclick=e=>{const p=document.getElementById('v22-pass');p.type=p.type==='password'?'text':'password';e.currentTarget.classList.toggle('on',p.type==='text')};
 app.querySelector('[data-action="forgot"]').onclick=()=>notify('Password reset will be connected during authentication integration.');
 app.querySelectorAll('[data-v22-social]').forEach(b=>b.onclick=()=>notify(`${b.dataset.v22Social} sign-in is not connected in this prototype.`));
 const form=document.getElementById('auth-form');form.onsubmit=e=>{e.preventDefault();const fd=new FormData(form),err=document.getElementById('form-error');const id=String(fd.get('email')||'').trim();
  if(!id){err.textContent=mobile?'Enter your mobile number.':'Enter your email address.';return}
  if(!mobile&&!/^\S+@\S+\.\S+$/.test(id)){err.textContent='Enter a valid email address.';return}
  if(mobile&&id.replace(/\D/g,'').length<10){err.textContent='Enter a valid 10-digit mobile number.';return}
  if(String(fd.get('password')||'').length<6){err.textContent='Password must be at least 6 characters.';return}
  if(signup&&fd.get('password')!==fd.get('confirm')){err.textContent='Passwords do not match.';return}
  currentUser={name:fd.get('name')||(mobile?'Investor':id.split('@')[0]),email:id};notify('Demo sign-in successful');go('user/overview')};
}

/** renderAuthForm() + the particle animation behind the card. */
function renderAuth(){renderAuthForm();const bg=document.querySelector('.v22-auth-bg');if(!bg)return;bg.insertAdjacentHTML('afterbegin','<canvas class="v22-auth-canvas" aria-hidden="true"></canvas>');v22AuthAnim(bg.querySelector('canvas'))}

/** Particle animation on a canvas (theme-aware; waves optional). */
function v22AuthAnim(cv){
 const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches,ctx=cv.getContext('2d');let W,H,dpr,pts=[],t=0;
 // Match the canvas to its box (sharp on high-DPI screens).
 const size=()=>{dpr=Math.min(2,devicePixelRatio||1);W=cv.clientWidth;H=cv.clientHeight;cv.width=W*dpr;cv.height=H*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);const n=Math.round(Math.min(110,W*H/14000));pts=Array.from({length:n},()=>({x:Math.random()*W,y:Math.random()*H,vx:(Math.random()-.5)*.35,vy:(Math.random()-.5)*.35,r:Math.random()*1.8+.6,h:Math.random()<.5?'96,165,250':'167,139,250'}))};
 size();addEventListener('resize',size);
 let mx=-999,my=-999;cv.parentElement.parentElement.addEventListener('pointermove',e=>{const r=cv.getBoundingClientRect();mx=e.clientX-r.left;my=e.clientY-r.top});
 // Draw one animation frame (stops when the canvas leaves the page).
 const draw=()=>{if(!cv.isConnected){removeEventListener('resize',size);return}t+=.006;ctx.clearRect(0,0,W,H);const lt=document.documentElement.dataset.theme==='light';
  // flowing waves
  for(let k=0;k<(cv.dataset.noWaves?0:14);k++){ctx.beginPath();const base=H*.62+k*9,amp=40+k*5;for(let x=0;x<=W;x+=12){const y=base+Math.sin(x/260+t*2+k*.35)*amp*.5+Math.sin(x/120-t*3+k)*8;x?ctx.lineTo(x,y):ctx.moveTo(x,y)}ctx.strokeStyle=`rgba(${lt?(k%2?'142,74,108':'168,105,47'):(k%2?'99,102,241':'59,130,246')},${(lt?.07:.05)+k*.012})`;ctx.lineWidth=1;ctx.stroke()}
  // particles + links
  for(const p of pts){p.x+=p.vx;p.y+=p.vy;if(p.x<0||p.x>W)p.vx*=-1;if(p.y<0||p.y>H)p.vy*=-1;const dm=Math.hypot(p.x-mx,p.y-my);if(dm<140){p.x+=(p.x-mx)/dm*.6;p.y+=(p.y-my)/dm*.6}}
  for(let i=0;i<pts.length;i++)for(let j=i+1;j<pts.length;j++){const a=pts[i],b=pts[j],d=Math.hypot(a.x-b.x,a.y-b.y);if(d<130){ctx.strokeStyle=`rgba(${lt?'150,98,52':'96,165,250'},${(1-d/130)*(lt?.28:.22)})`;ctx.lineWidth=.8;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke()}}
  for(const p of pts){const ph=lt?(p.h[0]==='9'?'168,105,47':'142,74,108'):p.h;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,7);ctx.fillStyle=`rgba(${ph},${.55+Math.sin(t*6+p.x)*.3})`;ctx.shadowColor=`rgb(${ph})`;ctx.shadowBlur=lt?4:8;ctx.fill();ctx.shadowBlur=0}
  if(!reduce)requestAnimationFrame(draw)};
 draw();
}
