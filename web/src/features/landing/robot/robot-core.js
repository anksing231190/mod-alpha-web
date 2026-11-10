/* ==========================================================================
   Feature: landing-page robot "Alpha" — shared parts
   The robot drawing (SVG with poses, eyes and accessories), speech bubbles, Hindi-aware text and a
   small "session" helper so every animation stops cleanly when the landing page is re-rendered
   (language switch) or left. Entry point: maRobotInit(), called at the end of renderLanding().
   Hero show: robot-hero.js · Page sections: robot-sections.js · Styles: styles/robot.css
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
  /** Alpha's drawing (viewBox 120 x 140, the same box the robot used so every position still fits): the animated
      α mark on a dark tile. .head tilts towards the cursor, .eyes (the α) shifts a few pixels to "look", .core is
      the centre that data flies into. Gradient ids are unique per copy. */
  function svg() {
    const k = 'mr' + (++uid), P = MA_ALPHA_PATH;
    return `<svg viewBox="0 0 120 140" aria-hidden="true" focusable="false"><defs>
<linearGradient id="${k}i" x1="0" x2="1"><stop offset="0" stop-color="#e8c58f"/><stop offset=".5" stop-color="#c4b5fd"/><stop offset="1" stop-color="#22d3ee"/></linearGradient>
<linearGradient id="${k}t" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1d2152"/><stop offset="1" stop-color="#0a0e2a"/></linearGradient></defs>
<g class="head"><g class="ma-am tiled" transform="translate(12 22) scale(.96)"><rect class="ma-am-tile" x="2" y="2" width="96" height="96" rx="28" fill="url(#${k}t)"/>
<g class="eyes"><path class="ma-am-base" d="${P}"/><path class="ma-am-ink" d="${P}" stroke="url(#${k}i)"/><circle class="ma-am-spark" r="3.2"><animateMotion dur="3.2s" repeatCount="indefinite" path="${P}"/></circle></g></g></g>
<circle class="core" cx="60" cy="70" r="1" fill="none"/><circle class="core-c" cx="60" cy="70" r="1" fill="none"/></svg>`;
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
    document.querySelectorAll('#beat-the-ai,#timing,#ai-assistant,.hd-phone .mr-bot,.hd-phone .mr-say,.mr-scr,.mr-sky,.mr-notif,.mr-radar,.mr-canvas,.mr-pulse,.mr-pt,.mr-zzz,.mr-ring,.mr-scan,.mr-tag,.mr-hit,.mr-fly').forEach((n) => n.remove());
    document.querySelectorAll('.v22-hero.mr-on').forEach((h) => h.classList.remove('mr-on', 'mr-cards'));
    const sess = current = session();
    // stop when the landing page is gone (route change)
    const main = document.querySelector('main.v22-landing');
    const watch = setInterval(() => { if (!main || !main.isConnected) sess.abort(); }, 1000);
    sess.signal.addEventListener('abort', () => clearInterval(watch), { once: true });
    try { if (typeof window.maRobotSections === 'function') window.maRobotSections(sess); } catch (e) { console.error('robot sections', e); }
    try { if (typeof window.maRobotHero === 'function') window.maRobotHero(sess); } catch (e) { console.error('robot hero', e); }
  }

  window.MA_ROBOT = { STOP, session, make, pose, look, bubble, say, hush, type, T, isHi, reduced, canHover, el, inr };
  window.maRobotInit = init;
})();
