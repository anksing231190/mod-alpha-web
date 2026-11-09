/* Mod Alpha service worker — makes the site installable and quick to reopen.
   • App files (scripts, styles, images, fonts) are cached per build (__BUILD__ is replaced by build-web.mjs).
   • Pages: network first, the cached copy only when offline. API calls and config are never cached:
     money, plans and personal data always come fresh from the server.
   • Notifications: shows a push message and opens the link it carries when tapped. */
const BUILD = '__BUILD__';
const CACHE = `ma-app-${BUILD}`;

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(['./', 'index.html', 'manifest.webmanifest', 'assets/app/icon-192.png'])).catch(() => {}));
  self.skipWaiting();
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith('ma-app-') && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;           // API on another host, POSTs: untouched
  if (/\/api\//.test(url.pathname) || /\/config\/env\.js$/.test(url.pathname)) return; // never cached
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then((r) => { const copy = r.clone(); caches.open(CACHE).then((c) => c.put('index.html', copy)); return r; }).catch(() => caches.match('index.html')));
    return;
  }
  if (/\.(js|css|png|svg|jpg|webp|woff2?|webmanifest)$/.test(url.pathname)) {
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((r) => { if (r.ok) { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); } return r; })));
  }
});
self.addEventListener('push', (e) => {
  let d = {}; try { d = e.data ? e.data.json() : {}; } catch (err) { d = { body: e.data && e.data.text() }; }
  e.waitUntil(self.registration.showNotification(d.title || 'Mod Alpha', { body: d.body || '', icon: 'assets/app/icon-192.png', badge: 'assets/app/icon-192.png', data: { link: d.link || '#/user/overview' }, tag: d.tag }));
});
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const link = (e.notification.data && e.notification.data.link) || '#/user/overview';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((all) => {
    const w = all.find((c) => 'focus' in c); if (w) { w.navigate ? w.navigate('./' + link) : null; return w.focus(); }
    return self.clients.openWindow('./' + link);
  }));
});
