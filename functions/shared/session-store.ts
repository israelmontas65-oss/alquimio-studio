// functions/shared/session-store.ts
// Motor de cifrado y almacenamiento de sesiones OAuth.
// Usa AES-256-GCM con clave derivada por PBKDF2 a partir de SESSION_SECRET
// (debe configurarse como Cloudflare Pages secret, NUNCA como variable en texto plano).
// Los tokens jamás se devuelven al frontend en texto plano.

export interface PlatformSession {
  platform: "meta" | "tiktok" | "youtube" | "threads";
  accessToken: string;
  refreshToken: string | null;
  expiresAt: number; // epoch ms
  profile: Record<string, any>;
}

interface Env {
  SESSIONS: KVNamespace;
  SESSION_SECRET: string;
}

const PBKDF2_ITERATIONS = 100_000;

async function deriveKey(secret: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: salt as unknown as BufferSource, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

async function encrypt(plainText: string, secret: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(secret, salt);
  const enc = new TextEncoder();
  const cipherBuffer = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(plainText));
  const combined = new Uint8Array(salt.length + iv.length + cipherBuffer.byteLength);
  combined.set(salt, 0);
  combined.set(iv, salt.length);
  combined.set(new Uint8Array(cipherBuffer), salt.length + iv.length);
  return btoa(String.fromCharCode(...combined));
}

async function decrypt(payload: string, secret: string): Promise<string> {
  const combined = Uint8Array.from(atob(payload), (c) => c.charCodeAt(0));
  const salt = combined.slice(0, 16);
  const iv = combined.slice(16, 28);
  const cipherBytes = combined.slice(28);
  const key = await deriveKey(secret, salt);
  const plainBuffer = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, cipherBytes);
  return new TextDecoder().decode(plainBuffer);
}

export async function saveSession(env: Env, session: PlatformSession): Promise<void> {
  if (!env?.SESSIONS || !env?.SESSION_SECRET) {
    console.warn('[session-store] SESSIONS KV o SESSION_SECRET no configurados');
    return;
  }
  const payload = JSON.stringify(session);
  const encrypted = await encrypt(payload, env.SESSION_SECRET);
  await env.SESSIONS.put(`session:${session.platform}`, encrypted);
}

export async function getSession(env: Env, platform: string): Promise<PlatformSession | null> {
  if (!env?.SESSIONS || !env?.SESSION_SECRET) return null;
  const raw = await env.SESSIONS.get(`session:${platform}`);
  if (!raw) return null;
  try {
    const decrypted = await decrypt(raw, env.SESSION_SECRET);
    return JSON.parse(decrypted) as PlatformSession;
  } catch {
    // Si falla el descifrado (clave rotada, dato corrupto), tratamos como sesión inexistente.
    return null;
  }
}

export const getDecryptedSession = getSession;

export async function deleteSession(env: Env, platform: string): Promise<void> {
  if (!env?.SESSIONS) return;
  await env.SESSIONS.delete(`session:${platform}`);
}

export async function getAllSessionsStatus(
  env: Env
): Promise<Record<string, { connected: boolean; profile?: Record<string, any> }>> {
  const platforms = ["meta", "tiktok", "youtube", "threads"];
  const result: Record<string, { connected: boolean; profile?: Record<string, any> }> = {};
  for (const platform of platforms) {
    const session = await getSession(env, platform);
    result[platform] = session
      ? { connected: true, profile: session.profile }
      : { connected: false };
  }
  return result;
}
