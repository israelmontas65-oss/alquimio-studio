// ============================================================
// functions/api/tiktok/token.ts
// Cloudflare Pages Function: Proxy para intercambio y refresco de tokens TikTok v2
// Elimina problemas de CORS del navegador y resguarda el client_secret
// ============================================================

interface Env {
  EXPO_PUBLIC_TIKTOK_CLIENT_KEY?: string;
  EXPO_PUBLIC_TIKTOK_CLIENT_SECRET?: string;
  TIKTOK_CLIENT_KEY?: string;
  TIKTOK_CLIENT_SECRET?: string;
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
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
      client_key?: string;
      client_secret?: string;
    };

    const clientKey =
      context.env.TIKTOK_CLIENT_KEY ||
      context.env.EXPO_PUBLIC_TIKTOK_CLIENT_KEY ||
      body.client_key ||
      '';

    const clientSecret =
      context.env.TIKTOK_CLIENT_SECRET ||
      context.env.EXPO_PUBLIC_TIKTOK_CLIENT_SECRET ||
      body.client_secret ||
      '';

    if (!clientKey) {
      return new Response(
        JSON.stringify({ error: { message: 'Falta client_key en el servidor y en la petición.' } }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
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
          JSON.stringify({ error: { message: 'Falta el refresh_token.' } }),
          { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
        );
      }
      params.append('refresh_token', body.refresh_token);
    }

    const tiktokRes = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cache-Control': 'no-cache',
      },
      body: params.toString(),
    });

    const data = await tiktokRes.text();

    return new Response(data, {
      status: tiktokRes.status,
      headers: {
        ...CORS_HEADERS,
        'Content-Type': 'application/json',
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno en el proxy de token.';
    return new Response(JSON.stringify({ error: { message } }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
}
