// ============================================================
// src/services/ai/HashtagAgent.ts
// AGENTE DE HASHTAGS — ALQUIMIA STUDIO
// Consulta PRIMERO la base de datos de tendencias en tiempo real
// y combina: 40% Tendencias de Mercado, 40% Nicho y 20% Historial de Usuario.
// Cero manipulación de archivos binarios: Solo cadenas de texto y métricas.
// ============================================================

import type { ContentCategory, HashtagSelectionResult, MarketTrendsData, TrendRegion, UserLearningProfile } from './types';

// Fallback de tendencias de mercado en tiempo real si no hay conexión de red
const FALLBACK_MARKET_TRENDS: string[] = [
  'aprendeentiktok',
  'creadoresdecontenido',
  'techtok',
  'storytime',
  'reelsviral',
  'shortsviral',
  'automatizacion',
  'marketingdigital2026',
  'videotips',
  'iaenaccion',
];

const NICHE_TAGS_MAP: Record<ContentCategory, string[]> = {
  tutorial: ['tutoriales', 'tipscreadores', 'pasoapaso', 'hacksutiles', 'productividadviral'],
  tech: ['ia', 'tecnologia', 'softwarecreativo', 'futurodigital', 'programacion'],
  storytelling: ['historiastiktok', 'casosreales', 'experiencias', 'leccionesdevida', 'storyteller'],
  humor: ['humorlatino', 'comediaenespañol', 'momentosdivertidos', 'videosderisa', 'gracioso'],
  commercial: ['emprendedores', 'negociosonline', 'marcapersonal', 'ventasinteligentes', 'exito'],
  education: ['conocimiento', 'sabiasque', 'curiosidades', 'cienciaparatodos', 'educacion'],
  lifestyle: ['estilodevida', 'rutinadiaria', 'vlogsenespañol', 'motivacion', 'crecimiento'],
  document: [],
  general: ['viral', 'tendencia', 'parati', 'fyp', 'explorepage'],
};

export class HashtagAgent {
  /**
   * Obtiene la terna balanceada de hashtags consultando primero las tendencias de mercado en vivo.
   */
  public static async selectHashtags(
    category: ContentCategory,
    userProfile?: UserLearningProfile | null,
    liveTrends?: MarketTrendsData | null,
    targetRegion?: TrendRegion
  ): Promise<HashtagSelectionResult> {
    const activeRegion: TrendRegion = targetRegion || (liveTrends?.region as TrendRegion) || 'GLOBAL';

    // 1. Pilar de Mercado (40%): Consultar base de datos de tendencias en vivo
    const trendingMarket = this.extractMarketTrends(liveTrends);

    // 2. Pilar de Nicho (40%): Hashtags relevantes a la categoría clasificada
    const nicheSpecific = NICHE_TAGS_MAP[category] || NICHE_TAGS_MAP.general;

    // 3. Pilar del Usuario (20%): Historial con mayor rendimiento del creador
    const userHistorical = this.extractUserHistoricalTags(userProfile);

    // Combinación inteligente sin duplicados
    const combinedSet = new Set<string>();

    // Tomar 3-4 del mercado
    trendingMarket.slice(0, 4).forEach((tag) => combinedSet.add(tag.replace('#', '')));
    // Tomar 3-4 de nicho
    nicheSpecific.slice(0, 4).forEach((tag) => combinedSet.add(tag.replace('#', '')));
    // Tomar 2 del historial del usuario
    userHistorical.slice(0, 2).forEach((tag) => combinedSet.add(tag.replace('#', '')));

    const combined = Array.from(combinedSet);

    return {
      trendingMarket: trendingMarket.slice(0, 4),
      nicheSpecific: nicheSpecific.slice(0, 4),
      userHistorical: userHistorical.slice(0, 2),
      combined,
      region: activeRegion,
    };
  }

  private static extractMarketTrends(liveTrends?: MarketTrendsData | null): string[] {
    if (liveTrends && liveTrends.hashtags && liveTrends.hashtags.length > 0) {
      // Ordenar por velocidad de aceleración (% de crecimiento)
      return liveTrends.hashtags
        .sort((a, b) => b.velocity - a.velocity)
        .map((item) => item.tag.replace('#', ''));
    }
    return FALLBACK_MARKET_TRENDS;
  }

  private static extractUserHistoricalTags(userProfile?: UserLearningProfile | null): string[] {
    if (userProfile && userProfile.historicalTopHashtags && userProfile.historicalTopHashtags.length > 0) {
      return userProfile.historicalTopHashtags
        .sort((a, b) => b.score - a.score)
        .map((item) => item.tag.replace('#', ''));
    }
    // Fallback inicial para creadores noveles sin historial
    return ['alquimia', 'creadores'];
  }
}
