// ============================================================
// src/components/ui/GlassCard.tsx
// Contenedor glassmorphism reutilizable con expo-blur
// ============================================================

import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { COLORS } from '../../constants/colors';

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  intensity?: number;
  neonBorder?: boolean;
  goldBorder?: boolean;
  padding?: number;
}

export function GlassCard({
  children,
  style,
  intensity = 20,
  neonBorder = false,
  goldBorder = false,
  padding = 16,
}: GlassCardProps) {
  const borderColor = neonBorder
    ? COLORS.glass.borderNeon
    : goldBorder
    ? COLORS.glass.borderGold
    : COLORS.glass.border;

  return (
    <View
      style={[
        styles.wrapper,
        { borderColor },
        neonBorder && styles.neonShadow,
        goldBorder && styles.goldShadow,
        style,
      ]}
    >
      <BlurView intensity={intensity} tint="dark" style={StyleSheet.absoluteFill} />
      <View style={[styles.overlay, { padding }]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    backgroundColor: COLORS.glass.background,
  },
  overlay: {
    // Encima del blur
  },
  neonShadow: {
    shadowColor: COLORS.neon.turquoise,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  goldShadow: {
    shadowColor: COLORS.gold.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
});
