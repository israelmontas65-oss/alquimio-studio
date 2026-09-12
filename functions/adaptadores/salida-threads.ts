// ============================================================
// functions/adaptadores/salida-threads.ts
// Adaptador de Salida Oficial para Threads API (Meta v1.0)
// Alquimia Studio — Titularidad: Israel Montás
//
// Documentación oficial:
// - Threads API Reference: https://developers.facebook.com/docs/threads
// - Publishing Posts: https://developers.facebook.com/docs/threads/posts
// - Reply to Threads: https://developers.facebook.com/docs/threads/reply-moderation
// ============================================================

import type {
  EventoSaliente,
  ContenidoFuente,
  ResultadoEnvio,
} from '../shared/tipos';
import { SimpleKVNamespace } from '../shared/idempotencia';

const THREADS_API_BASE = 'https://graph.threads.net/v1.0';

export interface EnvThreads {
  THREADS_ACCESS_TOKEN?: string;
  THREADS_USER_ID?: string;
  THREADS_SANDBOX?: string;
  ALQUIMIA_KV?: SimpleKVNamespace;
  [key: string]: unknown;
}

/**
 * Envía una respuesta o réplica a Threads vía Meta Threads API v1.0.
 */
export async function enviarRespuestaThreads(
  eventoSaliente: EventoSaliente,
  env: EnvThreads
): Promise<ResultadoEnvio> {
  const esSandbox = Boolean(env.THREADS_SANDBOX === 'true' || eventoSaliente.esSandbox);
  const token = env.THREADS_ACCESS_TOKEN;
  const userId = env.THREADS_USER_ID;

  // 1. Notificaciones internas
  if (eventoSaliente.tipoRespuesta === 'notificacion_interna') {
    const kv = env.ALQUIMIA_KV;
    if (kv) {
      await kv.put(
        `notif_threads_${eventoSaliente.id}`,
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
      plataforma: 'threads',
      idRespuesta: eventoSaliente.id,
      esSandbox,
      detalles: { accion: 'notificacion_interna_registrada' },
    };
  }

  // 2. Réplica / Respuesta a un hilo
  if (eventoSaliente.tipoRespuesta === 'comentario' || eventoSaliente.tipoRespuesta === 'mensaje_directo') {
    const replyToId = eventoSaliente.recursoId || eventoSaliente.destinatarioId;

    if (!token || !userId) {
      return {
        exitoso: false,
        plataforma: 'threads',
        error: 'THREADS_ACCESS_TOKEN o THREADS_USER_ID no configurado en variables de entorno',
        esSandbox,
      };
    }

    try {
      // Paso 1: Crear contenedor de respuesta
      const containerUrl = `${THREADS_API_BASE}/${encodeURIComponent(userId)}/threads`;
      const resContainer = await fetch(containerUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          media_type: 'TEXT',
          text: eventoSaliente.contenido,
          reply_to_id: replyToId,
        }),
      });

      const dataContainer = (await resContainer.json()) as { id?: string; error?: { message: string; code: number } };

      if (!resContainer.ok || dataContainer.error || !dataContainer.id) {
        return {
          exitoso: false,
          plataforma: 'threads',
          statusHttp: resContainer.status,
          error: dataContainer.error?.message || `Fallo al crear réplica en Threads (${resContainer.status})`,
          detalles: dataContainer,
          esSandbox,
        };
      }

      const creationId = dataContainer.id;

      // Paso 2: Publicar contenedor
      const publishUrl = `${THREADS_API_BASE}/${encodeURIComponent(userId)}/threads_publish`;
      const resPublish = await fetch(publishUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
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
          plataforma: 'threads',
          statusHttp: resPublish.status,
          error: dataPublish.error?.message || `Fallo al publicar réplica en Threads (${resPublish.status})`,
          detalles: dataPublish,
          esSandbox,
        };
      }

      return {
        exitoso: true,
        plataforma: 'threads',
        idRespuesta: dataPublish.id || creationId,
        statusHttp: resPublish.status,
        detalles: dataPublish,
        esSandbox,
      };
    } catch (err) {
      return {
        exitoso: false,
        plataforma: 'threads',
        error: err instanceof Error ? err.message : String(err),
        esSandbox,
      };
    }
  }

  return {
    exitoso: false,
    plataforma: 'threads',
    error: `Tipo de respuesta no soportado en Threads: ${eventoSaliente.tipoRespuesta}`,
    esSandbox,
  };
}

/**
 * Publica contenido multimedia (Video, Imagen o Texto) en Threads.
 * Protocolo oficial en 2 pasos de Meta Threads API: Crear Contenedor -> Publicar Contenedor.
 */
export async function publicarContenidoThreads(
  contenido: ContenidoFuente,
  threadsUserId: string,
  accessToken: string,
  env: EnvThreads
): Promise<ResultadoEnvio> {
  const esSandbox = Boolean(env.THREADS_SANDBOX === 'true');

  if (!accessToken || !threadsUserId) {
    return {
      exitoso: false,
      plataforma: 'threads',
      error: 'Se requiere threadsUserId y accessToken válidos para publicar en Threads',
      esSandbox,
    };
  }

  const captionTexto = [
    contenido.caption,
    contenido.hashtags.map((h) => (h.startsWith('#') ? h : `#${h}`)).join(' '),
  ]
    .filter(Boolean)
    .join(' ')
    .slice(0, 500); // Límite oficial de caracteres de Threads

  try {
    // ── PASO 1: CREACIÓN DEL CONTENEDOR ─────────────────────────
    let containerPayload: Record<string, unknown>;

    if (contenido.tipo === 'video') {
      containerPayload = {
        media_type: 'VIDEO',
        video_url: contenido.archivoUrl,
        text: captionTexto,
      };
    } else if (contenido.tipo === 'imagen' || contenido.tipo === 'plantilla' || contenido.tipo === 'boceto') {
      containerPayload = {
        media_type: 'IMAGE',
        image_url: contenido.archivoUrl,
        text: captionTexto,
      };
    } else {
      return {
        exitoso: false,
        plataforma: 'threads',
        error: `El tipo '${contenido.tipo}' no está soportado nativamente en Threads (requiere texto, imagen o video).`,
        esSandbox,
      };
    }

    const containerUrl = `${THREADS_API_BASE}/${encodeURIComponent(threadsUserId)}/threads`;
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
        plataforma: 'threads',
        statusHttp: resContainer.status,
        error: dataContainer.error?.message || `Fallo al crear contenedor en Threads (${resContainer.status})`,
        detalles: dataContainer,
        esSandbox,
      };
    }

    const creationId = dataContainer.id;

    // ── PASO 2: PUBLICACIÓN DEL CONTENEDOR ──────────────────────
    const publishUrl = `${THREADS_API_BASE}/${encodeURIComponent(threadsUserId)}/threads_publish`;
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
        plataforma: 'threads',
        statusHttp: resPublish.status,
        error: dataPublish.error?.message || `Fallo al publicar contenedor en Threads (${resPublish.status})`,
        detalles: dataPublish,
        esSandbox,
      };
    }

    const postId = dataPublish.id || creationId;

    return {
      exitoso: true,
      plataforma: 'threads',
      idPublicacion: postId,
      urlPublicacion: `https://www.threads.net/post/${postId}`,
      statusHttp: resPublish.status,
      detalles: dataPublish,
      esSandbox,
    };
  } catch (err) {
    return {
      exitoso: false,
      plataforma: 'threads',
      error: err instanceof Error ? err.message : String(err),
      esSandbox,
    };
  }
}
