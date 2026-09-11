/**
 * ALQUIMIO - AI Content Service
 * Sistema Multi-Agente con Aprendizaje Continuo y Tendencias de Mercado en Tiempo Real
 */

import { DistributionOrchestrator } from './ai/DistributionOrchestrator';
import { ContinuousLearningAgent } from './ai/ContinuousLearningAgent';
import type { OrchestratedOptimizationResult } from './ai/types';

export interface SmartCaptionResult {
  caption: string;
  hashtags: string[];
  orchestrated?: OrchestratedOptimizationResult;
}

export async function generateSmartCaptions(
  baseText: string,
  mediaType: string = 'video'
): Promise<SmartCaptionResult> {
  const API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';

  // 1. Ejecutar el orquestador multi-agente para clasificar, seleccionar hashtags y ponderar con el perfil del usuario
  const orchestrated = await DistributionOrchestrator.optimizeContent(baseText, mediaType);

  // 2. Si no hay API key de Gemini, utilizar el resultado enriquecido del sistema multi-agente
  if (!API_KEY || !baseText.trim()) {
    // Retornamos el copy adaptado para TikTok/Reels con los hashtags de mercado balanceados
    const primaryCopy = orchestrated.platformCopies.tiktok?.caption || orchestrated.originalCaption;
    return {
      caption: primaryCopy,
      hashtags: orchestrated.hashtags.combined,
      orchestrated,
    };
  }

  // 3. Si hay API key de Gemini, incorporar el contexto de tendencias en tiempo real al prompt
  try {
    const marketTagsList = orchestrated.hashtags.trendingMarket.join(', #');
    const nicheTagsList = orchestrated.hashtags.nicheSpecific.join(', #');

    const prompt = `Actúa como un estratega de contenido viral de élite en redes sociales (TikTok, Reels, YouTube Shorts).
Idea base del creador: "${baseText}"
Categoría detectada: "${orchestrated.classification.categoryLabel}"
Gancho inicial sugerido: "${orchestrated.classification.viralHook}"
Tendencias activas en tiempo real: #${marketTagsList}
Hashtags de nicho afines: #${nicheTagsList}

Genera un copy optimizado de alto impacto con gancho en los primeros 3 segundos, emojis estratégicos y llamado a la acción al final.
Devuelve EXCLUSIVAMENTE un objeto JSON válido con esta estructura:
{
  "caption": "texto optimizado con emojis y CTA al final",
  "hashtags": ["tag1", "tag2", "tag3", "tag4", "tag5"]
}
`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          responseMimeType: 'application/json',
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!textContent) throw new Error('No content generated');

    const parsed = JSON.parse(textContent) as { caption: string; hashtags: string[] };

    // Fusionar hashtags generados por LLM con los hashtags en tiempo real del mercado
    const mergedTags = Array.from(
      new Set([...(parsed.hashtags || []), ...orchestrated.hashtags.combined.slice(0, 3)])
    );

    return {
      caption: parsed.caption,
      hashtags: mergedTags,
      orchestrated,
    };
  } catch (error) {
    console.warn('[aiService] Fallback a motor multi-agente local:', error);
    return {
      caption: orchestrated.platformCopies.tiktok?.caption || `✨ ${baseText} 🚀`,
      hashtags: orchestrated.hashtags.combined,
      orchestrated,
    };
  }
}

// Re-exportar agentes y utilidades para uso directo en componentes
export { DistributionOrchestrator } from './ai/DistributionOrchestrator';
export { ContinuousLearningAgent } from './ai/ContinuousLearningAgent';
export { ContentClassifierAgent } from './ai/ContentClassifierAgent';
export { FormatAdapterAgent } from './ai/FormatAdapterAgent';
export { HashtagAgent } from './ai/HashtagAgent';
export * from './ai/types';
