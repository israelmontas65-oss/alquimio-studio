// ============================================================
// functions/cerebro/modulos/recomendacion-historial.ts
// Módulo Especializado: Recomendación Basada en Historial y Rendimiento
// Titularidad: Israel Montás
//
// Pondera el historial del creador (duración, categorías exitosas, horarios)
// en conjunto con las tendencias de mercado para sugerir la optimización
// óptima de una publicación.
// ============================================================

import { llamarIA, EnvIA, RespuestaIA } from '../../shared/cliente-ia';
import { ContextoCompartidoCerebro, serializarContextoParaPrompt } from '../contexto-usuario';
import type { TipoContenido } from '../../shared/tipos';

export interface SolicitudOptimizacion {
  ideaOTextoBase: string;
  tipoContenido: TipoContenido;
  plataformasObjetivo?: string[];
}

export interface ResultadoOptimizacionEditorial {
  captionSugerido: string;
  ganchoViral: string;
  hashtagsSugeridos: string[];
  mejorHorarioSugerido: string;
  duracionRecomendadaSegundos?: number;
  explicacionEstrategica: string;
  metadatosIA: {
    proveedor: string;
    modelo: string;
    latenciaMs: number;
  };
}

const INSTRUCCION_MODULO = `
Eres el Módulo de Optimización de Publicaciones de Alquimia Studio.
Tu objetivo es transformar la idea base del creador en un copy de alto impacto para redes sociales (TikTok, Reels, Shorts, etc.),
incorporando el contexto del creador y las tendencias actuales sin contradecir los datos.

DIRECTRICES:
1. Extrae un gancho (hook) intrigante y potente en las primeras 5 a 10 palabras.
2. Integra emojis estratégicos y un llamado a la acción (CTA) natural al final.
3. Selecciona entre 4 y 6 hashtags que COMBINEN las tendencias activas y el historial provisto en el contexto.
4. Indica la mejor hora de publicación basándote en las ventanas de mayor audiencia del creador indicadas en el contexto.
5. Devuelve EXCLUSIVAMENTE un bloque de código JSON con esta estructura exacta:
{
  "caption": "texto optimizado con emojis y CTA al final",
  "gancho": "frase de gancho inicial",
  "hashtags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "mejorHorario": "hora recomendada",
  "explicacion": "breve justificación de 1 oración"
}
`;

export async function optimizarParaPublicacion(
  solicitud: SolicitudOptimizacion,
  contexto: ContextoCompartidoCerebro,
  env: EnvIA
): Promise<ResultadoOptimizacionEditorial> {
  const contextoPrompt = serializarContextoParaPrompt(contexto);

  const promptUsuario = `
${contextoPrompt}

SOLICITUD DE OPTIMIZACIÓN:
- Idea base: "${solicitud.ideaOTextoBase}"
- Formato: ${solicitud.tipoContenido}
- Redes de destino: ${solicitud.plataformasObjetivo?.join(', ') || 'TikTok, Instagram, YouTube'}

Genera la recomendación en JSON estricto.
`;

  const respuestaIA: RespuestaIA = await llamarIA(promptUsuario, env, {
    systemPromptEspecifico: INSTRUCCION_MODULO,
    temperatura: 0.6,
  });

  // Parsear JSON devuelto por Claude / Gemini / Fallback
  try {
    const jsonMatch = respuestaIA.texto.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        captionSugerido: parsed.caption || solicitud.ideaOTextoBase,
        ganchoViral: parsed.gancho || '¡Descubre esto en Alquimia Studio!',
        hashtagsSugeridos: Array.isArray(parsed.hashtags)
          ? parsed.hashtags.map((h: string) => h.replace(/^#/, ''))
          : ['alquimiastudio', 'creadores'],
        mejorHorarioSugerido: parsed.mejorHorario || contexto.usuario.mejoresHorariosPublicacion[0] || '7:00 PM',
        duracionRecomendadaSegundos: contexto.usuario.duracionPreferidaSegundos.min,
        explicacionEstrategica: parsed.explicacion || 'Optimizado con base en tus métricas históricas y aceleración de mercado.',
        metadatosIA: {
          proveedor: respuestaIA.proveedor,
          modelo: respuestaIA.modeloUtilizado,
          latenciaMs: respuestaIA.latenciaMs,
        },
      };
    }
  } catch (e) {
    console.warn('[modulo:recomendacion-historial] Falló parseo JSON de IA, usando fallback estructurado:', e);
  }

  // Fallback estructurado garantizado
  const tagsFall = [
    contexto.usuario.hashtagsHistoricosTop[0]?.tag || 'alquimiastudio',
    contexto.mercado.hashtagsEmergentes[0]?.tag || 'creadoresdecontenido',
    'aprendeentiktok',
    'videoviral',
  ];

  return {
    captionSugerido: `${solicitud.ideaOTextoBase}\n\n¡Comenta y comparte tu opinión! 🚀`,
    ganchoViral: '¡Atención creadores!',
    hashtagsSugeridos: tagsFall,
    mejorHorarioSugerido: contexto.usuario.mejoresHorariosPublicacion[0] || '7:30 PM',
    duracionRecomendadaSegundos: 25,
    explicacionEstrategica: 'Sugerencia generada con el balance estándar de mercado e historial.',
    metadatosIA: {
      proveedor: respuestaIA.proveedor,
      modelo: respuestaIA.modeloUtilizado,
      latenciaMs: respuestaIA.latenciaMs,
    },
  };
}
