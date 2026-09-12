# Alquimia Studio

> **Plataforma Integral de Publicación Multi-Red y Centro de Automatización**  
> Titularidad y Autoría: **Israel Montás** (permanente e inalterable).

---

## 1. Arquitectura del Sistema

Alquimia Studio está construida sobre una arquitectura desacoplada de alto rendimiento:
- **Frontend Móvil y Web**: Expo + React Native (TypeScript estricto, componentes inline SVG puros, interfaz espacial `#080C14` con acentos neón `#00FFD4` y `#F5C518`).
- **Backend Serverless**: Cloudflare Pages Functions + Cloudflare KV.
  - **Puente de Webhooks Central**: Recepción, verificación criptográfica (HMAC-SHA256), idempotencia (TTL 24h) y enrutamiento agnóstico.
  - **Motor Central de Eventos**: Normalización canónica de eventos entrantes (`EventoEntrante`) y generación de respuestas salientes (`EventoSaliente`) con soporte para IA (Gemini / Workers AI) y plantillas heurísticas resilientes.
  - **Publicador Multi-Plataforma**: Orquestación de publicaciones adaptando formatos según compatibilidad nativa de cada API.

---

## 2. Tipos de Contenido Soportados

El sistema contempla cinco tipos de contenido fuente (`TipoContenido`):
- `video`: Soportado nativamente en TikTok, Instagram (Reels), Facebook y YouTube.
- `imagen`: Soportado nativamente en Instagram (Feed/Carrusel), Facebook y TikTok (Photo-Slideshow vía Content Posting API).
- `audio`: No soportado como post nativo independiente en redes sociales (TikTok, Instagram, Facebook, YouTube y Threads exigen o requieren envolver en video MP4).
- `plantilla` / `boceto`: Tipos abstractos de Alquimia Studio; se exportan y publican como `imagen` (render plano) o como `video` (si contienen animación).

---

## 3. Futuro / Roadmap: Integración con Google Drive

> [!NOTE]
> **Nota de Alcance Futuro (No implementada en la fase actual)**

- **Objetivo**: Permitir al usuario enviar y respaldar **documentos y activos de producción** (guiones, exportaciones maestras, reportes de métricas, archivos de proyecto) directamente hacia su cuenta personal de Google Drive.
- **Diferenciación de Arquitectura**: Google Drive es una plataforma de **almacenamiento en la nube**, no una red social de difusión pública. Por ello, **no forma parte del flujo de `orquestar-publicacion`** ni de las redes sociales del botón *"PUBLICAR EN BLOQUE"*.
- **Implementación Técnica Planificada**:
  - Módulo independiente: *"Exportar / Respaldar en Drive"*.
  - Protocolo: Google Drive REST API v3 con flujo OAuth 2.0 independiente (scope `https://www.googleapis.com/auth/drive.file` para acceso restringido a archivos creados por la app).
  - Almacenamiento seguro de tokens de actualización (Refresh Tokens) en Cloudflare KV cifrado.

---

## 4. Licencia y Derechos de Autor

Desarrollado y mantenido por **Israel Montás**. Todos los derechos reservados.  
Sujeto a los términos de `LICENSE`, `GEMINI.md` y la firma de seguridad inalterable en `src/security/authorSignature.ts`.
