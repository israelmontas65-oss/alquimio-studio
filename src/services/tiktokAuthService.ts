// ============================================================
// src/services/tiktokAuthService.ts
// Servicio de autenticación oficial OAuth 2.0 PKCE para TikTok API v2
// Flujo impulsado por Backend con WebBrowser.openAuthSessionAsync en nativo
// y postMessage + polling en Web/PWA, con validación Anti-CSRF
// ============================================================

import { Platform } from 'react-native';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
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

// ── Helper para extraer parámetros de URLs con cualquier esquema ─
function parseQueryParams(url: string): Record<string, string> {
  const queryIdx = url.indexOf('?');
  if (queryIdx === -1) return {};
  const query = url.slice(queryIdx + 1).split('#')[0];
  const params: Record<string, string> = {};
  for (const pair of query.split('&')) {
    const [k, v] = pair.split('=');
    if (k) params[decodeURIComponent(k)] = decodeURIComponent(v || '');
  }
  return params;
}

// ── 2. Iniciar flujo oficial OAuth 2.0 PKCE ───────────────────
export async function initiateTikTokOAuth(options?: { forceLogin?: boolean }): Promise<void> {
  const codeVerifier = generateRandomString(64);
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  const redirectUri = getTikTokRedirectUri();
  const forceLogin = options?.forceLogin === true;

  let authorizationUrl = '';
  let serverState = '';

  // 1. Obtener URL de autorización y state firmado desde el backend
  const isWebEnvironment = Platform.OS === 'web' && typeof window !== 'undefined';
  try {
    const authUrlRes = await axios.get<{
      data?: { authorizationUrl: string; clientKey: string; state: string };
      error?: { message: string };
    }>('/api/tiktok/auth-url', {
      params: {
        code_challenge: codeChallenge,
        redirect_uri: redirectUri,
        force_login: forceLogin ? 'true' : 'false',
      },
    });

    if (authUrlRes.data?.data?.authorizationUrl) {
      authorizationUrl = authUrlRes.data.data.authorizationUrl;
      serverState = authUrlRes.data.data.state || '';
    }
  } catch {
    // Fallback en desarrollo local sin backend disponible
  }

  // Fallback si el backend no respondió
  if (!authorizationUrl) {
    const { clientKey } = await getTikTokCredentials();
    if (!clientKey) {
      throw new Error(
        'Falta configurar el Client Key de TikTok. Por favor asegúrate de configurar TIKTOK_CLIENT_KEY en Cloudflare Pages.'
      );
    }

    serverState = generateRandomString(32);
    const params = new URLSearchParams({
      client_key: clientKey,
      scope: TIKTOK_SCOPES,
      response_type: 'code',
      redirect_uri: redirectUri,
      state: serverState,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });

    if (forceLogin) {
      params.append('prompt', 'login');
      params.append('force_web_auth', '1');
    }

    authorizationUrl = `${TIKTOK_AUTH_URL}?${params.toString()}`;
  }

  // Guardar estado y verifier para validar en el callback
  await saveOAuthState(serverState, codeVerifier);

  // ── 2A. Móvil Nativo (iOS / Android): WebBrowser.openAuthSessionAsync ─
  if (!isWebEnvironment) {
    // WebBrowser.openAuthSessionAsync maneja cookies del sistema y cierra
    // automáticamente la ventana al redirigir al deep link alquimio://
    const authResult = await WebBrowser.openAuthSessionAsync(authorizationUrl, redirectUri);

    if (authResult.type === 'success' && authResult.url) {
      const parsed = parseQueryParams(authResult.url);
      if (parsed.error) {
        const errorDesc = parsed.error_description || parsed.error || 'Autorización cancelada.';
        throw new Error(`TikTok OAuth: ${errorDesc}`);
      }
      if (!parsed.code) {
        throw new Error('No se recibió código de autorización desde TikTok.');
      }

      await handleAuthCallback(parsed.code, parsed.state || serverState);
      return;
    } else if (authResult.type === 'cancel' || authResult.type === 'dismiss') {
      throw new Error('Autorización cancelada por el usuario.');
    } else {
      throw new Error('No se pudo completar la sesión de autorización en TikTok.');
    }
  }

  // ── 2B. Entorno Web / PWA ────────────────────────────────────
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true;

  if (isStandalone) {
    // En PWA instalada, redirección directa en la misma ventana
    window.location.href = authorizationUrl;
    return;
  }

  // En navegador de escritorio / móvil web: popup centrado
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
    return;
  }

  // Polling de seguridad por si el usuario cierra el popup manualmente
  const pollTimer = setInterval(() => {
    if (popup.closed) {
      clearInterval(pollTimer);
    }
  }, 1000);
}

// ── 3. Intercambiar código por tokens (Server-Side con CSRF) ──
export async function exchangeCodeForToken(
  code: string,
  codeVerifier: string,
  state: string
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
        state,
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
          : 'Error de comunicación con el servidor.';
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

  // Validar estado de seguridad local si existe
  if (stored.state && stored.state !== state) {
    throw new Error('Error de validación de seguridad (CSRF state mismatch local).');
  }

  const verifier = stored.verifier || '';
  const tokenData = await exchangeCodeForToken(code, verifier, state);

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
    // Si la sesión expiró o no existe
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
