// ============================================================
// functions/adaptadores/salida-instagram.ts
// Adaptador de Salida Oficial para Instagram Graph API (Meta v19.0)
// Alquimia Studio — Titularidad: Israel Montás
//
// Documentación oficial:
// - Content Publishing (Reels & Fotos): https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/content-publishing
// - Comment Replies: https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-comment/replies
// ============================================================

import type {
  EventoSaliente,
  ContenidoFuente,
  ResultadoEnvio,
} from '../shared/tipos';
import { SimpleKVNamespace } from '../shared/idempotencia';

const IG_GRAPH_API_BASE = 'https://graph.facebook.com/v19.0';

export interface EnvInstagram {
  INSTAGRAM_ACCESS_TOKEN?: string;
  INSTAGRAM_USER_ID?: string;
  IG_USER_ID?: string;
  INSTAGRAM_SANDBOX?: string;
  ALQUIMIA_KV?: SimpleKVNamespace;
  [key: string]: unknown;
}

/**
 * Envía una respuesta o comentario a Instagram vía Graph API.
 */
export async function enviarRespuestaInstagram(
  eventoSaliente: EventoSaliente,
  env: EnvInstagram
): Promise<ResultadoEnvio> {
  const esSandbox = Boolean(env.INSTAGRAM_SANDBOX === 'true' || eventoSaliente.esSandbox);
  const token = env.INSTAGRAM_ACCESS_TOKEN;

  // 1. Notificaciones internas
  if (eventoSaliente.tipoRespuesta === 'notificacion_interna') {
    const kv = env.ALQUIMIA_KV;
    if (kv) {
      await kv.put(
        `notif_ig_${eventoSaliente.id}`,
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
      plataforma: 'instagram',
      idRespuesta: eventoSaliente.id,
      esSandbox,
      detalles: { accion: 'notificacion_interna_registrada' },
    };
  }

  // 2. Respuesta a Comentarios
  if (eventoSaliente.tipoRespuesta === 'comentario') {
    const commentId = eventoSaliente.recursoId || eventoSaliente.destinatarioId;

    if (!token) {
      return {
        exitoso: false,
        plataforma: 'instagram',
        error: 'INSTAGRAM_ACCESS_TOKEN no configurado en variables de entorno',
        esSandbox,
      };
    }

    try {
      const url = `${IG_GRAPH_API_BASE}/${encodeURIComponent(commentId)}/replies`;
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
          plataforma: 'instagram',
          statusHttp: res.status,
          error: data.error?.message || `Error HTTP ${res.status} en Instagram Graph API`,
          detalles: data,
          esSandbox,
        };
      }

      return {
        exitoso: true,
        plataforma: 'instagram',
        idRespuesta: data.id || eventoSaliente.id,
        statusHttp: res.status,
        detalles: data,
        esSandbox,
      };
    } catch (err) {
      return {
        exitoso: false,
        plataforma: 'instagram',
        error: err instanceof Error ? err.message : String(err),
        esSandbox,
      };
    }
  }

  return {
    exitoso: false,
    plataforma: 'instagram',
    error: `Tipo de respuesta no soportado en Instagram: ${eventoSaliente.tipoRespuesta}`,
    esSandbox,
  };
}

/**
 * Publica contenido multimedia (Reel o Foto) en una cuenta profesional de Instagram.
 * Requiere el flujo de 2 pasos oficial de Meta: Crear Contenedor -> Publicar Contenedor.
 */
export async function publicarContenidoInstagram(
  contenido: ContenidoFuente,
  igUserId: string,
  accessToken: string,
  env: EnvInstagram
): Promise<ResultadoEnvio> {
  const esSandbox = Boolean(env.INSTAGRAM_SANDBOX === 'true');

  if (!accessToken || !igUserId) {
    return {
      exitoso: false,
      plataforma: 'instagram',
      error: 'Se requiere igUserId y accessToken válidos para publicar en Instagram',
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
    // ── PASO 1: CREACIÓN DEL CONTENEDOR MULTIMEDIA ──────────────
    let containerPayload: Record<string, unknown>;

    if (contenido.tipo === 'video') {
      containerPayload = {
        media_type: 'REELS',
        video_url: contenido.archivoUrl,
        caption: captionTexto,
      };
    } else if (contenido.tipo === 'imagen' || contenido.tipo === 'plantilla' || contenido.tipo === 'boceto') {
      containerPayload = {
        image_url: contenido.archivoUrl,
        caption: captionTexto,
      };
    } else {
      return {
        exitoso: false,
        plataforma: 'instagram',
        error: `El tipo '${contenido.tipo}' no está soportado nativamente en Instagram (requiere imagen o video).`,
        esSandbox,
      };
    }

    const containerUrl = `${IG_GRAPH_API_BASE}/${encodeURIComponent(igUserId)}/media`;
    const resContainer = await fetch(containerUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(containerPayload),
    });

    const dataContainer = (await resContainer.json()) as { id?: string; error?: { message: string; code: number } };

    if (!resContainer.ok || dataContainer.error || !dataContainer.id) {
      return {
        exitoso: false,
        plataforma: 'instagram',
        statusHttp: resContainer.status,
        error: dataContainer.error?.message || `Fallo al crear contenedor en Instagram (${resContainer.status})`,
        detalles: dataContainer,
        esSandbox,
      };
    }

    const creationId = dataContainer.id;

    // ── PASO 2: PUBLICACIÓN DEL CONTENEDOR ──────────────────────
    const publishUrl = `${IG_GRAPH_API_BASE}/${encodeURIComponent(igUserId)}/media_publish`;
    const resPublish = await fetch(publishUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        creation_id: creationId,
      }),
    });

    const dataPublish = (await resPublish.json()) as { id?: string; error?: { message: string; code: number } };

    if (!resPublish.ok || dataPublish.error) {
      return {
        exitoso: false,
        plataforma: 'instagram',
        statusHttp: resPublish.status,
        error: dataPublish.error?.message || `Fallo al publicar contenedor en Instagram (${resPublish.status})`,
        detalles: dataPublish,
        esSandbox,
      };
    }

    const postId = dataPublish.id || creationId;

    return {
      exitoso: true,
      plataforma: 'instagram',
      idPublicacion: postId,
      urlPublicacion: `https://www.instagram.com/p/${postId}`,
      statusHttp: resPublish.status,
      detalles: dataPublish,
      esSandbox,
    };
  } catch (err) {
    return {
      exitoso: false,
      plataforma: 'instagram',
      error: err instanceof Error ? err.message : String(err),
      esSandbox,
    };
  }
}
