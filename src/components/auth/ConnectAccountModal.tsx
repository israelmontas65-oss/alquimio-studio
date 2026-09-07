// ============================================================
// src/components/auth/ConnectAccountModal.tsx
// Modal de vinculación individual por plataforma con campo
// de usuario y flujo OAuth simulado (Beta/Demo Mode)
// ============================================================

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppStore } from '../../store/useAppStore';
import type { PlatformId } from '../../types/platform.types';
import {
  TikTokSvg,
  InstagramSvg,
  YouTubeSvg,
  WhatsAppSvg,
  FacebookSvg,
  CloseCircleSvg,
} from '../ui/SocialIcons';

// ── Paleta ─────────────────────────────────────────────────────
const C = {
  bg: '#080C14',
  bgCard: 'rgba(8, 18, 32, 0.97)',
  neon: '#00FFD4',
  neonBorder: 'rgba(0,255,212,0.55)',
  neonDim: 'rgba(0,255,212,0.08)',
  gold: '#F5C518',
  goldText: '#FFD966',
  white: '#FFFFFF',
  textMuted: 'rgba(255,255,255,0.45)',
  green: '#00FF7F',
  greenBg: 'rgba(0,255,127,0.1)',
};

// ── Config por plataforma ──────────────────────────────────────
const PLATFORM_META: Record<PlatformId, {
  name: string;
  SvgIcon: React.ComponentType<{ size?: number }>;
  color: string;
  placeholder: string;
  hint: string;
}> = {
  tiktok: {
    name: 'TikTok',
    SvgIcon: TikTokSvg,
    color: '#FFFFFF',
    placeholder: '@tu_usuario_tiktok',
    hint: 'Ingresa tu nombre de usuario de TikTok',
  },
  instagram: {
    name: 'Instagram Reels',
    SvgIcon: InstagramSvg,
    color: '#E1306C',
    placeholder: '@tu_cuenta_instagram',
    hint: 'Ingresa tu usuario o nombre de cuenta',
  },
  youtube: {
    name: 'YouTube Shorts',
    SvgIcon: YouTubeSvg,
    color: '#FF0000',
    placeholder: '@tu_canal_youtube',
    hint: 'Ingresa el nombre de tu canal de YouTube',
  },
  whatsapp: {
    name: 'WhatsApp Business',
    SvgIcon: WhatsAppSvg,
    color: '#25D366',
    placeholder: '+1 (XXX) XXX-XXXX',
    hint: 'Número de tu cuenta WhatsApp Business',
  },
  facebook: {
    name: 'Facebook',
    SvgIcon: FacebookSvg,
    color: '#1877F2',
    placeholder: '@tu_pagina_facebook',
    hint: 'Nombre de tu página o perfil de Facebook',
  },
};

// ── Props ──────────────────────────────────────────────────────
interface Props {
  platformId: PlatformId | null;
  onClose: () => void;
}

export function ConnectAccountModal({ platformId, onClose }: Props) {
  const { linkedAccounts, linkAccount, unlinkAccount, platformHandles } = useAppStore();
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'idle' | 'connecting' | 'success'>('idle');

  React.useEffect(() => {
    if (platformId) {
      setUsername(platformHandles[platformId] || '');
      setStep('idle');
    }
  }, [platformId, platformHandles]);

  if (!platformId) return null;

  const meta = PLATFORM_META[platformId];
  const isLinked = linkedAccounts.has(platformId);
  const platformName = meta.name;

  const handleConnect = async () => {
    if (!username.trim()) return;
    setLoading(true);
    setStep('connecting');

    // Simular latencia de OAuth redirect → callback
    await new Promise((r) => setTimeout(r, 1200));

    linkAccount(platformId, username.trim());
    setStep('success');
    setLoading(false);

    // Cierra tras 1.2s para que el usuario vea el éxito
    setTimeout(() => {
      onClose();
      setStep('idle');
    }, 1200);
  };

  const handleDisconnect = () => {
    unlinkAccount(platformId);
    onClose();
    setStep('idle');
    setUsername('');
  };

  const handleClose = () => {
    if (loading) return;
    onClose();
    setStep('idle');
  };

  return (
    <Modal visible={!!platformId} transparent animationType="slide">
      <BlurView intensity={50} tint="dark" style={StyleSheet.absoluteFill}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={s.kav}
        >
          <View style={s.overlay}>
            <View style={s.card}>

              {/* ── TechCorners ── */}
              <View style={s.tlCorner} /><View style={s.trCorner} />
              <View style={s.blCorner} /><View style={s.brCorner} />

              {/* ── Header ── */}
              <View style={s.header}>
                <View style={[s.iconWrap, { backgroundColor: meta.color + '22', borderColor: meta.color + '55' }]}>
                  <meta.SvgIcon size={24} />
                </View>
                <View style={s.headerText}>
                  <Text style={s.title}>Vincular cuenta</Text>
                  <Text style={[s.subtitle, { color: meta.color }]}>{platformName}</Text>
                </View>
                <TouchableOpacity onPress={handleClose} style={s.closeBtn} disabled={loading}>
                  <CloseCircleSvg size={22} />
                </TouchableOpacity>
              </View>

              {/* ── Estado: Conectada ── */}
              {isLinked && step !== 'success' ? (
                <View style={s.connectedState}>
                  <View style={s.connectedBadge}>
                    <Ionicons name="checkmark-circle" size={20} color={C.green} />
                    <Text style={s.connectedText}>Conectada exitosamente</Text>
                  </View>
                  <Text style={s.connectedSub}>
                    Tu cuenta de {platformName} está activa y lista para publicar.
                  </Text>
                  <TouchableOpacity onPress={handleDisconnect} style={s.disconnectBtn}>
                    <Ionicons name="unlink-outline" size={14} color={C.textMuted} />
                    <Text style={s.disconnectText}>Desvincular cuenta</Text>
                  </TouchableOpacity>
                </View>
              ) : step === 'success' ? (
                /* ── Estado: Éxito ── */
                <View style={s.successState}>
                  <View style={s.successIcon}>
                    <Ionicons name="checkmark-circle" size={48} color={C.green} />
                  </View>
                  <Text style={s.successTitle}>¡Cuenta conectada!</Text>
                  <Text style={s.successSub}>
                    {platformName} ha sido vinculada y activada automáticamente.
                  </Text>
                </View>
              ) : (
                /* ── Estado: Formulario ── */
                <>
                  {/* Status badge */}
                  <View style={s.statusBadge}>
                    <View style={s.statusDot} />
                    <Text style={s.statusText}>No vinculada</Text>
                  </View>

                  {/* Campo usuario */}
                  <View style={s.fieldGroup}>
                    <Text style={s.fieldLabel}>{meta.hint}</Text>
                    <View style={[s.inputWrap, username.length > 0 && s.inputWrapActive]}>
                      <Ionicons name="person-outline" size={16} color={C.neon} style={{ marginRight: 8 }} />
                      <TextInput
                        value={username}
                        onChangeText={setUsername}
                        placeholder={meta.placeholder}
                        placeholderTextColor={C.textMuted}
                        style={s.input}
                        autoCorrect={false}
                        autoCapitalize="none"
                        editable={!loading}
                      />
                    </View>
                  </View>

                  {/* Botón OAuth */}
                  <TouchableOpacity
                    onPress={handleConnect}
                    disabled={loading || !username.trim()}
                    style={[s.oauthBtn, (!username.trim() || loading) && s.oauthBtnDisabled]}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={
                        !username.trim() || loading
                          ? ['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.03)']
                          : [C.neonBorder, 'rgba(0,255,212,0.25)', C.neonBorder]
                      }
                      start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                      style={s.oauthGradient}
                    >
                      <View style={s.oauthInner}>
                        {loading ? (
                          <>
                            <ActivityIndicator size="small" color={C.neon} />
                            <Text style={s.oauthText}>Autorizando...</Text>
                          </>
                        ) : (
                          <>
                            <Ionicons name="shield-checkmark-outline" size={16} color={C.neon} />
                            <Text style={s.oauthText}>Conectar mediante acceso oficial (OAuth 2.0)</Text>
                          </>
                        )}
                      </View>
                    </LinearGradient>
                  </TouchableOpacity>

                  <Text style={s.disclaimer}>
                    🔒 Beta Tester Mode — Sin tokens reales. La vinculación es simulada para demostración.
                  </Text>
                </>
              )}
            </View>
          </View>
        </KeyboardAvoidingView>
      </BlurView>
    </Modal>
  );
}

// ── Estilos ─────────────────────────────────────────────────────
const CORNER = 14;
const s = StyleSheet.create({
  kav: { flex: 1 },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(8,12,20,0.55)',
  },
  card: {
    backgroundColor: C.bgCard,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: C.neonBorder,
    borderBottomWidth: 0,
    padding: 24,
    paddingBottom: 36,
    position: 'relative',
    shadowColor: C.neon,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 20,
    width: '100%',
    maxWidth: 460,
    alignSelf: 'center',
  },
  // Tech corners (top only since bottom is screen edge)
  tlCorner: { position: 'absolute', top: 0, left: 0, width: CORNER, height: CORNER, borderTopWidth: 1.5, borderLeftWidth: 1.5, borderColor: C.neon, borderTopLeftRadius: 20 },
  trCorner: { position: 'absolute', top: 0, right: 0, width: CORNER, height: CORNER, borderTopWidth: 1.5, borderRightWidth: 1.5, borderColor: C.neon, borderTopRightRadius: 20 },
  blCorner: { position: 'absolute', bottom: 0, left: 0, width: CORNER, height: CORNER, borderBottomWidth: 1.5, borderLeftWidth: 1.5, borderColor: 'rgba(0,255,212,0.2)' },
  brCorner: { position: 'absolute', bottom: 0, right: 0, width: CORNER, height: CORNER, borderBottomWidth: 1.5, borderRightWidth: 1.5, borderColor: 'rgba(0,255,212,0.2)' },
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 22,
    gap: 12,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1 },
  title: { color: C.white, fontSize: 16, fontWeight: '700' },
  subtitle: { fontSize: 13, fontWeight: '600', marginTop: 1 },
  closeBtn: { padding: 4 },
  // Status badge (no vinculada)
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 18,
    backgroundColor: 'rgba(255,100,100,0.08)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,100,100,0.25)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#FF5B5B',
  },
  statusText: { color: '#FF8080', fontSize: 12, fontWeight: '600' },
  // Input
  fieldGroup: { marginBottom: 16, gap: 8 },
  fieldLabel: { color: C.textMuted, fontSize: 12, letterSpacing: 0.3 },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,255,212,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(0,255,212,0.2)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  inputWrapActive: { borderColor: C.neonBorder },
  input: { flex: 1, color: C.white, fontSize: 14 },
  // OAuth Button
  oauthBtn: { borderRadius: 8, overflow: 'hidden' },
  oauthBtnDisabled: { opacity: 0.45 },
  oauthGradient: { padding: 1.5, borderRadius: 8 },
  oauthInner: {
    backgroundColor: 'rgba(8,18,32,0.96)',
    borderRadius: 7,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  oauthText: { color: C.white, fontSize: 13, fontWeight: '700', letterSpacing: 0.3 },
  disclaimer: {
    color: C.textMuted,
    fontSize: 10.5,
    textAlign: 'center',
    marginTop: 14,
    lineHeight: 15,
  },
  // Connected state
  connectedState: { gap: 12, paddingBottom: 6 },
  connectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.greenBg,
    borderWidth: 0.5,
    borderColor: 'rgba(0,255,127,0.3)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  connectedText: { color: C.green, fontWeight: '700', fontSize: 14 },
  connectedSub: { color: C.textMuted, fontSize: 13, lineHeight: 18 },
  disconnectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingVertical: 6,
  },
  disconnectText: { color: C.textMuted, fontSize: 12, textDecorationLine: 'underline' },
  // Success state
  successState: { alignItems: 'center', paddingVertical: 16, gap: 10 },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0,255,127,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: { color: C.green, fontSize: 20, fontWeight: '800', letterSpacing: 0.5 },
  successSub: { color: C.textMuted, fontSize: 13, textAlign: 'center', lineHeight: 18 },
});
