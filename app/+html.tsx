// ============================================================
// app/+html.tsx
// Plantilla HTML de producción web para Expo Router y PWA
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
          content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover"
        />

        {/* Metadatos PWA y Tema */}
        <title>Alquimio Studio</title>
        <meta name="description" content="Plataforma Universal de Publicación y Distribución en Bloque" />
        <meta name="theme-color" content="#080C14" />
        <meta name="background-color" content="#080C14" />

        {/* PWA para iOS Safari */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Alquimio" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <link rel="apple-touch-icon" sizes="192x192" href="/icons/icon-192.png" />
        <link rel="apple-touch-icon" sizes="512x512" href="/icons/icon-512.png" />

        {/* PWA para Android, Chrome, Edge, Firefox */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="application-name" content="Alquimio" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icons/icon-192.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/icons/icon-512.png" />

        <ScrollViewStyleReset />

        <style
          dangerouslySetInnerHTML={{
            __html: `
              * {
                box-sizing: border-box;
              }
              html, body, #root {
                height: 100%;
                background-color: #080C14;
                overscroll-behavior: none;
                -webkit-tap-highlight-color: transparent;
              }
            `,
          }}
        />

        {/* Registro Automático de Service Worker */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js')
                    .then(function(reg) {
                      console.log('Alquimio PWA: Service Worker activo.', reg.scope);
                    })
                    .catch(function(err) {
                      console.warn('Alquimio PWA: Error al registrar SW:', err);
                    });
                });
              }
            `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
