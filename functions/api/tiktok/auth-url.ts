// ============================================================
// functions/api/tiktok/auth-url.ts
// Cloudflare Pages Function: Genera la URL de autorización oficial de TikTok
// Resguarda el Client Key en el servidor y soporta forzar selector de cuenta (prompt=login)
// ============================================================

interface Env {
  TIKTOK_CLIENT_KEY?: string;
  EXPO_PUBLIC_TIKTOK_CLIENT_KEY?: string;
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const TIKTOK_AUTH_URL = 'https://www.tiktok.com/v2/auth/authorize/';
const TIKTOK_SCOPES = 'user.info.basic,user.info.profile,video.publish,video.upload';

export async function onRequestOptions(): Promise<Response> {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

export async function onRequestGet(context: { request: Request; env: Env }): Promise<Response> {
  try {
    const url = new URL(context.request.url);
    const state = url.searchParams.get('state');
    const codeChallenge = url.searchParams.get('code_challenge');
    const forceLogin = url.searchParams.get('force_login') === 'true';
    let redirectUri = url.searchParams.get('redirect_uri');

    if (!redirectUri) {
      const origin = url.origin;
      redirectUri = `${origin}/oauth/tiktok`;
    }

    const clientKey = context.env.TIKTOK_CLIENT_KEY || context.env.EXPO_PUBLIC_TIKTOK_CLIENT_KEY || '';

    if (!clientKey) {
      return new Response(
        JSON.stringify({
          error: {
            message:
              'Falta configurar TIKTOK_CLIENT_KEY en las variables de entorno del servidor Cloudflare Pages.',
          },
        }),
        { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    const params = new URLSearchParams({
      client_key: clientKey,
      scope: TIKTOK_SCOPES,
      response_type: 'code',
      redirect_uri: redirectUri,
    });

    if (state) params.append('state', state);
    if (codeChallenge) {
      params.append('code_challenge', codeChallenge);
      params.append('code_challenge_method', 'S256');
    }

    // Si el usuario solicita iniciar sesión con otra cuenta, forzamos el login/selector
    if (forceLogin) {
      params.append('prompt', 'login');
      params.append('force_web_auth', '1');
    }

    const authorizationUrl = `${TIKTOK_AUTH_URL}?${params.toString()}`;

    return new Response(
      JSON.stringify({
        data: {
          authorizationUrl,
          clientKey,
        },
      }),
      { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error al generar URL de autorización.';
    return new Response(JSON.stringify({ error: { message } }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
}
