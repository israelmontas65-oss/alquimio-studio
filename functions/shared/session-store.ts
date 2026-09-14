// ============================================================
// functions/shared/session-store.ts
// Alquimia Studio — Gestión de Sesiones Cifradas en Backend (AES-256-GCM)
// Cifra y descifra credenciales de acceso de forma segura en el servidor
// Soporta renovación automática de tokens para TikTok, YouTube y Meta
// Titularidad: Israel Montás
// ============================================================

export interface EncryptedSessionData {
  platform: 'meta' | 'tiktok' | 'youtube';
  userId: string;
  accountName?: string;
  accessTokenEncrypted: string;
  refreshTokenEncrypted?: string;
  expiresAt: number; // Unix timestamp en ms
  scopes: string[];
  metadata?: Record<string, unknown>;
}

export interface DecryptedSessionData {
  platform: 'meta' | 'tiktok' | 'youtube';
  userId: string;
  accountName?: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  scopes: string[];
  metadata?: Record<string, unknown>;
}

interface EnvWithKv {
  SECURITY_MASTER_KEY?: string;
  ALQUIMIA_KV?: {
    put: (key: string, value: string, options?: { expirationTtl?: number }) => Promise<void>;
    get: (key: string) => Promise<string | null>;
    delete: (key: string) => Promise<void>;
  };
  META_APP_ID?: string;
  META_APP_SECRET?: string;
  TIKTOK_CLIENT_KEY?: string;
  TIKTOK_CLIENT_SECRET?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
}

// ── Criptografía Nativa AES-256-GCM con Web Crypto API ─────────
async function deriveKey(masterSecret: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(masterSecret),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: enc.encode('alquimia_session_aes_gcm_salt_2026'),
      iterations: 50_000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptToken(token: string, masterSecret: string): Promise<string> {
  if (!token) return '';
  const enc = new TextEncoder();
  const iv = new Uint8Array(12);
  crypto.getRandomValues(iv);

  const key = await deriveKey(masterSecret);
  const cipherBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    enc.encode(token)
  );

  const ivHex = Array.from(iv).map((b) => b.toString(16).padStart(2, '0')).join('');
  const cipherHex = Array.from(new Uint8Array(cipherBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  return `${ivHex}:${cipherHex}`;
}

export async function decryptToken(cipherString: string, masterSecret: string): Promise<string> {
  if (!cipherString) return '';
  const [ivHex, cipherHex] = cipherString.split(':');
  if (!ivHex || !cipherHex) throw new Error('Formato de token cifrado inválido.');

  const iv = new Uint8Array(ivHex.match(/.{1,2}/g)?.map((b) => parseInt(b, 16)) || []);
  const cipherBytes = new Uint8Array(cipherHex.match(/.{1,2}/g)?.map((b) => parseInt(b, 16)) || []);

  const key = await deriveKey(masterSecret);
  const plainBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    cipherBytes
  );

  return new TextDecoder().decode(plainBuffer);
}

// ── Obtener Clave Maestra del Servidor ─────────────────────────
export function getMasterSecret(env: any): string {
  return (
    env.SECURITY_MASTER_KEY ||
    env.TIKTOK_STATE_SECRET ||
    env.META_STATE_SECRET ||
    'alquimia_enterprise_master_security_key_2026'
  );
}

// ── Guardar Sesión Cifrada ────────────────────────────────────
export async function saveEncryptedSession(
  env: EnvWithKv,
  data: DecryptedSessionData
): Promise<{ cookieHeader: string; encryptedSession: EncryptedSessionData }> {
  const masterSecret = getMasterSecret(env);
  const accessTokenEncrypted = await encryptToken(data.accessToken, masterSecret);
  const refreshTokenEncrypted = data.refreshToken
    ? await encryptToken(data.refreshToken, masterSecret)
    : undefined;

  const encryptedSession: EncryptedSessionData = {
    platform: data.platform,
    userId: data.userId,
    accountName: data.accountName,
    accessTokenEncrypted,
    refreshTokenEncrypted,
    expiresAt: data.expiresAt,
    scopes: data.scopes,
    metadata: data.metadata,
  };

  const serialized = JSON.stringify(encryptedSession);

  // 1. Guardar en Cloudflare KV si está disponible
  if (env.ALQUIMIA_KV) {
    try {
      await env.ALQUIMIA_KV.put(`session:${data.platform}:${data.userId}`, serialized, {
        expirationTtl: 365 * 24 * 3600, // 1 año
      });
      await env.ALQUIMIA_KV.put(`session:current:${data.platform}`, serialized, {
        expirationTtl: 365 * 24 * 3600,
      });
    } catch (kvErr) {
      console.warn('[SessionStore] Fallo al escribir en KV:', kvErr);
    }
  }

  // 2. Generar cookie cifrada HttpOnly
  const cookieValue = encodeURIComponent(serialized);
  const cookieHeader = `alquimia_${data.platform}_session=${cookieValue}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000; Secure`;

  return { cookieHeader, encryptedSession };
}

// ── Recuperar Sesión y Descifrar Tokens ─────────────────────────
export async function getDecryptedSession(
  env: EnvWithKv,
  platform: 'meta' | 'tiktok' | 'youtube',
  request: Request
): Promise<DecryptedSessionData | null> {
  const masterSecret = getMasterSecret(env);
  let serialized: string | null = null;

  // 1. Intentar leer desde KV
  if (env.ALQUIMIA_KV) {
    try {
      serialized = await env.ALQUIMIA_KV.get(`session:current:${platform}`);
    } catch {
      serialized = null;
    }
  }

  // 2. Fallback a Cookie cifrada de la solicitud
  if (!serialized) {
    const cookieHeader = request.headers.get('Cookie') || '';
    const match = cookieHeader.match(new RegExp(`(^|;\\s*)alquimia_${platform}_session=([^;]*)`));
    if (match) {
      serialized = decodeURIComponent(match[2]);
    }
  }

  if (!serialized) return null;

  try {
    const parsed = JSON.parse(serialized) as EncryptedSessionData;
    const accessToken = await decryptToken(parsed.accessTokenEncrypted, masterSecret);
    const refreshToken = parsed.refreshTokenEncrypted
      ? await decryptToken(parsed.refreshTokenEncrypted, masterSecret)
      : undefined;

    const session: DecryptedSessionData = {
      platform: parsed.platform,
      userId: parsed.userId,
      accountName: parsed.accountName,
      accessToken,
      refreshToken,
      expiresAt: parsed.expiresAt,
      scopes: parsed.scopes || [],
      metadata: parsed.metadata,
    };

    // 3. Comprobar renovación automática preventiva
    if (platform === 'tiktok') {
      return await ensureFreshTikTokToken(env, session);
    } else if (platform === 'youtube') {
      return await ensureFreshYouTubeToken(env, session);
    }

    return session;
  } catch (err) {
    console.error('[SessionStore] Error al descifrar sesión:', err);
    return null;
  }
}

// ── Auto-refresco de Tokens TikTok (Expira cada 24h, refresh dura 365d) ──
async function ensureFreshTikTokToken(
  env: EnvWithKv,
  session: DecryptedSessionData
): Promise<DecryptedSessionData> {
  const FIVE_MINUTES_MS = 5 * 60 * 1000;
  if (session.expiresAt > Date.now() + FIVE_MINUTES_MS) {
    return session;
  }

  if (!session.refreshToken) {
    return session;
  }

  const clientKey = (env.TIKTOK_CLIENT_KEY || (env as any).EXPO_PUBLIC_TIKTOK_CLIENT_KEY || '').trim();
  const clientSecret = (env.TIKTOK_CLIENT_SECRET || (env as any).EXPO_PUBLIC_TIKTOK_CLIENT_SECRET || '').trim();

  if (!clientKey || !clientSecret) {
    return session;
  }

  try {
    const params = new URLSearchParams({
      client_key: clientKey,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
      refresh_token: session.refreshToken,
    });

    const res = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cache-Control': 'no-cache',
      },
      body: params.toString(),
    });

    if (res.ok) {
      const data = (await res.json()) as any;
      if (data.data?.access_token) {
        session.accessToken = data.data.access_token;
        session.refreshToken = data.data.refresh_token || session.refreshToken;
        session.expiresAt = Date.now() + (data.data.expires_in || 86400) * 1000;
        await saveEncryptedSession(env, session);
        console.log('[SessionStore] TikTok: Token renovado automáticamente con éxito.');
      }
    }
  } catch (refreshErr) {
    console.warn('[SessionStore] Fallo al renovar token de TikTok:', refreshErr);
  }

  return session;
}

// ── Auto-refresco de Tokens Google / YouTube Data API v3 ────────
async function ensureFreshYouTubeToken(
  env: EnvWithKv,
  session: DecryptedSessionData
): Promise<DecryptedSessionData> {
  const FIVE_MINUTES_MS = 5 * 60 * 1000;
  if (session.expiresAt > Date.now() + FIVE_MINUTES_MS) {
    return session;
  }

  if (!session.refreshToken) {
    return session;
  }

  const clientId = (env.GOOGLE_CLIENT_ID || (env as any).EXPO_PUBLIC_GOOGLE_CLIENT_ID || '').trim();
  const clientSecret = (env.GOOGLE_CLIENT_SECRET || (env as any).EXPO_PUBLIC_GOOGLE_CLIENT_SECRET || '').trim();

  if (!clientId || !clientSecret) {
    return session;
  }

  try {
    const params = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
      refresh_token: session.refreshToken,
    });

    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    if (res.ok) {
      const data = (await res.json()) as any;
      if (data.access_token) {
        session.accessToken = data.access_token;
        session.expiresAt = Date.now() + (data.expires_in || 3600) * 1000;
        if (data.refresh_token) session.refreshToken = data.refresh_token;
        await saveEncryptedSession(env, session);
        console.log('[SessionStore] YouTube: Token renovado automáticamente con éxito.');
      }
    }
  } catch (refreshErr) {
    console.warn('[SessionStore] Fallo al renovar token de YouTube:', refreshErr);
  }

  return session;
}
