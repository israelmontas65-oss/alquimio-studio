// ============================================================
// functions/shared/idempotencia.ts
// Manejo estricto de Idempotencia para Webhooks con Cloudflare KV
// Alquimia Studio — Titularidad: Israel Montás
//
// Evita procesar eventos duplicados causados por reintentos de red
// de TikTok o Meta. Almacena el ID del evento por 24 horas (86,400 segundos).
// ============================================================

export interface SimpleKVNamespace {
  get: (key: string) => Promise<string | null>;
  put: (key: string, value: string, options?: { expirationTtl?: number }) => Promise<void>;
}

// Caché en memoria para desarrollo local o como red de seguridad secundaria
const memoriaIdempotencia = new Map<string, number>();

/**
 * Comprueba si un evento ya fue registrado previamente.
 * Si no existe, lo registra inmediatamente con un TTL de 24 horas.
 *
 * @param kv Instancia de Cloudflare KV (ej. ALQUIMIA_KV, TIKTOK_KV, META_KV)
 * @param plataforma Identificador de plataforma
 * @param eventoId ID único del evento entrante
 * @param ttlSegundos Tiempo de retención en segundos (por defecto: 86400 = 24 horas)
 * @returns { esDuplicado: boolean }
 */
export async function registrarYVerificarIdempotencia(
  kv: SimpleKVNamespace | undefined,
  plataforma: string,
  eventoId: string,
  ttlSegundos = 86400
): Promise<{ esDuplicado: boolean }> {
  if (!eventoId) {
    return { esDuplicado: false };
  }

  const claveKV = `idemp_${plataforma}_${eventoId}`;
  const ahora = Date.now();

  // 1. Limpieza perezosa de memoria local (si expiró el TTL)
  const expiraMemoria = memoriaIdempotencia.get(claveKV);
  if (expiraMemoria && ahora < expiraMemoria) {
    return { esDuplicado: true };
  }

  // 2. Comprobar en Cloudflare KV (si está configurado)
  if (kv) {
    try {
      const registroExistente = await kv.get(claveKV);
      if (registroExistente !== null) {
        return { esDuplicado: true };
      }

      // Registrar en KV con expiración automática de 24 horas
      await kv.put(claveKV, new Date().toISOString(), {
        expirationTtl: ttlSegundos,
      });
    } catch (err) {
      // Si KV falla temporalmente, no bloqueamos pero advertimos en log
      console.warn(`[idempotencia] Advertencia al interactuar con KV para ${claveKV}:`, err);
    }
  }

  // 3. Registrar en memoria local (TTL en milisegundos)
  memoriaIdempotencia.set(claveKV, ahora + ttlSegundos * 1000);

  return { esDuplicado: false };
}
