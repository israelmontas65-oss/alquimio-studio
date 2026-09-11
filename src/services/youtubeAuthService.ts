// ============================================================
// src/services/youtubeAuthService.ts
// Servicio de autenticación oficial Google OAuth 2.0 para YouTube Data API v3
// Soporta acceso offline y auto-renovación de tokens de acceso
// ============================================================

import { Platform } from 'react-native';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import { saveToken, getToken, removeToken } from '../auth/tokenManager';
import { useAppStore } from '../store/useAppStore';

const YOUTUBE_STATE_KEY = 'alquimia_youtube_oauth_state';
const LAST_ACCOUNT_YT_KEY = 'last_account_youtube';

export function getYouTubeRedirectUri(): string {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return `${window.location.origin}/oauth/youtube`;
  }
  return 'alquimia://oauth/youtube';
}

async function saveYouTubeOAuthState(state: string): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof localStorage !== 'undefined') localStorage.setItem(YOUTUBE_STATE_KEY, state);
    if (typeof sessionStorage !== 'undefined') sessionStorage.setItem(YOUTUBE_STATE_KEY, state);
  } else {
    await SecureStore.setItemAsync(YOUTUBE_STATE_KEY, state);
  }
}

export async function getLastYouTubeAccount(): Promise<string | undefined> {
  try {
    if (Platform.OS === 'web') {
      if (typeof localStorage !== 'undefined') {
        return localStorage.getItem(LAST_ACCOUNT_YT_KEY) || undefined;
      }
    } else {
      const val = await SecureStore.getItemAsync(LAST_ACCOUNT_YT_KEY);
      return val || undefined;
    }
  } catch {
    // Ignorar si el almacenamiento no está disponible
  }
  return undefined;
}

export async function initiateYouTubeOAuth(options?: { forceLogin?: boolean }): Promise<void> {
  const redirectUri = getYouTubeRedirectUri();
  const forceLogin = options?.forceLogin === true;
  const isWebEnvironment = Platform.OS === 'web' && typeof window !== 'undefined';

  let authorizationUrl = '';
  let serverState = '';

  try {
    const res = await axios.get<{
      data?: { authorizationUrl: string; clientId: string; state: string };
      error?: { message: string };
    }>('/api/youtube/auth-url', {
      params: {
        redirect_uri: redirectUri,
        force_login: forceLogin ? 'true' : 'false',
      },
    });

    if (res.data?.data?.authorizationUrl) {
      authorizationUrl = res.data.data.authorizationUrl;
      serverState = res.data.data.state;
    }
  } catch (err: unknown) {
    console.warn('[YouTubeAuthService] Fallo al consultar /api/youtube/auth-url:', err);
  }

  if (!authorizationUrl) {
    const clientId = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || '';
    if (!clientId) {
      throw new Error('Falta configurar GOOGLE_CLIENT_ID en Cloudflare Pages.');
    }
    serverState = `yt_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly',
      access_type: 'offline',
      prompt: forceLogin ? 'select_account consent' : 'consent',
      state: serverState,
    });
    authorizationUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  await saveYouTubeOAuthState(serverState);

  // Móvil nativo
  if (!isWebEnvironment) {
    const authResult = await WebBrowser.openAuthSessionAsync(authorizationUrl, redirectUri);
    if (authResult.type === 'success' && authResult.url) {
      const queryIdx = authResult.url.indexOf('?');
      if (queryIdx !== -1) {
        const query = authResult.url.slice(queryIdx + 1);
        const params = new URLSearchParams(query);
        const code = params.get('code');
        const state = params.get('state');
        if (code) {
          await handleYouTubeAuthCallback(code, state || serverState);
          return;
        }
      }
      throw new Error('No se recibió código de autorización de Google.');
    } else if (authResult.type === 'cancel' || authResult.type === 'dismiss') {
      throw new Error('Autorización cancelada por el usuario.');
    } else {
      throw new Error('No se pudo completar la conexión con YouTube.');
    }
  }

  // Web / PWA: Redirección directa
  if (typeof window !== 'undefined') {
    window.location.href = authorizationUrl;
  }
}

export async function handleYouTubeAuthCallback(code: string, state: string): Promise<{
  displayName: string;
  channelId?: string;
}> {
  const redirectUri = getYouTubeRedirectUri();

  const res = await axios.post<{
    data?: {
      accessToken: string;
      refreshToken?: string;
      expiresAt: number;
      channel?: { id: string; title: string; customUrl: string };
      displayName: string;
    };
    error?: { message: string };
  }>('/api/youtube/token', {
    code,
    state,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  });

  if (res.data.error || !res.data.data) {
    throw new Error(res.data.error?.message || 'Error al canjear credenciales de YouTube.');
  }

  const { accessToken, refreshToken, expiresAt, channel, displayName } = res.data.data;
  const store = useAppStore.getState();

  await saveToken('youtube', {
    accessToken,
    refreshToken: refreshToken || undefined,
    expiresAt,
    displayName,
    userId: channel?.id,
  });

  store.linkAccount('youtube', displayName);

  if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
    localStorage.setItem(LAST_ACCOUNT_YT_KEY, displayName);
  } else {
    await SecureStore.setItemAsync(LAST_ACCOUNT_YT_KEY, displayName);
  }

  return { displayName, channelId: channel?.id };
}

export async function getValidYouTubeToken(): Promise<string | null> {
  const stored = await getToken('youtube');
  if (!stored) return null;

  // Si no ha expirado y faltan más de 5 minutos, devolverlo directamente
  const now = Date.now();
  if (stored.expiresAt && stored.expiresAt - now > 5 * 60 * 1000) {
    return stored.accessToken;
  }

  // Si tiene refresh_token, renovarlo automáticamente
  if (stored.refreshToken) {
    try {
      const res = await axios.post<{
        data?: {
          accessToken: string;
          refreshToken?: string;
          expiresAt: number;
        };
      }>('/api/youtube/token', {
        grant_type: 'refresh_token',
        refresh_token: stored.refreshToken,
      });

      if (res.data.data?.accessToken) {
        await saveToken('youtube', {
          ...stored,
          accessToken: res.data.data.accessToken,
          expiresAt: res.data.data.expiresAt,
          refreshToken: res.data.data.refreshToken || stored.refreshToken,
        });
        return res.data.data.accessToken;
      }
    } catch (refreshErr) {
      console.warn('[YouTubeAuthService] Error al refrescar token:', refreshErr);
    }
  }

  return stored.accessToken;
}

export async function disconnectYouTube(): Promise<void> {
  await removeToken('youtube');
  const store = useAppStore.getState();
  store.unlinkAccount('youtube');
}
