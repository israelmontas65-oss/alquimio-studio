// ============================================================
// src/components/auth/ConnectAccountModal.tsx
// Modal de autenticación oficial y vinculación inteligente — Alquimia Studio
// 3 Canales Reales: Meta (Facebook + Instagram + Threads), TikTok, YouTube
// Estados visuales: disconnected, connecting, connected, error
// ============================================================

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppStore } from '../../store/useAppStore';
import type { PlatformId } from '../../types/platform.types';
import {
  TikTokSvg,
  InstagramSvg,
  YouTubeSvg,
  ThreadsSvg,
  FacebookSvg,
  CloseCircleSvg,
  CheckmarkCircleSvg,
  AlertCircleSvg,
  RefreshSvg,
} from '../ui/SocialIcons';
import { initiateTikTokOAuth, disconnectTikTok } from '../../services/tiktokAuthService';
import { initiateMetaOAuth, disconnectMeta } from '../../services/metaAuthService';
import { initiateYouTubeOAuth, disconnectYouTube } from '../../services/youtubeAuthService';

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
  cardBorder: 'rgba(255,255,255,0.1)',
};

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

interface Props {
  platformId?: PlatformId | null;
  onClose: () => void;
}

export function ConnectAccountModal({ platformId, onClose }: Props) {
  const { linkedAccounts, platformHandles } = useAppStore();

  // Estados visuales independientes por plataforma: disconnected | connecting | connected | error
  const [connectingPlatform, setConnectingPlatform] = useState<string | null>(null);
  const [errorPlatform, setErrorPlatform] = useState<Record<string, string | null>>({
    meta: null,
    tiktok: null,
    youtube: null,
  });

  // Estados calculados de conexión
  const isMetaConnected =
    linkedAccounts.has('facebook') ||
    linkedAccounts.has('instagram') ||
    linkedAccounts.has('threads');
  const isTikTokConnected = linkedAccounts.has('tiktok');
  const isYouTubeConnected = linkedAccounts.has('youtube');

  const metaStatus: ConnectionStatus =
    connectingPlatform === 'meta'
      ? 'connecting'
      : errorPlatform.meta
      ? 'error'
      : isMetaConnected
      ? 'connected'
      : 'disconnected';

  const tiktokStatus: ConnectionStatus =
    connectingPlatform === 'tiktok'
      ? 'connecting'
      : errorPlatform.tiktok
      ? 'error'
      : isTikTokConnected
      ? 'connected'
      : 'disconnected';

  const youtubeStatus: ConnectionStatus =
    connectingPlatform === 'youtube'
      ? 'connecting'
      : errorPlatform.youtube
      ? 'error'
      : isYouTubeConnected
      ? 'connected'
      : 'disconnected';

  // Escuchar mensajes de popup OAuth en Web
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;

    const handleMessage = (event: MessageEvent) => {
      const type = event.data?.type;

      if (type === 'META_AUTH_SUCCESS') {
        setConnectingPlatform(null);
        setErrorPlatform((prev) => ({ ...prev, meta: null }));
      } else if (type === 'TIKTOK_AUTH_SUCCESS') {
        setConnectingPlatform(null);
        setErrorPlatform((prev) => ({ ...prev, tiktok: null }));
      } else if (type === 'YOUTUBE_AUTH_SUCCESS') {
        setConnectingPlatform(null);
        setErrorPlatform((prev) => ({ ...prev, youtube: null }));
      } else if (type === 'META_AUTH_ERROR') {
        setConnectingPlatform(null);
        setErrorPlatform((prev) => ({
          ...prev,
          meta: event.data?.description || event.data?.error || 'Error al autorizar con Meta.',
        }));
      } else if (type === 'TIKTOK_AUTH_ERROR') {
        setConnectingPlatform(null);
        setErrorPlatform((prev) => ({
          ...prev,
          tiktok: event.data?.description || event.data?.error || 'Error al autorizar con TikTok.',
        }));
      } else if (type === 'YOUTUBE_AUTH_ERROR') {
        setConnectingPlatform(null);
        setErrorPlatform((prev) => ({
          ...prev,
          youtube: event.data?.description || event.data?.error || 'Error al autorizar con Google/YouTube.',
        }));
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // ── Handlers de Conexión ──────────────────────────────────────
  const handleConnectMeta = async (forceLogin = false) => {
    setErrorPlatform((prev) => ({ ...prev, meta: null }));
    setConnectingPlatform('meta');
    try {
      await initiateMetaOAuth({ forceLogin });
    } catch (err: unknown) {
      setConnectingPlatform(null);
      const msg = err instanceof Error ? err.message : 'Error al conectar con Meta.';
      setErrorPlatform((prev) => ({ ...prev, meta: msg }));
    }
  };

  const handleDisconnectMeta = async () => {
    setConnectingPlatform('meta');
    try {
      await disconnectMeta();
    } finally {
      setConnectingPlatform(null);
    }
  };

  const handleConnectTikTok = async (forceLogin = false) => {
    setErrorPlatform((prev) => ({ ...prev, tiktok: null }));
    setConnectingPlatform('tiktok');
    try {
      await initiateTikTokOAuth({ forceLogin });
    } catch (err: unknown) {
      setConnectingPlatform(null);
      const msg = err instanceof Error ? err.message : 'Error al conectar con TikTok.';
      setErrorPlatform((prev) => ({ ...prev, tiktok: msg }));
    }
  };

  const handleDisconnectTikTok = async () => {
    setConnectingPlatform('tiktok');
    try {
      await disconnectTikTok();
    } finally {
      setConnectingPlatform(null);
    }
  };

  const handleConnectYouTube = async (forceLogin = false) => {
    setErrorPlatform((prev) => ({ ...prev, youtube: null }));
    setConnectingPlatform('youtube');
    try {
      await initiateYouTubeOAuth({ forceLogin });
    } catch (err: unknown) {
      setConnectingPlatform(null);
      const msg = err instanceof Error ? err.message : 'Error al conectar con YouTube.';
      setErrorPlatform((prev) => ({ ...prev, youtube: msg }));
    }
  };

  const handleDisconnectYouTube = async () => {
    setConnectingPlatform('youtube');
    try {
      await disconnectYouTube();
    } finally {
      setConnectingPlatform(null);
    }
  };

  const renderStatusBadge = (status: ConnectionStatus) => {
    switch (status) {
      case 'connected':
        return (
          <View style={[s.badge, s.badgeConnected]}>
            <CheckmarkCircleSvg size={13} color={C.green} />
            <Text style={s.badgeConnectedText}>Conectado</Text>
          </View>
        );
      case 'connecting':
        return (
          <View style={[s.badge, s.badgeConnecting]}>
            <ActivityIndicator size="small" color={C.neon} />
            <Text style={s.badgeConnectingText}>Conectando...</Text>
          </View>
        );
      case 'error':
        return (
          <View style={[s.badge, s.badgeError]}>
            <AlertCircleSvg size={13} color={C.red} />
            <Text style={s.badgeErrorText}>Error</Text>
          </View>
        );
      default:
        return (
          <View style={[s.badge, s.badgeDisconnected]}>
            <View style={s.dotDisconnected} />
            <Text style={s.badgeDisconnectedText}>Desconectado</Text>
          </View>
        );
    }
  };

  return (
    <Modal visible={true} transparent animationType="slide">
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
                <View style={s.headerText}>
                  <Text style={s.title}>Vincular Cuentas Oficiales</Text>
                  <Text style={s.subtitle}>Autenticación OAuth 2.0 con tokens cifrados en servidor</Text>
                </View>
                <TouchableOpacity onPress={onClose} style={s.closeBtn}>
                  <CloseCircleSvg size={24} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollContent}>
                {/* ── BOTÓN 1: META (Facebook + Instagram + Threads) ── */}
                <View style={s.platformCard}>
                  <View style={s.platformCardHeader}>
                    <View style={s.iconsRow}>
                      <View style={[s.iconBox, { backgroundColor: '#1877F222', borderColor: '#1877F266' }]}>
                        <FacebookSvg size={18} />
                      </View>
                      <View style={[s.iconBox, { backgroundColor: '#E1306C22', borderColor: '#E1306C66' }]}>
                        <InstagramSvg size={18} />
                      </View>
                      <View style={[s.iconBox, { backgroundColor: '#FFFFFF15', borderColor: '#FFFFFF44' }]}>
                        <ThreadsSvg size={18} />
                      </View>
                    </View>
                    <View style={s.platformTitles}>
                      <Text style={s.platformName}>Meta</Text>
                      <Text style={s.platformDesc}>Facebook Pages, Instagram Business & Threads</Text>
                    </View>
                    {renderStatusBadge(metaStatus)}
                  </View>

                  {/* Cuentas vinculadas si está conectada */}
                  {isMetaConnected && (
                    <View style={s.accountInfoBox}>
                      {Boolean(platformHandles.facebook) && (
                        <Text style={s.accountDetail}>
                          • Facebook: <Text style={s.accountHighlight}>{platformHandles.facebook}</Text>
                        </Text>
                      )}
                      {Boolean(platformHandles.instagram) && (
                        <Text style={s.accountDetail}>
                          • Instagram: <Text style={s.accountHighlight}>{platformHandles.instagram}</Text>
                        </Text>
                      )}
                      {Boolean(platformHandles.threads) && (
                        <Text style={s.accountDetail}>
                          • Threads: <Text style={s.accountHighlight}>{platformHandles.threads}</Text>
                        </Text>
                      )}
                    </View>
                  )}

                  {errorPlatform.meta && (
                    <View style={s.errorBox}>
                      <AlertCircleSvg size={14} color={C.red} />
                      <Text style={s.errorText}>{errorPlatform.meta}</Text>
                    </View>
                  )}

                  <View style={s.actionsRow}>
                    {isMetaConnected ? (
                      <TouchableOpacity
                        onPress={handleDisconnectMeta}
                        disabled={metaStatus === 'connecting'}
                        style={s.disconnectBtn}
                      >
                        <Text style={s.disconnectText}>Desvincular Meta</Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        onPress={() => handleConnectMeta(false)}
                        disabled={metaStatus === 'connecting'}
                        style={s.connectBtn}
                      >
                        <LinearGradient
                          colors={['#1877F2', '#0A58CA']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={s.btnGradient}
                        >
                          <Text style={s.btnText}>Conectar Meta</Text>
                        </LinearGradient>
                      </TouchableOpacity>
                    )}
                  </View>

                  <Text style={s.scopeNote}>
                    Scopes: instagram_basic, instagram_content_publish, pages_show_list, pages_manage_posts, pages_read_engagement, business_management
                  </Text>
                </View>

                {/* ── BOTÓN 2: TIKTOK ── */}
                <View style={s.platformCard}>
                  <View style={s.platformCardHeader}>
                    <View style={[s.iconBox, { backgroundColor: '#00F2FE22', borderColor: '#00F2FE66' }]}>
                      <TikTokSvg size={20} />
                    </View>
                    <View style={s.platformTitles}>
                      <Text style={s.platformName}>TikTok</Text>
                      <Text style={s.platformDesc}>TikTok Content Posting API v2 (Direct Post)</Text>
                    </View>
                    {renderStatusBadge(tiktokStatus)}
                  </View>

                  {isTikTokConnected && Boolean(platformHandles.tiktok) && (
                    <View style={s.accountInfoBox}>
                      <Text style={s.accountDetail}>
                        • Cuenta: <Text style={s.accountHighlight}>{platformHandles.tiktok}</Text>
                      </Text>
                    </View>
                  )}

                  {errorPlatform.tiktok && (
                    <View style={s.errorBox}>
                      <AlertCircleSvg size={14} color={C.red} />
                      <Text style={s.errorText}>{errorPlatform.tiktok}</Text>
                    </View>
                  )}

                  <View style={s.actionsRow}>
                    {isTikTokConnected ? (
                      <TouchableOpacity
                        onPress={handleDisconnectTikTok}
                        disabled={tiktokStatus === 'connecting'}
                        style={s.disconnectBtn}
                      >
                        <Text style={s.disconnectText}>Desvincular TikTok</Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        onPress={() => handleConnectTikTok(false)}
                        disabled={tiktokStatus === 'connecting'}
                        style={s.connectBtn}
                      >
                        <LinearGradient
                          colors={['#00F2FE', '#4FACFE']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={s.btnGradient}
                        >
                          <Text style={s.btnText}>Conectar TikTok</Text>
                        </LinearGradient>
                      </TouchableOpacity>
                    )}
                  </View>

                  <Text style={s.scopeNote}>
                    Scopes: user.info.basic, video.publish, video.upload (Redirect HTTPS obligatorio)
                  </Text>
                </View>

                {/* ── BOTÓN 3: YOUTUBE ── */}
                <View style={s.platformCard}>
                  <View style={s.platformCardHeader}>
                    <View style={[s.iconBox, { backgroundColor: '#FF000022', borderColor: '#FF000066' }]}>
                      <YouTubeSvg size={20} />
                    </View>
                    <View style={s.platformTitles}>
                      <Text style={s.platformName}>YouTube</Text>
                      <Text style={s.platformDesc}>Google OAuth 2.0 & YouTube Data API v3</Text>
                    </View>
                    {renderStatusBadge(youtubeStatus)}
                  </View>

                  {isYouTubeConnected && Boolean(platformHandles.youtube) && (
                    <View style={s.accountInfoBox}>
                      <Text style={s.accountDetail}>
                        • Canal: <Text style={s.accountHighlight}>{platformHandles.youtube}</Text>
                      </Text>
                    </View>
                  )}

                  {errorPlatform.youtube && (
                    <View style={s.errorBox}>
                      <AlertCircleSvg size={14} color={C.red} />
                      <Text style={s.errorText}>{errorPlatform.youtube}</Text>
                    </View>
                  )}

                  <View style={s.actionsRow}>
                    {isYouTubeConnected ? (
                      <TouchableOpacity
                        onPress={handleDisconnectYouTube}
                        disabled={youtubeStatus === 'connecting'}
                        style={s.disconnectBtn}
                      >
                        <Text style={s.disconnectText}>Desvincular YouTube</Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        onPress={() => handleConnectYouTube(false)}
                        disabled={youtubeStatus === 'connecting'}
                        style={s.connectBtn}
                      >
                        <LinearGradient
                          colors={['#FF0000', '#CC0000']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={s.btnGradient}
                        >
                          <Text style={s.btnText}>Conectar YouTube</Text>
                        </LinearGradient>
                      </TouchableOpacity>
                    )}
                  </View>

                  <Text style={s.scopeNote}>
                    Scope: https://www.googleapis.com/auth/youtube.upload (Subida reanudable)
                  </Text>
                </View>
              </ScrollView>
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
    padding: 20,
    paddingBottom: 32,
    maxHeight: '90%',
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
  headerText: { flex: 1 },
  title: {
    color: C.white,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  subtitle: {
    color: C.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: { padding: 4 },
  scrollContent: {
    gap: 14,
    paddingBottom: 16,
  },
  platformCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: C.cardBorder,
    borderRadius: 14,
    padding: 14,
  },
  platformCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconsRow: {
    flexDirection: 'row',
    gap: 4,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  platformTitles: { flex: 1 },
  platformName: {
    color: C.white,
    fontSize: 15,
    fontWeight: '700',
  },
  platformDesc: {
    color: C.textMuted,
    fontSize: 11,
    marginTop: 1,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  badgeConnected: {
    backgroundColor: C.greenBg,
    borderColor: C.green,
    borderWidth: 1,
  },
  badgeConnectedText: {
    color: C.green,
    fontSize: 11,
    fontWeight: '700',
  },
  badgeConnecting: {
    backgroundColor: C.neonDim,
    borderColor: C.neon,
    borderWidth: 1,
  },
  badgeConnectingText: {
    color: C.neon,
    fontSize: 11,
    fontWeight: '600',
  },
  badgeError: {
    backgroundColor: C.redBg,
    borderColor: C.red,
    borderWidth: 1,
  },
  badgeErrorText: {
    color: C.red,
    fontSize: 11,
    fontWeight: '700',
  },
  badgeDisconnected: {
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  dotDisconnected: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: C.textMuted,
  },
  badgeDisconnectedText: {
    color: C.textMuted,
    fontSize: 11,
  },
  accountInfoBox: {
    backgroundColor: 'rgba(0,255,212,0.04)',
    borderLeftWidth: 2,
    borderLeftColor: C.neon,
    padding: 8,
    borderRadius: 6,
    marginTop: 10,
    gap: 2,
  },
  accountDetail: {
    color: C.textMuted,
    fontSize: 11,
  },
  accountHighlight: {
    color: C.white,
    fontWeight: '700',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: C.redBg,
    borderColor: C.red,
    borderWidth: 1,
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
  },
  errorText: {
    color: '#FFA8A8',
    fontSize: 11,
    flex: 1,
  },
  actionsRow: {
    marginTop: 12,
  },
  connectBtn: {
    borderRadius: 10,
    overflow: 'hidden',
  },
  btnGradient: {
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  btnText: {
    color: C.white,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  disconnectBtn: {
    borderWidth: 1,
    borderColor: 'rgba(255,91,91,0.4)',
    backgroundColor: 'rgba(255,91,91,0.08)',
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: 'center',
  },
  disconnectText: {
    color: C.red,
    fontSize: 12,
    fontWeight: '700',
  },
  scopeNote: {
    color: 'rgba(255,255,255,0.25)',
    fontSize: 9,
    marginTop: 6,
    fontFamily: Platform.OS === 'web' ? 'monospace' : undefined,
  },
});
