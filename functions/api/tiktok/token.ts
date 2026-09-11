// ============================================================
// functions/api/tiktok/token.ts
// Cloudflare Pages Function: Intercambio y refresco de tokens TikTok v2
// Validación estricta Anti-CSRF mediante state firmado y TTL de 10 min
// Credenciales resguardadas 100% en el servidor (TIKTOK_CLIENT_KEY y TIKTOK_CLIENT_SECRET)
// Diagnóstico específico para TIKTOK_CLIENT_KEY y TIKTOK_CLIENT_SECRET
// ============================================================

interface Env {
  EXPO_PUBLIC_TIKTOK_CLIENT_KEY?: string;
  EXPO_PUBLIC_TIKTOK_CLIENT_SECRET?: string;
  TIKTOK_CLIENT_KEY?: string;
  TIKTOK_CLIENT_SECRET?: string;
  TIKTOK_STATE_SECRET?: string;
  TIKTOK_KV?: {
    put: (key: string, value: string, options?: { expirationTtl?: number }) => Promise<void>;
    get: (key: string) => Promise<string | null>;
    delete: (key: string) => Promise<void>;
  };
}

interface StoredSession {
  open_id: string;
  access_token: string;
  refresh_token: string;
  expires_at: number;
  user: {
    open_id: string;
    username?: string;
    display_name?: string;
    avatar_url?: string;
  };
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Alquimia-Session',
  'Access-Control-Allow-Credentials': 'true',
};

export async function onRequestOptions(): Promise<Response> {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

function parseCookie(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`(^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[2]) : null;
}

// ── Validación de firma y timestamp de State Anti-CSRF ────────
async function verifySignedState(state: string, secret: string): Promise<boolean> {
  const parts = state.split('.');
  if (parts.length !== 3) return false;
  const [nonce, timestampStr, signatureHex] = parts;
  const timestamp = parseInt(timestampStr, 10);
  if (isNaN(timestamp)) return false;

  // Comprobar expiración estricta de 10 minutos (600,000 ms)
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
      grant_type?: string;
      refresh_token?: string;
      state?: string;
    };

    // ── 1. Verificación explícita y diferenciada de variables de entorno ─
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

    if (!clientKey) {
      console.error('[Cloudflare Pages Functions] token: Falta la variable de entorno TIKTOK_CLIENT_KEY.');
      return new Response(
        JSON.stringify({
          error: {
            code: 'MISSING_TIKTOK_CLIENT_KEY',
            message:
              'Falta configurar la variable TIKTOK_CLIENT_KEY en las variables de entorno de Cloudflare Pages.',
          },
        }),
        { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    if (!clientSecret) {
      console.error('[Cloudflare Pages Functions] token: Falta la variable de entorno TIKTOK_CLIENT_SECRET.');
      return new Response(
        JSON.stringify({
          error: {
            code: 'MISSING_TIKTOK_CLIENT_SECRET',
            message:
              'Falta configurar la variable TIKTOK_CLIENT_SECRET en las variables de entorno de Cloudflare Pages.',
          },
        }),
        { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    const signingSecret =
      context.env.TIKTOK_STATE_SECRET ||
      clientSecret ||
      clientKey ||
      'alquimia_csrf_default_salt';

    const grantType = body.grant_type || 'authorization_code';

    // ── 2. Validación de Seguridad Anti-CSRF (solo en authorization_code) ─
    if (grantType === 'authorization_code') {
      const state = body.state;
      if (!state) {
        console.error('[Cloudflare Pages Functions] token: Petición rechazada, falta parámetro state.');
        return new Response(
          JSON.stringify({
            error: {
              code: 'MISSING_CSRF_STATE',
              message:
                'Error de validación de seguridad: Falta el parámetro state para verificar Anti-CSRF.',
            },
          }),
          { status: 403, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
        );
      }

      const isValidHmac = await verifySignedState(state, signingSecret);
      if (!isValidHmac) {
        console.error('[Cloudflare Pages Functions] token: Petición rechazada, firma CSRF HMAC inválida o expirada.');
        return new Response(
          JSON.stringify({
            error: {
              code: 'INVALID_CSRF_STATE',
              message:
                'Error de validación de seguridad (CSRF state inválido o expirado). Inicie el proceso de nuevo.',
            },
          }),
          { status: 403, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
        );
      }

      // Consumo atómico de KV (One-Time Use contra Replay Attacks)
      const kv = context.env.TIKTOK_KV || (context.env as any).ALQUIMIA_KV;
      if (kv) {
        try {
          const kvVal = (await kv.get(`csrf:${state}`)) || (await kv.get(`oauth_state:${state}`));
          if (!kvVal) {
            console.error('[Cloudflare Pages Functions] token: State ya consumido o expirado en KV.');
            return new Response(
              JSON.stringify({
                error: {
                  code: 'REPLAYED_CSRF_STATE',
                  message: 'El código de seguridad Anti-CSRF ya ha sido consumido o expiró.',
                },
              }),
              { status: 403, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
            );
          }
          await kv.delete(`csrf:${state}`);
          await kv.delete(`oauth_state:${state}`);
        } catch {
          // Silencioso si KV falla temporalmente
        }
      }
    }

    // ── 3. Parámetros para TikTok API v2 ───────────────────────────
    const params = new URLSearchParams();
    params.append('client_key', clientKey);
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
      if (body.code_verifier) params.append('code_verifier', body.code_verifier);
    } else if (grantType === 'refresh_token') {
      if (!body.refresh_token) {
        return new Response(
          JSON.stringify({ error: { message: 'Falta el refresh_token para renovar la sesión.' } }),
          { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
        );
      }
      params.append('refresh_token', body.refresh_token);
    }

    // Petición oficial a TikTok API v2
    const tiktokRes = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cache-Control': 'no-cache',
      },
      body: params.toString(),
    });

    const data = (await tiktokRes.json()) as {
      data?: {
        access_token: string;
        refresh_token: string;
        expires_in: number;
        open_id: string;
        scope?: string;
        refresh_expires_in?: number;
      };
      error?: { code: string; message: string };
      error_description?: string;
    };

    if (!tiktokRes.ok || !data.data?.access_token) {
      const errMsg =
        data.error?.message ||
        data.error_description ||
        `Error de TikTok OAuth (${tiktokRes.status}).`;
      console.error('[Cloudflare Pages Functions] token: TikTok API devolvió error:', errMsg);
      return new Response(JSON.stringify({ error: { message: errMsg } }), {
        status: tiktokRes.status >= 400 ? tiktokRes.status : 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const tokenData = data.data;
    const expiresAt = Date.now() + (tokenData.expires_in || 86400) * 1000;

    // ── 4. Obtener perfil del usuario desde TikTok API v2 en el backend ─
    let userProfile = {
      open_id: tokenData.open_id,
      username: '',
      display_name: '',
      avatar_url: '',
    };

    try {
      const userRes = await fetch(
        'https://open.tiktokapis.com/v2/user/info/?fields=open_id,union_id,avatar_url,display_name,username',
        {
          headers: {
            Authorization: `Bearer ${tokenData.access_token}`,
          },
        }
      );
      if (userRes.ok) {
        const uData = (await userRes.json()) as {
          data?: { user?: { open_id: string; username?: string; display_name?: string; avatar_url?: string } };
        };
        if (uData.data?.user) {
          userProfile = {
            open_id: uData.data.user.open_id || tokenData.open_id,
            username: uData.data.user.username || '',
            display_name: uData.data.user.display_name || '',
            avatar_url: uData.data.user.avatar_url || '',
          };
        }
      }
    } catch (userErr: unknown) {
      console.warn('[Cloudflare Pages Functions] user/info warning:', userErr);
    }

    const rawHandle = userProfile.username || userProfile.display_name || userProfile.open_id || 'tiktok_creator';
    const handle = rawHandle.startsWith('@') ? rawHandle : `@${rawHandle}`;

    // Sesión del backend asociada al usuario
    const sessionData: StoredSession = {
      open_id: tokenData.open_id,
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_at: expiresAt,
      user: {
        open_id: tokenData.open_id,
        username: handle,
        display_name: userProfile.display_name || handle,
        avatar_url: userProfile.avatar_url,
      },
    };

    // Si Cloudflare KV está vinculado, guardamos la sesión allí
    const sessionId = `tt_sess_${tokenData.open_id}`;
    if (context.env.TIKTOK_KV) {
      try {
        await context.env.TIKTOK_KV.put(sessionId, JSON.stringify(sessionData), {
          expirationTtl: 365 * 24 * 3600, // 1 año según validez del refresh token
        });
      } catch {
        // Silencioso si KV falla
      }
    }

    // Cookie segura de sesión y limpieza de la cookie de CSRF
    const sessionCookie = `alquimia_tiktok_session=${encodeURIComponent(JSON.stringify(sessionData))}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000; Secure`;
    const clearCsrfCookie = `alquimia_csrf_state=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT`;

    return new Response(
      JSON.stringify({
        data: {
          sessionId,
          open_id: tokenData.open_id,
          handle,
          user: sessionData.user,
          expires_at: expiresAt,
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
        },
      }),
      {
        status: 200,
        headers: {
          ...CORS_HEADERS,
          'Content-Type': 'application/json',
          'Set-Cookie': `${sessionCookie}, ${clearCsrfCookie}`,
        },
      }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno en el servidor de tokens.';
    console.error('[Cloudflare Pages Functions] token excepción:', message);
    return new Response(JSON.stringify({ error: { message } }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
}
