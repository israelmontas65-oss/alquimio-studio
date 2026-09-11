// ============================================================
// src/services/ai/FormatAdapterAgent.ts
// AGENTE ADAPTADOR DE FORMATO — ALQUIMIA STUDIO
// Transforma el copy base y adapta la estructura, longitud, emojis y CTA
// según las reglas y algoritmos de distribución de cada plataforma.
// ============================================================

import type { ClassificationResult, PlatformCopyVariation } from './types';

export class FormatAdapterAgent {
  /**
   * Genera versiones adaptadas para TikTok, Instagram Reels, YouTube Shorts y Facebook.
   */
  public static adaptForPlatforms(
    baseCaption: string,
    classification: ClassificationResult,
    selectedHashtags: string[]
  ): Record<string, PlatformCopyVariation> {
    const cleanText = baseCaption.trim();

    return {
      tiktok: this.formatForTikTok(cleanText, classification, selectedHashtags),
      instagram: this.formatForInstagram(cleanText, classification, selectedHashtags),
      youtube: this.formatForYouTubeShorts(cleanText, classification, selectedHashtags),
      facebook: this.formatForFacebook(cleanText, classification, selectedHashtags),
    };
  }

  private static formatForTikTok(
    baseText: string,
    classification: ClassificationResult,
    hashtags: string[]
  ): PlatformCopyVariation {
    const hook = classification.viralHook;
    const cta = '¿Tú qué opinas? Déjamelo en comentarios 👇🔥';
    // TikTok: formato corto, gancho en primera línea y 4-5 hashtags con ritmo
    const tagsSlice = hashtags.slice(0, 5).map((t) => `#${t}`).join(' ');

    const caption = `${hook}\n\n${baseText}\n\n${cta}\n\n${tagsSlice}`;

    return {
      caption,
      hook,
      cta,
      formattedHashtags: hashtags.slice(0, 5),
      recommendedDurationSec: classification.recommendedDurationSec,
    };
  }

  private static formatForInstagram(
    baseText: string,
    classification: ClassificationResult,
    hashtags: string[]
  ): PlatformCopyVariation {
    const hook = `✨ ${classification.viralHook}`;
    const cta = '💾 Guarda este Reel para verlo luego y compártelo con alguien que lo necesite.';
    // Instagram: más limpio, espaciado con puntos o líneas
    const tagsSlice = hashtags.slice(0, 6).map((t) => `#${t}`).join(' ');

    const caption = `${hook}\n\n${baseText}\n\n.\n${cta}\n.\n${tagsSlice}`;

    return {
      caption,
      hook,
      cta,
      formattedHashtags: hashtags.slice(0, 6),
      recommendedDurationSec: Math.min(60, classification.recommendedDurationSec + 4),
    };
  }

  private static formatForYouTubeShorts(
    baseText: string,
    classification: ClassificationResult,
    hashtags: string[]
  ): PlatformCopyVariation {
    // YouTube Shorts: Título atractivo + descripción optimizada para búsqueda
    const hook = `${classification.viralHook} #Shorts`;
    const cta = '🔔 Suscríbete al canal para más contenido de alto valor cada semana.';
    const topShortsTags = ['Shorts', ...hashtags.slice(0, 4)].map((t) => `#${t}`).join(' ');

    const caption = `${hook}\n\n${baseText}\n\n${cta}\n\n${topShortsTags}`;

    return {
      caption,
      hook,
      cta,
      formattedHashtags: hashtags.slice(0, 4),
      recommendedDurationSec: Math.min(58, classification.recommendedDurationSec + 6),
    };
  }

  private static formatForFacebook(
    baseText: string,
    classification: ClassificationResult,
    hashtags: string[]
  ): PlatformCopyVariation {
    const hook = `📢 ${classification.viralHook}`;
    const cta = '¿Estás de acuerdo con este enfoque? Comenta tu opinión abajo.';
    const tagsSlice = hashtags.slice(0, 4).map((t) => `#${t}`).join(' ');

    const caption = `${hook}\n\n${baseText}\n\n${cta}\n\n${tagsSlice}`;

    return {
      caption,
      hook,
      cta,
      formattedHashtags: hashtags.slice(0, 4),
      recommendedDurationSec: classification.recommendedDurationSec,
    };
  }
}
