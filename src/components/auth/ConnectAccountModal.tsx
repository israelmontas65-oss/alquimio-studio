import React, { useState, useEffect } from 'react';
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
  CheckmarkCircleSvg,
  AlertCircleSvg,
  PersonOutlineSvg,
  RefreshSvg,
} from '../ui/SocialIcons';
import {
  initiateTikTokOAuth,
  disconnectTikTok,
} from '../../services/tiktokAuthService';
import { saveToken, removeToken } from '../../auth/tokenManager';

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
  red: '#FF5B5B',
  redBg: 'rgba(255,91,91,0.1)',
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
    color: '#00F2FE',
    placeholder: '@tu_usuario_tiktok',
    hint: 'Conexión oficial directa mediante OAuth 2.0 PKCE',
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
  const [loadingMode, setLoadingMode] = useState<'normal' | 'switch'>('normal');
  const [step, setStep] = useState<'idle' | 'connecting' | 'success'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (platformId) {
      setUsername(platformHandles[platformId] || '');
      setStep('idle');
      setErrorMessage(null);
    }
  }, [platformId, platformHandles]);

  // Escuchar mensaje de popup OAuth en Web
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'TIKTOK_AUTH_SUCCESS') {
        setErrorMessage(null);
        setStep('success');
        setLoading(false);
        setTimeout(() => {
          onClose();
          setStep('idle');
        }, 1200);
      } else if (event.data?.type === 'TIKTOK_AUTH_ERROR') {
        setLoading(false);
        setStep('idle');
        const desc = event.data?.description || event.data?.error || 'No se completó la autorización de TikTok.';
        setErrorMessage(desc);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onClose]);

  if (!platformId) return null;

  const meta = PLATFORM_META[platformId];
  const isLinked = linkedAccounts.has(platformId);
  const platformName = meta.name;

  // Conexión para TikTok (OAuth 2.0 Oficial) o plataformas estándar
  const handleConnect = async (options?: { forceLogin?: boolean }) => {
    setErrorMessage(null);

    if (platformId === 'tiktok') {
      try {
        setLoading(true);
        setLoadingMode(options?.forceLogin ? 'switch' : 'normal');
        setStep('connecting');

        await initiateTikTokOAuth({ forceLogin: options?.forceLogin });

        if (Platform.OS !== 'web') {
          setStep('success');
          setLoading(false);
          setTimeout(() => {
            onClose();
            setStep('idle');
          }, 1200);
        }
      } catch (err: unknown) {
        setLoading(false);
        setStep('idle');
        const msg = err instanceof Error ? err.message : 'Error al iniciar conexión con TikTok.';
        setErrorMessage(msg);
      }
      return;
    }

    // Otras plataformas (Reels, YouTube, WhatsApp, Facebook)
    const realHandle = username.trim();
    setLoading(true);
    setStep('connecting');

    await saveToken(platformId, {
      accessToken: `token_${platformId}_${Date.now()}`,
      displayName: realHandle,
    });
    linkAccount(platformId, realHandle);

    setStep('success');
    setLoading(false);

    setTimeout(() => {
      onClose();
      setStep('idle');
    }, 1000);
  };

  const handleDisconnect = async () => {
    if (platformId === 'tiktok') {
      try {
        setLoading(true);
        await disconnectTikTok();
      } catch {
        await removeToken('tiktok');
        unlinkAccount('tiktok');
      } finally {
        setLoading(false);
        onClose();
        setStep('idle');
        setUsername('');
      }
      return;
    }

    await removeToken(platformId);
    unlinkAccount(platformId);
    onClose();
    setStep('idle');
    setUsername('');
  };

  const handleClose = () => {
    if (loading) return;
    onClose();
    setStep('idle');
    setErrorMessage(null);
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
                    <CheckmarkCircleSvg size={18} color={C.green} />
                    <Text style={s.connectedBadgeText}>Conectada</Text>
                    {Boolean(platformHandles[platformId]) && (
                      <Text style={s.connectedUserText}>
                        {platformHandles[platformId]}
                      </Text>
                    )}
                  </View>
                  <Text style={s.connectedSub}>
                    Tu cuenta oficial de {platformName} está vinculada y lista para publicar videos automáticamente desde Alquimia.
                  </Text>
                  <TouchableOpacity onPress={handleDisconnect} style={s.disconnectBtn} disabled={loading}>
                    {loading ? (
                      <ActivityIndicator size="small" color={C.textMuted} />
                    ) : (
                      <Text style={s.disconnectText}>Desvincular cuenta y revocar acceso</Text>
                    )}
                  </TouchableOpacity>
                </View>
              ) : step === 'success' ? (
                /* ── Estado: Éxito ── */
                <View style={s.successState}>
                  <View style={s.successIcon}>
                    <CheckmarkCircleSvg size={48} color={C.green} />
                  </View>
                  <Text style={s.successTitle}>¡Cuenta conectada!</Text>
                  <Text style={s.successSub}>
                    {platformName} ha sido vinculada y activada con éxito en Alquimia.
                  </Text>
                </View>
              ) : platformId === 'tiktok' ? (
                /* ── Estado: Formulario Oficial TikTok ── */
                <>
                  <View style={s.statusBadge}>
                    <View style={s.statusDot} />
                    <Text style={s.statusText}>No vinculada</Text>
                  </View>

                  <Text style={s.tiktokExplainer}>
                    Conecta tu cuenta oficial de TikTok mediante OAuth 2.0 para publicar videos directamente. Si ya tienes sesión abierta en tu navegador, la vinculación es inmediata.
                  </Text>

                  {/* Mensaje de Error si la autorización falló o fue cancelada */}
                  {errorMessage && (
                    <View style={s.errorBox}>
                      <AlertCircleSvg size={18} color={C.red} />
                      <View style={s.errorTextWrap}>
                        <Text style={s.errorTitle}>Error de autorización</Text>
                        <Text style={s.errorBody}>{errorMessage}</Text>
                      </View>
                    </View>
                  )}

                  {/* Botón Principal: Conectar con TikTok */}
                  <TouchableOpacity
                    onPress={() => handleConnect({ forceLogin: false })}
                    disabled={loading}
                    style={s.oauthBtn}
                    activeOpacity={0.85}
                  >
                    <LinearGradient
                      colors={['#00F2FE', '#4FACFE']}
                      start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                      style={s.oauthGradient}
                    >
                      <View style={s.oauthInnerTikTok}>
                        {loading && loadingMode === 'normal' ? (
                          <>
                            <ActivityIndicator size="small" color={C.white} />
                            <Text style={s.oauthTextTikTok}>Abriendo login oficial de TikTok...</Text>
                          </>
                        ) : (
                          <>
                            <TikTokSvg size={20} />
                            <Text style={s.oauthTextTikTok}>Conectar con TikTok (OAuth 2.0)</Text>
                          </>
                        )}
                      </View>
                    </LinearGradient>
                  </TouchableOpacity>

                  {/* Enlace/Botón Visible: Iniciar sesión con otra cuenta de TikTok (prompt=login) */}
                  <TouchableOpacity
                    onPress={() => handleConnect({ forceLogin: true })}
                    disabled={loading}
                    style={s.switchAccountBtn}
                    activeOpacity={0.7}
                  >
                    {loading && loadingMode === 'switch' ? (
                      <ActivityIndicator size="small" color="#00F2FE" />
                    ) : (
                      <RefreshSvg size={15} color="#00F2FE" />
                    )}
                    <Text style={s.switchAccountText}>
                      Iniciar sesión con otra cuenta de TikTok
                    </Text>
                  </TouchableOpacity>

                  <Text style={s.disclaimer}>
                    🔒 Conexión oficial mediante TikTok Content Posting API v2. Credenciales y tokens resguardados de forma segura en el servidor de Alquimia.
                  </Text>
                </>
              ) : (
                /* ── Estado: Formulario Otras Plataformas ── */
                <>
                  <View style={s.statusBadge}>
                    <View style={s.statusDot} />
                    <Text style={s.statusText}>No vinculada</Text>
                  </View>

                  <View style={s.fieldGroup}>
                    <Text style={s.fieldLabel}>{meta.hint}</Text>
                    <View style={[s.inputWrap, username.length > 0 && s.inputWrapActive]}>
                      <PersonOutlineSvg size={16} color={C.neon} />
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

                  <TouchableOpacity
                    onPress={() => handleConnect()}
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
                            <CheckmarkCircleSvg size={16} color={C.neon} />
                            <Text style={s.oauthText}>Conectar cuenta</Text>
                          </>
                        )}
                      </View>
                    </LinearGradient>
                  </TouchableOpacity>
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
  tlCorner: { position: 'absolute', top: 0, left: 0, width: CORNER, height: CORNER, borderTopWidth: 1.5, borderLeftWidth: 1.5, borderColor: C.neon, borderTopLeftRadius: 20 },
  trCorner: { position: 'absolute', top: 0, right: 0, width: CORNER, height: CORNER, borderTopWidth: 1.5, borderRightWidth: 1.5, borderColor: C.neon, borderTopRightRadius: 20 },
  blCorner: { position: 'absolute', bottom: 0, left: 0, width: CORNER, height: CORNER, borderBottomWidth: 1.5, borderLeftWidth: 1.5, borderColor: 'rgba(0,255,212,0.2)' },
  brCorner: { position: 'absolute', bottom: 0, right: 0, width: CORNER, height: CORNER, borderBottomWidth: 1.5, borderRightWidth: 1.5, borderColor: 'rgba(0,255,212,0.2)' },
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
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
    marginBottom: 14,
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
    gap: 8,
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
  connectedBadgeText: { color: C.green, fontWeight: '800', fontSize: 13, letterSpacing: 0.5 },
  connectedUserText: { color: C.white, fontWeight: '700', fontSize: 14, marginLeft: 4 },
  connectedSub: { color: C.textMuted, fontSize: 13, lineHeight: 18 },
  disconnectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingVertical: 6,
  },
  disconnectText: { color: '#FF8080', fontSize: 12, textDecorationLine: 'underline' },
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
  // TikTok specific
  tiktokExplainer: {
    color: C.textMuted,
    fontSize: 12.5,
    lineHeight: 18,
    marginBottom: 14,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: C.redBg,
    borderWidth: 1,
    borderColor: 'rgba(255,91,91,0.35)',
    borderRadius: 8,
    padding: 10,
    marginBottom: 14,
  },
  errorTextWrap: { flex: 1 },
  errorTitle: { color: C.red, fontSize: 12, fontWeight: '700', marginBottom: 2 },
  errorBody: { color: '#FFB0B0', fontSize: 11.5, lineHeight: 16 },
  oauthInnerTikTok: {
    backgroundColor: 'rgba(8, 18, 32, 0.95)',
    borderRadius: 7,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  oauthTextTikTok: {
    color: C.white,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  switchAccountBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 242, 254, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(0, 242, 254, 0.25)',
  },
  switchAccountText: {
    color: '#00F2FE',
    fontSize: 12.5,
    fontWeight: '700',
  },
});
