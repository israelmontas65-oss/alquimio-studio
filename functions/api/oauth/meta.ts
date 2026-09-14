// ============================================================
// functions/api/oauth/meta.ts
// Cloudflare Pages Function: OAuth 2.0 Handler para Meta (Facebook, Instagram & Threads)
// Intercambio oficial por Long-Lived Token (60 días) en Graph API v21.0
// Cifrado estricto en backend (AES-256-GCM) — Cero tokens expuestos al cliente
// ============================================================

import { saveEncryptedSession } from '../../shared/session-store';

interface Env {
  META_APP_ID?: string;
  META_APP_SECRET?: string;
  META_STATE_SECRET?: string;
  EXPO_PUBLIC_META_APP_ID?: string;
  EXPO_PUBLIC_META_APP_SECRET?: string;
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

    const signingSecret = context.env.META_STATE_SECRET || appSecret || appId;
    const isValidHmac = await verifySignedState(state, signingSecret);
    if (!isValidHmac) {
      return new Response(
        JSON.stringify({ error: { message: 'Estado de seguridad (CSRF) inválido o expirado.' } }),
        { status: 403, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    // Validación atómica en KV (One-Time Use)
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

    const redirectUri = (body.redirect_uri || '').trim();

    // 1. Canjear código por Token de Corta Duración (1 hora)
    // Documentación oficial: Meta Graph API v21.0
    const tokenUrl = new URL('https://graph.facebook.com/v21.0/oauth/access_token');
    tokenUrl.searchParams.set('client_id', appId);
    tokenUrl.searchParams.set('client_secret', appSecret);
    tokenUrl.searchParams.set('redirect_uri', redirectUri);
    tokenUrl.searchParams.set('code', body.code);

    const tokenRes = await fetch(tokenUrl.toString());
    const tokenData = (await tokenRes.json()) as any;

    if (!tokenRes.ok || tokenData.error) {
      const msg = tokenData.error?.message || 'Error al canjear código con Meta Graph API v21.0.';
      return new Response(
        JSON.stringify({ error: { code: 'META_TOKEN_ERROR', message: msg } }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    const shortLivedToken = tokenData.access_token;

    // 2. Intercambio OBLIGATORIO por Long-Lived Token (60 días)
    const longLivedUrl = new URL('https://graph.facebook.com/v21.0/oauth/access_token');
    longLivedUrl.searchParams.set('grant_type', 'fb_exchange_token');
    longLivedUrl.searchParams.set('client_id', appId);
    longLivedUrl.searchParams.set('client_secret', appSecret);
    longLivedUrl.searchParams.set('fb_exchange_token', shortLivedToken);

    const longLivedRes = await fetch(longLivedUrl.toString());
    const longLivedData = (await longLivedRes.json()) as any;

    const userToken = longLivedData.access_token || shortLivedToken;
    const expiresIn = longLivedData.expires_in || 5184000; // ~60 días en segundos
    const expiresAt = Date.now() + expiresIn * 1000;

    // 3. Obtener perfil de usuario en v21.0
    const meRes = await fetch(`https://graph.facebook.com/v21.0/me?fields=id,name&access_token=${userToken}`);
    const meData = (await meRes.json()) as any;

    // 4. Obtener Páginas de Facebook y Cuentas de Instagram Business vinculadas
    const accountsRes = await fetch(
      `https://graph.facebook.com/v21.0/me/accounts?fields=id,name,access_token,category,instagram_business_account{id,username,name,profile_picture_url}&access_token=${userToken}`
    );
    const accountsData = (await accountsRes.json()) as any;
    const pages = accountsData.data || [];

    let selectedPage: any = null;
    let selectedInstagram: any = null;

    if (pages.length > 0) {
      selectedPage = pages[0];
      for (const p of pages) {
        if (p.instagram_business_account) {
          selectedPage = p;
          selectedInstagram = p.instagram_business_account;
          break;
        }
      }
    }

    // 5. Cifrado en Reposo (AES-256-GCM) en el Backend
    // Guardar tokens cifrados de usuario, página e Instagram
    const { cookieHeader } = await saveEncryptedSession(context.env, {
      platform: 'meta',
      userId: meData.id,
      accountName: selectedPage?.name || meData.name || 'Meta User',
      accessToken: userToken,
      expiresAt,
      scopes: [
        'instagram_basic',
        'instagram_content_publish',
        'pages_show_list',
        'pages_manage_posts',
        'pages_read_engagement',
        'business_management',
      ],
      metadata: {
        pageId: selectedPage?.id,
        pageName: selectedPage?.name,
        pageAccessToken: selectedPage?.access_token,
        instagramId: selectedInstagram?.id,
        instagramUsername: selectedInstagram?.username,
      },
    });

    // 6. RESPUESTA ESTRICTA AL CLIENTE:
    // Solo estado de conexión (connected: true), metadatos públicos de cuenta y NUNCA tokens
    return new Response(
      JSON.stringify({
        connected: true,
        platform: 'meta',
        userId: meData.id,
        displayName: selectedPage?.name || meData.name || 'Meta Account',
        facebookPage: selectedPage
          ? { id: selectedPage.id, name: selectedPage.name }
          : null,
        instagram: selectedInstagram
          ? { id: selectedInstagram.id, username: `@${selectedInstagram.username}` }
          : null,
        expiresAt,
        scopes: [
          'instagram_basic',
          'instagram_content_publish',
          'pages_show_list',
          'pages_manage_posts',
          'pages_read_engagement',
          'business_management',
        ],
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
    const message = err instanceof Error ? err.message : 'Error al procesar OAuth de Meta.';
    console.error('[oauth:meta] Excepción:', message);
    return new Response(JSON.stringify({ error: { message } }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
}
