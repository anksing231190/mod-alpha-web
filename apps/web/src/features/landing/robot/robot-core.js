/* ==========================================================================
   Feature: landing-page robot "Alpha" — shared parts
   The robot drawing (SVG with poses, eyes and accessories), speech bubbles, Hindi-aware text and a
   small "session" helper so every animation stops cleanly when the landing page is re-rendered
   (language switch) or left. Entry point: maRobotInit(), called at the end of renderLanding().
   Hero show: robot-hero.js · Page sections and scroll guide: robot-sections.js · Styles: styles/robot.css
   ========================================================================== */
(function () {
  const STOP = Symbol('robot-stop');
  const html = document.documentElement;
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canHover = () => matchMedia('(hover: hover) and (pointer: fine)').matches;
  const isHi = () => html.dataset.lang === 'hi' || html.lang === 'hi';
  // Hindi text from the shared dictionary (i18n-hi.js); English otherwise.
  const T = (s) => (isHi() && window.MA_I18N_DICT && window.MA_I18N_DICT[s]) || s;

  /** A cancellable run: wait() rejects with STOP once abort() is called (or the parent session ends). */
  function session(parent) {
    const ac = new AbortController();
    if (parent) { if (parent.signal.aborted) ac.abort(); else parent.signal.addEventListener('abort', () => ac.abort(), { once: true }); }
    const s = {
      signal: ac.signal,
      alive: () => !ac.signal.aborted,
      abort: () => ac.abort(),
      wait: (ms) => new Promise((res, rej) => {
        if (ac.signal.aborted) return rej(STOP);
        const t = setTimeout(res, ms);
        ac.signal.addEventListener('abort', () => { clearTimeout(t); rej(STOP); }, { once: true });
      }),
      // wait until fn() is true (checked every 250 ms)
      until: async (fn) => { while (!fn()) await s.wait(250); },
    };
    return s;
  }

  let uid = 0;
  /** The robot SVG (viewBox 120 x 140). Gradient ids are unique per robot. */
  function svg() {
    const k = 'mr' + (++uid), H = `url(#${k}h)`, E = `url(#${k}e)`;
    const star = (x) => `<path d="M${x} 33l2.4 5 5.4.7-4 3.7 1 5.4-4.8-2.6-4.8 2.6 1-5.4-4-3.7 5.4-.7z"/>`;
    return `<svg viewBox="0 0 120 140" aria-hidden="true" focusable="false"><defs>
<linearGradient id="${k}h" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff"/><stop offset=".6" stop-color="#cfe0ff"/><stop offset="1" stop-color="#7f9cf5"/></linearGradient>
<radialGradient id="${k}e"><stop offset="0" stop-color="#e0fbff"/><stop offset=".5" stop-color="#22d3ee"/><stop offset="1" stop-color="#22d3ee" stop-opacity=".2"/></radialGradient></defs>
<g class="arm-l"><rect x="14" y="84" width="14" height="34" rx="7" fill="${H}"/><circle cx="21" cy="120" r="7" fill="#9fb4ea"/></g>
<g class="arm-r"><rect x="92" y="84" width="14" height="34" rx="7" fill="${H}"/><circle cx="99" cy="120" r="7" fill="#9fb4ea"/></g>
<rect x="30" y="78" width="60" height="50" rx="18" fill="${H}"/>
<circle class="ring" cx="60" cy="102" r="13" fill="none" stroke="#a855f7" stroke-width="2.5" stroke-dasharray="8 6"/>
<circle class="core" cx="60" cy="102" r="8" fill="${E}"/><circle class="core-c" cx="60" cy="102" r="10" fill="#2ed3f5"/>
<rect x="52" y="70" width="16" height="10" rx="3" fill="#8aa0d8"/>
<g class="head">
 <line x1="60" y1="14" x2="60" y2="4" stroke="#9fb4ea" stroke-width="3"/><circle class="ant" cx="60" cy="4" r="4.5" fill="#2ed3f5"/>
 <rect x="15" y="36" width="9" height="18" rx="4" fill="#9fb4ea"/><rect x="96" y="36" width="9" height="18" rx="4" fill="#9fb4ea"/>
 <rect x="22" y="13" width="76" height="60" rx="25" fill="${H}"/><rect x="30" y="25" width="60" height="36" rx="17" fill="#0b1430"/>
 <g class="eyes"><ellipse class="eye" cx="48" cy="41" rx="6" ry="7.5" fill="${E}"/><ellipse class="eye" cx="72" cy="41" rx="6" ry="7.5" fill="${E}"/></g>
 <g class="happy" fill="none" stroke="#2ed3f5" stroke-width="3" stroke-linecap="round"><path d="M42 44q6-9 12 0"/><path d="M66 44q6-9 12 0"/></g>
 <g class="star" fill="#facc15">${star(48)}${star(72)}</g>
 <g class="sleepy" fill="none" stroke="#2ed3f5" stroke-width="3" stroke-linecap="round"><path d="M42 41h12"/><path d="M66 41h12"/></g>
 <path class="smile" d="M54 52q6 4 12 0" fill="none" stroke="#2ed3f5" stroke-width="2.2" stroke-linecap="round" opacity=".85"/>
 <ellipse class="mouth-o" cx="60" cy="53" rx="4.5" ry="5" fill="#2ed3f5"/>
 <g class="acc acc-sun"><rect x="33" y="33" width="23" height="15" rx="6" fill="#0a0a12" stroke="#facc15" stroke-width="1.5"/><rect x="64" y="33" width="23" height="15" rx="6" fill="#0a0a12" stroke="#facc15" stroke-width="1.5"/><path d="M56 39h8" stroke="#facc15" stroke-width="2.5"/><rect x="37" y="35.5" width="8" height="3" rx="1.5" fill="#fff" opacity=".7"/><rect x="68" y="35.5" width="8" height="3" rx="1.5" fill="#fff" opacity=".7"/></g>
 <g class="acc acc-cap"><path d="M24 24 Q58 -22 98 22 Q60 12 24 24Z" fill="#4f46e5"/><path d="M24 24 Q60 12 98 22" stroke="#c7d2fe" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M88 6 Q110 14 108 36" stroke="#4f46e5" stroke-width="7" fill="none" stroke-linecap="round"/><circle cx="108" cy="40" r="6.5" fill="#fff"/></g>
 <g class="acc acc-glasses" fill="none" stroke="#facc15" stroke-width="2.5"><circle cx="48" cy="41" r="10"/><circle cx="72" cy="41" r="10"/><path d="M58 41h4"/></g>
</g></svg>`;
  }

  /** Add a robot to `parent` at (x, y) in the parent's own pixels. Size 150 x 175 times `scale`. */
  function make(parent, x, y, scale = 1, extra = '') {
    const b = document.createElement('div');
    b.className = 'mr-bot ' + extra; b.dataset.base = extra; b.setAttribute('aria-hidden', 'true');
    Object.assign(b.style, { left: x + 'px', top: y + 'px', width: 150 * scale + 'px', height: 175 * scale + 'px' });
    b.innerHTML = `<div class="mr-fl">${svg()}</div><div class="mr-shadow"></div>`;
    parent.appendChild(b); return b;
  }
  /** Set the robot's pose classes (wave, tap, point-l, point-r, thumb, nod, think, shrug, yawn, spin, jolt,
      flash, is-happy, is-star, is-sleepy). Its base classes (position etc.) are kept. */
  function pose(b, ...cls) { b.className = ['mr-bot', b.dataset.base || '', ...cls].join(' ').trim(); }
  /** Move the eyes (a few pixels) to look somewhere. */
  function look(b, dx, dy) { const e = b.querySelector('.eyes'); if (e) e.style.transform = `translate(${dx}px,${dy}px)`; }
  /** A speech bubble; show it with say(bubble, text). */
  function bubble(parent, x, y, extra = '') {
    const s = document.createElement('div'); s.className = 'mr-say ' + extra; s.setAttribute('aria-hidden', 'true');
    s.style.left = x + 'px'; s.style.top = y + 'px'; parent.appendChild(s); return s;
  }
  function say(s, text, suffix = '') { s.textContent = T(text) + suffix; s.classList.remove('show'); void s.offsetWidth; s.classList.add('show'); }
  function hush(s) { s && s.classList.remove('show'); }
  /** Type text letter by letter (all at once in Hindi or with reduced motion). */
  async function type(el, text, sess, speed = 30, suffix = '') {
    const t = T(text) + suffix;
    if (reduced() || isHi()) { el.textContent = t; return; }
    el.textContent = '';
    for (const ch of t) { el.textContent += ch; await sess.wait(speed); }
  }
  const el = (tag, cls, htmlStr) => { const e = document.createElement(tag); if (cls) e.className = cls; if (htmlStr != null) e.innerHTML = htmlStr; return e; };
  const inr = (n) => '₹' + Math.round(n).toLocaleString('en-IN');

  let current = null;
  /** Start (or restart) every robot feature on the landing page. Called by renderLanding(). */
  function init() {
    if (current) current.abort();
    // renderLanding() can run twice on the same page: remove what the previous run added so the new run owns it all
    document.querySelectorAll('#beat-the-ai,#timing,.mr-guide,.mr-guide-say,.hd-phone .mr-bot,.hd-phone .mr-say,.mr-scr,.mr-sky,.mr-notif,.mr-radar,.mr-canvas,.mr-pulse,.mr-pt,.mr-zzz').forEach((n) => n.remove());
    document.querySelectorAll('.v22-hero.mr-on').forEach((h) => h.classList.remove('mr-on', 'mr-cards'));
    const sess = current = session();
    // stop when the landing page is gone (route change)
    const main = document.querySelector('main.v22-landing');
    const watch = setInterval(() => { if (!main || !main.isConnected) sess.abort(); }, 1000);
    sess.signal.addEventListener('abort', () => clearInterval(watch), { once: true });
    try { if (typeof window.maRobotSections === 'function') window.maRobotSections(sess); } catch (e) { console.error('robot sections', e); }
    try { if (typeof window.maRobotHero === 'function') window.maRobotHero(sess); } catch (e) { console.error('robot hero', e); }
    try { if (typeof window.maRobotGuide === 'function') window.maRobotGuide(sess); } catch (e) { console.error('robot guide', e); }
  }

  window.MA_ROBOT = { STOP, session, make, pose, look, bubble, say, hush, type, T, isHi, reduced, canHover, el, inr };
  window.maRobotInit = init;
})();
