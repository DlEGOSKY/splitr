/* ============================================================
   SW.JS — Service Worker con estrategia cache-first
   Garantiza funcionamiento 100% offline tras primera visita
   ============================================================ */

const CACHE_NAME = 'quien-paga-v1';

// Archivos a cachear en la instalación
const PRECACHE_ASSETS = [
  '/index.html',
  '/manifest.json',
  '/css/base.css',
  '/css/animations.css',
  '/css/components.css',
  '/css/themes.css',
  '/js/main.js',
  '/js/state.js',
  '/js/participants.js',
  '/js/selector.js',
  '/js/audio.js',
  '/js/storage.js',
  '/js/ui.js',
  '/js/icons.js',
  '/icons/icon-192.svg',
  '/icons/icon-512.svg',
];

// ── INSTALACIÓN: precachear todos los assets ──
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SW] Precacheando assets...');
      // Cachear de forma tolerante: si uno falla, continúa
      return Promise.allSettled(
        PRECACHE_ASSETS.map(url =>
          cache.add(url).catch(err =>
            console.warn(`[SW] No se pudo cachear ${url}:`, err)
          )
        )
      );
    }).then(() => self.skipWaiting())
  );
});

// ── ACTIVACIÓN: limpiar cachés anteriores ──
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => {
            console.log('[SW] Eliminando caché antigua:', key);
            return caches.delete(key);
          })
      )
    ).then(() => self.clients.claim())
  );
});

// ── FETCH: estrategia cache-first ──
// Para assets propios: sirve del caché. Si no está, fetch + cachear.
// Para Google Fonts y otros externos: network-first con fallback.
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Solo manejar GET
  if (event.request.method !== 'GET') return;

  // Estrategia según el origen
  if (url.origin === self.location.origin) {
    // Assets propios: CACHE FIRST
    event.respondWith(cacheFirst(event.request));
  } else if (url.hostname.includes('fonts.googleapis.com') ||
             url.hostname.includes('fonts.gstatic.com')) {
    // Google Fonts: STALE WHILE REVALIDATE
    event.respondWith(staleWhileRevalidate(event.request));
  }
  // Para otros orígenes, dejar pasar al navegador (no interceptar)
});

// ── ESTRATEGIA: Cache First ──
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
    // Sin red y sin caché: devolver respuesta offline genérica
    return new Response(
      '<!DOCTYPE html><html><body><h1>Sin conexión</h1><p>Recarga cuando tengas internet.</p></body></html>',
      { headers: { 'Content-Type': 'text/html' } }
    );
  }
}

// ── ESTRATEGIA: Stale While Revalidate ──
async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request).then(response => {
    if (response.ok) cache.put(request, response.clone());
    return response;
  }).catch(() => null);

  return cached || await fetchPromise;
}
