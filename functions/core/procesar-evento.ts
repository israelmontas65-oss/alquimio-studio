// ============================================================
// functions/core/procesar-evento.ts
// Motor Central de Procesamiento de Eventos de Webhooks
// Alquimia Studio — Titularidad: Israel Montás
//
// Lógica agnóstica a la plataforma: enruta según el tipo de evento
// (mensaje, comentario, mencion, estado_publicacion, autorizacion),
// genera el EventoSaliente correspondiente y mantiene auditoría en KV.
// ============================================================

import type {
  EventoEntrante,
  EventoSaliente,
  RegistroAuditoria,
} from '../shared/tipos';
import {
  generarRespuesta,
  OpcionesGeneracionRespuesta,
} from './generar-respuesta';
import { SimpleKVNamespace } from '../shared/idempotencia';

export interface ContextoProcesamiento {
  env?: {
    ALQUIMIA_KV?: SimpleKVNamespace;
    TIKTOK_KV?: SimpleKVNamespace;
    META_KV?: SimpleKVNamespace;
    GEMINI_API_KEY?: string;
    EXPO_PUBLIC_GEMINI_API_KEY?: string;
    AI?: {
      run: (model: string, inputs: Record<string, unknown>) => Promise<{ response?: string }>;
    };
    [key: string]: unknown;
  };
  opciones?: OpcionesGeneracionRespuesta;
}

/**
 * Función central de procesamiento de Alquimia Studio.
 * Recibe un EventoEntrante ya normalizado y decide la acción a ejecutar.
 */
export async function procesarEvento(
  evento: EventoEntrante,
  contexto?: ContextoProcesamiento
): Promise<EventoSaliente | null> {
  const kv = contexto?.env?.ALQUIMIA_KV || contexto?.env?.META_KV || contexto?.env?.TIKTOK_KV;
  const geminiKey =
    contexto?.opciones?.geminiApiKey ||
    contexto?.env?.GEMINI_API_KEY ||
    contexto?.env?.EXPO_PUBLIC_GEMINI_API_KEY;

  const opcionesGeneracion: OpcionesGeneracionRespuesta = {
    geminiApiKey: geminiKey,
    cloudflareAi: contexto?.env?.AI,
    nombreMarca: 'Alquimia Studio',
    ...contexto?.opciones,
  };

  const idSaliente = `out_${evento.plataforma}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  // 1. Registro inicial de Auditoría en KV (TTL 7 días = 604,800 segundos)
  const auditKey = `audit_${evento.plataforma}_${evento.id}`;
  const registroAuditoria: RegistroAuditoria = {
    id: `audit_rec_${evento.id}`,
    eventoId: evento.id,
    plataforma: evento.plataforma,
    tipo: evento.tipo,
    recibidoAt: evento.timestamp,
    procesadoAt: new Date().toISOString(),
    respondido: false,
    esSandbox: evento.esSandbox,
    estado: 'procesando',
  };

  if (kv) {
    try {
      await kv.put(auditKey, JSON.stringify(registroAuditoria), { expirationTtl: 604800 });
    } catch (err) {
      console.warn('[procesar-evento] Advertencia al registrar auditoría en KV:', err);
    }
  }

  let eventoSaliente: EventoSaliente | null = null;

  try {
    switch (evento.tipo) {
      case 'mensaje':
      case 'comentario':
      case 'mencion': {
        // Generar respuesta con IA (Gemini / Workers AI / Heurística)
        const resultadoRespuesta = await generarRespuesta(evento, opcionesGeneracion);

        eventoSaliente = {
          id: idSaliente,
          eventoEntranteId: evento.id,
          plataforma: evento.plataforma,
          destinatarioId: evento.remitenteId,
          recursoId: evento.recursoId,
          tipoRespuesta: resultadoRespuesta.tipoRespuesta,
          contenido: resultadoRespuesta.texto,
          metadata: {
            ...resultadoRespuesta.metadatos,
            origenEvento: evento.tipo,
          },
          esSandbox: evento.esSandbox,
          timestamp: new Date().toISOString(),
        };
        break;
      }

      case 'estado_publicacion': {
        // Registrar actualización de telemetría de publicación o entrega
        if (kv && evento.recursoId) {
          const statusKey = `status_pub_${evento.plataforma}_${evento.recursoId}`;
          await kv.put(
            statusKey,
            JSON.stringify({
              recursoId: evento.recursoId,
              plataforma: evento.plataforma,
              estado: evento.metadata?.estadoEntrega || evento.contenido || 'actualizado',
              timestamp: evento.timestamp,
            }),
            { expirationTtl: 2592000 } // 30 días
          );
        }

        // Si el estado es relevante para el sistema, se crea notificación interna
        const resultado = await generarRespuesta(evento, opcionesGeneracion);
        eventoSaliente = {
          id: idSaliente,
          eventoEntranteId: evento.id,
          plataforma: evento.plataforma,
          destinatarioId: 'sistema_alquimia',
          recursoId: evento.recursoId,
          tipoRespuesta: 'notificacion_interna',
          contenido: resultado.texto,
          metadata: {
            ...evento.metadata,
          },
          esSandbox: evento.esSandbox,
          timestamp: new Date().toISOString(),
        };
        break;
      }

      case 'autorizacion': {
        // Registrar evento crítico de autorización o revocación en KV
        if (kv) {
          const authKey = `auth_evt_${evento.plataforma}_${Date.now()}`;
          await kv.put(
            authKey,
            JSON.stringify({
              plataforma: evento.plataforma,
              remitenteId: evento.remitenteId,
              contenido: evento.contenido,
              metadata: evento.metadata,
              timestamp: evento.timestamp,
            }),
            { expirationTtl: 7776000 } // 90 días
          );
        }

        const resultado = await generarRespuesta(evento, opcionesGeneracion);
        eventoSaliente = {
          id: idSaliente,
          eventoEntranteId: evento.id,
          plataforma: evento.plataforma,
          destinatarioId: 'admin_alquimia',
          recursoId: null,
          tipoRespuesta: 'notificacion_interna',
          contenido: resultado.texto,
          metadata: {
            alertaSeguridad: true,
            ...evento.metadata,
          },
          esSandbox: evento.esSandbox,
          timestamp: new Date().toISOString(),
        };
        break;
      }

      default:
        console.warn(`[procesar-evento] Tipo de evento no reconocido: ${(evento as { tipo: string }).tipo}`);
        break;
    }

    // 2. Actualizar registro de auditoría final
    registroAuditoria.estado = 'completado';
    registroAuditoria.respondido = eventoSaliente !== null;
    registroAuditoria.respuestaId = eventoSaliente?.id;

    if (kv) {
      await kv.put(auditKey, JSON.stringify(registroAuditoria), { expirationTtl: 604800 });
    }

    return eventoSaliente;
  } catch (error) {
    console.error('[procesar-evento] Error al procesar evento:', error);

    // Registrar fallo en auditoría
    registroAuditoria.estado = 'fallido';
    registroAuditoria.error = error instanceof Error ? error.message : String(error);

    if (kv) {
      await kv.put(auditKey, JSON.stringify(registroAuditoria), { expirationTtl: 604800 });
    }

    return null;
  }
}
