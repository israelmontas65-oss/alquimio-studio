// ============================================================
// src/screens/HomeScreen.tsx
// RE-CALIBRACIÓN ESTRICTA: PROPORCIONES, ICONOS Y TIPOGRAFÍA
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
  Dimensions,
  ActivityIndicator,
  Alert
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
import { MediaPicker } from '../components/media/MediaPicker';
import { UploadMenuModal } from '../components/media/UploadMenuModal';
import { ConnectAccountModal } from '../components/auth/ConnectAccountModal';
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
// PALETA CYBER-ALQUIMIA EXACTA
// ─────────────────────────────────────────────
const C = {
  bg: '#040711',
  bgCompose: '#090E1A',
  cyanNeon: '#00F0FF',
  cyanNodes: '#00FFD4',
  gold: '#FFD700',
  greenActive: '#00FF7F',
  white: '#FFFFFF',
  textMuted: 'rgba(255,255,255,0.5)',
};

// ─────────────────────────────────────────────
// UTILIDADES: EFECTOS GLOW Y CORNERS
// ─────────────────────────────────────────────
const getWebGlow = (color: string, radius: number) => 
  Platform.OS === 'web' ? { boxShadow: `0 0 ${radius}px ${color}` } as any : { shadowColor: color, shadowRadius: radius, shadowOpacity: 1, elevation: 10 };

function TechCorners({ color = C.cyanNeon, size = 10 }: { color?: string; size?: number }) {
  const s = StyleSheet.create({
    tl: { position: 'absolute', top: 0, left: 0, width: size, height: size, borderTopWidth: 2, borderLeftWidth: 2, borderColor: color },
    tr: { position: 'absolute', top: 0, right: 0, width: size, height: size, borderTopWidth: 2, borderRightWidth: 2, borderColor: color },
    bl: { position: 'absolute', bottom: 0, left: 0, width: size, height: size, borderBottomWidth: 2, borderLeftWidth: 2, borderColor: color },
    br: { position: 'absolute', bottom: 0, right: 0, width: size, height: size, borderBottomWidth: 2, borderRightWidth: 2, borderColor: color },
  });
  return <><View style={s.tl} /><View style={s.tr} /><View style={s.bl} /><View style={s.br} /></>;
}

// ─────────────────────────────────────────────
// ZONA 1: PORTAL HOLOGRÁFICO VIVIENTE
// ─────────────────────────────────────────────
function Zone1Header({ onInstallPress }: { onInstallPress: () => void }) {
  const rot = useSharedValue(0);
  const pulse = useSharedValue(0.4);

  useEffect(() => {
    rot.value = withRepeat(withTiming(360, { duration: 10000, easing: Easing.linear }), -1, false);
    pulse.value = withRepeat(withSequence(
      withTiming(0.8, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
      withTiming(0.4, { duration: 2000, easing: Easing.inOut(Easing.ease) })
    ), -1, true);
  }, []);

  const ringStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${rot.value}deg` }] }));
  const pulseStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));

  return (
    <View style={z1.container}>
      
      {/* Botón PWA Discreto */}
      <TouchableOpacity onPress={onInstallPress} style={z1.installBtn}>
        <Text style={z1.installText}>+ INSTALAR PWA</Text>
      </TouchableOpacity>

      {/* Título Libre, SIN CAJA (solo textShadow) */}
      <Text style={z1.title}>Alquimia</Text>
      
      {/* Portal (Expandido) */}
      <View style={z1.portal}>
        {/* Glow de fondo animado */}
        <Animated.View style={[z1.bgPulse, pulseStyle]} />

        {/* Anillo en Rotación */}
        <Animated.View style={[z1.ringOuter, ringStyle, getWebGlow('rgba(0, 255, 212, 0.5)', 15)]}>
          {[0, 90, 180, 270].map(deg => (
            <View key={deg} style={[z1.node, { transform: [{ rotate: `${deg}deg` }, { translateY: -95 }] }]} />
          ))}
        </Animated.View>

        {/* Letra Central 3D más grande */}
        <Text style={z1.letterA}>A</Text>
      </View>
    </View>
  );
}

const z1 = StyleSheet.create({
  container: { height: 260, alignItems: 'center', justifyContent: 'center', paddingTop: 24, position: 'relative' },
  installBtn: { position: 'absolute', top: 5, right: 16, backgroundColor: 'rgba(255, 255, 255, 0.05)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 0.5, borderColor: 'rgba(0, 240, 255, 0.3)' },
  installText: { color: 'rgba(0, 240, 255, 0.7)', fontSize: 9, fontWeight: '600', letterSpacing: 1 },
  title: { fontSize: 34, fontWeight: '800', color: C.gold, fontStyle: 'italic', letterSpacing: 4, marginBottom: 20, textShadowColor: 'rgba(255, 215, 0, 0.8)', textShadowRadius: 15, textShadowOffset: { width: 0, height: 0 } },
  portal: { width: 190, height: 190, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  bgPulse: { position: 'absolute', width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(255, 215, 0, 0.15)', shadowColor: C.gold, shadowRadius: 35, shadowOpacity: 0.8 },
  ringOuter: { position: 'absolute', width: 190, height: 190, borderRadius: 95, borderWidth: 2, borderColor: 'rgba(0, 255, 212, 0.4)', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  node: { position: 'absolute', width: 8, height: 8, borderRadius: 4, backgroundColor: C.cyanNodes, shadowColor: C.cyanNodes, shadowRadius: 10, shadowOpacity: 1 },
  letterA: { fontSize: 95, fontWeight: '900', color: '#FFFFFF', textShadowColor: '#B8860B', textShadowOffset: { width: 2, height: 2 }, textShadowRadius: 8 },
});

// ─────────────────────────────────────────────
// ZONA 2: MÓDULO UNIFICADO UPLOAD
// ─────────────────────────────────────────────
function Zone2Upload({ onPress }: { onPress: () => void }) {
  const { selectedMedia, uploadProgress } = useAppStore();
  
  return (
    <TouchableOpacity activeOpacity={0.8} onPress={onPress} style={[z2.box, getWebGlow('rgba(0, 240, 255, 0.4)', 12)]}>
      <TechCorners color={C.cyanNeon} size={12} />
      <LinearGradient colors={['rgba(0, 240, 255, 0.08)', 'rgba(0, 240, 255, 0.02)']} style={StyleSheet.absoluteFill} />

      {!selectedMedia ? (
        <View style={z2.inner}>
          <View style={z2.iconWrap}>
            <CloudUploadSvg size={28} color={C.cyanNeon} />
          </View>
          <Text style={z2.title}>UPLOAD & DISTRIBUTE</Text>
          <Text style={z2.sub}>Video / Foto / PDF</Text>
        </View>
      ) : (
        <View style={z2.innerMedia}>
          <View style={z2.mediaInfo}>
            <CloudUploadSvg size={24} color={C.cyanNeon} />
            <Text style={z2.mediaName} numberOfLines={1}>{selectedMedia.uri.split('/').pop() || 'Archivo Seleccionado'}</Text>
          </View>
          <View style={z2.progressTrack}>
            <Animated.View style={[z2.progressBar, { width: `${uploadProgress * 100}%` }, getWebGlow(C.cyanNeon, 8)]} />
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
}

const z2 = StyleSheet.create({
  box: { height: 95, marginHorizontal: 16, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(0, 240, 255, 0.5)', overflow: 'hidden', justifyContent: 'center' },
  inner: { alignItems: 'center', justifyContent: 'center', gap: 4 },
  iconWrap: { marginBottom: 2 },
  title: { color: C.cyanNeon, fontSize: 13, fontWeight: '800', letterSpacing: 2 },
  sub: { color: C.textMuted, fontSize: 10, letterSpacing: 1 },
  innerMedia: { paddingHorizontal: 20, justifyContent: 'center', flex: 1, gap: 12 },
  mediaInfo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  mediaName: { color: C.white, fontSize: 14, fontWeight: '600', flex: 1 },
  progressTrack: { height: 4, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden' },
  progressBar: { height: '100%', backgroundColor: C.cyanNeon },
});

// ─────────────────────────────────────────────
// ZONA 3: PANEL TÁCTICO DE REDACCIÓN E IA
// ─────────────────────────────────────────────
function Zone3Compose() {
  const { caption, setCaption, aiLoading, setAiLoading, selectedMedia } = useAppStore();
  const EMOJIS = ['😊', '🔥', '🚀', '💡', '✨', '🎯', '💎', '⚡'];

  const handleOptimize = async () => {
    if (!caption.trim()) return;
    setAiLoading(true);
    const mediaType = selectedMedia ? selectedMedia.type : 'video';
    const { generateSmartCaptions } = await import('../services/aiService');
    const result = await generateSmartCaptions(caption, mediaType);
    setCaption(result.caption + (result.hashtags.length ? '\n\n' + result.hashtags.map(h => `#${h}`).join(' ') : ''));
    setAiLoading(false);
  };

  return (
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
        <TouchableOpacity onPress={handleOptimize} disabled={aiLoading || !caption.trim()} style={[z3.aiBtn, getWebGlow('rgba(255, 215, 0, 0.4)', 8)]}>
          {aiLoading ? <ActivityIndicator size="small" color={C.gold} /> : <Text style={z3.aiText}>✨ Optimizar con IA</Text>}
        </TouchableOpacity>
        
        <View style={z3.emojiRow}>
          {EMOJIS.map(e => (
            <TouchableOpacity key={e} onPress={() => { Haptics.selectionAsync(); setCaption(caption + e); }}>
              <Text style={z3.emoji}>{e}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
}

const z3 = StyleSheet.create({
  box: { height: 110, marginHorizontal: 16, backgroundColor: C.bgCompose, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(0, 229, 255, 0.3)', padding: 10, justifyContent: 'space-between' },
  input: { flex: 1, color: C.white, fontSize: 13, textAlignVertical: 'top', padding: 0 },
  bottomBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: 'rgba(0, 229, 255, 0.1)', paddingTop: 8, marginTop: 4 },
  aiBtn: { backgroundColor: 'rgba(255, 215, 0, 0.1)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 4, borderWidth: 0.5, borderColor: C.gold },
  aiText: { color: C.gold, fontSize: 10, fontWeight: '700' },
  emojiRow: { flexDirection: 'row', gap: 6 },
  emoji: { fontSize: 14 },
});

// ─────────────────────────────────────────────
// ZONA 4: PLATAFORMAS SINCRONIZADAS
// ─────────────────────────────────────────────
const PLATFORMS = [
  { id: 'tiktok', label: 'TikTok', sub: 'Francia', color: '#00F2FE', SvgIcon: TikTokSvg }, // Color primario resaltado
  { id: 'instagram', label: 'Reels de Instagram', sub: '@alquimio', color: '#E1306C', SvgIcon: InstagramSvg },
  { id: 'youtube', label: 'Cortometrajes de YouTube', sub: '@alquimio', color: '#FF0000', SvgIcon: YouTubeSvg },
  { id: 'whatsapp', label: 'WhatsApp (Business)', sub: '@alquimio', color: '#25D366', SvgIcon: WhatsAppSvg },
  { id: 'facebook', label: 'Facebook', sub: '@alquimio', color: '#1877F2', SvgIcon: FacebookSvg },
];

function Zone4Platforms({ onSelectPlatform }: { onSelectPlatform: (id: PlatformId) => void }) {
  const { activePlatforms, togglePlatform, platformHandles } = useAppStore();

  return (
    <View style={z4.container}>
      <Text style={z4.title}>Plataformas Sincronizadas</Text>
      
      <View style={z4.list}>
        {PLATFORMS.map((p) => {
          const isActive = activePlatforms.has(p.id as PlatformId);
          const customSub = platformHandles[p.id as PlatformId] || p.sub;

          return (
            <View key={p.id} style={z4.row}>
              <TouchableOpacity onPress={() => onSelectPlatform(p.id as PlatformId)} style={z4.touchArea}>
                {/* Cuadro de Icono de 44x44px con glow condicional */}
                <View style={[
                  z4.iconWrap,
                  { borderColor: isActive ? p.color : 'rgba(255,255,255,0.05)' },
                  isActive ? getWebGlow(p.color, 12) : {}
                ]}>
                  {/* Icono de tamaño 28px */}
                  <p.SvgIcon size={28} />
                </View>

                <View style={z4.textWrap}>
                  <Text style={[z4.label, isActive && { color: C.white }]}>{p.label}</Text>
                  <Text style={z4.sub}>{customSub}</Text>
                </View>
              </TouchableOpacity>
              
              <Switch
                value={isActive}
                onValueChange={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); togglePlatform(p.id as PlatformId); }}
                trackColor={{ false: 'rgba(255,255,255,0.1)', true: C.greenActive }}
                thumbColor="#FFF"
                style={[isActive ? getWebGlow(C.greenActive, 10) : {}, { transform: [{ scale: 1.05 }] }]}
              />
            </View>
          );
        })}
      </View>
    </View>
  );
}

const z4 = StyleSheet.create({
  container: { marginHorizontal: 16 },
  title: { color: C.white, fontSize: 14, fontWeight: '700', marginBottom: 12, letterSpacing: 0.5 },
  list: { gap: 6 },
  row: { minHeight: 64, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 10, paddingHorizontal: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  touchArea: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 14 },
  iconWrap: { width: 44, height: 44, backgroundColor: '#0D1424', borderRadius: 12, borderWidth: 1.5, justifyContent: 'center', alignItems: 'center' },
  textWrap: { flex: 1 },
  label: { color: '#E0E0E0', fontSize: 16, fontWeight: '700' },
  sub: { color: '#AAAAAA', fontSize: 13, marginTop: 2 },
});

// ─────────────────────────────────────────────
// ZONA 5: BOTÓN MAESTRO
// ─────────────────────────────────────────────
function Zone5Publish({ onPress }: { onPress: () => void }) {
  const pulse = useSharedValue(0.6);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(withTiming(1, { duration: 1500 }), withTiming(0.6, { duration: 1500 })),
      -1, true
    );
  }, []);

  const glowStyle = useAnimatedStyle(() => ({
    borderColor: `rgba(0, 240, 255, ${pulse.value})`,
    shadowOpacity: pulse.value,
  }));

  return (
    <View style={z5.container}>
      <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); onPress(); }} activeOpacity={0.8}>
        <Animated.View style={[z5.btn, glowStyle, getWebGlow(C.cyanNeon, 15)]}>
          <LinearGradient colors={['rgba(0, 240, 255, 0.2)', 'rgba(0, 100, 255, 0.1)']} style={StyleSheet.absoluteFill} />
          <TechCorners color={C.cyanNeon} size={8} />
          <Text style={[z5.text, getWebGlow(C.cyanNeon, 8)]}>⚡ PUBLICAR EN BLOQUE</Text>
        </Animated.View>
      </TouchableOpacity>
      
      <Text style={z5.footerText}>Alquimio v1.0 • Creado por Israel Montás • © 2026 Todos los derechos reservados</Text>
    </View>
  );
}

const z5 = StyleSheet.create({
  container: { marginHorizontal: 16, marginTop: 4, paddingBottom: 24 },
  btn: { height: 56, alignItems: 'center', justifyContent: 'center', borderRadius: 8, borderWidth: 1.5, backgroundColor: '#090E1A', overflow: 'hidden' },
  text: { color: C.white, fontSize: 15, fontWeight: '900', letterSpacing: 2 },
  footerText: { color: C.textMuted, fontSize: 10, textAlign: 'center', marginTop: 16, letterSpacing: 0.5 },
});

// ─────────────────────────────────────────────
// PANTALLA PRINCIPAL (RAÍZ)
// ─────────────────────────────────────────────
export default function HomeScreen() {
  const { selectedMedia } = useAppStore();
  const { handlePublish } = usePublish();
  const scrollRef = useRef<ScrollView>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [selectedPlatformForConnect, setSelectedPlatformForConnect] = useState<PlatformId | null>(null);

  useEffect(() => {
    const handler = (e: any) => { e.preventDefault(); (window as any).pwaPrompt = e; };
    if (typeof window !== 'undefined') window.addEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallPress = () => {
    const promptEvent = (window as any).pwaPrompt;
    if (promptEvent) promptEvent.prompt();
    else Alert.alert('Instalar PWA', 'Usa las opciones de tu navegador ("Agregar a inicio").', [{ text: 'OK' }]);
  };

  const onPublishClick = () => {
    if (!selectedMedia) return setShowUpload(true);
    handlePublish();
  };

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} translucent={false} />

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
          
          <View style={styles.bgGrid} />

          <View style={styles.wrapper}>
            <ScrollView
              ref={scrollRef}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
            >
              <Zone1Header onInstallPress={handleInstallPress} />
              <Zone2Upload onPress={() => setShowUpload(true)} />
              <Zone3Compose />
              <Zone4Platforms onSelectPlatform={setSelectedPlatformForConnect} />
              
              {/* Espaciador flexible para empujar la Zona 5 al fondo naturalmente */}
              <View style={styles.spacer} />

              <Zone5Publish onPress={onPublishClick} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>

      <UploadMenuModal visible={showUpload} onClose={() => setShowUpload(false)} />
      <ConnectAccountModal platformId={selectedPlatformForConnect} onClose={() => setSelectedPlatformForConnect(null)} />
      <PublishModal />
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  flex: { flex: 1 },
  wrapper: { flex: 1, width: '100%', maxWidth: 500, alignSelf: 'center' },
  bgGrid: { ...StyleSheet.absoluteFill as any, opacity: 0.05, backgroundImage: 'linear-gradient(#00F0FF 1px, transparent 1px), linear-gradient(90deg, #00F0FF 1px, transparent 1px)', backgroundSize: '30px 30px' } as any,
  scrollContent: { flexGrow: 1, gap: 16, paddingBottom: 10 },
  spacer: { flex: 1, minHeight: 16 }, // Elimina huecos bruscos, distribuye espacio
});
