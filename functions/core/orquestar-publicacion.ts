// ============================================================
// functions/core/orquestar-publicacion.ts
// Orquestador Central de Publicación Multi-Plataforma
// Alquimia Studio — Titularidad: Israel Montás
//
// Coordina la validación de formato y la distribución simultánea
// e independiente a cada red social seleccionada.
// ============================================================

import type {
  ContenidoFuente,
  Plataforma,
  ResultadoOrquestacion,
  ResultadoEnvio,
} from '../shared/tipos';
import { validarCompatibilidad } from './adaptar-formato';
import { publicarContenidoTikTok, EnvTikTok } from '../adaptadores/salida-tiktok';
import { publicarContenidoFacebook, EnvFacebook } from '../adaptadores/salida-facebook';
import { publicarContenidoInstagram, EnvInstagram } from '../adaptadores/salida-instagram';
import { publicarContenidoYouTube, EnvYouTube } from '../adaptadores/salida-youtube';
import { publicarContenidoThreads, EnvThreads } from '../adaptadores/salida-threads';
import { SimpleKVNamespace } from '../shared/idempotencia';

export interface ContextoOrquestacion {
  env: EnvTikTok &
    EnvFacebook &
    EnvInstagram &
    EnvYouTube &
    EnvThreads & {
      ALQUIMIA_KV?: SimpleKVNamespace;
      [key: string]: unknown;
    };
  tokens?: Partial<Record<Plataforma, string>>;
  facebookPageId?: string;
  instagramUserId?: string;
  threadsUserId?: string;
}

/**
 * Publica un ContenidoFuente a múltiples redes de forma concurrente con Promise.allSettled.
 */
export async function orquestarPublicacion(
  contenido: ContenidoFuente,
  plataformas: Plataforma[],
  contexto: ContextoOrquestacion
): Promise<ResultadoOrquestacion> {
  const idSesion = `pub_ses_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const timestamp = new Date().toISOString();
  const env = contexto.env;
  const kv = env.ALQUIMIA_KV;

  const tareas = plataformas.map(async (plataforma): Promise<[Plataforma, ResultadoEnvio]> => {
    // 1. Validación de compatibilidad nativa previa a la llamada
    const compatibilidad = validarCompatibilidad(plataforma, contenido);

    if (!compatibilidad.soportadoNativamente && !compatibilidad.tipoEquivalente) {
      return [
        plataforma,
        {
          exitoso: false,
          plataforma,
          error: compatibilidad.motivo || `Formato '${contenido.tipo}' incompatible con ${plataforma}`,
          esSandbox: Boolean(env.TIKTOK_SANDBOX === 'true'),
        },
      ];
    }

    // 2. Enrutamiento al adaptador correspondiente
    switch (plataforma) {
      case 'tiktok': {
        const token = contexto.tokens?.tiktok || (env.TIKTOK_ACCESS_TOKEN as string);
        const res = await publicarContenidoTikTok(contenido, token, env);
        return [plataforma, res];
      }

      case 'facebook': {
        const token = contexto.tokens?.facebook || (env.FB_PAGE_ACCESS_TOKEN as string);
        const pageId = contexto.facebookPageId || (env.FB_PAGE_ID as string);
        const res = await publicarContenidoFacebook(contenido, pageId, token, env);
        return [plataforma, res];
      }

      case 'instagram': {
        const token = contexto.tokens?.instagram || (env.INSTAGRAM_ACCESS_TOKEN as string);
        const igUserId = contexto.instagramUserId || (env.INSTAGRAM_USER_ID as string) || (env.IG_USER_ID as string);
        const res = await publicarContenidoInstagram(contenido, igUserId, token, env);
        return [plataforma, res];
      }

      case 'youtube': {
        const token = contexto.tokens?.youtube || (env.YOUTUBE_ACCESS_TOKEN as string);
        const res = await publicarContenidoYouTube(contenido, token, env);
        return [plataforma, res];
      }

      case 'threads': {
        const token = contexto.tokens?.threads || (env.THREADS_ACCESS_TOKEN as string);
        const threadsUserId = contexto.threadsUserId || (env.THREADS_USER_ID as string);
        const res = await publicarContenidoThreads(contenido, threadsUserId, token, env);
        return [plataforma, res];
      }

      default:
        return [
          plataforma,
          {
            exitoso: false,
            plataforma,
            error: `Plataforma '${plataforma}' no soportada`,
            esSandbox: false,
          },
        ];
    }
  });

  const resultadosSettled = await Promise.allSettled(tareas);
  const resultadosMap: Record<string, ResultadoEnvio> = {};
  let totalExitosos = 0;
  let totalFallidos = 0;

  for (let i = 0; i < resultadosSettled.length; i++) {
    const item = resultadosSettled[i];
    const plat = plataformas[i];

    if (item.status === 'fulfilled') {
      const [p, res] = item.value;
      resultadosMap[p] = res;
      if (res.exitoso) totalExitosos++;
      else totalFallidos++;
    } else {
      resultadosMap[plat] = {
        exitoso: false,
        plataforma: plat,
        error: item.reason instanceof Error ? item.reason.message : String(item.reason),
        esSandbox: false,
      };
      totalFallidos++;
    }
  }

  const resultadoFinal: ResultadoOrquestacion = {
    idSesion,
    timestamp,
    resultados: resultadosMap,
    totalExitosos,
    totalFallidos,
  };

  // 3. Persistir registro de sesión en Cloudflare KV (30 días de TTL)
  if (kv) {
    try {
      await kv.put(`pub_sesion_${idSesion}`, JSON.stringify(resultadoFinal), {
        expirationTtl: 2592000,
      });
    } catch (err) {
      console.warn('[orquestar-publicacion] No se pudo guardar la sesión en KV:', err);
    }
  }

  return resultadoFinal;
}
