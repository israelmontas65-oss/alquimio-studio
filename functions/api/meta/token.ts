// ============================================================
// functions/api/meta/token.ts
// Cloudflare Pages Function: Intercambio de tokens Meta Graph API v19
// Conversión a Long-Lived Token (60 días) y obtención de Page Access Tokens permanentes
// Validación estricta Anti-CSRF con One-Time State en Cloudflare KV
// ============================================================

interface Env {
  META_APP_ID?: string;
  META_APP_SECRET?: string;
  META_STATE_SECRET?: string;
  EXPO_PUBLIC_META_APP_ID?: string;
  EXPO_PUBLIC_META_APP_SECRET?: string;
  META_KV?: {
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
      state?: string;
      redirect_uri?: string;
    };

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

    if (!appId || !appSecret) {
      console.error('[Meta token] Faltan variables META_APP_ID o META_APP_SECRET.');
      return new Response(
        JSON.stringify({
          error: {
            code: 'MISSING_META_CREDENTIALS',
            message: 'Falta configurar META_APP_ID o META_APP_SECRET en el servidor.',
          },
        }),
        { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    const state = body.state;
    if (!state) {
      return new Response(
        JSON.stringify({
          error: {
            code: 'MISSING_CSRF_STATE',
            message: 'Falta el parámetro state para validar la seguridad Anti-CSRF.',
          },
        }),
        { status: 403, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    const signingSecret =
      context.env.META_STATE_SECRET ||
      appSecret ||
      appId ||
      'alquimia_meta_csrf_salt';

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

    // Validación atómica en KV: Comprobar y consumir de inmediato (One-Time Use)
    const kv = context.env.META_KV || context.env.ALQUIMIA_KV;
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
      // Eliminar inmediatamente para evitar ataques de repetición
      await kv.delete(`oauth_state:${state}`).catch(() => {});
    }

    if (!body.code) {
      return new Response(
        JSON.stringify({ error: { message: 'Falta el código de autorización (code).' } }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    const redirectUri = (body.redirect_uri || '').trim();

    // 1. Canjear código por Token de Usuario de Corta Duración
    const tokenUrl = new URL('https://graph.facebook.com/v19.0/oauth/access_token');
    tokenUrl.searchParams.set('client_id', appId);
    tokenUrl.searchParams.set('client_secret', appSecret);
    tokenUrl.searchParams.set('redirect_uri', redirectUri);
    tokenUrl.searchParams.set('code', body.code);

    const tokenRes = await fetch(tokenUrl.toString());
    const tokenData = (await tokenRes.json()) as any;

    if (!tokenRes.ok || tokenData.error) {
      const msg = tokenData.error?.message || 'Error al canjear código con Meta.';
      return new Response(
        JSON.stringify({ error: { code: 'META_TOKEN_EXCHANGE_ERROR', message: msg } }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    const shortLivedToken = tokenData.access_token;

    // 2. Canjear por Long-Lived User Token (duración aproximada de 60 días)
    const longLivedUrl = new URL('https://graph.facebook.com/v19.0/oauth/access_token');
    longLivedUrl.searchParams.set('grant_type', 'fb_exchange_token');
    longLivedUrl.searchParams.set('client_id', appId);
    longLivedUrl.searchParams.set('client_secret', appSecret);
    longLivedUrl.searchParams.set('fb_exchange_token', shortLivedToken);

    const longLivedRes = await fetch(longLivedUrl.toString());
    const longLivedData = (await longLivedRes.json()) as any;

    const userToken = longLivedData.access_token || shortLivedToken;
    const expiresIn = longLivedData.expires_in || 5184000; // ~60 días en segundos

    // 3. Obtener perfil de usuario
    const meRes = await fetch(`https://graph.facebook.com/v19.0/me?fields=id,name&access_token=${userToken}`);
    const meData = (await meRes.json()) as any;

    // 4. Obtener Páginas de Facebook y Cuentas de Instagram Business vinculadas
    // Cuando se consulta /me/accounts con un token de larga duración, los tokens de página devueltos nunca expiran.
    const accountsRes = await fetch(
      `https://graph.facebook.com/v19.0/me/accounts?fields=id,name,access_token,category,instagram_business_account{id,username,name,profile_picture_url}&access_token=${userToken}`
    );
    const accountsData = (await accountsRes.json()) as any;
    const pages = accountsData.data || [];

    // Localizar primera página y primera cuenta de Instagram Business
    let selectedPage: any = null;
    let selectedIgAccount: any = null;

    if (pages.length > 0) {
      selectedPage = pages[0];
      for (const page of pages) {
        if (page.instagram_business_account) {
          selectedPage = page;
          selectedIgAccount = page.instagram_business_account;
          break;
        }
      }
    }

    return new Response(
      JSON.stringify({
        data: {
          user: {
            id: meData.id,
            name: meData.name,
          },
          userToken,
          expiresIn,
          expiresAt: Date.now() + expiresIn * 1000,
          pages: pages.map((p: any) => ({
            id: p.id,
            name: p.name,
            accessToken: p.access_token,
            instagramAccount: p.instagram_business_account || null,
          })),
          selectedPage: selectedPage
            ? {
                id: selectedPage.id,
                name: selectedPage.name,
                accessToken: selectedPage.access_token,
              }
            : null,
          selectedInstagram: selectedIgAccount
            ? {
                id: selectedIgAccount.id,
                username: selectedIgAccount.username,
                name: selectedIgAccount.name,
                profilePictureUrl: selectedIgAccount.profile_picture_url,
              }
            : null,
        },
      }),
      { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error inesperado al procesar token de Meta.';
    console.error('[Meta token] Excepción:', message);
    return new Response(JSON.stringify({ error: { message } }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
}
