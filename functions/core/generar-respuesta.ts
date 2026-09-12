// ============================================================
// functions/core/generar-respuesta.ts
// Generador de Respuestas para Webhooks — Conectado al Cerebro Único
// Alquimia Studio — Titularidad: Israel Montás
//
// Delega la generación de respuestas al Cerebro Central (functions/cerebro)
// garantizando unificación de contexto, cliente único de Anthropic Claude
// y reglas base contra alucinaciones.
// ============================================================

import type { EventoEntrante, TipoRespuesta } from '../shared/tipos';
import { consultarCerebro } from '../cerebro';

export interface OpcionesGeneracionRespuesta {
  anthropicApiKey?: string;
  geminiApiKey?: string;
  cloudflareAi?: {
    run: (model: string, inputs: Record<string, unknown>) => Promise<{ response?: string }>;
  };
  nombreMarca?: string;
  tono?: 'profesional' | 'creativo' | 'soporte' | 'social';
}

export interface ResultadoGeneracionRespuesta {
  texto: string;
  tipoRespuesta: TipoRespuesta;
  metadatos: {
    proveedorIA: string;
    modelo?: string;
    latenciaMs: number;
    tokensAproximados?: number;
  };
}

/**
 * Genera la respuesta apropiada para un evento entrante normalizado.
 * Conectado al Cerebro Central de Alquimia Studio.
 */
export async function generarRespuesta(
  evento: EventoEntrante,
  opciones?: OpcionesGeneracionRespuesta
): Promise<ResultadoGeneracionRespuesta> {
  const tInicio = Date.now();
  const nombreMarca = opciones?.nombreMarca || 'Alquimia Studio';

  // 1. Eventos técnicos que no requieren LLM conversacional
  if (evento.tipo === 'autorizacion') {
    return {
      texto: `[${nombreMarca} - Notificación de Seguridad] Evento de autorización recibido de ${evento.plataforma}: ${evento.contenido || 'Actualización de credenciales'}.`,
      tipoRespuesta: 'notificacion_interna',
      metadatos: {
        proveedorIA: 'regla_fija',
        latenciaMs: Date.now() - tInicio,
      },
    };
  }

  if (evento.tipo === 'estado_publicacion') {
    const estadoMsg = evento.metadata?.estadoEntrega
      ? `Estado de entrega: ${evento.metadata.estadoEntrega}`
      : `Estado de publicación en ${evento.plataforma}: ${evento.contenido || 'completado'}`;

    return {
      texto: `[${nombreMarca}] ${estadoMsg}`,
      tipoRespuesta: 'notificacion_interna',
      metadatos: {
        proveedorIA: 'regla_fija',
        latenciaMs: Date.now() - tInicio,
      },
    };
  }

  // 2. Consulta al Cerebro Único de Alquimia Studio
  try {
    const respuestaCerebro = await consultarCerebro(
      {
        tipo: 'respuesta_webhook',
        texto: evento.contenido || '',
        userId: evento.remitenteId,
        metadata: {
          eventoEntrante: evento,
          nombreMarca,
        },
      },
      {
        ANTHROPIC_API_KEY: opciones?.anthropicApiKey,
        GEMINI_API_KEY: opciones?.geminiApiKey,
      }
    );

    if (respuestaCerebro.resultado.tipo === 'webhook') {
      const data = respuestaCerebro.resultado.data;
      return {
        texto: data.texto,
        tipoRespuesta: data.tipoRespuesta,
        metadatos: {
          proveedorIA: data.metadatos.proveedor,
          modelo: data.metadatos.modelo,
          latenciaMs: data.metadatos.latenciaMs,
        },
      };
    }
  } catch (err) {
    console.warn('[generar-respuesta] Error en Cerebro Central, activando plantilla de respaldo:', err);
  }

  // 3. Respaldo Heurístico de Alta Fidelidad si falla la conexión
  const tipoRespuesta: TipoRespuesta =
    evento.tipo === 'comentario' ? 'comentario' : 'mensaje_directo';

  return {
    texto: generarPorPlantilla(evento, nombreMarca),
    tipoRespuesta,
    metadatos: {
      proveedorIA: 'plantilla_heuristica',
      latenciaMs: Date.now() - tInicio,
    },
  };
}

/**
 * Generador de plantillas heurísticas contextuales (Respaldo offline)
 */
function generarPorPlantilla(evento: EventoEntrante, nombreMarca: string): string {
  const texto = (evento.contenido || '').toLowerCase();
  const nombre = evento.remitenteNombre ? `, ${evento.remitenteNombre}` : '';

  if (evento.tipo === 'comentario') {
    if (texto.includes('como') || texto.includes('cómo') || texto.includes('info') || texto.includes('precio')) {
      return `¡Hola${nombre}! Con ${nombreMarca} puedes publicar y gestionar tus videos simultáneamente en todas tus redes. ¡Visita nuestro portal para más detalles! 🚀`;
    }
    return `¡Gracias por tu comentario${nombre}! Saludos del equipo de ${nombreMarca} 🙌`;
  }

  if (texto.includes('publicar') || texto.includes('video') || texto.includes('reel') || texto.includes('post')) {
    return `¡Hola${nombre}! Recibimos tu solicitud en ${nombreMarca}. Tu publicación multi-red está siendo procesada por nuestro sistema. Te notificaremos en cuanto esté confirmada. 🎬`;
  }

  return `¡Hola${nombre}! Gracias por comunicarte con ${nombreMarca}. Hemos recibido tu mensaje y nuestro sistema central está listo para ayudarte. ¿En qué podemos apoyarte hoy? ✨`;
}
