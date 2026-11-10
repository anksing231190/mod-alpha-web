/* ==========================================================================
   Feature: signed-in devices (Settings → Profile)
   Every place this account is signed in: browser and system (read from the browser string), masked IP,
   when it started and was last used; "This device" and "New" (signed in within a day) badges. "Sign out"
   asks to confirm, then ends that session at once; "Sign out of all other devices" ends the rest.
     live: GET /me/sessions · DELETE /me/sessions/:id
     demo: this browser plus two sample devices
   Styles: src/styles/ux.css
   ========================================================================== */
(function () {
  const T = (s) => (window.MA_T ? MA_T(s) : s);
  const live = () => !!(window.MA_LIVE && MA_LIVE.API);
  let items = null, ask = null, busy = false;

  /** "Chrome on Windows" from a browser string. */
  function describe(ua) {
    ua = ua || '';
    const app = /ModAlphaApp|; wv\)/.test(ua);
    const br = /Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : /SamsungBrowser/.test(ua) ? 'Samsung Internet' : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'Browser';
    const os = /iPhone/.test(ua) ? 'iPhone' : /iPad/.test(ua) ? 'iPad' : /Android/.test(ua) ? 'Android' : /Windows/.test(ua) ? 'Windows' : /Mac OS X|Macintosh/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : 'device';
    return { name: app ? `${T('Mod Alpha app')} ${T('on')} ${os}` : `${br} ${T('on')} ${os}`, mobile: /iPhone|Android|iPad|Mobile/.test(ua) };
  }
  const ago = (t) => { const m = Math.round((Date.now() - new Date(t)) / 60000); return m < 2 ? T('Active now') : m < 60 ? `${T('Last active')} ${m} ${T('min ago')}` : m < 1440 ? `${T('Last active')} ${Math.round(m / 60)} ${T('h ago')}` : `${T('Last active')} ${Math.round(m / 1440)} ${T('days ago')}`; };
  function demo() {
    const h = (x) => new Date(Date.now() - x * 3600e3).toISOString();
    return [
      { id: 'this', userAgent: navigator.userAgent, ip: '103.21.x.x', createdAt: h(1), lastSeenAt: h(0), current: true },
      { id: 'd2', userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1', ip: '49.36.x.x', createdAt: h(3), lastSeenAt: h(2) },
      { id: 'd3', userAgent: 'Mozilla/5.0 (Linux; Android 15; wv) AppleWebKit/537.36 Chrome/130.0 Mobile Safari/537.36 ModAlphaApp/1.0', ip: '122.161.x.x', createdAt: h(90), lastSeenAt: h(72) },
    ];
  }
  async function load() {
    if (!live()) { if (!items) items = demo(); paint(); return; }
    try { items = (await MA_LIVE.API.get('/me/sessions')).items; } catch (e) { items = []; }
    paint();
  }
  function rows() {
    if (!items) return window.MA_AI ? MA_AI.skel(2) : '';
    return items.map((s) => {
      const d = describe(s.userAgent), isNew = !s.current && Date.now() - new Date(s.createdAt) < 864e5;
      const act = s.current ? '' : ask === s.id ? `<span class="ma-dev-confirm">${T('Sign out this device?')} <button type="button" class="v22-outline-btn danger" data-ma-dev-yes="${esc(s.id)}">${T('Yes, sign out')}</button><button type="button" class="v22-outline-btn" data-ma-dev-no>${T('Cancel')}</button></span>` : `<button type="button" class="v22-outline-btn" data-ma-dev-out="${esc(s.id)}">${T('Sign out')}</button>`;
      return `<div class="ma-dev">${cic(d.mobile ? 'phone' : 'doc', 42).replace('ma-tint-blue', s.current ? 'ma-tint-green' : 'ma-tint-blue')}<div class="ma-dev-txt"><b>${esc(d.name)}${s.current ? ` <em class="ma-dev-b">${T('This device')}</em>` : ''}${isNew ? ` <em class="ma-dev-b new">${T('New')}</em>` : ''}</b><small>${s.ip ? esc(s.ip) + ' · ' : ''}${esc(ago(s.lastSeenAt))}</small></div><div class="ma-dev-act">${act}</div></div>`;
    }).join('') + (items.length === 1 ? `<p class="ma-dev-only">✓ ${T('Only this device is signed in.')}</p>` : '');
  }
  function card() {
    setTimeout(load, 0);
    return `<section class="v22-card v22-set-card" id="ma-devices"><div class="ma-dev-head"><h3 class="v22-set-h">${cic('shield', 24)} ${T('Signed-in devices')}</h3><button type="button" class="v22-outline-btn danger" data-ma-dev-all hidden>${T('Sign out of all other devices')}</button></div>
      <p class="v22-hint top">${T('Sessions end by themselves after 15 minutes without activity and after 12 hours at most.')}</p><div id="ma-dev-list">${rows()}</div>
      <p class="ma-dev-tip">${ic('info')} ${T('Don’t recognise a device? Sign it out, then change your password.')}</p></section>`;
  }
  function paint() {
    const l = document.getElementById('ma-dev-list'); if (!l) return; l.innerHTML = rows();
    const all = document.querySelector('[data-ma-dev-all]'); if (all) all.hidden = !(items && items.some((s) => !s.current));
  }
  async function end(ids) {
    if (busy) return; busy = true;
    try {
      if (live()) for (const id of ids) await MA_LIVE.API.del(`/me/sessions/${encodeURIComponent(id)}`);
      items = items.filter((s) => !ids.includes(s.id)); ask = null; paint();
      notify(ids.length > 1 ? T('Signed out of all other devices.') : T('That device has been signed out.'));
    } catch (e) { notify(T('Could not sign that device out. Please try again.')); load(); }
    busy = false;
  }
  document.addEventListener('click', (e) => {
    const t = e.target; if (!t.closest || !t.closest('#ma-devices')) return;
    const o = t.closest('[data-ma-dev-out]'); if (o) { ask = o.dataset.maDevOut; paint(); return; }
    if (t.closest('[data-ma-dev-no]')) { ask = null; paint(); return; }
    const y = t.closest('[data-ma-dev-yes]'); if (y) { end([y.dataset.maDevYes]); return; }
    if (t.closest('[data-ma-dev-all]') && items) end(items.filter((s) => !s.current).map((s) => s.id));
  });
  addEventListener('ma:logout', () => { items = null; ask = null; });

  window.MA_DEVICES = { card, describe };
})();
