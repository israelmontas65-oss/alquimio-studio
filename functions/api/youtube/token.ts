// ============================================================
// functions/api/youtube/token.ts
// Cloudflare Pages Function: Intercambio y refresco de tokens Google / YouTube Data API v3
// Validación Anti-CSRF criptográfica con One-Time State y auto-refresh de access token
// ============================================================

interface Env {
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  GOOGLE_STATE_SECRET?: string;
  EXPO_PUBLIC_GOOGLE_CLIENT_ID?: string;
  EXPO_PUBLIC_GOOGLE_CLIENT_SECRET?: string;
  YOUTUBE_KV?: {
    put: (key: string, value: string, options?: { expirationTtl?: number }) => Promise<void>;
    get: (key: string) => Promise<string | null>;
    delete: (key: string) => Promise<void>;
  };
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
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

// ── Validación de firma y timestamp de State Anti-CSRF ────────
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
      state?: string;
      redirect_uri?: string;
      grant_type?: string;
      refresh_token?: string;
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
      console.error('[YouTube token] Falta GOOGLE_CLIENT_ID o GOOGLE_CLIENT_SECRET.');
      return new Response(
        JSON.stringify({
          error: {
            code: 'MISSING_GOOGLE_CREDENTIALS',
            message: 'Falta configurar credenciales de Google / YouTube en el servidor.',
          },
        }),
        { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    const grantType = body.grant_type || 'authorization_code';

    // 1. Validar Anti-CSRF sólo en authorization_code
    if (grantType === 'authorization_code') {
      const state = body.state;
      if (!state) {
        return new Response(
          JSON.stringify({
            error: {
              code: 'MISSING_CSRF_STATE',
              message: 'Falta el parámetro state para verificar Anti-CSRF.',
            },
          }),
          { status: 403, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
        );
      }

      const signingSecret =
        context.env.GOOGLE_STATE_SECRET ||
        clientSecret ||
        clientId ||
        'alquimia_youtube_csrf_salt';

      const isValidHmac = await verifySignedState(state, signingSecret);
      if (!isValidHmac) {
        return new Response(
          JSON.stringify({
            error: {
              code: 'INVALID_CSRF_STATE',
              message: 'Estado de seguridad (CSRF) inválido o expirado.',
            },
          }),
          { status: 403, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
        );
      }

      const kv = context.env.YOUTUBE_KV || context.env.ALQUIMIA_KV;
      if (kv) {
        const kvState = await kv.get(`oauth_state:${state}`);
        if (!kvState) {
          return new Response(
            JSON.stringify({
              error: {
                code: 'REPLAYED_CSRF_STATE',
                message: 'El código de seguridad ya fue utilizado o ha expirado.',
              },
            }),
            { status: 403, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
          );
        }
        await kv.delete(`oauth_state:${state}`).catch(() => {});
      }
    }

    // 2. Parámetros para Google OAuth endpoint
    const params = new URLSearchParams();
    params.append('client_id', clientId);
    params.append('client_secret', clientSecret);
    params.append('grant_type', grantType);

    if (grantType === 'authorization_code') {
      if (!body.code) {
        return new Response(
          JSON.stringify({ error: { message: 'Falta el código de autorización (code).' } }),
          { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
        );
      }
      params.append('code', body.code);
      if (body.redirect_uri) params.append('redirect_uri', body.redirect_uri);
    } else if (grantType === 'refresh_token') {
      if (!body.refresh_token) {
        return new Response(
          JSON.stringify({ error: { message: 'Falta el refresh_token para renovar la sesión.' } }),
          { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
        );
      }
      params.append('refresh_token', body.refresh_token);
    }

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    const tokenData = (await tokenRes.json()) as any;

    if (!tokenRes.ok || tokenData.error) {
      const msg = tokenData.error_description || tokenData.error || 'Error al canjear token con Google.';
      return new Response(
        JSON.stringify({ error: { code: 'GOOGLE_TOKEN_EXCHANGE_ERROR', message: msg } }),
        { status: tokenRes.status || 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token || body.refresh_token || null;
    const expiresIn = tokenData.expires_in || 3600;
    const expiresAt = Date.now() + expiresIn * 1000;

    // 3. Obtener canal de YouTube del usuario
    let channelInfo: any = null;
    try {
      const channelRes = await fetch(
        'https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true',
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
      if (channelRes.ok) {
        const channelData = (await channelRes.json()) as any;
        const item = channelData.items?.[0];
        if (item) {
          channelInfo = {
            id: item.id,
            title: item.snippet?.title || 'Canal de YouTube',
            customUrl: item.snippet?.customUrl || `@${item.snippet?.title?.toLowerCase().replace(/\s+/g, '_')}`,
            avatarUrl: item.snippet?.thumbnails?.default?.url || null,
          };
        }
      }
    } catch (chErr) {
      console.warn('[YouTube token] No se pudo obtener información del canal:', chErr);
    }

    return new Response(
      JSON.stringify({
        data: {
          accessToken,
          refreshToken,
          expiresIn,
          expiresAt,
          channel: channelInfo,
          displayName: channelInfo?.customUrl || channelInfo?.title || 'YouTube Channel',
        },
      }),
      { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error al procesar token de YouTube.';
    console.error('[YouTube token] Excepción:', message);
    return new Response(JSON.stringify({ error: { message } }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
}
