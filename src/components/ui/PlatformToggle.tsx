// ============================================================
// src/components/ui/PlatformToggle.tsx
// Tarjeta compacta con ícono, nombre de cuenta y toggle activo
// ============================================================

import React, { useCallback } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Switch,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { COLORS } from '../../constants/colors';
import type { PlatformConfig } from '../../types/platform.types';

interface PlatformToggleProps {
  config: PlatformConfig;
  isActive: boolean;
  onToggle: () => void;
  onSettingsPress?: () => void;
}

export function PlatformToggle({
  config,
  isActive,
  onToggle,
  onSettingsPress,
}: PlatformToggleProps) {
  const activeAnim = useSharedValue(isActive ? 1 : 0);
  const scale = useSharedValue(1);

  React.useEffect(() => {
    activeAnim.value = withTiming(isActive ? 1 : 0, { duration: 250 });
  }, [isActive]);

  const cardStyle = useAnimatedStyle(() => ({
    borderColor: isActive
      ? `rgba(${hexToRgb(config.accentColor)},${interpolate(activeAnim.value, [0, 1], [0, 0.6])})`
      : COLORS.glass.border,
    backgroundColor: isActive
      ? `rgba(${hexToRgb(config.accentColor)},${interpolate(activeAnim.value, [0, 1], [0, 0.06])})`
      : COLORS.glass.background,
  }));

  const iconStyle = useAnimatedStyle(() => ({
    opacity: interpolate(activeAnim.value, [0, 1], [0.4, 1]),
    transform: [{ scale: interpolate(activeAnim.value, [0, 1], [0.9, 1]) }],
  }));

  const handleToggle = useCallback(() => {
    scale.value = withSpring(0.95, { damping: 10 }, () => {
      scale.value = withSpring(1, { damping: 10 });
    });
    Haptics.selectionAsync();
    onToggle();
  }, [onToggle]);

  return (
    <Animated.View style={[styles.card, cardStyle]}>
      {/* Ícono de plataforma */}
      <Animated.View style={[styles.iconContainer, iconStyle]}>
        <Ionicons
          name={config.iconName as keyof typeof Ionicons.glyphMap}
          size={24}
          color={isActive ? config.iconColor : COLORS.text.muted}
        />
      </Animated.View>

      {/* Info de cuenta */}
      <View style={styles.info}>
        <Text style={[styles.platformName, isActive && styles.platformNameActive]}>
          {config.name}
        </Text>
        <Text style={styles.handle}>{config.handle}</Text>
      </View>

      {/* Acciones */}
      <View style={styles.actions}>
        {onSettingsPress && isActive && (
          <TouchableOpacity
            onPress={onSettingsPress}
            style={styles.settingsBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name="settings-outline"
              size={14}
              color={COLORS.text.secondary}
            />
          </TouchableOpacity>
        )}
        <Switch
          value={isActive}
          onValueChange={handleToggle}
          trackColor={{
            false: COLORS.toggle.inactive,
            true: COLORS.toggle.active,
          }}
          thumbColor={COLORS.toggle.thumb}
          ios_backgroundColor={COLORS.toggle.inactive}
        />
      </View>
    </Animated.View>
  );
}

/** Convierte un hex (#RRGGBB) a "R,G,B" para usar en rgba() */
function hexToRgb(hex: string): string {
  const clean = hex.replace('#', '');
  const num = parseInt(clean, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `${r},${g},${b}`;
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
    marginBottom: 8,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    gap: 2,
  },
  platformName: {
    color: COLORS.text.secondary,
    fontSize: 14,
    fontWeight: '600',
  },
  platformNameActive: {
    color: COLORS.text.primary,
  },
  handle: {
    color: COLORS.text.muted,
    fontSize: 11,
    fontWeight: '400',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  settingsBtn: {
    padding: 4,
  },
});
