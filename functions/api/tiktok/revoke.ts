// ============================================================
// functions/api/tiktok/revoke.ts
// Cloudflare Pages Function: Revocación oficial de token TikTok v2 en backend
// ============================================================

interface Env {
  EXPO_PUBLIC_TIKTOK_CLIENT_KEY?: string;
  EXPO_PUBLIC_TIKTOK_CLIENT_SECRET?: string;
  TIKTOK_CLIENT_KEY?: string;
  TIKTOK_CLIENT_SECRET?: string;
  TIKTOK_KV?: {
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

export async function onRequestPost(context: { request: Request; env: Env }): Promise<Response> {
  try {
    const body = (await context.request.json()) as {
      token?: string;
      session_id?: string;
    };

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
      console.warn('[Cloudflare Pages Functions] revoke: TIKTOK_CLIENT_KEY no configurado, revocación remota omitida.');
    }
    if (!clientSecret) {
      console.warn('[Cloudflare Pages Functions] revoke: TIKTOK_CLIENT_SECRET no configurado, revocación remota omitida.');
    }

    if (body.token && clientKey && clientSecret) {
      const params = new URLSearchParams();
      params.append('client_key', clientKey);
      params.append('client_secret', clientSecret);
      params.append('token', body.token);

      await fetch('https://open.tiktokapis.com/v2/oauth/revoke/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      }).catch((err) => {
        console.warn('[Cloudflare Pages Functions] revoke: Fallo en llamada remota de revocación:', err);
      });
    }

    // Borrar de KV si existe
    if (context.env.TIKTOK_KV && body.session_id) {
      try {
        await context.env.TIKTOK_KV.delete(body.session_id);
      } catch {
        // Silencioso
      }
    }

    // Borrar cookie en el navegador
    const clearCookieHeader =
      'alquimia_tiktok_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT';

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        ...CORS_HEADERS,
        'Content-Type': 'application/json',
        'Set-Cookie': clearCookieHeader,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error al revocar token en TikTok.';
    console.error('[Cloudflare Pages Functions] revoke excepción:', message);
    return new Response(JSON.stringify({ error: { message } }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
}
