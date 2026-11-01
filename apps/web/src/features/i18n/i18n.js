/* Mod Alpha — language switcher (English / हिन्दी).
   The UI is rendered in English by the page templates; when Hindi is selected this layer translates
   every text node and the placeholder / title / aria-label attributes as they appear (MutationObserver),
   using the dictionaries in i18n-hi.js and i18n-hi-admin.js.
   • Exact strings, then number templates ("{n} joined this month"), then name patterns,
     then month/weekday words inside dates. Unknown text (fund names, people, IDs) is left as is.
   • Switching language re-renders the current route, so going back to English needs no reverse map.
   Choice is stored in localStorage('mod-alpha-lang') and applied before first paint (index.html). */
(function () {
  const html = document.documentElement;
  const KEY = 'mod-alpha-lang';
  const DICT = window.MA_I18N_DICT || {};
  const PATTERNS = window.MA_I18N_PATTERNS || [];
  const BLOCKS = window.MA_I18N_BLOCKS || {};
  const WORDS = window.MA_I18N_WORDS || {};
  const NUM = /[+\-−]?₹?\d[\d,]*(?:\.\d+)?/g;
  // Saved language: 'hi' or 'en'.
  const getLang = () => { try { return localStorage.getItem(KEY) === 'hi' ? 'hi' : 'en'; } catch (e) { return 'en'; } };
  let lang = getLang();
  // Is Hindi active?
  const isHi = () => lang === 'hi';

  // number templates: "{n} joined this month" → value with {n} (in order) or {0},{1}… (re-ordered)
  const TPL = {};
  for (const k of Object.keys(DICT)) if (k.includes('{n}')) TPL[k] = DICT[k];
  // Text without spaces (for loose matching).
  const squash = (s) => s.replace(/\s+/g, '');
  const BLOCK_KEYS = new Map(Object.entries(BLOCKS).map(([k, v]) => [squash(k), v]));
  const WORD_RE = new RegExp('\\b(' + Object.keys(WORDS).sort((a, b) => b.length - a.length).join('|') + ')\\b', 'g');
  const DATEISH = new RegExp('^[\\d\\s,.:\\-–·/()₹%+]*(?:(?:' + Object.keys(WORDS).join('|') + ')\\b[\\d\\s,.:\\-–·/()₹%+]*)+$');

  // Collapse whitespace.
  function norm(s) { return s.replace(/\s+/g, ' ').trim(); }
  // English text → Hindi: exact match, then number templates, then name patterns; unknown text stays English.
  function translate(raw) {
    const s = norm(raw);
    if (!s || !/[A-Za-z]/.test(s)) return null;
    if (Object.prototype.hasOwnProperty.call(DICT, s) && !s.includes('{n}')) return DICT[s];
    const nums = s.match(NUM);
    if (nums) {
      const key = s.replace(NUM, '{n}');
      const t = TPL[key];
      if (t !== undefined) {
        if (/\{\d\}/.test(t)) return t.replace(/\{(\d)\}/g, (_, i) => nums[+i] ?? '');
        let i = 0; return t.replace(/\{n\}/g, () => nums[i++] ?? '');
      }
    }
    for (const [re, rep] of PATTERNS) if (re.test(s)) return s.replace(re, rep);
    if (DATEISH.test(s)) return s.replace(WORD_RE, (w) => WORDS[w]);
    return null;
  }
  window.MA_T = (s) => (isHi() ? translate(s) ?? s : s);   // for code that builds strings

  const SKIP = 'script,style,textarea,code,pre,[data-no-i18n],.v22-int-detail';
  // Translate one text node (keeps the English original to switch back).
  function translateText(node) {
    const p = node.parentElement;
    if (!p || p.closest(SKIP)) return;
    const raw = node.nodeValue;
    const t = translate(raw);
    if (t != null && t !== norm(raw)) {
      const lead = raw.match(/^\s*/)[0], trail = raw.match(/\s*$/)[0];
      node.nodeValue = lead + t + trail;
    }
  }
  const ATTRS = ['placeholder', 'title', 'aria-label', 'alt'];
  // Translate placeholder / title / aria-label.
  function translateAttrs(el) {
    for (const a of ATTRS) {
      const v = el.getAttribute && el.getAttribute(a);
      if (!v) continue;
      const t = translate(v);
      if (t != null && t !== v) el.setAttribute(a, t);
    }
  }
  // Replace whole headline blocks that need different word order.
  function translateBlocks(root) {
    if (!BLOCK_KEYS.size) return;
    root.querySelectorAll('h1,h2,h3,p,span,div.v22-float,b').forEach((el) => {
      if (el.dataset.i18nBlock) return;
      const v = BLOCK_KEYS.get(squash(el.textContent));
      if (v === undefined) return;
      // keep leading icons (svg) that belong to the element
      const icons = [...el.children].filter((c) => c.tagName.toLowerCase() === 'svg' || c.classList.contains('v22-float-ic')).map((c) => c.outerHTML).join('');
      el.dataset.i18nBlock = '1';
      if (el.classList.contains('v22-float')) { const span = [...el.children].find((c) => c.tagName === 'SPAN' && !c.classList.contains('v22-float-ic')); if (span) span.innerHTML = v; }
      else el.innerHTML = icons + v;
    });
  }
  // Translate everything under an element.
  function walk(root) {
    if (!isHi() || !root) return;
    if (root.nodeType === 3) { translateText(root); return; }
    if (root.nodeType !== 1 || root.closest?.(SKIP)) return;
    translateBlocks(root.parentElement || root);
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let n; const list = [];
    while ((n = w.nextNode())) list.push(n);
    list.forEach(translateText);
    translateAttrs(root);
    root.querySelectorAll('[placeholder],[title],[aria-label],[alt]').forEach(translateAttrs);
  }

  /* ---------- switch UI ---------- */
  function setLang(l, opts = {}) {
    lang = l === 'hi' ? 'hi' : 'en';
    try { localStorage.setItem(KEY, lang); } catch (e) {}
    html.lang = lang === 'hi' ? 'hi' : 'en';
    html.dataset.lang = lang;
    if (opts.rerender !== false) {
      if (typeof window.route === 'function') { try { window.route(); } catch (e) { location.reload(); return; } }
      else location.reload();
    }
    ensureSwitch(true);
    walk(document.body);
    if (opts.toast && typeof window.notify === 'function') try { window.notify(lang === 'hi' ? 'हिन्दी चुनी गई' : 'English selected'); } catch (e) {}
  }
  // The A / अ language switch button.
  function switchHtml() {
    const hi = isHi();
    return `<button type="button" class="ma-lang-toggle" data-lang-toggle data-next="${hi ? 'en' : 'hi'}" aria-label="${hi ? 'Switch to English' : 'हिन्दी में देखें'}" title="${hi ? 'Switch to English' : 'हिन्दी में देखें'}" data-no-i18n><span class="${hi ? '' : 'on'}">A</span><span class="${hi ? 'on' : ''}">अ</span></button>`;
  }
  // Make sure every top bar has the switch.
  function ensureSwitch(force) {
    document.querySelectorAll('.workspace-actions, .topbar .top-actions').forEach((s) => {
      const ex = s.querySelector(':scope > [data-lang-toggle]');
      const want = isHi() ? 'en' : 'hi';
      if (ex && !force && ex.dataset.next === want) return;
      if (ex) ex.remove();
      const theme = s.querySelector(':scope > [data-theme-toggle]');
      if (theme) theme.insertAdjacentHTML('afterend', switchHtml()); else s.insertAdjacentHTML('afterbegin', switchHtml());
    });
    // Settings → Preferences → Language select
    document.querySelectorAll('select').forEach((sel) => {
      const opts = [...sel.options].map((o) => o.textContent.trim());
      if (!opts.some((o) => /^English \(India\)$/.test(o)) || sel.dataset.langWired) return;
      sel.dataset.langWired = '1';
      sel.setAttribute('data-no-i18n', '');
      sel.innerHTML = '<option value="en">English (India)</option><option value="hi">हिन्दी</option>';
      sel.value = lang;
      sel.addEventListener('change', () => setLang(sel.value, { toast: true }));
    });
  }
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-lang-toggle]');
    if (b) { e.preventDefault(); setLang(b.dataset.next, { toast: true }); }
  });

  let queued = false;
  const mo = new MutationObserver((muts) => {
    if (isHi()) for (const m of muts) {
      if (m.type === 'characterData') translateText(m.target);
      else if (m.type === 'attributes') translateAttrs(m.target);
      else m.addedNodes.forEach(walk);
    }
    if (!queued) { queued = true; requestAnimationFrame(() => { queued = false; ensureSwitch(false); }); }
  });
  // Start translating (and watch for new content).
  function start() {
    html.lang = isHi() ? 'hi' : 'en'; html.dataset.lang = lang;
    mo.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
    ensureSwitch(true);
    walk(document.body);
  }
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
  window.MA_I18N = { get lang() { return lang; }, set: setLang, t: translate };
})();
