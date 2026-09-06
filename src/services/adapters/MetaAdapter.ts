// ============================================================
// src/services/adapters/MetaAdapter.ts
// Adaptador para Meta Graph API v19
// Soporta: Instagram Reels + Facebook Posts / Reels
// Docs: https://developers.facebook.com/docs/instagram-api/reference/ig-media
//       https://developers.facebook.com/docs/graph-api/reference/video
// ============================================================

import axios from 'axios';
import { BaseAdapter, type ProgressCallback } from './BaseAdapter';
import type { MediaFile } from '../../types/media.types';
import type { PlatformPublishResult, PlatformId } from '../../types/platform.types';
import type { PublishPayload } from '../../types/publish.types';

const META_GRAPH_BASE = 'https://graph.facebook.com/v19.0';

export class MetaAdapter extends BaseAdapter {
  constructor(
    private readonly platformId: Extract<PlatformId, 'instagram' | 'facebook'>,
    private readonly accountId: string
  ) {
    super();
  }

  // ── 1. Upload ─────────────────────────────────────────────
  async upload(
    media: MediaFile,
    token: string,
    onProgress?: ProgressCallback
  ): Promise<string> {
    onProgress?.(5);

    if (this.platformId === 'instagram') {
      return this.uploadInstagramReel(media, token, onProgress);
    } else {
      return this.uploadFacebookVideo(media, token, onProgress);
    }
  }

  // Instagram: crear contenedor de Reels
  private async uploadInstagramReel(
    media: MediaFile,
    token: string,
    onProgress?: ProgressCallback
  ): Promise<string> {
    const res = await axios.post(
      `${META_GRAPH_BASE}/${this.accountId}/media`,
      null,
      {
        params: {
          media_type: 'REELS',
          video_url: media.uri,
          access_token: token,
        },
      }
    );

    onProgress?.(50);
    return res.data.id as string; // creation_id
  }

  // Facebook: subir video
  private async uploadFacebookVideo(
    media: MediaFile,
    token: string,
    onProgress?: ProgressCallback
  ): Promise<string> {
    const formData = new FormData();
    formData.append('access_token', token);
    formData.append('source', {
      uri: media.uri,
      type: media.mimeType,
      name: media.name,
    } as unknown as Blob);

    const res = await axios.post(
      `${META_GRAPH_BASE}/${this.accountId}/videos`,
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          if (e.total) {
            onProgress?.(Math.round((e.loaded / e.total) * 80) + 10);
          }
        },
      }
    );

    onProgress?.(90);
    return res.data.id as string;
  }

  // ── 2. Publish ────────────────────────────────────────────
  async publish(
    payload: PublishPayload,
    uploadedId: string,
    token: string
  ): Promise<string> {
    const fullCaption = [payload.caption, ...payload.hashtags].join(' ');

    if (this.platformId === 'instagram') {
      // Publicar contenedor de Instagram
      const res = await axios.post(
        `${META_GRAPH_BASE}/${this.accountId}/media_publish`,
        null,
        {
          params: {
            creation_id: uploadedId,
            caption: fullCaption,
            access_token: token,
          },
        }
      );
      return res.data.id as string;
    } else {
      // Actualizar descripción del video de Facebook
      await axios.post(
        `${META_GRAPH_BASE}/${uploadedId}`,
        null,
        {
          params: {
            description: fullCaption,
            access_token: token,
          },
        }
      );
      return uploadedId;
    }
  }

  // ── 3. Status ─────────────────────────────────────────────
  async getStatus(
    postId: string,
    token: string
  ): Promise<Pick<PlatformPublishResult, 'status' | 'postUrl' | 'errorMessage'>> {
    if (this.platformId === 'instagram') {
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
          postUrl: `https://www.instagram.com/p/${res.data.permalink ?? ''}`,
        };
      } else if (code === 'ERROR') {
        return { status: 'error', errorMessage: 'Error al procesar el Reel.' };
      }
      return { status: 'processing' };
    }

    // Facebook: el video está disponible inmediatamente
    return {
      status: 'success',
      postUrl: `https://www.facebook.com/${postId}`,
    };
  }
}
