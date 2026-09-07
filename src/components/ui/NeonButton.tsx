// ============================================================
// src/components/ui/NeonButton.tsx
// Botón prominente con glow neón turquesa y gradiente
// ============================================================

import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  ViewStyle,
  ActivityIndicator,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { COLORS, GRADIENTS } from '../../constants/colors';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

interface NeonButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  variant?: 'primary' | 'secondary' | 'ghost';
  icon?: React.ReactNode;
}

export function NeonButton({
  label,
  onPress,
  disabled = false,
  loading = false,
  style,
  variant = 'primary',
  icon,
}: NeonButtonProps) {
  const scale = useSharedValue(1);
  const glowOpacity = useSharedValue(0.6);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.96, { damping: 15 });
    glowOpacity.value = withTiming(1, { duration: 150 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15 });
    glowOpacity.value = withTiming(0.6, { duration: 300 });
  };

  const isDisabled = disabled || loading;

  return (
    <AnimatedTouchable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={isDisabled}
      activeOpacity={0.9}
      style={[animatedStyle, styles.wrapper, style]}
    >
      {/* Glow difuso detrás del botón */}
      <Animated.View style={[styles.glow, glowStyle]} />

      {variant === 'primary' ? (
        <LinearGradient
          colors={isDisabled ? ['#2A2A35', '#1A1A25'] : GRADIENTS.publishButton}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradient}
        >
          <ButtonContent
            label={label}
            loading={loading}
            icon={icon}
            labelStyle={[styles.labelPrimary, isDisabled && styles.labelDisabled]}
          />
        </LinearGradient>
      ) : variant === 'secondary' ? (
        <View style={[styles.secondary, isDisabled && styles.disabled]}>
          <ButtonContent
            label={label}
            loading={loading}
            icon={icon}
            labelStyle={[styles.labelSecondary, isDisabled && styles.labelDisabled]}
          />
        </View>
      ) : (
        <View style={styles.ghost}>
          <ButtonContent
            label={label}
            loading={loading}
            icon={icon}
            labelStyle={styles.labelGhost}
          />
        </View>
      )}
    </AnimatedTouchable>
  );
}

function ButtonContent({
  label,
  loading,
  icon,
  labelStyle,
}: {
  label: string;
  loading?: boolean;
  icon?: React.ReactNode;
  labelStyle: object | object[];
}) {
  return (
    <View style={styles.content}>
      {loading ? (
        <ActivityIndicator color={COLORS.bg.deepBlack} size="small" />
      ) : (
        <>
          {icon && <View style={styles.iconWrapper}>{icon}</View>}
          <Text style={labelStyle}>{label}</Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: 16,
    overflow: 'visible',
  },
  glow: {
    ...StyleSheet.absoluteFill,
    borderRadius: 16,
    backgroundColor: COLORS.neon.turquoise,
    opacity: 0.15,
    // Expande el glow más allá del botón
    margin: -8,
    zIndex: -1,
  },
  gradient: {
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 24,
  },
  secondary: {
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderWidth: 1.5,
    borderColor: COLORS.neon.turquoise,
    backgroundColor: COLORS.neon.turquoiseFaint,
  },
  ghost: {
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  disabled: {
    borderColor: COLORS.text.muted,
    backgroundColor: 'transparent',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  iconWrapper: {
    marginRight: 4,
  },
  labelPrimary: {
    color: COLORS.bg.deepBlack,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  labelSecondary: {
    color: COLORS.neon.turquoise,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1,
  },
  labelGhost: {
    color: COLORS.text.secondary,
    fontSize: 13,
    fontWeight: '600',
  },
  labelDisabled: {
    color: COLORS.text.muted,
  },
});
