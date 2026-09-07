/**
 * ALQUIMIO - AI Content Service (Gemini API)
 */

export interface SmartCaptionResult {
  caption: string;
  hashtags: string[];
}

export async function generateSmartCaptions(baseText: string, mediaType: string): Promise<SmartCaptionResult> {
  const API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';
  
  // Si no hay key o texto, hacer una mejora simulada basada en reglas (fallback local)
  if (!API_KEY || !baseText.trim()) {
    // Simulamos latencia
    await new Promise(resolve => setTimeout(resolve, 1500));
    return {
      caption: baseText ? `✨ ${baseText} 🚀\n\n¡Síguenos para más contenido exclusivo! 👇` : '¡Mira este increíble contenido que preparamos para ti! 🚀✨',
      hashtags: ['alquimio', 'viral', 'tendencia', 'creador', 'innovacion']
    };
  }

  try {
    const prompt = `Actúa como un experto estratega de redes sociales (TikTok, Instagram Reels, YouTube Shorts). 
Toma la siguiente idea base y mejórala para que sea súper atractiva, viral y orientada a conseguir engagement.
Incluye un buen Call to Action (CTA) al final. 
Añade emojis adecuados.
Devuelve EXCLUSIVAMENTE un objeto JSON válido con esta estructura (nada de markdown extra ni explicaciones):
{
  "caption": "texto optimizado con emojis y CTA",
  "hashtags": ["hashtag1", "hashtag2", "hashtag3"]
}

Idea base: "${baseText}"
Tipo de medio: ${mediaType}
`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          responseMimeType: "application/json",
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!textContent) throw new Error("No content generated");
    
    const result = JSON.parse(textContent) as SmartCaptionResult;
    return result;
  } catch (error) {
    console.error('[aiService] Error generating captions:', error);
    // Fallback on error
    return {
      caption: `✨ ${baseText} 🚀`,
      hashtags: ['alquimio', 'tendencia']
    };
  }
}
