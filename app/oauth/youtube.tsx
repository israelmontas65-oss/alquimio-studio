// ============================================================
// app/oauth/youtube.tsx
// Pantalla de Callback oficial para Google OAuth 2.0 (YouTube Data API v3)
// Gestiona el retorno de accounts.google.com en Web/PWA y en móvil nativo
// ============================================================

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { handleYouTubeAuthCallback } from '../../src/services/youtubeAuthService';
import { YouTubeSvg } from '../../src/components/ui/SocialIcons';

const C = {
  bg: '#080C14',
  card: '#0D1424',
  neon: '#00FFD4',
  gold: '#F5C518',
  white: '#FFFFFF',
  textMuted: '#8EA3BF',
  red: '#FF5B5B',
  green: '#00FF7F',
  ytRed: '#FF0000',
};

export default function YouTubeOAuthCallbackScreen() {
  const params = useLocalSearchParams<{
    code?: string;
    state?: string;
    error?: string;
    error_description?: string;
  }>();
  const router = useRouter();

  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('Verificando credenciales oficiales de Google...');
  const [channelTitle, setChannelTitle] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function processOAuth() {
      if (params.error) {
        const errorDesc = params.error_description || 'El usuario canceló la autorización de Google.';
        if (isMounted) {
          setStatus('error');
          setMessage(`Autorización cancelada: ${errorDesc}`);
        }
        if (Platform.OS === 'web' && typeof window !== 'undefined' && window.opener) {
          window.opener.postMessage(
            { type: 'YOUTUBE_AUTH_ERROR', error: params.error, description: errorDesc },
            '*'
          );
          setTimeout(() => window.close(), 1500);
        }
        return;
      }

      if (!params.code) {
        if (isMounted) {
          setStatus('error');
          setMessage('No se recibió el código de autorización desde Google.');
        }
        return;
      }

      try {
        if (isMounted) {
          setMessage('Conectando canal de YouTube y guardando credenciales...');
        }

        const result = await handleYouTubeAuthCallback(params.code, params.state || '');

        if (isMounted) {
          setStatus('success');
          setChannelTitle(result.displayName);
          setMessage(`¡Canal ${result.displayName} vinculado con éxito!`);
        }

        if (Platform.OS === 'web' && typeof window !== 'undefined' && window.opener) {
          window.opener.postMessage(
            { type: 'YOUTUBE_AUTH_SUCCESS', channel: result.displayName },
            '*'
          );
          setTimeout(() => window.close(), 1200);
          return;
        }

        setTimeout(() => {
          router.replace('/');
        }, 1500);
      } catch (err: unknown) {
        const errStr = err instanceof Error ? err.message : 'Error al autorizar con YouTube.';
        if (isMounted) {
          setStatus('error');
          setMessage(errStr);
        }
        if (Platform.OS === 'web' && typeof window !== 'undefined' && window.opener) {
          window.opener.postMessage({ type: 'YOUTUBE_AUTH_ERROR', error: errStr }, '*');
          setTimeout(() => window.close(), 2500);
        }
      }
    }

    processOAuth();

    return () => {
      isMounted = false;
    };
  }, [params.code, params.state, params.error, params.error_description, router]);

  return (
    <View style={s.container}>
      <View style={s.card}>
        <View style={s.iconWrap}>
          <YouTubeSvg size={42} />
        </View>

        <Text style={s.title}>Alquimia Studio</Text>
        <Text style={s.subtitle}>Integración Oficial YouTube Data API v3</Text>

        <View style={s.statusContainer}>
          {status === 'processing' && (
            <>
              <ActivityIndicator size="large" color={C.neon} style={s.spinner} />
              <Text style={s.statusText}>{message}</Text>
            </>
          )}

          {status === 'success' && (
            <>
              <View style={[s.badge, { backgroundColor: 'rgba(0,255,127,0.1)', borderColor: C.green }]}>
                <Text style={[s.badgeText, { color: C.green }]}>✓ CANAL VINCULADO</Text>
              </View>
              <Text style={s.handleText}>{channelTitle}</Text>
              <Text style={s.subText}>Redirigiendo a Alquimia...</Text>
            </>
          )}

          {status === 'error' && (
            <>
              <View style={[s.badge, { backgroundColor: 'rgba(255,91,91,0.1)', borderColor: C.red }]}>
                <Text style={[s.badgeText, { color: C.red }]}>✕ ERROR DE AUTORIZACIÓN</Text>
              </View>
              <Text style={s.errorText}>{message}</Text>
              <TouchableOpacity style={s.retryBtn} onPress={() => router.replace('/')}>
                <Text style={s.retryBtnText}>Volver a Alquimia</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: C.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,255,212,0.3)',
    padding: 32,
    alignItems: 'center',
    maxWidth: 440,
    width: '100%',
  },
  iconWrap: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(255,0,0,0.1)',
    borderWidth: 1.5,
    borderColor: '#FF0000',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    color: C.white,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  subtitle: {
    color: C.gold,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 4,
    marginBottom: 24,
  },
  statusContainer: {
    alignItems: 'center',
    width: '100%',
  },
  spinner: {
    marginBottom: 16,
  },
  statusText: {
    color: C.textMuted,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  badge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 14,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
  handleText: {
    color: C.white,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  subText: {
    color: C.textMuted,
    fontSize: 12,
    marginTop: 10,
  },
  errorText: {
    color: '#FFA8A8',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 18,
    lineHeight: 18,
  },
  retryBtn: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  retryBtnText: {
    color: C.white,
    fontSize: 13,
    fontWeight: '600',
  },
});
