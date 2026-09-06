// ============================================================
// src/hooks/useMediaPicker.ts
// Hook para selección y validación de archivos multimedia
// ============================================================

import { useCallback } from 'react';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Alert } from 'react-native';
import { useAppStore } from '../store/useAppStore';
import type { MediaFile, MediaType } from '../types/media.types';
import { isVertical } from '../constants/mediaRules';

export function useMediaPicker() {
  const setSelectedMedia = useAppStore((s) => s.setSelectedMedia);

  // ── Pedir permisos de galería ─────────────────────────────
  const requestPermissions = useCallback(async (): Promise<boolean> => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permiso requerido',
        'Alquimio necesita acceso a tu galería para seleccionar archivos.',
        [{ text: 'OK' }]
      );
      return false;
    }
    return true;
  }, []);

  // ── Construir MediaFile desde resultado de ImagePicker ────
  const buildMediaFile = useCallback(
    (asset: ImagePicker.ImagePickerAsset): MediaFile => {
      const isVideo = asset.type === 'video';
      const width = asset.width ?? 0;
      const height = asset.height ?? 0;

      return {
        uri: asset.uri,
        type: isVideo ? 'video' : 'image',
        mimeType: asset.mimeType ?? (isVideo ? 'video/mp4' : 'image/jpeg'),
        name: asset.fileName ?? `media_${Date.now()}`,
        size: asset.fileSize ?? 0,
        duration: asset.duration ?? undefined,
        width,
        height,
        aspectRatio: width > 0 && height > 0
          ? (isVertical(width, height) ? '9:16' : width > height ? '16:9' : '1:1')
          : 'unknown',
      };
    },
    []
  );

  // ── Seleccionar video o imagen de galería ─────────────────
  const pickFromGallery = useCallback(
    async (type: 'video' | 'image' | 'both' = 'both') => {
      const hasPermission = await requestPermissions();
      if (!hasPermission) return;

      const mediaTypes =
        type === 'video'
          ? ImagePicker.MediaTypeOptions.Videos
          : type === 'image'
          ? ImagePicker.MediaTypeOptions.Images
          : ImagePicker.MediaTypeOptions.All;

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes,
        allowsEditing: false,
        quality: 1,
        videoExportPreset: ImagePicker.VideoExportPreset.HighestQuality,
      });

      if (!result.canceled && result.assets.length > 0) {
        const media = buildMediaFile(result.assets[0]);
        setSelectedMedia(media);
        return media;
      }
      return null;
    },
    [requestPermissions, buildMediaFile, setSelectedMedia]
  );

  // ── Seleccionar documento PDF ─────────────────────────────
  const pickDocument = useCallback(async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/pdf',
      copyToCacheDirectory: true,
    });

    if (!result.canceled && result.assets.length > 0) {
      const asset = result.assets[0];
      const media: MediaFile = {
        uri: asset.uri,
        type: 'document',
        mimeType: asset.mimeType ?? 'application/pdf',
        name: asset.name,
        size: asset.size ?? 0,
      };
      setSelectedMedia(media);
      return media;
    }
    return null;
  }, [setSelectedMedia]);

  // ── Limpiar selección ─────────────────────────────────────
  const clearMedia = useCallback(() => {
    setSelectedMedia(null);
  }, [setSelectedMedia]);

  return {
    pickFromGallery,
    pickDocument,
    clearMedia,
  };
}
