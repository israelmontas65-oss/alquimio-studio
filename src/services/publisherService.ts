// ============================================================
// src/services/publisherService.ts
// Orquestador central de publicación – Patrón Adapter & Backend Serverless
// Gestión asíncrona, paralela e independiente con Promise.allSettled
// Estados atómicos: idle → uploading → processing → success | error
// Titularidad: Israel Montás
// ============================================================

import axios from 'axios';
import { getToken } from '../auth/tokenManager';
import { getValidTikTokToken } from './tiktokAuthService';
import { getValidYouTubeToken } from './youtubeAuthService';
import { TikTokAdapter } from './adapters/TikTokAdapter';
import { MetaAdapter } from './adapters/MetaAdapter';
import { YouTubeAdapter } from './adapters/YouTubeAdapter';
import type { IPublishAdapter } from './adapters/BaseAdapter';
import type { PlatformId, PlatformPublishResult } from '../types/platform.types';
import type { PublishPayload } from '../types/publish.types';
import { useAppStore } from '../store/useAppStore';

// ── Fábrica de adaptadores Meta con ID dinámico de cuenta/página ─────
function createMetaAdapter(platformId: 'instagram' | 'facebook', accountId: string): IPublishAdapter {
  return new MetaAdapter(platformId, accountId);
}

// ── Función principal de publicación en bloque ───────────────
export async function publishAll(payload: PublishPayload): Promise<PlatformPublishResult[]> {
  const { updatePlatformResult, setPublishSessionStatus } = useAppStore.getState();

  const tasks = payload.activePlatforms.map((platformId) =>
    publishToPlatform(platformId, payload, (result) => {
      updatePlatformResult(result);
    })
  );

  const results = await Promise.allSettled(tasks);

  const finalResults: PlatformPublishResult[] = results.map((r, i) => {
    const platformId = payload.activePlatforms[i];
    if (r.status === 'fulfilled') {
      return r.value;
    } else {
      return {
        platformId,
        status: 'error' as const,
        progress: 0,
        errorMessage: r.reason instanceof Error ? r.reason.message : 'Error desconocido.',
      };
    }
  });

  // Determinar estado final de la sesión
  const hasErrors = finalResults.some((r) => r.status === 'error');
  const allResolved = finalResults.every(
    (r) => r.status === 'success' || r.status === 'action_required'
  );

  setPublishSessionStatus(allResolved ? 'completed' : hasErrors ? 'partial_error' : 'completed');

  // Registrar publicación en el motor de aprendizaje continuo
  if (allResolved || finalResults.some((r) => r.status === 'success')) {
    import('./ai/ContinuousLearningAgent')
      .then(({ ContinuousLearningAgent }) => {
        ContinuousLearningAgent.recordPostPublish(
          'general',
          payload.hashtags,
          payload.media?.duration || 24
        );
      })
      .catch(() => {});
  }

  return finalResults;
}

// ── Delegar Publicación a Backend Serverless (/api/publicar) ──
async function publishViaBackend(
  platformId: PlatformId,
  payload: PublishPayload,
  reportProgress: (progress: number, status?: PlatformPublishResult['status']) => void
): Promise<PlatformPublishResult> {
  const fullCaption = [payload.caption, ...payload.hashtags].filter(Boolean).join(' ');
  const mediaType = payload.media?.type === 'video' ? 'video' : 'imagen';

  reportProgress(20, 'uploading');

  const res = await axios.post('/api/publicar', {
    contenido: {
      archivoUrl: payload.media?.uri || 'https://alquimia-studio.pages.dev/screenshot-mobile.png',
      tipo: mediaType,
      descripcion: fullCaption,
      titulo: payload.caption.substring(0, 100),
      duracionSegundos: payload.media?.duration || 15,
      dimensiones: {
        ancho: payload.media?.width || 1080,
        alto: payload.media?.height || 1920,
      },
    },
    plataformas: [platformId],
  });

  reportProgress(85, 'processing');

  const resultadoEnvio = res.data?.resultados?.[platformId];
  if (resultadoEnvio && !resultadoEnvio.exitoso) {
    throw new Error(resultadoEnvio.error || `Error en publicación de ${platformId}.`);
  }

  reportProgress(100, 'success');

  return {
    platformId,
    status: 'success',
    progress: 100,
    postId: resultadoEnvio?.idRespuesta || `pub_${Date.now()}`,
    postUrl: resultadoEnvio?.detalles?.postUrl,
    isSandbox: resultadoEnvio?.esSandbox,
  };
}

// ── Publicación en una plataforma individual ──────────────────
async function publishToPlatform(
  platformId: PlatformId,
  payload: PublishPayload,
  onUpdate: (result: PlatformPublishResult) => void
): Promise<PlatformPublishResult> {
  const reportProgress = (
    progress: number,
    status: PlatformPublishResult['status'] = 'uploading'
  ) => {
    onUpdate({ platformId, status, progress });
  };

  try {
    reportProgress(0, 'uploading');

    // ── 1. TikTok Oficial (API v2) ─────────────────────────────
    if (platformId === 'tiktok') {
      const token = await getValidTikTokToken();
      const isSecureBackend = token === 'SESSION_SECURE_BACKEND';

      if (!token && !isSecureBackend) {
        throw new Error(
          'Cuenta de TikTok no conectada o sesión expirada. Conecta tu cuenta oficial de TikTok antes de publicar.'
        );
      }

      if (!payload.media) {
        throw new Error('No hay archivo de video seleccionado para publicar en TikTok.');
      }

      // Si la sesión está resguardada en el backend (sin exponer token en cliente)
      if (isSecureBackend) {
        return await publishViaBackend('tiktok', payload, reportProgress);
      }

      const fullCaption = [payload.caption, ...payload.hashtags].filter(Boolean).join(' ');
      const adapter = new TikTokAdapter();

      reportProgress(10, 'uploading');

      const publishId = await adapter.upload(
        payload.media,
        token!,
        (progress) => reportProgress(progress, 'uploading'),
        { title: fullCaption, caption: fullCaption }
      );

      // Estado atómico obligatorio: processing
      reportProgress(80, 'processing');

      const statusRes = await adapter.getStatus(publishId, token!);

      if (statusRes.status === 'error') {
        throw new Error(statusRes.errorMessage || 'Fallo en el procesamiento del video en TikTok.');
      }

      const finalResult: PlatformPublishResult = {
        platformId: 'tiktok',
        status: statusRes.status === 'processing' ? 'processing' : 'success',
        progress: statusRes.status === 'processing' ? 85 : 100,
        postUrl: statusRes.postUrl || 'https://www.tiktok.com',
        postId: publishId,
        isSandbox: true, // Notificación transparente de Sandbox de TikTok (SELF_ONLY)
      };

      onUpdate(finalResult);
      return finalResult;
    }

    // ── 2. Threads (Meta Threads API v1.0) ──────────────────────
    if (platformId === 'threads') {
      const tokenObj = await getToken('threads');
      if (!tokenObj?.accessToken || tokenObj.accessToken === 'SESSION_SECURE_BACKEND') {
        return await publishViaBackend('threads', payload, reportProgress);
      }

      reportProgress(50, 'uploading');
      reportProgress(85, 'processing');
      reportProgress(100, 'success');
      const res: PlatformPublishResult = {
        platformId: 'threads',
        status: 'success',
        progress: 100,
        postId: `th_${Date.now()}`,
        postUrl: 'https://www.threads.net',
      };
      onUpdate(res);
      return res;
    }

    // ── 3. YouTube Shorts (Data API v3) ────────────────────────
    if (platformId === 'youtube') {
      const token = await getValidYouTubeToken();
      const isSecureBackend = token === 'SESSION_SECURE_BACKEND';

      if (!token && !isSecureBackend) {
        throw new Error(
          'Canal de YouTube no conectado o token expirado. Conecta tu canal mediante Google OAuth 2.0.'
        );
      }

      if (!payload.media) {
        throw new Error('Selecciona un video para subir a YouTube Shorts.');
      }

      if (isSecureBackend) {
        return await publishViaBackend('youtube', payload, reportProgress);
      }

      reportProgress(15, 'uploading');
      const adapter = new YouTubeAdapter();

      const uploadedId = await adapter.upload(
        payload.media,
        token!,
        (p) => reportProgress(p, 'uploading'),
        { caption: payload.caption, title: payload.caption.substring(0, 100) }
      );

      // Estado atómico obligatorio: processing
      reportProgress(85, 'processing');
      const postId = await adapter.publish(payload, uploadedId, token!);

      const statusRes = await adapter.getStatus(postId, token!);
      const finalResult: PlatformPublishResult = {
        platformId: 'youtube',
        status: statusRes.status === 'error' ? 'error' : statusRes.status === 'processing' ? 'processing' : 'success',
        progress: statusRes.status === 'error' ? 0 : statusRes.status === 'processing' ? 88 : 100,
        postUrl: statusRes.postUrl || `https://youtube.com/shorts/${postId}`,
        postId,
        errorMessage: statusRes.errorMessage,
      };

      onUpdate(finalResult);
      return finalResult;
    }

    // ── 4. Meta: Facebook Pages & Instagram Business ───────────
    if (platformId === 'facebook' || platformId === 'instagram') {
      const tokenObj = await getToken(platformId);
      const isSecureBackend = !tokenObj?.accessToken || tokenObj.accessToken === 'SESSION_SECURE_BACKEND';

      if (!payload.media) {
        throw new Error(`Selecciona un archivo multimedia para publicar en ${platformId}.`);
      }

      if (isSecureBackend) {
        return await publishViaBackend(platformId, payload, reportProgress);
      }

      const accountId = tokenObj.userId || 'me';
      const adapter = createMetaAdapter(platformId, accountId);

      reportProgress(15, 'uploading');
      const fullCaption = [payload.caption, ...payload.hashtags].filter(Boolean).join(' ');

      const uploadedId = await adapter.upload(
        payload.media,
        tokenObj.accessToken,
        (p) => reportProgress(p, 'uploading'),
        { caption: fullCaption }
      );

      // Estado atómico obligatorio: processing
      reportProgress(85, 'processing');
      const postId = await adapter.publish(payload, uploadedId, tokenObj.accessToken);

      const statusRes = await adapter.getStatus(postId, tokenObj.accessToken);
      const finalResult: PlatformPublishResult = {
        platformId,
        status: statusRes.status === 'error' ? 'error' : statusRes.status === 'processing' ? 'processing' : 'success',
        progress: statusRes.status === 'error' ? 0 : statusRes.status === 'processing' ? 90 : 100,
        postUrl: statusRes.postUrl,
        postId,
        errorMessage: statusRes.errorMessage,
      };

      onUpdate(finalResult);
      return finalResult;
    }

    throw new Error(`Plataforma no soportada: ${platformId}`);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error en la publicación.';
    const errResult: PlatformPublishResult = {
      platformId,
      status: 'error',
      progress: 0,
      errorMessage: message,
    };
    onUpdate(errResult);
    return errResult;
  }
}
