// ============================================================
// functions/adaptadores/salida-tiktok.ts
// Adaptador de Salida Oficial para TikTok Content Posting API v2
// Alquimia Studio — Titularidad: Israel Montás
//
// Documentación oficial:
// - Direct Post Video: https://developers.tiktok.com/doc/content-posting-api-reference-direct-post
// - Direct Post Photo: https://developers.tiktok.com/doc/content-posting-api-reference-photo-post
// - Status Query: https://developers.tiktok.com/doc/content-posting-api-reference-get-video-status
// ============================================================

import type {
  EventoSaliente,
  ContenidoFuente,
  ResultadoEnvio,
} from '../shared/tipos';
import { SimpleKVNamespace } from '../shared/idempotencia';

const TIKTOK_API_BASE = 'https://open.tiktokapis.com/v2';
const TIKTOK_BUSINESS_API_BASE = 'https://business-api.tiktok.com/open_api/v1.3';

export interface EnvTikTok {
  TIKTOK_ACCESS_TOKEN?: string;
  TIKTOK_BUSINESS_ACCESS_TOKEN?: string;
  TIKTOK_BUSINESS_ID?: string;
  TIKTOK_SANDBOX?: string;
  TIKTOK_KV?: SimpleKVNamespace;
  ALQUIMIA_KV?: SimpleKVNamespace;
  [key: string]: unknown;
}

/**
 * Procesa la salida de eventos para TikTok.
 * Gestiona notificaciones internas o respuestas vía Business API si está configurada.
 */
export async function enviarRespuestaTikTok(
  eventoSaliente: EventoSaliente,
  env: EnvTikTok
): Promise<ResultadoEnvio> {
  const esSandbox = Boolean(env.TIKTOK_SANDBOX === 'true' || eventoSaliente.esSandbox);

  // 1. Notificaciones internas (seguridad, cambios de token o telemetría)
  if (eventoSaliente.tipoRespuesta === 'notificacion_interna') {
    const kv = env.ALQUIMIA_KV || env.TIKTOK_KV;
    if (kv) {
      await kv.put(
        `notif_tiktok_${eventoSaliente.id}`,
        JSON.stringify({
          eventoEntranteId: eventoSaliente.eventoEntranteId,
          contenido: eventoSaliente.contenido,
          metadata: eventoSaliente.metadata,
          timestamp: eventoSaliente.timestamp,
        }),
        { expirationTtl: 2592000 } // 30 días
      );
    }
    return {
      exitoso: true,
      plataforma: 'tiktok',
      idRespuesta: eventoSaliente.id,
      esSandbox,
      detalles: { accion: 'notificacion_interna_registrada' },
    };
  }

  // 2. Comentarios: comprobación de Business API vs Creator API
  if (eventoSaliente.tipoRespuesta === 'comentario') {
    const businessToken = env.TIKTOK_BUSINESS_ACCESS_TOKEN;
    const businessId = env.TIKTOK_BUSINESS_ID;

    if (!businessToken || !businessId) {
      return {
        exitoso: false,
        plataforma: 'tiktok',
        error:
          'TikTok Creator API estándar no dispone de endpoints para responder comentarios. ' +
          'Se requiere TikTok for Business API vinculada con TIKTOK_BUSINESS_ACCESS_TOKEN y TIKTOK_BUSINESS_ID.',
        esSandbox,
      };
    }

    // Si cuenta con credenciales de TikTok for Business, invocar endpoint oficial
    try {
      const url = `${TIKTOK_BUSINESS_API_BASE}/business/comment/reply/`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Access-Token': businessToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          business_id: businessId,
          comment_id: eventoSaliente.recursoId,
          text: eventoSaliente.contenido,
        }),
      });

      const data = (await res.json()) as { code?: number; message?: string; data?: { comment_id?: string } };
      if (data.code !== 0) {
        return {
          exitoso: false,
          plataforma: 'tiktok',
          statusHttp: res.status,
          error: data.message || `Error TikTok Business API código ${data.code}`,
          detalles: data,
          esSandbox,
        };
      }

      return {
        exitoso: true,
        plataforma: 'tiktok',
        idRespuesta: data.data?.comment_id || eventoSaliente.id,
        statusHttp: res.status,
        detalles: data,
        esSandbox,
      };
    } catch (err) {
      return {
        exitoso: false,
        plataforma: 'tiktok',
        error: err instanceof Error ? err.message : String(err),
        esSandbox,
      };
    }
  }

  return {
    exitoso: false,
    plataforma: 'tiktok',
    error: `Tipo de respuesta no soportado en TikTok: ${eventoSaliente.tipoRespuesta}`,
    esSandbox,
  };
}

/**
 * Publica contenido (Video o Foto-Slideshow) en TikTok Content Posting API v2.
 */
export async function publicarContenidoTikTok(
  contenido: ContenidoFuente,
  accessToken: string,
  env: EnvTikTok
): Promise<ResultadoEnvio> {
  const esSandbox = Boolean(env.TIKTOK_SANDBOX === 'true');

  if (!accessToken) {
    return {
      exitoso: false,
      plataforma: 'tiktok',
      error: 'Token de acceso de TikTok no proporcionado para la publicación',
      esSandbox,
    };
  }

  const captionTexto = [
    contenido.caption,
    contenido.hashtags.map((h) => (h.startsWith('#') ? h : `#${h}`)).join(' '),
  ]
    .filter(Boolean)
    .join(' ')
    .slice(0, 2200); // Límite oficial de TikTok

  // Publicación según tipo
  if (contenido.tipo === 'video') {
    return publicarVideoTikTok(contenido, captionTexto, accessToken, esSandbox);
  }

  if (contenido.tipo === 'imagen' || contenido.tipo === 'plantilla' || contenido.tipo === 'boceto') {
    return publicarFotosTikTok(contenido, captionTexto, accessToken, esSandbox);
  }

  return {
    exitoso: false,
    plataforma: 'tiktok',
    error: `El tipo '${contenido.tipo}' no tiene soporte nativo documentado en TikTok (requiere video MP4)`,
    esSandbox,
  };
}

/**
 * Inicializa la subida de un video en TikTok Content Posting API v2
 */
async function publicarVideoTikTok(
  contenido: ContenidoFuente,
  caption: string,
  token: string,
  esSandbox: boolean
): Promise<ResultadoEnvio> {
  const url = `${TIKTOK_API_BASE}/post/publish/video/init/`;

  const payload = {
    post_info: {
      title: caption,
      privacy_level: 'PUBLIC_TO_EVERYONE',
      disable_duet: false,
      disable_comment: false,
      disable_stitch: false,
      video_cover_timestamp_ms: 1000,
    },
    source_info: {
      source: 'PULL_FROM_URL',
      video_url: contenido.archivoUrl,
    },
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json; charset=UTF-8',
      },
      body: JSON.stringify(payload),
    });

    const statusHttp = res.status;
    const responseData = (await res.json()) as {
      data?: { publish_id?: string; upload_url?: string };
      error?: { code: string; message: string; log_id: string };
    };

    if (!res.ok || (responseData.error && responseData.error.code !== 'ok')) {
      const err = responseData.error || { code: 'unknown', message: 'Error desconocido', log_id: '' };
      return {
        exitoso: false,
        plataforma: 'tiktok',
        statusHttp,
        error: `[TikTok API ${err.code}] ${err.message} (log_id: ${err.log_id || 'n/a'})`,
        detalles: responseData,
        esSandbox,
      };
    }

    return {
      exitoso: true,
      plataforma: 'tiktok',
      idPublicacion: responseData.data?.publish_id,
      statusHttp,
      detalles: responseData.data,
      esSandbox,
    };
  } catch (err) {
    return {
      exitoso: false,
      plataforma: 'tiktok',
      error: err instanceof Error ? err.message : String(err),
      esSandbox,
    };
  }
}

/**
 * Inicializa la publicación de fotos / carrusel en TikTok Content Posting API v2
 */
async function publicarFotosTikTok(
  contenido: ContenidoFuente,
  caption: string,
  token: string,
  esSandbox: boolean
): Promise<ResultadoEnvio> {
  const url = `${TIKTOK_API_BASE}/post/publish/content/init/`;

  const payload = {
    post_mode: 'DIRECT_POST',
    media_type: 'PHOTO',
    post_info: {
      title: caption,
      privacy_level: 'PUBLIC_TO_EVERYONE',
    },
    source_info: {
      source: 'PULL_FROM_URL',
      photo_cover_index: 1,
      photo_images: [contenido.archivoUrl],
    },
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json; charset=UTF-8',
      },
      body: JSON.stringify(payload),
    });

    const statusHttp = res.status;
    const responseData = (await res.json()) as {
      data?: { publish_id?: string };
      error?: { code: string; message: string; log_id: string };
    };

    if (!res.ok || (responseData.error && responseData.error.code !== 'ok')) {
      const err = responseData.error || { code: 'unknown', message: 'Error desconocido', log_id: '' };
      return {
        exitoso: false,
        plataforma: 'tiktok',
        statusHttp,
        error: `[TikTok API ${err.code}] ${err.message} (log_id: ${err.log_id || 'n/a'})`,
        detalles: responseData,
        esSandbox,
      };
    }

    return {
      exitoso: true,
      plataforma: 'tiktok',
      idPublicacion: responseData.data?.publish_id,
      statusHttp,
      detalles: responseData.data,
      esSandbox,
    };
  } catch (err) {
    return {
      exitoso: false,
      plataforma: 'tiktok',
      error: err instanceof Error ? err.message : String(err),
      esSandbox,
    };
  }
}
