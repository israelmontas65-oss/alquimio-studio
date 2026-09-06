// ================================================================
// public/service-worker.js
// Service Worker para Alquimio PWA
// Activa el botón "Instalar aplicación" en Chrome Android
// ================================================================

const CACHE_NAME = 'alquimio-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/assets/images/icon.png',
  '/assets/images/favicon.png',
];

// ── Instalación: pre-cachea assets críticos ─────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {
        // Continuar aunque falle el precaché (assets opcionales)
      });
    })
  );
  // Activa el SW inmediatamente sin esperar a que se cierre la pestaña vieja
  self.skipWaiting();
});

// ── Activación: limpia caches viejas ────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  // Toma control de todas las pestañas abiertas inmediatamente
  self.clients.claim();
});

// ── Fetch: Network First con fallback a caché ───────────────────
self.addEventListener('fetch', (event) => {
  // Solo interceptar peticiones GET del mismo origen
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith(self.location.origin)) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Guarda en caché una copia de la respuesta fresca
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => {
        // Si no hay red, sirve desde caché
        return caches.match(event.request).then(
          (cached) => cached || new Response('Offline — sin conexión', { status: 503 })
        );
      })
  );
});
