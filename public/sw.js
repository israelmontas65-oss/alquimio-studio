// ================================================================
// public/sw.js — Service Worker para Alquimio PWA
// Sistema de Auto-Actualización Transparente (Cero Reinstalaciones)
// ================================================================

const CACHE_NAME = 'alquimio-v1.1.0-' + Date.now();

const CORE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

self.addEventListener('install', (e) => {
  // Pre-cargar activos clave y forzar activación inmediata sin esperar
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  // Purgar automáticamente todas las cachés anteriores que no coincidan con CACHE_NAME
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((k) => {
          if (k !== CACHE_NAME) {
            console.log('SW: Purgando caché obsoleta:', k);
            return caches.delete(k);
          }
        })
      )
    )
  );
  // Tomar control inmediato de todas las ventanas y pestañas
  self.clients.claim();
});

// Receptor adicional de comandos directos
self.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Estrategias de interceptación de tráfico
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.protocol.startsWith('chrome-extension') || url.pathname.includes('/api/')) {
    return;
  }

  // 1. Network First para navegación y documentos HTML (siempre obtener la versión más fresca)
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

  // 2. Stale-While-Revalidate para assets (JS, CSS, imágenes)
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
