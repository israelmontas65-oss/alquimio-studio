// ============================================================
// src/types/publish.types.ts
// Tipos para el proceso de publicación
// ============================================================

import type { PlatformId, PlatformPublishResult } from './platform.types';
import type { MediaFile } from './media.types';

export interface PlatformCustomSettings {
  platformId: PlatformId;
  title?: string;           // YouTube: título del video
  thumbnail?: string;       // YouTube: URI miniatura personalizada
  privacyStatus?: 'public' | 'private' | 'unlisted';
  coverTimestamp?: number;  // TikTok: segundo para miniatura
  firstComment?: string;    // Primer comentario automático
  tags?: string[];          // Tags adicionales por red
}

export interface PublishPayload {
  caption: string;
  hashtags: string[];
  media: MediaFile;
  activePlatforms: PlatformId[];
  platformSettings: Partial<Record<PlatformId, PlatformCustomSettings>>;
  scheduledAt?: Date;       // Para publicación programada (futuro)
}

export type PublishSessionStatus =
  | 'idle'
  | 'validating'
  | 'publishing'
  | 'completed'
  | 'partial_error';

export interface PublishSession {
  id: string;
  status: PublishSessionStatus;
  payload: PublishPayload;
  results: PlatformPublishResult[];
  startedAt?: Date;
  completedAt?: Date;
}
