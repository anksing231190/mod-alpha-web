/* ==========================================================================
   Mod Alpha — core: router
   The address after # decides the screen: #/landing, #/login, #/user/<page>,
   #/admin/<page>, #/pricing, #/faq. route() runs on every address change.
   ========================================================================== */

/** Pick the screen for the current address. */
function routeBase(){let p=location.hash.replace(/^#\/?/,'').split('?')[0].split('/');if(!p[0])p=['landing'];if(p[0]==='login'||p[0]==='signup'){authMode=p[0];renderAuth();return}if(p[0]==='guest'){currentRole=p[1]==='admin'?'admin':'user';p=[currentRole==='admin'?'admin':'user',currentRole==='admin'?'dashboard':'overview']}if(p[0]==='user'){currentRole='user';renderUser(p[1]||'overview',p[2]);return}if(p[0]==='admin'){currentRole='admin';renderAdmin(p[1]||'dashboard');return}if(p[0]==='landing'){renderLanding();return}if(p[0]==='pricing'){renderPublic('pricing');return}if(p[0]==='faq'){renderPublic('faq');return}if(window.maPublicRoute&&maPublicRoute(p))return;if(window.MA_SYS){MA_SYS.notFoundPage();return}go('login')}

/** routeBase() + sends the old #/user/insights address to the dashboard and opens the chat panel. */
function route(){const h=location.hash;if(/^#\/user\/(insights|chat)\b/.test(h)){history.replaceState(null,'','#/user/overview');routeBase();setTimeout(v22OpenChat,60);return}routeBase()}

/* ---------- start-up steps (run once by core/boot.js, in this global order) ---------- */

MA_STARTUP(83, "hashchange listener", () => {
window.addEventListener('hashchange',()=>{route();setTheme(getTheme())});
});

MA_STARTUP(169, "hashchange listener", () => {
window.addEventListener('hashchange',()=>{if(typeof modalRoot!=='undefined')modalRoot.innerHTML=''});
});
