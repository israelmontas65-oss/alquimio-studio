// ============================================================
// src/config/tiktokConfig.ts
// Configuración centralizada de TikTok API v2 (Login Kit & Content Posting)
// Las credenciales de desarrollador residen en el backend (Cloudflare Pages)
// ============================================================

import { Platform } from 'react-native';

export const TIKTOK_API_BASE = 'https://open.tiktokapis.com/v2';
export const TIKTOK_AUTH_URL = 'https://www.tiktok.com/v2/auth/authorize/';

// Scopes oficiales requeridos por Alquimia para autenticación y publicación
export const TIKTOK_SCOPES = [
  'user.info.basic',
  'user.info.profile',
  'video.publish',
  'video.upload',
].join(',');

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

// ── Recuperar Client Key público si existe (fallback al backend) ──
export async function getTikTokCredentials(): Promise<{
  clientKey: string;
  clientSecret: string;
}> {
  const clientKey = process.env.EXPO_PUBLIC_TIKTOK_CLIENT_KEY?.trim() || '';
  // El Client Secret NUNCA reside en el cliente
  return { clientKey, clientSecret: '' };
}
