// ============================================================
// src/hooks/usePublish.ts
// Hook para disparar y controlar el proceso de publicación
// ============================================================

import { useCallback } from 'react';
import { publishAll } from '../services/publisherService';
import { useAppStore } from '../store/useAppStore';
import type { PublishPayload } from '../types/publish.types';
import * as Haptics from 'expo-haptics';

export function usePublish() {
  const {
    selectedMedia,
    caption,
    hashtags,
    activePlatforms,
    platformSettings,
    startPublishSession,
    showPublishModal,
  } = useAppStore();

  const canPublish =
    selectedMedia !== null &&
    activePlatforms.size > 0;

  const handlePublish = useCallback(async () => {
    if (!selectedMedia) return;

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    const payload: PublishPayload = {
      caption,
      hashtags,
      media: selectedMedia,
      activePlatforms: Array.from(activePlatforms),
      platformSettings,
    };

    startPublishSession(payload);
    showPublishModal();

    // Disparar publicación asíncrona (no bloqueamos la UI)
    publishAll(payload).catch((err: unknown) => {
      console.error('[usePublish] Error en publishAll:', err);
    });
  }, [
    selectedMedia,
    caption,
    hashtags,
    activePlatforms,
    platformSettings,
    startPublishSession,
    showPublishModal,
  ]);

  return { canPublish, handlePublish };
}
