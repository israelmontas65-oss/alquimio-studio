# Checklist de Verificación y QA Móvil — Alquimia PWA

Guía de control de calidad para validar la experiencia nativa, accesibilidad y ciclo de vida PWA en dispositivos móviles reales.

---

## 1. Prueba Manual con Teclado Abierto en Android (Editor de Caption - Fase 7)
- [ ] **Dispositivo / Emulador:** Android (Chrome / Samsung Internet / WebView PWA).
- [ ] **Pasos:**
  1. Abrir Alquimia Studio en el dispositivo móvil.
  2. Tocar el campo de texto de redacción táctica.
  3. Verificar que el teclado virtual se despliegue de forma fluida.
- [ ] **Criterios de Aceptación:**
  - El campo de texto activo permanece 100% visible sobre el teclado (no queda tapado ni cortado).
  - El contenedor se adapta (`KeyboardAvoidingView` / scroll elástico) sin deformar la cabecera.
  - La variable `--vh` calculada por `useViewportFix` se actualiza dinámicamente evitando el "efecto salto".
  - Al cerrar el teclado, la interfaz regresa suavemente a su posición original sin dejar franjas en blanco.

---

## 2. Auditoría Lighthouse PWA (Chrome DevTools / CLI)
- [ ] **Comando de Ejecución:**
  ```bash
  npx lighthouse https://alquimio-studio.netlify.app --view --preset=mobile
  ```
- [ ] **Criterios de Aceptación:**
  - **PWA Badge:** 100% elegible para instalación.
  - **Manifest:** Detectado correctamente con iconos maskable de 192x192 y 512x512, `display: standalone` y `theme_color: #040711`.
  - **Service Worker:** Registrado y activo, respondiendo con código 200 para soporte offline.
  - **Performance / Accesibilidad:** Puntuación > 90 en móviles.
  - **Viewport:** Configurado correctamente con `width=device-width, initial-scale=1, viewport-fit=cover`.
  - **Metadatos de Apple:** `apple-mobile-web-app-capable`, `apple-touch-icon` y `apple-mobile-web-app-status-bar-style` presentes.

---

## 3. Prueba de Actualización con Borrador en Curso (Draft Recovery)
- [ ] **Objetivo:** Verificar que el usuario no pierda contenido en redacción si se despliega una nueva versión.
- [ ] **Pasos:**
  1. En la pantalla principal, escribir un texto en el editor (ej. `"Transmisión de prueba con hashtags #Alquimia #Studio"`).
  2. Seleccionar un archivo de imagen o video si está disponible.
  3. Desplegar una nueva versión del Service Worker o simular el evento de actualización.
  4. Observar que aparezca el banner **"Nueva versión disponible"** en la parte superior.
  5. Pulsar el botón **ACTUALIZAR**.
- [ ] **Criterios de Aceptación:**
  - La aplicación NO se recarga sola de forma abrupta; espera a que el usuario pulse "ACTUALIZAR".
  - Antes del reload, `saveDraft()` almacena el estado bajo la clave `alquimio:draft:v1`.
  - Tras el reload, la app se inicializa con la nueva versión del código.
  - Al invocar `restoreDraft()`, el texto del caption y los metadatos del archivo se recuperan de manera intacta.

---

## 4. Verificación de Áreas Táctiles y Accesibilidad (Touch Targets)
- [ ] **Objetivo:** Cumplir con la pauta WCAG 2.5.5 (Target Size mínimo de 44x44px).
- [ ] **Elementos Verificados:**
  - Botones de emojis en barra táctica: uso de `hitSlop={HIT_SLOP_EMOJI}`.
  - Switches de plataformas sincronizadas: uso de `hitSlop={HIT_SLOP_SWITCH}`.
  - Botón de eliminar archivo en `MediaPreview`: uso de `hitSlop={HIT_SLOP_ICON}`.
  - Botón "+ INSTALAR PWA" y botón "✨ Optimizar con IA": `hitSlop={HIT_SLOP_44}`.
- [ ] **Criterio:** Ningún elemento interactivo requiere más de un toque para registrar la pulsación en pantallas táctiles de 320px a 430px.
