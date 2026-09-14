// ============================================================
// src/components/auth/ConnectAccountModal.tsx
// Modal de autenticación oficial y vinculación inteligente — Alquimia Studio
// 4 Canales Reales: Meta (Facebook + Instagram), Threads, TikTok, YouTube
// Estados visuales: disconnected, connecting, connected, error
// Redirección OAuth directa hacia /api/oauth/{plataforma}?start=1
// Titularidad y Autoría: Israel Montás
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
} from '../ui/SocialIcons';

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
  const { linkedAccounts, platformHandles, linkAccount, unlinkAccount } = useAppStore();

  const [connectingPlatform, setConnectingPlatform] = useState<string | null>(null);
  const [errorPlatform, setErrorPlatform] = useState<Record<string, string | null>>({
    meta: null,
    threads: null,
    tiktok: null,
    youtube: null,
  });

  const [sessionProfiles, setSessionProfiles] = useState<Record<string, any>>({});

  // 1. Consultar estado centralizado en servidor (/api/oauth/session) y leer query params
  useEffect(() => {
    let isMounted = true;

    async function loadSessions() {
      try {
        const res = await fetch('/api/oauth/session', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json<Record<string, { connected: boolean; profile?: any }>>();
          if (isMounted && data) {
            setSessionProfiles(data);

            if (data.meta?.connected) {
              const pages = data.meta.profile?.pages ?? [];
              const firstPage = pages[0];
              const fbName = firstPage?.name || 'Página Meta';
              linkAccount('facebook', fbName);
              if (firstPage?.instagram_business_account) {
                linkAccount('instagram', `@${firstPage.name.toLowerCase().replace(/\s+/g, '_')}`);
              }
            }
            if (data.tiktok?.connected) {
              const ttName = data.tiktok.profile?.display_name || data.tiktok.profile?.open_id || 'Usuario TikTok';
              linkAccount('tiktok', `@${ttName}`);
            }
            if (data.youtube?.connected) {
              const ytTitle = data.youtube.profile?.title || 'Canal de YouTube';
              linkAccount('youtube', ytTitle);
            }
            if (data.threads?.connected) {
              const thUser = data.threads.profile?.userId || 'Usuario Threads';
              linkAccount('threads', `@${thUser}`);
            }
          }
        }
      } catch (err) {
        console.warn('[ConnectAccountModal] No se pudo verificar la sesión:', err);
      }
    }

    loadSessions();

    // 2. Leer query params de callback (/conectar-cuentas?platform=X&status=success|error&reason=...)
    if (typeof window !== 'undefined' && window.location) {
      const params = new URLSearchParams(window.location.search);
      const cbPlatform = params.get('platform');
      const cbStatus = params.get('status');
      const cbReason = params.get('reason');

      if (cbPlatform) {
        if (cbStatus === 'success') {
          setErrorPlatform((prev) => ({ ...prev, [cbPlatform]: null }));
          loadSessions();
        } else if (cbStatus === 'error') {
          setErrorPlatform((prev) => ({
            ...prev,
            [cbPlatform]: cbReason || 'Error durante la autorización oficial.',
          }));
        }
        // Limpiar query params de la barra de direcciones sin recargar
        if (window.history && window.history.replaceState) {
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      }
    }

    return () => {
      isMounted = false;
    };
  }, []);

  // Estados calculados de conexión
  const isMetaConnected =
    Boolean(sessionProfiles.meta?.connected) ||
    linkedAccounts.has('facebook') ||
    linkedAccounts.has('instagram');

  const isThreadsConnected =
    Boolean(sessionProfiles.threads?.connected) ||
    linkedAccounts.has('threads');

  const isTikTokConnected =
    Boolean(sessionProfiles.tiktok?.connected) ||
    linkedAccounts.has('tiktok');

  const isYouTubeConnected =
    Boolean(sessionProfiles.youtube?.connected) ||
    linkedAccounts.has('youtube');

  const metaStatus: ConnectionStatus =
    connectingPlatform === 'meta'
      ? 'connecting'
      : errorPlatform.meta
      ? 'error'
      : isMetaConnected
      ? 'connected'
      : 'disconnected';

  const threadsStatus: ConnectionStatus =
    connectingPlatform === 'threads'
      ? 'connecting'
      : errorPlatform.threads
      ? 'error'
      : isThreadsConnected
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

  // ── Handlers de Redirección OAuth Directa ─────────────────────
  const handleConnect = (platform: 'meta' | 'threads' | 'tiktok' | 'youtube') => {
    setErrorPlatform((prev) => ({ ...prev, [platform]: null }));
    setConnectingPlatform(platform);

    if (typeof window !== 'undefined') {
      window.location.href = `/api/oauth/${platform}?start=1`;
    }
  };

  const handleDisconnect = async (platform: 'meta' | 'threads' | 'tiktok' | 'youtube') => {
    setConnectingPlatform(platform);
    try {
      await fetch(`/api/oauth/session?platform=${platform}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      setSessionProfiles((prev) => ({
        ...prev,
        [platform]: { connected: false },
      }));

      if (platform === 'meta') {
        unlinkAccount('facebook');
        unlinkAccount('instagram');
      } else {
        unlinkAccount(platform as PlatformId);
      }
    } catch (err) {
      console.warn('[ConnectAccountModal] Error al revocar sesión:', err);
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
                  <Text style={s.subtitle}>OAuth 2.0 Serverless con tokens protegidos en backend</Text>
                </View>
                <TouchableOpacity onPress={onClose} style={s.closeBtn}>
                  <CloseCircleSvg size={24} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollContent}>
                {/* ── BOTÓN 1: META (Facebook Pages & Instagram Business) ── */}
                <View style={s.platformCard}>
                  <View style={s.platformCardHeader}>
                    <View style={s.iconsRow}>
                      <View style={[s.iconBox, { backgroundColor: '#1877F222', borderColor: '#1877F266' }]}>
                        <FacebookSvg size={18} />
                      </View>
                      <View style={[s.iconBox, { backgroundColor: '#E1306C22', borderColor: '#E1306C66' }]}>
                        <InstagramSvg size={18} />
                      </View>
                    </View>
                    <View style={s.platformTitles}>
                      <Text style={s.platformName}>Meta</Text>
                      <Text style={s.platformDesc}>Facebook Pages & Instagram Business</Text>
                    </View>
                    {renderStatusBadge(metaStatus)}
                  </View>

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
                        onPress={() => handleDisconnect('meta')}
                        disabled={metaStatus === 'connecting'}
                        style={s.disconnectBtn}
                      >
                        <Text style={s.disconnectText}>Desvincular Meta</Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        onPress={() => handleConnect('meta')}
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
                    Graph API v21.0: instagram_basic, instagram_content_publish, pages_manage_posts
                  </Text>
                </View>

                {/* ── BOTÓN 2: THREADS (Meta Threads API v1.0) ── */}
                <View style={s.platformCard}>
                  <View style={s.platformCardHeader}>
                    <View style={[s.iconBox, { backgroundColor: '#101010', borderColor: '#FFFFFF33' }]}>
                      <ThreadsSvg size={20} />
                    </View>
                    <View style={s.platformTitles}>
                      <Text style={s.platformName}>Threads</Text>
                      <Text style={s.platformDesc}>Threads API Oficial (graph.threads.net)</Text>
                    </View>
                    {renderStatusBadge(threadsStatus)}
                  </View>

                  {isThreadsConnected && Boolean(platformHandles.threads) && (
                    <View style={s.accountInfoBox}>
                      <Text style={s.accountDetail}>
                        • Threads: <Text style={s.accountHighlight}>{platformHandles.threads}</Text>
                      </Text>
                    </View>
                  )}

                  {errorPlatform.threads && (
                    <View style={s.errorBox}>
                      <AlertCircleSvg size={14} color={C.red} />
                      <Text style={s.errorText}>{errorPlatform.threads}</Text>
                    </View>
                  )}

                  <View style={s.actionsRow}>
                    {isThreadsConnected ? (
                      <TouchableOpacity
                        onPress={() => handleDisconnect('threads')}
                        disabled={threadsStatus === 'connecting'}
                        style={s.disconnectBtn}
                      >
                        <Text style={s.disconnectText}>Desvincular Threads</Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        onPress={() => handleConnect('threads')}
                        disabled={threadsStatus === 'connecting'}
                        style={s.connectBtn}
                      >
                        <LinearGradient
                          colors={['#333333', '#111111']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={s.btnGradient}
                        >
                          <Text style={s.btnText}>Conectar Threads</Text>
                        </LinearGradient>
                      </TouchableOpacity>
                    )}
                  </View>

                  <Text style={s.scopeNote}>
                    Scopes: threads_basic, threads_content_publish (Requiere Tech Provider Verification)
                  </Text>
                </View>

                {/* ── BOTÓN 3: TIKTOK ── */}
                <View style={s.platformCard}>
                  <View style={s.platformCardHeader}>
                    <View style={[s.iconBox, { backgroundColor: '#00F2FE22', borderColor: '#00F2FE66' }]}>
                      <TikTokSvg size={20} />
                    </View>
                    <View style={s.platformTitles}>
                      <Text style={s.platformName}>TikTok</Text>
                      <Text style={s.platformDesc}>Content Posting API v2 (Direct Post)</Text>
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
                        onPress={() => handleDisconnect('tiktok')}
                        disabled={tiktokStatus === 'connecting'}
                        style={s.disconnectBtn}
                      >
                        <Text style={s.disconnectText}>Desvincular TikTok</Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        onPress={() => handleConnect('tiktok')}
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
                    OAuth v2 con PKCE: user.info.basic, video.publish, video.upload
                  </Text>
                </View>

                {/* ── BOTÓN 4: YOUTUBE ── */}
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
                        onPress={() => handleDisconnect('youtube')}
                        disabled={youtubeStatus === 'connecting'}
                        style={s.disconnectBtn}
                      >
                        <Text style={s.disconnectText}>Desvincular YouTube</Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        onPress={() => handleConnect('youtube')}
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
                    Scope: https://www.googleapis.com/auth/youtube.upload (Offline access)
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

const s = StyleSheet.create({
  kav: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    width: '100%',
  },
  card: {
    width: '100%',
    maxWidth: 500,
    backgroundColor: C.bgCard,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.neonBorder,
    padding: 22,
    position: 'relative',
    maxHeight: '90%',
  },
  tlCorner: {
    position: 'absolute',
    top: -2,
    left: -2,
    width: 14,
    height: 14,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderColor: C.neon,
    borderTopLeftRadius: 4,
  },
  trCorner: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 14,
    height: 14,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderColor: C.neon,
    borderTopRightRadius: 4,
  },
  blCorner: {
    position: 'absolute',
    bottom: -2,
    left: -2,
    width: 14,
    height: 14,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderColor: C.neon,
    borderBottomLeftRadius: 4,
  },
  brCorner: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 14,
    height: 14,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderColor: C.neon,
    borderBottomRightRadius: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    paddingBottom: 14,
  },
  headerText: {
    flex: 1,
    marginRight: 10,
  },
  title: {
    color: C.white,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  subtitle: {
    color: C.textMuted,
    fontSize: 12,
    marginTop: 4,
    lineHeight: 16,
  },
  closeBtn: {
    padding: 4,
  },
  scrollContent: {
    gap: 14,
    paddingBottom: 8,
  },
  platformCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.cardBorder,
    padding: 14,
    gap: 10,
  },
  platformCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  platformTitles: {
    flex: 1,
    marginLeft: 10,
  },
  platformName: {
    color: C.white,
    fontSize: 15,
    fontWeight: '700',
  },
  platformDesc: {
    color: C.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  badgeConnected: {
    backgroundColor: C.greenBg,
  },
  badgeConnectedText: {
    color: C.green,
    fontSize: 11,
    fontWeight: '700',
  },
  badgeConnecting: {
    backgroundColor: C.neonDim,
  },
  badgeConnectingText: {
    color: C.neon,
    fontSize: 11,
    fontWeight: '600',
  },
  badgeError: {
    backgroundColor: C.redBg,
  },
  badgeErrorText: {
    color: C.red,
    fontSize: 11,
    fontWeight: '700',
  },
  badgeDisconnected: {
    backgroundColor: 'rgba(255,255,255,0.06)',
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
    fontWeight: '600',
  },
  accountInfoBox: {
    backgroundColor: 'rgba(0,255,127,0.04)',
    borderRadius: 8,
    padding: 8,
    borderLeftWidth: 2,
    borderLeftColor: C.green,
    gap: 3,
  },
  accountDetail: {
    color: C.white,
    fontSize: 12,
  },
  accountHighlight: {
    color: C.green,
    fontWeight: '700',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.redBg,
    borderRadius: 8,
    padding: 8,
    gap: 6,
  },
  errorText: {
    color: C.red,
    fontSize: 11,
    flex: 1,
  },
  actionsRow: {
    marginTop: 2,
  },
  connectBtn: {
    borderRadius: 10,
    overflow: 'hidden',
  },
  btnGradient: {
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  btnText: {
    color: C.white,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  disconnectBtn: {
    backgroundColor: 'rgba(255,91,91,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,91,91,0.3)',
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: 'center',
  },
  disconnectText: {
    color: C.red,
    fontSize: 12,
    fontWeight: '600',
  },
  scopeNote: {
    color: 'rgba(255,255,255,0.25)',
    fontSize: 9,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginTop: 2,
  },
});