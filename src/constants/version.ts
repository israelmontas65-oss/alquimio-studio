// ============================================================
// src/constants/version.ts
// Configuración y Trazabilidad de Versiones — Alquimia Studio
// Titularidad y Autoría: Israel Montás
// ============================================================

import Constants from 'expo-constants';

export const APP_VERSION =
  Constants.expoConfig?.version ||
  process.env.EXPO_PUBLIC_APP_VERSION ||
  '1.1.0';

export const BUILD_DATE = '2026-09-11';

export interface ChangelogItem {
  version: string;
  date: string;
  title: string;
  highlights: string[];
  isCurrent?: boolean;
}

export const CHANGELOG_HISTORY: ChangelogItem[] = [
  {
    version: '1.1.0',
    date: '11 de Septiembre, 2026',
    title: 'Motor de Aprendizaje Continuo & Optimización de Rendimiento',
    isCurrent: true,
    highlights: [
      'Radar de Tendencias en tiempo real con histórico semana a semana en Cloudflare D1 (SQL).',
      'Optimización extrema de arranque con motor Hermes AOT y carga diferida (lazy loading).',
      'Actualización automática y silenciosa de la PWA con protección de borradores y publicaciones.',
      'Laboratorio de ganchos A/B con predicción de retención algorítmica y estimador de alcance.',
    ],
  },
  {
    version: '1.0.8',
    date: '8 de Septiembre, 2026',
    title: 'Seguridad Empresarial & Verificación Oficial',
    highlights: [
      'Protección criptográfica con Argon2id y verificación de brechas HIBP con k-anonimato.',
      'Autenticación de dos factores (2FA TOTP RFC 6238) y tokenización Stripe PCI DSS SAQ-A.',
      'Sección 10 de auditoría técnica en la Política de Seguridad y Términos de Servicio.',
    ],
  },
  {
    version: '1.0.5',
    date: '7 de Septiembre, 2026',
    title: 'OAuth 2.0 y Protocolos Multiplataforma',
    highlights: [
      'Integración con TikTok Login Kit (client_key), YouTube Data API v3 y Meta Graph API.',
      'Almacenamiento blindado de tokens de sesión y rotación automática de credenciales.',
    ],
  },
  {
    version: '1.0.0',
    date: '6 de Septiembre, 2026',
    title: 'Lanzamiento Oficial de Alquimia Studio',
    highlights: [
      'Publicación multimedia simultánea en bloque para TikTok, Reels, Shorts y Facebook.',
      'Arquitectura visual responsive con interfaz cósmica (#040711) y componentes SVG puros.',
    ],
  },
];
