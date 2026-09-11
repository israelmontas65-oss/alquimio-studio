// ============================================================
// src/services/ai/ContentClassifierAgent.ts
// AGENTE CLASIFICADOR DE CONTENIDO — ALQUIMIA STUDIO
// Analiza el texto y tipo de medio para clasificar intención,
// categoría, tono y el gancho (hook) de mayor retención inicial.
// ============================================================

import type { ClassificationResult, ContentCategory } from './types';

const CATEGORY_KEYWORDS: Record<ContentCategory, string[]> = {
  tutorial: ['cómo', 'paso', 'tutorial', 'guía', 'aprende', 'secreto', 'truco', 'tip', 'hack', 'método'],
  tech: ['ia', 'ai', 'inteligencia', 'software', 'código', 'app', 'herramienta', 'tech', 'computadora', 'celular', 'gadget'],
  storytelling: ['historia', 'storytime', 'pasó', 'día', 'experiencia', 'anécdota', 'recuerdo', 'no creí', 'lección'],
  humor: ['broma', 'risa', 'humor', 'comedia', 'meme', 'divertido', 'fallo', 'cuando', 'yo'],
  commercial: ['oferta', 'descuento', 'compra', 'producto', 'servicio', 'precio', 'cliente', 'tienda', 'negocio', 'venta'],
  education: ['sabías', 'dato', 'ciencia', 'historia', 'estudio', 'mente', 'psicología', 'concepto', 'curiosidad'],
  lifestyle: ['vlog', 'rutina', 'viaje', 'comida', 'fitness', 'look', 'estilo', 'día conmigo', 'hábito'],
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
  general: 'General / Difusión',
};

export class ContentClassifierAgent {
  /**
   * Clasifica el contenido analizando palabras clave y patrones sintácticos.
   */
  public static classify(caption: string, mediaType: string = 'video'): ClassificationResult {
    const textLower = caption.toLowerCase();

    let bestCategory: ContentCategory = 'general';
    let maxScore = 0;

    // Conteo de coincidencias temáticas
    for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
      const matchCount = keywords.filter((kw) => textLower.includes(kw)).length;
      if (matchCount > maxScore) {
        maxScore = matchCount;
        bestCategory = cat as ContentCategory;
      }
    }

    // Si no hubo coincidencia fuerte pero contiene signos de interrogación, tiende a tutorial/educación
    if (maxScore === 0 && (textLower.includes('?') || textLower.includes('¿'))) {
      bestCategory = 'tutorial';
    }

    // Generación del hook de retención (primeros 3 segundos)
    const viralHook = this.generateRetentionHook(caption, bestCategory);

    // Duración sugerida según categoría
    const recommendedDurationSec = this.getOptimalDuration(bestCategory);

    return {
      category: bestCategory,
      categoryLabel: CATEGORY_LABELS[bestCategory],
      tone: this.inferTone(bestCategory),
      viralHook,
      targetAudience: this.inferAudience(bestCategory),
      recommendedDurationSec,
    };
  }

  private static generateRetentionHook(caption: string, category: ContentCategory): string {
    const firstLine = caption.split('\n')[0].trim();
    if (firstLine.length > 5 && firstLine.length < 60) {
      return firstLine;
    }

    switch (category) {
      case 'tutorial':
        return 'Lo que nadie te enseñó sobre esto (en 20 segundos) ⚡';
      case 'tech':
        return 'Esta herramienta de IA va a cambiar la forma en que trabajas 🚀';
      case 'storytelling':
        return 'Pensé que era un error común hasta que me pasó esto... 🤫';
      case 'commercial':
        return 'Si buscas resultados reales, tienes que ver esto hoy 👇';
      case 'humor':
        return 'Dime que no soy el único al que le pasa esto 😂';
      case 'education':
        return 'El 90% de las personas no sabe este dato clave 🧠';
      default:
        return 'No te saltes este video si quieres ver algo increíble ✨';
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
