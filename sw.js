/* ============================================================
   SW.JS — Splitr v1.0
   GitHub Pages: https://DIEGOSKY.github.io/splitr
   ============================================================ */

const CACHE_NAME = 'splitr-v1.0';
const BASE = '/splitr';

const PRECACHE_ASSETS = [
  `${BASE}/index.html`,
  `${BASE}/manifest.json`,
  `${BASE}/css/base.css`,
  `${BASE}/css/animations.css`,
  `${BASE}/css/components.css`,
  `${BASE}/css/themes.css`,
  `${BASE}/js/main.js`,
  `${BASE}/js/state.js`,
  `${BASE}/js/participants.js`,
  `${BASE}/js/selector.js`,
  `${BASE}/js/audio.js`,
  `${BASE}/js/storage.js`,
  `${BASE}/js/ui.js`,
  `${BASE}/js/icons.js`,
  `${BASE}/icons/icon-192.png`,
  `${BASE}/icons/icon-512.png`,
  `${BASE}/icons/icon-192.svg`,
  `${BASE}/icons/icon-512.svg`,
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      Promise.allSettled(
        PRECACHE_ASSETS.map(url =>
          cache.add(url).catch(err =>
            console.warn('[SW] No se pudo cachear:', url, err)
          )
        )
      )
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
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
      '<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><title>Splitr</title></head><body style="background:#090912;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;text-align:center;"><div><h1 style="color:#00F5FF;font-size:2rem;">Splitr</h1><p>Sin conexión — abre cuando tengas internet</p></div></body></html>',
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
