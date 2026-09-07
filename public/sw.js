// ================================================================
// public/sw.js — Service Worker Avanzado (Elite PWA Standard)
// Actualizaciones en Tiempo Real y Estrategias Dinámicas
// ================================================================

// Versión dinámica (Forzar actualización de caché)
const CACHE_VERSION = 'alquimio-v3-' + new Date().getTime();
const STATIC_CACHE = 'alquimio-static-v3';
const DYNAMIC_CACHE = 'alquimio-dynamic-v3';

// Archivos críticos que deben guardarse siempre para soporte offline
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

self.addEventListener('install', (e) => {
  // Instalación inicial: Pre-caché de recursos críticos
  e.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(CORE_ASSETS))
  );
  // NOTA: skipWaiting ahora es desencadenado desde la app vía 'postMessage' para una transición fluida.
});

self.addEventListener('activate', (e) => {
  // Limpieza de cachés antiguas para prevenir datos fantasmas
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((k) => {
          if (k !== STATIC_CACHE && k !== DYNAMIC_CACHE) {
            console.log('SW: Limpiando caché obsoleta', k);
            return caches.delete(k);
          }
        })
      )
    )
  );
  // Toma el control inmediato de todas las ventanas y pestañas
  self.clients.claim();
});

// Receptor de comandos para actualizaciones en tiempo real (Triggered by index.html / +html.tsx)
self.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'SKIP_WAITING') {
    console.log('SW: Actualización inmediata autorizada. Forzando skipWaiting...');
    self.skipWaiting();
  }
});

// Estrategias de Interceptación Inteligente de Tráfico
self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);

  // Excluir peticiones de API, websockets, y extensiones
  if (
    req.method !== 'GET' ||
    url.protocol.startsWith('chrome-extension') ||
    url.pathname.includes('/api/') ||
    req.headers.get('accept').includes('text/event-stream')
  ) {
    return;
  }

  // 1. ESTRATEGIA PARA NAVEGACIÓN Y HTML: Network First (Siempre la última versión)
  if (req.mode === 'navigate' || req.headers.get('accept').includes('text/html')) {
    e.respondWith(
      fetch(req)
        .then((networkRes) => {
          const clone = networkRes.clone();
          caches.open(STATIC_CACHE).then((cache) => cache.put(req, clone));
          return networkRes;
        })
        .catch(() => caches.match(req).then((cachedRes) => cachedRes || caches.match('/')))
    );
    return;
  }

  // 2. ESTRATEGIA PARA ASSETS (JS, CSS, Imágenes): Stale-While-Revalidate (Carga instantánea)
  e.respondWith(
    caches.match(req).then((cachedRes) => {
      const fetchPromise = fetch(req)
        .then((networkRes) => {
          if (networkRes && networkRes.status === 200) {
            const clone = networkRes.clone();
            caches.open(DYNAMIC_CACHE).then((cache) => cache.put(req, clone));
          }
          return networkRes;
        })
        .catch(() => null);

      // Si existe en caché, devolverlo al instante. En paralelo, actualizar el caché.
      return cachedRes || fetchPromise.then((res) => res || new Response('Offline', { status: 503 }));
    })
  );
});
