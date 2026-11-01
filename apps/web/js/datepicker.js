/* Mod Alpha — date picker (replaces the browser's native date popup everywhere).
   Works with:
   • v22 date fields   — text input "dd/mm/yyyy" + calendar button [data-v22-cal="<inputId>"]
   • native <input type="date"> — turned into a styled trigger; the input keeps its ISO value (yyyy-mm-dd)
     and receives input/change events, so existing code keeps working.
   Features: month/year quick switch, today ring, min/max, range shading for "-from"/"-to" pairs,
   keyboard (arrows, PgUp/PgDn, Home/End, Enter, Esc), bottom sheet on phones, dark/light themes,
   Hindi (labels pass through the i18n layer). */
(function () {
  const MON = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const MON_S = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const T = (s) => (window.MA_T ? window.MA_T(s) : s);
  const pad = (n) => String(n).padStart(2, '0');
  const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const dmy = (d) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
  const fromIso = (s) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || ''); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; };
  const fromDmy = (s) => { const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(String(s || '').trim()); if (!m) return null; const d = new Date(+m[3], +m[2] - 1, +m[1]); return d.getMonth() === +m[2] - 1 ? d : null; };
  const same = (a, b) => a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  const ic = (p) => `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
  const ICON = { l: ic('<path d="M15 18l-6-6 6-6"/>'), r: ic('<path d="M9 18l6-6-6-6"/>'), d: ic('<path d="M6 9l6 6 6-6"/>'), cal: ic('<rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>') };
  const today = () => { const t = new Date(); return new Date(t.getFullYear(), t.getMonth(), t.getDate()); };

  let pop = null, st = null;   // st: { get, set, min, max, view, mode, sel, anchor, rangeOther, rangeRole }

  /* ---------- rendering ---------- */
  function within(d) { if (st.monthOnly) { const e = new Date(d.getFullYear(), d.getMonth() + 1, 0); return (!st.min || e >= st.min) && (!st.max || d <= st.max); } return (!st.min || d >= st.min) && (!st.max || d <= st.max); }
  function render() {
    const v = st.view, y = v.getFullYear(), m = v.getMonth();
    let body = '';
    if (st.mode === 'days') {
      const first = new Date(y, m, 1).getDay(), days = new Date(y, m + 1, 0).getDate();
      const t = today(), cells = [];
      const other = st.rangeOther && st.rangeOther();
      const lo = other && st.sel ? (st.rangeRole === 'from' ? st.sel : other) : null, hi = other && st.sel ? (st.rangeRole === 'from' ? other : st.sel) : null;
      for (let i = 0; i < 42; i++) {
        const d = new Date(y, m, i - first + 1), out = d.getMonth() !== m, dis = !within(d);
        const cls = ['ma-dp-day', out && 'out', same(d, t) && 'today', same(d, st.sel) && 'sel', lo && hi && d > lo && d < hi && 'inrange', other && same(d, other) && 'edge', same(d, st.focus) && 'focus'].filter(Boolean).join(' ');
        cells.push(`<button type="button" class="${cls}" data-dp-day="${iso(d)}" ${dis ? 'disabled' : ''} tabindex="${same(d, st.focus) ? 0 : -1}" aria-label="${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear()}" aria-pressed="${same(d, st.sel)}">${d.getDate()}</button>`);
      }
      body = `<div class="ma-dp-week">${WD.map((w) => `<span>${w}</span>`).join('')}</div><div class="ma-dp-grid" role="grid">${cells.join('')}</div>`;
    } else if (st.mode === 'months') {
      body = `<div class="ma-dp-mgrid">${MON_S.map((n, i) => { const a = new Date(y, i + 1, 0), b = new Date(y, i, 1); const dis = (st.min && a < st.min) || (st.max && b > st.max); return `<button type="button" data-dp-month="${i}" class="${i === m ? 'sel' : ''}" ${dis ? 'disabled' : ''}>${n}</button>`; }).join('')}</div>`;
    } else {
      const start = Math.floor(y / 12) * 12;
      body = `<div class="ma-dp-mgrid years">${Array.from({ length: 12 }, (_, i) => start + i).map((yy) => { const dis = (st.min && yy < st.min.getFullYear()) || (st.max && yy > st.max.getFullYear()); return `<button type="button" data-dp-year="${yy}" class="${yy === y ? 'sel' : ''}" ${dis ? 'disabled' : ''}>${yy}</button>`; }).join('')}</div>`;
    }
    const title = st.mode === 'years' ? `${Math.floor(y / 12) * 12} – ${Math.floor(y / 12) * 12 + 11}` : st.mode === 'months' ? `${y}` : `${MON[m]} ${y}`;
    const t = today();
    pop.innerHTML = `<div class="ma-dp-head">
        <button type="button" class="ma-dp-nav" data-dp-step="-1" aria-label="${T('Previous month')}">${ICON.l}</button>
        <button type="button" class="ma-dp-title" data-dp-mode aria-label="${T('Choose month and year')}"><span>${title}</span>${ICON.d}</button>
        <button type="button" class="ma-dp-nav" data-dp-step="1" aria-label="${T('Next month')}">${ICON.r}</button></div>
      ${body}
      <div class="ma-dp-foot"><span class="ma-dp-sel">${st.sel ? (st.monthOnly ? `${MON[st.sel.getMonth()]} ${st.sel.getFullYear()}` : `${st.sel.getDate()} ${MON_S[st.sel.getMonth()]} ${st.sel.getFullYear()}`) : T('No date selected')}</span>
        <div>${st.clearable ? `<button type="button" class="ma-dp-link" data-dp-clear>${T('Clear')}</button>` : ''}<button type="button" class="ma-dp-today" data-dp-today ${st.monthOnly || within(t) ? '' : 'disabled'}>${T(st.monthOnly ? 'This month' : 'Today')}</button></div></div>`;
    if (st.mode === 'days' && st.kbd) pop.querySelector('.ma-dp-day.focus')?.focus({ preventScroll: true });
  }
  function place() {
    if (!pop || !st) return;
    if (matchMedia('(max-width: 560px)').matches) { pop.classList.add('sheet'); pop.style.left = pop.style.top = ''; return; }
    pop.classList.remove('sheet');
    const r = st.anchor.getBoundingClientRect(), w = pop.offsetWidth, h = pop.offsetHeight;
    let top = r.bottom + 8, left = Math.min(Math.max(12, r.left), innerWidth - w - 12);
    if (top + h > innerHeight - 12 && r.top - h - 8 > 12) top = r.top - h - 8;
    pop.style.left = `${left}px`; pop.style.top = `${Math.max(12, top)}px`;
  }

  /* ---------- open / close ---------- */
  function open(opts) {
    close();
    st = { ...opts, mode: opts.monthOnly ? 'months' : 'days', kbd: !opts.noFocus };
    st.sel = st.get();
    st.focus = st.sel || (st.max && today() > st.max ? st.max : today());
    st.view = new Date(st.focus.getFullYear(), st.focus.getMonth(), 1);
    pop = document.createElement('div');
    pop.className = 'ma-dp';
    pop.setAttribute('role', 'dialog'); pop.setAttribute('aria-label', T('Choose date'));
    const scrim = document.createElement('div'); scrim.className = 'ma-dp-scrim'; scrim.onclick = () => close(true);
    document.body.append(scrim, pop);
    render(); place();
    requestAnimationFrame(() => pop && pop.classList.add('in'));
  }
  function close(refocus) {
    document.querySelectorAll('.ma-dp, .ma-dp-scrim').forEach((n) => n.remove());
    if (refocus && st && st.anchor) st.anchor.focus?.({ preventScroll: true });
    pop = null; st = null;
  }
  function choose(d) {
    if (!within(d)) return;
    st.set(d); const a = st.anchor; close(); a && a.focus?.({ preventScroll: true });
  }

  document.addEventListener('click', (e) => {
    if (!pop) return;
    const t = e.target.closest('.ma-dp button'); if (!t || !pop.contains(t)) return;
    e.preventDefault(); st.kbd = true;
    if (t.dataset.dpDay) return choose(fromIso(t.dataset.dpDay));
    if (t.dataset.dpStep) { const k = +t.dataset.dpStep, v = st.view; st.view = st.mode === 'days' ? new Date(v.getFullYear(), v.getMonth() + k, 1) : new Date(v.getFullYear() + k * (st.mode === 'years' ? 12 : 1), v.getMonth(), 1); if (st.mode === 'days') st.focus = new Date(st.view); return render(); }
    if (t.hasAttribute('data-dp-mode')) { st.mode = st.monthOnly ? (st.mode === 'months' ? 'years' : 'months') : st.mode === 'days' ? 'months' : st.mode === 'months' ? 'years' : 'days'; return render(); }
    if (t.dataset.dpMonth && st.monthOnly) return choose(new Date(st.view.getFullYear(), +t.dataset.dpMonth, 1));
    if (t.dataset.dpMonth) { st.view = new Date(st.view.getFullYear(), +t.dataset.dpMonth, 1); st.focus = new Date(st.view); st.mode = 'days'; return render(); }
    if (t.dataset.dpYear) { st.view = new Date(+t.dataset.dpYear, st.view.getMonth(), 1); st.mode = 'months'; return render(); }
    if (t.hasAttribute('data-dp-today')) { const d = today(); return choose(st.monthOnly ? new Date(d.getFullYear(), d.getMonth(), 1) : d); }
    if (t.hasAttribute('data-dp-clear')) { st.set(null); close(true); }
  });
  document.addEventListener('keydown', (e) => {
    if (!pop) return;
    if (e.key === 'Escape') { e.preventDefault(); return close(true); }
    if (st.mode !== 'days' || !pop.contains(document.activeElement)) return;
    const f = st.focus, map = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    let n = null;
    if (map[e.key] != null) n = new Date(f.getFullYear(), f.getMonth(), f.getDate() + map[e.key]);
    else if (e.key === 'PageUp' || e.key === 'PageDown') n = new Date(f.getFullYear(), f.getMonth() + (e.key === 'PageUp' ? -1 : 1), Math.min(f.getDate(), 28));
    else if (e.key === 'Home') n = new Date(f.getFullYear(), f.getMonth(), f.getDate() - f.getDay());
    else if (e.key === 'End') n = new Date(f.getFullYear(), f.getMonth(), f.getDate() + 6 - f.getDay());
    else if ((e.key === 'Enter' || e.key === ' ') && document.activeElement.dataset.dpDay) { e.preventDefault(); return choose(fromIso(document.activeElement.dataset.dpDay)); }
    if (!n) return;
    e.preventDefault(); st.focus = n;
    if (n.getMonth() !== st.view.getMonth() || n.getFullYear() !== st.view.getFullYear()) st.view = new Date(n.getFullYear(), n.getMonth(), 1);
    render();
  });
  addEventListener('resize', place); addEventListener('scroll', place, true);
  window.addEventListener('hashchange', () => close());

  /* ---------- 1) v22 text date fields (dd/mm/yyyy + calendar button) ---------- */
  const FIELD_LIMITS = { min: new Date(2000, 0, 1) };
  window.addEventListener('click', (e) => {
    const b = e.target.closest && e.target.closest('[data-v22-cal]');
    const inp = !b && e.target.closest && e.target.closest('.v22-field input[inputmode="numeric"][placeholder="dd/mm/yyyy"]');
    if (!b && !inp) return;
    const input = b ? document.getElementById(b.dataset.v22Cal) : inp;
    if (!input) return;
    if (b) { e.preventDefault(); e.stopImmediatePropagation(); }
    if (inp && pop) return;   // typing: don't reopen while open
    const field = input.closest('.v22-field') || input;
    open({
      anchor: field, noFocus: !b,
      min: input.dataset.min ? fromIso(input.dataset.min) : FIELD_LIMITS.min,
      max: input.dataset.max ? fromIso(input.dataset.max) : today(),   // historical dates (what-if, SIP compare)
      get: () => fromDmy(input.value),
      set: (d) => { if (!d) return; input.value = dmy(d); input.dispatchEvent(new Event('input', { bubbles: true })); input.dispatchEvent(new Event('change', { bubbles: true })); },
    });
  }, true);

  /* ---------- 2) native <input type="date"> → styled trigger ---------- */
  const proto = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
  const fromYm = (s) => { const m = /^(\d{4})-(\d{2})$/.exec(s || ''); return m ? new Date(+m[1], +m[2] - 1, 1) : null; };
  const ym = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
  function fmt(s) { const d = fromIso(s); return d ? `${pad(d.getDate())} ${MON_S[d.getMonth()]} ${d.getFullYear()}` : T('Select date'); }
  function enhance(input) {
    if (input.dataset.dpReady || input.classList.contains('v22-hidden-date')) return;
    input.dataset.dpReady = '1';
    const month = input.type === 'month', parse = month ? fromYm : fromIso, ser = month ? ym : iso;
    const trig = document.createElement('button');
    trig.type = 'button'; trig.className = 'ma-dp-trigger';
    trig.setAttribute('aria-haspopup', 'dialog');
    const paint = () => { const v = proto.get.call(input), d = parse(v); trig.innerHTML = `${ICON.cal}<span>${month ? (d ? `${MON[d.getMonth()]} ${d.getFullYear()}` : T('Select month')) : fmt(v)}</span>`; };
    // keep the trigger in sync when code sets input.value (e.g. range presets)
    Object.defineProperty(input, 'value', { configurable: true, get() { return proto.get.call(this); }, set(v) { proto.set.call(this, v); paint(); } });
    input.type = 'hidden';
    input.after(trig); paint();
    const pairRole = /-from$/.test(input.id) ? 'from' : /-to$/.test(input.id) ? 'to' : null;
    const pairEl = () => pairRole && document.getElementById(input.id.replace(/-(from|to)$/, pairRole === 'from' ? '-to' : '-from'));
    trig.addEventListener('click', () => open({
      anchor: trig, monthOnly: month, clearable: !month && !input.required && !input.min && !input.max ? true : false,
      min: parse(input.getAttribute('min')), max: parse(input.getAttribute('max')),
      rangeRole: pairRole, rangeOther: pairRole ? () => fromIso(pairEl()?.value) : null,
      get: () => parse(input.value),
      set: (d) => { input.value = d ? ser(d) : ''; input.dispatchEvent(new Event('input', { bubbles: true })); input.dispatchEvent(new Event('change', { bubbles: true })); },
    }));
  }
  const scan = (root) => root.querySelectorAll && root.querySelectorAll('input[type="date"]:not(.v22-hidden-date),input[type="month"]').forEach(enhance);
  new MutationObserver((ms) => ms.forEach((m) => m.addedNodes.forEach((n) => n.nodeType === 1 && (n.matches?.('input[type="date"],input[type="month"]') ? enhance(n) : scan(n))))).observe(document.documentElement, { childList: true, subtree: true });
  if (document.body) scan(document.body); else document.addEventListener('DOMContentLoaded', () => scan(document.body));
  window.MA_DATEPICKER = { open, close };
})();
