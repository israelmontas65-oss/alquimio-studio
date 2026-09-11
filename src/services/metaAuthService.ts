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
    const params = new URLSearchParams({
      client_id: appId,
      redirect_uri: redirectUri,
      state: serverState,
      response_type: 'code',
      scope: 'pages_show_list,pages_manage_posts,pages_read_engagement,instagram_basic,instagram_content_publish',
    });
    if (forceLogin) params.append('auth_type', 'rerequest');
    authorizationUrl = `https://www.facebook.com/v19.0/dialog/oauth?${params.toString()}`;
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

  const res = await axios.post<{
    data?: {
      user: { id: string; name: string };
      selectedPage?: { id: string; name: string; accessToken: string };
      selectedInstagram?: { id: string; username: string; name: string };
    };
    error?: { message: string };
  }>('/api/meta/token', {
    code,
    state,
    redirect_uri: redirectUri,
  });

  if (res.data.error || !res.data.data) {
    throw new Error(res.data.error?.message || 'Error al canjear credenciales de Meta.');
  }

  const { selectedPage, selectedInstagram } = res.data.data;
  const store = useAppStore.getState();

  let pageName = '';
  let igHandle = '';

  // 1. Guardar y vincular Facebook Page
  if (selectedPage) {
    pageName = selectedPage.name;
    await saveToken('facebook', {
      accessToken: selectedPage.accessToken,
      displayName: selectedPage.name,
      userId: selectedPage.id,
    });
    store.linkAccount('facebook', selectedPage.name);

    if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
      localStorage.setItem(LAST_ACCOUNT_FB_KEY, selectedPage.name);
    } else {
      await SecureStore.setItemAsync(LAST_ACCOUNT_FB_KEY, selectedPage.name);
    }
  }

  // 2. Guardar y vincular Instagram Business Account
  if (selectedInstagram && selectedPage) {
    igHandle = `@${selectedInstagram.username}`;
    await saveToken('instagram', {
      accessToken: selectedPage.accessToken, // El Page Access Token administra la cuenta de IG conectada
      displayName: igHandle,
      userId: selectedInstagram.id,
    });
    store.linkAccount('instagram', igHandle);

    if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
      localStorage.setItem(LAST_ACCOUNT_IG_KEY, igHandle);
    } else {
      await SecureStore.setItemAsync(LAST_ACCOUNT_IG_KEY, igHandle);
    }
  }

  return { pageName, igHandle };
}

export async function disconnectMeta(): Promise<void> {
  await removeToken('facebook');
  await removeToken('instagram');
  const store = useAppStore.getState();
  store.unlinkAccount('facebook');
  store.unlinkAccount('instagram');
}
