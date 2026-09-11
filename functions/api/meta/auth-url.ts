// ============================================================
// functions/api/meta/auth-url.ts
// Cloudflare Pages Function: Genera la URL de autorización oficial de Meta (Facebook & Instagram)
// Protección Anti-CSRF criptográfica con HMAC-SHA256 y TTL de 10 minutos
// ============================================================

interface Env {
  META_APP_ID?: string;
  META_APP_SECRET?: string;
  META_STATE_SECRET?: string;
  EXPO_PUBLIC_META_APP_ID?: string;
  EXPO_PUBLIC_META_APP_SECRET?: string;
  META_KV?: {
    put: (key: string, value: string, options?: { expirationTtl?: number }) => Promise<void>;
  };
  ALQUIMIA_KV?: {
    put: (key: string, value: string, options?: { expirationTtl?: number }) => Promise<void>;
  };
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Alquimia-Session',
  'Access-Control-Allow-Credentials': 'true',
};

const META_AUTH_URL = 'https://www.facebook.com/v19.0/dialog/oauth';
const DEFAULT_META_SCOPES = [
  'pages_show_list',
  'pages_manage_posts',
  'pages_read_engagement',
  'instagram_basic',
  'instagram_content_publish',
].join(',');

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
    const forceLogin = url.searchParams.get('force_login') === 'true';
    const customScope = url.searchParams.get('scope');
    const redirectUri = (url.searchParams.get('redirect_uri') || `${url.origin}/oauth/meta`).trim();

    // 1. Lectura de credenciales en variables de entorno
    const appId = (
      context.env.META_APP_ID ||
      context.env.EXPO_PUBLIC_META_APP_ID ||
      ''
    ).trim();

    const appSecret = (
      context.env.META_APP_SECRET ||
      context.env.EXPO_PUBLIC_META_APP_SECRET ||
      ''
    ).trim();

    if (!appId) {
      console.error('[Meta auth-url] Falta la variable de entorno META_APP_ID.');
      return new Response(
        JSON.stringify({
          error: {
            code: 'MISSING_META_APP_ID',
            message:
              'Falta configurar la variable META_APP_ID en las variables de entorno de Cloudflare Pages.',
          },
        }),
        { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    const signingSecret =
      context.env.META_STATE_SECRET ||
      appSecret ||
      appId ||
      'alquimia_meta_csrf_salt';

    // 2. Generar state firmado criptográficamente
    const signedState = await generateSignedState(signingSecret);

    // 3. Registrar en Cloudflare KV para consumo atómico único (TTL de 600 segundos)
    const kv = context.env.META_KV || context.env.ALQUIMIA_KV;
    if (kv) {
      try {
        await kv.put(`oauth_state:${signedState}`, 'active', {
          expirationTtl: 600,
        });
      } catch (kvErr) {
        console.warn('[Meta auth-url] Advertencia al escribir state en KV:', kvErr);
      }
    }

    // 4. Configurar cookie segura de CSRF
    const csrfCookie = `alquimia_meta_csrf_state=${encodeURIComponent(signedState)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600; Secure`;
    const scopesToRequest = (customScope || DEFAULT_META_SCOPES).trim();

    const params = new URLSearchParams();
    params.append('client_id', appId);
    params.append('redirect_uri', redirectUri);
    params.append('state', signedState);
    params.append('response_type', 'code');
    params.append('scope', scopesToRequest);

    if (forceLogin) {
      params.append('auth_type', 'rerequest');
    }

    const authorizationUrl = `${META_AUTH_URL}?${params.toString()}`;

    return new Response(
      JSON.stringify({
        data: {
          authorizationUrl,
          appId,
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
    const message = err instanceof Error ? err.message : 'Error al generar URL de autorización de Meta.';
    console.error('[Meta auth-url] Excepción:', message);
    return new Response(JSON.stringify({ error: { message } }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
}
