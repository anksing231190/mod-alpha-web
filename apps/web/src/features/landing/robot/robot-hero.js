/* ==========================================================================
   Feature: landing-page robot — hero show (hero variant "hero-d", the phone with orbiting icons)
   • Greeting that fits the visitor's time of day (and Hindi). The hero stats stay fixed (no count-up).
   • Scenes on a loop: the phone's lock-screen cards · finds the best date · chat + reminder · connects the orbiting icons · data → chart
   • Eyes follow the mouse; star eyes and "Let's start!" over Get Started
   • Reacts to the theme (sunglasses / night cap) and language (नमस्ते!) toggles
   • Dozes off after 30 s without activity and wakes up on the next move
   • Background: faint drifting fund "stars" and a radar sweep behind the phone (the old globe "cage" lines are hidden)
   • The phone itself no longer shakes; the robot buzzes when the reminder notification arrives
   Pauses while the hero is off screen or the tab is hidden; static with reduced motion.
   ========================================================================== */
(function () {
  const R = () => window.MA_ROBOT;
  const IDLE_MS = () => window.MA_ROBOT_IDLE_MS || 30000; // dozes off after 30 s without activity (overridable for demos/tests)
  const MONTH = 'NOVEMBER 2026', BEST = 12, UPLIFT = '+2.8%';

  window.maRobotHero = function (sess) {
    const { make, pose, look, bubble, say, hush, type, T, el, reduced, canHover, STOP } = R();
    const hero = document.querySelector('.v22-hero.hero-d');
    const stage = hero && hero.querySelector('.hd-stage');
    const phone = stage && stage.querySelector('.hd-phone');
    if (!phone || phone.querySelector('.mr-bot')) return;
    hero.classList.add('mr-on');
    const RM = reduced();

    /* ---------- pieces ---------- */
    const scr = el('div', 'mr-scr'); phone.appendChild(scr);
    const sky = el('div', 'mr-sky'); phone.appendChild(sky);
    const b = make(phone, 70, 230, 1, 'mr-home');
    const sayIn = bubble(phone, 0, 160, 'mr-in-phone');
    const sayGo = bubble(phone, -250, 330, 'mr-big mr-tail-r');
    const notif = el('div', 'mr-notif', `<b>🔔 Mod Alpha · ${T('now')}</b><span></span>`); phone.appendChild(notif);
    if (!RM) { constellation(hero, sess); }
    radar(stage, phone, RM);
    const ring = logoRing(stage, sess, RM); // real AMC logos circling the phone
    const scan = scanCard(hero);            // month calendar (top right) that the story scene scans

    // stage units ↔ screen (the stage and phone are CSS-scaled)
    const stageK = () => stage.getBoundingClientRect().width / stage.offsetWidth;
    const inStage = (node) => { const s = stage.getBoundingClientRect(), r = node.getBoundingClientRect(), k = stageK(); return { x: (r.x + r.width / 2 - s.x) / k, y: (r.y + r.height / 2 - s.y) / k }; };
    const place = (where) => { b.dataset.base = 'mr-' + where; b.className = b.className.replace(/\bmr-(home|peek|top|tuck)\b/g, '').trim() + ' mr-' + where; };
    const clearScreen = () => { scr.innerHTML = ''; scr.className = 'mr-scr'; notif.classList.remove('show'); hush(sayIn); look(b, 0, 0); place('home'); pose(b); };

    /* ---------- theme & language reactions ---------- */
    const theme = () => (document.documentElement.dataset.theme === 'light' ? 'light' : 'dark');
    const lang = () => (R().isHi() ? 'hi' : 'en');
    const st = window.__maRobotState || (window.__maRobotState = { theme: theme(), lang: lang() });
    let capTimer;
    const dressFor = (t, fresh) => {
      clearTimeout(capTimer);
      if (t === 'light') b.dataset.acc = 'sun';
      else if (fresh) { b.dataset.acc = 'cap'; capTimer = setTimeout(() => { if (b.dataset.acc === 'cap') b.dataset.acc = ''; }, 6000); }
      else b.dataset.acc = '';
    };
    const react = (kind) => {
      if (kind === 'theme') { const t = theme(); dressFor(t, true); pose(b, t === 'light' ? 'is-happy' : 'is-sleepy', t === 'light' ? 'thumb' : ''); say(sayIn, t === 'light' ? 'Sunny mode!' : 'Night mode', t === 'light' ? ' 😎' : ' 🌙'); }
      else { pose(b, 'wave', 'is-happy'); say(sayIn, lang() === 'hi' ? 'Namaste!' : 'Hello again!', lang() === 'hi' ? ' 🙏' : ' 👋'); }
      setTimeout(() => hush(sayIn), 2600);
    };
    dressFor(theme(), false);
    let reacted = false;
    if (st.lang !== lang()) { st.lang = lang(); react('lang'); reacted = true; }
    if (st.theme !== theme()) { st.theme = theme(); react('theme'); reacted = true; }
    const mo = new MutationObserver(() => { if (st.theme !== theme()) { st.theme = theme(); react('theme'); } });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    sess.signal.addEventListener('abort', () => mo.disconnect(), { once: true });

    if (RM) { // still picture: best date on the screen, happy robot
      place('peek'); pose(b, 'is-happy'); calendar(scr, true); return;
    }

    /* ---------- cursor follow + Get Started ---------- */
    const head = b.querySelector('.head');
    let followUntil = 0;
    if (canHover()) {
      addEventListener('mousemove', (e) => {
        if (sleeping || Date.now() < followUntil) return;
        const r = b.getBoundingClientRect(), cx = r.x + r.width / 2, cy = r.y + r.height * 0.3, dx = e.clientX - cx, dy = e.clientY - cy, d = Math.hypot(dx, dy) || 1;
        look(b, dx / d * 5, dy / d * 4); head.style.transform = `rotate(${Math.max(-10, Math.min(10, dx / 60))}deg)`;
      }, { signal: sess.signal, passive: true });
      const go = hero.querySelector('.v22-hero-actions .v22-grad-btn');
      if (go) {
        go.addEventListener('pointerenter', () => { if (!sleeping) { b.dataset.ex = '1'; say(sayGo, "Let's start!", ' ✦'); } }, { signal: sess.signal });
        go.addEventListener('pointerleave', () => { delete b.dataset.ex; hush(sayGo); }, { signal: sess.signal });
      }
    }

    /* ---------- visibility + idle ---------- */
    let visible = true, sleeping = false, waking = false, idleT, zT, scene = null;
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((es) => { visible = es[0].isIntersecting; }, { threshold: 0.15 });
      io.observe(hero); sess.signal.addEventListener('abort', () => io.disconnect(), { once: true });
    }
    const canRun = () => visible && !document.hidden && !sleeping && !waking;
    const doze = async () => {
      if (sleeping || !visible) return armIdle();
      sleeping = true; if (scene) scene.abort(); clearScreen(); delete b.dataset.ex;
      pose(b, 'yawn'); say(sayIn, 'Resting…');
      setTimeout(() => { if (!sleeping) return; hush(sayIn); pose(b, 'is-sleepy');
        }, 1400); // the mark simply dims while resting
    };
    const armIdle = () => { clearTimeout(idleT); idleT = setTimeout(doze, IDLE_MS()); };
    const activity = () => {
      if (sleeping) {
        sleeping = false; waking = true; clearInterval(zT);
        pose(b, 'jolt', 'is-star'); say(sayIn, 'Welcome back', ' ✦'); followUntil = Date.now() + 1500;
        setTimeout(() => { pose(b, 'wave', 'is-happy'); }, 700);
        setTimeout(() => { hush(sayIn); pose(b); waking = false; }, 2000);
      }
      armIdle();
    };
    ['mousemove', 'keydown', 'scroll', 'touchstart', 'pointerdown', 'wheel'].forEach((ev) => addEventListener(ev, activity, { signal: sess.signal, passive: true }));
    sess.signal.addEventListener('abort', () => { clearTimeout(idleT); clearInterval(zT); clearTimeout(capTimer); }, { once: true });
    armIdle();

    /* ---------- scenes ---------- */
    async function greet(s) {
      const h = new Date().getHours();
      const [txt, icon, tone] = h >= 5 && h < 12 ? ['Good morning!', '☀️', 'am'] : h < 17 && h >= 12 ? ['Good afternoon!', '🌤️', 'pm'] : h >= 17 && h < 21 ? ['Good evening!', '🌙', 'eve'] : ['Working late?', '🌙', 'night'];
      sky.className = 'mr-sky ' + tone; sky.innerHTML = `<span class="mr-sun">${icon}</span>` + (tone === 'night' || tone === 'eve' ? Array.from({ length: 8 }, (_, i) => `<i style="left:${30 + (i * 53) % 230}px;top:${200 + (i * 37) % 120}px;animation-delay:${i * 0.2}s">✦</i>`).join('') : '');
      await s.wait(60); sky.classList.add('on'); pose(b, 'wave'); say(sayIn, lang() === 'hi' && txt !== 'Working late?' ? 'Namaste!' : txt);
      await s.wait(2800); hush(sayIn); sky.classList.remove('on'); pose(b, 'is-happy'); await s.wait(500);
    }
    // the phone's own lock-screen cards (notification + "November best date"), with the robot tucked in the corner
    async function cards(s) {
      place('tuck'); pose(b, 'is-happy', 'point-l'); look(b, -4, -3);
      hero.classList.add('mr-cards');
      try { await s.wait(6500); } finally { hero.classList.remove('mr-cards'); }
    }
    // fund logos send their data (NAV, AMFI, volatility, holidays) into the robot's core, the calendar is scanned,
    // and the best date flies into the phone as a notification
    async function story(s) {
      place('home'); pose(b, 'think'); look(b, 0, -4);
      const NAMES = ['NAV', 'AMFI', 'Volatility', 'Holidays'];
      for (let i = 0; i < NAMES.length; i++) {
        const k = ring.front(), from = { ...ring.pos[k] }, to = inStage(b.querySelector('.core'));
        const tag = el('div', 'mr-tag', T(NAMES[i])); stage.appendChild(tag); ring.lgs[k].classList.add('emit');
        const cx = (from.x + to.x) / 2, cy = Math.min(from.y, to.y) - 120;
        try {
          await tween(1100, (q) => { const e = q * q * (3 - 2 * q), u = 1 - e;
            tag.style.left = u * u * from.x + 2 * u * e * cx + e * e * to.x + 'px';
            tag.style.top = u * u * from.y + 2 * u * e * cy + e * e * to.y + 'px';
            tag.style.opacity = q > 0.85 ? (1 - q) / 0.15 : 1; }, s);
        } finally { tag.remove(); ring.lgs[k].classList.remove('emit'); }
        const hit = el('div', 'mr-hit'); Object.assign(hit.style, { left: to.x + 'px', top: to.y + 'px' }); stage.appendChild(hit);
        b.classList.add('charge'); setTimeout(() => { hit.remove(); b.classList.remove('charge'); }, 600);
        await s.wait(160);
      }
      pose(b, 'is-happy', 'point-r'); look(b, 5, -5);
      try {
        if (scan.offsetParent) { // the calendar is hidden on small screens
          scan.classList.add('on'); await s.wait(450);
          scan.classList.add('scan'); await s.wait(1600);
          scan.classList.add('dim'); await s.wait(800);
          const c = scan.querySelector('.best').getBoundingClientRect(), p = phone.getBoundingClientRect();
          const fly = el('div', 'mr-fly', String(BEST)); Object.assign(fly.style, { left: c.x + 'px', top: c.y + 'px' }); document.body.appendChild(fly);
          try { await s.wait(30); Object.assign(fly.style, { left: p.x + p.width / 2 - 12 + 'px', top: p.y + p.height * 0.12 + 'px', opacity: '0' }); await s.wait(800); }
          finally { fly.remove(); }
        }
        notif.querySelector('span').textContent = T('Your best SIP date this month is the 12th.'); notif.classList.add('show');
        pose(b, 'buzz', 'is-happy'); await s.wait(1000); pose(b, 'is-happy', 'thumb'); look(b, 0, 0); await s.wait(2400);
      } finally { scan.classList.remove('on', 'scan', 'dim'); }
    }
    const tween = (ms, fn, s) => new Promise((res, rej) => {
      const t0 = performance.now();
      const step = (t) => { if (!s.alive()) return rej(STOP); const q = Math.min(1, (t - t0) / ms); fn(q); q < 1 ? requestAnimationFrame(step) : res(); };
      requestAnimationFrame(step);
    });
    async function chat(s) {
      place('peek');
      scr.innerHTML = `<div class="mr-chat"><div class="mr-b me"></div><div class="mr-b ai"></div></div>`;
      const me = scr.querySelector('.me'), ai = scr.querySelector('.ai'); me.textContent = T('When should I invest this month?');
      pose(b, 'wave'); await s.wait(600); pose(b); me.classList.add('show'); await s.wait(900);
      ai.innerHTML = '<span class="mr-dots"><i></i><i></i><i></i></span>'; ai.classList.add('show'); pose(b, 'think'); await s.wait(1400);
      pose(b, 'nod'); await type(ai, 'The 12th — historically 2.8% better', s, 32, ' ✦');
      pose(b, 'is-happy', 'point-r'); await s.wait(800);
      notif.querySelector('span').textContent = T('Tomorrow is your best SIP date (12th).'); notif.classList.add('show');
      pose(b, 'buzz', 'is-happy'); await s.wait(1000); pose(b, 'is-happy'); await s.wait(1800); // the robot vibrates with the notification
    }
    async function connect(s) {
      place('home'); const nodes = [...stage.querySelectorAll('.hd-node')], infoL = stage.querySelector('.hd-info.l'), infoR = stage.querySelector('.hd-info.r');
      const order = [[nodes[1], infoL, 'point-l', -5], [nodes[0], null, 'thumb', 0], [nodes[2], infoR, 'point-r', 5]];
      for (const [n, info, p, lx] of order) {
        if (!n) continue;
        pose(b, p, 'think'); look(b, lx, -4); followUntil = Date.now() + 1500; await s.wait(350);
        const from = inStage(b.querySelector('.core')), to = inStage(n.querySelector('span'));
        const dot = el('div', 'mr-pulse'); Object.assign(dot.style, { left: from.x + 'px', top: from.y + 'px' }); stage.appendChild(dot);
        try {
          await s.wait(30); Object.assign(dot.style, { left: to.x + 'px', top: to.y + 'px' }); await s.wait(720);
          dot.style.opacity = '0'; n.classList.add('mr-lit'); if (info) { info.classList.remove('mr-bounce'); void info.offsetWidth; info.classList.add('mr-bounce'); }
          await s.wait(900);
        } finally { n.classList.remove('mr-lit'); dot.remove(); }
      }
      pose(b, 'is-happy', 'wave'); look(b, 0, 0); await s.wait(1600);
    }
    async function sparks(s) {
      place('top');
      scr.innerHTML = `<svg class="mr-chart" viewBox="0 0 254 120" preserveAspectRatio="none" aria-hidden="true"><path class="area" d="M4 104 L40 92 L76 96 L112 72 L148 78 L184 50 L220 38 L250 14 L250 120 L4 120Z"/><path class="line" d="M4 104 L40 92 L76 96 L112 72 L148 78 L184 50 L220 38 L250 14"/></svg><b class="mr-chip">${UPLIFT} ✦</b>`;
      await s.wait(600); pose(b, 'think');
      const tgt = inStage(b.querySelector('.core')), W = stage.offsetWidth, H = stage.offsetHeight, glyphs = ['₹', '%', 'NAV', '₹', '%', '10Y', '₹', 'SIP'];
      const live = [];
      try {
        for (let i = 0; i < 16; i++) {
          const g = el('div', 'mr-pt', glyphs[i % glyphs.length]); const side = i % 4;
          Object.assign(g.style, { left: (side === 0 ? -20 : side === 1 ? W + 10 : Math.random() * W) + 'px', top: (side === 2 ? -20 : side === 3 ? H : Math.random() * H) + 'px' });
          stage.appendChild(g); live.push(g);
          setTimeout(() => Object.assign(g.style, { left: tgt.x - 10 + 'px', top: tgt.y - 12 + 'px', transform: 'scale(.3)' }), 30);
          setTimeout(() => { g.style.opacity = '0'; }, 1100);
          await s.wait(150);
        }
        await s.wait(1100); pose(b, 'is-happy', 'point-r'); scr.classList.add('chart-on'); await s.wait(3200);
      } finally { live.forEach((g) => g.remove()); }
    }

    /* ---------- the loop ---------- */
    const SCENES = [cards, story, chat, connect, sparks];
    (async () => {
      try {
        await sess.until(canRun);
        scene = R().session(sess);
        try { if (!reacted) await greet(scene); } catch (e) { if (e !== STOP) throw e; }
        clearScreen();
        for (let i = 0; sess.alive(); ) {
          await sess.until(canRun);
          scene = R().session(sess);
          try { await SCENES[i % SCENES.length](scene); i++; } catch (e) { if (e !== STOP) throw e; }
          if (!sleeping && !waking) clearScreen();
          await sess.wait(400);
        }
      } catch (e) { if (e !== STOP) console.error('robot hero', e); }
    })();
  };

  /* ---------- helpers ---------- */
  function calendar(scr, done) {
    const { T, el } = window.MA_ROBOT;
    const dow = ['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d) => `<span class="dow">${d}</span>`).join('');
    scr.innerHTML = `<div class="mr-cal ${done ? 'show' : ''}"><h6>${T(MONTH)}</h6><div class="mr-grid">${dow}${Array.from({ length: 30 }, (_, i) => `<span class="${done && i === BEST - 1 ? 'best' : ''}">${i + 1}</span>`).join('')}</div></div>`;
    const badge = el('div', 'mr-badge' + (done ? ' show' : ''), `✦ ${T('Best SIP date')} · 12th<small>${UPLIFT} ${T('vs a fixed-date SIP')}</small>`);
    scr.appendChild(badge); if (done) scr.classList.add('lit');
    return { cells: [...scr.querySelectorAll('.mr-grid span:not(.dow)')], badge };
  }

  /** Real fund-house logos on a tilted ring around the phone; the ones in front pass over the phone and glint.
      pos[i] is each logo's centre in stage units; front() is the index of the logo nearest the viewer. */
  function logoRing(stage, sess, still) {
    const L = [['HDFC', 'hdfc'], ['SBI', 'sbi'], ['Axis', 'axis'], ['PPFAS', 'ppfas'], ['Quant', 'quant']];
    const wrap = document.createElement('div'); wrap.className = 'mr-ring'; wrap.setAttribute('aria-hidden', 'true');
    wrap.innerHTML = L.map(([n, f]) => `<span class="mr-lg"><img src="assets/funds/${f}.png" alt="" data-n="${n[0]}"></span>`).join('');
    wrap.querySelectorAll('img').forEach((im) => { im.onerror = () => { im.parentNode.textContent = im.dataset.n; }; }); // monogram fallback
    stage.appendChild(wrap);
    const lgs = [...wrap.children], pos = [], CX = 290, CY = 490, RX = 300, RY = 34; // circles the bottom of the phone, below the robot
    const put = (t) => lgs.forEach((l, i) => {
      const a = t / 2600 + (i * 2 * Math.PI) / lgs.length, s = Math.sin(a), x = CX + RX * Math.cos(a), y = CY + RY * s;
      pos[i] = { x, y, s };
      l.style.transform = `translate(${x}px,${y}px) translate(-50%,-50%) scale(${0.7 + 0.3 * (s + 1) / 2})`;
      l.style.zIndex = s > 0 ? 2 : 1; // front: over the phone (z 2, added later), under the info cards (z 3) l.style.opacity = s > 0 ? 1 : 0.35; l.classList.toggle('glint', s > 0.93);
    });
    put(0);
    if (!still) {
      let on = true;
      if ('IntersectionObserver' in window) { const io = new IntersectionObserver((es) => (on = es[0].isIntersecting)); io.observe(stage); sess.signal.addEventListener('abort', () => io.disconnect(), { once: true }); }
      const tick = (t) => { if (!sess.alive()) return; requestAnimationFrame(tick); if (on && !document.hidden) put(t); };
      requestAnimationFrame(tick);
    }
    return { lgs, pos, front: () => pos.reduce((k, p, i) => (p.s > pos[k].s ? i : k), 0) };
  }
  /** The month calendar in the hero's top-right corner (shown only while the story scene scans it). */
  function scanCard(hero) {
    const { T } = window.MA_ROBOT, art = hero.querySelector('.v22-hero-art');
    const c = document.createElement('div'); c.className = 'mr-scan'; c.setAttribute('aria-hidden', 'true');
    const dow = ['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d) => `<span class="dow">${d}</span>`).join(''); // 1 Nov 2026 is a Sunday
    c.innerHTML = `<b>${T(MONTH)}</b><div class="g">${dow}${Array.from({ length: 30 }, (_, i) => `<span class="${i + 1 === BEST ? 'best' : ''}">${i + 1}</span>`).join('')}</div><i class="beam"></i>`;
    (art || hero).appendChild(c); return c;
  }

  /** Radar sweep behind the phone; date blips light up as the sweep passes, the best date pings. */
  function radar(stage, phone, still) {
    const S = 560, rd = document.createElement('div'); rd.className = 'mr-radar' + (still ? ' still' : ''); rd.setAttribute('aria-hidden', 'true');
    Object.assign(rd.style, { width: S + 'px', height: S + 'px', left: phone.offsetLeft - S / 2 + 'px', top: phone.offsetTop - S / 2 + 'px' });
    rd.innerHTML = '<div class="rings"></div><div class="sweep"></div>' + [['5th', 60, 170], ['20th', 150, 215], ['26th', 230, 240], ['1st', 300, 200], ['8th', 110, 120], ['12th', 20, 245, 1]].map(([t, a, r, best]) => {
      const rad = ((a - 90) * Math.PI) / 180; return `<div class="mr-blip${best ? ' best' : ''}" style="left:${S / 2 + Math.cos(rad) * r}px;top:${S / 2 + Math.sin(rad) * r}px;--a:${a}"><span>${t}</span></div>`;
    }).join('');
    stage.prepend(rd);
  }
  /** Drifting fund "stars" (faint dots) in the hero background. */
  function constellation(hero, sess) {
    const cv = document.createElement('canvas'); cv.className = 'mr-canvas'; cv.setAttribute('aria-hidden', 'true'); hero.prepend(cv);
    const ctx = cv.getContext('2d'); let w = 0, h = 0, on = true;
    const fit = () => { w = cv.width = hero.offsetWidth; h = cv.height = hero.offsetHeight; };
    fit(); addEventListener('resize', fit, { signal: sess.signal });
    const pts = Array.from({ length: w < 700 ? 60 : 140 }, () => ({ x: Math.random() * w, y: Math.random() * h, vx: (Math.random() - 0.5) * 0.25, vy: (Math.random() - 0.5) * 0.25, r: Math.random() * 1.6 + 0.6 }));
    if ('IntersectionObserver' in window) { const io = new IntersectionObserver((es) => (on = es[0].isIntersecting)); io.observe(hero); sess.signal.addEventListener('abort', () => io.disconnect(), { once: true }); }
    const draw = () => {
      if (!sess.alive()) return;
      requestAnimationFrame(draw);
      if (!on || document.hidden) return;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = document.documentElement.dataset.theme === 'light' ? 'rgba(120,90,40,.35)' : 'rgba(167,179,207,.45)';
      for (const p of pts) {
        p.x += p.vx; p.y += p.vy; if (p.x < 0 || p.x > w) p.vx *= -1; if (p.y < 0 || p.y > h) p.vy *= -1;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill();
      }
    };
    draw();
  }
})();
