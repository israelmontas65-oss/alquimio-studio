// ============================================================
// src/services/adapters/TikTokAdapter.ts
// Adaptador para TikTok Content Posting API v2
// Docs: https://developers.tiktok.com/doc/content-posting-api-reference-direct-post
// ============================================================

import { Platform } from 'react-native';
import axios from 'axios';
import { BaseAdapter, type ProgressCallback } from './BaseAdapter';
import type { MediaFile } from '../../types/media.types';
import type { PlatformPublishResult } from '../../types/platform.types';
import type { PublishPayload } from '../../types/publish.types';

const TIKTOK_API_BASE = 'https://open.tiktokapis.com/v2';

interface TikTokInitResponse {
  data: {
    publish_id: string;
    upload_url: string;
  };
  error: { code: string; message: string; log_id: string };
}

interface TikTokStatusResponse {
  data: {
    status: 'PROCESSING_DOWNLOAD' | 'PROCESSING_UPLOAD' | 'PUBLISH_COMPLETE' | 'FAILED';
    publicaly_available_post_id?: string[];
    fail_reason?: string;
  };
  error: { code: string; message: string };
}

export class TikTokAdapter extends BaseAdapter {
  // ── 1. Inicializar upload y obtener URL firmada ──────────
  async upload(
    media: MediaFile,
    token: string,
    onProgress?: ProgressCallback,
    options?: { caption?: string; title?: string }
  ): Promise<string> {
    if (media.type !== 'video') {
      throw new Error('TikTok requiere formato de video (.mp4, .webm o .mov).');
    }

    if (media.duration && media.duration < 3) {
      throw new Error('El video debe durar al menos 3 segundos para TikTok.');
    }
    if (media.duration && media.duration > 600) {
      throw new Error('El video supera los 10 minutos permitidos por TikTok.');
    }

    const caption = (options?.title || options?.caption || '').slice(0, 2200);

    // Inicializar el post en TikTok Content Posting API v2
    const initRes = await axios.post<TikTokInitResponse>(
      `${TIKTOK_API_BASE}/post/publish/video/init/`,
      {
        post_info: {
          title: caption,
          privacy_level: 'PUBLIC_TO_EVERYONE',
          disable_duet: false,
          disable_comment: false,
          disable_stitch: false,
          video_cover_timestamp_ms: 1000,
        },
        source_info: {
          source: 'FILE_UPLOAD',
          video_size: media.size,
          chunk_size: media.size,
          total_chunk_count: 1,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json; charset=UTF-8',
        },
      }
    );

    if (initRes.data.error?.code !== 'ok' && initRes.data.error?.message) {
      throw new Error(`TikTok API error: ${initRes.data.error.message}`);
    }

    if (!initRes.data.data?.upload_url) {
      throw new Error('No se recibió upload_url de la API de TikTok.');
    }

    const { publish_id, upload_url } = initRes.data.data;

    // Subir el archivo binario (compatible con Web y React Native)
    onProgress?.(15);

    const fileBlob = await fetch(media.uri).then((r) => r.blob());

    await axios.put(upload_url, fileBlob, {
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Range': `bytes 0-${media.size - 1}/${media.size}`,
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
    return publish_id;
  }

  // ── 2. Publicar (el init ya lanza la publicación en TikTok) ──
  async publish(
    payload: PublishPayload,
    publishId: string,
    _token: string
  ): Promise<string> {
    // En TikTok Content Posting API, el "init" + upload ya dispara la publicación.
    // publish_id es el identificador a monitorear.
    return publishId;
  }

  // ── 3. Consultar estado de procesamiento ─────────────────
  async getStatus(
    publishId: string,
    token: string
  ): Promise<Pick<PlatformPublishResult, 'status' | 'postUrl' | 'errorMessage'>> {
    const res = await axios.post<TikTokStatusResponse>(
      `${TIKTOK_API_BASE}/post/publish/status/fetch/`,
      { publish_id: publishId },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json; charset=UTF-8',
        },
      }
    );

    const { status, publicaly_available_post_id, fail_reason } = res.data.data;

    switch (status) {
      case 'PUBLISH_COMPLETE':
        return {
          status: 'success',
          postUrl: publicaly_available_post_id?.[0]
            ? `https://www.tiktok.com/video/${publicaly_available_post_id[0]}`
            : undefined,
        };
      case 'FAILED':
        return { status: 'error', errorMessage: fail_reason ?? 'Error desconocido en TikTok.' };
      default:
        return { status: 'processing' };
    }
  }
}
