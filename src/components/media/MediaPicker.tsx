// ============================================================
// src/components/media/MediaPicker.tsx
// Zona de drop / tap para seleccionar video, imagen o PDF
// ============================================================

import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../../constants/colors';
import { useMediaPicker } from '../../hooks/useMediaPicker';

export function MediaPicker() {
  const { pickFromGallery, pickDocument } = useMediaPicker();

  // Animación de pulso del ícono central
  const iconScale = useSharedValue(1);
  const borderOpacity = useSharedValue(0.4);

  React.useEffect(() => {
    iconScale.value = withRepeat(
      withSequence(
        withTiming(1.08, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
    borderOpacity.value = withRepeat(
      withSequence(
        withTiming(0.8, { duration: 1500 }),
        withTiming(0.3, { duration: 1500 })
      ),
      -1,
      false
    );
  }, []);

  const iconAnim = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
  }));

  const borderAnim = useAnimatedStyle(() => ({
    opacity: borderOpacity.value,
  }));

  const handlePress = () => {
    Alert.alert(
      'Seleccionar archivo',
      'Elige el tipo de contenido a publicar',
      [
        {
          text: '🎬 Video',
          onPress: () => pickFromGallery('video'),
        },
        {
          text: '🖼️ Imagen',
          onPress: () => pickFromGallery('image'),
        },
        {
          text: '📄 PDF',
          onPress: () => pickDocument(),
        },
        { text: 'Cancelar', style: 'cancel' },
      ]
    );
  };

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.85} style={styles.touchable}>
      {/* Borde neón animado */}
      <Animated.View style={[StyleSheet.absoluteFill, styles.neonBorder, borderAnim]} />

      <View style={styles.container}>
        {/* Gradiente de fondo sutil */}
        <LinearGradient
          colors={['rgba(0,255,212,0.04)', 'rgba(245,197,24,0.04)']}
          style={StyleSheet.absoluteFill}
        />

        {/* Ícono central animado */}
        <Animated.View style={iconAnim}>
          <View style={styles.iconCircle}>
            <Ionicons name="cloud-upload-outline" size={36} color={COLORS.neon.turquoise} />
          </View>
        </Animated.View>

        {/* Etiquetas */}
        <Text style={styles.title}>UPLOAD & DISTRIBUTE</Text>
        <Text style={styles.subtitle}>
          Toca para seleccionar video, imagen o PDF
        </Text>

        {/* Chips de formatos */}
        <View style={styles.chips}>
          {['MP4', 'MOV', 'JPG', 'PNG', 'PDF'].map((fmt) => (
            <View key={fmt} style={styles.chip}>
              <Text style={styles.chipText}>{fmt}</Text>
            </View>
          ))}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  touchable: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  neonBorder: {
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: COLORS.neon.turquoise,
    borderStyle: 'dashed',
  },
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
    paddingHorizontal: 24,
    gap: 10,
    backgroundColor: 'rgba(0,255,212,0.03)',
    borderRadius: 20,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.neon.turquoiseFaint,
    borderWidth: 1,
    borderColor: COLORS.glass.borderNeon,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  title: {
    color: COLORS.neon.turquoise,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  subtitle: {
    color: COLORS.text.secondary,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  chips: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  chip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 0.5,
    borderColor: COLORS.glass.border,
  },
  chipText: {
    color: COLORS.text.muted,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});
