/* Mod Alpha API client — cookie sessions with automatic refresh.
   Config comes from config/env.js (generated per environment by scripts/build-web.mjs). */
(function () {
  const ENV = window.MA_ENV || {};
  const BASE = (ENV.API_BASE_URL || '').replace(/\/$/, '');
  class ApiError extends Error { constructor(status, body) { super(body?.error?.message || `Request failed (${status})`); this.status = status; this.code = body?.error?.code; this.details = body?.error?.details; } }
  // One refresh at a time: parallel 401s share the same POST /auth/refresh.
  // Resolves { ok, reason } — reason is 'idle' | 'absolute' when the session ended because of a timeout.
  let refreshing = null;
  async function refresh() {
    if (!refreshing) refreshing = fetch(`${BASE}/api/v1/auth/refresh`, { method: 'POST', credentials: 'include', headers: { 'content-type': 'application/json' }, body: '{}' })
      .then(async (r) => ({ ok: r.ok, reason: r.ok ? null : (await r.json().catch(() => null))?.error?.details?.reason || null }))
      .catch(() => ({ ok: false, reason: null }))
      .finally(() => setTimeout(() => (refreshing = null), 0));
    return refreshing;
  }
  async function request(method, path, body, opts = {}) {
    const isForm = typeof FormData !== 'undefined' && body instanceof FormData;
    const init = { method, credentials: 'include', headers: isForm ? {} : { 'content-type': 'application/json' } };
    if (opts.background) init.headers['x-ma-background'] = '1';   // not user activity (see session timeouts)
    if (body !== undefined) init.body = isForm ? body : JSON.stringify(body);
    let res = await fetch(`${BASE}/api/v1${path}`, init);
    // Access token expired (15 min) → renew it silently and retry once. If the session itself ended
    // (inactivity / absolute limit / logout elsewhere) the retry is skipped and the 401 goes to the page.
    let endReason = null;
    if (res.status === 401 && !opts.noRefresh && !path.startsWith('/auth/')) { const rf = await refresh(); if (rf.ok) res = await fetch(`${BASE}/api/v1${path}`, init); else endReason = rf.reason; }
    if (opts.raw) { if (!res.ok) throw new ApiError(res.status, await res.json().catch(() => null)); return res; }
    const text = await res.text();
    let data = null; try { data = text ? JSON.parse(text) : null; } catch { data = text; }
    if (!res.ok) {
      const e = new ApiError(res.status, data);
      // tell the page the session is gone, with the reason when it was a timeout
      if (res.status === 401 && opts.onUnauthorized !== false) window.dispatchEvent(new CustomEvent('ma:unauthorized', { detail: { reason: endReason || e.details?.reason || null } }));
      throw e;
    }
    return data;
  }
  const qs = (o) => { const p = Object.entries(o || {}).filter(([, v]) => v !== undefined && v !== null && v !== ''); return p.length ? '?' + p.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&') : ''; };
  window.MA_API = {
    enabled: !!BASE, base: BASE, env: ENV.APP_ENV || 'demo', ApiError, qs,
    get: (p, q, o) => request('GET', p + qs(q), undefined, o),
    post: (p, b, o) => request('POST', p, b ?? {}, o),
    put: (p, b, o) => request('PUT', p, b, o),
    patch: (p, b, o) => request('PATCH', p, b, o),
    del: (p, o) => request('DELETE', p, undefined, o),
    download: async (p, q, filename) => { const r = await request('GET', p + qs(q), undefined, { raw: true }); const blob = await r.blob(); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 5000); },
  };
})();
