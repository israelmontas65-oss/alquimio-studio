// ============================================================
// src/types/platform.types.ts
// Tipos para plataformas de publicación
// ============================================================

export type PlatformId =
  | 'tiktok'
  | 'instagram'
  | 'youtube'
  | 'whatsapp'
  | 'facebook';

export interface PlatformConfig {
  id: PlatformId;
  name: string;
  handle: string;
  iconName: string;        // Ionicons name
  iconColor: string;       // Color oficial de la plataforma
  accentColor: string;     // Color de borde activo
  supportsVideo: boolean;
  supportsImage: boolean;
  supportsDocument: boolean;
  maxDurationSec: number;  // 0 = sin límite
  maxFileSizeMB: number;
  requiresVertical: boolean; // 9:16 obligatorio
}

export interface ConnectedAccount {
  platformId: PlatformId;
  userId: string;
  displayName: string;
  avatarUrl?: string;
  isConnected: boolean;
  expiresAt?: number; // Unix timestamp
}

export type PlatformStatus =
  | 'idle'
  | 'uploading'
  | 'processing'
  | 'publishing'
  | 'success'
  | 'error';

export interface PlatformPublishResult {
  platformId: PlatformId;
  status: PlatformStatus;
  progress: number;        // 0–100
  postUrl?: string;
  errorMessage?: string;
  postId?: string;
}
