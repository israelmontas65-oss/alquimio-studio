// ============================================================
// functions/shared/tipos.ts
// Tipos unificados del Puente de Webhooks Multi-Plataforma
// Alquimia Studio — Titularidad: Israel Montás
// ============================================================

export type Plataforma =
  | 'tiktok'
  | 'facebook'
  | 'instagram'
  | 'youtube'
  | 'threads';

export type TipoEvento =
  | 'mensaje'             // Mensaje directo (DM de TikTok, etc.)
  | 'comentario'          // Comentario en video o publicación
  | 'mencion'             // Mención o etiqueta de la cuenta
  | 'estado_publicacion'  // Reporte de subida, procesamiento o entrega
  | 'autorizacion';       // Aprobación de permisos, revocación de token, etc.

export type TipoRespuesta =
  | 'mensaje_directo'
  | 'comentario'
  | 'notificacion_interna'
  | 'ninguna';

/**
 * Evento entrante normalizado.
 * Estructura única e invariable para todas las plataformas.
 */
export interface EventoEntrante {
  /** Identificador único global del evento (ej: wamid.xxx o tt_evt_xxx) */
  id: string;

  /** Red social de origen */
  plataforma: Plataforma;

  /** Categoría unificada del evento */
  tipo: TipoEvento;

  /** Identificador del remitente (open_id de TikTok, ID de usuario de Threads/Meta, etc.) */
  remitenteId: string;

  /** Nombre público o @handle del remitente (si la plataforma lo proporciona) */
  remitenteNombre?: string;

  /** Contenido textual principal (cuerpo del mensaje, texto del comentario, o null si es evento de estado) */
  contenido: string | null;

  /** Identificador del recurso al que hace referencia (id de video, post o id de mensaje padre) */
  recursoId?: string | null;

  /** Metadatos específicos de la plataforma no contemplados en el formato general */
  metadata: Record<string, unknown>;

  /** Marca temporal en formato ISO 8601 UTC */
  timestamp: string;

  /** Indica si la plataforma reportó el evento en modo pruebas / sandbox */
  esSandbox: boolean;
}

/**
 * Evento saliente normalizado.
 * Generado por el motor de IA / reglas de negocio, agnóstico a la red social.
 */
export interface EventoSaliente {
  /** Identificador único de la respuesta saliente */
  id: string;

  /** ID del evento entrante al que responde */
  eventoEntranteId: string;

  /** Plataforma de destino */
  plataforma: Plataforma;

  /** Destinatario (remitenteId original, ID de chat o ID del post a comentar) */
  destinatarioId: string;

  /** Recurso al que se responde (ej: parent_comment_id en TikTok) */
  recursoId?: string | null;

  /** Tipo de acción a realizar en destino */
  tipoRespuesta: TipoRespuesta;

  /** Texto de la respuesta generado por IA o plantilla del sistema */
  contenido: string;

  /** Metadatos opcionales requeridos por la API destino */
  metadata?: Record<string, unknown>;

  /** Si la plataforma está en Sandbox, el adaptador marcará el envío como simulado */
  esSandbox: boolean;

  /** Fecha y hora de generación ISO 8601 */
  timestamp: string;
}

/**
 * Registro de auditoría persistente (Cloudflare KV / D1).
 * Garantiza trazabilidad completa de cada webhook recibido y respondido.
 */
export interface RegistroAuditoria {
  id: string;
  eventoId: string;
  plataforma: Plataforma;
  tipo: TipoEvento;
  recibidoAt: string;
  procesadoAt?: string;
  respondido: boolean;
  respuestaId?: string;
  esSandbox: boolean;
  estado: 'recibido' | 'procesando' | 'completado' | 'fallido' | 'descartado';
  error?: string;
}

// ────────────────────────────────────────────────────────────
// Tipos de Payloads Crudos de TikTok Webhook
// ────────────────────────────────────────────────────────────

export interface TikTokWebhookPayload {
  event?: string;
  client_key?: string;
  event_id?: string;
  create_time?: number;
  user_open_id?: string;
  user_openid?: string;
  content?: string | {
    comment_id?: string;
    video_id?: string;
    text?: string;
    status?: string;
    share_id?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}


// ────────────────────────────────────────────────────────────
// Tipos de Contenido Multimedia Multi-Formato (Addendum)
// ────────────────────────────────────────────────────────────

export type TipoContenido = 'video' | 'imagen' | 'audio' | 'plantilla' | 'boceto';

export interface ContenidoFuente {
  tipo: TipoContenido;
  archivoUrl: string;          // o referencia al blob subido / R2
  caption: string;
  hashtags: string[];
  duracionSegundos?: number;   // aplica solo a video/audio
  anchoPx?: number;            // aplica a imagen/video
  altoPx?: number;
}

export interface CompatibilidadPlataforma {
  plataforma: Plataforma | 'threads';
  tipoOriginal: TipoContenido;
  soportadoNativamente: boolean;
  tipoEquivalente?: 'video' | 'imagen' | null;
  requiereConversion: boolean;
  motivo?: string;
}

export interface ResultadoEnvio {
  exitoso: boolean;
  plataforma: Plataforma | 'threads';
  idRespuesta?: string;
  idPublicacion?: string;
  urlPublicacion?: string;
  statusHttp?: number;
  error?: string;
  detalles?: Record<string, unknown>;
  esSandbox: boolean;
}

export interface ResultadoOrquestacion {
  idSesion: string;
  timestamp: string;
  resultados: Record<string, ResultadoEnvio>;
  totalExitosos: number;
  totalFallidos: number;
}
