// ============================================================
// functions/api/meta/data-deletion.ts
// Cloudflare Pages Function: Meta Data Deletion Request Callback
// Requisito oficial obligatorio de Meta Graph API / App Review
// Responde según la especificación de Meta con confirmation_code y URL de estado
// ============================================================

interface Env {
  META_APP_SECRET?: string;
  EXPO_PUBLIC_META_APP_SECRET?: string;
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function onRequestOptions(): Promise<Response> {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

function base64UrlDecode(str: string): Uint8Array {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export async function onRequestPost(context: { request: Request; env: Env }): Promise<Response> {
  try {
    const appSecret = (
      context.env.META_APP_SECRET ||
      context.env.EXPO_PUBLIC_META_APP_SECRET ||
      ''
    ).trim();

    let signedRequest = '';

    const contentType = context.request.headers.get('content-type') || '';
    if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await context.request.formData();
      signedRequest = ((formData as any).get('signed_request') as string) || '';
    } else if (contentType.includes('application/json')) {
      const body = (await context.request.json()) as any;
      signedRequest = body.signed_request || '';
    }

    let userId = 'usuario';
    const confirmationCode = `del_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;

    if (signedRequest && appSecret) {
      try {
        const parts = signedRequest.split('.');
        if (parts.length === 2) {
          const payloadJson = new TextDecoder().decode(base64UrlDecode(parts[1]));
          const data = JSON.parse(payloadJson);
          if (data.user_id) {
            userId = data.user_id;
          }
        }
      } catch (parseErr) {
        console.warn('[Meta data-deletion] Error al decodificar signed_request:', parseErr);
      }
    }

    const host = new URL(context.request.url).origin;
    const statusUrl = `${host}/data-deletion.html?code=${encodeURIComponent(confirmationCode)}&id=${encodeURIComponent(userId)}`;

    return new Response(
      JSON.stringify({
        url: statusUrl,
        confirmation_code: confirmationCode,
      }),
      {
        status: 200,
        headers: {
          ...CORS_HEADERS,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (err: unknown) {
    console.error('[Meta data-deletion] Error procesando solicitud:', err);
    return new Response(
      JSON.stringify({
        error: 'No se pudo procesar la solicitud de eliminación de datos.',
      }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  }
}

export async function onRequestGet(context: { request: Request }): Promise<Response> {
  const host = new URL(context.request.url).origin;
  return new Response(
    JSON.stringify({
      service: 'Alquimia Estudio Data Deletion Service',
      status: 'active',
      instructions: `${host}/eliminar-datos.html`,
    }),
    { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
  );
}
