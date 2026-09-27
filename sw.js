// Change VERSION when updating the offline page or icons.
const VERSION = 'v1';
const PREFIX = 'psych-battle-pwa-' + encodeURIComponent(self.registration.scope) + '-';
const CACHE = PREFIX + VERSION;
const OFFLINE = new URL('./offline.html', self.registration.scope).href;
const ASSETS = ['offline.html', 'icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png']
  .map(path => new URL(path, self.registration.scope).href);
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)));
});
// Use the normal worker lifecycle; do not interrupt an ongoing match to update.
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(key => key.startsWith(PREFIX) && key !== CACHE).map(key => caches.delete(key))
  )));
});
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin ||
      !url.href.startsWith(self.registration.scope)) return;
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(async () =>
      (await caches.open(CACHE)).match(OFFLINE)
    ));
  }
  else if (ASSETS.includes(url.href)) {
    event.respondWith(caches.open(CACHE).then(async cache =>
      (await cache.match(request)) || fetch(request)
    ));
  }
  // Game scripts, authentication, Firebase data and audio use normal networking.
});
