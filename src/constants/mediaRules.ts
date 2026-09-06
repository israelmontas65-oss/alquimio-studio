// ============================================================
// src/constants/mediaRules.ts
// Reglas de validación multimedia por plataforma
// ============================================================

import type { PlatformId } from '../types/platform.types';

export interface MediaRule {
  platformId: PlatformId;
  allowedMimeTypes: string[];
  minWidth: number;
  minHeight: number;
  maxWidth: number;
  maxHeight: number;
  preferredAspectRatio: string;   // e.g. "9:16"
  maxDurationSec: number;
  maxFileSizeMB: number;
  notes: string;
}

export const MEDIA_RULES: Record<PlatformId, MediaRule> = {
  tiktok: {
    platformId: 'tiktok',
    allowedMimeTypes: ['video/mp4', 'video/webm', 'video/quicktime'],
    minWidth: 540,
    minHeight: 960,
    maxWidth: 1080,
    maxHeight: 1920,
    preferredAspectRatio: '9:16',
    maxDurationSec: 600,
    maxFileSizeMB: 4096,
    notes: 'Vertical 9:16 recomendado. Mínimo 540×960.',
  },
  instagram: {
    platformId: 'instagram',
    allowedMimeTypes: ['video/mp4', 'video/quicktime', 'image/jpeg', 'image/png'],
    minWidth: 500,
    minHeight: 888,
    maxWidth: 1080,
    maxHeight: 1920,
    preferredAspectRatio: '9:16',
    maxDurationSec: 900,
    maxFileSizeMB: 1024,
    notes: 'Reels: mínimo 500×888. 23.976–60 fps.',
  },
  youtube: {
    platformId: 'youtube',
    allowedMimeTypes: ['video/mp4', 'video/quicktime', 'video/avi', 'video/x-ms-wmv'],
    minWidth: 1080,
    minHeight: 1920,
    maxWidth: 1080,
    maxHeight: 1920,
    preferredAspectRatio: '9:16',
    maxDurationSec: 60,
    maxFileSizeMB: 256,
    notes: 'Shorts: máx. 60s, vertical obligatorio.',
  },
  whatsapp: {
    platformId: 'whatsapp',
    allowedMimeTypes: [
      'video/mp4',
      'video/3gpp',
      'image/jpeg',
      'image/png',
      'application/pdf',
    ],
    minWidth: 0,
    minHeight: 0,
    maxWidth: 9999,
    maxHeight: 9999,
    preferredAspectRatio: '9:16',
    maxDurationSec: 30,
    maxFileSizeMB: 16,
    notes: 'Estado: máx. 30s video, 16 MB.',
  },
  facebook: {
    platformId: 'facebook',
    allowedMimeTypes: ['video/mp4', 'video/quicktime', 'image/jpeg', 'image/png', 'image/gif'],
    minWidth: 0,
    minHeight: 0,
    maxWidth: 9999,
    maxHeight: 9999,
    preferredAspectRatio: '16:9',
    maxDurationSec: 14400,
    maxFileSizeMB: 10240,
    notes: 'Amplio soporte de formatos y duraciones.',
  },
};

/**
 * Calcula el aspect ratio como string "W:H" simplificado.
 */
export function getAspectRatioLabel(width: number, height: number): string {
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  const divisor = gcd(width, height);
  return `${width / divisor}:${height / divisor}`;
}

/**
 * Devuelve true si el ratio es aproximadamente 9:16 (vertical).
 */
export function isVertical(width: number, height: number): boolean {
  const ratio = width / height;
  return ratio < 0.6; // 9/16 ≈ 0.5625
}
