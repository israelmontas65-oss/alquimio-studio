// ============================================================
// functions/api/oauth/tiktok.ts
// Cloudflare Pages Function: OAuth 2.0 PKCE Handler para TikTok API v2
// Tokens cifrados en backend (AES-256-GCM) — Cero tokens expuestos al cliente
// Soporta renovación automática transparente con refresh_token (365 días)
// ============================================================

import { saveEncryptedSession } from '../../shared/session-store';

interface Env {
  TIKTOK_CLIENT_KEY?: string;
  TIKTOK_CLIENT_SECRET?: string;
  TIKTOK_STATE_SECRET?: string;
  EXPO_PUBLIC_TIKTOK_CLIENT_KEY?: string;
  EXPO_PUBLIC_TIKTOK_CLIENT_SECRET?: string;
  SECURITY_MASTER_KEY?: string;
  ALQUIMIA_KV?: {
    put: (key: string, value: string, options?: { expirationTtl?: number }) => Promise<void>;
    get: (key: string) => Promise<string | null>;
    delete: (key: string) => Promise<void>;
  };
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Alquimia-Session',
  'Access-Control-Allow-Credentials': 'true',
};

export async function onRequestOptions(): Promise<Response> {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

async function verifySignedState(state: string, secret: string): Promise<boolean> {
  const parts = state.split('.');
  if (parts.length !== 3) return false;
  const [nonce, timestampStr, signatureHex] = parts;
  const timestamp = parseInt(timestampStr, 10);
  if (isNaN(timestamp)) return false;

  const now = Date.now();
  if (now - timestamp > 600_000 || timestamp > now + 60_000) {
    return false;
  }

  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const data = enc.encode(`${nonce}:${timestamp}`);
  const signatureBuffer = await crypto.subtle.sign('HMAC', key, data);
  const expectedHex = Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  return signatureHex === expectedHex;
}

export async function onRequestPost(context: { request: Request; env: Env }): Promise<Response> {
  try {
    const body = (await context.request.json()) as {
      code?: string;
      code_verifier?: string;
      redirect_uri?: string;
      state?: string;
    };

    const clientKey = (
      context.env.TIKTOK_CLIENT_KEY ||
      context.env.EXPO_PUBLIC_TIKTOK_CLIENT_KEY ||
      ''
    ).trim();

    const clientSecret = (
      context.env.TIKTOK_CLIENT_SECRET ||
      context.env.EXPO_PUBLIC_TIKTOK_CLIENT_SECRET ||
      ''
    ).trim();

    if (!clientKey || !clientSecret) {
      return new Response(
        JSON.stringify({
          error: {
            code: 'MISSING_TIKTOK_CREDENTIALS',
            message: 'Falta configurar TIKTOK_CLIENT_KEY o TIKTOK_CLIENT_SECRET en el servidor.',
          },
        }),
        { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    if (!body.code) {
      return new Response(
        JSON.stringify({ error: { message: 'Falta el código de autorización (code).' } }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    const state = body.state;
    if (!state) {
      return new Response(
        JSON.stringify({ error: { message: 'Falta parámetro de seguridad Anti-CSRF (state).' } }),
        { status: 403, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    const signingSecret = context.env.TIKTOK_STATE_SECRET || clientSecret || clientKey;
    const isValidHmac = await verifySignedState(state, signingSecret);
    if (!isValidHmac) {
      return new Response(
        JSON.stringify({ error: { message: 'Estado de seguridad (CSRF) inválido o expirado.' } }),
        { status: 403, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    // Validación atómica en KV (One-Time Use)
    if (context.env.ALQUIMIA_KV) {
      const kvState =
        (await context.env.ALQUIMIA_KV.get(`csrf:${state}`)) ||
        (await context.env.ALQUIMIA_KV.get(`oauth_state:${state}`));
      if (!kvState) {
        return new Response(
          JSON.stringify({ error: { message: 'El código de seguridad ya fue consumido o expiró.' } }),
          { status: 403, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
        );
      }
      await context.env.ALQUIMIA_KV.delete(`csrf:${state}`).catch(() => {});
      await context.env.ALQUIMIA_KV.delete(`oauth_state:${state}`).catch(() => {});
    }

    // 1. Intercambio oficial de código por Token en TikTok API v2
    const params = new URLSearchParams();
    params.append('client_key', clientKey);
    params.append('client_secret', clientSecret);
    params.append('grant_type', 'authorization_code');
    params.append('code', body.code);
    if (body.redirect_uri) params.append('redirect_uri', body.redirect_uri);
    if (body.code_verifier) params.append('code_verifier', body.code_verifier);

    const tiktokRes = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cache-Control': 'no-cache',
      },
      body: params.toString(),
    });

    const data = (await tiktokRes.json()) as any;

    if (!tiktokRes.ok || !data.data?.access_token) {
      const errMsg =
        data.error?.message ||
        data.error_description ||
        `Error de TikTok OAuth (${tiktokRes.status}).`;
      return new Response(
        JSON.stringify({ error: { code: 'TIKTOK_TOKEN_ERROR', message: errMsg } }),
        { status: tiktokRes.status >= 400 ? tiktokRes.status : 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    const tokenData = data.data;
    const expiresAt = Date.now() + (tokenData.expires_in || 86400) * 1000;

    // 2. Obtener perfil básico de TikTok
    let displayName = 'tiktok_creator';
    let handle = `@${tokenData.open_id.substring(0, 8)}`;
    let avatarUrl = '';

    try {
      const userRes = await fetch(
        'https://open.tiktokapis.com/v2/user/info/?fields=open_id,union_id,avatar_url,display_name,username',
        {
          headers: { Authorization: `Bearer ${tokenData.access_token}` },
        }
      );
      if (userRes.ok) {
        const uData = (await userRes.json()) as any;
        const u = uData.data?.user;
        if (u) {
          displayName = u.display_name || u.username || displayName;
          handle = u.username ? (u.username.startsWith('@') ? u.username : `@${u.username}`) : handle;
          avatarUrl = u.avatar_url || '';
        }
      }
    } catch (uErr) {
      console.warn('[oauth:tiktok] No se pudo obtener perfil de usuario:', uErr);
    }

    // 3. Cifrado Estricto en Reposo (AES-256-GCM) en Backend
    const { cookieHeader } = await saveEncryptedSession(context.env, {
      platform: 'tiktok',
      userId: tokenData.open_id,
      accountName: handle,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresAt,
      scopes: ['user.info.basic', 'video.publish', 'video.upload'],
      metadata: {
        openId: tokenData.open_id,
        displayName,
        handle,
        avatarUrl,
      },
    });

    // 4. RESPUESTA ESTRICTA AL CLIENTE:
    // Solo estado de conexión (connected: true), handle y NUNCA tokens
    return new Response(
      JSON.stringify({
        connected: true,
        platform: 'tiktok',
        userId: tokenData.open_id,
        handle,
        displayName,
        avatarUrl,
        expiresAt,
        scopes: ['user.info.basic', 'video.publish', 'video.upload'],
      }),
      {
        status: 200,
        headers: {
          ...CORS_HEADERS,
          'Content-Type': 'application/json',
          'Set-Cookie': cookieHeader,
        },
      }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error al procesar OAuth de TikTok.';
    console.error('[oauth:tiktok] Excepción:', message);
    return new Response(JSON.stringify({ error: { message } }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
}
