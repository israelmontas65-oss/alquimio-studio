// ============================================================
// app/+html.tsx
// Plantilla HTML de producción web para Expo Router y PWA
// Modo Standalone Nativo y Viewport Fijo
// ============================================================

import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="es">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover"
        />

        {/* Metadatos PWA y Tema Cyber Espacial */}
        <title>Alquimia Estudio</title>
        <meta name="description" content="Plataforma Universal de Publicación y Distribución en Bloque" />
        <meta name="theme-color" content="#040711" />
        <meta name="background-color" content="#040711" />
        
        {/* Forzar limpieza de caché en el HTML para actualizaciones en tiempo real */}
        <meta httpEquiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
        <meta httpEquiv="Pragma" content="no-cache" />
        <meta httpEquiv="Expires" content="0" />

        {/* PWA para iOS Safari Standalone */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Alquimia Estudio" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <link rel="apple-touch-icon" sizes="192x192" href="/icons/icon-192.png" />
        <link rel="apple-touch-icon" sizes="512x512" href="/icons/icon-512.png" />

        {/* PWA para Android, Chrome, Edge, Firefox Standalone */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="application-name" content="Alquimia Estudio" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icons/icon-192.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/icons/icon-512.png" />

        {/* Verificación de Dominio Oficial para TikTok for Developers */}
        <meta
          name="tiktok-developers-site-verification"
          content="AUswPQAhEWWbcbmxvZKVeFse8IunJ1Fg"
        />
        <meta
          name="tiktok-developers-site-verification"
          content="tiktok-developers-site-verification=AUswPQAhEWWbcbmxvZKVeFse8IunJ1Fg"
        />

        <ScrollViewStyleReset />

        <style
          dangerouslySetInnerHTML={{
            __html: `
              * {
                box-sizing: border-box;
                margin: 0;
                padding: 0;
              }
              html, body, #root {
                height: 100%;
                width: 100%;
                margin: 0;
                padding: 0;
                background-color: #040711;
                overflow-x: hidden;
                overscroll-behavior: none;
                -webkit-tap-highlight-color: transparent;
              }
              body {
                position: fixed;
                width: 100%;
                height: 100%;
              }
              #root {
                height: 100%;
                width: 100%;
                display: flex;
                flex-direction: column;
              }
            `,
          }}
        />

        {/* Registro Automático de Service Worker con Auto-Actualización Transparente */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(function(reg) {
                    console.log('Alquimio PWA: Service Worker activo.', reg.scope);
                    reg.update();

                    reg.onupdatefound = function() {
                      var installingWorker = reg.installing;
                      if (installingWorker == null) return;
                      installingWorker.onstatechange = function() {
                        if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                          console.log('Alquimio PWA: Nueva versión detectada. Aplicando actualización...');
                          installingWorker.postMessage({ type: 'SKIP_WAITING' });
                        }
                      };
                    };
                  }).catch(function(err) {
                    console.warn('Alquimio PWA: Error al registrar SW:', err);
                  });

                  var refreshing = false;
                  navigator.serviceWorker.addEventListener('controllerchange', function() {
                    if (!refreshing) {
                      refreshing = true;
                      console.log('Alquimio PWA: Nuevo controlador activo. Recargando con los nuevos cambios...');
                      window.location.reload();
                    }
                  });
                });
              }
            `,
          }}
        />
      </head>
      <body>
        <div style={{ display: 'none' }} id="tiktok-developers-site-verification">
          tiktok-developers-site-verification=AUswPQAhEWWbcbmxvZKVeFse8IunJ1Fg
        </div>
        {children}
      </body>
    </html>
  );
}
