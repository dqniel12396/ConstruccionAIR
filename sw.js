const CACHE_NAME = 'otech-airnet-v2';
const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './plataforma_web/portal.html',
  './plataforma_web/publico.html',
  './plataforma_web/mapa-estaciones.html',
  './plataforma_web/airnet-core.js',
  './plataforma_web/panel-empresa.css',
  './plataforma_web/panel-empresa.js',
  './plataforma_web/portal-auth.js',
  './plataforma_web/mapa-estaciones.js',
  './plataforma_web/bogota-base.svg',
  './gemelo_digital_3d/index.html',
  './gemelo_digital_3d/styles.css',
  './gemelo_digital_3d/app.js',
  './assets/vendor/tailwindcss.js',
  './assets/vendor/chart.umd.min.js',
  './assets/vendor/lucide.min.js',
  './assets/vendor/supabase.js',
  './assets/vendor/three/three.min.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_URLS).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(resp => {
        if (resp && resp.status === 200) {
          const copy = resp.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
        }
        return resp;
      }).catch(() => cached || Response.error());
    })
  );
});
