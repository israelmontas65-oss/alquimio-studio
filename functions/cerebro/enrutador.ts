// ============================================================
// functions/cerebro/enrutador.ts
// Enrutador de Decisiones del Cerebro Central de Alquimia Studio
// Titularidad: Israel Montás
//
// Determina a qué módulo especializado se despacha cada solicitud entrante,
// evitando que los módulos decidan de forma aislada.
// ============================================================

export type TipoSolicitudCerebro =
  | 'recomendacion_publicacion'
  | 'investigacion_mercado'
  | 'respuesta_webhook'
  | 'consulta_general';

export interface SolicitudCerebro {
  tipo?: TipoSolicitudCerebro;
  texto: string;
  userId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Clasifica y enruta la solicitud hacia el módulo interno adecuado.
 */
export function determinarRuta(solicitud: SolicitudCerebro): TipoSolicitudCerebro {
  // 1. Si el tipo viene especificado explícitamente por el sistema llamante
  if (solicitud.tipo) {
    return solicitud.tipo;
  }

  const texto = (solicitud.texto || '').toLowerCase();

  // 2. Patrones de eventos de webhook
  if (solicitud.metadata?.eventoEntrante || texto.startsWith('webhook:')) {
    return 'respuesta_webhook';
  }

  // 3. Patrones de investigación de mercado / radar
  if (
    texto.includes('tendencia') ||
    texto.includes('trending') ||
    texto.includes('radar') ||
    texto.includes('mercado') ||
    texto.includes('viral') ||
    texto.includes('velocidad') ||
    texto.includes('que hashtag usar hoy') ||
    texto.includes('qué hashtag usar hoy')
  ) {
    return 'investigacion_mercado';
  }

  // 4. Patrones de optimización y publicación de contenido
  if (
    texto.includes('publicar') ||
    texto.includes('caption') ||
    texto.includes('copy') ||
    texto.includes('gancho') ||
    texto.includes('hook') ||
    texto.includes('optimizar') ||
    texto.includes('video') ||
    texto.includes('reel') ||
    texto.includes('horario')
  ) {
    return 'recomendacion_publicacion';
  }

  return 'consulta_general';
}
