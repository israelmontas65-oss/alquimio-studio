// ============================================================
// functions/api/cerebro.ts
// Cloudflare Pages Function: Endpoint Público del Cerebro Único
// Ruta pública: /api/cerebro
// Alquimia Studio — Titularidad: Israel Montás
// ============================================================

import { consultarCerebro } from '../cerebro';
import type { SolicitudCerebro } from '../cerebro/enrutador';

interface Env {
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

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Alquimia-Session',
};

export async function onRequestOptions(): Promise<Response> {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

export async function onRequestPost(context: EventContext): Promise<Response> {
  let body: SolicitudCerebro;

  try {
    body = (await context.request.json()) as SolicitudCerebro;
  } catch {
    return new Response(
      JSON.stringify({ error: 'El cuerpo de la solicitud debe ser un JSON válido' }),
      {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      }
    );
  }

  if (!body.texto || typeof body.texto !== 'string' || body.texto.trim() === '') {
    return new Response(
      JSON.stringify({ error: 'El campo "texto" es obligatorio para consultar al Cerebro' }),
      {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      }
    );
  }

  try {
    const resultado = await consultarCerebro(body, context.env);

    return new Response(JSON.stringify(resultado), {
      status: 200,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[api:cerebro] Error al procesar solicitud en el Cerebro:', err);
    return new Response(
      JSON.stringify({
        error: 'Error interno en el Cerebro de Alquimia Studio',
        detalles: err instanceof Error ? err.message : String(err),
      }),
      {
        status: 500,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      }
    );
  }
}
