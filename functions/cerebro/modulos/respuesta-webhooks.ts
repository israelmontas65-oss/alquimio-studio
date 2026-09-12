// ============================================================
// functions/cerebro/modulos/respuesta-webhooks.ts
// Módulo Especializado: Respuestas a Eventos de Webhooks
// Titularidad: Israel Montás
//
// Construye respuestas contextuales para comentarios, mensajes directos
// y alertas operativas respetando la identidad unificada de Alquimia Studio.
// ============================================================

import type { EventoEntrante, TipoRespuesta } from '../../shared/tipos';
import { llamarIA, EnvIA, RespuestaIA } from '../../shared/cliente-ia';
import { ContextoCompartidoCerebro } from '../contexto-usuario';

export interface ResultadoRespuestaWebhook {
  texto: string;
  tipoRespuesta: TipoRespuesta;
  metadatos: {
    proveedor: string;
    modelo: string;
    latenciaMs: number;
  };
}

const INSTRUCCION_MODULO = `
Eres el Asistente Oficial de Atención y Redes de Alquimia Studio (fundada por Israel Montás).
Tu tarea es responder comentarios o mensajes directos de forma útil, profesional, concisa y empática.

DIRECTRICES:
1. Para comentarios en publicaciones: máximo 1 o 2 oraciones, tono social atractivo, con 1 emoji adecuado.
2. Para mensajes directos (DMs): máximo 1 o 2 párrafos concisos y serviciales.
3. Responde siempre en el mismo idioma en el que fue recibido el mensaje original.
4. No prometas funciones inexistentes ni inventes acuerdos comerciales.
`;

export async function responderEventoWebhook(
  evento: EventoEntrante,
  contexto: ContextoCompartidoCerebro,
  env: EnvIA
): Promise<ResultadoRespuestaWebhook> {
  const tInicio = Date.now();

  // 1. Eventos técnicos que no requieren LLM conversacional
  if (evento.tipo === 'autorizacion') {
    return {
      texto: `[Alquimia Studio - Alerta de Autorización] ${evento.contenido || 'Cambio de credenciales en ' + evento.plataforma}. Trazabilidad confirmada.`,
      tipoRespuesta: 'notificacion_interna',
      metadatos: {
        proveedor: 'sistema_interno',
        modelo: 'regla_fija',
        latenciaMs: Date.now() - tInicio,
      },
    };
  }

  if (evento.tipo === 'estado_publicacion') {
    return {
      texto: `[Alquimia Studio - Telemetría] ${evento.contenido || 'Estado actualizado en ' + evento.plataforma}.`,
      tipoRespuesta: 'notificacion_interna',
      metadatos: {
        proveedor: 'sistema_interno',
        modelo: 'regla_fija',
        latenciaMs: Date.now() - tInicio,
      },
    };
  }

  // 2. Interacciones de usuario (comentario o mensaje)
  const tipoRespuesta: TipoRespuesta =
    evento.tipo === 'comentario' ? 'comentario' : 'mensaje_directo';

  const promptUsuario = `
INTERACCIÓN ENTRANTE:
- Plataforma: ${evento.plataforma}
- Tipo: ${evento.tipo}
- Remitente: ${evento.remitenteNombre || evento.remitenteId}
- Contenido: "${evento.contenido || ''}"

Genera una respuesta apropiada para este canal.
`;

  const respuestaIA: RespuestaIA = await llamarIA(promptUsuario, env, {
    systemPromptEspecifico: INSTRUCCION_MODULO,
    temperatura: 0.6,
    maxTokens: 200,
  });

  return {
    texto: respuestaIA.texto,
    tipoRespuesta,
    metadatos: {
      proveedor: respuestaIA.proveedor,
      modelo: respuestaIA.modeloUtilizado,
      latenciaMs: respuestaIA.latenciaMs,
    },
  };
}
