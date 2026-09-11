// ============================================================
// functions/api/youtube/auth-url.ts
// Cloudflare Pages Function: Genera la URL de autorización oficial de Google / YouTube Data API v3
// Protección Anti-CSRF criptográfica con HMAC-SHA256, TTL 10 min y acceso offline (refresh token)
// ============================================================

interface Env {
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  GOOGLE_STATE_SECRET?: string;
  EXPO_PUBLIC_GOOGLE_CLIENT_ID?: string;
  EXPO_PUBLIC_GOOGLE_CLIENT_SECRET?: string;
  YOUTUBE_KV?: {
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

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const DEFAULT_YOUTUBE_SCOPES = [
  'https://www.googleapis.com/auth/youtube.upload',
  'https://www.googleapis.com/auth/youtube.readonly',
].join(' ');

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
    const redirectUri = (url.searchParams.get('redirect_uri') || `${url.origin}/oauth/youtube`).trim();

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

    if (!clientId) {
      console.error('[YouTube auth-url] Falta la variable GOOGLE_CLIENT_ID.');
      return new Response(
        JSON.stringify({
          error: {
            code: 'MISSING_GOOGLE_CLIENT_ID',
            message:
              'Falta configurar la variable GOOGLE_CLIENT_ID en las variables de entorno de Cloudflare Pages.',
          },
        }),
        { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    const signingSecret =
      context.env.GOOGLE_STATE_SECRET ||
      clientSecret ||
      clientId ||
      'alquimia_youtube_csrf_salt';

    const signedState = await generateSignedState(signingSecret);

    const kv = context.env.YOUTUBE_KV || context.env.ALQUIMIA_KV;
    if (kv) {
      try {
        await kv.put(`oauth_state:${signedState}`, 'active', {
          expirationTtl: 600,
        });
      } catch (kvErr) {
        console.warn('[YouTube auth-url] Advertencia al escribir state en KV:', kvErr);
      }
    }

    const csrfCookie = `alquimia_youtube_csrf_state=${encodeURIComponent(signedState)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600; Secure`;

    const params = new URLSearchParams();
    params.append('client_id', clientId);
    params.append('redirect_uri', redirectUri);
    params.append('response_type', 'code');
    params.append('scope', DEFAULT_YOUTUBE_SCOPES);
    params.append('access_type', 'offline'); // Obligatorio para recibir refresh_token
    params.append('prompt', forceLogin ? 'select_account consent' : 'consent');
    params.append('include_granted_scopes', 'true');
    params.append('state', signedState);

    const authorizationUrl = `${GOOGLE_AUTH_URL}?${params.toString()}`;

    return new Response(
      JSON.stringify({
        data: {
          authorizationUrl,
          clientId,
          state: signedState,
          redirectUri,
          scopes: DEFAULT_YOUTUBE_SCOPES,
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
    const message = err instanceof Error ? err.message : 'Error al generar URL de autorización de Google / YouTube.';
    console.error('[YouTube auth-url] Excepción:', message);
    return new Response(JSON.stringify({ error: { message } }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
}
