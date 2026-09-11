// ============================================================
// src/services/ai/ContentClassifierAgent.ts
// AGENTE CLASIFICADOR DE CONTENIDO — ALQUIMIA STUDIO
// Analiza el texto y tipo de medio para clasificar intención,
// categoría, tono y el gancho (hook) de mayor retención inicial.
// VERIFICACIÓN ESTRICTA: Excluye documentos de la distribución de video.
// ============================================================

import type { ClassificationResult, ContentCategory, HookVariant } from './types';

const CATEGORY_KEYWORDS: Record<ContentCategory, string[]> = {
  tutorial: ['cómo', 'paso', 'tutorial', 'guía', 'aprende', 'secreto', 'truco', 'tip', 'hack', 'método'],
  tech: ['ia', 'ai', 'inteligencia', 'software', 'código', 'app', 'herramienta', 'tech', 'computadora', 'celular', 'gadget'],
  storytelling: ['historia', 'storytime', 'pasó', 'día', 'experiencia', 'anécdota', 'recuerdo', 'no creí', 'lección'],
  humor: ['broma', 'risa', 'humor', 'comedia', 'meme', 'divertido', 'fallo', 'cuando', 'yo'],
  commercial: ['oferta', 'descuento', 'compra', 'producto', 'servicio', 'precio', 'cliente', 'tienda', 'negocio', 'venta'],
  education: ['sabías', 'dato', 'ciencia', 'historia', 'estudio', 'mente', 'psicología', 'concepto', 'curiosidad'],
  lifestyle: ['vlog', 'rutina', 'viaje', 'comida', 'fitness', 'look', 'estilo', 'día conmigo', 'hábito'],
  document: ['pdf', 'doc', 'docx', 'documento', 'archivo', 'informe', 'factura', 'ebook'],
  general: ['contenido', 'publicación', 'video', 'compartir'],
};

const CATEGORY_LABELS: Record<ContentCategory, string> = {
  tutorial: 'Tutorial / How-To',
  tech: 'Tecnología & Innovación',
  storytelling: 'Storytelling / Caso Real',
  humor: 'Humor & Entretenimiento',
  commercial: 'Comercial & Negocios',
  education: 'Educación & Curiosidades',
  lifestyle: 'Estilo de Vida & Hábitos',
  document: 'Documento (No distribuible en video)',
  general: 'General / Difusión',
};

export class ContentClassifierAgent {
  /**
   * Clasifica el contenido analizando palabras clave, tipo de medio y patrones sintácticos.
   */
  public static classify(caption: string, mediaType: string = 'video'): ClassificationResult {
    const textLower = caption.toLowerCase();

    // ── 1. VERIFICACIÓN ESTRICTA: EXCLUSIÓN DE DOCUMENTOS ───────
    const isDoc =
      mediaType === 'document' ||
      mediaType.includes('pdf') ||
      mediaType.includes('document') ||
      mediaType.includes('word') ||
      mediaType.includes('text') ||
      /\.(pdf|docx?|xlsx?|txt|zip|epub)$/i.test(caption || '');

    if (isDoc) {
      return {
        category: 'document',
        categoryLabel: CATEGORY_LABELS.document,
        tone: 'Documental / Técnico',
        viralHook: 'Archivo documental detectado',
        hookVariants: {
          variantA: { text: 'Archivo documental', style: 'Neutral', retentionPrediction: 'N/A' },
          variantB: { text: 'Archivo documental', style: 'Neutral', retentionPrediction: 'N/A' },
        },
        targetAudience: 'N/A',
        recommendedDurationSec: 0,
        isDocument: true,
        isEligibleForSocialVideoDistribution: false,
        rejectionReason:
          'Los documentos (PDF, Word, etc.) no son aptos para distribución automática en redes de video vertical (TikTok, Instagram Reels, YouTube Shorts). Sube un video MP4/MOV o imagen JPG/PNG.',
      };
    }

    // ── 2. Clasificación temática estándar para videos e imágenes ──
    let bestCategory: ContentCategory = 'general';
    let maxScore = 0;

    for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
      if (cat === 'document') continue;
      const matchCount = keywords.filter((kw) => textLower.includes(kw)).length;
      if (matchCount > maxScore) {
        maxScore = matchCount;
        bestCategory = cat as ContentCategory;
      }
    }

    if (maxScore === 0 && (textLower.includes('?') || textLower.includes('¿'))) {
      bestCategory = 'tutorial';
    }

    // ── 3. Generación de Variante A y B de Hook ──────────────────
    const hookVariants = this.generateHookVariants(caption, bestCategory);
    const viralHook = hookVariants.variantA.text;

    return {
      category: bestCategory,
      categoryLabel: CATEGORY_LABELS[bestCategory],
      tone: this.inferTone(bestCategory),
      viralHook,
      hookVariants,
      targetAudience: this.inferAudience(bestCategory),
      recommendedDurationSec: this.getOptimalDuration(bestCategory),
      isDocument: false,
      isEligibleForSocialVideoDistribution: true,
    };
  }

  private static generateHookVariants(
    caption: string,
    category: ContentCategory
  ): { variantA: HookVariant; variantB: HookVariant } {
    switch (category) {
      case 'tutorial':
        return {
          variantA: {
            text: 'Lo que nadie te enseñó sobre esto (en 20 segundos) ⚡',
            style: 'Pregunta Provocadora + Rapidez',
            retentionPrediction: '89% retención esperada',
          },
          variantB: {
            text: 'Deja de cometer este error si quieres dominarlo hoy 👇',
            style: 'Contrario + Urgencia',
            retentionPrediction: '93% retención esperada',
          },
        };
      case 'tech':
        return {
          variantA: {
            text: 'Esta herramienta de IA va a cambiar cómo trabajas 🚀',
            style: 'Promesa de Alto Valor',
            retentionPrediction: '91% retención esperada',
          },
          variantB: {
            text: 'Probé esta IA para no tener que perder 3 horas al día 🤫',
            style: 'Curiosidad + Caso Real',
            retentionPrediction: '94% retención esperada',
          },
        };
      case 'storytelling':
        return {
          variantA: {
            text: 'Pensé que era un error común hasta que me pasó esto... 🤫',
            style: 'Confesión Personal',
            retentionPrediction: '88% retención esperada',
          },
          variantB: {
            text: 'La decisión que casi arruina todo (y la lección que dejó) 👀',
            style: 'Suspenso + Giro Inesperado',
            retentionPrediction: '92% retención esperada',
          },
        };
      case 'commercial':
        return {
          variantA: {
            text: 'Si buscas resultados reales, tienes que ver esto hoy 👇',
            style: 'Directo al Beneficio',
            retentionPrediction: '84% retención esperada',
          },
          variantB: {
            text: 'Por qué el método tradicional ya no funciona (y qué hacer) 💡',
            style: 'Desafío de Creencias',
            retentionPrediction: '89% retención esperada',
          },
        };
      case 'humor':
        return {
          variantA: {
            text: 'Dime que no soy el único al que le pasa esto 😂',
            style: 'Identificación Colectiva',
            retentionPrediction: '87% retención esperada',
          },
          variantB: {
            text: 'Nadie me advirtió que esto terminaría así 💀',
            style: 'Anticipación Cómica',
            retentionPrediction: '91% retención esperada',
          },
        };
      case 'education':
        return {
          variantA: {
            text: 'El 90% de las personas no sabe este dato clave 🧠',
            style: 'Dato Estadístico Exclusivo',
            retentionPrediction: '90% retención esperada',
          },
          variantB: {
            text: 'Esto desafía todo lo que nos enseñaron en la escuela 🤯',
            style: 'Ruptura de Paradigma',
            retentionPrediction: '93% retención esperada',
          },
        };
      default:
        return {
          variantA: {
            text: 'No te saltes este video si quieres ver algo increíble ✨',
            style: 'Petición Dinámica',
            retentionPrediction: '85% retención esperada',
          },
          variantB: {
            text: 'Lo que pasa cuando aplicas este método por 7 días 🔥',
            style: 'Demostración de Proceso',
            retentionPrediction: '89% retención esperada',
          },
        };
    }
  }

  private static getOptimalDuration(category: ContentCategory): number {
    switch (category) {
      case 'humor':
        return 14;
      case 'tech':
        return 22;
      case 'tutorial':
        return 26;
      case 'storytelling':
        return 48;
      case 'education':
        return 28;
      case 'commercial':
        return 20;
      default:
        return 24;
    }
  }

  private static inferTone(category: ContentCategory): string {
    switch (category) {
      case 'tech':
      case 'education':
        return 'Informativo y Dinámico';
      case 'tutorial':
        return 'Práctico y Revelador';
      case 'humor':
        return 'Relajado y Cómico';
      case 'storytelling':
        return 'Empático e Intrigante';
      case 'commercial':
        return 'Convincente y Orientado a Conversión';
      default:
        return 'Atractivo y Positivo';
    }
  }

  private static inferAudience(category: ContentCategory): string {
    switch (category) {
      case 'tech':
        return 'Profesionales, desarrolladores y creadores de contenido';
      case 'tutorial':
        return 'Audiencia orientada a soluciones rápidas';
      case 'storytelling':
        return 'Comunidad interesada en historias personales y lecciones';
      default:
        return 'Audiencia masiva en redes sociales verticales';
    }
  }
}
