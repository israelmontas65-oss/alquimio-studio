// ============================================================
// src/hooks/useMediaPicker.ts
// Hook para selección y validación de archivos multimedia
// ============================================================

import { useCallback } from 'react';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Alert, Platform } from 'react-native';
import { useAppStore } from '../store/useAppStore';
import type { MediaFile, MediaType } from '../types/media.types';
import { isVertical } from '../constants/mediaRules';

// Helper universal para selección directa en web (HTML5 File Input)
const pickWebFile = (accept: string): Promise<File | null> => {
  return new Promise((resolve) => {
    if (typeof document === 'undefined') {
      resolve(null);
      return;
    }
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.style.display = 'none';
    input.onchange = () => {
      const file = input.files?.[0] || null;
      resolve(file);
      input.remove();
    };
    document.body.appendChild(input);
    input.click();
  });
};

export function useMediaPicker() {
  const setSelectedMedia = useAppStore((s) => s.setSelectedMedia);

  // ── Pedir permisos de galería ─────────────────────────────
  const requestPermissions = useCallback(async (): Promise<boolean> => {
    if (Platform.OS === 'web') return true;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permiso requerido',
        'Alquimia Estudio necesita acceso a tu galería para seleccionar archivos.',
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
      if (Platform.OS === 'web') {
        const accept =
          type === 'video'
            ? 'video/*'
            : type === 'image'
            ? 'image/*'
            : 'video/*,image/*';
        const file = await pickWebFile(accept);
        if (file) {
          const uri = URL.createObjectURL(file);
          const isVideo = file.type.startsWith('video/');
          const isImage = file.type.startsWith('image/');
          const media: MediaFile = {
            uri,
            type: isVideo ? 'video' : isImage ? 'image' : 'document',
            mimeType: file.type || (isVideo ? 'video/mp4' : 'image/jpeg'),
            name: file.name,
            size: file.size,
            aspectRatio: isVideo ? '9:16' : '1:1',
          };
          setSelectedMedia(media);
          return media;
        }
        return null;
      }

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

  // ── Seleccionar documento (PDF, Word, plantillas, etc.) ───
  const pickDocument = useCallback(async () => {
    if (Platform.OS === 'web') {
      const file = await pickWebFile('.pdf,.doc,.docx,.txt,application/pdf,application/msword');
      if (file) {
        const uri = URL.createObjectURL(file);
        const media: MediaFile = {
          uri,
          type: 'document',
          mimeType: file.type || 'application/pdf',
          name: file.name,
          size: file.size,
        };
        setSelectedMedia(media);
        return media;
      }
      return null;
    }

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/*', '*/*'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const media: MediaFile = {
          uri: asset.uri,
          type: 'document',
          mimeType: asset.mimeType ?? 'application/octet-stream',
          name: asset.name,
          size: asset.size ?? 0,
        };
        setSelectedMedia(media);
        return media;
      }
    } catch (e) {
      console.warn('Document pick error', e);
    }
    return null;
  }, [setSelectedMedia]);

  // ── Seleccionar audio / sonido ────────────────────────────
  const pickAudio = useCallback(async () => {
    if (Platform.OS === 'web') {
      const file = await pickWebFile('audio/*,.mp3,.wav,.aac,.m4a');
      if (file) {
        const uri = URL.createObjectURL(file);
        const media: MediaFile = {
          uri,
          type: 'audio',
          mimeType: file.type || 'audio/mpeg',
          name: file.name,
          size: file.size,
        };
        setSelectedMedia(media);
        return media;
      }
      return null;
    }

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const media: MediaFile = {
          uri: asset.uri,
          type: 'audio',
          mimeType: asset.mimeType ?? 'audio/mpeg',
          name: asset.name,
          size: asset.size ?? 0,
        };
        setSelectedMedia(media);
        return media;
      }
    } catch (e) {
      console.warn('Audio pick error', e);
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
    pickAudio,
    clearMedia,
  };
}
