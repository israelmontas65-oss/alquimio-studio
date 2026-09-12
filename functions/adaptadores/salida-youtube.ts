// ============================================================
// functions/adaptadores/salida-youtube.ts
// Adaptador de Salida Oficial para YouTube Data API v3 (Google)
// Alquimia Studio — Titularidad: Israel Montás
//
// Documentación oficial:
// - Resumable Video Upload: https://developers.google.com/youtube/v3/guides/using_resumable_upload_protocol
// - Video Insert Reference: https://developers.google.com/youtube/v3/docs/videos/insert
// - Comments Insert: https://developers.google.com/youtube/v3/docs/comments/insert
// ============================================================

import type {
  EventoSaliente,
  ContenidoFuente,
  ResultadoEnvio,
} from '../shared/tipos';
import { SimpleKVNamespace } from '../shared/idempotencia';

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';
const YOUTUBE_UPLOAD_BASE = 'https://www.googleapis.com/upload/youtube/v3';

export interface EnvYouTube {
  YOUTUBE_ACCESS_TOKEN?: string;
  YOUTUBE_SANDBOX?: string;
  ALQUIMIA_KV?: SimpleKVNamespace;
  [key: string]: unknown;
}

/**
 * Envía una respuesta o comentario a YouTube vía YouTube Data API v3.
 */
export async function enviarRespuestaYouTube(
  eventoSaliente: EventoSaliente,
  env: EnvYouTube
): Promise<ResultadoEnvio> {
  const esSandbox = Boolean(env.YOUTUBE_SANDBOX === 'true' || eventoSaliente.esSandbox);
  const token = env.YOUTUBE_ACCESS_TOKEN;

  // 1. Notificaciones internas
  if (eventoSaliente.tipoRespuesta === 'notificacion_interna') {
    const kv = env.ALQUIMIA_KV;
    if (kv) {
      await kv.put(
        `notif_yt_${eventoSaliente.id}`,
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
      plataforma: 'youtube',
      idRespuesta: eventoSaliente.id,
      esSandbox,
      detalles: { accion: 'notificacion_interna_registrada' },
    };
  }

  // 2. Respuesta a Comentario
  if (eventoSaliente.tipoRespuesta === 'comentario') {
    const parentCommentId = eventoSaliente.recursoId || eventoSaliente.destinatarioId;

    if (!token) {
      return {
        exitoso: false,
        plataforma: 'youtube',
        error: 'YOUTUBE_ACCESS_TOKEN no configurado en variables de entorno',
        esSandbox,
      };
    }

    try {
      const url = `${YOUTUBE_API_BASE}/comments?part=snippet`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          snippet: {
            parentId: parentCommentId,
            textOriginal: eventoSaliente.contenido,
          },
        }),
      });

      const data = (await res.json()) as { id?: string; error?: { message: string; code: number } };

      if (!res.ok || data.error) {
        return {
          exitoso: false,
          plataforma: 'youtube',
          statusHttp: res.status,
          error: data.error?.message || `Error HTTP ${res.status} en YouTube Data API`,
          detalles: data,
          esSandbox,
        };
      }

      return {
        exitoso: true,
        plataforma: 'youtube',
        idRespuesta: data.id || eventoSaliente.id,
        statusHttp: res.status,
        detalles: data,
        esSandbox,
      };
    } catch (err) {
      return {
        exitoso: false,
        plataforma: 'youtube',
        error: err instanceof Error ? err.message : String(err),
        esSandbox,
      };
    }
  }

  return {
    exitoso: false,
    plataforma: 'youtube',
    error: `Tipo de respuesta no soportado en YouTube: ${eventoSaliente.tipoRespuesta}`,
    esSandbox,
  };
}

/**
 * Publica un video (o Shorts) en YouTube Data API v3 mediante el protocolo de subida oficial.
 */
export async function publicarContenidoYouTube(
  contenido: ContenidoFuente,
  accessToken: string,
  env: EnvYouTube
): Promise<ResultadoEnvio> {
  const esSandbox = Boolean(env.YOUTUBE_SANDBOX === 'true');

  if (!accessToken) {
    return {
      exitoso: false,
      plataforma: 'youtube',
      error: 'Token de acceso de YouTube (Google OAuth 2.0) no proporcionado',
      esSandbox,
    };
  }

  // Validación de tipo de contenido para YouTube
  if (contenido.tipo !== 'video') {
    return {
      exitoso: false,
      plataforma: 'youtube',
      error: `YouTube Data API v3 solo admite archivos de tipo 'video'. Las publicaciones de comunidad o fotos no cuentan con endpoint público de subida en la API v3.`,
      esSandbox,
    };
  }

  const tagsLimpios = (contenido.hashtags || []).map((h) => h.replace(/^#/, ''));
  const tagsParaDescripcion = (contenido.hashtags || []).map((h) => (h.startsWith('#') ? h : `#${h}`)).join(' ');
  const descripcionCompleta = [contenido.caption, tagsParaDescripcion].filter(Boolean).join('\n\n');
  const titulo = contenido.caption.split('\n')[0].slice(0, 100) || 'Publicación Alquimia Studio';

  try {
    // Inicialización de la sesión de subida resumable oficial de YouTube
    const url = `${YOUTUBE_UPLOAD_BASE}/videos?uploadType=resumable&part=snippet,status`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json; charset=UTF-8',
        'X-Upload-Content-Type': 'video/*',
      },
      body: JSON.stringify({
        snippet: {
          title: titulo,
          description: descripcionCompleta,
          tags: tagsLimpios,
          categoryId: '22', // People & Blogs
        },
        status: {
          privacyStatus: 'public',
          selfDeclaredMadeForKids: false,
        },
      }),
    });

    // En YouTube resumable upload, la respuesta exitosa devuelve 200 con la cabecera 'Location'
    const uploadLocation = res.headers.get('Location');
    const responseText = await res.text();
    let data: Record<string, unknown> = {};

    try {
      data = JSON.parse(responseText);
    } catch {
      data = { raw: responseText };
    }

    if (!res.ok) {
      const errorObj = (data.error as { message?: string }) || {};
      return {
        exitoso: false,
        plataforma: 'youtube',
        statusHttp: res.status,
        error: errorObj.message || `Fallo al iniciar subida en YouTube API (${res.status})`,
        detalles: data,
        esSandbox,
      };
    }

    const videoId = (data.id as string) || (uploadLocation ? uploadLocation.split('upload_id=')[1] : 'resumable_session');

    return {
      exitoso: true,
      plataforma: 'youtube',
      idPublicacion: videoId,
      urlPublicacion: `https://www.youtube.com/watch?v=${videoId}`,
      statusHttp: res.status,
      detalles: { uploadLocation, ...data },
      esSandbox,
    };
  } catch (err) {
    return {
      exitoso: false,
      plataforma: 'youtube',
      error: err instanceof Error ? err.message : String(err),
      esSandbox,
    };
  }
}
