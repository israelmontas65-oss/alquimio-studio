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
  ActivityIndicator,
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
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';

import { Alert } from 'react-native';
import { useAppStore } from '../store/useAppStore';
import { usePublish } from '../hooks/usePublish';
import { PublishModal } from '../components/publish/PublishModal';
import { MediaPicker } from '../components/media/MediaPicker';
import { MediaPreview } from '../components/media/MediaPreview';
import { UploadMenuModal } from '../components/media/UploadMenuModal';
import { AspectRatioSelector } from '../components/media/AspectRatioSelector';
import { ConnectAccountModal } from '../components/auth/ConnectAccountModal';
import { verifyAppIntegrity } from '../security/authorSignature';
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
const EMBLEM_SIZE = 190;
const EMBLEM_RADIUS = EMBLEM_SIZE / 2;

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

const PLATFORMS: {
  id: PlatId;
  label: string;
  sub: string;
  color: string;
  SvgIcon: React.ComponentType<{ size?: number }>;
}[] = [
  { id: 'tiktok',    label: 'TikTok',                   sub: 'Francia',   color: '#FFFFFF', SvgIcon: TikTokSvg },
  { id: 'instagram', label: 'Reels de Instagram',       sub: '@alquimio', color: '#E1306C', SvgIcon: InstagramSvg },
  { id: 'youtube',   label: 'Cortometrajes de YouTube', sub: '@alquimio', color: '#FF0000', SvgIcon: YouTubeSvg },
  { id: 'whatsapp',  label: 'WhatsApp (Empresas)',      sub: '@alquimio', color: '#25D366', SvgIcon: WhatsAppSvg },
  { id: 'facebook',  label: 'Facebook',                 sub: '@alquimio', color: '#1877F2', SvgIcon: FacebookSvg },
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
function HoloHeader({
  onUploadPress,
  onInstallPress,
}: {
  onUploadPress: () => void;
  onInstallPress: () => void;
}) {
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

      {/* Anillo exterior cian con nodos orbitales */}
      <View style={hero.ringOuter}>
        {[0, 60, 120, 180, 240, 300].map((deg) => (
          <View key={deg} style={[hero.ringDot, {
            transform: [
              { rotate: `${deg}deg` },
              { translateY: -EMBLEM_RADIUS },
            ],
          }]} />
        ))}
      </View>

      {/* Anillo interior dorado */}
      <View style={hero.ringInner} />

      {/* Centro: halo + letra A — posicionados absolutamente sobre los anillos */}
      <View style={hero.emblemCenter}>
        <View style={hero.letterHalo} />
        <Text style={hero.letterA}>A</Text>
      </View>

      {/* Botón "Subir y distribuir" */}
      <TouchableOpacity onPress={onUploadPress} style={hero.uploadBtn} activeOpacity={0.8}>
        <View style={hero.uploadBtnInner}>
          <TechCorners size={8} />
          <CloudUploadSvg size={14} color={C.neon} />
          <Text style={hero.uploadLabel}>Subir y distribuir</Text>
        </View>
      </TouchableOpacity>

      {/* HUD esquinas */}
      <View style={hero.topLeft}>
        <Text style={hero.hud}>SYS.ONLINE</Text>
      </View>
      <TouchableOpacity onPress={onInstallPress} style={hero.topRight} activeOpacity={0.75}>
        <View style={hero.pwaBadge}>
          <Text style={hero.pwaText}>⬇ INSTALAR PWA</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}

const hero = StyleSheet.create({
  container: {
    width: '100%',
    height: 270,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#080C14',
  },
  brandName: {
    position: 'absolute',
    top: 14,
    alignSelf: 'center',
    fontStyle: 'italic',
    fontSize: 30,
    fontWeight: '800',
    color: '#FFD966',
    textShadowColor: '#F5C518',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 16,
    letterSpacing: 2,
    zIndex: 10,
  },
  circuit1: {
    position: 'absolute', left: 0, top: '30%',
    width: '28%', height: 1, backgroundColor: 'rgba(0,255,212,0.12)',
  },
  circuit2: {
    position: 'absolute', right: 0, top: '50%',
    width: '22%', height: 1, backgroundColor: 'rgba(0,255,212,0.12)',
  },
  circuit3: {
    position: 'absolute', left: '12%', bottom: '22%',
    width: '18%', height: 1, backgroundColor: 'rgba(0,255,212,0.12)',
  },
  // Anillo exterior cian
  ringOuter: {
    position: 'absolute',
    width: EMBLEM_SIZE,
    height: EMBLEM_SIZE,
    borderRadius: EMBLEM_RADIUS,
    borderWidth: 1.2,
    borderColor: 'rgba(0,255,212,0.30)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Anillo interior dorado
  ringInner: {
    position: 'absolute',
    width: EMBLEM_SIZE * 0.68,
    height: EMBLEM_SIZE * 0.68,
    borderRadius: (EMBLEM_SIZE * 0.68) / 2,
    borderWidth: 1,
    borderColor: 'rgba(245,197,24,0.30)',
  },
  ringDot: {
    position: 'absolute',
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#00FFD4',
    shadowColor: '#00FFD4',
    shadowRadius: 5,
    shadowOpacity: 1,
    elevation: 4,
  },
  // Centro del emblema (sobre los anillos)
  emblemCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    width: 100,
    height: 100,
  },
  letterHalo: {
    position: 'absolute',
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: 'rgba(245,197,24,0.18)',
    shadowColor: '#F5C518',
    shadowRadius: 28,
    shadowOpacity: 0.8,
    elevation: 10,
  },
  letterA: {
    fontSize: 64,
    fontWeight: '900',
    color: '#FFD966',
    textShadowColor: '#F5C518',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 18,
    lineHeight: 72,
  },
  uploadBtn: {
    position: 'absolute',
    bottom: 14,
    alignSelf: 'center',
  },
  uploadBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 22,
    paddingVertical: 8,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: 'rgba(0,255,212,0.55)',
    backgroundColor: 'rgba(0,255,212,0.05)',
    position: 'relative',
  },
  uploadLabel: {
    color: '#00FFD4',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  topLeft: {
    position: 'absolute', top: 14, left: 14,
  },
  topRight: {
    position: 'absolute', top: 14, right: 14,
  },
  hud: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 2,
  },
  pwaBadge: {
    backgroundColor: 'rgba(0, 255, 212, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 0.8,
    borderColor: 'rgba(0, 255, 212, 0.5)',
  },
  pwaText: {
    color: '#00FFD4',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
  },
});

// ─────────────────────────────────────────────
// Caja de redacción táctica
// ─────────────────────────────────────────────
function ComposeSection() {
  const { caption, hashtags, setCaption, addHashtag, removeHashtag, clearHashtags, aiLoading, setAiLoading, selectedMedia } = useAppStore();
  const [hashInput, setHashInput] = useState('');
  const EMOJIS = ['😊', '🔥', '🚀', '💡', '✨', '🎯', '💎', '⚡'];

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
    <View style={compose.wrapper}>
      <TechCorners color={C.neonBorder} size={14} />
      
      {/* Botón IA */}
      <View style={compose.aiHeader}>
        <TouchableOpacity 
          onPress={handleOptimize} 
          disabled={aiLoading || !caption.trim()}
          style={[compose.aiBtn, (!caption.trim() || aiLoading) && compose.aiBtnDisabled]}
        >
          {aiLoading ? (
            <ActivityIndicator size="small" color={C.gold} />
          ) : (
            <>
              <Text style={compose.aiIcon}>✨</Text>
              <Text style={compose.aiText}>Optimizar con IA</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <TextInput
        value={caption}
        onChangeText={setCaption}
        placeholder="Escribe tu idea y usa IA para viralizarla... 🚀"
        placeholderTextColor={C.textMuted}
        multiline
        maxLength={500}
        style={compose.input}
      />

      {/* Hashtags chips con opción de eliminar al tocar */}
      {hashtags.length > 0 && (
        <View style={compose.hashRow}>
          {hashtags.map((h, i) => (
            <TouchableOpacity key={i} onPress={() => removeHashtag(h)} activeOpacity={0.7}>
              <Text style={compose.hashChip}>{h} ✕</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Input de hashtags con botón rápido */}
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
        {hashInput.trim().length > 0 && (
          <TouchableOpacity
            onPress={() => {
              addHashtag(hashInput.trim());
              setHashInput('');
            }}
            style={compose.addBtn}
          >
            <Text style={compose.addBtnText}>+ Añadir</Text>
          </TouchableOpacity>
        )}
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
    marginHorizontal: 16,
    position: 'relative',
    gap: 8,
  },
  aiHeader: { alignItems: 'flex-end', marginBottom: -4 },
  aiBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(245, 197, 24, 0.1)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: C.gold, gap: 4 },
  aiBtnDisabled: { opacity: 0.4, borderColor: C.textMuted },
  aiIcon: { fontSize: 12 },
  aiText: { color: C.goldText, fontSize: 11, fontWeight: '700' },
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
    backgroundColor: 'rgba(0,255,212,0.08)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 0.5,
    borderColor: 'rgba(0,255,212,0.25)',
  },
  hashInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 0.5,
    borderTopColor: C.neonDim,
    paddingTop: 8,
    gap: 6,
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
  addBtn: {
    backgroundColor: 'rgba(0,255,212,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 0.8,
    borderColor: C.neonBorder,
  },
  addBtnText: {
    color: C.neon,
    fontSize: 11,
    fontWeight: '700',
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
  label, sub, color, SvgIcon, isActive, onToggle, onRowPress,
}: {
  label: string; sub: string; color: string;
  SvgIcon: React.ComponentType<{ size?: number }>;
  isActive: boolean; onToggle: () => void; onRowPress: () => void;
}) {
  return (
    <View style={plat.row}>
      {/* Área interactiva para vincular/configurar cuenta */}
      <TouchableOpacity
        onPress={onRowPress}
        activeOpacity={0.7}
        style={plat.touchArea}
      >
        {/* Icono SVG Oficial */}
        <View style={[plat.iconWrap, { backgroundColor: color + '15', borderColor: color + '44' }]}>
          <SvgIcon size={22} />
        </View>

        {/* Texto */}
        <View style={plat.textWrap}>
          <Text style={plat.label}>{label}</Text>
          <Text style={plat.sub}>{sub}</Text>
        </View>
      </TouchableOpacity>

      {/* Toggle estilo referencia — verde neón */}
      <Switch
        value={isActive}
        onValueChange={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onToggle();
        }}
        trackColor={{ false: 'rgba(255,255,255,0.12)', true: '#00FF7F' }}
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
  touchArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 9,
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
function PlatformsSection({ onSelectPlatform }: { onSelectPlatform: (id: PlatformId) => void }) {
  const { activePlatforms, togglePlatform, platformHandles } = useAppStore();
  
  return (
    <View style={pSection.wrapper}>
      <TechCorners color={C.neonBorder} size={14} />
      <View style={pSection.headerRow}>
        <Text style={pSection.title}>Plataformas Sincronizadas</Text>
        <Text style={pSection.hint}>Toca una red para configurar</Text>
      </View>
      {PLATFORMS.map((p) => {
        const isActive = activePlatforms.has(p.id as PlatformId);
        const customSub = platformHandles[p.id as PlatformId] || p.sub;

        return (
          <PlatformRow
            key={p.id}
            label={p.label}
            sub={customSub}
            color={p.color}
            SvgIcon={p.SvgIcon}
            isActive={isActive}
            onToggle={() => togglePlatform(p.id as PlatformId)}
            onRowPress={() => onSelectPlatform(p.id as PlatformId)}
          />
        );
      })}
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
    marginHorizontal: 16,
    position: 'relative',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    color: C.white,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  hint: {
    color: C.neon,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});

// ─────────────────────────────────────────────
// Botón PUBLICAR EN BLOQUE
// ─────────────────────────────────────────────
function PublishButton({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={pubBtn.outer}
    >
      {/* Borde brillante con gradiente */}
      <LinearGradient
        colors={[C.neonBorder, 'rgba(0,255,212,0.35)', C.neonBorder]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={pubBtn.gradient}
      >
        <TechCorners color={C.neon} size={10} />
        <View style={pubBtn.inner}>
          <Text style={pubBtn.glow}>⚡</Text>
          <Text style={pubBtn.label}>
            PUBLICAR EN BLOQUE
          </Text>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const pubBtn = StyleSheet.create({
  outer: {
    marginHorizontal: 16,
    borderRadius: 6,
    overflow: 'hidden',
    shadowColor: '#00FFD4',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 8,
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
});

// ════════════════════════════════════════════════════════════════
// HOME SCREEN PRINCIPAL
// ════════════════════════════════════════════════════════════════
export default function HomeScreen() {
  const { selectedMedia, uploadProgress, activePlatforms } = useAppStore();
  const { handlePublish } = usePublish();
  const scrollRef = useRef<ScrollView>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [selectedPlatformForConnect, setSelectedPlatformForConnect] = useState<PlatformId | null>(null);
  const [pwaPrompt, setPwaPrompt] = useState<any>(null);

  React.useEffect(() => {
    if (!verifyAppIntegrity()) {
      console.warn('Alerta de Integridad: Firma de autoría no válida.');
    }

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const handler = (e: any) => {
        e.preventDefault();
        setPwaPrompt(e);
      };
      window.addEventListener('beforeinstallprompt', handler);
      return () => window.removeEventListener('beforeinstallprompt', handler);
    }
  }, []);

  const handleUploadPress = () => {
    setShowUpload(true);
    setTimeout(() => scrollRef.current?.scrollTo({ y: 160, animated: true }), 100);
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
          ? 'Para instalar en tu iPhone o iPad:\n1. Toca el botón Compartir en Safari (icono de cuadrado con flecha).\n2. Elige "Agregar a pantalla de inicio".\n3. ¡Listo! La app se abrirá como nativa.'
          : 'Para instalar en este navegador:\n1. Toca el icono de instalación (o tres puntos ⋮ en Chrome/Edge).\n2. Selecciona "Instalar Alquimio Studio" o "Agregar a pantalla de inicio".',
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
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          {/* Contenedor central responsivo (Móvil, Tablet y Desktop) */}
          <View style={styles.responsiveWrapper}>
            <ScrollView
              ref={scrollRef}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scroll}
              keyboardShouldPersistTaps="handled"
            >

              {/* ══ BLOQUE 1: HERO HOLOGRÁFICO ════════════════ */}
              <View>
                <HoloHeader
                  onUploadPress={handleUploadPress}
                  onInstallPress={handleInstallPress}
                />
              </View>

              {/* ══ BLOQUE 1b: SELECTOR MULTIMEDIA Y FORMATO ══ */}
              <View style={styles.mediaBlock}>
                <TechCorners />
                {selectedMedia ? (
                  <>
                    <MediaPreview media={selectedMedia} uploadProgress={uploadProgress} />
                    <AspectRatioSelector />
                  </>
                ) : (
                  <MediaPicker onOpenMenu={handleUploadPress} />
                )}
              </View>

              {/* Separador */}
              <View style={styles.sep} />

              {/* ══ BLOQUE 2: CAJA DE REDACCIÓN ══════════════ */}
              <View>
                <ComposeSection />
              </View>

              {/* Separador */}
              <View style={styles.sep} />

              {/* ══ BLOQUE 3: PLATAFORMAS ════════════════════ */}
              <View>
                <PlatformsSection onSelectPlatform={(id) => setSelectedPlatformForConnect(id)} />
              </View>

              {/* Separador */}
              <View style={styles.sep} />

              {/* ══ BLOQUE 4: BOTÓN PUBLICAR ═════════════════ */}
              <View>
                <PublishButton onPress={onPublishClick} />
              </View>

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
          </View>
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
  safe: {
    flex: 1,
    minHeight: H,
    backgroundColor: C.bg,
  },
  flex: { 
    flex: 1,
    minHeight: H,
    width: '100%',
    backgroundColor: C.bg,
  },
  responsiveWrapper: {
    width: '100%',
    maxWidth: 520,
    marginHorizontal: 'auto' as any,
    alignSelf: 'center',
    flex: 1,
    minHeight: '100%' as any,
    backgroundColor: C.bg,
  },
  scroll: {
    paddingVertical: 20,
    flexGrow: 1,
  },
  mediaBlock: {
    marginHorizontal: 16,
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
