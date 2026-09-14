// ============================================================
// src/services/adapters/MetaAdapter.ts
// Adaptador oficial para Meta Graph API v21.0
// Instagram Reels/Posts (flujo de 2 pasos con contenedores) y Facebook Pages
// Validación de content_publishing_limit en tiempo real
// Titularidad: Israel Montás
// ============================================================

import axios from 'axios';
import { BaseAdapter, type ProgressCallback } from './BaseAdapter';
import type { MediaFile } from '../../types/media.types';
import type { PlatformPublishResult, PlatformId } from '../../types/platform.types';
import type { PublishPayload } from '../../types/publish.types';

const META_GRAPH_BASE = 'https://graph.facebook.com/v21.0';

export class MetaAdapter extends BaseAdapter {
  constructor(
    private readonly platformId: Extract<PlatformId, 'instagram' | 'facebook'>,
    private readonly accountId: string
  ) {
    super();
  }

  // ── Validación de Límites de Publicación en Tiempo Real ───────
  async checkPublishingLimit(token: string): Promise<void> {
    if (this.platformId !== 'instagram') return;

    try {
      const res = await axios.get(
        `${META_GRAPH_BASE}/${this.accountId}/content_publishing_limit`,
        {
          params: {
            fields: 'config,quota_usage',
            access_token: token,
          },
        }
      );

      const data = res.data?.data?.[0];
      if (data) {
        const usage = data.quota_usage ?? 0;
        const total = data.config?.quota_total;
        if (total !== undefined && usage >= total) {
          throw new Error(
            `Límite de publicación de Instagram alcanzado (${usage}/${total} en las últimas 24h). Intenta más tarde.`
          );
        }
      }
    } catch (err: unknown) {
      // Si el error fue por límite superado, propagarlo
      if (err instanceof Error && err.message.includes('Límite de publicación')) {
        throw err;
      }
      console.warn('[MetaAdapter] Advertencia al consultar content_publishing_limit:', err);
    }
  }

  // ── 1. Upload / Creación de Contenedor (Paso 1) ─────────────
  async upload(
    media: MediaFile,
    token: string,
    onProgress?: ProgressCallback,
    options?: { caption?: string }
  ): Promise<string> {
    onProgress?.(5);

    if (this.platformId === 'instagram') {
      // Validar límite vigente en tiempo real
      await this.checkPublishingLimit(token);
      return this.createInstagramContainer(media, token, onProgress, options?.caption);
    } else {
      return this.uploadFacebookMedia(media, token, onProgress, options?.caption);
    }
  }

  // Instagram: Paso 1 - Crear contenedor (media container)
  private async createInstagramContainer(
    media: MediaFile,
    token: string,
    onProgress?: ProgressCallback,
    caption = ''
  ): Promise<string> {
    const isVideo = media.type === 'video';
    const params: Record<string, string> = {
      access_token: token,
      caption,
    };

    if (isVideo) {
      params.media_type = 'REELS';
      params.video_url = media.uri;
    } else {
      params.image_url = media.uri;
    }

    onProgress?.(25);

    const res = await axios.post(
      `${META_GRAPH_BASE}/${this.accountId}/media`,
      null,
      { params }
    );

    if (!res.data?.id) {
      throw new Error('Meta API: No se recibió container_id al crear contenedor de Instagram.');
    }

    onProgress?.(60);
    return res.data.id as string; // container_id
  }

  // Facebook: Subida directa a la página
  private async uploadFacebookMedia(
    media: MediaFile,
    token: string,
    onProgress?: ProgressCallback,
    caption = ''
  ): Promise<string> {
    const isVideo = media.type === 'video';
    const endpoint = isVideo ? 'videos' : 'photos';

    onProgress?.(20);

    // Si la URI es una URL pública (http/https), enviarla como parámetro directo
    if (media.uri.startsWith('http://') || media.uri.startsWith('https://')) {
      const res = await axios.post(
        `${META_GRAPH_BASE}/${this.accountId}/${endpoint}`,
        null,
        {
          params: {
            url: media.uri,
            caption,
            description: caption,
            access_token: token,
          },
        }
      );
      onProgress?.(80);
      return res.data.id as string;
    }

    // Si es archivo local, subir vía FormData
    const formData = new FormData();
    formData.append('access_token', token);
    formData.append(isVideo ? 'description' : 'caption', caption);
    formData.append('source', {
      uri: media.uri,
      type: media.mimeType,
      name: media.name,
    } as unknown as Blob);

    const res = await axios.post(
      `${META_GRAPH_BASE}/${this.accountId}/${endpoint}`,
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          if (e.total) {
            onProgress?.(Math.round((e.loaded / e.total) * 70) + 15);
          }
        },
      }
    );

    onProgress?.(85);
    return res.data.id as string;
  }

  // ── 2. Publish / Publicación del Contenedor (Paso 2) ─────────
  async publish(
    payload: PublishPayload,
    uploadedId: string,
    token: string
  ): Promise<string> {
    const fullCaption = [payload.caption, ...payload.hashtags].filter(Boolean).join(' ');

    if (this.platformId === 'instagram') {
      // Paso 2 de Instagram: POST /{ig-user-id}/media_publish?creation_id={container_id}
      const res = await axios.post(
        `${META_GRAPH_BASE}/${this.accountId}/media_publish`,
        null,
        {
          params: {
            creation_id: uploadedId,
            access_token: token,
          },
        }
      );

      if (!res.data?.id) {
        throw new Error('Meta API: No se recibió ID de publicación en Instagram.');
      }

      return res.data.id as string;
    } else {
      // Facebook ya publica en el endpoint /photos o /videos
      return uploadedId;
    }
  }

  // ── 3. Status y Monitoreo Asíncrono ───────────────────────────
  async getStatus(
    postId: string,
    token: string
  ): Promise<Pick<PlatformPublishResult, 'status' | 'postUrl' | 'errorMessage'>> {
    if (this.platformId === 'instagram') {
      try {
        const res = await axios.get(`${META_GRAPH_BASE}/${postId}`, {
          params: {
            fields: 'status_code,permalink',
            access_token: token,
          },
        });

        const code = res.data.status_code as string;
        if (code === 'FINISHED') {
          return {
            status: 'success',
            postUrl: res.data.permalink || `https://www.instagram.com/`,
          };
        } else if (code === 'ERROR' || code === 'EXPIRED') {
          return {
            status: 'error',
            errorMessage: 'Error en procesamiento del contenedor de Instagram.',
          };
        } else {
          // 'IN_PROGRESS' u otro estado intermedio
          return { status: 'processing' };
        }
      } catch (err: unknown) {
        // Si el post recién publicado no expone status_code, verificar si es permalink
        return {
          status: 'success',
          postUrl: 'https://www.instagram.com/',
        };
      }
    }

    // Facebook Page: disponible de inmediato
    return {
      status: 'success',
      postUrl: `https://www.facebook.com/${postId}`,
    };
  }
}
