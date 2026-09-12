// ============================================================
// functions/adaptadores/salida-facebook.ts
// Adaptador de Salida Oficial para Facebook Pages (Meta Graph API v19.0)
// Alquimia Studio — Titularidad: Israel Montás
//
// Documentación oficial:
// - Video Publishing: https://developers.facebook.com/docs/video-api/guides/publishing
// - Photo Publishing: https://developers.facebook.com/docs/graph-api/reference/page/photos
// - Page Feed / Post: https://developers.facebook.com/docs/graph-api/reference/page/feed
// - Comment Replies: https://developers.facebook.com/docs/graph-api/reference/v19.0/comment/comments
// ============================================================

import type {
  EventoSaliente,
  ContenidoFuente,
  ResultadoEnvio,
} from '../shared/tipos';
import { SimpleKVNamespace } from '../shared/idempotencia';

const FB_GRAPH_API_BASE = 'https://graph.facebook.com/v19.0';

export interface EnvFacebook {
  FB_PAGE_ACCESS_TOKEN?: string;
  FB_PAGE_ID?: string;
  FB_SANDBOX?: string;
  ALQUIMIA_KV?: SimpleKVNamespace;
  [key: string]: unknown;
}

/**
 * Envía una respuesta o comentario a Facebook vía Meta Graph API.
 */
export async function enviarRespuestaFacebook(
  eventoSaliente: EventoSaliente,
  env: EnvFacebook
): Promise<ResultadoEnvio> {
  const esSandbox = Boolean(env.FB_SANDBOX === 'true' || eventoSaliente.esSandbox);
  const token = env.FB_PAGE_ACCESS_TOKEN;

  // 1. Notificaciones internas
  if (eventoSaliente.tipoRespuesta === 'notificacion_interna') {
    const kv = env.ALQUIMIA_KV;
    if (kv) {
      await kv.put(
        `notif_fb_${eventoSaliente.id}`,
        JSON.stringify({
          eventoEntranteId: eventoSaliente.eventoEntranteId,
          contenido: eventoSaliente.contenido,
          metadata: eventoSaliente.metadata,
          timestamp: eventoSaliente.timestamp,
        }),
        { expirationTtl: 2592000 }
      );
    }
    return {
      exitoso: true,
      plataforma: 'facebook',
      idRespuesta: eventoSaliente.id,
      esSandbox,
      detalles: { accion: 'notificacion_interna_registrada' },
    };
  }

  // 2. Respuesta a Comentario
  if (eventoSaliente.tipoRespuesta === 'comentario') {
    const commentId = eventoSaliente.recursoId || eventoSaliente.destinatarioId;

    if (!token) {
      return {
        exitoso: false,
        plataforma: 'facebook',
        error: 'FB_PAGE_ACCESS_TOKEN no configurado en variables de entorno',
        esSandbox,
      };
    }

    try {
      const url = `${FB_GRAPH_API_BASE}/${encodeURIComponent(commentId)}/comments`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: eventoSaliente.contenido,
        }),
      });

      const data = (await res.json()) as { id?: string; error?: { message: string; code: number } };

      if (!res.ok || data.error) {
        return {
          exitoso: false,
          plataforma: 'facebook',
          statusHttp: res.status,
          error: data.error?.message || `Error HTTP ${res.status} en Facebook Graph API`,
          detalles: data,
          esSandbox,
        };
      }

      return {
        exitoso: true,
        plataforma: 'facebook',
        idRespuesta: data.id || eventoSaliente.id,
        statusHttp: res.status,
        detalles: data,
        esSandbox,
      };
    } catch (err) {
      return {
        exitoso: false,
        plataforma: 'facebook',
        error: err instanceof Error ? err.message : String(err),
        esSandbox,
      };
    }
  }

  return {
    exitoso: false,
    plataforma: 'facebook',
    error: `Tipo de respuesta no soportado en Facebook: ${eventoSaliente.tipoRespuesta}`,
    esSandbox,
  };
}

/**
 * Publica contenido multimedia (Video, Foto o Texto) en una Página de Facebook.
 */
export async function publicarContenidoFacebook(
  contenido: ContenidoFuente,
  pageId: string,
  accessToken: string,
  env: EnvFacebook
): Promise<ResultadoEnvio> {
  const esSandbox = Boolean(env.FB_SANDBOX === 'true');

  if (!accessToken || !pageId) {
    return {
      exitoso: false,
      plataforma: 'facebook',
      error: 'Se requiere pageId y accessToken válidos para publicar en Facebook',
      esSandbox,
    };
  }

  const captionTexto = [
    contenido.caption,
    contenido.hashtags.map((h) => (h.startsWith('#') ? h : `#${h}`)).join(' '),
  ]
    .filter(Boolean)
    .join(' ');

  try {
    // ── A. PUBLICACIÓN DE VIDEO O REEL ──────────────────────────
    if (contenido.tipo === 'video') {
      const url = `${FB_GRAPH_API_BASE}/${encodeURIComponent(pageId)}/videos`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          file_url: contenido.archivoUrl,
          description: captionTexto,
          title: contenido.caption.slice(0, 100),
        }),
      });

      const data = (await res.json()) as { id?: string; error?: { message: string; code: number } };

      if (!res.ok || data.error) {
        return {
          exitoso: false,
          plataforma: 'facebook',
          statusHttp: res.status,
          error: data.error?.message || `Fallo al publicar video en Facebook (${res.status})`,
          detalles: data,
          esSandbox,
        };
      }

      return {
        exitoso: true,
        plataforma: 'facebook',
        idPublicacion: data.id,
        urlPublicacion: `https://www.facebook.com/${data.id}`,
        statusHttp: res.status,
        detalles: data,
        esSandbox,
      };
    }

    // ── B. PUBLICACIÓN DE FOTO / IMAGEN ─────────────────────────
    if (contenido.tipo === 'imagen' || contenido.tipo === 'plantilla' || contenido.tipo === 'boceto') {
      const url = `${FB_GRAPH_API_BASE}/${encodeURIComponent(pageId)}/photos`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: contenido.archivoUrl,
          caption: captionTexto,
        }),
      });

      const data = (await res.json()) as { id?: string; post_id?: string; error?: { message: string; code: number } };

      if (!res.ok || data.error) {
        return {
          exitoso: false,
          plataforma: 'facebook',
          statusHttp: res.status,
          error: data.error?.message || `Fallo al publicar imagen en Facebook (${res.status})`,
          detalles: data,
          esSandbox,
        };
      }

      return {
        exitoso: true,
        plataforma: 'facebook',
        idPublicacion: data.post_id || data.id,
        urlPublicacion: `https://www.facebook.com/${data.post_id || data.id}`,
        statusHttp: res.status,
        detalles: data,
        esSandbox,
      };
    }

    // ── C. AUDIO ────────────────────────────────────────────────
    return {
      exitoso: false,
      plataforma: 'facebook',
      error: `Facebook no admite archivos de tipo '${contenido.tipo}' de forma nativa en su API de publicaciones (requiere formato MP4 de video).`,
      esSandbox,
    };
  } catch (err) {
    return {
      exitoso: false,
      plataforma: 'facebook',
      error: err instanceof Error ? err.message : String(err),
      esSandbox,
    };
  }
}
