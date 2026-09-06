// ============================================================
// src/components/publish/PublishModal.tsx
// Modal de progreso de publicación con estado por plataforma
// ============================================================

import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Modal,
  ScrollView,
  Linking,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  FadeIn,
  SlideInDown,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, GRADIENTS } from '../../constants/colors';
import { useAppStore } from '../../store/useAppStore';
import { PlatformStatus } from './PlatformStatus';

export function PublishModal() {
  const {
    isPublishModalVisible,
    publishSession,
    hidePublishModal,
    resetSession,
  } = useAppStore();

  if (!publishSession) return null;

  const { status, results } = publishSession;
  const isFinished = status === 'completed' || status === 'partial_error';
  const successCount = results.filter((r) => r.status === 'success').length;
  const errorCount = results.filter((r) => r.status === 'error').length;

  const handleClose = () => {
    if (isFinished) {
      resetSession();
    }
    hidePublishModal();
  };

  const getHeaderConfig = () => {
    if (!isFinished) {
      return {
        title: 'PUBLICANDO...',
        subtitle: 'Transmitiendo a tus redes',
        icon: 'flash',
        color: COLORS.neon.turquoise,
      };
    }
    if (status === 'completed') {
      return {
        title: '¡TRANSMISIÓN COMPLETA!',
        subtitle: `${successCount} red${successCount !== 1 ? 'es' : ''} actualizada${successCount !== 1 ? 's' : ''} con éxito`,
        icon: 'checkmark-circle',
        color: COLORS.status.success,
      };
    }
    return {
      title: 'PUBLICACIÓN PARCIAL',
      subtitle: `${successCount} exitosas · ${errorCount} con error`,
      icon: 'warning',
      color: COLORS.status.warning,
    };
  };

  const header = getHeaderConfig();

  return (
    <Modal
      visible={isPublishModalVisible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <BlurView intensity={50} tint="dark" style={StyleSheet.absoluteFill} />

        <Animated.View
          entering={SlideInDown.springify().damping(18).stiffness(120)}
          style={styles.sheet}
        >
          {/* Barra superior decorativa */}
          <View style={styles.sheetBar} />

          {/* Header con gradiente */}
          <LinearGradient
            colors={
              isFinished && status === 'completed'
                ? ['rgba(0,230,118,0.12)', 'transparent']
                : isFinished
                ? ['rgba(255,179,71,0.12)', 'transparent']
                : [COLORS.neon.turquoiseGlow, 'transparent']
            }
            style={styles.headerGradient}
          >
            <View style={styles.headerIconWrap}>
              <Ionicons
                name={header.icon as keyof typeof Ionicons.glyphMap}
                size={32}
                color={header.color}
              />
            </View>
            <Text style={[styles.headerTitle, { color: header.color }]}>
              {header.title}
            </Text>
            <Text style={styles.headerSubtitle}>{header.subtitle}</Text>
          </LinearGradient>

          {/* Divisor neón */}
          <View style={[styles.divider, { backgroundColor: header.color + '33' }]} />

          {/* Lista de estados por plataforma */}
          <ScrollView
            style={styles.list}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          >
            {results.map((result) => (
              <PlatformStatus key={result.platformId} result={result} />
            ))}
          </ScrollView>

          {/* Acciones finales */}
          {isFinished && (
            <Animated.View entering={FadeIn.delay(400)} style={styles.actions}>
              {/* Links a posts exitosos */}
              {results
                .filter((r) => r.status === 'success' && r.postUrl)
                .map((r) => (
                  <TouchableOpacity
                    key={r.platformId}
                    onPress={() => r.postUrl && Linking.openURL(r.postUrl)}
                    style={styles.linkBtn}
                  >
                    <Ionicons
                      name="open-outline"
                      size={12}
                      color={COLORS.neon.turquoise}
                    />
                    <Text style={styles.linkText}>Ver en {r.platformId}</Text>
                  </TouchableOpacity>
                ))}

              <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
                <LinearGradient
                  colors={GRADIENTS.publishButton}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.closeBtnGradient}
                >
                  <Text style={styles.closeBtnText}>
                    {status === 'completed' ? 'PERFECTO 🔥' : 'ENTENDIDO'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    backgroundColor: COLORS.bg.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderTopColor: COLORS.glass.borderNeon,
    maxHeight: '80%',
    paddingBottom: 36,
    shadowColor: COLORS.neon.turquoise,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 24,
  },
  sheetBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.glass.border,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 4,
  },
  headerGradient: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 24,
    gap: 6,
  },
  headerIconWrap: {
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 2,
  },
  headerSubtitle: {
    color: COLORS.text.secondary,
    fontSize: 13,
  },
  divider: {
    height: 1,
    marginHorizontal: 24,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    gap: 2,
  },
  actions: {
    paddingHorizontal: 24,
    paddingTop: 16,
    gap: 10,
  },
  linkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
  },
  linkText: {
    color: COLORS.neon.turquoise,
    fontSize: 12,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  closeBtn: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  closeBtnGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  closeBtnText: {
    color: COLORS.bg.deepBlack,
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 2,
  },
});
