// ============================================================
// functions/api/oauth/session.ts
// Cloudflare Pages Function: Consulta y revocación de sesiones OAuth
// Devuelve ÚNICAMENTE el estado público (connected: true/false, handles)
// Cero exposición de tokens de acceso al frontend
// ============================================================

import { getDecryptedSession } from '../../shared/session-store';

interface Env {
  SECURITY_MASTER_KEY?: string;
  ALQUIMIA_KV?: {
    put: (key: string, value: string, options?: { expirationTtl?: number }) => Promise<void>;
    get: (key: string) => Promise<string | null>;
    delete: (key: string) => Promise<void>;
  };
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Alquimia-Session',
  'Access-Control-Allow-Credentials': 'true',
};

export async function onRequestOptions(): Promise<Response> {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function onRequestGet(context: { request: Request; env: Env }): Promise<Response> {
  const url = new URL(context.request.url);
  const platform = url.searchParams.get('platform') as 'meta' | 'tiktok' | 'youtube' | null;

  if (platform && ['meta', 'tiktok', 'youtube'].includes(platform)) {
    const session = await getDecryptedSession(context.env as any, platform, context.request);
    if (session) {
      return new Response(
        JSON.stringify({
          connected: true,
          platform: session.platform,
          userId: session.userId,
          displayName: session.accountName || session.userId,
          expiresAt: session.expiresAt,
          scopes: session.scopes,
          metadata: session.metadata,
        }),
        { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ connected: false, platform }),
      { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  }

  // Si no se pasa plataforma, consultar todas las 3 plataformas
  const [metaSession, tiktokSession, youtubeSession] = await Promise.all([
    getDecryptedSession(context.env as any, 'meta', context.request),
    getDecryptedSession(context.env as any, 'tiktok', context.request),
    getDecryptedSession(context.env as any, 'youtube', context.request),
  ]);

  return new Response(
    JSON.stringify({
      meta: metaSession
        ? {
            connected: true,
            userId: metaSession.userId,
            displayName: metaSession.accountName,
            metadata: metaSession.metadata,
          }
        : { connected: false },
      tiktok: tiktokSession
        ? {
            connected: true,
            userId: tiktokSession.userId,
            handle: tiktokSession.accountName,
            metadata: tiktokSession.metadata,
          }
        : { connected: false },
      youtube: youtubeSession
        ? {
            connected: true,
            userId: youtubeSession.userId,
            displayName: youtubeSession.accountName,
            metadata: youtubeSession.metadata,
          }
        : { connected: false },
    }),
    { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
  );
}

export async function onRequestPost(context: { request: Request; env: Env }): Promise<Response> {
  // Desconectar / Revocar sesión de la plataforma
  try {
    const body = (await context.request.json()) as { platform?: 'meta' | 'tiktok' | 'youtube' };
    const platform = body.platform;
    if (!platform) {
      return new Response(JSON.stringify({ error: 'Falta plataforma a desconectar' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    if (context.env.ALQUIMIA_KV) {
      await context.env.ALQUIMIA_KV.delete(`session:current:${platform}`).catch(() => {});
    }

    const clearCookie = `alquimia_${platform}_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Secure`;

    return new Response(
      JSON.stringify({ success: true, platform, disconnected: true }),
      {
        status: 200,
        headers: {
          ...CORS_HEADERS,
          'Content-Type': 'application/json',
          'Set-Cookie': clearCookie,
        },
      }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error al revocar sesión.';
    return new Response(JSON.stringify({ error: { message } }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
}
