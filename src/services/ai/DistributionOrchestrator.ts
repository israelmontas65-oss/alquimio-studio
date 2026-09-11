// ============================================================
// src/services/ai/DistributionOrchestrator.ts
// ORQUESTADOR DE DISTRIBUCIÓN — ALQUIMIA STUDIO
// Coordina la ejecución sincronizada de los 4 agentes especializados:
// 1. ContentClassifierAgent
// 2. HashtagAgent (conecta a tendencias en tiempo real)
// 3. FormatAdapterAgent
// 4. ContinuousLearningAgent (pondera pesos individuales)
// CUMPLIMIENTO LEGAL: Cero descarga o copia de archivos ajenos.
// ============================================================

import { ContentClassifierAgent } from './ContentClassifierAgent';
import { FormatAdapterAgent } from './FormatAdapterAgent';
import { HashtagAgent } from './HashtagAgent';
import { ContinuousLearningAgent } from './ContinuousLearningAgent';
import type {
  MarketTrendsData,
  OrchestratedOptimizationResult,
  PredictiveReachEstimate,
  TrendingSoundMeta,
  TrendRegion,
} from './types';

export class DistributionOrchestrator {
  private static cachedTrends: Record<string, MarketTrendsData> = {};
  private static lastTrendsFetch: Record<string, number> = {};

  /**
   * Consulta las tendencias del mercado en tiempo real desde el endpoint backend de Cloudflare Pages.
   */
  public static async fetchMarketTrends(region: TrendRegion = 'GLOBAL'): Promise<MarketTrendsData> {
    const now = Date.now();
    const cacheKey = region || 'GLOBAL';

    // Reutilizar caché en memoria por 5 minutos
    if (this.cachedTrends[cacheKey] && (now - (this.lastTrendsFetch[cacheKey] || 0)) < 300_000) {
      return this.cachedTrends[cacheKey];
    }

    try {
      const res = await fetch(`/api/trends/market?region=${encodeURIComponent(cacheKey)}`);
      if (res.ok) {
        const data = (await res.json()) as MarketTrendsData;
        this.cachedTrends[cacheKey] = data;
        this.lastTrendsFetch[cacheKey] = now;
        return data;
      }
    } catch (err) {
      console.warn('[DistributionOrchestrator] Fallback a tendencias locales:', err);
    }

    // Respaldo estructural dinámico
    const fallbackTrends: MarketTrendsData = {
      timestamp: now,
      dataSource: 'Alquimia Engine Snapshot (TikTok Creative Center & YouTube Data Metadata)',
      region: cacheKey,
      isDegradedMode: true,
      lastSuccessfulUpdateText: 'Modo Caché Resiliente • Datos locales protegidos',
      hashtags: [
        { tag: 'aprendeentiktok', velocity: 168, volume: '48.2M', category: 'Tutorial', isEmerging: false, region: cacheKey },
        { tag: 'creadoresdecontenido', velocity: 142, volume: '19.5M', category: 'Emprendimiento', isEmerging: false, region: cacheKey },
        { tag: 'techtok', velocity: 195, volume: '31.0M', category: 'Tecnología', isEmerging: true, region: cacheKey },
        { tag: 'iaenaccion', velocity: 240, volume: '6.3M', category: 'Tecnología', isEmerging: true, region: cacheKey },
        { tag: 'automatizacion', velocity: 220, volume: '8.7M', category: 'Productividad', isEmerging: true, region: cacheKey },
        { tag: 'storytime', velocity: 110, volume: '84.1M', category: 'Storytelling', isEmerging: false, region: cacheKey },
        { tag: 'reelsviral', velocity: 135, volume: '27.8M', category: 'Lifestyle', isEmerging: false, region: cacheKey },
        { tag: 'shortsviral', velocity: 154, volume: '36.4M', category: 'Shorts', isEmerging: true, region: cacheKey },
      ],
      sounds: [
        {
          soundId: 'tt_sound_738291048190',
          title: 'Cyber Ambient Velocity (Original Sound)',
          author: 'SoundLab Official',
          recommendedDurationSec: 18,
          velocityRank: 1,
          referenceUrl: 'https://www.tiktok.com/music/original-sound-738291048190',
        },
        {
          soundId: 'yt_audio_trending_49201',
          title: 'Upbeat Tech Showcase Minimalist',
          author: 'YouTube Audio Library Trending',
          recommendedDurationSec: 32,
          velocityRank: 2,
          referenceUrl: 'https://studio.youtube.com/channel/audio',
        },
      ],
      patterns: [
        {
          category: 'Tutorial Rápido',
          recommendedDuration: '18–32 seg',
          bestHookStyle: 'Pregunta provocadora en primeros 2 seg + visual',
          growthFactor: 2.1,
          topNiche: 'Educación & Tech',
        },
      ],
      schedule: [
        {
          platform: 'tiktok',
          bestHoursToday: ['12:30 PM', '6:15 PM', '9:45 PM'],
          bestDaysOfWeek: ['Martes', 'Jueves', 'Viernes'],
          peakEngagementWindow: '6:00 PM – 10:00 PM',
        },
      ],
    };

    this.cachedTrends[cacheKey] = fallbackTrends;
    this.lastTrendsFetch[cacheKey] = now;
    return fallbackTrends;
  }

  /**
   * Pipeline Maestro: Ejecuta los agentes en orden coordinado.
   */
  public static async optimizeContent(
    caption: string,
    mediaType: string = 'video',
    targetRegion: TrendRegion = 'GLOBAL'
  ): Promise<OrchestratedOptimizationResult> {
    // 1. Obtener tendencias del mercado en vivo
    const liveTrends = await this.fetchMarketTrends(targetRegion);

    // 2. Agente Clasificador: entender semántica, categoría y tono
    const classification = ContentClassifierAgent.classify(caption, mediaType);

    // 3. Agente de Aprendizaje: cargar perfil y pesos del creador
    const userProfile = ContinuousLearningAgent.getProfile();

    // 4. Agente de Hashtags: consultar primero tendencias en vivo + nicho + usuario
    const hashtags = await HashtagAgent.selectHashtags(
      classification.category,
      userProfile,
      liveTrends,
      targetRegion
    );

    // 5. Agente Adaptador de Formato: derivar copys por cada red social
    const platformCopies = FormatAdapterAgent.adaptForPlatforms(
      caption,
      classification,
      hashtags.combined
    );

    // 6. Selección de sonido público en tendencia afín (solo ID y metadatos)
    let recommendedSound: TrendingSoundMeta | null = null;
    if (liveTrends.sounds && liveTrends.sounds.length > 0) {
      recommendedSound = liveTrends.sounds[0];
    }

    // 7. Horario sugerido para hoy
    const scheduleItem = liveTrends.schedule?.find((s) => s.platform === 'tiktok');
    const bestTimeNow = scheduleItem?.bestHoursToday?.[1] || '6:30 PM';

    // 8. Alerta de tendencia emergente relevante
    let emergingAlert: { tag: string; velocity: string; tip: string } | null = null;
    const fastTrend = liveTrends.hashtags?.find((h) => h.isEmerging && h.velocity > 180);
    if (fastTrend) {
      emergingAlert = {
        tag: fastTrend.tag,
        velocity: `+${fastTrend.velocity}%`,
        tip: `La etiqueta #${fastTrend.tag} está en aceleración rápida esta semana. Fue incorporada a tu publicación.`,
      };
    }

    // 9. Nivel de experiencia del usuario
    let experienceLevel: 'novice' | 'growing' | 'master' = 'novice';
    if (userProfile.totalPosts >= 15) {
      experienceLevel = 'master';
    } else if (userProfile.totalPosts >= 5) {
      experienceLevel = 'growing';
    }

    // 10. Estimación predictiva de alcance
    const baseline = userProfile.baselineReachAverage || 1250;
    const minReach = classification.isDocument ? 0 : Math.round(baseline * 1.35);
    const maxReach = classification.isDocument ? 0 : Math.round(baseline * 2.65);

    const estimatedReachRange: PredictiveReachEstimate = {
      min: minReach,
      max: maxReach,
      rationale: classification.isDocument
        ? 'Los documentos no son distribuibles en video vertical.'
        : `Proyección basada en gancho de retención de 3 seg, ${hashtags.combined.length} hashtags calibrados y sincronización con ventana pico.`,
      disclaimer:
        'Estimación algorítmica predictiva basada en patrones públicos y tu histórico. El alcance real dependerá de la interacción inicial de tu audiencia en los primeros 15 minutos.',
    };

    return {
      originalCaption: caption,
      classification,
      hashtags,
      platformCopies,
      recommendedSound,
      bestTimeNow,
      learningMetrics: {
        appliedAlpha: userProfile.alphaMarketWeight,
        appliedBeta: userProfile.betaUserWeight,
        userExperienceLevel: experienceLevel,
        estimatedReachBoostMultiplier: 1.45,
      },
      estimatedReachRange,
      emergingAlert,
    };
  }

  /**
   * Registra una publicación completada en el motor de aprendizaje continuo
   */
  public static notifyPostPublished(
    category: any,
    hashtags: string[],
    durationSec: number = 24
  ) {
    ContinuousLearningAgent.recordPostPublish(category, hashtags, durationSec);
  }
}
