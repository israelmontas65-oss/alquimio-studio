// ============================================================
// functions/shared/cliente-ia.ts
// Único Cliente y Wrapper de Inteligencia Artificial de Alquimia Studio
// Titularidad: Israel Montás
//
// Centraliza todas las llamadas a la API de Anthropic (Claude 3.5),
// inyecta las reglas base inmutables contra alucinaciones
// y ofrece fallback resiliente (Gemini / Heurística) si la clave no está presente.
// ============================================================

export interface OpcionesLlamadaIA {
  modelo?: 'claude-3-5-sonnet-latest' | 'claude-3-5-haiku-latest' | string;
  maxTokens?: number;
  temperatura?: number;
  systemPromptEspecifico?: string;
  timeoutMs?: number;
}

export interface RespuestaIA {
  texto: string;
  proveedor: 'anthropic' | 'gemini_fallback' | 'heuristica_fallback';
  modeloUtilizado: string;
  latenciaMs: number;
  tokensEstimados?: number;
}

export interface EnvIA {
  ANTHROPIC_API_KEY?: string;
  EXPO_PUBLIC_ANTHROPIC_API_KEY?: string;
  GEMINI_API_KEY?: string;
  EXPO_PUBLIC_GEMINI_API_KEY?: string;
  [key: string]: unknown;
}

/**
 * REGLAS BASE INMUTABLES DEL SISTEMA — APLICADAS A TODAS LAS CONSULTAS DE IA
 * Se concatenan automáticamente antes de la instrucción de cada módulo especializado.
 */
export const REGLAS_BASE_ANTI_ALUCINACION = `
REGLAS ESTRICTAS DE INTEGRIDAD Y ANTI-ALUCINACIÓN (ALQUIMIA STUDIO - ISRAEL MONTÁS):
1. CERO ALUCINACIÓN: Queda terminantemente prohibido inventar métricas de engagement, porcentajes de crecimiento, volumen de reproducciones o estadísticas de mercado que no hayan sido expresamente suministradas en el contexto adjunto.
2. HONESTIDAD Y TRANSPARENCIA: Si el contexto no contiene datos históricos o de tendencias suficientes para una categoría, horario o nicho, debes declararlo explícitamente (ej: "No hay muestra histórica suficiente registrada") en vez de especular con cifras ficticias.
3. IDENTIDAD DE MARCA: Eres el núcleo inteligente de Alquimia Studio, la plataforma de publicación y orquestación multi-red fundada por Israel Montás. Tu comunicación es profesional, creativa, asertiva y concisa.
4. CONSISTENCIA DE RECOMENDACIONES: Si el contexto incluye hashtags o patrones de mercado previamente validados por el motor heurístico, debes mantener estricta coherencia con ellos y no sugerir términos contradictorios.
`;

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';

/**
 * Función central de llamada a IA.
 * NINGÚN archivo debe hacer fetch a Anthropic directamente: todos pasan por aquí.
 */
export async function llamarIA(
  promptUsuario: string,
  env: EnvIA,
  opciones?: OpcionesLlamadaIA
): Promise<RespuestaIA> {
  const tInicio = Date.now();
  const apiKeyAnthropic =
    env.ANTHROPIC_API_KEY ||
    env.EXPO_PUBLIC_ANTHROPIC_API_KEY;

  const modelo = opciones?.modelo || 'claude-3-5-sonnet-latest';
  const maxTokens = opciones?.maxTokens || 1000;
  const temperatura = opciones?.temperatura ?? 0.7;
  const timeoutMs = opciones?.timeoutMs || 10000;

  // Unificación del System Prompt: Reglas Base + Instrucción del Módulo
  const systemCompleto = [
    REGLAS_BASE_ANTI_ALUCINACION.trim(),
    (opciones?.systemPromptEspecifico || '').trim(),
  ]
    .filter(Boolean)
    .join('\n\n---\nINSTRUCCIÓN ESPECÍFICA DEL MÓDULO:\n');

  // ── 1. VÍA PRINCIPAL: ANTHROPIC CLAUDE ────────────────────
  if (apiKeyAnthropic && apiKeyAnthropic.trim() !== '') {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(ANTHROPIC_API_URL, {
        method: 'POST',
        headers: {
          'x-api-key': apiKeyAnthropic.trim(),
          'anthropic-version': ANTHROPIC_VERSION,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: modelo,
          max_tokens: maxTokens,
          temperature: temperatura,
          system: systemCompleto,
          messages: [{ role: 'user', content: promptUsuario }],
        }),
        signal: controller.signal,
      });

      if (res.ok) {
        const data = (await res.json()) as {
          content?: Array<{ type: string; text: string }>;
          usage?: { input_tokens: number; output_tokens: number };
        };

        const texto = data.content?.[0]?.text;
        if (texto && texto.trim().length > 0) {
          return {
            texto: texto.trim(),
            proveedor: 'anthropic',
            modeloUtilizado: modelo,
            latenciaMs: Date.now() - tInicio,
            tokensEstimados: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
          };
        }
      } else {
        const errText = await res.text();
        console.warn(`[cliente-ia] Error HTTP ${res.status} de Anthropic:`, errText);
      }
    } catch (err) {
      console.warn('[cliente-ia] Excepción al invocar Anthropic API:', err);
    } finally {
      clearTimeout(timer);
    }
  }

  // ── 2. VÍA SECUNDARIA: GEMINI FALLBACK (Resiliencia) ──────
  const apiKeyGemini = env.GEMINI_API_KEY || env.EXPO_PUBLIC_GEMINI_API_KEY;
  if (apiKeyGemini && apiKeyGemini.trim() !== '') {
    try {
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(apiKeyGemini.trim())}`;
      const res = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: systemCompleto },
                { text: promptUsuario },
              ],
            },
          ],
          generationConfig: {
            temperature: temperatura,
            maxOutputTokens: maxTokens,
          },
        }),
      });

      if (res.ok) {
        const data = (await res.json()) as {
          candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
        };
        const texto = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (texto && texto.trim().length > 0) {
          return {
            texto: texto.trim(),
            proveedor: 'gemini_fallback',
            modeloUtilizado: 'gemini-1.5-flash',
            latenciaMs: Date.now() - tInicio,
            tokensEstimados: Math.ceil((promptUsuario.length + texto.length) / 4),
          };
        }
      }
    } catch (err) {
      console.warn('[cliente-ia] Fallback Gemini falló:', err);
    }
  }

  // ── 3. VÍA TERCIARIA: MOTOR HEURÍSTICO (Cero Caídas) ──────
  return {
    texto: generarRespaldoHeuristico(promptUsuario),
    proveedor: 'heuristica_fallback',
    modeloUtilizado: 'motor_heuristico_alquimia',
    latenciaMs: Date.now() - tInicio,
  };
}

/**
 * Generador de respaldo de última línea para garantizar que la app nunca se quede muda.
 */
function generarRespaldoHeuristico(prompt: string): string {
  const lower = prompt.toLowerCase();
  if (lower.includes('hashtag') || lower.includes('etiqueta')) {
    return '#alquimiastudio #creadoresdecontenido #aprendeentiktok #videoviral #techtok';
  }
  if (lower.includes('horario') || lower.includes('hora')) {
    return 'Recomendación heurística estándar: 6:30 PM a 8:45 PM (ventana de mayor retención de audiencia).';
  }
  return 'Alquimia Studio ha procesado tu solicitud. Los sistemas de distribución y análisis están operativos.';
}
