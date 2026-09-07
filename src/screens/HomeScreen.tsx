// ============================================================
// src/screens/HomeScreen.tsx
// ★ DISEÑO HOLOGRÁFICO CYBER-ALQUIMIA ★
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
import { MediaPreview } from '../components/media/MediaPreview';
import { UploadMenuModal } from '../components/media/UploadMenuModal';
import { AspectRatioSelector } from '../components/media/AspectRatioSelector';
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

const { width: W, height: H } = Dimensions.get('window');

// ─────────────────────────────────────────────
// PALETA CYBER-ALQUIMIA
// ─────────────────────────────────────────────
const C = {
  bg: '#050811',
  bgCard: 'rgba(5, 8, 17, 0.75)',
  neonCyan: '#00E5FF',
  neonCyanDim: 'rgba(0, 229, 255, 0.2)',
  gold: '#FFD700',
  goldDim: 'rgba(255, 215, 0, 0.2)',
  neonGreen: '#00FF7F',
  white: '#FFFFFF',
  textMuted: 'rgba(255,255,255,0.4)',
  circuitBorder: 'rgba(0, 229, 255, 0.3)',
};

type PlatId = 'tiktok' | 'instagram' | 'youtube' | 'whatsapp' | 'facebook';

const PLATFORMS: { id: PlatId; label: string; sub: string; color: string; SvgIcon: any }[] = [
  { id: 'tiktok',    label: 'TikTok',                   sub: 'Francia',   color: '#FFFFFF', SvgIcon: TikTokSvg },
  { id: 'instagram', label: 'Reels de Instagram',       sub: '@alquimio', color: '#E1306C', SvgIcon: InstagramSvg },
  { id: 'youtube',   label: 'Cortometrajes de YouTube', sub: '@alquimio', color: '#FF0000', SvgIcon: YouTubeSvg },
  { id: 'whatsapp',  label: 'WhatsApp (Empresas)',      sub: '@alquimio', color: '#25D366', SvgIcon: WhatsAppSvg },
  { id: 'facebook',  label: 'Facebook',                 sub: '@alquimio', color: '#1877F2', SvgIcon: FacebookSvg },
];

// HUD Corners decorativos
function TechCorners({ color = C.neonCyan, size = 12 }: { color?: string; size?: number }) {
  const s = StyleSheet.create({
    tl: { position: 'absolute', top: 0, left: 0, width: size, height: size, borderTopWidth: 2, borderLeftWidth: 2, borderColor: color },
    tr: { position: 'absolute', top: 0, right: 0, width: size, height: size, borderTopWidth: 2, borderRightWidth: 2, borderColor: color },
    bl: { position: 'absolute', bottom: 0, left: 0, width: size, height: size, borderBottomWidth: 2, borderLeftWidth: 2, borderColor: color },
    br: { position: 'absolute', bottom: 0, right: 0, width: size, height: size, borderBottomWidth: 2, borderRightWidth: 2, borderColor: color },
  });
  return <><View style={s.tl} /><View style={s.tr} /><View style={s.bl} /><View style={s.br} /></>;
}

// ─────────────────────────────────────────────
// HERO HOLOGRÁFICO
// ─────────────────────────────────────────────
function HoloHeader({ onInstallPress }: { onInstallPress: () => void }) {
  const rot1 = useSharedValue(0);
  const rot2 = useSharedValue(0);
  const glow = useSharedValue(0.5);

  useEffect(() => {
    rot1.value = withRepeat(withTiming(360, { duration: 15000, easing: Easing.linear }), -1, false);
    rot2.value = withRepeat(withTiming(-360, { duration: 12000, easing: Easing.linear }), -1, false);
    glow.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.4, { duration: 2000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const ring1Style = useAnimatedStyle(() => ({ transform: [{ rotate: `${rot1.value}deg` }] }));
  const ring2Style = useAnimatedStyle(() => ({ transform: [{ rotate: `${rot2.value}deg` }] }));
  const glowStyle = useAnimatedStyle(() => ({ opacity: glow.value }));

  return (
    <View style={hero.container}>
      <LinearGradient colors={['rgba(0,229,255,0.05)', 'transparent']} style={StyleSheet.absoluteFill} />
      
      {/* Circuit lines */}
      <View style={hero.grid} />
      
      <Text style={hero.brandName}>Alquimia</Text>

      {/* Anillos Holográficos Animados */}
      <View style={hero.emblemWrapper}>
        <Animated.View style={[hero.ringCyan, ring1Style, glowStyle]}>
          {[0, 90, 180, 270].map(deg => (
            <View key={deg} style={[hero.particleCyan, { transform: [{ rotate: `${deg}deg` }, { translateY: -100 }] }]} />
          ))}
        </Animated.View>
        
        <Animated.View style={[hero.ringGold, ring2Style]}>
           {[45, 135, 225, 315].map(deg => (
            <View key={deg} style={[hero.particleGold, { transform: [{ rotate: `${deg}deg` }, { translateY: -70 }] }]} />
          ))}
        </Animated.View>

        <View style={hero.letterHalo} />
        <Text style={hero.letterA}>A</Text>
      </View>

      <TouchableOpacity onPress={onInstallPress} style={hero.topRight}>
        <Animated.View style={[hero.pwaBadge, glowStyle]}>
          <Text style={hero.pwaText}>⬇ INSTALAR PWA</Text>
        </Animated.View>
      </TouchableOpacity>
    </View>
  );
}

const hero = StyleSheet.create({
  container: { width: '100%', height: 340, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  grid: { ...StyleSheet.absoluteFill as any, opacity: 0.1, backgroundImage: 'linear-gradient(#00E5FF 1px, transparent 1px), linear-gradient(90deg, #00E5FF 1px, transparent 1px)', backgroundSize: '40px 40px' } as any,
  brandName: { position: 'absolute', top: 20, fontSize: 32, fontWeight: '800', color: C.gold, fontStyle: 'italic', letterSpacing: 3, textShadowColor: C.gold, textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 15, zIndex: 10 },
  emblemWrapper: { width: 220, height: 220, alignItems: 'center', justifyContent: 'center', position: 'relative', marginTop: 20 },
  ringCyan: { position: 'absolute', width: 200, height: 200, borderRadius: 100, borderWidth: 1.5, borderColor: 'rgba(0,229,255,0.4)', alignItems: 'center', justifyContent: 'center', borderStyle: 'dashed' },
  particleCyan: { position: 'absolute', width: 6, height: 6, borderRadius: 3, backgroundColor: C.neonCyan, shadowColor: C.neonCyan, shadowRadius: 8, shadowOpacity: 1, elevation: 10 },
  ringGold: { position: 'absolute', width: 140, height: 140, borderRadius: 70, borderWidth: 1, borderColor: 'rgba(255,215,0,0.3)', alignItems: 'center', justifyContent: 'center' },
  particleGold: { position: 'absolute', width: 4, height: 4, borderRadius: 2, backgroundColor: C.gold, shadowColor: C.gold, shadowRadius: 6, shadowOpacity: 1, elevation: 8 },
  letterHalo: { position: 'absolute', width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(255,215,0,0.1)', shadowColor: C.gold, shadowRadius: 30, shadowOpacity: 0.6, elevation: 15 },
  letterA: { fontSize: 76, fontWeight: '900', color: '#FFF', textShadowColor: C.gold, textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 20 },
  topRight: { position: 'absolute', top: 20, right: 16 },
  pwaBadge: { backgroundColor: 'rgba(0, 229, 255, 0.1)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: C.neonCyan, shadowColor: C.neonCyan, shadowRadius: 10, shadowOpacity: 0.5 },
  pwaText: { color: C.neonCyan, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
});

// ─────────────────────────────────────────────
// COMPOSICIÓN TÁCTICA
// ─────────────────────────────────────────────
function ComposeSection() {
  const { caption, hashtags, setCaption, addHashtag, removeHashtag, clearHashtags, aiLoading, setAiLoading, selectedMedia } = useAppStore();
  const [hashInput, setHashInput] = useState('');
  const EMOJIS = ['😊', '🔥', '🚀', '💡', '✨', '🎯', '💎', '⚡'];

  const glow = useSharedValue(0.3);
  useEffect(() => {
    glow.value = withRepeat(
      withSequence(
        withTiming(0.8, { duration: 1500 }),
        withTiming(0.3, { duration: 1500 })
      ),
      -1,
      true
    );
  }, []);
  
  const glowStyle = useAnimatedStyle(() => ({
    borderColor: `rgba(0, 229, 255, ${glow.value})`,
    shadowOpacity: glow.value
  }));

  const handleOptimize = async () => {
    if (!caption.trim()) return;
    setAiLoading(true);
    const mediaType = selectedMedia ? selectedMedia.type : 'video';
    const { generateSmartCaptions } = await import('../services/aiService');
    const result = await generateSmartCaptions(caption, mediaType);
    setCaption(result.caption);
    clearHashtags();
    result.hashtags.forEach(addHashtag);
    setAiLoading(false);
  };

  return (
    <Animated.View style={[comp.wrapper, glowStyle]}>
      <TechCorners color={C.neonCyan} size={15} />
      
      <View style={comp.aiHeader}>
        <TouchableOpacity onPress={handleOptimize} disabled={aiLoading || !caption.trim()} style={[comp.aiBtn, (!caption.trim() || aiLoading) && comp.aiBtnDisabled]}>
          {aiLoading ? (
            <ActivityIndicator size="small" color={C.gold} />
          ) : (
            <><Text style={comp.aiIcon}>✨</Text><Text style={comp.aiText}>IA OPTIMIZE</Text></>
          )}
        </TouchableOpacity>
      </View>

      <TextInput
        value={caption}
        onChangeText={setCaption}
        placeholder="Redacta tu transmisión. La IA maximizará tu alcance..."
        placeholderTextColor={C.textMuted}
        multiline
        maxLength={500}
        style={comp.input}
      />

      {hashtags.length > 0 && (
        <View style={comp.hashRow}>
          {hashtags.map((h, i) => (
            <TouchableOpacity key={i} onPress={() => removeHashtag(h)}>
              <Text style={comp.hashChip}>{h} ✕</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={comp.hashInputRow}>
        <Text style={comp.hashPrefix}>#</Text>
        <TextInput
          value={hashInput}
          onChangeText={setHashInput}
          placeholder="Añadir hashtag..."
          placeholderTextColor={C.textMuted}
          style={comp.hashInput}
          onSubmitEditing={() => {
            if (hashInput.trim()) {
              addHashtag(hashInput.trim());
              setHashInput('');
            }
          }}
          returnKeyType="done"
        />
        {hashInput.trim().length > 0 && (
          <TouchableOpacity
            onPress={() => {
              addHashtag(hashInput.trim());
              setHashInput('');
            }}
            style={comp.addBtn}
          >
            <Text style={comp.addBtnText}>+ INYECTAR</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={comp.emojiRow}>
        {EMOJIS.map((e) => (
          <TouchableOpacity key={e} onPress={() => setCaption(caption + e)}>
            <Text style={comp.emoji}>{e}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </Animated.View>
  );
}

const comp = StyleSheet.create({
  wrapper: { backgroundColor: C.bgCard, borderWidth: 1, padding: 16, marginHorizontal: 16, borderRadius: 8, shadowColor: C.neonCyan, shadowRadius: 15, shadowOffset: { width: 0, height: 0 }, elevation: 5 },
  aiHeader: { alignItems: 'flex-end', marginBottom: 5 },
  aiBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255, 215, 0, 0.1)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: C.gold, gap: 6, shadowColor: C.gold, shadowRadius: 10, shadowOpacity: 0.5 },
  aiBtnDisabled: { opacity: 0.3, shadowOpacity: 0 },
  aiIcon: { fontSize: 12 },
  aiText: { color: C.gold, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  input: { color: C.white, fontSize: 15, minHeight: 120, textAlignVertical: 'top', lineHeight: 22 },
  hashRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 8 },
  hashChip: { color: C.neonCyan, fontSize: 12, fontWeight: '700', backgroundColor: 'rgba(0,229,255,0.1)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 4, borderWidth: 1, borderColor: 'rgba(0,229,255,0.4)' },
  hashInputRow: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: C.circuitBorder, paddingTop: 12, gap: 8 },
  hashPrefix: { color: C.neonCyan, fontSize: 16, fontWeight: '800' },
  hashInput: { flex: 1, color: C.white, fontSize: 14, paddingVertical: 4 },
  addBtn: { backgroundColor: 'rgba(0,229,255,0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 4, borderWidth: 1, borderColor: C.neonCyan },
  addBtnText: { color: C.neonCyan, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  emojiRow: { flexDirection: 'row', gap: 12, justifyContent: 'flex-end', paddingTop: 10 },
  emoji: { fontSize: 20 },
});

// ─────────────────────────────────────────────
// PLATAFORMAS (Full Width Rows)
// ─────────────────────────────────────────────
function PlatformsSection({ onSelectPlatform }: { onSelectPlatform: (id: PlatformId) => void }) {
  const { activePlatforms, togglePlatform, platformHandles } = useAppStore();

  return (
    <View style={plat.container}>
      {PLATFORMS.map((p) => {
        const isActive = activePlatforms.has(p.id as PlatformId);
        const customSub = platformHandles[p.id as PlatformId] || p.sub;

        return (
          <View key={p.id} style={plat.row}>
            <TouchableOpacity onPress={() => onSelectPlatform(p.id as PlatformId)} style={plat.touchArea}>
              <View style={[
                plat.iconWrap,
                {
                  backgroundColor: p.color + '15',
                  borderColor: isActive ? p.color : p.color + '40',
                  shadowColor: isActive ? p.color : 'transparent',
                  shadowRadius: 10,
                  shadowOpacity: 0.8
                }
              ]}>
                <p.SvgIcon size={24} />
              </View>
              
              <View style={plat.textWrap}>
                <Text style={[
                  plat.label,
                  isActive && { color: C.white, textShadowColor: p.color, textShadowRadius: 10 }
                ]}>
                  {p.label}
                </Text>
                <Text style={plat.sub}>{customSub}</Text>
              </View>
            </TouchableOpacity>
            
            <Switch
              value={isActive}
              onValueChange={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                togglePlatform(p.id as PlatformId);
              }}
              trackColor={{ false: 'rgba(255,255,255,0.1)', true: C.neonGreen }}
              thumbColor="#FFFFFF"
              style={{ transform: [{ scaleX: 1.1 }, { scaleY: 1.1 }] }}
            />
          </View>
        );
      })}
    </View>
  );
}

const plat = StyleSheet.create({
  container: { backgroundColor: 'rgba(5, 8, 17, 0.8)', borderTopWidth: 1, borderBottomWidth: 1, borderColor: C.circuitBorder, paddingVertical: 10 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 20, minHeight: 64, borderBottomWidth: 1, borderBottomColor: 'rgba(0,229,255,0.1)' },
  touchArea: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 16 },
  iconWrap: { width: 42, height: 42, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  textWrap: { flex: 1 },
  label: { color: '#ccc', fontSize: 16, fontWeight: '600', letterSpacing: 0.5 },
  sub: { color: C.neonCyan, fontSize: 12, marginTop: 2, opacity: 0.8 },
});

// ─────────────────────────────────────────────
// BOTÓN PUBLICAR NEÓN
// ─────────────────────────────────────────────
function PublishButton({ onPress }: { onPress: () => void }) {
  const glow = useSharedValue(0.4);

  useEffect(() => {
    glow.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1500 }),
        withTiming(0.4, { duration: 1500 })
      ),
      -1,
      true
    );
  }, []);
  
  const glowStyle = useAnimatedStyle(() => ({
    shadowOpacity: glow.value,
    borderColor: `rgba(0, 229, 255, ${0.5 + glow.value/2})`
  }));

  return (
    <View style={pubBtn.outer}>
      <TouchableOpacity
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          onPress();
        }}
        activeOpacity={0.8}
      >
        <Animated.View style={[pubBtn.btn, glowStyle]}>
          <LinearGradient colors={['rgba(0,229,255,0.15)', 'rgba(0,100,255,0.15)']} style={StyleSheet.absoluteFill} />
          <Text style={pubBtn.text}>PUBLICAR EN BLOQUE</Text>
          <TechCorners color={C.neonCyan} size={10} />
        </Animated.View>
      </TouchableOpacity>
    </View>
  );
}

const pubBtn = StyleSheet.create({
  outer: { marginHorizontal: 24, marginTop: 20, marginBottom: 24 },
  btn: { paddingVertical: 18, alignItems: 'center', justifyContent: 'center', borderRadius: 8, borderWidth: 2, shadowColor: C.neonCyan, shadowRadius: 20, shadowOffset: { width: 0, height: 0 }, elevation: 15, position: 'relative', overflow: 'hidden', backgroundColor: 'rgba(5, 8, 17, 0.9)' },
  text: { color: C.neonCyan, fontSize: 16, fontWeight: '900', letterSpacing: 3, textShadowColor: C.neonCyan, textShadowRadius: 10 },
});

// ─────────────────────────────────────────────
// PANTALLA PRINCIPAL
// ─────────────────────────────────────────────
export default function HomeScreen() {
  const { selectedMedia, uploadProgress, activePlatforms } = useAppStore();
  const { handlePublish } = usePublish();
  const scrollRef = useRef<ScrollView>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [selectedPlatformForConnect, setSelectedPlatformForConnect] = useState<PlatformId | null>(null);
  const [pwaPrompt, setPwaPrompt] = useState<any>(null);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setPwaPrompt(e);
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeinstallprompt', handler);
      return () => window.removeEventListener('beforeinstallprompt', handler);
    }
  }, []);

  const handleUploadPress = () => {
    setShowUpload(true);
    setTimeout(() => scrollRef.current?.scrollTo({ y: 250, animated: true }), 100);
  };

  const handleInstallPress = async () => {
    if (pwaPrompt) {
      pwaPrompt.prompt();
      const choice = await pwaPrompt.userChoice;
      if (choice && choice.outcome === 'accepted') {
        setPwaPrompt(null);
      }
    } else {
      Alert.alert(
        'Instalar Alquimio Studio (PWA)',
        Platform.OS === 'web' && /iPhone|iPad|iPod/.test(typeof navigator !== 'undefined' ? navigator.userAgent : '')
          ? 'Para instalar en tu iPhone o iPad:\n1. Toca el botón Compartir en Safari.\n2. Elige "Agregar a pantalla de inicio".\n3. ¡Listo! La app se abrirá como nativa.'
          : 'Para instalar en este navegador:\n1. Toca el icono de instalación (o tres puntos ⋮ en Chrome/Edge).\n2. Selecciona "Instalar Alquimio Studio".',
        [{ text: 'Entendido' }]
      );
    }
  };

  const onPublishClick = () => {
    if (!selectedMedia) {
      handleUploadPress();
      return;
    }
    handlePublish();
  };

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} translucent={false} />

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.flex}
        >
          {/* Fondo principal con rejilla tecnológica si es web */}
          <View style={styles.bgGrid} />

          <ScrollView
            ref={scrollRef}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
          >
            {/* Contenedor flexible principal para empujar el botón al fondo */}
            <View style={styles.topFlex}>
              <HoloHeader onInstallPress={handleInstallPress} />

              <View style={[styles.mediaBlock, { shadowColor: C.neonCyan, shadowRadius: 15, shadowOpacity: 0.3 }]}>
                <TechCorners color={C.neonCyan} size={15} />
                {selectedMedia ? (
                  <>
                    <MediaPreview media={selectedMedia} uploadProgress={uploadProgress} />
                    <AspectRatioSelector />
                  </>
                ) : (
                  <MediaPicker onOpenMenu={handleUploadPress} />
                )}
              </View>

              <View style={styles.sep} />
              <ComposeSection />
              <View style={styles.sep} />
              
              <PlatformsSection onSelectPlatform={(id) => setSelectedPlatformForConnect(id)} />
              
              {/* Espaciador expansivo para empujar contenido inferior */}
              <View style={{ flexGrow: 1, minHeight: 40 }} />
            </View>

            <View style={styles.bottomAnchor}>
              <PublishButton onPress={onPublishClick} />
              
              {activePlatforms.size > 0 && (
                <Text style={styles.netCount}>
                  {activePlatforms.size} CORE{activePlatforms.size !== 1 ? 'S' : ''} SYNC
                </Text>
              )}
              
              <View style={styles.footer}>
                <View style={styles.footerLine} />
                <Text style={styles.footerText}>ALQUIMIO V2.0 · INGENIERÍA ISRAEL MONTÁS</Text>
                <View style={styles.footerLine} />
              </View>
            </View>
            
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* Modales Interactivos del Sistema */}
      <UploadMenuModal visible={showUpload} onClose={() => setShowUpload(false)} />
      <ConnectAccountModal
        platformId={selectedPlatformForConnect}
        onClose={() => setSelectedPlatformForConnect(null)}
      />
      <PublishModal />
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg, minHeight: '100%' as any },
  flex: { flex: 1, width: '100%' },
  bgGrid: { ...StyleSheet.absoluteFill as any, opacity: 0.05, backgroundImage: 'linear-gradient(#00E5FF 1px, transparent 1px), linear-gradient(90deg, #00E5FF 1px, transparent 1px)', backgroundSize: '40px 40px' } as any,
  scroll: { flexGrow: 1, paddingBottom: 16 },
  topFlex: { flex: 1 },
  mediaBlock: { marginHorizontal: 16, marginTop: -20, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(0,229,255,0.4)', backgroundColor: C.bgCard, overflow: 'hidden', position: 'relative', elevation: 10 },
  sep: { height: 24 },
  bottomAnchor: { paddingBottom: 10 },
  netCount: { textAlign: 'center', color: C.neonCyan, fontSize: 10, fontWeight: '800', letterSpacing: 2, marginTop: -10, textShadowColor: C.neonCyan, textShadowRadius: 10 },
  footer: { alignItems: 'center', marginTop: 24, marginHorizontal: 30, gap: 10 },
  footerLine: { width: '100%', height: 1, backgroundColor: 'rgba(0,229,255,0.2)' },
  footerText: { color: 'rgba(0,229,255,0.4)', fontSize: 9, textAlign: 'center', letterSpacing: 2, fontWeight: '700' },
});
