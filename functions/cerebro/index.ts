// ============================================================
// functions/cerebro/index.ts
// UN SOLO CEREBRO: Punto Único de Entrada de Inteligencia de Alquimia Studio
// Titularidad: Israel Montás
//
// Coordina el contexto compartido del creador, enruta las intenciones
// y despacha a módulos especializados bajo las reglas base anti-alucinaciones.
// ============================================================

import { EnvIA, llamarIA } from '../shared/cliente-ia';
import { SimpleKVNamespace } from '../shared/idempotencia';
import {
  construirContextoCompartido,
  ContextoCompartidoCerebro,
  serializarContextoParaPrompt,
} from './contexto-usuario';
import { determinarRuta, SolicitudCerebro, TipoSolicitudCerebro } from './enrutador';
import {
  optimizarParaPublicacion,
  ResultadoOptimizacionEditorial,
} from './modulos/recomendacion-historial';
import {
  analizarMercado,
  ResultadoInvestigacionMercado,
} from './modulos/investigacion-mercado';
import {
  responderEventoWebhook,
  ResultadoRespuestaWebhook,
} from './modulos/respuesta-webhooks';
import type { EventoEntrante } from '../shared/tipos';

export interface ContextoEnvCerebro extends EnvIA {
  ALQUIMIA_KV?: SimpleKVNamespace;
  TIKTOK_KV?: SimpleKVNamespace;
  [key: string]: unknown;
}

export interface ResultadoCerebro {
  tipoRuta: TipoSolicitudCerebro;
  resultado:
    | { tipo: 'optimizacion'; data: ResultadoOptimizacionEditorial }
    | { tipo: 'mercado'; data: ResultadoInvestigacionMercado }
    | { tipo: 'webhook'; data: ResultadoRespuestaWebhook }
    | { tipo: 'general'; texto: string; latenciaMs: number; proveedor: string };
  contextoUtilizado: {
    userId: string;
    pesoMercado: number;
    pesoUsuario: number;
    timestampConsulta: string;
  };
}

/**
 * Único punto de entrada para toda la inteligencia artificial de Alquimia Studio.
 */
export async function consultarCerebro(
  solicitud: SolicitudCerebro,
  env: ContextoEnvCerebro
): Promise<ResultadoCerebro> {
  const userId = solicitud.userId || 'usr_creador_default';

  // 1. Construir contexto unificado compartido (historial + mercado + preferencias)
  const contexto: ContextoCompartidoCerebro = await construirContextoCompartido(
    userId,
    env,
    solicitud.metadata?.perfilUsuario as Record<string, unknown> | undefined
  );

  // 2. Determinar la ruta adecuada mediante el enrutador central
  const ruta: TipoSolicitudCerebro = determinarRuta(solicitud);

  const contextoResumen = {
    userId: contexto.usuario.userId,
    pesoMercado: contexto.usuario.pesoMercadoAlpha,
    pesoUsuario: contexto.usuario.pesoUsuarioBeta,
    timestampConsulta: contexto.fechaConsultaISO,
  };

  // 3. Despacho al módulo interno correspondiente
  switch (ruta) {
    case 'recomendacion_publicacion': {
      const data = await optimizarParaPublicacion(
        {
          ideaOTextoBase: solicitud.texto,
          tipoContenido: (solicitud.metadata?.tipoContenido as 'video') || 'video',
          plataformasObjetivo: (solicitud.metadata?.plataformas as string[]) || undefined,
        },
        contexto,
        env
      );
      return {
        tipoRuta: ruta,
        resultado: { tipo: 'optimizacion', data },
        contextoUtilizado: contextoResumen,
      };
    }

    case 'investigacion_mercado': {
      const data = await analizarMercado(
        {
          consulta: solicitud.texto,
          categoriaNicho: (solicitud.metadata?.categoria as string) || undefined,
          region: (solicitud.metadata?.region as string) || undefined,
        },
        contexto,
        env
      );
      return {
        tipoRuta: ruta,
        resultado: { tipo: 'mercado', data },
        contextoUtilizado: contextoResumen,
      };
    }

    case 'respuesta_webhook': {
      const evento = (solicitud.metadata?.eventoEntrante as EventoEntrante) || {
        id: `adhoc_${Date.now()}`,
        plataforma: 'tiktok',
        tipo: 'mensaje',
        remitenteId: 'usuario_externo',
        contenido: solicitud.texto,
        metadata: {},
        timestamp: new Date().toISOString(),
        esSandbox: false,
      };

      const data = await responderEventoWebhook(evento, contexto, env);
      return {
        tipoRuta: ruta,
        resultado: { tipo: 'webhook', data },
        contextoUtilizado: contextoResumen,
      };
    }

    case 'consulta_general':
    default: {
      const contextoPrompt = serializarContextoParaPrompt(contexto);
      const res = await llamarIA(
        `${contextoPrompt}\n\nCONSULTA GENERAL DEL CREADOR:\n"${solicitud.texto}"`,
        env,
        {
          systemPromptEspecifico:
            'Eres el Cerebro Central de Alquimia Studio. Responde con criterio experto, ágil y conciso.',
        }
      );
      return {
        tipoRuta: 'consulta_general',
        resultado: {
          tipo: 'general',
          texto: res.texto,
          latenciaMs: res.latenciaMs,
          proveedor: res.proveedor,
        },
        contextoUtilizado: contextoResumen,
      };
    }
  }
}
