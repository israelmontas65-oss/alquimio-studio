// ============================================================
// src/constants/platforms.ts
// Configuración de cada plataforma social soportada
// ============================================================

import { COLORS } from './colors';
import type { PlatformConfig, PlatformId } from '../types/platform.types';

export const PLATFORMS: Record<PlatformId, PlatformConfig> = {
  tiktok: {
    id: 'tiktok',
    name: 'TikTok',
    handle: '@tu_cuenta',
    iconName: 'logo-tiktok',
    iconColor: '#FFFFFF',
    accentColor: COLORS.platforms.tiktokPink,
    supportsVideo: true,
    supportsImage: false,
    supportsDocument: false,
    maxDurationSec: 600,    // 10 min
    maxFileSizeMB: 4096,    // 4 GB
    requiresVertical: true,
  },
  instagram: {
    id: 'instagram',
    name: 'Instagram Reels',
    handle: '@tu_cuenta',
    iconName: 'logo-instagram',
    iconColor: COLORS.platforms.instagram,
    accentColor: COLORS.platforms.instagramGradientEnd,
    supportsVideo: true,
    supportsImage: true,
    supportsDocument: false,
    maxDurationSec: 900,    // 15 min
    maxFileSizeMB: 1024,
    requiresVertical: true,
  },
  youtube: {
    id: 'youtube',
    name: 'YouTube Shorts',
    handle: '@tu_canal',
    iconName: 'logo-youtube',
    iconColor: COLORS.platforms.youtube,
    accentColor: COLORS.platforms.youtube,
    supportsVideo: true,
    supportsImage: false,
    supportsDocument: false,
    maxDurationSec: 60,     // Shorts = 60s
    maxFileSizeMB: 256,
    requiresVertical: true,
  },
  whatsapp: {
    id: 'whatsapp',
    name: 'WhatsApp Business',
    handle: 'Estado',
    iconName: 'logo-whatsapp',
    iconColor: COLORS.platforms.whatsapp,
    accentColor: COLORS.platforms.whatsapp,
    supportsVideo: true,
    supportsImage: true,
    supportsDocument: true,
    maxDurationSec: 30,     // Estado = 30s
    maxFileSizeMB: 16,
    requiresVertical: false,
  },
  facebook: {
    id: 'facebook',
    name: 'Facebook',
    handle: '@tu_pagina',
    iconName: 'logo-facebook',
    iconColor: COLORS.platforms.facebook,
    accentColor: COLORS.platforms.facebook,
    supportsVideo: true,
    supportsImage: true,
    supportsDocument: false,
    maxDurationSec: 14400,  // 4 horas
    maxFileSizeMB: 10240,   // 10 GB
    requiresVertical: false,
  },
};

// Orden de visualización en la UI
export const PLATFORM_ORDER: PlatformId[] = [
  'tiktok',
  'instagram',
  'youtube',
  'whatsapp',
  'facebook',
];
