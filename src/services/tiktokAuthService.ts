// ============================================================
// src/services/tiktokAuthService.ts
// Servicio de autenticación oficial OAuth 2.0 PKCE para TikTok API v2
// Compatible con Web (PWA / popup / redirect) y móvil nativo (Expo Linking)
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

// ── 1. Almacenamiento seguro temporal para PKCE y State ───────
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
export async function initiateTikTokOAuth(): Promise<void> {
  const { clientKey } = await getTikTokCredentials();
  if (!clientKey) {
    throw new Error(
      'Falta configurar el Client Key de TikTok. Por favor configúralo en las variables de entorno o en la configuración de la app.'
    );
  }

  const state = generateRandomString(32);
  const codeVerifier = generateRandomString(64);
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  const redirectUri = getTikTokRedirectUri();

  // Guardar estado y verifier para validar en el callback
  await saveOAuthState(state, codeVerifier);

  const params = new URLSearchParams({
    client_key: clientKey,
    scope: TIKTOK_SCOPES,
    response_type: 'code',
    redirect_uri: redirectUri,
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });

  const authorizationUrl = `${TIKTOK_AUTH_URL}?${params.toString()}`;

  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    // Si estamos en un navegador en modo standalone (PWA instalada) o móvil web,
    // usamos redirección directa para evitar bloqueos de popup.
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;

    if (isStandalone) {
      window.location.href = authorizationUrl;
      return;
    }

    // En navegador web de escritorio, intentamos abrir popup centrado
    const width = 500;
    const height = 720;
    const left = Math.max(0, (window.innerWidth - width) / 2 + window.screenX);
    const top = Math.max(0, (window.innerHeight - height) / 2 + window.screenY);

    const popup = window.open(
      authorizationUrl,
      'tiktok_oauth_window',
      `width=${width},height=${height},top=${top},left=${left},status=no,resizable=yes,scrollbars=yes`
    );

    if (!popup || popup.closed || typeof popup.closed === 'undefined') {
      // Si el navegador bloqueó el popup, fallback a redirección directa
      window.location.href = authorizationUrl;
    }
  } else {
    // Entorno móvil nativo: abrir URL mediante Linking
    const canOpen = await Linking.canOpenURL(authorizationUrl);
    if (canOpen) {
      await Linking.openURL(authorizationUrl);
    } else {
      throw new Error('No se pudo abrir el navegador para iniciar sesión en TikTok.');
    }
  }
}

// ── 3. Intercambiar código por tokens ─────────────────────────
export async function exchangeCodeForToken(
  code: string,
  codeVerifier: string
): Promise<TikTokTokenResponse> {
  const { clientKey, clientSecret } = await getTikTokCredentials();
  const redirectUri = getTikTokRedirectUri();

  // Intentar primero a través de Cloudflare Pages Function Proxy (evita CORS y protege secret)
  const isCloudflarePages =
    Platform.OS === 'web' &&
    typeof window !== 'undefined' &&
    (window.location.hostname.includes('pages.dev') || window.location.hostname.includes('localhost'));

  if (isCloudflarePages) {
    try {
      const proxyRes = await axios.post<{ data?: TikTokTokenResponse; error?: { message: string } }>(
        '/api/tiktok/token',
        {
          code,
          code_verifier: codeVerifier,
          redirect_uri: redirectUri,
          client_key: clientKey,
          client_secret: clientSecret,
        }
      );

      if (proxyRes.data?.data?.access_token) {
        return proxyRes.data.data;
      }
    } catch {
      // Fallback a petición directa si la función no está disponible localmente
    }
  }

  // Petición directa a open.tiktokapis.com
  const params = new URLSearchParams();
  params.append('client_key', clientKey);
  if (clientSecret) {
    params.append('client_secret', clientSecret);
  }
  params.append('code', code);
  params.append('grant_type', 'authorization_code');
  params.append('redirect_uri', redirectUri);
  params.append('code_verifier', codeVerifier);

  const res = await axios.post(`${TIKTOK_API_BASE}/oauth/token/`, params.toString(), {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cache-Control': 'no-cache',
    },
  });

  const payload = res.data as {
    data?: TikTokTokenResponse;
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    open_id?: string;
    error?: { code: string; message: string };
    error_description?: string;
  };

  if (payload.data?.access_token) {
    return payload.data;
  }

  if (payload.access_token) {
    return {
      access_token: payload.access_token,
      refresh_token: payload.refresh_token || '',
      expires_in: payload.expires_in || 86400,
      open_id: payload.open_id || '',
    };
  }

  const errMsg = payload.error?.message || payload.error_description || 'Error al obtener token de TikTok.';
  throw new Error(errMsg);
}

// ── 4. Consultar perfil real del usuario ─────────────────────
export async function fetchTikTokUserProfile(accessToken: string): Promise<TikTokUserProfile> {
  const isCloudflarePages =
    Platform.OS === 'web' &&
    typeof window !== 'undefined' &&
    (window.location.hostname.includes('pages.dev') || window.location.hostname.includes('localhost'));

  if (isCloudflarePages) {
    try {
      const proxyRes = await axios.get<{ data?: { user: TikTokUserProfile } }>('/api/tiktok/user', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (proxyRes.data?.data?.user) {
        return proxyRes.data.data.user;
      }
    } catch {
      // Fallback a petición directa
    }
  }

  const res = await axios.get(`${TIKTOK_API_BASE}/user/info/`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    params: {
      fields: 'open_id,union_id,avatar_url,display_name,username',
    },
  });

  const data = res.data as {
    data?: { user?: TikTokUserProfile };
    error?: { code: string; message: string };
  };

  if (data.data?.user) {
    return data.data.user;
  }

  throw new Error(data.error?.message || 'No se pudo obtener el perfil de TikTok.');
}

// ── 5. Manejar Callback OAuth completado ──────────────────────
export async function handleAuthCallback(
  code: string,
  state: string
): Promise<{ success: boolean; handle: string; user: TikTokUserProfile }> {
  const stored = await getStoredOAuthState();

  // Validar anti-CSRF state si estaba guardado
  if (stored.state && stored.state !== state) {
    throw new Error('Error de validación de seguridad (CSRF state mismatch).');
  }

  const verifier = stored.verifier || '';
  const tokenData = await exchangeCodeForToken(code, verifier);

  // Obtener perfil del usuario
  let user: TikTokUserProfile;
  try {
    user = await fetchTikTokUserProfile(tokenData.access_token);
  } catch {
    // Si falla el perfil por alcance o sandbox, usamos fallback con open_id
    user = {
      open_id: tokenData.open_id,
      display_name: 'Creador TikTok',
      username: 'tiktok_user',
    };
  }

  const rawHandle = user.username || user.display_name || user.open_id || 'tiktok_user';
  const handle = rawHandle.startsWith('@') ? rawHandle : `@${rawHandle}`;

  // Guardar token seguro en tokenManager
  const expiresAt = Date.now() + (tokenData.expires_in || 86400) * 1000;
  await saveToken('tiktok', {
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token,
    expiresAt,
    userId: user.open_id,
    displayName: handle,
  });

  // Actualizar store global
  useAppStore.getState().linkAccount('tiktok', handle);

  // Limpiar credenciales temporales de PKCE
  await clearStoredOAuthState();

  return { success: true, handle, user };
}

// ── 6. Refrescar token automáticamente ───────────────────────
export async function refreshTikTokToken(
  refreshTokenOverride?: string
): Promise<string> {
  const currentToken = await getToken('tiktok');
  const refreshToken = refreshTokenOverride || currentToken?.refreshToken;

  if (!refreshToken) {
    throw new Error('No hay refresh token disponible para TikTok. Es necesario iniciar sesión nuevamente.');
  }

  const { clientKey, clientSecret } = await getTikTokCredentials();

  const isCloudflarePages =
    Platform.OS === 'web' &&
    typeof window !== 'undefined' &&
    (window.location.hostname.includes('pages.dev') || window.location.hostname.includes('localhost'));

  if (isCloudflarePages) {
    try {
      const proxyRes = await axios.post<{ data?: TikTokTokenResponse }>('/api/tiktok/token', {
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_key: clientKey,
        client_secret: clientSecret,
      });

      if (proxyRes.data?.data?.access_token) {
        const d = proxyRes.data.data;
        const newExpiresAt = Date.now() + (d.expires_in || 86400) * 1000;
        await saveToken('tiktok', {
          accessToken: d.access_token,
          refreshToken: d.refresh_token || refreshToken,
          expiresAt: newExpiresAt,
          userId: currentToken?.userId,
          displayName: currentToken?.displayName,
        });
        return d.access_token;
      }
    } catch {
      // Fallback a petición directa
    }
  }

  const params = new URLSearchParams();
  params.append('client_key', clientKey);
  if (clientSecret) {
    params.append('client_secret', clientSecret);
  }
  params.append('grant_type', 'refresh_token');
  params.append('refresh_token', refreshToken);

  const res = await axios.post(`${TIKTOK_API_BASE}/oauth/token/`, params.toString(), {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });

  const payload = res.data as {
    data?: TikTokTokenResponse;
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    error?: { message: string };
  };

  const newAccessToken = payload.data?.access_token || payload.access_token;
  const newRefreshToken = payload.data?.refresh_token || payload.refresh_token || refreshToken;
  const expiresIn = payload.data?.expires_in || payload.expires_in || 86400;

  if (!newAccessToken) {
    throw new Error(payload.error?.message || 'Fallo al renovar el token de TikTok.');
  }

  const newExpiresAt = Date.now() + expiresIn * 1000;
  await saveToken('tiktok', {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
    expiresAt: newExpiresAt,
    userId: currentToken?.userId,
    displayName: currentToken?.displayName,
  });

  return newAccessToken;
}

// ── 7. Obtener token válido (con auto-refresh preventivo) ─────
export async function getValidTikTokToken(): Promise<string | null> {
  const token = await getToken('tiktok');
  if (!token?.accessToken) {
    return null;
  }

  // Si le quedan más de 5 minutos (300,000 ms), es válido
  if (token.expiresAt && Date.now() + 300_000 < token.expiresAt) {
    return token.accessToken;
  }

  // Si no tiene fecha de expiración, asumimos válido pero si tiene refresh token intentamos asegurar
  if (!token.expiresAt && !token.refreshToken) {
    return token.accessToken;
  }

  // Si está por vencer o vencido, ejecutamos refresco automático
  try {
    return await refreshTikTokToken();
  } catch {
    // Si el refresco falla pero el token no ha pasado su fecha estricta, devolvemos el actual
    if (token.expiresAt && Date.now() < token.expiresAt) {
      return token.accessToken;
    }
    return null;
  }
}

// ── 8. Desconectar y revocar token en TikTok ──────────────────
export async function disconnectTikTok(): Promise<void> {
  const token = await getToken('tiktok');
  const { clientKey, clientSecret } = await getTikTokCredentials();

  if (token?.accessToken) {
    try {
      const isCloudflarePages =
        Platform.OS === 'web' &&
        typeof window !== 'undefined' &&
        (window.location.hostname.includes('pages.dev') || window.location.hostname.includes('localhost'));

      if (isCloudflarePages) {
        await axios.post('/api/tiktok/revoke', {
          token: token.accessToken,
          client_key: clientKey,
          client_secret: clientSecret,
        }).catch(() => {});
      } else {
        const params = new URLSearchParams();
        params.append('client_key', clientKey);
        if (clientSecret) params.append('client_secret', clientSecret);
        params.append('token', token.accessToken);

        await axios.post(`${TIKTOK_API_BASE}/oauth/revoke/`, params.toString(), {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }).catch(() => {});
      }
    } catch {
      // Continuamos con la limpieza local incluso si la revocación remota falla
    }
  }

  // Eliminar token almacenado
  await removeToken('tiktok');
  await clearStoredOAuthState();

  // Actualizar Zustand
  useAppStore.getState().unlinkAccount('tiktok');
  useAppStore.getState().setPlatformHandle('tiktok', '');
}
