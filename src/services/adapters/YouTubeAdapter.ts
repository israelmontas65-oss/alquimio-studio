// ============================================================
// src/services/adapters/YouTubeAdapter.ts
// Adaptador para YouTube Data API v3 – Subida de Shorts
// Docs: https://developers.google.com/youtube/v3/docs/videos/insert
// ============================================================

import axios from 'axios';
import { BaseAdapter, type ProgressCallback } from './BaseAdapter';
import type { MediaFile } from '../../types/media.types';
import type { PlatformPublishResult } from '../../types/platform.types';
import type { PublishPayload } from '../../types/publish.types';

const YT_UPLOAD_BASE = 'https://www.googleapis.com/upload/youtube/v3';
const YT_API_BASE = 'https://www.googleapis.com/youtube/v3';

export class YouTubeAdapter extends BaseAdapter {
  // ── 1. Iniciar Resumable Upload Session ──────────────────
  async upload(
    media: MediaFile,
    token: string,
    onProgress?: ProgressCallback
  ): Promise<string> {
    // Iniciar upload session
    const initRes = await axios.post(
      `${YT_UPLOAD_BASE}/videos?uploadType=resumable&part=snippet,status`,
      {
        snippet: {
          title: 'Alquimio Short',
          description: '',
          tags: [],
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
          'X-Upload-Content-Type': media.mimeType,
        },
      }
    );

    const uploadUrl = initRes.headers['location'] as string;
    if (!uploadUrl) {
      throw new Error('YouTube: No se obtuvo URL de upload.');
    }

    onProgress?.(10);

    // Subir el archivo con seguimiento de progreso
    const fileBlob = await fetch(media.uri).then((r) => r.blob());

    const uploadRes = await axios.put(uploadUrl, fileBlob, {
      headers: {
        'Content-Type': media.mimeType,
        'Content-Length': String(media.size),
      },
      onUploadProgress: (e) => {
        if (e.total) {
          const pct = Math.round((e.loaded / e.total) * 80) + 10;
          onProgress?.(pct);
        }
      },
    });

    onProgress?.(90);
    return uploadRes.data.id as string; // YouTube video ID
  }

  // ── 2. Actualizar metadata (título, descripción, hashtags) ──
  async publish(
    payload: PublishPayload,
    videoId: string,
    token: string
  ): Promise<string> {
    const ytSettings = payload.platformSettings['youtube'];
    const title = (ytSettings?.title ?? payload.caption.substring(0, 100)) || 'Alquimio Short';
    const description = [payload.caption, ...payload.hashtags].join(' ');

    await axios.put(
      `${YT_API_BASE}/videos?part=snippet,status`,
      {
        id: videoId,
        snippet: {
          title,
          description,
          tags: payload.hashtags.map((h) => h.replace('#', '')),
          categoryId: '22',
        },
        status: {
          privacyStatus: ytSettings?.privacyStatus ?? 'public',
          selfDeclaredMadeForKids: false,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return videoId;
  }

  // ── 3. Consultar estado de procesamiento ─────────────────
  async getStatus(
    videoId: string,
    token: string
  ): Promise<Pick<PlatformPublishResult, 'status' | 'postUrl' | 'errorMessage'>> {
    const res = await axios.get(`${YT_API_BASE}/videos`, {
      params: {
        part: 'status,processingDetails',
        id: videoId,
      },
      headers: { Authorization: `Bearer ${token}` },
    });

    const item = res.data.items?.[0];
    if (!item) return { status: 'error', errorMessage: 'Video no encontrado.' };

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
          errorMessage: item.status?.failureReason ?? 'Error en YouTube.',
        };
      default:
        return { status: 'processing' };
    }
  }
}
