// ============================================================
// functions/api/tiktok/session.ts
// Cloudflare Pages Function: Consulta y validación de sesión TikTok en backend
// ============================================================

interface Env {
  TIKTOK_CLIENT_KEY?: string;
  TIKTOK_CLIENT_SECRET?: string;
  EXPO_PUBLIC_TIKTOK_CLIENT_KEY?: string;
  EXPO_PUBLIC_TIKTOK_CLIENT_SECRET?: string;
  TIKTOK_KV?: {
    get: (key: string) => Promise<string | null>;
    put: (key: string, value: string, options?: { expirationTtl?: number }) => Promise<void>;
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
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
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

export async function onRequestGet(context: { request: Request; env: Env }): Promise<Response> {
  try {
    const url = new URL(context.request.url);
    const sessionIdParam =
      url.searchParams.get('session_id') ||
      context.request.headers.get('X-Alquimia-Session');

    let session: StoredSession | null = null;

    // 1. Buscar en KV si está disponible y hay session_id
    if (context.env.TIKTOK_KV && sessionIdParam) {
      try {
        const raw = await context.env.TIKTOK_KV.get(sessionIdParam);
        if (raw) session = JSON.parse(raw);
      } catch {
        // Fallback a cookie
      }
    }

    // 2. Buscar en Cookie si no se encontró en KV
    if (!session) {
      const cookieHeader = context.request.headers.get('Cookie');
      const cookieRaw = parseCookie(cookieHeader, 'alquimia_tiktok_session');
      if (cookieRaw) {
        try {
          session = JSON.parse(cookieRaw);
        } catch {
          // Ignorar cookie corrupta
        }
      }
    }

    if (!session || !session.access_token) {
      return new Response(
        JSON.stringify({ data: { isConnected: false } }),
        { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    const now = Date.now();
    // Si quedan menos de 5 minutos y tenemos refresh_token, refrescamos en backend
    if (session.expires_at - now < 300_000 && session.refresh_token) {
      const clientKey =
        context.env.TIKTOK_CLIENT_KEY ||
        context.env.EXPO_PUBLIC_TIKTOK_CLIENT_KEY ||
        '';
      const clientSecret =
        context.env.TIKTOK_CLIENT_SECRET ||
        context.env.EXPO_PUBLIC_TIKTOK_CLIENT_SECRET ||
        '';

      if (!clientKey) {
        console.warn('[Cloudflare Pages Functions] session: Auto-refresh omitido porque falta TIKTOK_CLIENT_KEY.');
      }
      if (!clientSecret) {
        console.warn('[Cloudflare Pages Functions] session: Auto-refresh omitido porque falta TIKTOK_CLIENT_SECRET.');
      }

      if (clientKey && clientSecret) {
        const refreshParams = new URLSearchParams({
          client_key: clientKey,
          client_secret: clientSecret,
          grant_type: 'refresh_token',
          refresh_token: session.refresh_token,
        });

        const refreshRes = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: refreshParams.toString(),
        });

        if (refreshRes.ok) {
          const rData = (await refreshRes.json()) as {
            data?: { access_token: string; refresh_token?: string; expires_in?: number };
          };
          if (rData.data?.access_token) {
            session.access_token = rData.data.access_token;
            if (rData.data.refresh_token) session.refresh_token = rData.data.refresh_token;
            session.expires_at = now + (rData.data.expires_in || 86400) * 1000;

            if (context.env.TIKTOK_KV && sessionIdParam) {
              await context.env.TIKTOK_KV.put(sessionIdParam, JSON.stringify(session));
            }
          }
        } else {
          console.warn('[Cloudflare Pages Functions] session: Error al refrescar token en TikTok:', refreshRes.status);
        }
      }
    }

    return new Response(
      JSON.stringify({
        data: {
          isConnected: true,
          open_id: session.open_id,
          user: session.user,
          expires_at: session.expires_at,
          access_token: session.access_token,
        },
      }),
      { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error al consultar sesión.';
    console.error('[Cloudflare Pages Functions] session excepción:', message);
    return new Response(JSON.stringify({ error: { message } }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
}
