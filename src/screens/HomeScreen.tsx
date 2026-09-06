// ============================================================
// src/screens/HomeScreen.tsx
// ★ DISEÑO HOLOGRÁFICO – Alquimia Cyber UI ★
// Basado en diseno_referencia.jpeg
// ============================================================

import React, { useRef, useState } from 'react';
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
  ImageBackground,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';

import { useAppStore } from '../store/useAppStore';
import { usePublish } from '../hooks/usePublish';
import { PublishModal } from '../components/publish/PublishModal';
import { MediaPicker } from '../components/media/MediaPicker';
import { MediaPreview } from '../components/media/MediaPreview';
import { verifyAppIntegrity } from '../security/authorSignature';

const { width: W, height: H } = Dimensions.get('window');

// ─────────────────────────────────────────────
// Paleta (referencia visual)
// ─────────────────────────────────────────────
const C = {
  bg: '#080C14',
  bgCard: 'rgba(8, 18, 32, 0.92)',
  neon: '#00FFD4',
  neonDim: 'rgba(0,255,212,0.18)',
  neonBorder: 'rgba(0,255,212,0.55)',
  gold: '#F5C518',
  goldGlow: 'rgba(245,197,24,0.35)',
  goldText: '#FFD966',
  white: '#FFFFFF',
  textDim: 'rgba(255,255,255,0.55)',
  textMuted: 'rgba(255,255,255,0.35)',
  green: '#00E676',
  greenDim: 'rgba(0,230,118,0.22)',
  circuitLine: 'rgba(0,255,212,0.12)',
};

// ─────────────────────────────────────────────
// Plataformas
// ─────────────────────────────────────────────
type PlatId = 'tiktok' | 'instagram' | 'youtube' | 'whatsapp' | 'facebook';

const PLATFORMS: { id: PlatId; label: string; sub: string; color: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'tiktok',    label: 'TikTok',             sub: 'Francia',   color: '#FFFFFF', icon: 'musical-notes' },
  { id: 'instagram', label: 'Instagram Reels',    sub: '@alquimio', color: '#E1306C', icon: 'logo-instagram' },
  { id: 'youtube',   label: 'YouTube Shorts',     sub: '@alquimio', color: '#FF0000', icon: 'logo-youtube' },
  { id: 'whatsapp',  label: 'WhatsApp (Business)',sub: '@alquimio', color: '#25D366', icon: 'logo-whatsapp' },
  { id: 'facebook',  label: 'Facebook',           sub: '@alquimio', color: '#1877F2', icon: 'logo-facebook' },
];

// ─────────────────────────────────────────────
// Decoración de esquinas tech
// ─────────────────────────────────────────────
function TechCorners({ color = C.neonBorder, size = 12 }: { color?: string; size?: number }) {
  const s = StyleSheet.create({
    tl: { position: 'absolute', top: 0, left: 0, width: size, height: size,
          borderTopWidth: 1.5, borderLeftWidth: 1.5, borderColor: color },
    tr: { position: 'absolute', top: 0, right: 0, width: size, height: size,
          borderTopWidth: 1.5, borderRightWidth: 1.5, borderColor: color },
    bl: { position: 'absolute', bottom: 0, left: 0, width: size, height: size,
          borderBottomWidth: 1.5, borderLeftWidth: 1.5, borderColor: color },
    br: { position: 'absolute', bottom: 0, right: 0, width: size, height: size,
          borderBottomWidth: 1.5, borderRightWidth: 1.5, borderColor: color },
  });
  return (
    <>
      <View style={s.tl} /><View style={s.tr} />
      <View style={s.bl} /><View style={s.br} />
    </>
  );
}

// ─────────────────────────────────────────────
// Hero holográfico – cabecera principal
// ─────────────────────────────────────────────
function HoloHeader({ onUploadPress }: { onUploadPress: () => void }) {
  const pulse = useSharedValue(1);
  const rotate = useSharedValue(0);

  React.useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.06, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
        withTiming(1.00, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false
    );
    rotate.value = withRepeat(
      withTiming(360, { duration: 8000, easing: Easing.linear }),
      -1,
      false
    );
  }, []);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  const rotateStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotate.value}deg` }],
  }));

  return (
    <View style={hero.container}>
      {/* Fondo con gradiente cósmico */}
      <LinearGradient
        colors={['#080C14', '#0A1628', '#051020']}
        style={StyleSheet.absoluteFill}
      />

      {/* Líneas de circuito decorativas */}
      <View style={hero.circuit1} />
      <View style={hero.circuit2} />
      <View style={hero.circuit3} />

      {/* Nombre holográfico "Alquimia" */}
      <Text style={hero.brandName}>Alquimia</Text>

      {/* Anillo exterior rotatorio */}
      <Animated.View style={[hero.ringOuter, rotateStyle]}>
        {[0, 60, 120, 180, 240, 300].map((deg) => (
          <View key={deg} style={[hero.ringDot, {
            transform: [
              { rotate: `${deg}deg` },
              { translateY: -(W * 0.28) },
            ],
          }]} />
        ))}
      </Animated.View>

      {/* Anillo interior contra-rotatorio */}
      <Animated.View style={[hero.ringInner, {
        transform: [{ rotate: `${-rotate.value}deg` }] as any,
      }]}>
        {[45, 135, 225, 315].map((deg) => (
          <View key={deg} style={[hero.ringDotSmall, {
            transform: [
              { rotate: `${deg}deg` },
              { translateY: -(W * 0.185) },
            ],
          }]} />
        ))}
      </Animated.View>

      {/* Letra A holográfica central */}
      <Animated.View style={[hero.letterWrap, pulseStyle]}>
        {/* Halo dorado */}
        <View style={hero.letterHalo} />
        <Text style={hero.letterA}>A</Text>
      </Animated.View>

      {/* Botón "Upload & Distribute" */}
      <TouchableOpacity onPress={onUploadPress} style={hero.uploadBtn} activeOpacity={0.8}>
        <LinearGradient
          colors={['rgba(0,255,212,0.08)', 'rgba(0,255,212,0.04)']}
          style={hero.uploadBtnInner}
        >
          <TechCorners size={8} />
          <Ionicons name="cloud-upload-outline" size={13} color={C.neon} />
          <Text style={hero.uploadLabel}>Upload & Distribute</Text>
        </LinearGradient>
      </TouchableOpacity>

      {/* Indicadores esquina superior */}
      <View style={hero.topLeft}>
        <Text style={hero.hud}>BIO</Text>
      </View>
      <TouchableOpacity style={hero.topRight}>
        <Ionicons name="settings-outline" size={18} color={C.textDim} />
      </TouchableOpacity>
    </View>
  );
}

const hero = StyleSheet.create({
  container: {
    width: '100%',
    height: H * 0.34,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  brandName: {
    position: 'absolute',
    top: 18,
    fontStyle: 'italic',
    fontSize: 28,
    fontWeight: '800',
    color: C.goldText,
    textShadowColor: C.gold,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 14,
    letterSpacing: 2,
    zIndex: 10,
  },
  circuit1: {
    position: 'absolute', left: 0, top: '30%',
    width: '30%', height: 1, backgroundColor: C.circuitLine,
  },
  circuit2: {
    position: 'absolute', right: 0, top: '45%',
    width: '25%', height: 1, backgroundColor: C.circuitLine,
  },
  circuit3: {
    position: 'absolute', left: '15%', bottom: '25%',
    width: '20%', height: 1, backgroundColor: C.circuitLine,
  },
  ringOuter: {
    position: 'absolute',
    width: W * 0.56,
    height: W * 0.56,
    borderRadius: W * 0.28,
    borderWidth: 1,
    borderColor: 'rgba(0,255,212,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringInner: {
    position: 'absolute',
    width: W * 0.37,
    height: W * 0.37,
    borderRadius: W * 0.185,
    borderWidth: 1,
    borderColor: 'rgba(245,197,24,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringDot: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: C.neon,
    shadowColor: C.neon,
    shadowRadius: 4,
    shadowOpacity: 0.9,
    elevation: 4,
  },
  ringDotSmall: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.gold,
    shadowColor: C.gold,
    shadowRadius: 3,
    shadowOpacity: 0.9,
    elevation: 3,
  },
  letterWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  letterHalo: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: C.goldGlow,
    shadowColor: C.gold,
    shadowRadius: 30,
    shadowOpacity: 0.7,
    elevation: 10,
  },
  letterA: {
    fontSize: 70,
    fontWeight: '900',
    color: C.goldText,
    textShadowColor: C.gold,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
    lineHeight: 80,
  },
  uploadBtn: {
    position: 'absolute',
    bottom: 16,
    alignSelf: 'center',
  },
  uploadBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 7,
    borderRadius: 4,
    borderWidth: 0.5,
    borderColor: C.neonBorder,
  },
  uploadLabel: {
    color: C.neon,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
  },
  topLeft: {
    position: 'absolute', top: 16, left: 16,
  },
  topRight: {
    position: 'absolute', top: 14, right: 16,
  },
  hud: {
    color: C.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
  },
});

// ─────────────────────────────────────────────
// Caja de redacción táctica
// ─────────────────────────────────────────────
function ComposeSection() {
  const { caption, hashtags, setCaption, addHashtag } = useAppStore();
  const [hashInput, setHashInput] = useState('');
  const EMOJIS = ['😊', '🔥', '🚀', '💡', '✨', '🎯', '💎', '⚡'];

  return (
    <View style={compose.wrapper}>
      <TechCorners color={C.neonBorder} size={14} />
      <TextInput
        value={caption}
        onChangeText={setCaption}
        placeholder="¡Tu secreto para escalar los resultados! 🚀"
        placeholderTextColor={C.textMuted}
        multiline
        maxLength={500}
        style={compose.input}
      />

      {/* Hashtags chips */}
      {hashtags.length > 0 && (
        <View style={compose.hashRow}>
          {hashtags.map((h, i) => (
            <Text key={i} style={compose.hashChip}>#{h}</Text>
          ))}
        </View>
      )}

      {/* Input de hashtags */}
      <View style={compose.hashInputRow}>
        <Text style={compose.hashPrefix}>#</Text>
        <TextInput
          value={hashInput}
          onChangeText={setHashInput}
          placeholder="Añadir hashtag..."
          placeholderTextColor={C.textMuted}
          style={compose.hashInput}
          onSubmitEditing={() => {
            if (hashInput.trim()) {
              addHashtag(hashInput.trim());
              setHashInput('');
            }
          }}
          returnKeyType="done"
        />
      </View>

      {/* Emojis rápidos */}
      <View style={compose.emojiRow}>
        {EMOJIS.map((e) => (
          <TouchableOpacity key={e} onPress={() => setCaption(caption + e)}>
            <Text style={compose.emoji}>{e}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const compose = StyleSheet.create({
  wrapper: {
    backgroundColor: C.bgCard,
    borderRadius: 6,
    borderWidth: 0.5,
    borderColor: C.neonBorder,
    padding: 14,
    marginHorizontal: 12,
    position: 'relative',
    gap: 8,
  },
  input: {
    color: C.white,
    fontSize: 14,
    lineHeight: 20,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  hashRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  hashChip: {
    color: C.neon,
    fontSize: 12,
    fontWeight: '600',
  },
  hashInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 0.5,
    borderTopColor: C.neonDim,
    paddingTop: 8,
  },
  hashPrefix: {
    color: C.neon,
    fontSize: 14,
    fontWeight: '700',
    marginRight: 4,
  },
  hashInput: {
    flex: 1,
    color: C.white,
    fontSize: 13,
    paddingVertical: 2,
  },
  emojiRow: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'flex-end',
    paddingTop: 4,
  },
  emoji: {
    fontSize: 18,
  },
});

// ─────────────────────────────────────────────
// Fila de plataforma
// ─────────────────────────────────────────────
function PlatformRow({
  label, sub, color, icon, isActive, onToggle,
}: {
  label: string; sub: string; color: string;
  icon: keyof typeof Ionicons.glyphMap;
  isActive: boolean; onToggle: () => void;
}) {
  return (
    <View style={plat.row}>
      {/* Icono */}
      <View style={[plat.iconWrap, { backgroundColor: color + '22', borderColor: color + '44' }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>

      {/* Texto */}
      <View style={plat.textWrap}>
        <Text style={plat.label}>{label}</Text>
        <Text style={plat.sub}>{sub}</Text>
      </View>

      {/* Toggle estilo referencia — verde neón */}
      <Switch
        value={isActive}
        onValueChange={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onToggle();
        }}
        trackColor={{ false: 'rgba(255,255,255,0.12)', true: C.green }}
        thumbColor={isActive ? '#FFFFFF' : 'rgba(255,255,255,0.5)'}
        ios_backgroundColor="rgba(255,255,255,0.12)"
        style={plat.switch}
      />
    </View>
  );
}

const plat = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(0,255,212,0.08)',
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: { flex: 1 },
  label: { color: C.white, fontSize: 14, fontWeight: '500' },
  sub: { color: C.textMuted, fontSize: 11, marginTop: 1 },
  switch: { transform: [{ scaleX: 0.9 }, { scaleY: 0.9 }] },
});

// ─────────────────────────────────────────────
// Sección "Plataformas Sincronizadas"
// ─────────────────────────────────────────────
function PlatformsSection() {
  const { activePlatforms, togglePlatform } = useAppStore();
  return (
    <View style={pSection.wrapper}>
      <TechCorners color={C.neonBorder} size={14} />
      <Text style={pSection.title}>Plataformas Sincronizadas</Text>
      {PLATFORMS.map((p) => (
        <PlatformRow
          key={p.id}
          label={p.label}
          sub={p.sub}
          color={p.color}
          icon={p.icon}
          isActive={activePlatforms.has(p.id as any)}
          onToggle={() => togglePlatform(p.id as any)}
        />
      ))}
    </View>
  );
}

const pSection = StyleSheet.create({
  wrapper: {
    backgroundColor: C.bgCard,
    borderRadius: 6,
    borderWidth: 0.5,
    borderColor: C.neonBorder,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 6,
    marginHorizontal: 12,
    position: 'relative',
  },
  title: {
    color: C.white,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
    letterSpacing: 0.3,
  },
});

// ─────────────────────────────────────────────
// Botón PUBLICAR EN BLOQUE
// ─────────────────────────────────────────────
function PublishButton({ onPress, disabled }: { onPress: () => void; disabled: boolean }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
      style={[pubBtn.outer, disabled && pubBtn.disabled]}
    >
      {/* Borde brillante con gradiente */}
      <LinearGradient
        colors={disabled
          ? ['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.05)']
          : [C.neonBorder, 'rgba(0,255,212,0.3)', C.neonBorder]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={pubBtn.gradient}
      >
        <TechCorners color={disabled ? 'rgba(255,255,255,0.15)' : C.neon} size={10} />
        <View style={pubBtn.inner}>
          {!disabled && (
            <Text style={pubBtn.glow}>⚡</Text>
          )}
          <Text style={[pubBtn.label, disabled && pubBtn.labelDisabled]}>
            PUBLICAR EN BLOQUE
          </Text>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const pubBtn = StyleSheet.create({
  outer: {
    marginHorizontal: 12,
    borderRadius: 6,
    overflow: 'hidden',
    shadowColor: '#00FFD4',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 8,
  },
  disabled: {
    shadowOpacity: 0,
    elevation: 0,
  },
  gradient: {
    padding: 1.5,
    borderRadius: 6,
  },
  inner: {
    backgroundColor: 'rgba(8,18,32,0.95)',
    borderRadius: 5,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  glow: { fontSize: 16 },
  label: {
    color: C.white,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 3,
  },
  labelDisabled: {
    color: 'rgba(255,255,255,0.35)',
  },
});

// ════════════════════════════════════════════════════════════════
// HOME SCREEN PRINCIPAL
// ════════════════════════════════════════════════════════════════
export default function HomeScreen() {
  const { selectedMedia, uploadProgress, activePlatforms } = useAppStore();
  const { canPublish, handlePublish } = usePublish();
  const scrollRef = useRef<ScrollView>(null);
  const [showUpload, setShowUpload] = useState(false);

  React.useEffect(() => {
    if (!verifyAppIntegrity()) {
      console.warn('Alerta de Integridad: Firma de autoría no válida.');
    }
  }, []);

  const handleUploadPress = () => {
    setShowUpload(true);
    setTimeout(() => scrollRef.current?.scrollTo({ y: 160, animated: true }), 100);
  };

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} translucent={false} />

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.flex}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <ScrollView
            ref={scrollRef}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
          >

            {/* ══ BLOQUE 1: HERO HOLOGRÁFICO ════════════════ */}
            <Animated.View entering={FadeIn.duration(800)}>
              <HoloHeader onUploadPress={handleUploadPress} />
            </Animated.View>

            {/* ══ BLOQUE 1b: UPLOAD / MEDIA ════════════════ */}
            {(showUpload || selectedMedia) && (
              <Animated.View
                entering={FadeInDown.duration(400)}
                style={styles.mediaBlock}
              >
                <TechCorners />
                {selectedMedia ? (
                  <MediaPreview media={selectedMedia} uploadProgress={uploadProgress} />
                ) : (
                  <MediaPicker />
                )}
              </Animated.View>
            )}

            {/* Separador */}
            <View style={styles.sep} />

            {/* ══ BLOQUE 2: CAJA DE REDACCIÓN ══════════════ */}
            <Animated.View entering={FadeInDown.delay(100).duration(500)}>
              <ComposeSection />
            </Animated.View>

            {/* Separador */}
            <View style={styles.sep} />

            {/* ══ BLOQUE 3: PLATAFORMAS ════════════════════ */}
            <Animated.View entering={FadeInDown.delay(200).duration(500)}>
              <PlatformsSection />
            </Animated.View>

            {/* Separador */}
            <View style={styles.sep} />

            {/* ══ BLOQUE 4: BOTÓN PUBLICAR ═════════════════ */}
            <Animated.View entering={FadeInDown.delay(300).duration(500)}>
              <PublishButton onPress={handlePublish} disabled={!canPublish} />
            </Animated.View>

            {/* Contador de redes */}
            {activePlatforms.size > 0 && (
              <Text style={styles.netCount}>
                {activePlatforms.size} red{activePlatforms.size !== 1 ? 'es' : ''} sincronizada{activePlatforms.size !== 1 ? 's' : ''}
              </Text>
            )}

            {/* ══ FOOTER: SELLO DE AUTORÍA ═════════════════ */}
            <View style={styles.footer}>
              <View style={styles.footerLine} />
              <Text style={styles.footerText}>
                Alquimio v1.0 · Creado por Israel Montás · © 2026 Todos los derechos reservados
              </Text>
              <View style={styles.footerLine} />
            </View>

            <View style={{ height: 24 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      <PublishModal />
    </>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: C.bg,
  },
  flex: { flex: 1 },
  scroll: {
    paddingBottom: 16,
  },
  mediaBlock: {
    marginHorizontal: 12,
    marginTop: 8,
    borderRadius: 6,
    borderWidth: 0.5,
    borderColor: C.neonBorder,
    backgroundColor: C.bgCard,
    overflow: 'hidden',
    position: 'relative',
  },
  sep: {
    height: 10,
  },
  netCount: {
    textAlign: 'center',
    color: C.textMuted,
    fontSize: 11,
    marginTop: 10,
    letterSpacing: 0.5,
  },
  footer: {
    alignItems: 'center',
    marginTop: 20,
    marginHorizontal: 24,
    gap: 8,
  },
  footerLine: {
    width: '100%',
    height: 0.5,
    backgroundColor: 'rgba(0,255,212,0.12)',
  },
  footerText: {
    color: 'rgba(255,255,255,0.22)',
    fontSize: 9.5,
    textAlign: 'center',
    letterSpacing: 0.4,
    lineHeight: 14,
  },
});
