// ============================================================
// src/services/publisherService.ts
// Orquestador central de publicación – Patrón Adapter
// Gestiona el envío asíncrono y paralelo a todas las plataformas
// ============================================================

import { getToken, isTokenValid } from '../auth/tokenManager';
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
      // WhatsApp Business Cloud API requiere integración server-side.
      // Por ahora retornamos un adaptador stub.
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

/**
 * Publica el payload en todas las plataformas activas de forma
 * concurrente, reportando el progreso individual de cada una.
 */
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
    // ── 1. Validar token ─────────────────────────────────────
    reportProgress(0, 'uploading');
    const valid = await isTokenValid(platformId);

    if (!valid) {
      return {
        platformId,
        status: 'error',
        progress: 0,
        errorMessage: `Token de ${platformId} inválido o expirado. Reconecta tu cuenta.`,
      };
    }

    const tokenData = await getToken(platformId);
    const accessToken = tokenData!.accessToken;

    // ── 2. Crear adaptador y subir archivo ───────────────────
    const adapter = createAdapter(platformId);
    reportProgress(5, 'uploading');

    const uploadedId = await adapter.upload(payload.media, accessToken, (pct) => {
      reportProgress(Math.round(pct * 0.8), 'uploading'); // 0–80%
    });

    reportProgress(80, 'publishing');

    // ── 3. Publicar ──────────────────────────────────────────
    const postId = await adapter.publish(payload, uploadedId, accessToken);
    reportProgress(90, 'processing');

    // ── 4. Polling de estado ─────────────────────────────────
    let statusResult = await adapter.getStatus(postId, accessToken);
    let attempts = 0;
    const maxAttempts = 15;

    while (
      statusResult.status !== 'success' &&
      statusResult.status !== 'error' &&
      attempts < maxAttempts
    ) {
      await new Promise((r) => setTimeout(r, 3000));
      statusResult = await adapter.getStatus(postId, accessToken);
      attempts++;
      reportProgress(90 + Math.min(attempts, 9), 'processing');
    }

    const finalResult: PlatformPublishResult = {
      platformId,
      status: statusResult.status === 'success' ? 'success' : 'error',
      progress: 100,
      postUrl: statusResult.postUrl,
      errorMessage: statusResult.errorMessage,
      postId,
    };

    onUpdate(finalResult);
    return finalResult;
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : `Error inesperado en ${platformId}.`;

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
