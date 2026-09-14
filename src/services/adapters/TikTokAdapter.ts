// ============================================================
// src/services/adapters/TikTokAdapter.ts
// Adaptador oficial para TikTok Content Posting API v2 (Direct Post)
// Soporta PULL_FROM_URL y FILE_UPLOAD con Throttling (máx 6 req/min, 25/día)
// Modo Sandbox: Forzado a privado (SELF_ONLY) conforme a la documentación
// Titularidad: Israel Montás
// ============================================================

import axios from 'axios';
import { BaseAdapter, type ProgressCallback } from './BaseAdapter';
import type { MediaFile } from '../../types/media.types';
import type { PlatformPublishResult } from '../../types/platform.types';
import type { PublishPayload } from '../../types/publish.types';

const TIKTOK_API_BASE = 'https://open.tiktokapis.com/v2';

// ── Control de Límites y Throttling en Memoria ────────────────
// Máximo 6 solicitudes por minuto por token de usuario
// Máximo 25 videos por cuenta por día
class TikTokRateLimiter {
  private static requestTimestamps: number[] = [];
  private static dailyUploadsCount = 0;
  private static dailyResetDate = new Date().toDateString();

  static async throttle(): Promise<void> {
    const now = Date.now();
    const today = new Date().toDateString();

    // Resetear contador diario a medianoche
    if (this.dailyResetDate !== today) {
      this.dailyResetDate = today;
      this.dailyUploadsCount = 0;
    }

    if (this.dailyUploadsCount >= 25) {
      throw new Error(
        'Límite diario de TikTok alcanzado (máximo 25 videos por cuenta por día según política oficial).'
      );
    }

    // Filtrar timestamps de los últimos 60 segundos
    const oneMinuteAgo = now - 60_000;
    this.requestTimestamps = this.requestTimestamps.filter((t) => t > oneMinuteAgo);

    // Si ya hay 6 solicitudes en el último minuto, calcular retraso
    if (this.requestTimestamps.length >= 6) {
      const oldestRequest = this.requestTimestamps[0];
      const waitTime = 60_000 - (now - oldestRequest) + 500;
      if (waitTime > 0) {
        console.log(`[TikTokRateLimiter] Throttling activo: esperando ${waitTime}ms para no exceder 6 req/min.`);
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }
    }

    this.requestTimestamps.push(Date.now());
    this.dailyUploadsCount++;
  }
}

interface TikTokInitResponse {
  data?: {
    publish_id: string;
    upload_url?: string;
  };
  error?: { code: string; message: string; log_id: string };
}

interface TikTokStatusResponse {
  data?: {
    status: 'PROCESSING_DOWNLOAD' | 'PROCESSING_UPLOAD' | 'PUBLISH_COMPLETE' | 'FAILED';
    publicaly_available_post_id?: string[];
    fail_reason?: string;
  };
  error?: { code: string; message: string };
}

export class TikTokAdapter extends BaseAdapter {
  // ── 1. Inicializar upload y enviar medio a TikTok ────────────
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

    // Aplicar Throttling (límite de 6 req/min y 25/día)
    await TikTokRateLimiter.throttle();

    const caption = (options?.title || options?.caption || '').slice(0, 2200);
    const isPublicUrl = media.uri.startsWith('http://') || media.uri.startsWith('https://');

    onProgress?.(10);

    // En fase de desarrollo/sandbox, privacy_level es forzado a 'SELF_ONLY'
    const postInfo = {
      title: caption,
      privacy_level: 'SELF_ONLY',
      disable_duet: false,
      disable_comment: false,
      disable_stitch: false,
      video_cover_timestamp_ms: 1000,
    };

    let initBody: any;
    if (isPublicUrl) {
      // Modo PULL_FROM_URL: TikTok descarga el medio directamente desde la URL pública
      initBody = {
        post_info: postInfo,
        source_info: {
          source: 'PULL_FROM_URL',
          video_url: media.uri,
        },
      };
    } else {
      // Modo FILE_UPLOAD: Obtener upload_url y transferir binario
      initBody = {
        post_info: postInfo,
        source_info: {
          source: 'FILE_UPLOAD',
          video_size: media.size,
          chunk_size: media.size,
          total_chunk_count: 1,
        },
      };
    }

    const initRes = await axios.post<TikTokInitResponse>(
      `${TIKTOK_API_BASE}/post/publish/video/init/`,
      initBody,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json; charset=UTF-8',
        },
      }
    );

    if (initRes.data.error?.code && initRes.data.error.code !== 'ok') {
      throw new Error(`TikTok API error: ${initRes.data.error.message}`);
    }

    const publishId = initRes.data.data?.publish_id;
    if (!publishId) {
      throw new Error('TikTok API: No se recibió publish_id.');
    }

    // Si fue PULL_FROM_URL, TikTok inicia la descarga automáticamente
    if (isPublicUrl) {
      onProgress?.(80);
      return publishId;
    }

    // Si fue FILE_UPLOAD, subir el binario a upload_url
    const uploadUrl = initRes.data.data?.upload_url;
    if (!uploadUrl) {
      throw new Error('TikTok API: No se recibió upload_url para FILE_UPLOAD.');
    }

    onProgress?.(25);
    const fileBlob = await fetch(media.uri).then((r) => r.blob());

    await axios.put(uploadUrl, fileBlob, {
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Range': `bytes 0-${media.size - 1}/${media.size}`,
        'Content-Length': String(media.size),
      },
      onUploadProgress: (e) => {
        if (e.total) {
          const pct = Math.round((e.loaded / e.total) * 65) + 25;
          onProgress?.(pct);
        }
      },
    });

    onProgress?.(90);
    return publishId;
  }

  // ── 2. Publicar (el init ya inicia la publicación en TikTok) ──
  async publish(
    _payload: PublishPayload,
    publishId: string,
    _token: string
  ): Promise<string> {
    return publishId;
  }

  // ── 3. Consultar estado de procesamiento ─────────────────────
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

    const data = res.data?.data;
    if (!data) {
      return { status: 'processing' };
    }

    switch (data.status) {
      case 'PUBLISH_COMPLETE':
        return {
          status: 'success',
          postUrl: data.publicaly_available_post_id?.[0]
            ? `https://www.tiktok.com/video/${data.publicaly_available_post_id[0]}`
            : 'https://www.tiktok.com',
        };
      case 'FAILED':
        return {
          status: 'error',
          errorMessage: data.fail_reason || 'Error en el procesamiento de TikTok.',
        };
      default:
        // 'PROCESSING_DOWNLOAD' | 'PROCESSING_UPLOAD'
        return { status: 'processing' };
    }
  }
}
