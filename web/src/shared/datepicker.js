/* Mod Alpha — date picker (replaces the browser's native date popup everywhere).
   Works with:
   • v22 date fields   — text input "dd/mm/yyyy" + calendar button [data-v22-cal="<inputId>"]
   • native <input type="date"> — turned into a styled trigger; the input keeps its ISO value (yyyy-mm-dd)
   • native <input type="datetime-local"> — calendar + time row (hour, minutes, AM/PM) and a Set button;
     the input keeps its value as yyyy-mm-ddThh:mm (local time)
     and receives input/change events, so existing code keeps working.
   Features: month/year quick switch, today ring, min/max, range shading for "-from"/"-to" pairs,
   keyboard (arrows, PgUp/PgDn, Home/End, Enter, Esc), bottom sheet on phones, dark/light themes,
   Hindi (labels pass through the i18n layer). */
(function () {
  const MON = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const MON_S = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  // Translate (Hindi) when available.
  const T = (s) => (window.MA_T ? window.MA_T(s) : s);
  // Two-digit number.
  const pad = (n) => String(n).padStart(2, '0');
  // Date ⇄ text helpers (YYYY-MM-DD and DD/MM/YYYY).
  const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const dmy = (d) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
  const fromIso = (s) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || ''); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; };
  const fromDmy = (s) => { const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(String(s || '').trim()); if (!m) return null; const d = new Date(+m[3], +m[2] - 1, +m[1]); return d.getMonth() === +m[2] - 1 ? d : null; };
  // Same calendar day?
  const same = (a, b) => a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  // Small icon.
  const ic = (p) => `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
  const ICON = { l: ic('<path d="M15 18l-6-6 6-6"/>'), r: ic('<path d="M9 18l6-6-6-6"/>'), d: ic('<path d="M6 9l6 6 6-6"/>'), clock: ic('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>'), cal: ic('<rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>') };
  // Today at midnight.
  const today = () => { const t = new Date(); return new Date(t.getFullYear(), t.getMonth(), t.getDate()); };

  let pop = null, st = null;   // st: { get, set, min, max, view, mode, sel, anchor, rangeOther, rangeRole }

  /* ---------- rendering ---------- */
  function within(d) { if (st.monthOnly) { const e = new Date(d.getFullYear(), d.getMonth() + 1, 0); return (!st.min || e >= st.min) && (!st.max || d <= st.max); } return (!st.min || d >= st.min) && (!st.max || d <= st.max); }
  // Draw the calendar (days, months or years view).
  /* ---------- date + time (input type="datetime-local") ---------- */
  // { h: 0–23, m: 0–59 } → '10:30 AM'
  const hm12 = (t) => `${((t.h + 11) % 12) + 1}:${pad(t.m)} ${t.h < 12 ? 'AM' : 'PM'}`;
  // Time row under the calendar: hour, minute (5-minute steps) and AM / PM.
  function timeRow() {
    const h12 = ((st.time.h + 11) % 12) + 1, pm = st.time.h >= 12;
    return `<div class="ma-dp-time"><span>${ICON.clock || ''}${T('Time')}</span>
      <select data-dp-h aria-label="${T('Hour')}">${Array.from({ length: 12 }, (_, i) => i + 1).map((h) => `<option value="${h}"${h === h12 ? ' selected' : ''}>${h}</option>`).join('')}</select><b>:</b>
      <select data-dp-m aria-label="${T('Minutes')}">${Array.from({ length: 12 }, (_, i) => i * 5).concat(st.time.m % 5 ? [st.time.m] : []).sort((a, b) => a - b).map((m) => `<option value="${m}"${m === st.time.m ? ' selected' : ''}>${pad(m)}</option>`).join('')}</select>
      <div class="ma-dp-ampm" role="group"><button type="button" data-dp-ap="AM" class="${pm ? '' : 'on'}">AM</button><button type="button" data-dp-ap="PM" class="${pm ? 'on' : ''}">PM</button></div></div>`;
  }
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
      ${st.withTime && st.mode === 'days' ? timeRow() : ''}
      <div class="ma-dp-foot"><span class="ma-dp-sel">${st.withTime ? (st.sel ? `${st.sel.getDate()} ${MON_S[st.sel.getMonth()]} ${st.sel.getFullYear()}, ${hm12(st.time)}` : T('Pick a day')) : st.sel ? (st.monthOnly ? `${MON[st.sel.getMonth()]} ${st.sel.getFullYear()}` : `${st.sel.getDate()} ${MON_S[st.sel.getMonth()]} ${st.sel.getFullYear()}`) : T('No date selected')}</span>
        <div>${st.clearable ? `<button type="button" class="ma-dp-link" data-dp-clear>${T('Clear')}</button>` : ''}${st.withTime ? `<button type="button" class="ma-dp-today" data-dp-done ${st.sel ? '' : 'disabled'}>${T('Set')}</button>` : `<button type="button" class="ma-dp-today" data-dp-today ${st.monthOnly || within(t) ? '' : 'disabled'}>${T(st.monthOnly ? 'This month' : 'Today')}</button>`}</div></div>`;
    if (st.mode === 'days' && st.kbd) pop.querySelector('.ma-dp-day.focus')?.focus({ preventScroll: true });
  }
  // Position the picker under its field (bottom sheet on phones).
  function place() {
    if (!pop || !st) return;
    if (matchMedia('(max-width: 560px)').matches) { pop.classList.add('sheet'); pop.style.left = pop.style.top = ''; return; }
    pop.classList.remove('sheet');
    // measured in screen pixels; the page may be zoomed (maZoom), styles are in CSS pixels
    const Z = typeof maZoom === 'function' ? maZoom() : 1;
    const r = st.anchor.getBoundingClientRect(), w = pop.offsetWidth * Z, h = pop.offsetHeight * Z;
    let top = r.bottom + 8, left = Math.min(Math.max(12, r.left), innerWidth - w - 12);
    if (top + h > innerHeight - 12 && r.top - h - 8 > 12) top = r.top - h - 8;
    pop.style.left = `${left / Z}px`; pop.style.top = `${Math.max(12, top) / Z}px`;
  }

  /* ---------- open / close ---------- */
  function open(opts) {
    close();
    st = { ...opts, mode: opts.monthOnly ? 'months' : 'days', kbd: !opts.noFocus };
    st.sel = st.get();
    if (st.withTime) { const base = st.sel || new Date(Date.now() + 3600e3); st.time = { h: base.getHours(), m: st.sel ? base.getMinutes() : 0 }; if (st.sel) st.sel = new Date(st.sel.getFullYear(), st.sel.getMonth(), st.sel.getDate()); }
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
  // Close the picker.
  function close(refocus) {
    document.querySelectorAll('.ma-dp, .ma-dp-scrim').forEach((n) => n.remove());
    if (refocus && st && st.anchor) st.anchor.focus?.({ preventScroll: true });
    pop = null; st = null;
  }
  // Pick a date: write it to the field and fire input/change events.
  function choose(d) {
    if (!within(d)) return;
    if (st.withTime) { st.sel = d; st.focus = d; return render(); }   // date + time: pick the day, then press Set
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
    if (t.dataset.dpAp) { const pm = t.dataset.dpAp === 'PM'; st.time.h = (st.time.h % 12) + (pm ? 12 : 0); return render(); }
    if (t.hasAttribute('data-dp-done') && st.sel) { const d = new Date(st.sel.getFullYear(), st.sel.getMonth(), st.sel.getDate(), st.time.h, st.time.m); const a = st.anchor; st.set(d); close(); a && a.focus?.({ preventScroll: true }); }
  });
  // hour / minute selects in the time row
  document.addEventListener('change', (e) => {
    if (!pop || !pop.contains(e.target)) return;
    if (e.target.matches('[data-dp-h]')) { const h = +e.target.value % 12; st.time.h = h + (st.time.h >= 12 ? 12 : 0); render(); }
    if (e.target.matches('[data-dp-m]')) { st.time.m = +e.target.value; render(); }
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
  // Month-only helpers (YYYY-MM).
  const fromYm = (s) => { const m = /^(\d{4})-(\d{2})$/.exec(s || ''); return m ? new Date(+m[1], +m[2] - 1, 1) : null; };
  const ym = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
  // Date + time helpers (YYYY-MM-DDTHH:MM, local time) and the day part of a date.
  const fromDt = (s) => { const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(s || ''); return m ? new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]) : null; };
  const dtStr = (d) => `${iso(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const dayOf = (d) => (d ? new Date(d.getFullYear(), d.getMonth(), d.getDate()) : null);
  // '12 Nov 2026' for the trigger button.
  function fmt(s) { const d = fromIso(s); return d ? `${pad(d.getDate())} ${MON_S[d.getMonth()]} ${d.getFullYear()}` : T('Select date'); }
  // Turn a native date / month input into the styled trigger + picker.
  function enhance(input) {
    if (input.dataset.dpReady || input.classList.contains('v22-hidden-date')) return;
    input.dataset.dpReady = '1';
    const month = input.type === 'month', dt = input.type === 'datetime-local';
    const parse = month ? fromYm : dt ? fromDt : fromIso, ser = month ? ym : dt ? dtStr : iso;
    const trig = document.createElement('button');
    trig.type = 'button'; trig.className = 'ma-dp-trigger';
    trig.setAttribute('aria-haspopup', 'dialog');
    // Update the trigger text from the input value.
    const paint = () => { const v = proto.get.call(input), d = parse(v); trig.innerHTML = `${ICON.cal}<span>${month ? (d ? `${MON[d.getMonth()]} ${d.getFullYear()}` : T('Select month')) : dt ? (d ? `${pad(d.getDate())} ${MON_S[d.getMonth()]} ${d.getFullYear()}, ${hm12({ h: d.getHours(), m: d.getMinutes() })}` : T('Select date & time')) : fmt(v)}</span>`; };
    // keep the trigger in sync when code sets input.value (e.g. range presets)
    Object.defineProperty(input, 'value', { configurable: true, get() { return proto.get.call(this); }, set(v) { proto.set.call(this, v); paint(); } });
    input.type = 'hidden';
    input.after(trig); paint();
    const pairRole = /-from$/.test(input.id) ? 'from' : /-to$/.test(input.id) ? 'to' : null;
    // The other field of a from / to pair (range highlight).
    const pairEl = () => pairRole && document.getElementById(input.id.replace(/-(from|to)$/, pairRole === 'from' ? '-to' : '-from'));
    trig.addEventListener('click', () => open({
      anchor: trig, monthOnly: month, withTime: dt, clearable: dt ? !input.required : !month && !input.required && !input.min && !input.max,
      min: dayOf(parse(input.getAttribute('min'))), max: dayOf(parse(input.getAttribute('max'))),
      rangeRole: pairRole, rangeOther: pairRole ? () => fromIso(pairEl()?.value) : null,
      get: () => parse(input.value),
      set: (d) => { input.value = d ? ser(d) : ''; input.dispatchEvent(new Event('input', { bubbles: true })); input.dispatchEvent(new Event('change', { bubbles: true })); },
    }));
  }
  // Enhance every date input under an element.
  const scan = (root) => root.querySelectorAll && root.querySelectorAll('input[type="date"]:not(.v22-hidden-date),input[type="month"],input[type="datetime-local"]').forEach(enhance);
  new MutationObserver((ms) => ms.forEach((m) => m.addedNodes.forEach((n) => n.nodeType === 1 && (n.matches?.('input[type="date"],input[type="month"],input[type="datetime-local"]') ? enhance(n) : scan(n))))).observe(document.documentElement, { childList: true, subtree: true });
  if (document.body) scan(document.body); else document.addEventListener('DOMContentLoaded', () => scan(document.body));
  window.MA_DATEPICKER = { open, close };
})();
