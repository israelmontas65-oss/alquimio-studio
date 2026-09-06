// ============================================================
// src/components/media/MediaPreview.tsx
// Vista previa del archivo cargado con barra de progreso
// ============================================================

import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  withSpring,
  withTiming,
  useSharedValue,
  useEffect as useReanimatedEffect,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../../constants/colors';
import { useMediaPicker } from '../../hooks/useMediaPicker';
import type { MediaFile } from '../../types/media.types';

interface MediaPreviewProps {
  media: MediaFile;
  uploadProgress: number; // 0–100
}

export function MediaPreview({ media, uploadProgress }: MediaPreviewProps) {
  const { clearMedia } = useMediaPicker();

  const progressWidth = useSharedValue(0);

  React.useEffect(() => {
    progressWidth.value = withTiming(uploadProgress, { duration: 400 });
  }, [uploadProgress]);

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value}%`,
  }));

  const formatSize = (bytes: number): string => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDuration = (secs?: number): string => {
    if (!secs) return '';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const getTypeIcon = (): keyof typeof Ionicons.glyphMap => {
    if (media.type === 'video') return 'videocam';
    if (media.type === 'image') return 'image';
    return 'document-text';
  };

  return (
    <View style={styles.container}>
      {/* Thumbnail / Preview */}
      <View style={styles.previewRow}>
        <View style={styles.thumbnail}>
          {(media.type === 'image' || media.type === 'video') ? (
            <Image
              source={{ uri: media.uri }}
              style={StyleSheet.absoluteFill}
              resizeMode="cover"
            />
          ) : null}
          {/* Overlay con ícono de tipo */}
          <View style={styles.typeOverlay}>
            <Ionicons name={getTypeIcon()} size={20} color={COLORS.neon.turquoise} />
          </View>
        </View>

        {/* Metadata */}
        <View style={styles.meta}>
          <Text style={styles.filename} numberOfLines={1}>{media.name}</Text>

          <View style={styles.badges}>
            <Badge label={formatSize(media.size)} />
            {media.duration !== undefined && (
              <Badge label={formatDuration(media.duration)} icon="time-outline" />
            )}
            {media.aspectRatio && media.aspectRatio !== 'unknown' && (
              <Badge label={media.aspectRatio} icon="resize-outline" />
            )}
          </View>

          {/* Aspect ratio warning */}
          {media.aspectRatio && media.aspectRatio !== '9:16' && (
            <View style={styles.warningRow}>
              <Ionicons name="warning-outline" size={12} color={COLORS.status.warning} />
              <Text style={styles.warningText}>
                Ratio {media.aspectRatio} — Se recomienda 9:16
              </Text>
            </View>
          )}
        </View>

        {/* Botón eliminar */}
        <TouchableOpacity onPress={clearMedia} style={styles.deleteBtn}>
          <Ionicons name="close-circle" size={22} color={COLORS.status.error} />
        </TouchableOpacity>
      </View>

      {/* Barra de progreso */}
      {uploadProgress > 0 && uploadProgress < 100 && (
        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressBar, progressStyle]}>
            <LinearGradient
              colors={[COLORS.neon.turquoise, COLORS.gold.primary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
          <Text style={styles.progressText}>{Math.round(uploadProgress)}%</Text>
        </View>
      )}

      {uploadProgress >= 100 && (
        <View style={styles.doneRow}>
          <Ionicons name="checkmark-circle" size={14} color={COLORS.status.success} />
          <Text style={styles.doneText}>Archivo listo</Text>
        </View>
      )}
    </View>
  );
}

function Badge({
  label,
  icon,
}: {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <View style={badgeStyles.badge}>
      {icon && <Ionicons name={icon} size={10} color={COLORS.text.muted} />}
      <Text style={badgeStyles.text}>{label}</Text>
    </View>
  );
}

const badgeStyles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 0.5,
    borderColor: COLORS.glass.border,
  },
  text: {
    color: COLORS.text.muted,
    fontSize: 10,
    fontWeight: '500',
  },
});

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  thumbnail: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: COLORS.bg.elevated,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.glass.borderNeon,
  },
  typeOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  meta: {
    flex: 1,
    gap: 6,
  },
  filename: {
    color: COLORS.text.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  badges: {
    flexDirection: 'row',
    gap: 5,
    flexWrap: 'wrap',
  },
  warningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  warningText: {
    color: COLORS.status.warning,
    fontSize: 10,
  },
  deleteBtn: {
    padding: 4,
  },
  progressTrack: {
    height: 5,
    borderRadius: 4,
    backgroundColor: COLORS.bg.elevated,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressText: {
    position: 'absolute',
    right: 0,
    color: COLORS.text.secondary,
    fontSize: 9,
    fontWeight: '700',
  },
  doneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  doneText: {
    color: COLORS.status.success,
    fontSize: 11,
    fontWeight: '600',
  },
});
