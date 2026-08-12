const CACHE = 'sales-pwa-shell-v10-admin-local';
const SHELL = ['./','index.html','app.css','app.js','cash-top-cloud.js','admin.html','admin.css','admin.js','manifest.webmanifest','logo.png','icon-192.png','icon-512.png','apple-touch-icon.png'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.hostname.endsWith('.turso.io')) return;
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      const isAdmin = url.pathname.endsWith('/admin.html');
      const key = isAdmin ? 'admin.html' : 'index.html';
      const cached = await cache.match(key);
      const refresh = fetch(req).then(async res => {
        if (res && res.ok) await cache.put(key, res.clone());
        return res;
      }).catch(() => null);
      if (cached) { event.waitUntil(refresh); return cached; }
      return (await refresh) || new Response('Offline', {status:503});
    })());
    return;
  }
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(req);
    const refresh = fetch(req).then(async res => {
      if (res && (res.ok || res.type === 'opaque') && (url.origin === self.location.origin || url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com' || req.destination === 'image')) await cache.put(req, res.clone());
      return res;
    }).catch(() => null);
    if (cached) { event.waitUntil(refresh); return cached; }
    return (await refresh) || new Response('', {status:504});
  })());
});
self.addEventListener('message', event => { if (event.data === 'SKIP_WAITING') self.skipWaiting(); });
