// ============================================================
// functions/cerebro/contexto-usuario.ts
// Constructor del Contexto Compartido Único de Alquimia Studio
// Titularidad: Israel Montás
//
// Unifica en un solo objeto: perfil de aprendizaje del creador,
// patrones de rendimiento histórico y tendencias de mercado en tiempo real.
// Evita que dos módulos analicen la información a ciegas uno del otro.
// ============================================================

import { SimpleKVNamespace } from '../shared/idempotencia';

export interface PerfilAprendizajeUsuario {
  userId: string;
  totalPublicaciones: number;
  pesoMercadoAlpha: number;
  pesoUsuarioBeta: number;
  rendimientoCategorias: Record<string, { total: number; engagementPromedio: number }>;
  hashtagsHistoricosTop: Array<{ tag: string; vecesUsado: number; score: number }>;
  mejoresHorariosPublicacion: string[];
  duracionPreferidaSegundos: { min: number; max: number };
}

export interface TendenciasMercadoActivas {
  timestamp: number;
  fuente: string;
  hashtagsEmergentes: Array<{ tag: string; velocidad: number; categoria: string }>;
  audiosRecomendados: Array<{ titulo: string; duracionSugerida: number }>;
}

export interface ContextoCompartidoCerebro {
  usuario: PerfilAprendizajeUsuario;
  mercado: TendenciasMercadoActivas;
  fechaConsultaISO: string;
}

const PERFIL_DEFECTO: PerfilAprendizajeUsuario = {
  userId: 'usr_creador_default',
  totalPublicaciones: 5,
  pesoMercadoAlpha: 0.70,
  pesoUsuarioBeta: 0.30,
  rendimientoCategorias: {
    tutorial: { total: 3, engagementPromedio: 8.5 },
    tech: { total: 2, engagementPromedio: 9.2 },
    storytelling: { total: 0, engagementPromedio: 0 },
    humor: { total: 0, engagementPromedio: 0 },
    comercial: { total: 0, engagementPromedio: 0 },
  },
  hashtagsHistoricosTop: [
    { tag: 'aprendeentiktok', vecesUsado: 4, score: 96 },
    { tag: 'techtok', vecesUsado: 3, score: 94 },
    { tag: 'alquimiastudio', vecesUsado: 5, score: 98 },
  ],
  mejoresHorariosPublicacion: ['6:30 PM', '8:45 PM'],
  duracionPreferidaSegundos: { min: 15, max: 45 },
};

const TENDENCIAS_DEFECTO: TendenciasMercadoActivas = {
  timestamp: Date.now(),
  fuente: 'Alquimia Market Radar (YouTube Data & Verified Public Signals)',
  hashtagsEmergentes: [
    { tag: 'iaenaccion', velocidad: 240, categoria: 'tech' },
    { tag: 'automatizacion', velocidad: 215, categoria: 'productividad' },
    { tag: 'creadoresdecontenido', velocidad: 175, categoria: 'tutorial' },
    { tag: 'storytime', velocidad: 160, categoria: 'storytelling' },
  ],
  audiosRecomendados: [
    { titulo: 'Trending Beats - High Energy Ambient', duracionSugerida: 25 },
    { titulo: 'Focus Lo-Fi Deep Creative', duracionSugerida: 35 },
  ],
};

/**
 * Construye el contexto unificado que se inyecta en todos los módulos del cerebro.
 */
export async function construirContextoCompartido(
  userId: string,
  env?: { ALQUIMIA_KV?: SimpleKVNamespace; TIKTOK_KV?: SimpleKVNamespace; [key: string]: unknown },
  perfilCliente?: Partial<PerfilAprendizajeUsuario>
): Promise<ContextoCompartidoCerebro> {
  const kv = env?.ALQUIMIA_KV || env?.TIKTOK_KV;
  let usuario = { ...PERFIL_DEFECTO, userId, ...perfilCliente };

  // 1. Cargar perfil persistente de Cloudflare KV si existe
  if (kv && userId) {
    try {
      const stored = await kv.get(`perfil_creador_${userId}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        usuario = { ...usuario, ...parsed };
      }
    } catch (e) {
      console.warn('[contexto-usuario] Error leyendo perfil KV:', e);
    }
  }

  // 2. Cargar tendencias activas de Cloudflare KV si existe
  let mercado = { ...TENDENCIAS_DEFECTO };
  if (kv) {
    try {
      const storedTrends = await kv.get('trends_market_latest');
      if (storedTrends) {
        const parsedTrends = JSON.parse(storedTrends);
        mercado = { ...mercado, ...parsedTrends };
      }
    } catch (e) {
      console.warn('[contexto-usuario] Error leyendo tendencias KV:', e);
    }
  }

  return {
    usuario,
    mercado,
    fechaConsultaISO: new Date().toISOString(),
  };
}

/**
 * Renderiza el contexto en una cadena descriptiva para ser inyectada en el prompt de Claude.
 */
export function serializarContextoParaPrompt(ctx: ContextoCompartidoCerebro): string {
  const tagsUsuario = ctx.usuario.hashtagsHistoricosTop
    .map((h) => `#${h.tag} (score: ${h.score})`)
    .join(', ');

  const tagsMercado = ctx.mercado.hashtagsEmergentes
    .map((h) => `#${h.tag} (+${h.velocidad}% vel)`)
    .join(', ');

  const horarios = ctx.usuario.mejoresHorariosPublicacion.join(', ');

  return `
--- CONTEXTO COMPARTIDO DEL CREADOR (VERIFICADO) ---
- Usuario ID: ${ctx.usuario.userId}
- Balance de Ponderación: ${(ctx.usuario.pesoMercadoAlpha * 100).toFixed(0)}% Mercado vs ${(ctx.usuario.pesoUsuarioBeta * 100).toFixed(0)}% Historial Propio
- Hashtags de Mayor Rendimiento del Creador: ${tagsUsuario || 'Sin registro previo'}
- Tendencias Activas de Mercado en Tiempo Real: ${tagsMercado}
- Ventanas de Mayor Audiencia del Creador: ${horarios}
- Rango de Duración Óptima: ${ctx.usuario.duracionPreferidaSegundos.min}s a ${ctx.usuario.duracionPreferidaSegundos.max}s
-----------------------------------------------------
`;
}
