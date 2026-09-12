// ============================================================
// functions/core/adaptar-formato.ts
// Validador y Adaptador de Formatos de Contenido Multi-Plataforma
// Alquimia Studio — Titularidad: Israel Montás
//
// Valida la compatibilidad nativa de cada red social según su documentación oficial
// antes de intentar cualquier operación de subida o publicación.
// ============================================================

import type {
  TipoContenido,
  ContenidoFuente,
  Plataforma,
  CompatibilidadPlataforma,
} from '../shared/tipos';

/**
 * Matriz de compatibilidad y reglas oficiales por red social:
 *
 * 1. TikTok (Content Posting API v2):
 *    - video: Soportado nativamente (MP4, MOV, WebM).
 *    - imagen: Soportado para carruseles/slideshows (media_type=PHOTO en /v2/post/publish/content/init/).
 *              Para imagen única estática se adapta como video o carrusel de 1 imagen.
 *    - audio: NO soportado nativamente. Requiere envolver en video (MP4 con portada fija).
 *
 * 2. Instagram (Meta Graph API):
 *    - video: Soportado nativamente (Reels / Video).
 *    - imagen: Soportado nativamente (Feed / Carousel).
 *    - audio: NO soportado nativamente como post independiente. Requiere envolver en video (Reel).
 *
 * 3. Facebook (Meta Graph API):
 *    - video: Soportado nativamente (/{page-id}/videos).
 *    - imagen: Soportado nativamente (/{page-id}/photos).
 *    - audio: NO soportado nativamente. Requiere envolver en video (MP4).
 *
 * 4. YouTube (YouTube Data API v3):
 *    - video: Soportado nativamente (videos.insert).
 *    - imagen: NO soportado como video. (Community Posts no tiene API de publicación en Data API v3).
 *    - audio: NO soportado nativamente. La documentación de YouTube exige estrictamente contenedor de video.
 *
 * 5. Threads (Meta Threads API):
 *    - video: Soportado nativamente (hasta 5 minutos).
 *    - imagen: Soportado nativamente (JPEG/PNG hasta 8MB).
 *    - audio: NO soportado nativamente en Threads API v1.0.
 *
 * 6. Tipos abstractos 'plantilla' y 'boceto':
 *    - Ninguna red social tiene soporte nativo. Se tratan como 'imagen' (o 'video' si son animados).
 */
export function validarCompatibilidad(
  plataforma: Plataforma | 'threads',
  contenido: ContenidoFuente
): CompatibilidadPlataforma {
  const { tipo } = contenido;

  // 1. Tipos abstractos de Alquimia Studio: 'plantilla' y 'boceto'
  if (tipo === 'plantilla' || tipo === 'boceto') {
    return {
      plataforma,
      tipoOriginal: tipo,
      soportadoNativamente: false,
      tipoEquivalente: 'imagen',
      requiereConversion: true,
      motivo: `El tipo '${tipo}' no tiene soporte nativo documentado en ninguna API de redes sociales; se trataría como imagen (render plano exportado).`,
    };
  }

  // 2. Reglas específicas por plataforma
  switch (plataforma) {
    case 'tiktok': {
      if (tipo === 'video') {
        return {
          plataforma,
          tipoOriginal: tipo,
          soportadoNativamente: true,
          requiereConversion: false,
        };
      }
      if (tipo === 'imagen') {
        return {
          plataforma,
          tipoOriginal: tipo,
          soportadoNativamente: true,
          tipoEquivalente: 'imagen',
          requiereConversion: false,
          motivo: 'TikTok admite imágenes exclusivamente bajo la modalidad de Foto-Carrusel / Slideshow (Content Posting API v2 PHOTO).',
        };
      }
      if (tipo === 'audio') {
        return {
          plataforma,
          tipoOriginal: tipo,
          soportadoNativamente: false,
          tipoEquivalente: 'video',
          requiereConversion: true,
          motivo: 'TikTok no tiene soporte nativo para audio independiente; esta combinación no tiene soporte nativo documentado, se trataría como video (MP4 con lienzo visual).',
        };
      }
      break;
    }

    case 'instagram': {
      if (tipo === 'video' || tipo === 'imagen') {
        return {
          plataforma,
          tipoOriginal: tipo,
          soportadoNativamente: true,
          requiereConversion: false,
        };
      }
      if (tipo === 'audio') {
        return {
          plataforma,
          tipoOriginal: tipo,
          soportadoNativamente: false,
          tipoEquivalente: 'video',
          requiereConversion: true,
          motivo: 'Instagram Graph API no tiene endpoint para publicaciones de audio puro; se trataría como video (Reel con carátula en MP4).',
        };
      }
      break;
    }

    case 'facebook': {
      if (tipo === 'video' || tipo === 'imagen') {
        return {
          plataforma,
          tipoOriginal: tipo,
          soportadoNativamente: true,
          requiereConversion: false,
        };
      }
      if (tipo === 'audio') {
        return {
          plataforma,
          tipoOriginal: tipo,
          soportadoNativamente: false,
          tipoEquivalente: 'video',
          requiereConversion: true,
          motivo: 'Facebook Graph API no admite publicaciones de audio directo en el feed de Páginas; se trataría como video (MP4).',
        };
      }
      break;
    }

    case 'youtube': {
      if (tipo === 'video') {
        return {
          plataforma,
          tipoOriginal: tipo,
          soportadoNativamente: true,
          requiereConversion: false,
        };
      }
      if (tipo === 'imagen') {
        return {
          plataforma,
          tipoOriginal: tipo,
          soportadoNativamente: false,
          tipoEquivalente: 'video',
          requiereConversion: true,
          motivo: 'YouTube Data API v3 rechaza archivos de imagen para subidas; requiere convertir a video (MP4) con duración mínima.',
        };
      }
      if (tipo === 'audio') {
        return {
          plataforma,
          tipoOriginal: tipo,
          soportadoNativamente: false,
          tipoEquivalente: 'video',
          requiereConversion: true,
          motivo: 'YouTube Data API v3 documenta explícitamente el rechazo de archivos MP3/WAV sin contenedor de video; se trataría como video (MP4 con portada estática).',
        };
      }
      break;
    }

    case 'threads': {
      if (tipo === 'video' || tipo === 'imagen') {
        return {
          plataforma,
          tipoOriginal: tipo,
          soportadoNativamente: true,
          requiereConversion: false,
        };
      }
      if (tipo === 'audio') {
        return {
          plataforma,
          tipoOriginal: tipo,
          soportadoNativamente: false,
          tipoEquivalente: 'video',
          requiereConversion: true,
          motivo: 'Threads API v1.0 no cuenta con tipo de medio nativo para audio; se trataría como video (MP4 con portada).',
        };
      }
      break;
    }
  }

  return {
    plataforma,
    tipoOriginal: tipo,
    soportadoNativamente: false,
    tipoEquivalente: null,
    requiereConversion: false,
    motivo: `Combinación no soportada para ${plataforma} con formato ${tipo}.`,
  };
}
