// ============================================================
// src/hooks/usePublish.ts
// Hook para disparar y controlar el proceso de publicación
// ============================================================

import { useCallback } from 'react';
import { Alert } from 'react-native';
import { publishAll } from '../services/publisherService';
import { useAppStore } from '../store/useAppStore';
import type { PublishPayload } from '../types/publish.types';
import * as Haptics from 'expo-haptics';

export function usePublish() {
  const {
    selectedMedia,
    selectedAspectRatio,
    fitMode,
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

  const triggerPublish = useCallback(async (effectiveRatio: string) => {
    if (!selectedMedia) return;

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    const payload: PublishPayload = {
      caption,
      hashtags,
      media: selectedMedia,
      activePlatforms: Array.from(activePlatforms),
      platformSettings,
      aspectRatio: effectiveRatio,
      fitMode,
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
    fitMode,
    startPublishSession,
    showPublishModal,
  ]);

  const handlePublish = useCallback(async () => {
    if (!selectedMedia) return;

    const effectiveRatio =
      selectedAspectRatio === 'auto'
        ? (selectedMedia.aspectRatio && selectedMedia.aspectRatio !== 'unknown' ? selectedMedia.aspectRatio : '9:16')
        : selectedAspectRatio;

    const hasVerticalPlatform = activePlatforms.has('tiktok') || activePlatforms.has('youtube');
    if (effectiveRatio === '16:9' && hasVerticalPlatform) {
      Alert.alert(
        'Aviso de Formato',
        'Se recomienda 9:16 para TikTok y Shorts. ¿Deseas publicar de todos modos?',
        [
          { text: 'Ajustar formato', style: 'cancel' },
          {
            text: 'Publicar igual',
            onPress: () => triggerPublish(effectiveRatio),
          },
        ]
      );
      return;
    }

    await triggerPublish(effectiveRatio);
  }, [selectedMedia, selectedAspectRatio, activePlatforms, triggerPublish]);

  return { canPublish, handlePublish };
}
