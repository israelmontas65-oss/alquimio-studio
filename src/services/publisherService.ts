// ============================================================
// src/services/publisherService.ts
// Orquestador central de publicación – Backend Serverless (/api/publicar/*)
// Publicación en paralelo hacia Meta, TikTok, YouTube y Threads.
// Los tokens NUNCA pasan por el frontend: residen en sesiones cifradas en backend.
// Titularidad y Autoría: Israel Montás
// ============================================================

import type { PlatformId, PlatformPublishResult } from '../types/platform.types';
import type { PublishPayload } from '../types/publish.types';
import { useAppStore } from '../store/useAppStore';

export type PublishStatus = 'idle' | 'uploading' | 'processing' | 'success' | 'error';

export type PublishPlatformTarget =
  | 'meta_instagram'
  | 'meta_facebook'
  | 'tiktok'
  | 'youtube'
  | 'threads';

export interface PublishRequest {
  mediaUrl: string; // URL pública accesible (requerida por Instagram, Threads y TikTok PULL_FROM_URL)
  caption: string;
  mediaType: 'IMAGE' | 'VIDEO';
  targets: PublishPlatformTarget[];
  sandboxMode?: boolean; // true mientras TikTok no esté auditado (recomendado en fase de pruebas)
}

export interface PublishResultItem {
  platform: string;
  target?: string;
  status: PublishStatus;
  postId?: string;
  publishId?: string; // TikTok: para polling con /api/publicar/tiktok-status
  errorMessage?: string;
}

type ProgressCallback = (platform: string, status: PublishStatus) => void;

/**
 * Orquesta la publicación en paralelo hacia Meta, TikTok, YouTube y Threads.
 * Llama a los endpoints dedicados /api/publicar/* en Cloudflare Pages Functions.
 */
export async function publishMultiPlatform(
  req: PublishRequest,
  onProgress?: ProgressCallback
): Promise<PublishResultItem[]> {
  const tasks: Promise<PublishResultItem[]>[] = [];

  // 1. Meta: Instagram & Facebook Pages
  const metaTargets = req.targets.filter((t) => t.startsWith('meta_'));
  if (metaTargets.length > 0) {
    onProgress?.('meta', 'uploading');
    tasks.push(
      postJson('/api/publicar/meta', {
        mediaUrl: req.mediaUrl,
        caption: req.caption,
        mediaType: req.mediaType === 'VIDEO' ? 'REELS' : 'IMAGE',
        targets: metaTargets.map((t) => (t === 'meta_instagram' ? 'instagram' : 'facebook_page')),
      }).then((results: PublishResultItem[]) => {
        const allOk = Array.isArray(results) && results.every((r) => r.status === 'success');
        onProgress?.('meta', allOk ? 'success' : 'error');
        return results;
      })
    );
  }

  // 2. TikTok
  if (req.targets.includes('tiktok')) {
    onProgress?.('tiktok', 'uploading');
    tasks.push(
      postJson('/api/publicar/tiktok', {
        videoUrl: req.mediaUrl,
        caption: req.caption,
        sandbox: (req.sandboxMode ?? true),
      }).then((result: PublishResultItem) => {
        onProgress?.('tiktok', result.status === 'error' ? 'error' : 'processing');
        return [result];
      })
    );
  }

  // 3. YouTube Shorts / Video
  if (req.targets.includes('youtube')) {
    onProgress?.('youtube', 'uploading');
    tasks.push(
      postJson('/api/publicar/youtube', {
        videoUrl: req.mediaUrl,
        title: req.caption.slice(0, 100) || 'Publicación Alquimia Studio',
        description: req.caption,
        privacyStatus: 'private', // Recomendado mientras se valida el flujo real end-to-end
      }).then((result: PublishResultItem) => {
        onProgress?.('youtube', result.status);
        return [result];
      })
    );
  }

  // 4. Threads (Meta Threads API v1.0)
  if (req.targets.includes('threads')) {
    onProgress?.('threads', 'uploading');
    tasks.push(
      postJson('/api/publicar/threads', {
        mediaUrl: req.mediaUrl,
        caption: req.caption,
        mediaType: req.mediaType,
      }).then((result: PublishResultItem) => {
        onProgress?.('threads', result.status);
        return [result];
      })
    );
  }

  const settled = await Promise.allSettled(tasks);
  return settled.flatMap((s) =>
    s.status === 'fulfilled'
      ? s.value
      : [{ platform: 'unknown', status: 'error' as PublishStatus, errorMessage: 'request_failed' }]
  );
}

/**
 * Polling para el estado asíncrono de una publicación de TikTok (/api/publicar/tiktok-status).
 */
export async function pollTikTokStatus(publishId: string): Promise<PublishResultItem> {
  const res = await fetch(`/api/publicar/tiktok-status?publish_id=${encodeURIComponent(publishId)}`, {
    credentials: 'include',
  });
  return res.json();
}

/**
 * Realiza una petición POST segura enviando JSON con credenciales de sesión incluidas.
 */
async function postJson(url: string, body: unknown): Promise<any> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(
      (errorBody as any)?.message ||
      (errorBody as any)?.errorMessage ||
      (errorBody as any)?.error ||
      `Petición a ${url} falló con estado ${response.status}`
    );
  }

  return response.json();
}

// ─────────────────────────────────────────────────────────────
// Puente Maestro para la UI de Alquimia Studio (Botón "PUBLICAR EN BLOQUE")
// ─────────────────────────────────────────────────────────────
export async function publishAll(payload: PublishPayload): Promise<PlatformPublishResult[]> {
  const { updatePlatformResult, setPublishSessionStatus } = useAppStore.getState();

  // Mapear plataformas activas de la app a los targets de la API
  const targets: PublishPlatformTarget[] = [];
  payload.activePlatforms.forEach((p) => {
    if (p === 'instagram') targets.push('meta_instagram');
    else if (p === 'facebook') targets.push('meta_facebook');
    else if (p === 'tiktok') targets.push('tiktok');
    else if (p === 'youtube') targets.push('youtube');
    else if (p === 'threads') targets.push('threads');
  });

  const fullCaption = [payload.caption, ...payload.hashtags].filter(Boolean).join(' ');
  const mediaType = payload.media?.type === 'video' ? 'VIDEO' : 'IMAGE';
  const mediaUrl = payload.media?.uri || 'https://alquimia-studio.pages.dev/icons/icon-512.png';

  // Inicializar estado de las plataformas activas
  payload.activePlatforms.forEach((platformId) => {
    updatePlatformResult({
      platformId,
      status: 'uploading',
      progress: 15,
    });
  });

  const rawResults = await publishMultiPlatform(
    {
      mediaUrl,
      caption: fullCaption,
      mediaType,
      targets,
      sandboxMode: true,
    },
    (platform, status) => {
      const mappedStatus: PlatformPublishResult['status'] =
        status === 'uploading'
          ? 'uploading'
          : status === 'processing'
          ? 'processing'
          : status === 'success'
          ? 'success'
          : 'error';

      const progress = status === 'success' ? 100 : status === 'processing' ? 85 : 40;

      if (platform === 'meta') {
        if (payload.activePlatforms.includes('instagram')) {
          updatePlatformResult({ platformId: 'instagram', status: mappedStatus, progress });
        }
        if (payload.activePlatforms.includes('facebook')) {
          updatePlatformResult({ platformId: 'facebook', status: mappedStatus, progress });
        }
      } else if (platform === 'tiktok' || platform === 'youtube' || platform === 'threads') {
        updatePlatformResult({ platformId: platform as PlatformId, status: mappedStatus, progress });
      }
    }
  );

  // Mapear resultados a PlatformPublishResult[]
  const finalResults: PlatformPublishResult[] = [];

  for (const item of rawResults) {
    let platformId: PlatformId = 'threads';
    if (item.target === 'instagram' || item.platform === 'instagram') platformId = 'instagram';
    else if (item.target === 'facebook_page' || item.platform === 'facebook') platformId = 'facebook';
    else if (item.platform === 'tiktok') platformId = 'tiktok';
    else if (item.platform === 'youtube') platformId = 'youtube';
    else if (item.platform === 'threads') platformId = 'threads';

    const res: PlatformPublishResult = {
      platformId,
      status: item.status === 'success' ? 'success' : item.status === 'processing' ? 'processing' : 'error',
      progress: item.status === 'success' ? 100 : item.status === 'processing' ? 85 : 0,
      postId: item.postId || item.publishId,
      errorMessage: item.errorMessage,
      isSandbox: platformId === 'tiktok',
    };

    finalResults.push(res);
    updatePlatformResult(res);

    // Si TikTok está procesando con publishId, ejecutar polling en segundo plano
    if (platformId === 'tiktok' && item.publishId && item.status === 'processing') {
      pollTikTokStatusBackground(item.publishId, updatePlatformResult);
    }
  }

  const hasErrors = finalResults.some((r) => r.status === 'error');
  const allResolved = finalResults.every((r) => r.status === 'success' || r.status === 'processing');

  setPublishSessionStatus(allResolved ? 'completed' : hasErrors ? 'partial_error' : 'completed');

  // Registrar en aprendizaje continuo
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

/** Polling en segundo plano para TikTok sin bloquear */
async function pollTikTokStatusBackground(
  publishId: string,
  updateCallback: (result: PlatformPublishResult) => void
) {
  for (let i = 0; i < 10; i++) {
    await new Promise((r) => setTimeout(r, 4000));
    try {
      const statusRes = await pollTikTokStatus(publishId);
      if (statusRes.status === 'success') {
        updateCallback({
          platformId: 'tiktok',
          status: 'success',
          progress: 100,
          postId: statusRes.postId || publishId,
          isSandbox: true,
        });
        break;
      } else if (statusRes.status === 'error') {
        updateCallback({
          platformId: 'tiktok',
          status: 'error',
          progress: 0,
          errorMessage: statusRes.errorMessage || 'Error en procesamiento de TikTok',
          isSandbox: true,
        });
        break;
      }
    } catch {
      // Reintentar en siguiente ciclo
    }
  }
}