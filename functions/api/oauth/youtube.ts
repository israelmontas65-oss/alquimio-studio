// ============================================================
// functions/api/oauth/youtube.ts
// Cloudflare Pages Function: Google OAuth 2.0 Handler para YouTube Data API v3
// Tokens cifrados en backend (AES-256-GCM) — Cero tokens expuestos al cliente
// Soporta renovación automática con Google refresh_token
// ============================================================

import { saveEncryptedSession } from '../../shared/session-store';

interface Env {
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  GOOGLE_STATE_SECRET?: string;
  EXPO_PUBLIC_GOOGLE_CLIENT_ID?: string;
  EXPO_PUBLIC_GOOGLE_CLIENT_SECRET?: string;
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
      redirect_uri?: string;
      state?: string;
    };

    const clientId = (
      context.env.GOOGLE_CLIENT_ID ||
      context.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ||
      ''
    ).trim();

    const clientSecret = (
      context.env.GOOGLE_CLIENT_SECRET ||
      context.env.EXPO_PUBLIC_GOOGLE_CLIENT_SECRET ||
      ''
    ).trim();

    if (!clientId || !clientSecret) {
      return new Response(
        JSON.stringify({
          error: {
            code: 'MISSING_GOOGLE_CREDENTIALS',
            message: 'Falta configurar GOOGLE_CLIENT_ID o GOOGLE_CLIENT_SECRET en el servidor.',
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

    const signingSecret = context.env.GOOGLE_STATE_SECRET || clientSecret || clientId;
    const isValidHmac = await verifySignedState(state, signingSecret);
    if (!isValidHmac) {
      return new Response(
        JSON.stringify({ error: { message: 'Estado de seguridad (CSRF) inválido o expirado.' } }),
        { status: 403, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    // Validación atómica en KV
    if (context.env.ALQUIMIA_KV) {
      const kvState = await context.env.ALQUIMIA_KV.get(`oauth_state:${state}`);
      if (!kvState) {
        return new Response(
          JSON.stringify({ error: { message: 'El código de seguridad ya fue consumido o expiró.' } }),
          { status: 403, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
        );
      }
      await context.env.ALQUIMIA_KV.delete(`oauth_state:${state}`).catch(() => {});
    }

    // 1. Intercambio de código por Tokens en Google OAuth 2.0
    const params = new URLSearchParams();
    params.append('client_id', clientId);
    params.append('client_secret', clientSecret);
    params.append('grant_type', 'authorization_code');
    params.append('code', body.code);
    if (body.redirect_uri) params.append('redirect_uri', body.redirect_uri);

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    const tokenData = (await tokenRes.json()) as any;

    if (!tokenRes.ok || tokenData.error) {
      const msg = tokenData.error_description || tokenData.error || 'Error al canjear token con Google.';
      return new Response(
        JSON.stringify({ error: { code: 'GOOGLE_TOKEN_ERROR', message: msg } }),
        { status: tokenRes.status || 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token;
    const expiresIn = tokenData.expires_in || 3600;
    const expiresAt = Date.now() + expiresIn * 1000;

    // 2. Obtener información del canal de YouTube
    let channelId = 'youtube_channel';
    let channelTitle = 'YouTube Channel';
    let handle = '@youtube_creator';
    let avatarUrl = '';

    try {
      const channelRes = await fetch(
        'https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true',
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
      if (channelRes.ok) {
        const cData = (await channelRes.json()) as any;
        const item = cData.items?.[0];
        if (item) {
          channelId = item.id;
          channelTitle = item.snippet?.title || channelTitle;
          handle = item.snippet?.customUrl || `@${channelTitle.toLowerCase().replace(/\s+/g, '_')}`;
          avatarUrl = item.snippet?.thumbnails?.default?.url || '';
        }
      }
    } catch (cErr) {
      console.warn('[oauth:youtube] No se pudo obtener información del canal:', cErr);
    }

    // 3. Cifrado en Reposo (AES-256-GCM) en Backend
    const { cookieHeader } = await saveEncryptedSession(context.env, {
      platform: 'youtube',
      userId: channelId,
      accountName: handle,
      accessToken,
      refreshToken,
      expiresAt,
      scopes: ['https://www.googleapis.com/auth/youtube.upload'],
      metadata: {
        channelId,
        channelTitle,
        handle,
        avatarUrl,
      },
    });

    // 4. RESPUESTA ESTRICTA AL CLIENTE:
    // Solo estado de conexión (connected: true), título del canal y NUNCA tokens
    return new Response(
      JSON.stringify({
        connected: true,
        platform: 'youtube',
        userId: channelId,
        displayName: channelTitle,
        handle,
        avatarUrl,
        expiresAt,
        scopes: ['https://www.googleapis.com/auth/youtube.upload'],
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
    const message = err instanceof Error ? err.message : 'Error al procesar OAuth de YouTube.';
    console.error('[oauth:youtube] Excepción:', message);
    return new Response(JSON.stringify({ error: { message } }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
}
