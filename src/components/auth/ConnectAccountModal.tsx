// ============================================================
// src/components/auth/ConnectAccountModal.tsx
// Modal de autenticación oficial y vinculación inteligente
// Soporta Meta (FB/IG), YouTube (Google), TikTok API v2 y WhatsApp
// ============================================================

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
  RefreshSvg,
} from '../ui/SocialIcons';
import { initiateTikTokOAuth, disconnectTikTok } from '../../services/tiktokAuthService';
import { initiateMetaOAuth, disconnectMeta, getLastMetaAccounts } from '../../services/metaAuthService';
import { initiateYouTubeOAuth, disconnectYouTube, getLastYouTubeAccount } from '../../services/youtubeAuthService';
import { saveWhatsAppNumber, disconnectWhatsApp, getStoredWhatsAppNumber } from '../../services/whatsappService';
import { getToken } from '../../auth/tokenManager';

// ── Paleta Espacial Alquimia ──────────────────────────────────
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

// ── Metadatos por plataforma ──────────────────────────────────
const PLATFORM_META: Record<
  PlatformId,
  {
    name: string;
    SvgIcon: React.ComponentType<{ size?: number }>;
    color: string;
    description: string;
  }
> = {
  tiktok: {
    name: 'TikTok',
    SvgIcon: TikTokSvg,
    color: '#00F2FE',
    description: 'OAuth 2.0 PKCE con TikTok Content Posting API v2.',
  },
  instagram: {
    name: 'Instagram Reels',
    SvgIcon: InstagramSvg,
    color: '#E1306C',
    description: 'Meta Graph API v19 para cuentas de Instagram Business.',
  },
  facebook: {
    name: 'Facebook Pages',
    SvgIcon: FacebookSvg,
    color: '#1877F2',
    description: 'Meta Graph API v19 con tokens de Página permanentes.',
  },
  youtube: {
    name: 'YouTube Shorts',
    SvgIcon: YouTubeSvg,
    color: '#FF0000',
    description: 'Google OAuth 2.0 con YouTube Data API v3 y subida reanudable.',
  },
  whatsapp: {
    name: 'WhatsApp Business',
    SvgIcon: WhatsAppSvg,
    color: '#25D366',
    description: 'Envío transparente mediante Intent oficial en tu dispositivo.',
  },
};

interface Props {
  platformId: PlatformId | null;
  onClose: () => void;
}

export function ConnectAccountModal({ platformId, onClose }: Props) {
  const { linkedAccounts, platformHandles } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [loadingMode, setLoadingMode] = useState<'normal' | 'switch'>('normal');
  const [step, setStep] = useState<'idle' | 'connecting' | 'success'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Memoria de última cuenta usada
  const [lastAccount, setLastAccount] = useState<string | null>(null);

  // Input exclusivo para WhatsApp
  const [waInput, setWaInput] = useState('');

  useEffect(() => {
    if (!platformId) return;

    setStep('idle');
    setErrorMessage(null);
    setLoading(false);

    // Cargar última cuenta usada en este dispositivo
    async function loadLastAccount() {
      if (platformId === 'tiktok') {
        const tk = await getToken('tiktok');
        setLastAccount(tk?.displayName || null);
      } else if (platformId === 'facebook' || platformId === 'instagram') {
        const metaAccs = await getLastMetaAccounts();
        const found = platformId === 'facebook' ? metaAccs.facebook : metaAccs.instagram;
        setLastAccount(found || null);
      } else if (platformId === 'youtube') {
        const yt = await getLastYouTubeAccount();
        setLastAccount(yt || null);
      } else if (platformId === 'whatsapp') {
        const num = await getStoredWhatsAppNumber();
        setWaInput(num);
        setLastAccount(num || null);
      }
    }

    loadLastAccount();
  }, [platformId]);

  // Escuchar mensajes de popup OAuth en Web
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;

    const handleMessage = (event: MessageEvent) => {
      const type = event.data?.type;

      if (
        type === 'TIKTOK_AUTH_SUCCESS' ||
        type === 'META_AUTH_SUCCESS' ||
        type === 'YOUTUBE_AUTH_SUCCESS'
      ) {
        setErrorMessage(null);
        setStep('success');
        setLoading(false);
        setTimeout(() => {
          onClose();
          setStep('idle');
        }, 1200);
      } else if (
        type === 'TIKTOK_AUTH_ERROR' ||
        type === 'META_AUTH_ERROR' ||
        type === 'YOUTUBE_AUTH_ERROR'
      ) {
        setLoading(false);
        setStep('idle');
        const desc =
          event.data?.description || event.data?.error || 'No se completó la autorización oficial.';
        setErrorMessage(desc);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onClose]);

  if (!platformId) return null;

  const meta = PLATFORM_META[platformId];
  const isLinked = linkedAccounts.has(platformId);
  const currentHandle = platformHandles[platformId]?.trim();

  // Iniciar conexión OAuth según plataforma
  const handleConnect = async (options?: { forceLogin?: boolean }) => {
    setErrorMessage(null);
    setLoading(true);
    setLoadingMode(options?.forceLogin ? 'switch' : 'normal');

    try {
      if (platformId === 'tiktok') {
        await initiateTikTokOAuth({ forceLogin: options?.forceLogin });
      } else if (platformId === 'facebook' || platformId === 'instagram') {
        await initiateMetaOAuth({ forceLogin: options?.forceLogin });
      } else if (platformId === 'youtube') {
        await initiateYouTubeOAuth({ forceLogin: options?.forceLogin });
      } else if (platformId === 'whatsapp') {
        if (!waInput.trim()) {
          throw new Error('Por favor ingresa un número de WhatsApp válido.');
        }
        await saveWhatsAppNumber(waInput);
        setStep('success');
        setLoading(false);
        setTimeout(() => {
          onClose();
          setStep('idle');
        }, 1000);
        return;
      }

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
      const msg = err instanceof Error ? err.message : 'Error al conectar con la plataforma.';
      setErrorMessage(msg);
    }
  };

  const handleDisconnect = async () => {
    setLoading(true);
    try {
      if (platformId === 'tiktok') {
        await disconnectTikTok();
      } else if (platformId === 'facebook' || platformId === 'instagram') {
        await disconnectMeta();
      } else if (platformId === 'youtube') {
        await disconnectYouTube();
      } else if (platformId === 'whatsapp') {
        await disconnectWhatsApp();
      }
    } finally {
      setLoading(false);
      onClose();
      setStep('idle');
    }
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
              {/* TechCorners */}
              <View style={s.tlCorner} />
              <View style={s.trCorner} />
              <View style={s.blCorner} />
              <View style={s.brCorner} />

              {/* Header */}
              <View style={s.header}>
                <View
                  style={[
                    s.iconWrap,
                    { backgroundColor: meta.color + '22', borderColor: meta.color + '55' },
                  ]}
                >
                  <meta.SvgIcon size={26} />
                </View>
                <View style={s.headerText}>
                  <Text style={s.title}>Vincular cuenta oficial</Text>
                  <Text style={[s.subtitle, { color: meta.color }]}>{meta.name}</Text>
                </View>
                <TouchableOpacity onPress={handleClose} style={s.closeBtn} disabled={loading}>
                  <CloseCircleSvg size={22} />
                </TouchableOpacity>
              </View>

              {/* ── Estado 1: Conectada ── */}
              {isLinked && step !== 'success' ? (
                <View style={s.connectedState}>
                  <View style={s.connectedBadge}>
                    <CheckmarkCircleSvg size={18} color={C.green} />
                    <Text style={s.connectedBadgeText}>Conectada</Text>
                    {Boolean(currentHandle) && (
                      <Text style={s.connectedUserText}>{currentHandle}</Text>
                    )}
                  </View>
                  <Text style={s.connectedSub}>
                    Tu cuenta oficial de {meta.name} está vinculada con permisos activos y lista
                    para publicar desde Alquimia.
                  </Text>
                  <TouchableOpacity
                    onPress={handleDisconnect}
                    style={s.disconnectBtn}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator size="small" color={C.textMuted} />
                    ) : (
                      <Text style={s.disconnectText}>Desvincular cuenta y revocar acceso</Text>
                    )}
                  </TouchableOpacity>
                </View>
              ) : step === 'success' ? (
                /* ── Estado 2: Éxito ── */
                <View style={s.successState}>
                  <View style={s.successIcon}>
                    <CheckmarkCircleSvg size={48} color={C.green} />
                  </View>
                  <Text style={s.successTitle}>¡Cuenta vinculada con éxito!</Text>
                  <Text style={s.successSub}>
                    {meta.name} ha sido verificada y activada en tu consola de Alquimia.
                  </Text>
                </View>
              ) : (
                /* ── Estado 3: No vinculada (Formularios Oficiales) ── */
                <>
                  <View style={s.statusBadge}>
                    <View style={s.statusDot} />
                    <Text style={s.statusText}>No vinculada</Text>
                  </View>

                  {/* Tarjeta de Memoria: Última cuenta usada */}
                  {Boolean(lastAccount) && (
                    <View style={s.memoryCard}>
                      <Text style={s.memoryTitle}>Última cuenta usada en este dispositivo:</Text>
                      <Text style={s.memoryUser}>{lastAccount}</Text>
                      <TouchableOpacity
                        onPress={() => handleConnect({ forceLogin: false })}
                        disabled={loading}
                        style={s.memoryBtn}
                      >
                        <Text style={s.memoryBtnText}>
                          {loading && loadingMode === 'normal'
                            ? 'Reconectando...'
                            : `Conectar con ${lastAccount}`}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Mensaje de Error */}
                  {errorMessage && (
                    <View style={s.errorBox}>
                      <AlertCircleSvg size={18} color={C.red} />
                      <View style={s.errorTextWrap}>
                        <Text style={s.errorTitle}>Error de conexión</Text>
                        <Text style={s.errorBody}>{errorMessage}</Text>
                      </View>
                    </View>
                  )}

                  {/* Formulario según plataforma */}
                  {platformId === 'tiktok' && (
                    <>
                      <Text style={s.explainer}>
                        Conecta tu cuenta de TikTok mediante OAuth 2.0 oficial. Si ya tienes sesión
                        abierta en tu navegador, la vinculación se realiza en segundos.
                      </Text>

                      <TouchableOpacity
                        onPress={() => handleConnect({ forceLogin: false })}
                        disabled={loading}
                        style={s.oauthBtn}
                      >
                        <LinearGradient
                          colors={['#00F2FE', '#4FACFE']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={s.oauthGradient}
                        >
                          <View style={s.oauthInner}>
                            {loading && loadingMode === 'normal' ? (
                              <ActivityIndicator size="small" color={C.white} />
                            ) : (
                              <TikTokSvg size={20} />
                            )}
                            <Text style={s.oauthText}>
                              {loading && loadingMode === 'normal'
                                ? 'Abriendo TikTok...'
                                : 'Conectar con TikTok (OAuth 2.0)'}
                            </Text>
                          </View>
                        </LinearGradient>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => handleConnect({ forceLogin: true })}
                        disabled={loading}
                        style={s.switchAccountBtn}
                      >
                        <RefreshSvg size={14} color="#00F2FE" />
                        <Text style={s.switchAccountText}>
                          Iniciar sesión con otra cuenta de TikTok
                        </Text>
                      </TouchableOpacity>

                      <Text style={s.auditNotice}>
                        ⚠️ Aviso de Auditoría: En modo Sandbox de TikTok, los videos se publicarán
                        como privados (SELF_ONLY) y la cuenta debe estar agregada en el portal de
                        desarrolladores.
                      </Text>
                    </>
                  )}

                  {(platformId === 'facebook' || platformId === 'instagram') && (
                    <>
                      <Text style={s.explainer}>
                        Inicia sesión con Meta para conectar tu Página de Facebook y tu cuenta de
                        Instagram Business asociada con permisos de publicación permanente.
                      </Text>

                      <TouchableOpacity
                        onPress={() => handleConnect({ forceLogin: false })}
                        disabled={loading}
                        style={s.oauthBtn}
                      >
                        <LinearGradient
                          colors={['#1877F2', '#0052CC']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={s.oauthGradient}
                        >
                          <View style={s.oauthInner}>
                            {loading && loadingMode === 'normal' ? (
                              <ActivityIndicator size="small" color={C.white} />
                            ) : (
                              <FacebookSvg size={20} />
                            )}
                            <Text style={s.oauthText}>
                              {loading && loadingMode === 'normal'
                                ? 'Abriendo Meta...'
                                : 'Conectar con Meta (Facebook & Instagram)'}
                            </Text>
                          </View>
                        </LinearGradient>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => handleConnect({ forceLogin: true })}
                        disabled={loading}
                        style={s.switchAccountBtn}
                      >
                        <RefreshSvg size={14} color="#1877F2" />
                        <Text style={[s.switchAccountText, { color: '#1877F2' }]}>
                          Iniciar sesión con otra cuenta de Meta
                        </Text>
                      </TouchableOpacity>

                      <Text style={s.auditNotice}>
                        🔒 Permisos requeridos: pages_show_list, pages_manage_posts,
                        instagram_content_publish. En modo desarrollo requiere rol de evaluador en
                        el portal de Meta.
                      </Text>
                    </>
                  )}

                  {platformId === 'youtube' && (
                    <>
                      <Text style={s.explainer}>
                        Conecta tu canal de YouTube mediante Google OAuth 2.0 oficial para publicar
                        Shorts y videos automáticamente.
                      </Text>

                      <TouchableOpacity
                        onPress={() => handleConnect({ forceLogin: false })}
                        disabled={loading}
                        style={s.oauthBtn}
                      >
                        <LinearGradient
                          colors={['#FF0000', '#CC0000']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={s.oauthGradient}
                        >
                          <View style={s.oauthInner}>
                            {loading && loadingMode === 'normal' ? (
                              <ActivityIndicator size="small" color={C.white} />
                            ) : (
                              <YouTubeSvg size={20} />
                            )}
                            <Text style={s.oauthText}>
                              {loading && loadingMode === 'normal'
                                ? 'Abriendo Google...'
                                : 'Conectar canal de YouTube (Google)'}
                            </Text>
                          </View>
                        </LinearGradient>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => handleConnect({ forceLogin: true })}
                        disabled={loading}
                        style={s.switchAccountBtn}
                      >
                        <RefreshSvg size={14} color="#FF4444" />
                        <Text style={[s.switchAccountText, { color: '#FF4444' }]}>
                          Iniciar sesión con otra cuenta de Google
                        </Text>
                      </TouchableOpacity>

                      <Text style={s.auditNotice}>
                        🔒 Scope restringido: youtube.upload. En fase de pruebas de Google Cloud, tu
                        correo debe estar registrado en la lista de 'Usuarios de prueba' de la
                        pantalla de consentimiento.
                      </Text>
                    </>
                  )}

                  {platformId === 'whatsapp' && (
                    <>
                      <Text style={s.explainer}>
                        Alquimia utiliza el protocolo oficial de Intent de WhatsApp en tu
                        dispositivo (Ruta B). Abre la aplicación lista con tu contenido para que
                        confirmes el envío manualmente con un solo toque.
                      </Text>

                      <View style={s.waInputWrap}>
                        <Text style={s.waLabel}>Número o contacto predeterminado (opcional):</Text>
                        <TextInput
                          value={waInput}
                          onChangeText={setWaInput}
                          placeholder="+1 (829) 123-4567 o déjalo vacío para elegir chat"
                          placeholderTextColor={C.textMuted}
                          style={s.input}
                          keyboardType="phone-pad"
                          editable={!loading}
                        />
                      </View>

                      <TouchableOpacity
                        onPress={() => handleConnect()}
                        disabled={loading}
                        style={s.oauthBtn}
                      >
                        <LinearGradient
                          colors={['#25D366', '#128C7E']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={s.oauthGradient}
                        >
                          <View style={s.oauthInner}>
                            {loading ? (
                              <ActivityIndicator size="small" color={C.white} />
                            ) : (
                              <WhatsAppSvg size={20} />
                            )}
                            <Text style={s.oauthText}>
                              {loading ? 'Guardando...' : 'Activar WhatsApp en Alquimia'}
                            </Text>
                          </View>
                        </LinearGradient>
                      </TouchableOpacity>

                      <Text style={s.disclaimer}>
                        ℹ️ Transparencia total: La app reportará 'Acción requerida' para que
                        confirmes el envío en la app oficial de WhatsApp, sin reportes falsos.
                      </Text>
                    </>
                  )}
                </>
              )}
            </View>
          </View>
        </KeyboardAvoidingView>
      </BlurView>
    </Modal>
  );
}

const CORNER = 12;
const s = StyleSheet.create({
  kav: { flex: 1 },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(8,12,20,0.65)',
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
  },
  tlCorner: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: CORNER,
    height: CORNER,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderColor: C.neon,
  },
  trCorner: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: CORNER,
    height: CORNER,
    borderTopWidth: 2,
    borderRightWidth: 2,
    borderColor: C.neon,
  },
  blCorner: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: CORNER,
    height: CORNER,
    borderBottomWidth: 2,
    borderLeftWidth: 2,
    borderColor: C.neon,
  },
  brCorner: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: CORNER,
    height: CORNER,
    borderBottomWidth: 2,
    borderRightWidth: 2,
    borderColor: C.neon,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerText: { flex: 1 },
  title: {
    color: C.white,
    fontSize: 17,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  closeBtn: { padding: 4 },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 14,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FF5B5B',
    marginRight: 6,
  },
  statusText: {
    color: C.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  explainer: {
    color: C.textMuted,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 16,
  },
  auditNotice: {
    color: C.goldText,
    fontSize: 11,
    lineHeight: 16,
    backgroundColor: 'rgba(245,197,24,0.08)',
    borderLeftWidth: 2,
    borderLeftColor: C.gold,
    padding: 10,
    borderRadius: 6,
    marginTop: 14,
  },
  disclaimer: {
    color: C.textMuted,
    fontSize: 11,
    lineHeight: 15,
    marginTop: 12,
  },
  oauthBtn: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 6,
  },
  oauthGradient: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  oauthInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  oauthText: {
    color: C.white,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  switchAccountBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingVertical: 6,
    gap: 6,
  },
  switchAccountText: {
    color: '#00F2FE',
    fontSize: 12,
    fontWeight: '600',
  },
  memoryCard: {
    backgroundColor: 'rgba(0,255,212,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(0,255,212,0.2)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  memoryTitle: {
    color: C.neon,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  memoryUser: {
    color: C.white,
    fontSize: 15,
    fontWeight: '700',
    marginTop: 4,
    marginBottom: 8,
  },
  memoryBtn: {
    backgroundColor: 'rgba(0,255,212,0.15)',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  memoryBtnText: {
    color: C.neon,
    fontSize: 12,
    fontWeight: '700',
  },
  errorBox: {
    flexDirection: 'row',
    backgroundColor: C.redBg,
    borderColor: C.red,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
    alignItems: 'center',
    gap: 10,
  },
  errorTextWrap: { flex: 1 },
  errorTitle: {
    color: C.red,
    fontSize: 12,
    fontWeight: '700',
  },
  errorBody: {
    color: '#FFA8A8',
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  connectedState: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  connectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.greenBg,
    borderColor: C.green,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 12,
    gap: 8,
  },
  connectedBadgeText: {
    color: C.green,
    fontSize: 12,
    fontWeight: '800',
  },
  connectedUserText: {
    color: C.white,
    fontSize: 13,
    fontWeight: '700',
  },
  connectedSub: {
    color: C.textMuted,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  disconnectBtn: {
    borderWidth: 1,
    borderColor: 'rgba(255,91,91,0.4)',
    backgroundColor: 'rgba(255,91,91,0.08)',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    width: '100%',
  },
  disconnectText: {
    color: C.red,
    fontSize: 13,
    fontWeight: '700',
  },
  successState: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  successIcon: { marginBottom: 12 },
  successTitle: {
    color: C.white,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 6,
  },
  successSub: {
    color: C.textMuted,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  waInputWrap: {
    marginBottom: 14,
  },
  waLabel: {
    color: C.textMuted,
    fontSize: 12,
    marginBottom: 6,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 10,
    color: C.white,
    fontSize: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
});
