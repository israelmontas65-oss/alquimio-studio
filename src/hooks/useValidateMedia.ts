// ============================================================
// src/hooks/useValidateMedia.ts
// Validación multimedia contra las reglas de cada plataforma
// ============================================================

import { useMemo } from 'react';
import { MEDIA_RULES } from '../constants/mediaRules';
import type { MediaFile, ValidationResult } from '../types/media.types';
import type { PlatformId } from '../types/platform.types';

export function useValidateMedia(
  media: MediaFile | null,
  activePlatforms: Set<PlatformId>
): ValidationResult {
  return useMemo(() => {
    if (!media) {
      return {
        isValid: false,
        warnings: [],
        errors: ['No hay archivo seleccionado.'],
        platformCompatibility: {},
      };
    }

    const errors: string[] = [];
    const warnings: string[] = [];
    const compatibility: Record<string, boolean> = {};

    for (const platformId of activePlatforms) {
      const rule = MEDIA_RULES[platformId];
      let compatible = true;

      // ── Tipo MIME ──────────────────────────────────────────
      if (!rule.allowedMimeTypes.includes(media.mimeType)) {
        compatible = false;
        errors.push(
          `${platformId.toUpperCase()}: Formato "${media.mimeType}" no soportado.`
        );
      }

      // ── Tamaño de archivo ──────────────────────────────────
      const sizeMB = media.size / (1024 * 1024);
      if (sizeMB > rule.maxFileSizeMB) {
        compatible = false;
        errors.push(
          `${platformId.toUpperCase()}: Archivo demasiado grande (${sizeMB.toFixed(1)} MB > ${rule.maxFileSizeMB} MB).`
        );
      }

      // ── Duración (video) ────────────────────────────────────
      if (media.type === 'video' && media.duration !== undefined) {
        if (media.duration > rule.maxDurationSec) {
          compatible = false;
          errors.push(
            `${platformId.toUpperCase()}: Duración ${Math.round(media.duration)}s supera el máximo (${rule.maxDurationSec}s).`
          );
        }
      }

      // ── Dimensiones mínimas ────────────────────────────────
      if (media.width && media.height) {
        if (
          rule.minWidth > 0 &&
          (media.width < rule.minWidth || media.height < rule.minHeight)
        ) {
          warnings.push(
            `${platformId.toUpperCase()}: Resolución ${media.width}×${media.height} es menor a la mínima recomendada ${rule.minWidth}×${rule.minHeight}.`
          );
        }

        // ── Ratio vertical ──────────────────────────────────
        if (rule.preferredAspectRatio === '9:16') {
          const isVert = media.width / media.height < 0.6;
          if (!isVert) {
            warnings.push(
              `${platformId.toUpperCase()}: Se recomienda formato vertical 9:16 para mayor alcance.`
            );
          }
        }
      }

      compatibility[platformId] = compatible;
    }

    return {
      isValid: errors.length === 0,
      warnings,
      errors,
      platformCompatibility: compatibility,
    };
  }, [media, activePlatforms]);
}
