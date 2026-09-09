// ============================================================
// functions/api/tiktok/token.ts
// Cloudflare Pages Function: Intercambio y refresco de tokens TikTok v2
// Credenciales resguardadas 100% en el servidor (TIKTOK_CLIENT_KEY y TIKTOK_CLIENT_SECRET)
// Los tokens se almacenan y asocian a la sesión del usuario en el backend
// ============================================================

interface Env {
  EXPO_PUBLIC_TIKTOK_CLIENT_KEY?: string;
  EXPO_PUBLIC_TIKTOK_CLIENT_SECRET?: string;
  TIKTOK_CLIENT_KEY?: string;
  TIKTOK_CLIENT_SECRET?: string;
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

export async function onRequestPost(context: { request: Request; env: Env }): Promise<Response> {
  try {
    const body = (await context.request.json()) as {
      code?: string;
      code_verifier?: string;
      redirect_uri?: string;
      grant_type?: string;
      refresh_token?: string;
    };

    // Resguardo absoluto: Credenciales SOLO del entorno del servidor
    const clientKey =
      context.env.TIKTOK_CLIENT_KEY ||
      context.env.EXPO_PUBLIC_TIKTOK_CLIENT_KEY ||
      '';

    const clientSecret =
      context.env.TIKTOK_CLIENT_SECRET ||
      context.env.EXPO_PUBLIC_TIKTOK_CLIENT_SECRET ||
      '';

    if (!clientKey) {
      return new Response(
        JSON.stringify({
          error: {
            message:
              'Falta TIKTOK_CLIENT_KEY en las variables del servidor Cloudflare Pages. Por favor configúralo en Cloudflare.',
          },
        }),
        { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    const grantType = body.grant_type || 'authorization_code';
    const params = new URLSearchParams();
    params.append('client_key', clientKey);
    if (clientSecret) {
      params.append('client_secret', clientSecret);
    }
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
      return new Response(JSON.stringify({ error: { message: errMsg } }), {
        status: tiktokRes.status >= 400 ? tiktokRes.status : 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const tokenData = data.data;
    const expiresAt = Date.now() + (tokenData.expires_in || 86400) * 1000;

    // Obtener perfil del usuario desde TikTok API v2 en el backend
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
    } catch {
      // Perfil fallback si user/info tiene restricciones
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

    // Cookie segura de sesión (HttpOnly, SameSite=Lax)
    const cookieValue = encodeURIComponent(JSON.stringify(sessionData));
    const setCookieHeader = `alquimia_tiktok_session=${cookieValue}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000; Secure`;

    // Respuesta al cliente: NO se envían client_key ni client_secret.
    // Se devuelve el sessionId, perfil real (@usuario) y access_token para compatibilidad de adaptador
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
          'Set-Cookie': setCookieHeader,
        },
      }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno en el servidor de tokens.';
    return new Response(JSON.stringify({ error: { message } }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
}
