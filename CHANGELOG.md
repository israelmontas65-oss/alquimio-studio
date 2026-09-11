# Historial de Versiones — Alquimia Studio

Documento oficial de cambios y evolución continua de la plataforma.

---

## [v1.1.0] — 2026-09-11
### Novedades y Mejoras Clave
- **Radar de Tendencias y Motor de Aprendizaje Continuo:** Agente adaptativo que pondera el pulso de mercado en tiempo real con el historial personal del creador.
- **Histórico en Cloudflare D1 (SQL) y Modo Resiliente:** Seguimiento de aceleración semana a semana con fallback a caché edge si las APIs externas presentan latencia.
- **Optimización de Rendimiento y Arranque Ultra-Rápido:** Activación de Hermes AOT, carga diferida (lazy loading) de modales secundarios y agentes de IA, y compresión profunda de assets estáticos de 4.4 MB a <350 KB.
- **Auto-Actualización Silenciosa e Inteligente de la PWA:** La app detecta y aplica nuevas versiones sin botones manuales, respetando publicaciones o ediciones en curso.
- **Laboratorio de Ganchos A/B:** Selector de variantes con cálculo predictivo de retención inicial y estimador de alcance.

---

## [v1.0.8] — 2026-09-08
### Novedades y Mejoras Clave
- **Arquitectura de Seguridad Empresarial:** Hashing con Argon2id/PBKDF2-SHA512, verificación de brechas HIBP con k-anonimato y 2FA TOTP (RFC 6238).
- **Tokenización Stripe PCI DSS SAQ-A:** Aislamiento criptográfico para pagos y suscripciones.
- **Transparencia Legal:** Sección 10 detallada en `/privacy` y `/privacy-en.html` para auditoría de Meta, Google y TikTok.

---

## [v1.0.5] — 2026-09-07
### Novedades y Mejoras Clave
- **Integración Oficial OAuth 2.0:** Flujo de autorización robusto con TikTok Login Kit, YouTube Data API v3 y Meta Graph API.
- **Rotación Criptográfica de Tokens:** Manejo seguro de credenciales con refresh tokens y revocación inmediata.

---

## [v1.0.0] — 2026-09-06
### Novedades y Mejoras Clave
- **Lanzamiento Oficial de Alquimia Studio:** Publicación multimedia simultánea en bloque hacia TikTok, Instagram Reels, YouTube Shorts y Facebook.
- **Diseño Cyber-Espacial Universal:** Interfaz nativa responsive en modo oscuro con componentes SVG puros sin dependencias de fuentes de iconos.
