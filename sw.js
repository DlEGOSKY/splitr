/* ============================================================
   SW.JS — Splitr v1.0
   Usa rutas relativas para funcionar tanto en local como en GitHub Pages
   ============================================================ */

const CACHE_NAME = 'splitr-v1.1';

// Rutas relativas al scope del SW — funcionan en cualquier subdirectorio
const PRECACHE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/base.css',
  './css/animations.css',
  './css/components.css',
  './css/themes.css',
  './js/main.js',
  './js/state.js',
  './js/participants.js',
  './js/selector.js',
  './js/audio.js',
  './js/storage.js',
  './js/ui.js',
  './js/icons.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-192.svg',
  './icons/icon-512.svg',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      Promise.allSettled(
        PRECACHE_ASSETS.map(url =>
          cache.add(new Request(url, { cache: 'reload' }))
            .catch(err => console.warn('[SW] No se pudo cachear:', url, err.message))
        )
      )
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => {
          console.log('[SW] Eliminando caché antigua:', k);
          return caches.delete(k);
        })
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

  if (url.origin === self.location.origin) {
    event.respondWith(cacheFirst(event.request));
  } else if (
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('fonts.gstatic.com')
  ) {
    event.respondWith(staleWhileRevalidate(event.request));
  }
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response(
      '<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><title>Splitr</title></head><body style="background:#090912;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;text-align:center;"><div><h1 style="color:#00F5FF;">Splitr</h1><p>Sin conexión — abre cuando tengas internet</p></div></body></html>',
      { headers: { 'Content-Type': 'text/html' } }
    );
  }
}

async function staleWhileRevalidate(request) {
  const cache  = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  const fetchP = fetch(request).then(r => {
    if (r.ok) cache.put(request, r.clone());
    return r;
  }).catch(() => null);
  return cached || await fetchP;
}
