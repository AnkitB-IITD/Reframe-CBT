/* Reframe service worker — offline-first app shell cache.
 * Bump CACHE on any release so clients pull fresh assets. */
const CACHE = 'reframe-v2';

const SHELL = [
  'index.html',
  'manifest.webmanifest',
  'icon.svg',
  'icon-maskable.svg',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/maskable-192.png',
  'icons/maskable-512.png',
  'icons/apple-touch-icon.png',
  'icons/favicon-32.png',
  'styles/tokens.css',
  'styles/app.css',
  'styles/print.css',
  'src/app.js',
  'src/router.js',
  'src/db.js',
  'src/content.js',
  'src/ui.js',
  'src/insights.js',
  'src/views/home.js',
  'src/views/wizard.js',
  'src/views/history.js',
  'src/views/detail.js',
  'src/views/insights-view.js',
  'src/views/settings.js',
  'src/views/onboarding.js',
  'src/views/lock.js',
  'src/views/crisis.js',
  'src/views/learn.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      // addAll is atomic; if one asset 404s the whole install fails, so be tolerant
      .then((cache) => Promise.allSettled(SHELL.map((url) => cache.add(url))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // never touch cross-origin

  // Navigations: serve cached shell first so the app opens instantly offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      caches.match('index.html').then((cached) => cached || fetch(request))
    );
    return;
  }

  // Static assets: cache-first, then network, and backfill the cache.
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((res) => {
        if (res && res.status === 200 && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return res;
      }).catch(() => cached);
    })
  );
});
