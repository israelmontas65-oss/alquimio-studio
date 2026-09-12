// ============================================================
// functions/eliminar-datos.ts
// Cloudflare Pages Function: SSR para /eliminar-datos
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

export async function onRequestGet(context: EventContext): Promise<Response> {
  const url = new URL(context.request.url);
  const code = url.searchParams.get('code');
  const id = url.searchParams.get('id') || 'usuario_meta';
  const lang = (url.searchParams.get('lang') || '').toLowerCase();

  let assetRes: Response | null = null;
  const assetUrl = new URL('/eliminar-datos.html', context.request.url);

  if (context.env?.ASSETS?.fetch) {
    try {
      assetRes = await context.env.ASSETS.fetch(assetUrl);
    } catch (err) {
      console.warn('[eliminar-datos.ts] Error en context.env.ASSETS.fetch:', err);
    }
  }

  if (!assetRes || !assetRes.ok) {
    try {
      assetRes = await context.next();
    } catch (err) {
      console.warn('[eliminar-datos.ts] Error en context.next():', err);
    }
  }

  if (!assetRes || !assetRes.ok) {
    return context.next();
  }

  let html = await assetRes.text();

  if (code) {
    const safeCode = escapeHtml(code);
    const safeId = escapeHtml(id);

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

  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=UTF-8',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'X-Render-Mode': 'SSR-Cloudflare-Pages',
    },
  });
}
