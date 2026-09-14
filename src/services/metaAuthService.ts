// ============================================================
// src/services/metaAuthService.ts
// Servicio de autenticación oficial OAuth 2.0 para Meta (Facebook Pages & Instagram Business)
// Vincula automáticamente Página de Facebook y Perfil de Instagram Business
// ============================================================

import { Platform } from 'react-native';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import { saveToken, removeToken } from '../auth/tokenManager';
import { useAppStore } from '../store/useAppStore';

const META_STATE_STORAGE_KEY = 'alquimia_meta_oauth_state';
const LAST_ACCOUNT_FB_KEY = 'last_account_facebook';
const LAST_ACCOUNT_IG_KEY = 'last_account_instagram';

export function getMetaRedirectUri(): string {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return `${window.location.origin}/oauth/meta`;
  }
  return 'alquimia://oauth/meta';
}

async function saveMetaOAuthState(state: string): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof localStorage !== 'undefined') localStorage.setItem(META_STATE_STORAGE_KEY, state);
    if (typeof sessionStorage !== 'undefined') sessionStorage.setItem(META_STATE_STORAGE_KEY, state);
  } else {
    await SecureStore.setItemAsync(META_STATE_STORAGE_KEY, state);
  }
}

export async function getLastMetaAccounts(): Promise<{ facebook?: string; instagram?: string }> {
  try {
    if (Platform.OS === 'web') {
      if (typeof localStorage !== 'undefined') {
        return {
          facebook: localStorage.getItem(LAST_ACCOUNT_FB_KEY) || undefined,
          instagram: localStorage.getItem(LAST_ACCOUNT_IG_KEY) || undefined,
        };
      }
    } else {
      const fb = await SecureStore.getItemAsync(LAST_ACCOUNT_FB_KEY);
      const ig = await SecureStore.getItemAsync(LAST_ACCOUNT_IG_KEY);
      return {
        facebook: fb || undefined,
        instagram: ig || undefined,
      };
    }
  } catch {
    // Ignorar si el almacenamiento no está disponible
  }
  return {};
}

export async function initiateMetaOAuth(options?: { forceLogin?: boolean }): Promise<void> {
  const redirectUri = getMetaRedirectUri();
  const forceLogin = options?.forceLogin === true;
  const isWebEnvironment = Platform.OS === 'web' && typeof window !== 'undefined';

  let authorizationUrl = '';
  let serverState = '';

  try {
    const res = await axios.get<{
      data?: { authorizationUrl: string; appId: string; state: string };
      error?: { message: string };
    }>('/api/meta/auth-url', {
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
    console.warn('[MetaAuthService] Fallo al consultar /api/meta/auth-url:', err);
  }

  if (!authorizationUrl) {
    const appId = process.env.EXPO_PUBLIC_META_APP_ID || '';
    if (!appId) {
      throw new Error('Falta configurar META_APP_ID en Cloudflare Pages.');
    }
    serverState = `meta_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    // Documentación oficial: Meta Graph API v21.0 para Facebook Pages, Instagram y Business Management
    const params = new URLSearchParams({
      client_id: appId,
      redirect_uri: redirectUri,
      state: serverState,
      response_type: 'code',
      scope: 'instagram_basic,instagram_content_publish,pages_show_list,pages_manage_posts,pages_read_engagement,business_management',
    });
    if (forceLogin) params.append('auth_type', 'rerequest');
    authorizationUrl = `https://www.facebook.com/v21.0/dialog/oauth?${params.toString()}`;
  }

  await saveMetaOAuthState(serverState);

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
          await handleMetaAuthCallback(code, state || serverState);
          return;
        }
      }
      throw new Error('No se recibió código de autorización de Meta.');
    } else if (authResult.type === 'cancel' || authResult.type === 'dismiss') {
      throw new Error('Autorización cancelada por el usuario.');
    } else {
      throw new Error('No se pudo completar la conexión con Meta.');
    }
  }

  // Web / PWA: Redirección completa
  if (typeof window !== 'undefined') {
    window.location.href = authorizationUrl;
  }
}

export async function handleMetaAuthCallback(code: string, state: string): Promise<{
  pageName?: string;
  igHandle?: string;
}> {
  const redirectUri = getMetaRedirectUri();

  // 1. Invocar endpoint oficial de OAuth v21.0 con tokens resguardados en backend
  let res: any;
  try {
    res = await axios.post('/api/oauth/meta', {
      code,
      state,
      redirect_uri: redirectUri,
    });
  } catch (oauthErr) {
    // Fallback de compatibilidad
    res = await axios.post('/api/meta/token', {
      code,
      state,
      redirect_uri: redirectUri,
    });
  }

  const responseData = res.data;
  if (!responseData || responseData.error) {
    throw new Error(responseData?.error?.message || 'Error al canjear credenciales de Meta.');
  }

  const store = useAppStore.getState();
  let pageName = '';
  let igHandle = '';

  // Manejo de respuesta /api/oauth/meta (tokens resguardados en backend)
  if (responseData.connected) {
    pageName = responseData.facebookPage?.name || responseData.displayName || 'Página de Facebook';
    igHandle = responseData.instagram?.username || `@${pageName.toLowerCase().replace(/\s+/g, '_')}`;

    // Vincular en el store
    store.linkAccount('facebook', pageName);
    store.linkAccount('instagram', igHandle);
    store.linkAccount('threads', igHandle);

    if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
      localStorage.setItem(LAST_ACCOUNT_FB_KEY, pageName);
      localStorage.setItem(LAST_ACCOUNT_IG_KEY, igHandle);
    } else {
      await SecureStore.setItemAsync(LAST_ACCOUNT_FB_KEY, pageName);
      await SecureStore.setItemAsync(LAST_ACCOUNT_IG_KEY, igHandle);
    }

    return { pageName, igHandle };
  }

  // Manejo legacy /api/meta/token
  const legacyData = responseData.data;
  if (legacyData) {
    const { selectedPage, selectedInstagram } = legacyData;
    if (selectedPage) {
      pageName = selectedPage.name;
      await saveToken('facebook', {
        accessToken: selectedPage.accessToken,
        displayName: selectedPage.name,
        userId: selectedPage.id,
      });
      store.linkAccount('facebook', selectedPage.name);
    }
    if (selectedInstagram) {
      igHandle = `@${selectedInstagram.username}`;
      await saveToken('instagram', {
        accessToken: selectedPage?.accessToken || '',
        displayName: igHandle,
        userId: selectedInstagram.id,
      });
      store.linkAccount('instagram', igHandle);
      store.linkAccount('threads', igHandle);
    }
  }

  return { pageName, igHandle };
}

export async function disconnectMeta(): Promise<void> {
  try {
    await axios.post('/api/oauth/session', { platform: 'meta' });
  } catch {
    // Silencioso si falla la llamada
  }
  await removeToken('facebook');
  await removeToken('instagram');
  await removeToken('threads');
  const store = useAppStore.getState();
  store.unlinkAccount('facebook');
  store.unlinkAccount('instagram');
  store.unlinkAccount('threads');
}
