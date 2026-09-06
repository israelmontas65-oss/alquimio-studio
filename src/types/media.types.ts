// ============================================================
// src/types/media.types.ts
// Tipos para archivos multimedia seleccionados
// ============================================================

export type MediaType = 'video' | 'image' | 'document';

export type AspectRatio = '9:16' | '16:9' | '1:1' | '4:5' | 'unknown';

export interface MediaFile {
  uri: string;
  type: MediaType;
  mimeType: string;
  name: string;
  size: number;          // bytes
  duration?: number;     // segundos (solo video)
  width?: number;
  height?: number;
  aspectRatio?: AspectRatio;
  thumbnail?: string;    // URI de la miniatura generada
}

export interface ValidationResult {
  isValid: boolean;
  warnings: string[];
  errors: string[];
  platformCompatibility: Record<string, boolean>;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}
