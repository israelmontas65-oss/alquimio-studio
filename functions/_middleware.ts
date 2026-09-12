// ============================================================
// functions/_middleware.ts
// Cloudflare Pages Middleware: Server-Side Rendering (SSR) para Comprobante de Eliminación
// Garantiza que crawlers, bots (Meta App Review) y curl reciban el código YA renderizado en el HTML
// ============================================================

interface Env {
  ASSETS?: {
    fetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
  };
  [key: string]: any;
}

interface EventContext {
  request: Request;
  env: Env;
  params: Record<string, string | string[]>;
  waitUntil: (promise: Promise<any>) => void;
  next: (input?: Request | string, init?: RequestInit) => Promise<Response>;
  data: Record<string, any>;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export async function onRequest(context: EventContext): Promise<Response> {
  const url = new URL(context.request.url);
  const path = url.pathname;

  // ── Verificación oficial de TikTok Developers (Cero Redirecciones 308) ────────
  if (
    path.startsWith('/tiktok-developers-site-verification') ||
    path.includes('AUswPQAhEWWbcbmxvZKVeFse8IunJ1Fg')
  ) {
    const isHtml = path.endsWith('.html') || !path.includes('.');
    const contentType = isHtml ? 'text/html; charset=utf-8' : 'text/plain; charset=utf-8';
    const bodyContent = isHtml
      ? `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="tiktok-developers-site-verification" content="AUswPQAhEWWbcbmxvZKVeFse8IunJ1Fg" />
  <meta name="tiktok-developers-site-verification" content="tiktok-developers-site-verification=AUswPQAhEWWbcbmxvZKVeFse8IunJ1Fg" />
  <title>TikTok Developer Verification — Alquimia Studio</title>
</head>
<body>
tiktok-developers-site-verification=AUswPQAhEWWbcbmxvZKVeFse8IunJ1Fg
</body>
</html>`
      : `tiktok-developers-site-verification=AUswPQAhEWWbcbmxvZKVeFse8IunJ1Fg\n`;

    return new Response(bodyContent, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  const isEliminarDatos = path === '/eliminar-datos' || path === '/eliminar-datos.html';
  const isDataDeletion = path === '/data-deletion' || path === '/data-deletion.html';

  if (!isEliminarDatos && !isDataDeletion) {
    return context.next();
  }

  const code = url.searchParams.get('code');
  const id = url.searchParams.get('id') || 'usuario_meta';
  const lang = (url.searchParams.get('lang') || '').toLowerCase();

  // Obtener el HTML estático de eliminar-datos.html desde ASSETS
  let assetRes: Response | null = null;
  const assetUrl = new URL('/eliminar-datos.html', context.request.url);

  if (context.env?.ASSETS?.fetch) {
    try {
      assetRes = await context.env.ASSETS.fetch(assetUrl);
    } catch (err) {
      console.warn('[_middleware] Error en context.env.ASSETS.fetch:', err);
    }
  }

  if (!assetRes || !assetRes.ok) {
    try {
      assetRes = await context.next();
    } catch (err) {
      console.warn('[_middleware] Error en context.next():', err);
    }
  }

  if (!assetRes || !assetRes.ok) {
    // Si no se pudo obtener el asset, pasar al siguiente manejador
    return context.next();
  }

  let html = await assetRes.text();

  // Si hay código de confirmación, realizar Server-Side Rendering (SSR)
  if (code) {
    const safeCode = escapeHtml(code);
    const safeId = escapeHtml(id);

    // 1. Mostrar tarjeta de confirmación en español y reemplazar placeholders
    html = html.replace(
      'id="meta-confirmation-box-es" class="confirmation-card" style="display: none;"',
      'id="meta-confirmation-box-es" class="confirmation-card" style="display: block;"'
    );
    html = html.replace(
      '<span id="confirmation-code-value-es" class="code-value">---</span>',
      `<span id="confirmation-code-value-es" class="code-value">${safeCode}</span>`
    );
    html = html.replace(
      '<span id="user-id-value-es" class="code-value" style="color:var(--gold);">---</span>',
      `<span id="user-id-value-es" class="code-value" style="color:var(--gold);">${safeId}</span>`
    );

    // 2. Mostrar tarjeta de confirmación en inglés y reemplazar placeholders
    html = html.replace(
      'id="meta-confirmation-box-en" class="confirmation-card" style="display: none;"',
      'id="meta-confirmation-box-en" class="confirmation-card" style="display: block;"'
    );
    html = html.replace(
      '<span id="confirmation-code-value-en" class="code-value">---</span>',
      `<span id="confirmation-code-value-en" class="code-value">${safeCode}</span>`
    );
    html = html.replace(
      '<span id="user-id-value-en" class="code-value" style="color:var(--gold);">---</span>',
      `<span id="user-id-value-en" class="code-value" style="color:var(--gold);">${safeId}</span>`
    );
  }

  // Si se solicita inglés explícitamente, alternar secciones en el servidor
  if (lang === 'en') {
    html = html.replace(
      '<div id="content-es">',
      '<div id="content-es" style="display: none;">'
    );
    html = html.replace(
      '<div id="content-en" style="display: none;">',
      '<div id="content-en" style="display: block;">'
    );
    html = html.replace(
      '.lang-section-en { display: none; }',
      '.lang-section-en { display: block; } .lang-section-es { display: none !important; }'
    );
  }

  // Devolver respuesta pre-renderizada con headers HTML
  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=UTF-8',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'X-Render-Mode': 'SSR-Cloudflare-Pages',
    },
  });
}
