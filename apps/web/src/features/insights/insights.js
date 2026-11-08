/* ==========================================================================
   Feature: Latest AI Insights — text cards and Instagram reels
   --------------------------------------------------------------------------
   • Dashboard tile (#/user/overview): published items, pinned first. A reel shows its cover (or an
     Instagram-style card) with a play button; clicking opens Instagram's own player in a dialog, with an
     "Open on Instagram" link as a fallback. A disclaimer sits under the tile.
   • Admin → Insights & Reels (#/admin/insights): add an Instagram reel (paste its link) or a text insight,
     edit, publish / hide, pin, order, delete. Live mode: /admin/insights API (audited).
     Demo mode: kept in this browser (localStorage).
   The reel itself stays on Instagram and must be on a public account; Mod Alpha only stores the link.
   Public: window.MA_INSIGHTS = { tileHtml(), refresh(), items }
   ========================================================================== */
(function () {
  const API = window.MA_API, live = !!(API && API.enabled);
  const T = (s) => (window.MA_T ? window.MA_T(s) : s);
  const LS = 'mod-alpha-demo-insights';
  const IG_RE = /^(?:https?:\/\/)?(?:www\.|m\.)?instagram\.com\/(?:[A-Za-z0-9._]+\/)?(reels?|p|tv)\/([A-Za-z0-9_-]{5,40})\/?(?:[?#].*)?$/i;
  let items = null;          // published items for the tile
  let adminItems = null;     // every item for the admin screen

  /* ---------- helpers ---------- */
  // Same rule as the API: canonical link + embed link, or null.
  function parseIg(raw) {
    const m = String(raw || '').trim().match(IG_RE); if (!m) return null;
    const t = m[1].toLowerCase() === 'p' ? 'p' : m[1].toLowerCase() === 'tv' ? 'tv' : 'reel';
    return { id: m[2], url: `https://www.instagram.com/${t}/${m[2]}/`, embed: `https://www.instagram.com/${t}/${m[2]}/embed/` };
  }
  // "3 hours ago" style time.
  function ago(d) {
    const s = Math.max(0, (Date.now() - new Date(d).getTime()) / 1000);
    if (s < 3600) return `${Math.max(1, Math.round(s / 60))} min ago`;
    if (s < 86400) { const h = Math.round(s / 3600); return `${h} hour${h > 1 ? 's' : ''} ago`; }
    const dd = Math.round(s / 86400); return dd < 30 ? `${dd} day${dd > 1 ? 's' : ''} ago` : new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }
  const coverSrc = (it) => (it.cover ? (it.cover.startsWith('data:') ? it.cover : `${API.base}/api/v1${it.cover}`) : '');
  const TONE = { trend: 'blue', calendar: 'violet', bulb: 'gold', bell: 'amber', chart: 'teal', shield: 'green', target: 'pink', video: 'pink' };
  const igGlyph = '<svg viewBox="0 0 24 24" class="ma-ig-glyph" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="4.2" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="17.3" cy="6.7" r="1.2" fill="currentColor"/></svg>';

  /* ---------- demo store (this browser) ---------- */
  function demoAll() {
    try { const s = JSON.parse(localStorage.getItem(LS)); if (Array.isArray(s)) return s; } catch (e) {}
    const now = Date.now(), h = 3600e3;
    return [
      { id: 1, kind: 'text', icon: 'trend', title: 'Small Cap Funds Showing Strong Momentum', body: 'Small cap funds have outperformed mid and large cap funds by 6.2% over the last 12 months. Review risk before adding to SIPs.', status: 'Published', pinned: false, sort: 0, publishedAt: new Date(now - 3 * h).toISOString() },
      { id: 2, kind: 'text', icon: 'calendar', title: 'This Month’s SIP Date Is Published', body: 'Subscribers can see the recommended date and the alternatives in the dashboard calendar.', status: 'Published', pinned: false, sort: 0, publishedAt: new Date(now - 5 * h).toISOString() },
      { id: 3, kind: 'text', icon: 'bulb', title: 'Compare Before You Choose', body: 'Use the fund page to compare returns, risk and benchmark over the same period.', status: 'Published', pinned: false, sort: 0, publishedAt: new Date(now - 26 * h).toISOString() },
    ];
  }
  function demoSave(list) { try { localStorage.setItem(LS, JSON.stringify(list)); } catch (e) {} }

  /* ---------- data ---------- */
  const order = (a, b) => (b.pinned - a.pinned) || (a.sort - b.sort) || (new Date(b.publishedAt) - new Date(a.publishedAt));
  async function load() {
    if (live) { try { items = (await API.get('/insights', null, { onUnauthorized: false, background: true })).items; } catch (e) { items = items || []; } }
    else items = demoAll().filter((x) => x.status === 'Published').sort(order).slice(0, 12);
    paintTile();
  }
  async function loadAdmin() {
    adminItems = live ? (await API.get('/admin/insights')).items : demoAll().sort(order);
    return adminItems;
  }
  async function save(id, body) {
    if (live) return id ? (await API.put(`/admin/insights/${id}`, body)).item : (await API.post('/admin/insights', body)).item;
    const list = demoAll(); let it = id ? list.find((x) => x.id === id) : null;
    if (body.kind === 'instagram' || (it && it.kind === 'instagram')) {
      if (body.url !== undefined) { const ig = parseIg(body.url); if (!ig) throw new Error(T('Paste the link of an Instagram reel or post, e.g. https://www.instagram.com/reel/AbC123xyz/')); body.url = ig.url; body.mediaId = ig.id; body.embedUrl = ig.embed; }
    }
    if (!it) { it = { id: Math.max(0, ...list.map((x) => x.id)) + 1, status: 'Draft', pinned: false, sort: 0, icon: body.kind === 'instagram' ? 'video' : 'trend', publishedAt: new Date().toISOString() }; list.push(it); }
    if (body.status === 'Published' && it.status !== 'Published') it.publishedAt = new Date().toISOString();
    Object.assign(it, body, { updatedAt: new Date().toISOString() });
    demoSave(list); return it;
  }
  async function remove(id) { if (live) return API.del(`/admin/insights/${id}`); demoSave(demoAll().filter((x) => x.id !== id)); }

  /* ---------- dashboard tile ---------- */
  function cardHtml(it, first) {
    if (it.kind === 'instagram') {
      const cv = coverSrc(it);
      return `<button type="button" class="v22-ins ma-reel" data-ma-reel="${it.id}" aria-label="${esc(T('Play'))}: ${esc(it.title)}">
        <span class="ma-reel-thumb${cv ? ' has-img' : ''}">${cv ? `<img src="${esc(cv)}" alt="" loading="lazy">` : igGlyph}<i class="ma-reel-play">${ic('play')}</i></span>
        <div><div class="v22-ins-top"><b>${esc(it.title)}</b><small>${ago(it.publishedAt)}</small></div>${it.body ? `<p>${esc(it.body)}</p>` : ''}<span class="ma-reel-src">${igGlyph} ${T('Instagram reel')}</span></div></button>`;
    }
    // AI touches: ✦ badge on every text insight; the first one gets the gradient border and types itself once
    const AI = window.MA_AI, lead = AI && first;
    return `<div class="v22-ins${lead ? ' ma-ai-card' : ''}"><span class="v22-tile ${TONE[it.icon] || 'blue'}">${ic(it.icon || 'trend')}</span><div><div class="v22-ins-top"><b>${esc(it.title)}${AI ? AI.badge('AI Insight') : ''}</b><small>${ago(it.publishedAt)}</small></div><p${lead ? ` data-ma-type="ins-${it.id}"` : ''}>${esc(it.body || '')}</p></div></div>`;
  }
  function tileHtml() {
    if (!items) load(); // demo data loads at once; live data paints the tile when it arrives
    if (!items) { return `<div class="v22-ins-list" id="ma-ins-list">${window.MA_AI ? MA_AI.skel(3) : `<p class="v22-muted">${T('Loading…')}</p>`}</div>`; }
    const firstText = items.slice(0, 4).find((x) => x.kind !== 'instagram');
    return `<div class="v22-ins-list" id="ma-ins-list">${items.length ? items.slice(0, 4).map((x) => cardHtml(x, x === firstText)).join('') : (window.MA_EMPTY?MA_EMPTY.html({title:'No insights yet',text:'New AI insights about your funds and SIP dates will appear here.',mood:'sleep',small:true}):`<p class="v22-muted">${T('No insights yet.')}</p>`)}</div>
      <p class="ma-ins-disc">${T('Insights and clips are for education only — not investment advice. Past performance does not guarantee future returns.')}</p>`;
  }
  function paintTile() {
    const el = document.getElementById('ma-ins-list'); if (!el) return;
    const wrap = document.createElement('div'); wrap.innerHTML = tileHtml();
    el.replaceWith(wrap.firstElementChild);
    const disc = document.querySelector('.v22-insights .ma-ins-disc'); if (!disc && wrap.lastElementChild) document.getElementById('ma-ins-list').after(wrap.lastElementChild);
    if (window.MA_AI) MA_AI.animate(document.getElementById('ma-ins-list'));
  }
  // Instagram's own player in a dialog (no API key). If Instagram blocks the embed, the link still works.
  function openReel(it) {
    const ig = parseIg(it.url) || {}; const embed = it.embedUrl || ig.embed;
    // Instagram-style reel card: video on top, then the title and caption, then the actions
    showModal(`<span class="ma-reel-head">${igGlyph} ${T('Instagram reel')}</span>`, `<div class="v22 ma-reel-modal"><div class="ma-reel-stage"><iframe src="${esc(embed)}" title="${esc(it.title)}" allow="autoplay; encrypted-media; picture-in-picture; clipboard-write" allowfullscreen loading="lazy" referrerpolicy="strict-origin-when-cross-origin" scrolling="no"></iframe></div>
      <div class="ma-reel-cap"><b>${esc(it.title)}</b>${it.body ? `<p>${esc(it.body)}</p>` : ''}<small class="ma-reel-time">${ago(it.publishedAt)}</small>
        <div class="ma-reel-acts"><a class="v22-outline-btn" href="${esc(it.url)}" target="_blank" rel="noopener">${igGlyph} ${T('Open on Instagram')}</a></div>
        <small class="ma-reel-disc">${T('For education only — not investment advice.')}</small></div></div>`);
  }
  function openAll() {
    showModal(T('Latest AI Insights'), `<div class="v22 ma-ins-all"><div class="v22-ins-list">${(items || []).map(cardHtml).join('') || (window.MA_EMPTY?MA_EMPTY.html({title:'No insights yet',text:'New AI insights about your funds and SIP dates will appear here.',mood:'sleep'}):`<p class="v22-muted">${T('No insights yet.')}</p>`)}</div><p class="ma-ins-disc">${T('Insights and clips are for education only — not investment advice. Past performance does not guarantee future returns.')}</p></div>`);
  }
  document.addEventListener('click', (e) => {
    const r = e.target.closest('[data-ma-reel]');
    if (r) { e.preventDefault(); const id = +r.dataset.maReel; const it = (items || []).concat(adminItems || []).find((x) => x.id === id); if (it) openReel(it); return; }
    if (e.target.closest('[data-ma-ins-all]')) { e.preventDefault(); openAll(); }
  });
  // reload when the dashboard is opened (new items appear without a full reload)
  window.addEventListener('hashchange', () => { if (/#\/user\/overview|#\/user\/?$/.test(location.hash)) { items = items || null; load(); } });

  /* ---------- admin screen ---------- */
  function adminRow(it) {
    const st = { Published: 'ok', Draft: 'neutral', Hidden: 'warn' }[it.status] || 'neutral';
    const cv = it.kind === 'instagram' ? coverSrc(it) : '';
    return `<article class="ma-ins-row" data-id="${it.id}">
      <span class="ma-ins-kind ${it.kind}">${it.kind === 'instagram' ? (cv ? `<img src="${esc(cv)}" alt="">` : igGlyph) : ic(it.icon || 'trend')}</span>
      <div class="ma-ins-main"><b>${esc(it.title)}</b><small>${it.kind === 'instagram' ? `<a href="${esc(it.url)}" target="_blank" rel="noopener">${esc(it.url)}</a>` : esc((it.body || '').slice(0, 120))}</small>
        <div class="ma-ins-tags"><span class="v22-pill ${st}">${T(it.status)}</span>${it.pinned ? `<span class="v22-pill info">${T('Pinned')}</span>` : ''}<span class="v22-pill neutral">${it.kind === 'instagram' ? T('Instagram reel') : T('Text')}</span><span class="v22-muted">${T('Order')} ${it.sort} · ${ago(it.publishedAt)}</span></div></div>
      <div class="ma-ins-acts">
        ${it.kind === 'instagram' ? `<button class="v22-row-btn" data-ma-reel="${it.id}">${ic('play')} ${T('Preview')}</button>` : ''}
        <button class="v22-row-btn" data-ma-ins-edit="${it.id}">${T('Edit')}</button>
        <button class="v22-row-btn" data-ma-ins-pin="${it.id}">${it.pinned ? T('Unpin') : T('Pin')}</button>
        ${it.status === 'Published' ? `<button class="v22-row-btn" data-ma-ins-st="Hidden" data-id="${it.id}">${T('Hide')}</button>` : `<button class="v22-row-btn ok" data-ma-ins-st="Published" data-id="${it.id}">${T('Publish')}</button>`}
        <button class="v22-row-btn danger" data-ma-ins-del="${it.id}">${T('Delete')}</button></div></article>`;
  }
  async function paintAdmin() {
    const el = document.getElementById('ma-ins-admin'); if (!el) return;
    try {
      const list = await loadAdmin();
      const n = (s) => list.filter((x) => x.status === s).length;
      el.innerHTML = `${v22Kpis([['check', T('Published'), n('Published'), T('Shown on the dashboard (max 4 on the tile)'), ''], ['doc', T('Drafts'), n('Draft'), T('Not visible to users'), ''], ['cross', T('Hidden'), n('Hidden'), T('Taken down'), ''], ['chat', T('Instagram reels'), list.filter((x) => x.kind === 'instagram').length, T('Links to public reels'), '']])}
        <section class="v22-card"><div class="v22-card-head"><div><h2>${T('All items')}</h2><p>${T('Pinned items come first, then by order (lower first), then newest.')}</p></div></div>
        ${list.length ? list.map(adminRow).join('') : `<div class="v22-empty">${T('Nothing yet. Add an Instagram reel or a text insight.')}</div>`}</section>`;
    } catch (e) { el.innerHTML = `<div class="v22-empty">${esc(e.message || 'Could not load')}</div>`; }
  }
  window.adminInsights = function () {
    setTimeout(paintAdmin, 0);
    return `<div class="v22 v22-adm">${v22Head(T('Insights & Reels'), T('What users see in “Latest AI Insights” on their dashboard: Instagram reels and short text insights.'), `<button type="button" class="v22-grad-btn" data-ma-ins-new="instagram">${igGlyph} ${T('Add Instagram reel')}</button><button type="button" class="v22-outline-btn" data-ma-ins-new="text">${ic('bulb')} ${T('Add text insight')}</button>`, 'ADMIN · CONTENT')}
      <section class="v22-card ma-ins-how"><b>${T('How to add a reel')}</b><ol><li>${T('Post the reel on Mod Alpha’s public Instagram account (business or creator).')}</li><li>${T('On Instagram, tap ⋯ → Copy link.')}</li><li>${T('Click “Add Instagram reel”, paste the link, add a title, and publish.')}</li></ol><small>${T('The video stays on Instagram. If the reel is deleted, archived or the account turns private, it stops playing here — hide or delete the item.')}</small></section>
      <div id="ma-ins-admin"><div class="v22-loading"><span class="v22-spin"></span></div></div></div>`;
  };
  // the editor (new or existing)
  function editor(kind, it) {
    it = it || { kind, status: 'Draft', pinned: false, sort: 0, icon: kind === 'instagram' ? 'video' : 'trend' };
    const reel = it.kind === 'instagram';
    showModal(it.id ? T('Edit item') : reel ? T('Add Instagram reel') : T('Add text insight'), `<div class="v22 ma-ins-ed"><form id="ma-ins-form" style="display:grid;gap:12px">
      ${reel ? `<label class="v22-fl">${T('Instagram link')}<input name="url" value="${esc(it.url || '')}" placeholder="https://www.instagram.com/reel/AbC123xyz/" required autocomplete="off"><small>${T('Reel or post link from a public account.')}</small></label><div id="ma-ins-pv" class="ma-reel-frame sm" hidden></div>` : ''}
      <label class="v22-fl">${T('Title')}<input name="title" value="${esc(it.title || '')}" maxlength="120" required></label>
      <label class="v22-fl">${reel ? T('Caption (optional)') : T('Insight text')}<textarea name="body" rows="3" maxlength="600" ${reel ? '' : 'required'}>${esc(it.body || '')}</textarea></label>
      ${reel ? `<div class="v22-fl">${T('Cover image (optional)')}<div class="ma-ins-cover"><span id="ma-ins-cv">${it.cover ? `<img src="${esc(coverSrc(it))}" alt="">` : igGlyph}</span><input type="file" id="ma-ins-file" accept="image/png,image/jpeg,image/webp"><button type="button" class="v22-link-btn" id="ma-ins-cv-x"${it.cover ? '' : ' hidden'}>${T('Remove')}</button></div><small>${T('Square image works best (e.g. 400 × 400). PNG, JPEG or WebP, up to 600 KB. Without one, an Instagram-style card is shown.')}</small></div>`
        : `<label class="v22-fl">${T('Icon')}<label class="v22-select"><select name="icon">${['trend', 'calendar', 'bulb', 'bell', 'chart', 'shield', 'target'].map((x) => `<option${it.icon === x ? ' selected' : ''}>${x}</option>`).join('')}</select>${ic('chevDown')}</label></label>`}
      <div class="ma-ins-opts"><label class="v22-fl">${T('Order')}<input name="sort" type="number" min="0" max="9999" value="${it.sort || 0}"></label><div class="ma-checks"><label class="ma-check"><input type="checkbox" name="pinned"${it.pinned ? ' checked' : ''}><span>${T('Pin to the top')}</span></label><label class="ma-check"><input type="checkbox" name="publish"${it.status === 'Published' ? ' checked' : ''}><span>${T('Published (visible to users)')}</span></label></div></div>
      <p class="v22-err" id="ma-ins-err"></p><div class="v22-modal-actions"><button type="submit" class="v22-grad-btn">${T('Save')}</button></div></form></div>`);
    const f = document.getElementById('ma-ins-form'); let cover;   // undefined = unchanged, null = remove, string = new
    const pv = () => { const box = document.getElementById('ma-ins-pv'); if (!box) return; const ig = parseIg(f.url.value); box.hidden = !ig; if (ig && box.dataset.src !== ig.embed) { box.dataset.src = ig.embed; box.innerHTML = `<iframe src="${ig.embed}" title="preview" loading="lazy"></iframe>`; } };
    if (reel) { f.url.addEventListener('input', () => { document.getElementById('ma-ins-err').textContent = ''; pv(); }); pv();
      document.getElementById('ma-ins-file').onchange = (e) => { const file = e.target.files[0]; if (!file) return; if (file.size > 600 * 1024) { document.getElementById('ma-ins-err').textContent = T('The cover image must be 600 KB or smaller.'); e.target.value = ''; return; } const rd = new FileReader(); rd.onload = () => { cover = rd.result; document.getElementById('ma-ins-cv').innerHTML = `<img src="${cover}" alt="">`; document.getElementById('ma-ins-cv-x').hidden = false; }; rd.readAsDataURL(file); };
      document.getElementById('ma-ins-cv-x').onclick = () => { cover = null; document.getElementById('ma-ins-cv').innerHTML = igGlyph; document.getElementById('ma-ins-cv-x').hidden = true; document.getElementById('ma-ins-file').value = ''; }; }
    f.onsubmit = async (e) => {
      e.preventDefault(); const er = document.getElementById('ma-ins-err'); er.textContent = '';
      const body = { title: f.title.value.trim(), body: f.body.value.trim() || null, sort: +f.sort.value || 0, pinned: f.pinned.checked, status: f.publish.checked ? 'Published' : (it.status === 'Hidden' ? 'Hidden' : 'Draft') };
      if (reel) { body.url = f.url.value.trim(); if (!parseIg(body.url)) { er.textContent = T('Paste the link of an Instagram reel or post, e.g. https://www.instagram.com/reel/AbC123xyz/'); return; } if (cover !== undefined) body.cover = cover; }
      else body.icon = f.icon.value;
      if (!it.id) body.kind = it.kind;
      const btn = f.querySelector('button[type=submit]'); btn.disabled = true;
      try { await save(it.id, body); modalRoot.innerHTML = ''; notify(T('Saved.')); items = null; paintAdmin(); }
      catch (ex) { btn.disabled = false; er.textContent = (ex.details && ex.details[0] && ex.details[0].message) || ex.message; }
    };
  }
  document.addEventListener('click', async (e) => {
    const t = e.target.closest('[data-ma-ins-new],[data-ma-ins-edit],[data-ma-ins-pin],[data-ma-ins-st],[data-ma-ins-del]'); if (!t) return;
    e.preventDefault();
    const find = (id) => (adminItems || []).find((x) => x.id === +id);
    try {
      if (t.dataset.maInsNew) return editor(t.dataset.maInsNew);
      if (t.dataset.maInsEdit) return editor(null, find(t.dataset.maInsEdit));
      if (t.dataset.maInsPin) { const it = find(t.dataset.maInsPin); await save(it.id, { pinned: !it.pinned }); }
      else if (t.dataset.maInsSt) await save(+t.dataset.id, { status: t.dataset.maInsSt });
      else if (t.dataset.maInsDel) { if (!confirm(T('Delete this item? This cannot be undone.'))) return; await remove(+t.dataset.maInsDel); }
      items = null; paintAdmin();
    } catch (ex) { notify((ex.details && ex.details[0] && ex.details[0].message) || ex.message); }
  });

  // admin navigation + route
  if (typeof V22_ADMIN_NAV !== 'undefined' && !V22_ADMIN_NAV.some((x) => x[0] === 'insights')) { const i = V22_ADMIN_NAV.findIndex((x) => x[0] === 'methodology'); V22_ADMIN_NAV.splice(i + 1, 0, ['insights', 'bulb', 'Insights & Reels']); }
  const baseRenderAdmin = renderAdmin;
  renderAdmin = function (page) { if (page === 'insights') { shell('admin', 'insights', adminInsights()); return; } return baseRenderAdmin(page); };

  window.MA_INSIGHTS = { tileHtml, refresh: load, get items() { return items; }, parseIg };
})();
