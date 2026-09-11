// ============================================================
// functions/api/tiktok/auth-url.ts
// Cloudflare Pages Function: Genera la URL de autorización oficial de TikTok
// Protección Anti-CSRF criptográfica con HMAC-SHA256 y TTL corto (10 min)
// Resguarda el Client Key en el servidor y soporta selector de cuenta (prompt=login)
// ============================================================

interface Env {
  TIKTOK_CLIENT_KEY?: string;
  TIKTOK_CLIENT_SECRET?: string;
  TIKTOK_STATE_SECRET?: string;
  EXPO_PUBLIC_TIKTOK_CLIENT_KEY?: string;
  EXPO_PUBLIC_TIKTOK_CLIENT_SECRET?: string;
  TIKTOK_KV?: {
    put: (key: string, value: string, options?: { expirationTtl?: number }) => Promise<void>;
  };
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Alquimia-Session',
  'Access-Control-Allow-Credentials': 'true',
};

const TIKTOK_AUTH_URL = 'https://www.tiktok.com/v2/auth/authorize/';
const DEFAULT_TIKTOK_SCOPES = 'user.info.basic,user.info.profile,video.publish,video.upload';

export async function onRequestOptions(): Promise<Response> {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

// ── Firma criptográfica HMAC-SHA256 para Anti-CSRF ───────────
async function generateSignedState(secret: string): Promise<string> {
  const nonceBytes = new Uint8Array(16);
  crypto.getRandomValues(nonceBytes);
  const nonce = Array.from(nonceBytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  const timestamp = Date.now();

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
  const signatureHex = Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  return `${nonce}.${timestamp}.${signatureHex}`;
}

export async function onRequestGet(context: { request: Request; env: Env }): Promise<Response> {
  try {
    const url = new URL(context.request.url);
    const codeChallenge = url.searchParams.get('code_challenge');
    const forceLogin = url.searchParams.get('force_login') === 'true';
    const customScope = url.searchParams.get('scope');
    let redirectUri = (url.searchParams.get('redirect_uri') || `${url.origin}/oauth/tiktok`).trim();

    // ── 1. Lectura estricta y saneada (.trim()) de variables de entorno ─
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
      console.error('[Cloudflare Pages Functions] auth-url: Falta la variable de entorno TIKTOK_CLIENT_KEY.');
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
      console.warn('[Cloudflare Pages Functions] auth-url: Falta TIKTOK_CLIENT_SECRET (recomendado para firma HMAC de CSRF).');
    }

    const signingSecret =
      context.env.TIKTOK_STATE_SECRET ||
      clientSecret ||
      clientKey ||
      'alquimia_csrf_default_salt';

    // 2. Generar state único y firmado criptográficamente
    const signedState = await generateSignedState(signingSecret);

    // 3. Guardar en Cloudflare KV temporalmente (TTL de 600 segundos = 10 minutos)
    const kv = context.env.TIKTOK_KV || (context.env as any).ALQUIMIA_KV;
    if (kv) {
      try {
        await kv.put(`csrf:${signedState}`, 'active', { expirationTtl: 600 });
        await kv.put(`oauth_state:${signedState}`, 'active', { expirationTtl: 600 });
      } catch {
        // Continuar con cookie firmada si KV falla
      }
    }

    // 4. Configurar cookie segura de CSRF state (Max-Age 600s = 10 min)
    const csrfCookie = `alquimia_csrf_state=${encodeURIComponent(signedState)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600; Secure`;

    const scopesToRequest = (customScope || DEFAULT_TIKTOK_SCOPES).trim();

    const params = new URLSearchParams();
    params.append('client_key', clientKey);
    params.append('scope', scopesToRequest);
    params.append('response_type', 'code');
    params.append('redirect_uri', redirectUri);
    params.append('state', signedState);

    if (codeChallenge) {
      params.append('code_challenge', codeChallenge);
      params.append('code_challenge_method', 'S256');
    }

    // Si el usuario solicita iniciar sesión con otra cuenta, forzamos el selector
    if (forceLogin) {
      params.append('prompt', 'login');
      params.append('force_web_auth', '1');
    }

    // CRÍTICO: TikTok API v2 Login Kit requiere que los scopes se separen por comas literales ','
    // Si URLSearchParams codifica la coma como %2C, el parser de TikTok la interpreta como un único scope inexistente
    // y devuelve el error: "probablemente debido a ajustes específicos de la aplicación: client_key"
    const authorizationUrl = `${TIKTOK_AUTH_URL}?${params.toString()}`.replace(/%2C/g, ',');

    return new Response(
      JSON.stringify({
        data: {
          authorizationUrl,
          clientKey,
          state: signedState,
          redirectUri,
          scopes: scopesToRequest,
        },
      }),
      {
        status: 200,
        headers: {
          ...CORS_HEADERS,
          'Content-Type': 'application/json',
          'Set-Cookie': csrfCookie,
        },
      }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error al generar URL de autorización.';
    console.error('[Cloudflare Pages Functions] auth-url excepción:', message);
    return new Response(JSON.stringify({ error: { message } }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
}
