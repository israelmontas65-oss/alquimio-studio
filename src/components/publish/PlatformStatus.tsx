// ============================================================
// src/components/publish/PlatformStatus.tsx
// Estado individual de publicación por plataforma en el modal
// ============================================================

import React from 'react';
import { StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  useEffect as useReanimatedEffect,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../../constants/colors';
import { PLATFORMS } from '../../constants/platforms';
import type { PlatformPublishResult } from '../../types/platform.types';

interface PlatformStatusProps {
  result: PlatformPublishResult;
}

export function PlatformStatus({ result }: PlatformStatusProps) {
  const config = PLATFORMS[result.platformId];
  const progressAnim = useSharedValue(0);
  const rowOpacity = useSharedValue(0);

  React.useEffect(() => {
    rowOpacity.value = withSpring(1, { damping: 15 });
    progressAnim.value = withTiming(result.progress, { duration: 600 });
  }, [result.progress]);

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progressAnim.value}%`,
  }));

  const rowStyle = useAnimatedStyle(() => ({
    opacity: rowOpacity.value,
  }));

  const getStatusIcon = () => {
    switch (result.status) {
      case 'success':
        return (
          <View style={[styles.statusIcon, styles.successIcon]}>
            <Ionicons name="checkmark" size={14} color={COLORS.bg.deepBlack} />
          </View>
        );
      case 'error':
        return (
          <View style={[styles.statusIcon, styles.errorIcon]}>
            <Ionicons name="close" size={14} color={COLORS.bg.deepBlack} />
          </View>
        );
      case 'idle':
        return (
          <View style={[styles.statusIcon, styles.idleIcon]}>
            <View style={styles.idleDot} />
          </View>
        );
      default:
        return (
          <ActivityIndicator
            size="small"
            color={COLORS.neon.turquoise}
            style={styles.spinner}
          />
        );
    }
  };

  const getStatusLabel = () => {
    switch (result.status) {
      case 'idle': return 'En espera...';
      case 'uploading': return `Subiendo... ${result.progress}%`;
      case 'processing': return 'Procesando...';
      case 'publishing': return 'Publicando...';
      case 'success': return '¡Publicado!';
      case 'error': return result.errorMessage ?? 'Error';
    }
  };

  const isActive = !['idle', 'success', 'error'].includes(result.status);

  return (
    <Animated.View style={[styles.row, rowStyle]}>
      {/* Ícono de plataforma */}
      <View style={styles.platformIcon}>
        <Ionicons
          name={config.iconName as keyof typeof Ionicons.glyphMap}
          size={18}
          color={result.status === 'idle' ? COLORS.text.muted : config.iconColor}
        />
      </View>

      {/* Info y progreso */}
      <View style={styles.content}>
        <View style={styles.labelRow}>
          <Text style={[styles.name, result.status === 'success' && styles.nameSuccess]}>
            {config.name}
          </Text>
          <Text
            style={[
              styles.statusLabel,
              result.status === 'success' && styles.successLabel,
              result.status === 'error' && styles.errorLabel,
            ]}
            numberOfLines={1}
          >
            {getStatusLabel()}
          </Text>
        </View>

        {/* Barra de progreso */}
        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressFill, progressStyle]}>
            <LinearGradient
              colors={
                result.status === 'error'
                  ? ['#FF4C4C', '#FF2222']
                  : result.status === 'success'
                  ? ['#00E676', '#00B050']
                  : [COLORS.neon.turquoise, COLORS.gold.primary]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        </View>
      </View>

      {/* Ícono de estado */}
      {getStatusIcon()}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  platformIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    gap: 6,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  name: {
    color: COLORS.text.secondary,
    fontSize: 13,
    fontWeight: '600',
  },
  nameSuccess: {
    color: COLORS.text.primary,
  },
  statusLabel: {
    color: COLORS.text.muted,
    fontSize: 11,
  },
  successLabel: { color: COLORS.status.success },
  errorLabel: { color: COLORS.status.error },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.bg.elevated,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
    overflow: 'hidden',
  },
  statusIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successIcon: { backgroundColor: COLORS.status.success },
  errorIcon: { backgroundColor: COLORS.status.error },
  idleIcon: {
    backgroundColor: COLORS.bg.elevated,
    borderWidth: 1,
    borderColor: COLORS.glass.border,
  },
  idleDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.text.muted,
  },
  spinner: {
    width: 24,
    height: 24,
  },
});
