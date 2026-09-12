// ================================================================
// public/sw.js — Service Worker para Alquimia Estudio PWA
// Sistema de Auto-Actualización Transparente (Cero Reinstalaciones)
// ================================================================

/**
 * CACHE_NAME: Identificador único de caché para la PWA de Alquimia Studio.
 * 
 * NOTA DE MANTENIMIENTO OBLIGATORIA:
 * Este identificador DEBE incrementarse o actualizarse con la versión / build
 * correspondiente en cada nuevo despliegue a producción. Al cambiar el valor,
 * el evento 'activate' purgará de inmediato todas las cachés anteriores,
 * garantizando que los usuarios reciban los activos más recientes y evitando
 * que queden retenidos en versiones viejas por stale-while-revalidate.
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
  // Pre-cargar activos clave de forma resiliente y forzar activación inmediata sin esperar
  e.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      const results = await Promise.allSettled(
        CORE_ASSETS.map(async (asset) => {
          try {
            const res = await fetch(asset);
            if (!res || !res.ok) {
              throw new Error(`HTTP ${res ? res.status : 'desconocido'}`);
            }
            await cache.put(asset, res);
          } catch (err) {
            console.warn(`[SW] Advertencia: No se pudo precachear el asset "${asset}":`, err && err.message ? err.message : err);
            throw err;
          }
        })
      );
      const exitosos = results.filter((r) => r.status === 'fulfilled').length;
      console.log(`[SW] Precache completado: ${exitosos}/${CORE_ASSETS.length} activos cacheados con éxito.`);
    })
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
            console.log('[SW] Purgando caché obsoleta:', k);
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
  if (
    url.protocol.startsWith('chrome-extension') ||
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/webhooks/')
  ) {
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
