// ============================================================
// src/config/tiktokConfig.ts
// Configuración centralizada de TikTok API v2 (Login Kit & Content Posting)
// ============================================================

import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

export const TIKTOK_API_BASE = 'https://open.tiktokapis.com/v2';
export const TIKTOK_AUTH_URL = 'https://www.tiktok.com/v2/auth/authorize/';

// Scopes requeridos por Alquimia para autenticación de creador y publicación directa
export const TIKTOK_SCOPES = [
  'user.info.basic',
  'user.info.profile',
  'video.publish',
  'video.upload',
].join(',');

const STORAGE_KEYS = {
  CLIENT_KEY: 'alquimio_tiktok_client_key',
  CLIENT_SECRET: 'alquimio_tiktok_client_secret',
};

// ── Obtener Redirect URI según plataforma y entorno ─────────
export function getTikTokRedirectUri(): string {
  // 1. Si está explícitamente configurada en variables de entorno:
  if (process.env.EXPO_PUBLIC_TIKTOK_REDIRECT_URI) {
    return process.env.EXPO_PUBLIC_TIKTOK_REDIRECT_URI;
  }

  // 2. Si estamos en Web / PWA:
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return `${window.location.origin}/oauth/tiktok`;
  }

  // 3. En entorno móvil nativo (iOS / Android):
  return 'alquimio://oauth/tiktok';
}

// ── Recuperar credenciales (Env vars > Almacenamiento local) ──
export async function getTikTokCredentials(): Promise<{
  clientKey: string;
  clientSecret: string;
}> {
  let clientKey = process.env.EXPO_PUBLIC_TIKTOK_CLIENT_KEY?.trim() || '';
  let clientSecret = process.env.EXPO_PUBLIC_TIKTOK_CLIENT_SECRET?.trim() || '';

  if (!clientKey || !clientSecret) {
    try {
      if (Platform.OS === 'web') {
        if (typeof localStorage !== 'undefined') {
          clientKey = clientKey || localStorage.getItem(STORAGE_KEYS.CLIENT_KEY) || '';
          clientSecret = clientSecret || localStorage.getItem(STORAGE_KEYS.CLIENT_SECRET) || '';
        }
      } else {
        clientKey = clientKey || (await SecureStore.getItemAsync(STORAGE_KEYS.CLIENT_KEY)) || '';
        clientSecret = clientSecret || (await SecureStore.getItemAsync(STORAGE_KEYS.CLIENT_SECRET)) || '';
      }
    } catch {
      // Fallback a strings vacíos si falla lectura
    }
  }

  return { clientKey, clientSecret };
}

// ── Guardar credenciales locales (para configuración rápida en UI) ──
export async function saveTikTokCredentials(
  clientKey: string,
  clientSecret: string
): Promise<void> {
  const k = clientKey.trim();
  const s = clientSecret.trim();

  if (Platform.OS === 'web') {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.CLIENT_KEY, k);
      localStorage.setItem(STORAGE_KEYS.CLIENT_SECRET, s);
    }
  } else {
    await SecureStore.setItemAsync(STORAGE_KEYS.CLIENT_KEY, k);
    await SecureStore.setItemAsync(STORAGE_KEYS.CLIENT_SECRET, s);
  }
}

// ── Limpiar credenciales locales ─────────────────────────────
export async function clearTikTokCredentials(): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(STORAGE_KEYS.CLIENT_KEY);
      localStorage.removeItem(STORAGE_KEYS.CLIENT_SECRET);
    }
  } else {
    await SecureStore.deleteItemAsync(STORAGE_KEYS.CLIENT_KEY);
    await SecureStore.deleteItemAsync(STORAGE_KEYS.CLIENT_SECRET);
  }
}
