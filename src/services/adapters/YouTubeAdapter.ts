// ============================================================
// src/services/adapters/YouTubeAdapter.ts
// Adaptador oficial para YouTube Data API v3 — Subida Reanudable (Resumable Upload)
// Documentación y cuota: videos.insert consume 1,600 unidades de cuota por video.
// Con la cuota estándar de 10,000 unidades/día se soportan hasta 6 subidas diarias (9,600 unidades).
// Titularidad: Israel Montás
// ============================================================

import axios from 'axios';
import { BaseAdapter, type ProgressCallback } from './BaseAdapter';
import type { MediaFile } from '../../types/media.types';
import type { PlatformPublishResult } from '../../types/platform.types';
import type { PublishPayload } from '../../types/publish.types';

const YT_UPLOAD_BASE = 'https://www.googleapis.com/upload/youtube/v3';
const YT_API_BASE = 'https://www.googleapis.com/youtube/v3';

export class YouTubeAdapter extends BaseAdapter {
  // ── 1. Iniciar Sesión de Subida Reanudable (Resumable Upload) ──
  async upload(
    media: MediaFile,
    token: string,
    onProgress?: ProgressCallback,
    options?: { caption?: string; title?: string }
  ): Promise<string> {
    if (media.type === 'image') {
      throw new Error('YouTube solo admite formato de video (.mp4, .mov).');
    }

    const title = (options?.title || options?.caption || 'Alquimia Short').substring(0, 100);
    const description = options?.caption || '';

    onProgress?.(5);

    // Iniciar sesión reanudable
    // POST https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status
    const initRes = await axios.post(
      `${YT_UPLOAD_BASE}/videos?uploadType=resumable&part=snippet,status`,
      {
        snippet: {
          title,
          description,
          tags: ['Shorts', 'Alquimia'],
          categoryId: '22', // People & Blogs
        },
        status: {
          privacyStatus: 'public',
          selfDeclaredMadeForKids: false,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json; charset=UTF-8',
          'X-Upload-Content-Length': String(media.size),
          'X-Upload-Content-Type': media.mimeType || 'video/mp4',
        },
      }
    );

    const uploadUrl = initRes.headers['location'] as string;
    if (!uploadUrl) {
      throw new Error('YouTube: No se obtuvo URL de upload reanudable en la cabecera Location.');
    }

    onProgress?.(15);

    // Subir el archivo binario hacia la URL reanudable
    const fileBlob = await fetch(media.uri).then((r) => r.blob());

    const uploadRes = await axios.put(uploadUrl, fileBlob, {
      headers: {
        'Content-Type': media.mimeType || 'video/mp4',
        'Content-Length': String(media.size),
      },
      onUploadProgress: (e) => {
        if (e.total) {
          const pct = Math.round((e.loaded / e.total) * 75) + 15;
          onProgress?.(pct);
        }
      },
    });

    onProgress?.(90);
    return uploadRes.data.id as string; // YouTube video ID
  }

  // ── 2. Confirmación de Metadatos ──────────────────────────────
  async publish(
    _payload: PublishPayload,
    videoId: string,
    _token: string
  ): Promise<string> {
    return videoId;
  }

  // ── 3. Monitoreo Asíncrono del Procesamiento de YouTube ──────
  async getStatus(
    videoId: string,
    token: string
  ): Promise<Pick<PlatformPublishResult, 'status' | 'postUrl' | 'errorMessage'>> {
    try {
      const res = await axios.get(`${YT_API_BASE}/videos`, {
        params: {
          part: 'status,processingDetails',
          id: videoId,
        },
        headers: { Authorization: `Bearer ${token}` },
      });

      const item = res.data.items?.[0];
      if (!item) return { status: 'error', errorMessage: 'Video de YouTube no encontrado.' };

      const uploadStatus = item.status?.uploadStatus as string;

      switch (uploadStatus) {
        case 'processed':
          return {
            status: 'success',
            postUrl: `https://www.youtube.com/shorts/${videoId}`,
          };
        case 'failed':
        case 'rejected':
          return {
            status: 'error',
            errorMessage: item.status?.failureReason || 'Error al procesar video en YouTube.',
          };
        default:
          // 'uploaded' | 'processing'
          return { status: 'processing' };
      }
    } catch (err: unknown) {
      return { status: 'processing' };
    }
  }
}
