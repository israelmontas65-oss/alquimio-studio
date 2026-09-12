// ============================================================
// functions/cerebro/modulos/investigacion-mercado.ts
// Módulo Especializado: Radar e Investigación de Tendencias de Mercado
// Titularidad: Israel Montás
//
// Procesa preguntas sobre el pulso actual de las redes sociales,
// aceleración de hashtags, nichos emergentes y patrones de consumo.
// ============================================================

import { llamarIA, EnvIA, RespuestaIA } from '../../shared/cliente-ia';
import { ContextoCompartidoCerebro, serializarContextoParaPrompt } from '../contexto-usuario';

export interface SolicitudInvestigacionMercado {
  consulta: string;
  categoriaNicho?: string;
  region?: string;
}

export interface ResultadoInvestigacionMercado {
  analisis: string;
  tendenciasDestacadas: string[];
  audiosRecomendados: Array<{ titulo: string; duracionSugerida: number }>;
  advertenciaSaturacion?: string;
  metadatosIA: {
    proveedor: string;
    modelo: string;
    latenciaMs: number;
  };
}

const INSTRUCCION_MODULO = `
Eres el Analista de Inteligencia de Mercado de Alquimia Studio.
Tu objetivo es responder a preguntas del creador sobre tendencias, velocidad de hashtags y patrones virales, basándote ÚNICAMENTE en los datos reales del radar de mercado proporcionados en el contexto.

DIRECTRICES:
1. Responde de forma ejecutiva, directa y estratégica.
2. Si el creador pregunta sobre un tema o categoría donde no hay métricas en el contexto, declara con honestidad: "No hay señales suficientes registradas en el radar actual para esa categoría", en lugar de inventar tendencias.
3. Menciona las tasas de velocidad o categorías exactas provistas en el contexto.
4. Al final, incluye 3 recomendaciones accionables y concisas para la producción de contenido.
`;

export async function analizarMercado(
  solicitud: SolicitudInvestigacionMercado,
  contexto: ContextoCompartidoCerebro,
  env: EnvIA
): Promise<ResultadoInvestigacionMercado> {
  const contextoPrompt = serializarContextoParaPrompt(contexto);

  const promptUsuario = `
${contextoPrompt}

CONSULTA DE MERCADO DEL CREADOR:
"${solicitud.consulta}"
${solicitud.categoriaNicho ? `- Categoría de interés: ${solicitud.categoriaNicho}` : ''}
${solicitud.region ? `- Región: ${solicitud.region}` : ''}
`;

  const respuestaIA: RespuestaIA = await llamarIA(promptUsuario, env, {
    systemPromptEspecifico: INSTRUCCION_MODULO,
    temperatura: 0.5,
  });

  const tendenciasTags = contexto.mercado.hashtagsEmergentes.map((h) => `#${h.tag}`);

  return {
    analisis: respuestaIA.texto,
    tendenciasDestacadas: tendenciasTags,
    audiosRecomendados: contexto.mercado.audiosRecomendados,
    advertenciaSaturacion: 'Evalúa la originalidad del gancho para destacar sobre la densidad actual del nicho.',
    metadatosIA: {
      proveedor: respuestaIA.proveedor,
      modelo: respuestaIA.modeloUtilizado,
      latenciaMs: respuestaIA.latenciaMs,
    },
  };
}
