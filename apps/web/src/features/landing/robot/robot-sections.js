/* ==========================================================================
   Feature: landing-page robot — page sections
   • "Can you beat the AI?" (after the hero): the visitor picks a date, the robot reveals the best date
     and a bar comparison, then invites them to sign up.
   • "Same money, better timing" (just before How it works): the SIP race (fixed date vs Mod Alpha date) and
     the coin jars (units bought). Each plays when scrolled into view and again 15 s after it ends.
   • "Meet Alpha, your AI assistant" (just before the FAQ): what Mod Alpha AI does, questions per plan, and a chat card
     that plays an example question and answer (again 15 s after it ends).
   All figures are illustrative backtests and are labelled so.
   ========================================================================== */
(function () {
  const R = () => window.MA_ROBOT;
  const BEST = 12, BEST_UP = 2.8;
  // illustrative uplift for any other day (always below the best date)
  const uplift = (d) => (d === BEST ? BEST_UP : +(0.2 + ((d * 37) % 19) / 10).toFixed(1));
  const ord = (d) => d + (d % 10 === 1 && d !== 11 ? 'st' : d % 10 === 2 && d !== 12 ? 'nd' : d % 10 === 3 && d !== 13 ? 'rd' : 'th');
  const AGAIN_MS = 15000; // pause before an animation plays again
  // Play when scrolled into view, then again AGAIN_MS after each run ends (only while it is on screen).
  const autoLoop = (node, sess, play) => {
    let visible = !('IntersectionObserver' in window);
    if (!visible) {
      const io = new IntersectionObserver((es) => { visible = es[0].isIntersecting; }, { threshold: 0.35 });
      io.observe(node); sess.signal.addEventListener('abort', () => io.disconnect(), { once: true });
    }
    (async () => {
      try {
        while (sess.alive()) {
          await sess.until(() => visible && !document.hidden);
          await play();
          if (R().reduced()) return; // still picture: show the end state once
          await sess.wait(AGAIN_MS);
        }
      } catch (e) { if (e !== R().STOP) console.error('robot section', e); }
    })();
  };

  window.maRobotSections = function (sess) {
    const { el } = R();
    const hero = document.querySelector('main.v22-landing .v22-hero');
    if (!hero || document.getElementById('beat-the-ai')) return;
    // 9 — Beat the AI
    const beat = el('section', 'v22 mr-sec mr-beat'); beat.id = 'beat-the-ai';
    beat.innerHTML = `<div class="v22-sec-head"><span class="v22-eyebrow">TRY IT YOURSELF</span><h2>Can you <span class="g-blue">beat the AI?</span></h2><p>Pick the date you think is best for November’s SIP.</p></div>
      <div class="mr-card mr-game"><div class="mr-game-l"><div class="mr-month">NOVEMBER 2026</div>
        <div class="mr-days" role="group" aria-label="Pick a date">${Array.from({ length: 28 }, (_, i) => `<button type="button" data-mr-day="${i + 1}">${i + 1}</button>`).join('')}</div>
        <div class="mr-bars" aria-live="polite"><div class="mr-bar you"><span>Your pick</span><i></i><b class="mr-yv"></b></div><div class="mr-bar ai"><span><span>Alpha’s pick</span> · 12th</span><i></i><b>+2.8%</b></div></div>
        <p class="mr-note">Illustrative backtest vs a fixed-date SIP. Past performance does not guarantee future returns.</p></div>
        <div class="mr-slot"><a class="mr-cta" href="#/signup">Get Started →</a></div></div>`;
    hero.after(beat);
    // 10 + 11 — race and jars
    const how = document.getElementById('how-it-works');
    const tm = el('section', 'v22 mr-sec mr-timing'); tm.id = 'timing';
    tm.innerHTML = `<div class="v22-sec-head"><span class="v22-eyebrow">TIMING MATTERS</span><h2>Same money, <span class="g-blue">better timing</span></h2><p>₹10,000 a month since 2021, same fund, different dates.</p></div>
      <div class="mr-two"><div class="mr-card mr-race-card"><h3>The SIP race 🏁</h3><div class="mr-race">
        <div class="mr-lane fx"><div class="lbl">Fixed date SIP<small>1st of every month</small></div><div class="mr-track"><div class="trail"></div><div class="mr-coin">₹</div></div><div class="val">₹0</div></div>
        <div class="mr-lane ma"><div class="lbl">Mod Alpha date<small>AI-picked every month</small></div><div class="mr-track"><div class="trail"></div><div class="mr-coin">₹</div></div><div class="val">₹0</div></div>
        <div class="mr-years"><span>2021</span><span>2022</span><span>2023</span><span>2024</span><span>2025</span><span>2026</span></div></div>
        <div class="mr-card-foot"><span class="mr-win">🏆 Mod Alpha date wins</span></div></div>
      <div class="mr-card mr-jar-card"><h3>Units bought in 2026</h3><div class="mr-jmonth">JAN</div><div class="mr-jars">
        <div><div class="mr-jar"><div class="mr-fill"></div></div><div class="mr-jl">Fixed date<b class="j0">0 units</b></div></div>
        <div><div class="mr-jar"><div class="mr-fill"></div></div><div class="mr-jl ma">Mod Alpha date ✦<b class="j1">0 units</b></div></div></div>
        <div class="mr-card-foot"><span class="mr-more">+2.8% more units ✦</span></div></div></div>
      <p class="mr-note mr-center">Illustrative backtest. Past performance does not guarantee future returns.</p>`;
    if (how) how.before(tm); else (document.getElementById('features') || beat).after(tm); // just before "How Mod Alpha Works"

    // Mod Alpha AI — before the FAQ
    const ai = el('section', 'v22 mr-sec mr-ai'); ai.id = 'ai-assistant';
    const per = (name, d) => { const p = (typeof D !== 'undefined' && D.plans || []).find((x) => (x.id || x.name) === name); const n = p && p.limits && p.limits.ai_queries_per_day; return n != null && n >= 0 ? n : d; };
    const feats = [['chat', 'Ask in plain language', 'Funds, returns, SIP dates — type it the way you would ask a friend.'], ['db', 'Answers from real data', 'Grounded in NAV history, fund returns and the published SIP date. No guessing.'], ['brain', 'Explains every term', 'CAGR, Sharpe ratio, expense ratio… one tap for a simple explanation.'], ['globe', 'English and हिन्दी', 'Switch the language and Alpha answers in it.'], ['shield', 'Safe by design', 'It explains, it never tells you what to buy. Not investment advice.']];
    ai.innerHTML = `<div class="v22-sec-head"><span class="v22-eyebrow">MOD ALPHA AI</span><h2>Meet Alpha, your <span class="g-blue">AI assistant</span></h2><p>Ask anything about mutual funds and SIP dates — answers come from Mod Alpha’s own fund data.</p></div>
      <div class="mr-ai-grid"><div class="mr-ai-feats">${feats.map((f) => `<div class="mr-ai-feat"><span class="mr-ai-ic">${typeof cic === 'function' ? cic(f[0], 26) : ''}</span><div><b>${f[1]}</b><p>${f[2]}</p></div></div>`).join('')}
        <div class="mr-ai-plans"><span>Questions a day</span><b>Free ${per('Free', 1)}</b><b>Pro ${per('Pro', 10)}</b><b>Premium ${per('Premium', 25)}</b></div>
        <a class="v22-grad-btn mr-ai-cta" href="#/signup">Try Mod Alpha AI →</a></div>
      <div class="mr-card mr-ai-chat" aria-label="Example conversation"><header><img src="assets/brand/modalpha-bot.svg" alt="" width="44" height="44"><div><b>Mod Alpha AI</b><small><i></i>Answers from Mod Alpha data</small></div><span class="mr-ai-ex">Example</span></header>
        <div class="mr-ai-body"><div class="mr-ai-b me"></div><div class="mr-ai-b bot"></div></div>
        <div class="mr-ai-chips"><span>✦ What is CAGR?</span><span>✦ Best SIP date this month?</span><span>✦ Explain in Hindi</span></div></div></div>`;
    const faq = document.getElementById('faq-preview'); // just before the FAQ
    if (faq) faq.before(ai); else (document.getElementById('features') || beat).after(ai);

    beatGame(beat, sess); race(tm, sess); jars(tm, sess); aiChat(ai, sess);
  };

  /* ---------- 9: Beat the AI ---------- */
  function beatGame(sec, sess) {
    const { make, pose, look, bubble, say, hush, T, reduced } = R();
    const slot = sec.querySelector('.mr-slot');
    const b = make(slot, 40, 30, 1.05); const sb = bubble(slot, -40, -24);
    say(sb, 'Your turn!', ' 👆');
    const days = [...sec.querySelectorAll('[data-mr-day]')], bars = sec.querySelector('.mr-bars');
    let run = null;
    // back to "Your turn!" (also 15 s after a result, so the game invites the next try by itself)
    const reset = () => {
      days.forEach((x) => (x.className = '')); bars.classList.remove('show');
      bars.querySelectorAll('i').forEach((i) => (i.style.width = '0')); sec.querySelector('.mr-cta').classList.remove('show');
      pose(b); look(b, 0, 0); say(sb, 'Your turn!', ' 👆');
    };
    days.forEach((btn) => btn.addEventListener('click', async () => {
      if (run) run.abort(); run = R().session(sess); const s = run; const d = +btn.dataset.mrDay; // a new pick restarts the reveal
      try {
        reset(); btn.className = 'you'; hush(sb);
        pose(b, 'think'); look(b, -5, 2); await s.wait(reduced() ? 0 : 1200);
        days[BEST - 1].classList.add('ai'); pose(b, 'point-l', 'is-happy'); await s.wait(reduced() ? 0 : 500);
        bars.querySelector('.you span').textContent = T('Your pick') + ' · ' + ord(d); sec.querySelector('.mr-yv').textContent = '+' + uplift(d) + '%';
        bars.classList.add('show'); await s.wait(50);
        bars.querySelector('.you i').style.width = (uplift(d) / BEST_UP) * 100 + '%'; bars.querySelector('.ai i').style.width = '100%';
        await s.wait(reduced() ? 0 : 1500);
        if (d === BEST) { pose(b, 'is-star', 'thumb', 'spin'); say(sb, 'You matched the AI!', ' 🎉'); }
        else { pose(b, 'shrug'); say(sb, 'Want me to pick every month?', ' 😉'); }
        sec.querySelector('.mr-cta').classList.add('show');
        await s.wait(AGAIN_MS); reset();
      } catch (e) { /* another pick or page left */ }
    }, { signal: sess.signal }));
  }

  /* ---------- Mod Alpha AI: example conversation ---------- */
  function aiChat(sec, sess) {
    const { T, type, reduced } = R();
    const me = sec.querySelector('.mr-ai-b.me'), bot = sec.querySelector('.mr-ai-b.bot');
    const Q = 'Is a flexi cap fund riskier than a large cap fund?';
    const A = 'Usually a little. Flexi cap funds can move between large, mid and small companies, so their returns swing more. Large cap funds stick to the biggest companies and tend to be steadier. Check each fund’s volatility and Sharpe ratio on its page. ✦';
    const play = async () => {
      const s = sess;
      me.textContent = T(Q); me.classList.remove('show'); bot.classList.remove('show'); bot.innerHTML = '';
      if (reduced()) { me.classList.add('show'); bot.textContent = T(A); bot.classList.add('show'); return; }
      await s.wait(400); me.classList.add('show'); await s.wait(800);
      bot.innerHTML = '<span class="mr-dots"><i></i><i></i><i></i></span>'; bot.classList.add('show'); await s.wait(1300);
      bot.textContent = ''; await type(bot, A, s, 16); await s.wait(4000);
    };
    autoLoop(sec.querySelector('.mr-ai-chat'), sess, play);
  }

  /* ---------- 10: SIP race ---------- */
  function race(sec, sess) {
    const { make, pose, bubble, say, hush, inr, reduced } = R();
    const card = sec.querySelector('.mr-race-card'); const b = make(card, 0, 0, 0.55, 'mr-race-bot'); const sb = bubble(card, 0, 0, 'mr-race-say mr-tail-r'); // robot: same size as the jar robot
    const lanes = [...card.querySelectorAll('.mr-lane')], FIN = [680000, 1171377];
    const set = (t) => lanes.forEach((l, i) => {
      const p = Math.min(1, i ? (t < 0.5 ? t * 0.95 : 0.475 + (t - 0.5) * 1.05) : t) * (i ? 1 : 0.6), w = l.querySelector('.mr-track').offsetWidth - 40;
      l.querySelector('.mr-coin').style.left = p * w + 'px'; l.querySelector('.trail').style.width = p * w + 20 + 'px'; l.querySelector('.val').textContent = inr(FIN[i] * Math.pow(t, 1.6));
      if (i === 1) { // the robot rides above the Mod Alpha coin (its bubble too)
        const x = l.querySelector('.mr-track').getBoundingClientRect().left - card.getBoundingClientRect().left + p * w + 19;
        b.style.left = x - b.offsetWidth / 2 + 'px'; sb.style.left = Math.max(8, x - 40) + 'px';
      }
    });
    const play = async () => {
      const s = sess; card.classList.remove('done');
      {
        if (reduced()) { set(1); card.classList.add('done'); pose(b, 'is-happy', 'thumb'); return; }
        set(0); pose(b, 'wave'); say(sb, 'And they’re off!', ' 🏁'); await s.wait(900);
        const T = 110;
        for (let k = 0; k <= T; k++) {
          set(k / T);
          if (k === 62) { hush(sb); pose(b, 'point-l', 'think'); await s.wait(150); say(sb, 'Mod Alpha pulls ahead!', ' ⚡'); }
          await s.wait(45);
        }
        card.classList.add('done'); pose(b, 'thumb', 'is-happy', 'spin'); say(sb, '₹11.7L vs ₹6.8L', ' 🎉'); await s.wait(3500); hush(sb); pose(b, 'is-happy');
      }
    };
    set(0);
    autoLoop(card, sess, play);
  }

  /* ---------- 11: coin jars ---------- */
  function jars(sec, sess) {
    const { make, pose, el, T, reduced } = R();
    const card = sec.querySelector('.mr-jar-card'), jarsEl = [...card.querySelectorAll('.mr-jar')];
    const b = make(card, 0, 46, 0.55, 'mr-jar-bot');
    const M = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'], PER = [117.1, 120.4];
    const fill = (i, m) => { jarsEl[i].querySelector('.mr-fill').style.height = (m / 12) * (i ? 92 : 89.5) + '%'; card.querySelector('.j' + i).textContent = Math.round(m * PER[i]).toLocaleString('en-IN') + ' ' + T('units'); };
    const play = async () => {
      const s = sess; card.classList.remove('done');
      try {
        if (reduced()) { fill(0, 12); fill(1, 12); card.classList.add('done'); pose(b, 'is-happy'); return; }
        fill(0, 0); fill(1, 0);
        for (let m = 0; m < 12; m++) {
          card.querySelector('.mr-jmonth').textContent = T(M[m]) + ' 2026';
          for (let i = 0; i < 2; i++) {
            const jr = jarsEl[i].getBoundingClientRect(), cr = card.getBoundingClientRect();
            const x = jr.x - cr.x + jr.width / 2 - 14;
            if (i === 1) { b.style.left = x - 28 + 'px'; pose(b, 'tap'); }
            const c = el('div', 'mr-drop', '₹'); Object.assign(c.style, { left: x + 'px', top: '96px' }); card.appendChild(c);
            const level = (m / 12) * (i ? 0.92 : 0.895) * jr.height;
            setTimeout(() => (c.style.top = jr.y - cr.y + jr.height - 26 - level + 'px'), 30);
            setTimeout(() => { c.remove(); fill(i, m + 1); }, 650);
            await s.wait(i ? 480 : 220);
          }
          pose(b);
        }
        card.classList.add('done'); pose(b, 'is-happy', 'thumb', 'spin');
      } catch (e) { card.querySelectorAll('.mr-drop').forEach((d) => d.remove()); throw e; }
    };
    fill(0, 0); fill(1, 0);
    // start above the Mod Alpha jar (the one it fills)
    requestAnimationFrame(() => { const jr = jarsEl[1].getBoundingClientRect(), cr = card.getBoundingClientRect(); b.style.left = jr.x - cr.x + jr.width / 2 - 42 + 'px'; });
    autoLoop(card, sess, play);
  }
})();
