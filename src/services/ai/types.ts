// ============================================================
// src/services/ai/types.ts
// Tipos del Sistema de Agentes Inteligentes y Aprendizaje Continuo
// Alquimia Studio — Arquitectura Multi-Agente
// ============================================================

export type ContentCategory =
  | 'tutorial'
  | 'humor'
  | 'storytelling'
  | 'education'
  | 'tech'
  | 'lifestyle'
  | 'commercial'
  | 'general';

export interface TrendingHashtag {
  tag: string;
  velocity: number; // % crecimiento semanal
  volume: string;
  category: string;
  isEmerging: boolean;
}

export interface TrendingSoundMeta {
  soundId: string; // Solo identificador público, nunca archivo de audio
  title: string;
  author: string;
  recommendedDurationSec: number;
  velocityRank: number;
  referenceUrl: string;
}

export interface OptimalFormatPattern {
  category: string;
  recommendedDuration: string;
  bestHookStyle: string;
  growthFactor: number;
  topNiche: string;
}

export interface PlatformPostingHour {
  platform: 'tiktok' | 'instagram' | 'youtube' | 'facebook';
  bestHoursToday: string[];
  bestDaysOfWeek: string[];
  peakEngagementWindow: string;
}

export interface MarketTrendsData {
  timestamp: number;
  dataSource: string;
  region: string;
  hashtags: TrendingHashtag[];
  sounds: TrendingSoundMeta[];
  patterns: OptimalFormatPattern[];
  schedule: PlatformPostingHour[];
}

export interface UserLearningProfile {
  userId: string;
  totalPosts: number;
  alphaMarketWeight: number; // Peso asignado a tendencias de mercado (0.85 -> 0.30)
  betaUserWeight: number; // Peso asignado al rendimiento del usuario (0.15 -> 0.70)
  categoryPerformance: Record<string, { count: number; avgEngagement: number }>;
  preferredDurationRange: { minSec: number; maxSec: number };
  historicalTopHashtags: Array<{ tag: string; useCount: number; score: number }>;
  bestUserPostingHours: string[];
  baselineReachAverage: number;
  aiOptimizedReachAverage: number;
  lastUpdated: number;
}

export interface ClassificationResult {
  category: ContentCategory;
  categoryLabel: string;
  tone: string;
  viralHook: string;
  targetAudience: string;
  recommendedDurationSec: number;
}

export interface PlatformCopyVariation {
  caption: string;
  hook: string;
  cta: string;
  formattedHashtags: string[];
  recommendedDurationSec: number;
}

export interface HashtagSelectionResult {
  trendingMarket: string[];
  nicheSpecific: string[];
  userHistorical: string[];
  combined: string[];
}

export interface OrchestratedOptimizationResult {
  originalCaption: string;
  classification: ClassificationResult;
  hashtags: HashtagSelectionResult;
  platformCopies: Record<string, PlatformCopyVariation>;
  recommendedSound: TrendingSoundMeta | null;
  bestTimeNow: string;
  learningMetrics: {
    appliedAlpha: number;
    appliedBeta: number;
    userExperienceLevel: 'novice' | 'growing' | 'master';
    estimatedReachBoostMultiplier: number;
  };
  emergingAlert: {
    tag: string;
    velocity: string;
    tip: string;
  } | null;
}
