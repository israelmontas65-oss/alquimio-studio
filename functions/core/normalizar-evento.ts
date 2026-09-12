// ============================================================
// functions/core/normalizar-evento.ts
// Normalizador de Eventos de Webhooks: TikTok & Plataformas Soportadas
// Alquimia Studio — Titularidad: Israel Montás
// Convierte payloads heterogéneos de cada plataforma a EventoEntrante
// ============================================================

import type {
  EventoEntrante,
  Plataforma,
  TikTokWebhookPayload,
  TipoEvento,
} from '../shared/tipos';

/**
 * Función principal de normalización.
 * Recibe el payload crudo y devuelve un arreglo de eventos normalizados.
 */
export function normalizarEvento(
  plataforma: 'tiktok',
  payload: unknown,
  options?: { esSandbox?: boolean }
): EventoEntrante[] {
  if (!payload || typeof payload !== 'object') {
    return [];
  }

  switch (plataforma) {
    case 'tiktok':
      return normalizarTikTok(payload as TikTokWebhookPayload, Boolean(options?.esSandbox));
    default:
      return [];
  }
}

// ────────────────────────────────────────────────────────────
// Adaptador de Entrada: TikTok Developer Webhooks
// Eventos oficiales según https://developers.tiktok.com/doc/webhooks-events:
// 1. authorization.removed      -> 'autorizacion'
// 2. video.upload.failed        -> 'estado_publicacion'
// 3. video.publish.completed    -> 'estado_publicacion'
// 4. portability.download.ready -> 'estado_publicacion'
// ────────────────────────────────────────────────────────────

function normalizarTikTok(
  payload: TikTokWebhookPayload,
  esSandboxDefault: boolean
): EventoEntrante[] {
  const eventName = (payload.event || '').trim().toLowerCase();
  if (!eventName) {
    return [];
  }

  // Deserializar payload.content (TikTok lo entrega serializado como string JSON)
  let parsedContent: Record<string, unknown> = {};
  if (typeof payload.content === 'string') {
    try {
      parsedContent = JSON.parse(payload.content);
    } catch {
      parsedContent = { rawContent: payload.content };
    }
  } else if (payload.content && typeof payload.content === 'object') {
    parsedContent = payload.content as Record<string, unknown>;
  }

  let tipo: TipoEvento;
  let textoContenido: string;
  let recursoId: string | null = null;

  switch (eventName) {
    // 1. authorization.removed: Usuario revocó acceso de la aplicación
    // Payload: { "reason": int } (0=Unknown, 1=User disconnects, 2=Deleted, 3=Age changed, 4=Banned, 5=Dev revoke)
    case 'authorization.removed': {
      tipo = 'autorizacion';
      const reasonCode = parsedContent.reason !== undefined ? parsedContent.reason : 'desconocido';
      textoContenido = `Revocación de autorización en TikTok (razón: ${reasonCode})`;
      recursoId = null;
      break;
    }

    // 2. video.upload.failed: Falló la subida del video en Video Kit / Content Posting
    // Payload: { "share_id": "video.xxx" }
    case 'video.upload.failed': {
      tipo = 'estado_publicacion';
      recursoId = (parsedContent.share_id as string) || (parsedContent.video_id as string) || null;
      textoContenido = `Fallo en la subida del video a TikTok (share_id: ${recursoId || 'no_especificado'})`;
      break;
    }

    // 3. video.publish.completed: Video publicado con éxito en TikTok
    // Payload: { "share_id": "video.xxx" }
    case 'video.publish.completed': {
      tipo = 'estado_publicacion';
      recursoId = (parsedContent.share_id as string) || (parsedContent.video_id as string) || null;
      textoContenido = `Video publicado exitosamente en TikTok (share_id: ${recursoId || 'no_especificado'})`;
      break;
    }

    // 4. portability.download.ready: Descarga de datos de usuario lista (Data Portability API)
    // Payload: { "request_id": 123... }
    case 'portability.download.ready': {
      tipo = 'estado_publicacion';
      recursoId = parsedContent.request_id ? String(parsedContent.request_id) : null;
      textoContenido = `Descarga de datos de portabilidad lista en TikTok (request_id: ${recursoId || 'no_especificado'})`;
      break;
    }

    // Cualquier otro evento no documentado oficialmente por TikTok es ignorado
    default:
      console.warn(`[normalizar-evento:tiktok] Evento no reconocido en la API oficial de TikTok: "${eventName}"`);
      return [];
  }

  const timestampISO = payload.create_time
    ? new Date(payload.create_time * 1000).toISOString()
    : new Date().toISOString();

  const evento: EventoEntrante = {
    id: payload.event_id || `tt_evt_${payload.create_time || Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    plataforma: 'tiktok',
    tipo,
    remitenteId: payload.user_openid || payload.user_open_id || 'tiktok_platform',
    remitenteNombre: undefined,
    contenido: textoContenido,
    recursoId,
    metadata: {
      eventoOriginal: payload.event,
      clientKey: payload.client_key,
      ...parsedContent,
    },
    timestamp: timestampISO,
    esSandbox: esSandboxDefault || Boolean(payload.client_key?.includes('sandbox')),
  };

  return [evento];
}


