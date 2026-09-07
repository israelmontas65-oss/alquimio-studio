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
    reportProgress(0, 'uploading');
    
    // Simulate initial latency
    await new Promise(r => setTimeout(r, Math.random() * 800 + 500));
    
    // Simular subida (Uploading)
    for (let i = 10; i <= 80; i += Math.floor(Math.random() * 15) + 5) {
      reportProgress(Math.min(i, 80), 'uploading');
      await new Promise(r => setTimeout(r, 400));
    }

    reportProgress(85, 'processing');
    
    // Simular procesamiento (Processing)
    await new Promise(r => setTimeout(r, Math.random() * 1500 + 1000));
    reportProgress(95, 'processing');
    await new Promise(r => setTimeout(r, 1000));

    const finalResult: PlatformPublishResult = {
      platformId,
      status: 'success',
      progress: 100,
      postUrl: `https://${platformId}.com/alquimio_demo`,
      postId: `mock_${Date.now()}`,
    };

    onUpdate(finalResult);
    return finalResult;
  } catch (err: unknown) {
    const errResult: PlatformPublishResult = {
      platformId,
      status: 'error',
      progress: 0,
      errorMessage: 'Error en simulación',
    };
    onUpdate(errResult);
    return errResult;
  }
}
