// ============================================================
// functions/webhooks/tiktok.ts
// Cloudflare Pages Function: Endpoint de Webhook Oficial para TikTok
// Ruta pública: /webhooks/tiktok
// Alquimia Studio — Titularidad: Israel Montás
//
// Documentación oficial:
// - Overview & Requisitos: https://developers.tiktok.com/doc/webhooks-overview
// - Verificación de Firma: https://developers.tiktok.com/doc/webhooks-verification
// - Eventos Soportados: https://developers.tiktok.com/doc/webhooks-events
// ============================================================

import { verificarFirmaTikTok, HEADER_FIRMA_TIKTOK } from '../shared/verificar-firma';
import { normalizarEvento } from '../core/normalizar-evento';
import { registrarYVerificarIdempotencia, SimpleKVNamespace } from '../shared/idempotencia';
import { procesarEvento } from '../core/procesar-evento';
import { enviarRespuestaTikTok, type EnvTikTok } from '../adaptadores/salida-tiktok';
import type { EventoEntrante } from '../shared/tipos';

interface Env {
  TIKTOK_CLIENT_KEY?: string;
  TIKTOK_CLIENT_SECRET?: string;
  EXPO_PUBLIC_TIKTOK_CLIENT_KEY?: string;
  EXPO_PUBLIC_TIKTOK_CLIENT_SECRET?: string;
  TIKTOK_KV?: SimpleKVNamespace;
  ALQUIMIA_KV?: SimpleKVNamespace;
  [key: string]: unknown;
}

interface EventContext {
  request: Request;
  env: Env;
  params: Record<string, string | string[]>;
  waitUntil: (promise: Promise<unknown>) => void;
  next: (input?: Request | string, init?: RequestInit) => Promise<Response>;
  data: Record<string, unknown>;
}

/**
 * Manejador OPTIONS para compatibilidad CORS
 */
export async function onRequestOptions(): Promise<Response> {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, TikTok-Signature',
    },
  });
}

/**
 * Manejador GET: Verificación de salud y registro inicial del webhook en el portal de TikTok
 */
export async function onRequestGet(): Promise<Response> {
  return new Response(
    JSON.stringify({
      status: 'ok',
      service: 'TikTok Webhook Endpoint — Alquimia Studio',
      plataforma: 'tiktok',
      timestamp: new Date().toISOString(),
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    }
  );
}

/**
 * Manejador POST: Recepción, verificación criptográfica, acuse 200 inmediato e idempotencia
 */
export async function onRequestPost(context: EventContext): Promise<Response> {
  // 1. Leer el body crudo (raw, sin parsear) exactamente como llegó en la solicitud
  let rawBody: string;
  try {
    rawBody = await context.request.text();
  } catch (err) {
    console.error('[webhook:tiktok] Error al leer body de la solicitud:', err);
    return new Response(JSON.stringify({ error: 'No se pudo leer el cuerpo de la solicitud' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 2. Extraer el encabezado oficial de firma TikTok-Signature
  const signatureHeader =
    context.request.headers.get(HEADER_FIRMA_TIKTOK) ||
    context.request.headers.get('tiktok-signature') ||
    context.request.headers.get('TikTok-Signature');

  // 3. Obtener el secreto de la app desde las variables de entorno seguras de Cloudflare
  const clientSecret =
    context.env.TIKTOK_CLIENT_SECRET ||
    context.env.EXPO_PUBLIC_TIKTOK_CLIENT_SECRET;

  if (!clientSecret) {
    console.error('[webhook:tiktok] TIKTOK_CLIENT_SECRET no está configurado en las variables de entorno');
    return new Response(
      JSON.stringify({ error: 'Configuración del servidor incompleta (TIKTOK_CLIENT_SECRET faltante)' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  // 4. VERIFICACIÓN CRIPTOGRÁFICA ANTES DE TOCAR EL BODY O NORMALIZAR
  // Si la firma es inválida, se responde 401 inmediatamente y NUNCA se llama a normalizarEvento()
  const verificacion = await verificarFirmaTikTok(rawBody, signatureHeader, clientSecret);

  if (!verificacion.valido) {
    console.warn('[webhook:tiktok] Intento de acceso no autorizado con firma inválida:', verificacion.error);
    return new Response(
      JSON.stringify({
        error: 'Unauthorized: Firma de webhook inválida',
        razon: verificacion.error,
      }),
      {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  // 5. Parsear el body crudo validado
  let payloadParsed: unknown;
  try {
    payloadParsed = JSON.parse(rawBody);
  } catch (err) {
    console.error('[webhook:tiktok] JSON malformado en payload con firma válida:', err);
    return new Response(JSON.stringify({ error: 'Payload JSON malformado' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 6. Preparar procesamiento en segundo plano (asíncrono) para no demorar el 200 OK
  // TikTok exige respuesta 200 inmediata para no entrar en bucle de reintentos por 72h
  const kv = context.env.ALQUIMIA_KV || context.env.TIKTOK_KV;
  const esSandbox = Boolean(
    context.request.headers.get('X-TikTok-Sandbox') === 'true' ||
    (typeof payloadParsed === 'object' && payloadParsed !== null && 'client_key' in payloadParsed && String((payloadParsed as Record<string, unknown>).client_key).includes('sandbox'))
  );

  const tareaAsincrona = async (): Promise<void> => {
    try {
      // Normalizar usando el motor desacoplado de Fase 1
      const eventos: EventoEntrante[] = normalizarEvento('tiktok', payloadParsed, { esSandbox });

      for (const evento of eventos) {
        // IDEMPOTENCIA REAL: Comprobar y registrar en KV con TTL de 24 horas (86,400s)
        const { esDuplicado } = await registrarYVerificarIdempotencia(kv, 'tiktok', evento.id, 86400);

        if (esDuplicado) {
          // Descartar sin reprocesar (Cero logs de PII/datos privados en consola)
          console.info(`[webhook:tiktok] Evento duplicado ignorado de forma idempotente (id=${evento.id})`);
          continue;
        }

        // Registro de telemetría seguro (solo ID, tipo de evento y timestamp, sin datos personales)
        console.info(`[webhook:tiktok] Evento validado y listo para procesar (id=${evento.id}, tipo=${evento.tipo}, sandbox=${evento.esSandbox})`);

        // Procesamiento central agnóstico (Fase 2)
        const eventoSaliente = await procesarEvento(evento, { env: context.env });
        if (eventoSaliente) {
          console.info(`[webhook:tiktok] Evento procesado exitosamente -> Saliente generado (id=${eventoSaliente.id}, tipo=${eventoSaliente.tipoRespuesta})`);
          // Despacho oficial al adaptador de salida de TikTok
          await enviarRespuestaTikTok(eventoSaliente, context.env as EnvTikTok);
        }
      }
    } catch (error) {
      console.error('[webhook:tiktok] Error en procesamiento en segundo plano:', error);
    }
  };

  // Encolar trabajo en segundo plano mediante context.waitUntil si está disponible
  if (typeof context.waitUntil === 'function') {
    context.waitUntil(tareaAsincrona());
  } else {
    // Fallback de ejecución sin bloquear el hilo
    tareaAsincrona().catch((err) => {
      console.error('[webhook:tiktok] Error no capturado en tarea en segundo plano:', err);
    });
  }

  // 7. RESPONDER 200 OK INMEDIATAMENTE
  return new Response(
    JSON.stringify({
      code: 0,
      message: 'success',
      timestamp: new Date().toISOString(),
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
}
