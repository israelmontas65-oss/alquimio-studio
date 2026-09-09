// ============================================================
// app/oauth/tiktok.tsx
// Pantalla de Callback oficial para OAuth 2.0 de TikTok
// Gestiona el retorno de login.tiktok.com tanto en Web/PWA como en móvil nativo
// ============================================================

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { handleAuthCallback } from '../../src/services/tiktokAuthService';
import { TikTokSvg } from '../../src/components/ui/SocialIcons';

const C = {
  bg: '#080C14',
  card: '#0D1424',
  neon: '#00FFD4',
  gold: '#F5C518',
  white: '#FFFFFF',
  textMuted: '#8EA3BF',
  red: '#FF5B5B',
  green: '#00FF7F',
};

export default function TikTokOAuthCallbackScreen() {
  const params = useLocalSearchParams<{
    code?: string;
    state?: string;
    error?: string;
    error_description?: string;
  }>();
  const router = useRouter();

  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('Verificando credenciales oficiales de TikTok...');
  const [userHandle, setUserHandle] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function processOAuth() {
      // 1. Manejo de error o cancelación por parte del usuario
      if (params.error) {
        const errorDesc = params.error_description || 'El usuario canceló o denegó la autorización.';
        if (isMounted) {
          setStatus('error');
          setMessage(`Autorización cancelada: ${errorDesc}`);
        }

        // Notificar a ventana padre si se abrió en popup
        if (Platform.OS === 'web' && typeof window !== 'undefined' && window.opener) {
          window.opener.postMessage(
            { type: 'TIKTOK_AUTH_ERROR', error: params.error, description: errorDesc },
            '*'
          );
          setTimeout(() => {
            window.close();
          }, 1500);
        }
        return;
      }

      // 2. Si no hay código de autorización
      if (!params.code) {
        if (isMounted) {
          setStatus('error');
          setMessage('No se recibió el código de autorización desde TikTok.');
        }
        return;
      }

      // 3. Procesar intercambio de código por tokens y perfil
      try {
        if (isMounted) {
          setMessage('Conectando con TikTok y obteniendo perfil...');
        }

        const result = await handleAuthCallback(params.code, params.state || '');

        if (isMounted) {
          setStatus('success');
          setUserHandle(result.handle);
          setMessage(`¡Cuenta ${result.handle} vinculada con éxito!`);
        }

        // Si fue una ventana popup, enviar mensaje a la app principal y cerrar
        if (Platform.OS === 'web' && typeof window !== 'undefined' && window.opener) {
          window.opener.postMessage(
            { type: 'TIKTOK_AUTH_SUCCESS', handle: result.handle, user: result.user },
            '*'
          );
          setTimeout(() => {
            window.close();
          }, 1200);
          return;
        }

        // Si fue redirección directa (PWA instalada o móvil), volver al inicio
        setTimeout(() => {
          router.replace('/');
        }, 1500);
      } catch (err: unknown) {
        const errStr = err instanceof Error ? err.message : 'Error desconocido al autorizar TikTok.';
        if (isMounted) {
          setStatus('error');
          setMessage(errStr);
        }

        if (Platform.OS === 'web' && typeof window !== 'undefined' && window.opener) {
          window.opener.postMessage({ type: 'TIKTOK_AUTH_ERROR', error: errStr }, '*');
          setTimeout(() => {
            window.close();
          }, 2500);
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
        {/* Glow & Icon */}
        <View style={s.iconWrap}>
          <TikTokSvg size={44} />
        </View>

        <Text style={s.title}>Alquimia Studio</Text>
        <Text style={s.subtitle}>Integración Oficial TikTok API v2</Text>

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
                <Text style={[s.badgeText, { color: C.green }]}>✓ CONEXIÓN EXITOSA</Text>
              </View>
              <Text style={s.handleText}>{userHandle}</Text>
              <Text style={s.subText}>Redirigiendo a la consola de publicación...</Text>
            </>
          )}

          {status === 'error' && (
            <>
              <View style={[s.badge, { backgroundColor: 'rgba(255,91,91,0.1)', borderColor: C.red }]}>
                <Text style={[s.badgeText, { color: C.red }]}>✕ ERROR DE AUTORIZACIÓN</Text>
              </View>
              <Text style={s.errorText}>{message}</Text>
              <TouchableOpacity
                style={s.returnBtn}
                onPress={() => router.replace('/')}
                activeOpacity={0.8}
              >
                <Text style={s.returnBtnText}>Volver a Alquimia</Text>
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
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: C.card,
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,255,212,0.3)',
    shadowColor: C.neon,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 15,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  title: {
    color: C.white,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  subtitle: {
    color: C.textMuted,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 4,
    marginBottom: 24,
  },
  statusContainer: {
    width: '100%',
    alignItems: 'center',
  },
  spinner: {
    marginVertical: 14,
  },
  statusText: {
    color: C.white,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  handleText: {
    color: C.gold,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  subText: {
    color: C.textMuted,
    fontSize: 13,
    textAlign: 'center',
  },
  errorText: {
    color: '#FF8080',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  returnBtn: {
    backgroundColor: 'rgba(0,255,212,0.12)',
    borderColor: C.neon,
    borderWidth: 1,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  returnBtnText: {
    color: C.neon,
    fontSize: 14,
    fontWeight: '700',
  },
});
