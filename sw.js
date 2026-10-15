
const CACHE = 'speedometer-v2';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE && k.startsWith('speedometer-'))
          .map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  const url = new URL(req.url);

  if (req.method !== 'GET' || url.origin !== self.location.origin) return;

  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(req);

    const refresh = fetch(req).then(res => {
      if (res.ok && res.type === 'basic') {
        cache.put(req, res.clone()).catch(() => {});
      }
      return res;
    });

    if (cached) {
      e.waitUntil(refresh.catch(() => {}));
      return cached;
    }

    try {
      return await refresh;
    } catch {
      if (req.mode === 'navigate') {
        return await cache.match('./index.html') ||
          await cache.match('./') ||
          new Response('Offline', { status: 503 });
      }
      return new Response('', { status: 503 });
    }
  })());
});
