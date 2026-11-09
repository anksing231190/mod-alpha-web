/* ==========================================================================
   Feature: toast messages (replaces the one-line black bar at the bottom)
   notify(message) — used all over the app — now shows a card at the top right (bottom on phones): a
   coloured icon for the kind of message, the text, a close button and a bar that shows how long it stays.
   • The kind is read from the wording when not given: success (saved, added, activated, sent…), error
     (could not, failed, invalid…), warning (limit, only, remove first…), otherwise info.
     notify(message, { type: 'success' | 'error' | 'warning' | 'info', title }) sets it explicitly.
   • Up to 3 at once, newest on top; hovering pauses the timer; errors stay longer (6 s, others 4 s).
   • Screen readers hear it (role="status", errors role="alert").
   Styles: src/styles/ux.css (.ma-toasts)
   ========================================================================== */
(function () {
  const T = (s) => (window.MA_T ? MA_T(s) : s);
  const ICON = { success: 'check', error: 'cross', warning: 'warn', info: 'info' };
  const TITLE = { success: 'Done', error: 'Something went wrong', warning: 'Heads up', info: 'Note' };
  function guess(m) {
    const s = String(m).toLowerCase();
    if (/could not|couldn’t|can't|cannot|failed|error|invalid|incorrect|wrong|denied|declined|expired|try again/.test(s)) return 'error';
    if (/limit|only |up to|remove one|first|stay off|not available|required|please /.test(s)) return 'warning';
    if (/saved|added|removed from|activated|active|sent|updated|done|✓|copied|success|thank|scheduled|undone|verified|upgraded|turned on|alerts are on|signed out|selected|चुनी/.test(s)) return 'success';
    return 'info';
  }
  function host() {
    let h = document.getElementById('ma-toasts');
    if (!h) { h = document.createElement('div'); h.id = 'ma-toasts'; h.className = 'ma-toasts'; document.body.appendChild(h); }
    return h;
  }
  function show(message, opts) {
    if (message == null || message === '') return;
    opts = opts || {};
    const type = opts.type || guess(message), ms = opts.duration || (type === 'error' ? 6000 : 4000), h = host();
    // the same text twice in a row: refresh the existing card instead of stacking a copy
    const same = [...h.children].find((x) => x.dataset.msg === String(message));
    if (same) same.remove();
    const el = document.createElement('div');
    el.className = `ma-toast ${type}`; el.dataset.msg = String(message);
    el.setAttribute('role', type === 'error' ? 'alert' : 'status');
    el.innerHTML = `<span class="ma-toast-ic" aria-hidden="true">${typeof ic === 'function' ? ic(ICON[type]) : ''}</span><div class="ma-toast-txt"><b>${esc(T(opts.title || TITLE[type]))}</b><span>${esc(String(message))}</span></div><button type="button" class="ma-toast-x" aria-label="${esc(T('Close'))}">${typeof ic === 'function' ? ic('x') : '×'}</button><i class="ma-toast-bar" style="animation-duration:${ms}ms"></i>`;
    h.prepend(el);
    while (h.children.length > 3) h.lastElementChild.remove();
    let left = ms, start = Date.now(), timer = null;
    const done = () => { el.classList.add('out'); setTimeout(() => el.remove(), 220); };
    const run = () => { start = Date.now(); timer = setTimeout(done, left); };
    el.addEventListener('mouseenter', () => { clearTimeout(timer); left -= Date.now() - start; el.classList.add('paused'); });
    el.addEventListener('mouseleave', () => { el.classList.remove('paused'); run(); });
    el.querySelector('.ma-toast-x').addEventListener('click', () => { clearTimeout(timer); done(); });
    run();
    return el;
  }
  // replace the app's notify() everywhere (it is a global function, so every caller picks this up)
  window.notify = show;
  try { notify = show; } catch (e) {}
  const old = document.getElementById('toast'); if (old) old.style.display = 'none';
  window.MA_TOAST = { show };
})();
