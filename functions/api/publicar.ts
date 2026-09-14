// ============================================================
// functions/api/publicar.ts
// Cloudflare Pages Function: Endpoint de Publicación Multi-Plataforma
// Ruta pública: /api/publicar
// Alquimia Studio — Titularidad: Israel Montás
// ============================================================

import { orquestarPublicacion } from '../core/orquestar-publicacion';
import type { ContenidoFuente, Plataforma } from '../shared/tipos';

interface Env {
  [key: string]: unknown;
}

interface EventContext {
  request: Request;
  env: Env;
  params: Record<string, string | string[]>;
  waitUntil: (promise: Promise<unknown>) => void;
  next: (input?: Request | string, init?: RequestInit) => Promise<Response>;
  data: Record<string, unknown>;
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Alquimia-Session',
};

export async function onRequestOptions(): Promise<Response> {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

export async function onRequestPost(context: EventContext): Promise<Response> {
  let body: {
    contenido?: ContenidoFuente;
    plataformas?: Plataforma[];
    tokens?: Partial<Record<Plataforma, string>>;
    facebookPageId?: string;
    instagramUserId?: string;
    threadsUserId?: string;
  };

  try {
    body = (await context.request.json()) as typeof body;
  } catch {
    return new Response(
      JSON.stringify({ error: 'Cuerpo de la solicitud debe ser un JSON válido' }),
      {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      }
    );
  }

  const { contenido, plataformas, tokens, facebookPageId, instagramUserId, threadsUserId } = body;

  if (!contenido || !contenido.archivoUrl || !contenido.tipo) {
    return new Response(
      JSON.stringify({ error: 'El campo "contenido" con "archivoUrl" y "tipo" es obligatorio' }),
      {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      }
    );
  }

  if (!plataformas || !Array.isArray(plataformas) || plataformas.length === 0) {
    return new Response(
      JSON.stringify({ error: 'Debe especificar al menos una plataforma en "plataformas"' }),
      {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      }
    );
  }

  const resolvedTokens: Partial<Record<Plataforma, string>> = { ...(tokens || {}) };
  let resolvedFbPageId = facebookPageId;
  let resolvedIgUserId = instagramUserId;
  let resolvedThreadsUserId = threadsUserId;

  // Resolución automática de credenciales cifradas en backend si el cliente no envía tokens planos
  try {
    const { getDecryptedSession } = await import('../shared/session-store');

    if (plataformas.includes('tiktok') && !resolvedTokens.tiktok) {
      const ttSess = await getDecryptedSession(context.env as any, 'tiktok', context.request);
      if (ttSess?.accessToken) {
        resolvedTokens.tiktok = ttSess.accessToken;
      }
    }

    if (
      (plataformas.includes('facebook') || plataformas.includes('instagram') || plataformas.includes('threads')) &&
      (!resolvedTokens.facebook || !resolvedTokens.instagram || !resolvedTokens.threads)
    ) {
      const metaSess = await getDecryptedSession(context.env as any, 'meta', context.request);
      if (metaSess) {
        const pageToken = (metaSess.metadata?.pageAccessToken as string) || metaSess.accessToken;
        if (!resolvedTokens.facebook) resolvedTokens.facebook = pageToken;
        if (!resolvedFbPageId) resolvedFbPageId = (metaSess.metadata?.pageId as string) || metaSess.userId;

        if (!resolvedTokens.instagram) resolvedTokens.instagram = pageToken;
        if (!resolvedIgUserId) {
          resolvedIgUserId = (metaSess.metadata?.instagramId as string) || (metaSess.metadata?.pageId as string) || metaSess.userId;
        }

        if (!resolvedTokens.threads) resolvedTokens.threads = metaSess.accessToken;
        if (!resolvedThreadsUserId) resolvedThreadsUserId = metaSess.userId;
      }
    }

    if (plataformas.includes('youtube') && !resolvedTokens.youtube) {
      const ytSess = await getDecryptedSession(context.env as any, 'youtube', context.request);
      if (ytSess?.accessToken) {
        resolvedTokens.youtube = ytSess.accessToken;
      }
    }
  } catch (sessErr) {
    console.warn('[api:publicar] Advertencia al recuperar sesiones cifradas:', sessErr);
  }

  try {
    const resultado = await orquestarPublicacion(contenido, plataformas, {
      env: context.env,
      tokens: resolvedTokens,
      facebookPageId: resolvedFbPageId,
      instagramUserId: resolvedIgUserId,
      threadsUserId: resolvedThreadsUserId,
    });

    return new Response(JSON.stringify(resultado), {
      status: 200,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[api:publicar] Error inesperado en orquestación:', err);
    return new Response(
      JSON.stringify({
        error: 'Error interno en la orquestación de publicación',
        detalles: err instanceof Error ? err.message : String(err),
      }),
      {
        status: 500,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      }
    );
  }
}
