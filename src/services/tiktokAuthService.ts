// ============================================================
// src/services/tiktokAuthService.ts
// Servicio de autenticación oficial OAuth 2.0 PKCE para TikTok API v2
// Flujo impulsado por Backend (Cloudflare Pages) con cookies de sesión y prompt=login
// ============================================================

import { Platform, Linking } from 'react-native';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import {
  TIKTOK_API_BASE,
  TIKTOK_AUTH_URL,
  TIKTOK_SCOPES,
  getTikTokCredentials,
  getTikTokRedirectUri,
} from '../config/tiktokConfig';
import { generateRandomString, generateCodeChallenge } from '../utils/cryptoUtils';
import { saveToken, getToken, removeToken } from '../auth/tokenManager';
import { useAppStore } from '../store/useAppStore';

const PKCE_STORAGE_KEY = 'alquimio_tiktok_pkce_verifier';
const STATE_STORAGE_KEY = 'alquimio_tiktok_oauth_state';
const SESSION_ID_KEY = 'alquimio_tiktok_backend_session_id';

export interface TikTokUserProfile {
  open_id: string;
  union_id?: string;
  avatar_url?: string;
  display_name?: string;
  username?: string;
}

export interface TikTokTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  open_id: string;
  refresh_expires_in?: number;
  scope?: string;
  token_type?: string;
}

// ── 1. Almacenamiento temporal para PKCE y State ─────────────
async function saveOAuthState(state: string, verifier: string): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(STATE_STORAGE_KEY, state);
      sessionStorage.setItem(PKCE_STORAGE_KEY, verifier);
    } else if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STATE_STORAGE_KEY, state);
      localStorage.setItem(PKCE_STORAGE_KEY, verifier);
    }
  } else {
    await SecureStore.setItemAsync(STATE_STORAGE_KEY, state);
    await SecureStore.setItemAsync(PKCE_STORAGE_KEY, verifier);
  }
}

async function getStoredOAuthState(): Promise<{ state: string | null; verifier: string | null }> {
  if (Platform.OS === 'web') {
    if (typeof sessionStorage !== 'undefined') {
      const state = sessionStorage.getItem(STATE_STORAGE_KEY);
      const verifier = sessionStorage.getItem(PKCE_STORAGE_KEY);
      if (state || verifier) return { state, verifier };
    }
    if (typeof localStorage !== 'undefined') {
      return {
        state: localStorage.getItem(STATE_STORAGE_KEY),
        verifier: localStorage.getItem(PKCE_STORAGE_KEY),
      };
    }
    return { state: null, verifier: null };
  } else {
    const state = await SecureStore.getItemAsync(STATE_STORAGE_KEY);
    const verifier = await SecureStore.getItemAsync(PKCE_STORAGE_KEY);
    return { state, verifier };
  }
}

async function clearStoredOAuthState(): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem(STATE_STORAGE_KEY);
      sessionStorage.removeItem(PKCE_STORAGE_KEY);
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(STATE_STORAGE_KEY);
      localStorage.removeItem(PKCE_STORAGE_KEY);
    }
  } else {
    await SecureStore.deleteItemAsync(STATE_STORAGE_KEY);
    await SecureStore.deleteItemAsync(PKCE_STORAGE_KEY);
  }
}

// ── 2. Iniciar flujo oficial OAuth 2.0 PKCE ───────────────────
export async function initiateTikTokOAuth(options?: { forceLogin?: boolean }): Promise<void> {
  const state = generateRandomString(32);
  const codeVerifier = generateRandomString(64);
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  const redirectUri = getTikTokRedirectUri();
  const forceLogin = options?.forceLogin === true;

  // Guardar estado y verifier para validar en el retorno del callback
  await saveOAuthState(state, codeVerifier);

  let authorizationUrl = '';

  // Intentar obtener la URL generada por el backend con las credenciales seguras
  const isWebEnvironment = Platform.OS === 'web' && typeof window !== 'undefined';
  if (isWebEnvironment) {
    try {
      const authUrlRes = await axios.get<{
        data?: { authorizationUrl: string; clientKey: string };
        error?: { message: string };
      }>('/api/tiktok/auth-url', {
        params: {
          state,
          code_challenge: codeChallenge,
          redirect_uri: redirectUri,
          force_login: forceLogin ? 'true' : 'false',
        },
      });

      if (authUrlRes.data?.data?.authorizationUrl) {
        authorizationUrl = authUrlRes.data.data.authorizationUrl;
      }
    } catch {
      // Fallback a construcción local si el proxy no responde (desarrollo local sin wrangler)
    }
  }

  // Fallback si no vino de la función del backend
  if (!authorizationUrl) {
    const { clientKey } = await getTikTokCredentials();
    if (!clientKey) {
      throw new Error(
        'Falta configurar el Client Key de TikTok. Por favor asegúrate de configurar TIKTOK_CLIENT_KEY en Cloudflare Pages.'
      );
    }

    const params = new URLSearchParams({
      client_key: clientKey,
      scope: TIKTOK_SCOPES,
      response_type: 'code',
      redirect_uri: redirectUri,
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });

    if (forceLogin) {
      params.append('prompt', 'login');
      params.append('force_web_auth', '1');
    }

    authorizationUrl = `${TIKTOK_AUTH_URL}?${params.toString()}`;
  }

  // Lanzar en el navegador del sistema con cookies de sesión activas
  if (isWebEnvironment) {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;

    if (isStandalone) {
      window.location.href = authorizationUrl;
      return;
    }

    const width = 520;
    const height = 750;
    const left = Math.max(0, (window.innerWidth - width) / 2 + window.screenX);
    const top = Math.max(0, (window.innerHeight - height) / 2 + window.screenY);

    const popup = window.open(
      authorizationUrl,
      'tiktok_oauth_window',
      `width=${width},height=${height},top=${top},left=${left},status=no,resizable=yes,scrollbars=yes`
    );

    if (!popup || popup.closed || typeof popup.closed === 'undefined') {
      window.location.href = authorizationUrl;
    }
  } else {
    // Móvil nativo: Abre el navegador oficial del sistema (Safari / Chrome con cookies del usuario)
    const canOpen = await Linking.canOpenURL(authorizationUrl);
    if (canOpen) {
      await Linking.openURL(authorizationUrl);
    } else {
      throw new Error('No se pudo abrir el navegador para iniciar sesión en TikTok.');
    }
  }
}

// ── 3. Intercambiar código por tokens (Server-Side) ───────────
export async function exchangeCodeForToken(
  code: string,
  codeVerifier: string
): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
  open_id: string;
  handle: string;
  sessionId?: string;
  user: TikTokUserProfile;
}> {
  const redirectUri = getTikTokRedirectUri();
  const isWebEnvironment = Platform.OS === 'web' && typeof window !== 'undefined';

  // Flujo principal: Intercambio a través del backend de Cloudflare Pages
  if (isWebEnvironment) {
    try {
      const proxyRes = await axios.post<{
        data?: {
          access_token: string;
          refresh_token: string;
          expires_at: number;
          open_id: string;
          handle: string;
          sessionId: string;
          user: TikTokUserProfile;
        };
        error?: { message: string };
      }>('/api/tiktok/token', {
        code,
        code_verifier: codeVerifier,
        redirect_uri: redirectUri,
      });

      if (proxyRes.data?.data?.access_token) {
        const d = proxyRes.data.data;
        return {
          access_token: d.access_token,
          refresh_token: d.refresh_token,
          expires_in: Math.max(0, Math.round((d.expires_at - Date.now()) / 1000)) || 86400,
          open_id: d.open_id,
          handle: d.handle,
          sessionId: d.sessionId,
          user: d.user,
        };
      } else if (proxyRes.data?.error?.message) {
        throw new Error(proxyRes.data.error.message);
      }
    } catch (err: unknown) {
      const msg =
        axios.isAxiosError(err) && err.response?.data?.error?.message
          ? err.response.data.error.message
          : err instanceof Error
          ? err.message
          : 'Error de comunicación con el backend.';
      throw new Error(msg);
    }
  }

  throw new Error('El intercambio de credenciales requiere conexión al backend de Alquimia.');
}

// ── 4. Manejar Callback OAuth completado ──────────────────────
export async function handleAuthCallback(
  code: string,
  state: string
): Promise<{ success: boolean; handle: string; user: TikTokUserProfile }> {
  const stored = await getStoredOAuthState();

  if (stored.state && stored.state !== state) {
    throw new Error('Error de seguridad (CSRF state mismatch).');
  }

  const verifier = stored.verifier || '';
  const tokenData = await exchangeCodeForToken(code, verifier);

  const handle = tokenData.handle.startsWith('@') ? tokenData.handle : `@${tokenData.handle}`;

  // Guardar token en el gestor local para operaciones de publicación
  const expiresAt = Date.now() + (tokenData.expires_in || 86400) * 1000;
  await saveToken('tiktok', {
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token,
    expiresAt,
    userId: tokenData.open_id,
    displayName: handle,
  });

  if (tokenData.sessionId) {
    if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
      localStorage.setItem(SESSION_ID_KEY, tokenData.sessionId);
    }
  }

  // Actualizar store global
  useAppStore.getState().linkAccount('tiktok', handle);

  // Limpiar temporales de PKCE
  await clearStoredOAuthState();

  return { success: true, handle, user: tokenData.user };
}

// ── 5. Verificar sesión activa con el Backend ────────────────
export async function checkBackendSession(): Promise<boolean> {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return false;

  try {
    const sessionId = typeof localStorage !== 'undefined' ? localStorage.getItem(SESSION_ID_KEY) : null;
    const res = await axios.get<{
      data?: {
        isConnected: boolean;
        open_id?: string;
        user?: TikTokUserProfile;
        access_token?: string;
        expires_at?: number;
      };
    }>('/api/tiktok/session', {
      params: sessionId ? { session_id: sessionId } : {},
      headers: sessionId ? { 'X-Alquimia-Session': sessionId } : {},
    });

    if (res.data?.data?.isConnected && res.data.data.user) {
      const u = res.data.data.user;
      const rawHandle = u.username || u.display_name || u.open_id || 'tiktok_user';
      const handle = rawHandle.startsWith('@') ? rawHandle : `@${rawHandle}`;

      if (res.data.data.access_token) {
        await saveToken('tiktok', {
          accessToken: res.data.data.access_token,
          refreshToken: '',
          expiresAt: res.data.data.expires_at || Date.now() + 86400_000,
          userId: u.open_id,
          displayName: handle,
        });
      }

      useAppStore.getState().linkAccount('tiktok', handle);
      return true;
    }
  } catch {
    // Si la sesión no existe o expiró
  }

  return false;
}

// ── 6. Refrescar token automáticamente en Backend ────────────
export async function refreshTikTokToken(): Promise<string> {
  const currentToken = await getToken('tiktok');
  const refreshToken = currentToken?.refreshToken;

  if (!refreshToken) {
    throw new Error('Sesión de TikTok expirada. Vuelve a conectar tu cuenta.');
  }

  const isWebEnvironment = Platform.OS === 'web' && typeof window !== 'undefined';
  if (isWebEnvironment) {
    try {
      const proxyRes = await axios.post<{
        data?: {
          access_token: string;
          refresh_token: string;
          expires_at: number;
        };
        error?: { message: string };
      }>('/api/tiktok/token', {
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      });

      if (proxyRes.data?.data?.access_token) {
        const d = proxyRes.data.data;
        await saveToken('tiktok', {
          accessToken: d.access_token,
          refreshToken: d.refresh_token || refreshToken,
          expiresAt: d.expires_at || Date.now() + 86400_000,
          userId: currentToken?.userId,
          displayName: currentToken?.displayName,
        });
        return d.access_token;
      }
    } catch {
      // Fallback
    }
  }

  throw new Error('Fallo al refrescar token de TikTok.');
}

// ── 7. Obtener token válido para publicación ─────────────────
export async function getValidTikTokToken(): Promise<string | null> {
  const token = await getToken('tiktok');
  if (!token?.accessToken) {
    return null;
  }

  // Si le quedan más de 5 minutos, es válido
  if (token.expiresAt && Date.now() + 300_000 < token.expiresAt) {
    return token.accessToken;
  }

  try {
    return await refreshTikTokToken();
  } catch {
    if (token.expiresAt && Date.now() < token.expiresAt) {
      return token.accessToken;
    }
    return null;
  }
}

// ── 8. Desconectar y revocar token en TikTok (Backend) ────────
export async function disconnectTikTok(): Promise<void> {
  const token = await getToken('tiktok');
  const sessionId =
    Platform.OS === 'web' && typeof localStorage !== 'undefined'
      ? localStorage.getItem(SESSION_ID_KEY)
      : null;

  try {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      await axios.post('/api/tiktok/revoke', {
        token: token?.accessToken,
        session_id: sessionId,
      }).catch(() => {});
    }
  } catch {
    // Silencioso
  }

  if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
    localStorage.removeItem(SESSION_ID_KEY);
  }

  // Eliminar token local
  await removeToken('tiktok');
  await clearStoredOAuthState();

  // Actualizar Zustand
  useAppStore.getState().unlinkAccount('tiktok');
  useAppStore.getState().setPlatformHandle('tiktok', '');
}
