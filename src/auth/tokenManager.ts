// ============================================================
// src/auth/tokenManager.ts
// Gestor seguro de tokens OAuth 2.0 con expo-secure-store
// ============================================================

import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import type { PlatformId } from '../types/platform.types';

const TOKEN_KEY_PREFIX = 'alquimio_token_';
const REFRESH_KEY_PREFIX = 'alquimio_refresh_';
const EXPIRES_KEY_PREFIX = 'alquimio_expires_';

export interface StoredToken {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number; // Unix timestamp ms
  userId?: string;
  displayName?: string;
}

// ── Guardar token de plataforma ─────────────────────────────
export async function saveToken(
  platformId: PlatformId,
  token: StoredToken
): Promise<void> {
  const { accessToken, refreshToken, expiresAt, userId, displayName } = token;

  if (Platform.OS === 'web') {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(`${TOKEN_KEY_PREFIX}${platformId}`, JSON.stringify({ accessToken, userId, displayName }));
      if (refreshToken) localStorage.setItem(`${REFRESH_KEY_PREFIX}${platformId}`, refreshToken);
      if (expiresAt) localStorage.setItem(`${EXPIRES_KEY_PREFIX}${platformId}`, String(expiresAt));
    }
    return;
  }

  await SecureStore.setItemAsync(
    `${TOKEN_KEY_PREFIX}${platformId}`,
    JSON.stringify({ accessToken, userId, displayName })
  );

  if (refreshToken) {
    await SecureStore.setItemAsync(
      `${REFRESH_KEY_PREFIX}${platformId}`,
      refreshToken
    );
  }

  if (expiresAt) {
    await SecureStore.setItemAsync(
      `${EXPIRES_KEY_PREFIX}${platformId}`,
      String(expiresAt)
    );
  }
}

// ── Recuperar token de plataforma ───────────────────────────
export async function getToken(
  platformId: PlatformId
): Promise<StoredToken | null> {
  try {
    let raw: string | null = null;
    let refreshRaw: string | null = null;
    let expiresRaw: string | null = null;

    if (Platform.OS === 'web') {
      if (typeof localStorage !== 'undefined') {
        raw = localStorage.getItem(`${TOKEN_KEY_PREFIX}${platformId}`);
        refreshRaw = localStorage.getItem(`${REFRESH_KEY_PREFIX}${platformId}`);
        expiresRaw = localStorage.getItem(`${EXPIRES_KEY_PREFIX}${platformId}`);
      }
    } else {
      raw = await SecureStore.getItemAsync(`${TOKEN_KEY_PREFIX}${platformId}`);
      refreshRaw = await SecureStore.getItemAsync(`${REFRESH_KEY_PREFIX}${platformId}`);
      expiresRaw = await SecureStore.getItemAsync(`${EXPIRES_KEY_PREFIX}${platformId}`);
    }

    if (!raw) return null;

    const { accessToken, userId, displayName } = JSON.parse(raw) as {
      accessToken: string;
      userId?: string;
      displayName?: string;
    };

    const refreshToken = refreshRaw ?? undefined;
    const expiresAt = expiresRaw ? Number(expiresRaw) : undefined;

    return { accessToken, refreshToken, expiresAt, userId, displayName };
  } catch {
    return null;
  }
}

// ── Verificar si el token es válido ─────────────────────────
export async function isTokenValid(platformId: PlatformId): Promise<boolean> {
  const token = await getToken(platformId);
  if (!token) return false;
  if (!token.expiresAt) return true; // Sin fecha = asumimos válido
  return Date.now() < token.expiresAt;
}

// ── Eliminar token (logout de plataforma) ───────────────────
export async function removeToken(platformId: PlatformId): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(`${TOKEN_KEY_PREFIX}${platformId}`);
      localStorage.removeItem(`${REFRESH_KEY_PREFIX}${platformId}`);
      localStorage.removeItem(`${EXPIRES_KEY_PREFIX}${platformId}`);
    }
    return;
  }
  await SecureStore.deleteItemAsync(`${TOKEN_KEY_PREFIX}${platformId}`);
  await SecureStore.deleteItemAsync(`${REFRESH_KEY_PREFIX}${platformId}`);
  await SecureStore.deleteItemAsync(`${EXPIRES_KEY_PREFIX}${platformId}`);
}

// ── Listar plataformas conectadas ────────────────────────────
export async function getConnectedPlatforms(): Promise<PlatformId[]> {
  const platforms: PlatformId[] = [
    'tiktok',
    'instagram',
    'youtube',
    'whatsapp',
    'facebook',
  ];

  const connected: PlatformId[] = [];
  for (const pid of platforms) {
    const token = await getToken(pid);
    if (token?.accessToken) {
      connected.push(pid);
    }
  }
  return connected;
}
