
const CACHE = 'speedometer-v3';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png'
];
const TIMEOUT = 1500;

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
        keys.filter(k => k.startsWith('speedometer-') && k !== CACHE)
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

    const network = fetch(req).then(async res => {
      if (res.ok && res.type === 'basic') {
        await cache.put(req, res.clone());
      }
      return res;
    });

    if (!cached) {
      try {
        return await network;
      } catch {
        if (req.mode === 'navigate') {
          return await cache.match('./index.html') ||
            await cache.match('./') ||
            new Response('Offline', { status: 503 });
        }
        return new Response('', { status: 503 });
      }
    }

    let timer;
    const timeout = new Promise(resolve => {
      timer = setTimeout(() => resolve(null), TIMEOUT);
    });

    const result = await Promise.race([network, timeout]);
    clearTimeout(timer);

    if (result) return result;

    e.waitUntil(network.catch(() => {}));
    return cached;
  })());
});
