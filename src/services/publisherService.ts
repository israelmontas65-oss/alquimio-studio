// ============================================================
// src/services/publisherService.ts
// Orquestador central de publicación – Patrón Adapter
// Gestiona el envío asíncrono y paralelo a todas las plataformas
// ============================================================

import { getToken, isTokenValid } from '../auth/tokenManager';
import { getValidTikTokToken } from './tiktokAuthService';
import { TikTokAdapter } from './adapters/TikTokAdapter';
import { MetaAdapter } from './adapters/MetaAdapter';
import { YouTubeAdapter } from './adapters/YouTubeAdapter';
import type { IPublishAdapter } from './adapters/BaseAdapter';
import type { PlatformId, PlatformPublishResult } from '../types/platform.types';
import type { PublishPayload } from '../types/publish.types';
import { useAppStore } from '../store/useAppStore';

// ── Constantes de configuración de cuentas ───────────────────
// En producción estos IDs vendrían del perfil del usuario autenticado.
const ACCOUNT_IDS: Partial<Record<PlatformId, string>> = {
  instagram: process.env.EXPO_PUBLIC_IG_ACCOUNT_ID ?? 'YOUR_IG_ACCOUNT_ID',
  facebook: process.env.EXPO_PUBLIC_FB_PAGE_ID ?? 'YOUR_FB_PAGE_ID',
};

// ── Fábrica de adaptadores ────────────────────────────────────
function createAdapter(platformId: PlatformId): IPublishAdapter {
  switch (platformId) {
    case 'tiktok':
      return new TikTokAdapter();
    case 'instagram':
      return new MetaAdapter('instagram', ACCOUNT_IDS.instagram!);
    case 'facebook':
      return new MetaAdapter('facebook', ACCOUNT_IDS.facebook!);
    case 'youtube':
      return new YouTubeAdapter();
    case 'whatsapp':
      return createWhatsAppStub();
    default:
      throw new Error(`Adaptador no disponible para: ${platformId}`);
  }
}

// Stub para WhatsApp (pendiente integración server-side)
function createWhatsAppStub(): IPublishAdapter {
  return {
    async upload() {
      await new Promise((r) => setTimeout(r, 1500));
      return 'wa_stub_id';
    },
    async publish() {
      await new Promise((r) => setTimeout(r, 1000));
      return 'wa_stub_post';
    },
    async getStatus() {
      return {
        status: 'success' as const,
        postUrl: undefined,
        errorMessage: undefined,
      };
    },
  };
}

// ── Función principal de publicación ─────────────────────────
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
  const allSucceeded = finalResults.every((r) => r.status === 'success');

  setPublishSessionStatus(allSucceeded ? 'completed' : hasErrors ? 'partial_error' : 'completed');

  // Registrar publicación en el motor de aprendizaje continuo
  if (allSucceeded || finalResults.some((r) => r.status === 'success')) {
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

// ── Publicación en una plataforma individual ──────────────────
async function publishToPlatform(
  platformId: PlatformId,
  payload: PublishPayload,
  onUpdate: (result: PlatformPublishResult) => void
): Promise<PlatformPublishResult> {
  const reportProgress = (progress: number, status: PlatformPublishResult['status'] = 'uploading') => {
    onUpdate({ platformId, status, progress });
  };

  try {
    reportProgress(0, 'uploading');

    // ── Publicación 100% Real para TikTok ───────────────────
    if (platformId === 'tiktok') {
      const token = await getValidTikTokToken();
      if (!token) {
        throw new Error(
          'Cuenta de TikTok no conectada o autorización expirada. Abre el modal de TikTok y conecta tu cuenta oficial.'
        );
      }

      if (!payload.media) {
        throw new Error('No hay video seleccionado para publicar en TikTok.');
      }

      const fullCaption = [payload.caption, ...payload.hashtags].filter(Boolean).join(' ');
      const adapter = new TikTokAdapter();

      reportProgress(5, 'uploading');

      // Subir video binario a TikTok Content Posting API v2
      const publishId = await adapter.upload(
        payload.media,
        token,
        (progress) => reportProgress(progress, 'uploading'),
        { title: fullCaption }
      );

      reportProgress(90, 'processing');

      // Monitorear estado hasta finalización
      const statusRes = await adapter.pollStatus(publishId, token, 2500, 24);

      if (statusRes.status === 'error') {
        throw new Error(statusRes.errorMessage || 'Fallo en el procesamiento del video en TikTok.');
      }

      const finalResult: PlatformPublishResult = {
        platformId: 'tiktok',
        status: 'success',
        progress: 100,
        postUrl: statusRes.postUrl || `https://www.tiktok.com`,
        postId: publishId,
      };

      onUpdate(finalResult);
      return finalResult;
    }

    // ── Otras plataformas (Meta, YouTube, WhatsApp) ─────────
    const adapter = createAdapter(platformId);
    const tokenObj = await getToken(platformId);
    const token = tokenObj?.accessToken || 'token_placeholder';

    reportProgress(15, 'uploading');
    if (!payload.media) {
      throw new Error(`Selecciona un archivo multimedia para publicar en ${platformId}.`);
    }

    const uploadedId = await adapter.upload(payload.media, token, (progress) =>
      reportProgress(progress, 'uploading')
    );

    reportProgress(85, 'processing');
    const postId = await adapter.publish(payload, uploadedId, token);

    const statusRes = await adapter.getStatus(postId, token);
    const finalResult: PlatformPublishResult = {
      platformId,
      status: statusRes.status === 'error' ? 'error' : 'success',
      progress: statusRes.status === 'error' ? 0 : 100,
      postUrl: statusRes.postUrl,
      postId,
      errorMessage: statusRes.errorMessage,
    };

    onUpdate(finalResult);
    return finalResult;
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
