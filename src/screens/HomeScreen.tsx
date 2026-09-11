// ============================================================
// src/screens/HomeScreen.tsx
// DIRECTIVA MAESTRA DE ARQUITECTURA SENIOR: REINGENIERÍA TOTAL
// PWA NATIVA Y PROPORCIÓN PLAY STORE / APP STORE
// ============================================================

import React, { useRef, useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Switch,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

import { useAppStore } from '../store/useAppStore';
import { usePublish } from '../hooks/usePublish';
import { PublishModal } from '../components/publish/PublishModal';
import { UploadMenuModal } from '../components/media/UploadMenuModal';
import { ConnectAccountModal } from '../components/auth/ConnectAccountModal';
import { SecurityModal } from '../components/security/SecurityModal';
import { TrendRadarModal } from '../components/trends/TrendRadarModal';
import { TrendAlertBanner } from '../components/trends/TrendAlertBanner';
import { getToken } from '../auth/tokenManager';
import { checkBackendSession } from '../services/tiktokAuthService';
import {
  TikTokSvg,
  InstagramSvg,
  YouTubeSvg,
  WhatsAppSvg,
  FacebookSvg,
  CloudUploadSvg,
} from '../components/ui/SocialIcons';
import type { PlatformId } from '../types/platform.types';

// ─────────────────────────────────────────────
// PALETA CYBER-ALQUIMIA OFICIAL
// ─────────────────────────────────────────────
const C = {
  bg: '#040711',
  bgCard: '#0B1220',
  bgCompose: '#090E1A',
  cyanNeon: '#00F0FF',
  cyanNodes: '#00FFD4',
  gold: '#FFD700',
  greenActive: '#00FF7F',
  white: '#FFFFFF',
  textSub: '#8EA3BF',
  textFooter: '#8A99AD',
  textMuted: 'rgba(255,255,255,0.45)',
};

// ─────────────────────────────────────────────
// UTILIDADES: GLOW NATIVO / WEB Y TECH CORNERS
// ─────────────────────────────────────────────
const getWebGlow = (color: string, radius: number) =>
  Platform.OS === 'web'
    ? ({ boxShadow: `0 0 ${radius}px ${color}` } as any)
    : {
        shadowColor: color,
        shadowRadius: radius,
        shadowOpacity: 0.9,
        elevation: 8,
      };

function TechCorners({
  color = C.cyanNeon,
  size = 10,
}: {
  color?: string;
  size?: number;
}) {
  const s = StyleSheet.create({
    tl: {
      position: 'absolute',
      top: 0,
      left: 0,
      width: size,
      height: size,
      borderTopWidth: 2,
      borderLeftWidth: 2,
      borderColor: color,
      zIndex: 2,
    },
    tr: {
      position: 'absolute',
      top: 0,
      right: 0,
      width: size,
      height: size,
      borderTopWidth: 2,
      borderRightWidth: 2,
      borderColor: color,
      zIndex: 2,
    },
    bl: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      width: size,
      height: size,
      borderBottomWidth: 2,
      borderLeftWidth: 2,
      borderColor: color,
      zIndex: 2,
    },
    br: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      width: size,
      height: size,
      borderBottomWidth: 2,
      borderRightWidth: 2,
      borderColor: color,
      zIndex: 2,
    },
  });
  return (
    <>
      <View style={s.tl} />
      <View style={s.tr} />
      <View style={s.bl} />
      <View style={s.br} />
    </>
  );
}

// ─────────────────────────────────────────────
// ZONA 1: PORTAL HOLOGRÁFICO VIVIENTE 3D (~25%)
// ─────────────────────────────────────────────
function Zone1Header({
  onInstallPress,
  onSecurityPress,
  onTrendRadarPress,
  isStandalone,
  windowHeight,
}: {
  onInstallPress: () => void;
  onSecurityPress: () => void;
  onTrendRadarPress: () => void;
  isStandalone: boolean;
  windowHeight: number;
}) {
  const rot = useSharedValue(0);
  const pulse = useSharedValue(0.4);

  useEffect(() => {
    rot.value = withRepeat(
      withTiming(360, { duration: 10000, easing: Easing.linear }),
      -1,
      false
    );
    pulse.value = withRepeat(
      withSequence(
        withTiming(0.85, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.4, { duration: 2000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rot.value}deg` }],
  }));
  const pulseStyle = useAnimatedStyle(() => ({
    opacity: pulse.value,
  }));

  const dynamicHeight = Math.max(180, Math.round(windowHeight * 0.24));

  return (
    <View style={[z1.container, { minHeight: 180, height: dynamicHeight }]}>
      {/* Botón Centro de Seguridad */}
      <TouchableOpacity
        onPress={onSecurityPress}
        style={z1.securityBtn}
        activeOpacity={0.7}
      >
        <Text style={z1.securityText}>🛡️ SEGURIDAD</Text>
      </TouchableOpacity>

      {/* Botón Radar de Tendencias en Vivo */}
      <TouchableOpacity
        onPress={onTrendRadarPress}
        style={z1.radarHeaderBtn}
        activeOpacity={0.7}
      >
        <Text style={z1.radarHeaderText}>🔥 TENDENCIAS</Text>
      </TouchableOpacity>

      {/* Botón PWA Condicional (Oculto en Standalone instalada) */}
      {!isStandalone && (
        <TouchableOpacity
          onPress={onInstallPress}
          style={z1.installBtn}
          activeOpacity={0.7}
        >
          <Text style={z1.installText}>+ INSTALAR PWA</Text>
        </TouchableOpacity>
      )}

      {/* Título Oficial Libre (Sin cajas, cursiva dorada 28px con glow difuminado) */}
      <Text style={z1.title}>Alquimia</Text>

      {/* Portal Holográfico Central (Diámetro 160px) */}
      <View
        style={[
          z1.portal,
          getWebGlow('rgba(0, 240, 255, 0.4)', 20),
        ]}
      >
        {/* Halo de energía cálida interior */}
        <Animated.View style={[z1.bgPulse, pulseStyle]} />

        {/* Aros exteriores concéntricos cian (#00F0FF) con animación continua 360° */}
        <Animated.View style={[z1.ringOuter, ringStyle]}>
          {[0, 90, 180, 270].map((deg) => (
            <View
              key={deg}
              style={[
                z1.node,
                {
                  transform: [
                    { rotate: `${deg}deg` },
                    { translateY: -80 },
                  ],
                },
              ]}
            />
          ))}
        </Animated.View>

        {/* Letra "A" Dorada Central con Relieve Visual 3D */}
        <Text style={z1.letterA}>A</Text>
      </View>
    </View>
  );
}

const z1 = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    paddingTop: 8,
  },
  securityBtn: {
    position: 'absolute',
    top: 4,
    left: 0,
    backgroundColor: 'rgba(0, 255, 212, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 0.8,
    borderColor: 'rgba(0, 255, 212, 0.4)',
    zIndex: 10,
  },
  securityText: {
    color: C.cyanNodes,
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  radarHeaderBtn: {
    position: 'absolute',
    top: 34,
    left: 0,
    backgroundColor: 'rgba(245, 197, 24, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 0.8,
    borderColor: 'rgba(245, 197, 24, 0.4)',
    zIndex: 10,
  },
  radarHeaderText: {
    color: C.gold,
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  installBtn: {
    position: 'absolute',
    top: 4,
    right: 0,
    backgroundColor: 'rgba(0, 240, 255, 0.07)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 0.8,
    borderColor: 'rgba(0, 240, 255, 0.35)',
    zIndex: 10,
  },
  installText: {
    color: C.cyanNeon,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: C.gold,
    fontStyle: 'italic',
    letterSpacing: 4,
    marginBottom: 10,
    textShadowColor: 'rgba(255, 215, 0, 0.6)',
    textShadowRadius: 14,
    textShadowOffset: { width: 0, height: 0 },
  },
  portal: {
    width: 160,
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  bgPulse: {
    position: 'absolute',
    width: 115,
    height: 115,
    borderRadius: 58,
    backgroundColor: 'rgba(255, 215, 0, 0.18)',
    shadowColor: C.gold,
    shadowRadius: 30,
    shadowOpacity: 0.8,
  },
  ringOuter: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 2,
    borderColor: 'rgba(0, 240, 255, 0.45)',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  node: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: C.cyanNodes,
    shadowColor: C.cyanNodes,
    shadowRadius: 10,
    shadowOpacity: 1,
  },
  letterA: {
    fontSize: 82,
    fontWeight: '900',
    color: '#FFD700',
    textShadowColor: '#B8860B',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 8,
  },
});

// ─────────────────────────────────────────────
// ZONA 2: MÓDULO UNIFICADO "UPLOAD & DISTRIBUTE" (~14%, 100px)
// ─────────────────────────────────────────────
function Zone2Upload({ onPress }: { onPress: () => void }) {
  const { selectedMedia, uploadProgress } = useAppStore();

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[
        z2.box,
        getWebGlow('rgba(0, 240, 255, 0.4)', 12),
      ]}
    >
      <TechCorners color={C.cyanNeon} size={12} />
      <LinearGradient
        colors={['rgba(0, 240, 255, 0.08)', 'rgba(0, 240, 255, 0.02)']}
        style={StyleSheet.absoluteFill}
      />

      {!selectedMedia ? (
        <View style={z2.inner}>
          <View style={z2.iconWrap}>
            <CloudUploadSvg size={30} color={C.cyanNeon} />
          </View>
          <Text style={z2.title}>UPLOAD & DISTRIBUTE</Text>
          <Text style={z2.formats}>MP4, JPG, PNG, PDF</Text>
        </View>
      ) : (
        <View style={z2.innerMedia}>
          <View style={z2.mediaInfo}>
            <CloudUploadSvg size={26} color={C.cyanNeon} />
            <Text style={z2.mediaName} numberOfLines={1}>
              {selectedMedia.uri.split('/').pop() || 'Archivo Listo para Distribuir'}
            </Text>
          </View>
          <View style={z2.progressTrack}>
            <Animated.View
              style={[
                z2.progressBar,
                { width: `${Math.round(uploadProgress * 100)}%` },
                getWebGlow(C.cyanNeon, 8),
              ]}
            />
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
}

const z2 = StyleSheet.create({
  box: {
    minHeight: 100,
    height: 100,
    borderRadius: 8,
    borderWidth: 1.2,
    borderColor: 'rgba(0, 240, 255, 0.5)',
    overflow: 'hidden',
    justifyContent: 'center',
    backgroundColor: 'rgba(11, 18, 32, 0.95)',
  },
  inner: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
  },
  iconWrap: {
    marginBottom: 2,
  },
  title: {
    color: C.cyanNeon,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 2,
  },
  formats: {
    color: C.textSub,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1,
  },
  innerMedia: {
    paddingHorizontal: 20,
    justifyContent: 'center',
    flex: 1,
    gap: 12,
  },
  mediaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  mediaName: {
    color: C.white,
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  progressTrack: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: C.cyanNeon,
  },
});

// ─────────────────────────────────────────────
// ZONA 3: PANEL TÁCTICO DE REDACCIÓN E IA (~16%, 115px)
// ─────────────────────────────────────────────
function Zone3Compose({ onOpenTrendRadar }: { onOpenTrendRadar: () => void }) {
  const { caption, setCaption, aiLoading, setAiLoading, selectedMedia } =
    useAppStore();
  const EMOJIS = ['😊', '🔥', '🚀', '💡', '✨', '🎯', '💎', '⚡'];

  const handleOptimize = async () => {
    if (!caption.trim()) return;
    setAiLoading(true);
    const mediaType = selectedMedia ? selectedMedia.type : 'video';
    const { generateSmartCaptions } = await import('../services/aiService');
    const result = await generateSmartCaptions(caption, mediaType);
    setCaption(result.caption);
    setAiLoading(false);
  };

  return (
    <View style={z3.wrapper}>
      {/* Banner inteligente de tendencias emergentes */}
      <TrendAlertBanner
        onApplyTrendTag={(tag) => {
          setCaption(caption ? `${caption} #${tag}` : `#${tag}`);
        }}
      />

      <View style={z3.box}>
        <TechCorners color={C.cyanNeon} size={8} />

        <TextInput
          value={caption}
          onChangeText={setCaption}
          placeholder="Redacta tu transmisión y hashtags aquí..."
          placeholderTextColor={C.textMuted}
          multiline
          style={z3.input}
        />

        <View style={z3.bottomBar}>
          <View style={z3.btnGroup}>
            <TouchableOpacity
              onPress={handleOptimize}
              disabled={aiLoading || !caption.trim()}
              style={[
                z3.aiBtn,
                getWebGlow('rgba(255, 215, 0, 0.4)', 8),
                (!caption.trim() || aiLoading) && { opacity: 0.5 },
              ]}
              activeOpacity={0.8}
            >
              {aiLoading ? (
                <ActivityIndicator size="small" color={C.gold} />
              ) : (
                <Text style={z3.aiText}>✨ Optimizar IA</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onOpenTrendRadar}
              style={[
                z3.radarBtn,
                getWebGlow('rgba(0, 255, 212, 0.25)', 8),
              ]}
              activeOpacity={0.8}
            >
              <Text style={z3.radarText}>🔥 Radar</Text>
            </TouchableOpacity>
          </View>

          <View style={z3.emojiRow}>
            {EMOJIS.map((e) => (
              <TouchableOpacity
                key={e}
                onPress={() => {
                  Haptics.selectionAsync();
                  setCaption(caption + e);
                }}
                activeOpacity={0.6}
              >
                <Text style={z3.emoji}>{e}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}

const z3 = StyleSheet.create({
  wrapper: {
    gap: 6,
  },
  box: {
    minHeight: 115,
    height: 115,
    backgroundColor: C.bgCompose,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.3)',
    padding: 10,
    justifyContent: 'space-between',
  },
  input: {
    flex: 1,
    color: C.white,
    fontSize: 13,
    textAlignVertical: 'top',
    padding: 0,
    lineHeight: 18,
  },
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 229, 255, 0.1)',
    paddingTop: 8,
    marginTop: 4,
  },
  btnGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  aiBtn: {
    backgroundColor: 'rgba(255, 215, 0, 0.12)',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 0.8,
    borderColor: C.gold,
  },
  aiText: {
    color: C.gold,
    fontSize: 10.5,
    fontWeight: '700',
  },
  radarBtn: {
    backgroundColor: 'rgba(0, 255, 212, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 0.8,
    borderColor: C.cyanNodes,
  },
  radarText: {
    color: C.cyanNodes,
    fontSize: 10.5,
    fontWeight: '800',
  },
  emojiRow: {
    flexDirection: 'row',
    gap: 5,
  },
  emoji: {
    fontSize: 14,
  },
});

// ─────────────────────────────────────────────
// ZONA 4: CONSOLA "PLATAFORMAS SINCRONIZADAS" (~33%, 5 filas x 58px = 290px)
// ─────────────────────────────────────────────
const PLATFORMS = [
  { id: 'tiktok', label: 'TikTok', sub: 'Toca para conectar', color: '#00F2FE', SvgIcon: TikTokSvg },
  { id: 'instagram', label: 'Reels de Instagram', sub: '@alquimio', color: '#E1306C', SvgIcon: InstagramSvg },
  { id: 'youtube', label: 'Cortometrajes de YouTube', sub: '@alquimio', color: '#FF0000', SvgIcon: YouTubeSvg },
  { id: 'whatsapp', label: 'WhatsApp', sub: '@alquimio', color: '#25D366', SvgIcon: WhatsAppSvg },
  { id: 'facebook', label: 'Facebook', sub: '@alquimio', color: '#1877F2', SvgIcon: FacebookSvg },
];

function Zone4Platforms({
  onSelectPlatform,
}: {
  onSelectPlatform: (id: PlatformId) => void;
}) {
  const { activePlatforms, togglePlatform, platformHandles, linkedAccounts } = useAppStore();

  return (
    <View style={z4.container}>
      <Text style={z4.title}>Plataformas Sincronizadas</Text>

      <View style={z4.list}>
        {PLATFORMS.map((p) => {
          const isActive = activePlatforms.has(p.id as PlatformId);
          const isLinked = linkedAccounts.has(p.id as PlatformId);
          const customSub = platformHandles[p.id as PlatformId] || (isLinked ? p.sub : 'Toca para conectar');

          return (
            <View key={p.id} style={z4.row}>
              <TouchableOpacity
                onPress={() => onSelectPlatform(p.id as PlatformId)}
                style={z4.touchArea}
                activeOpacity={0.7}
              >
                {/* Cuadro de Icono 44x44px con fondo oscuro #0D1424 */}
                <View
                  style={[
                    z4.iconWrap,
                    { borderColor: isActive ? p.color : 'rgba(255,255,255,0.08)' },
                    isActive ? getWebGlow(p.color, 12) : {},
                  ]}
                >
                  <p.SvgIcon size={28} />
                </View>

                {/* Textos Claros: Nombre (15px bold blanco) y Usuario (@alquimio, 13px #8EA3BF) */}
                <View style={z4.textWrap}>
                  <View style={z4.labelRow}>
                    <Text style={z4.label}>{p.label}</Text>
                    {isLinked ? (
                      <View style={z4.connectedBadge}>
                        <Text style={z4.connectedBadgeText}>Conectada</Text>
                      </View>
                    ) : (
                      <View style={z4.disconnectedBadge}>
                        <Text style={z4.disconnectedBadgeText}>No vinculada</Text>
                      </View>
                    )}
                  </View>
                  <Text style={z4.sub}>{customSub}</Text>
                </View>
              </TouchableOpacity>

              {/* Switch Verde Neón (#00FF7F) */}
              <Switch
                value={isActive}
                onValueChange={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  togglePlatform(p.id as PlatformId);
                }}
                trackColor={{ false: 'rgba(255,255,255,0.12)', true: C.greenActive }}
                thumbColor="#FFFFFF"
                style={[
                  isActive ? getWebGlow(C.greenActive, 10) : {},
                  { transform: [{ scale: 1.05 }] },
                ]}
              />
            </View>
          );
        })}
      </View>
    </View>
  );
}

const z4 = StyleSheet.create({
  container: {},
  title: {
    color: C.white,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  list: {
    gap: 6,
  },
  row: {
    height: 58,
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.bgCard,
    borderRadius: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  touchArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  iconWrap: {
    width: 44,
    height: 44,
    backgroundColor: '#0D1424',
    borderRadius: 12,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textWrap: {
    flex: 1,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  connectedBadge: {
    backgroundColor: 'rgba(0, 255, 127, 0.12)',
    borderWidth: 0.8,
    borderColor: 'rgba(0, 255, 127, 0.45)',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  connectedBadgeText: {
    color: '#00FF7F',
    fontSize: 9.5,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  disconnectedBadge: {
    backgroundColor: 'rgba(255, 100, 100, 0.08)',
    borderWidth: 0.8,
    borderColor: 'rgba(255, 100, 100, 0.25)',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  disconnectedBadgeText: {
    color: '#FF8080',
    fontSize: 9.5,
    fontWeight: '600',
  },
  label: {
    color: C.white,
    fontSize: 15,
    fontWeight: '700',
  },
  sub: {
    color: C.textSub,
    fontSize: 13,
    marginTop: 2,
    fontWeight: '500',
  },
});

// ─────────────────────────────────────────────
// ZONA 5: BOTÓN MAESTRO "PUBLICAR EN BLOQUE" (56px) Y AUTORÍA
// ─────────────────────────────────────────────
function Zone5Publish({
  onPress,
  onSecurityPress,
}: {
  onPress: () => void;
  onSecurityPress: () => void;
}) {
  const pulse = useSharedValue(0.6);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1500 }),
        withTiming(0.6, { duration: 1500 })
      ),
      -1,
      true
    );
  }, []);

  const glowStyle = useAnimatedStyle(() => ({
    borderColor: `rgba(0, 240, 255, ${pulse.value})`,
    shadowOpacity: pulse.value,
  }));

  return (
    <View style={z5.container}>
      <TouchableOpacity
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          onPress();
        }}
        activeOpacity={0.85}
      >
        <Animated.View
          style={[
            z5.btn,
            glowStyle,
            getWebGlow(C.cyanNeon, 16),
          ]}
        >
          <LinearGradient
            colors={['rgba(0, 240, 255, 0.22)', 'rgba(0, 100, 255, 0.12)']}
            style={StyleSheet.absoluteFill}
          />
          <TechCorners color={C.cyanNeon} size={8} />
          <Text style={[z5.text, getWebGlow(C.cyanNeon, 8)]}>
            ⚡ PUBLICAR EN BLOQUE
          </Text>
        </Animated.View>
      </TouchableOpacity>

      {/* Sello de Autoría Legible e Inalterable */}
      <Text style={z5.footerText}>
        Alquimio v1.0 • Creado por Israel Montás • © 2026 Todos los derechos reservados
      </Text>

      {/* Enlaces Legales Públicos */}
      <View style={z5.legalLinks}>
        <TouchableOpacity
          onPress={onSecurityPress}
          activeOpacity={0.7}
        >
          <Text style={[z5.legalLinkText, { color: C.gold }]}>🛡️ Seguridad</Text>
        </TouchableOpacity>
        <Text style={z5.legalSeparator}>•</Text>
        <TouchableOpacity
          onPress={() => {
            if (Platform.OS === 'web' && typeof window !== 'undefined') {
              window.open('/privacy.html', '_blank');
            } else {
              Linking.openURL('https://alquimia-studio.pages.dev/privacy.html');
            }
          }}
          activeOpacity={0.7}
        >
          <Text style={z5.legalLinkText}>Privacidad</Text>
        </TouchableOpacity>
        <Text style={z5.legalSeparator}>•</Text>
        <TouchableOpacity
          onPress={() => {
            if (Platform.OS === 'web' && typeof window !== 'undefined') {
              window.open('/terms.html', '_blank');
            } else {
              Linking.openURL('https://alquimia-studio.pages.dev/terms.html');
            }
          }}
          activeOpacity={0.7}
        >
          <Text style={z5.legalLinkText}>Términos</Text>
        </TouchableOpacity>
        <Text style={z5.legalSeparator}>•</Text>
        <TouchableOpacity
          onPress={() => {
            if (Platform.OS === 'web' && typeof window !== 'undefined') {
              window.open('/eliminar-datos.html', '_blank');
            } else {
              Linking.openURL('https://alquimia-studio.pages.dev/eliminar-datos.html');
            }
          }}
          activeOpacity={0.7}
        >
          <Text style={z5.legalLinkText}>Eliminar Datos</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const z5 = StyleSheet.create({
  container: {
    marginTop: 2,
    marginBottom: 20,
  },
  btn: {
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1.5,
    backgroundColor: '#090E1A',
    overflow: 'hidden',
  },
  text: {
    color: C.white,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 2,
  },
  footerText: {
    color: C.textFooter,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 14,
    letterSpacing: 0.5,
    fontWeight: '500',
  },
  legalLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  legalLinkText: {
    color: C.cyanNeon,
    fontSize: 11,
    fontWeight: '600',
    opacity: 0.85,
  },
  legalSeparator: {
    color: C.textFooter,
    fontSize: 11,
  },
});

// ─────────────────────────────────────────────
// PANTALLA PRINCIPAL (RAÍZ)
// ─────────────────────────────────────────────
export default function HomeScreen() {
  const { selectedMedia, linkAccount } = useAppStore();
  const { handlePublish } = usePublish();
  const scrollRef = useRef<ScrollView>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [showSecurityModal, setShowSecurityModal] = useState(false);
  const [showTrendRadar, setShowTrendRadar] = useState(false);
  const [selectedPlatformForConnect, setSelectedPlatformForConnect] =
    useState<PlatformId | null>(null);

  // DETECCIÓN DINÁMICA DE DIMENSIONES DE PANTALLA
  const { width, height } = useWindowDimensions();
  const isMobile = width <= 768;

  // DETECCIÓN AUTOMÁTICA DE PWA STANDALONE INSTALADA
  const [isStandalone, setIsStandalone] = useState(false);

  // Sincronizar cuenta de TikTok con sesión de backend y token local
  useEffect(() => {
    async function syncTikTok() {
      const connectedOnBackend = await checkBackendSession();
      if (!connectedOnBackend) {
        const tk = await getToken('tiktok');
        if (tk?.accessToken) {
          linkAccount('tiktok', tk.displayName || '@tiktok_user');
        }
      }
    }
    syncTikTok();
  }, [linkAccount]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const standalone = Boolean(
        window.matchMedia('(display-mode: standalone)').matches ||
          (window.navigator as any).standalone
      );
      setIsStandalone(standalone);

      const handler = (e: any) => {
        e.preventDefault();
        (window as any).pwaPrompt = e;
      };
      window.addEventListener('beforeinstallprompt', handler);
      return () => window.removeEventListener('beforeinstallprompt', handler);
    }
  }, []);

  const handleInstallPress = () => {
    const promptEvent = (window as any).pwaPrompt;
    if (promptEvent) {
      promptEvent.prompt();
    } else {
      Alert.alert(
        'Instalar Alquimio Studio',
        Platform.OS === 'web' &&
          /iPhone|iPad|iPod/.test(
            typeof navigator !== 'undefined' ? navigator.userAgent : ''
          )
          ? 'Para instalar en tu iPhone o iPad:\n1. Toca el botón Compartir en Safari.\n2. Elige "Agregar a pantalla de inicio".\n3. ¡Listo! La app se abrirá como nativa.'
          : 'Para instalar en este navegador:\n1. Toca el icono de instalación en la barra o en el menú ⋮.\n2. Selecciona "Instalar Alquimio Studio".',
        [{ text: 'Entendido' }]
      );
    }
  };

  const onPublishClick = () => {
    if (!selectedMedia) return setShowUpload(true);
    handlePublish();
  };

  return (
    <>
      <StatusBar
        barStyle="light-content"
        backgroundColor={C.bg}
        translucent={false}
      />

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.flex}
        >
          {/* Fondo Grafito Espacial con Cuadrícula Sutil */}
          <View style={styles.bgGrid} />

          {/* CONTENEDOR RESPONSIVO MÓVIL / DESKTOP */}
          <View
            style={[
              styles.wrapper,
              {
                width: '100%',
                maxWidth: isMobile ? undefined : 480,
                marginHorizontal: isMobile ? 0 : 'auto',
              },
            ]}
          >
            <ScrollView
              ref={scrollRef}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{
                flexGrow: 1,
                paddingVertical: 16,
                paddingHorizontal: isMobile ? 16 : 0,
                gap: 14,
              }}
              keyboardShouldPersistTaps="handled"
            >
              {/* ZONA 1: Portal Holográfico Viviente */}
              <Zone1Header
                onInstallPress={handleInstallPress}
                onSecurityPress={() => setShowSecurityModal(true)}
                onTrendRadarPress={() => setShowTrendRadar(true)}
                isStandalone={isStandalone}
                windowHeight={height}
              />

              {/* ZONA 2: Módulo Unificado Upload & Distribute */}
              <Zone2Upload onPress={() => setShowUpload(true)} />

              {/* ZONA 3: Panel Táctico de Redacción e IA */}
              <Zone3Compose
                onOpenTrendRadar={() => setShowTrendRadar(true)}
              />

              {/* ZONA 4: Consola Plataformas Sincronizadas */}
              <Zone4Platforms
                onSelectPlatform={setSelectedPlatformForConnect}
              />

              {/* ZONA 5: Botón Maestro y Autoría */}
              <Zone5Publish
                onPress={onPublishClick}
                onSecurityPress={() => setShowSecurityModal(true)}
              />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* Modales del Sistema */}
      <UploadMenuModal
        visible={showUpload}
        onClose={() => setShowUpload(false)}
      />
      <ConnectAccountModal
        platformId={selectedPlatformForConnect}
        onClose={() => setSelectedPlatformForConnect(null)}
      />
      <SecurityModal
        visible={showSecurityModal}
        onClose={() => setShowSecurityModal(false)}
      />
      <TrendRadarModal
        visible={showTrendRadar}
        onClose={() => setShowTrendRadar(false)}
        onSelectHashtags={(tags) => {
          const formatted = tags.map((t) => `#${t}`).join(' ');
          const current = useAppStore.getState().caption;
          useAppStore.getState().setCaption(current ? `${current}\n\n${formatted}` : formatted);
        }}
        onSelectTopicTemplate={(hook, body) => {
          useAppStore.getState().setCaption(`${hook}\n\n${body}`);
        }}
      />
      <PublishModal />
    </>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: C.bg,
  },
  flex: {
    flex: 1,
  },
  wrapper: {
    flex: 1,
  },
  bgGrid: {
    ...(StyleSheet.absoluteFill as any),
    opacity: 0.05,
    backgroundImage:
      'linear-gradient(#00F0FF 1px, transparent 1px), linear-gradient(90deg, #00F0FF 1px, transparent 1px)',
    backgroundSize: '30px 30px',
  } as any,
});
