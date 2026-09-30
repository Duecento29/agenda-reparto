const C='agenda-reparto-v7-6-online';
const APP_SHELL=['./manifest.webmanifest','./icon-192.png','./icon-512.png'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(C).then(cache => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(key => key !== C).map(key => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  // HTML/navigation: always try the network first.
  if (event.request.mode === 'navigate') {
    event.respondWith((async () => {
      const cache = await caches.open(C);
      try {
        const fresh = await fetch(event.request, { cache: 'no-store' });
        if (fresh && fresh.ok) {
          await cache.put('./index.html', fresh.clone());
        }
        return fresh;
      } catch (err) {
        return (await cache.match('./index.html')) || Response.error();
      }
    })());
    return;
  }

  // Static local assets: cache-first with background refresh.
  event.respondWith((async () => {
    const cache = await caches.open(C);
    const cached = await cache.match(event.request);
    const networkPromise = fetch(event.request).then(response => {
      if (response && response.ok) {
        cache.put(event.request, response.clone());
      }
      return response;
    }).catch(() => null);

    return cached || (await networkPromise) || Response.error();
  })());
});
