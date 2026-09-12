// ================================================================
// public/sw.js — Service Worker para Alquimia Estudio PWA
// Sistema de Auto-Actualización Transparente (Cero Reinstalaciones)
// ================================================================

/**
 * CACHE_NAME: DEBE incrementarse en cada despliegue a producción.
 * Al cambiar este valor, 'activate' purga automáticamente las cachés
 * anteriores, evitando que usuarios queden atascados en versiones viejas.
 */
const CACHE_NAME = 'alquimia-v1.1.2-build-20260912';

const CORE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/privacy.html',
  '/privacy-en.html',
  '/terms.html',
  '/eliminar-datos.html',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-192-maskable.png',
  '/icons/icon-512-maskable.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      const results = await Promise.allSettled(
        CORE_ASSETS.map(async (asset) => {
          const res = await fetch(asset);
          if (!res || !res.ok) {
            throw new Error(`HTTP ${res ? res.status : 'sin respuesta'}`);
          }
          await cache.put(asset, res);
        })
      );
      results.forEach((r, i) => {
        if (r.status === 'rejected') {
          console.warn(`[SW] No se pudo precachear "${CORE_ASSETS[i]}":`, r.reason);
        }
      });
      const exitosos = results.filter((r) => r.status === 'fulfilled').length;
      console.log(`[SW] Precache: ${exitosos}/${CORE_ASSETS.length} activos cacheados.`);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((k) => {
          if (k !== CACHE_NAME) {
            console.log('[SW] Purgando caché obsoleta:', k);
            return caches.delete(k);
          }
        })
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (
    url.protocol.startsWith('chrome-extension') ||
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/webhooks/')
  ) {
    return;
  }

  if (req.mode === 'navigate' || req.headers.get('accept')?.includes('text/html')) {
    e.respondWith(
      fetch(req)
        .then((networkRes) => {
          if (networkRes && networkRes.status === 200) {
            const clone = networkRes.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          }
          return networkRes;
        })
        .catch(() => caches.match(req).then((cachedRes) => cachedRes || caches.match('/')))
    );
    return;
  }

  e.respondWith(
    caches.match(req).then((cachedRes) => {
      const fetchPromise = fetch(req)
        .then((networkRes) => {
          if (networkRes && networkRes.status === 200) {
            const clone = networkRes.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          }
          return networkRes;
        })
        .catch(() => null);

      return cachedRes || fetchPromise.then((res) => res || new Response('Offline', { status: 503 }));
    })
  );
});
