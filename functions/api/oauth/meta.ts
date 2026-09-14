// functions/api/oauth/meta.ts
// Flujo OAuth real de Meta Graph API (Facebook Pages + Instagram Business).
// GET /api/oauth/meta?start=1           -> redirige al login real de Meta
// GET /api/oauth/meta?code=...&state=.. -> callback: intercambia el code por tokens

import { saveSession } from "../../shared/session-store";

interface Env {
  META_APP_ID: string;
  META_APP_SECRET: string;
  META_REDIRECT_URI: string; // debe coincidir EXACTO (char por char) con el registrado en Meta App Dashboard
  SESSIONS: KVNamespace;
  SESSION_SECRET: string;
}

// Verificar contra developers.facebook.com/docs/graph-api/changelog si esta versión sigue vigente.
const GRAPH_VERSION = "v21.0";

const SCOPES = [
  "instagram_basic",
  "instagram_content_publish",
  "pages_show_list",
  "pages_manage_posts",
  "pages_read_engagement",
  "business_management",
].join(",");

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);

  // ---------- Paso 1: iniciar el flujo ----------
  if (url.searchParams.get("start") === "1") {
    const state = crypto.randomUUID();
    const authorizeUrl = new URL(`https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth`);
    authorizeUrl.searchParams.set("client_id", env.META_APP_ID);
    authorizeUrl.searchParams.set("redirect_uri", env.META_REDIRECT_URI);
    authorizeUrl.searchParams.set("scope", SCOPES);
    authorizeUrl.searchParams.set("response_type", "code");
    authorizeUrl.searchParams.set("state", state);

    const headers = new Headers({ Location: authorizeUrl.toString() });
    headers.append(
      "Set-Cookie",
      `meta_oauth_state=${state}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=600`
    );
    return new Response(null, { status: 302, headers });
  }

  // ---------- Paso 2: callback de Meta ----------
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error) return redirectWithStatus("meta", "error", error);
  if (!code || !state) return redirectWithStatus("meta", "error", "missing_code_or_state");

  const cookieHeader = request.headers.get("Cookie") || "";
  const expectedState = getCookie(cookieHeader, "meta_oauth_state");
  if (!expectedState || expectedState !== state) {
    return redirectWithStatus("meta", "error", "state_mismatch");
  }

  try {
    // Intercambiar el code por un token de corta duración (~1 hora)
    const shortTokenRes = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/oauth/access_token?` +
        new URLSearchParams({
          client_id: env.META_APP_ID,
          client_secret: env.META_APP_SECRET,
          redirect_uri: env.META_REDIRECT_URI,
          code,
        })
    );
    const shortTokenData = await shortTokenRes.json<{ access_token?: string; error?: any }>();
    if (!shortTokenData.access_token) {
      return redirectWithStatus("meta", "error", shortTokenData.error?.message || "token_exchange_failed");
    }

    // Intercambiar por token de larga duración (~60 días)
    const longTokenRes = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/oauth/access_token?` +
        new URLSearchParams({
          grant_type: "fb_exchange_token",
          client_id: env.META_APP_ID,
          client_secret: env.META_APP_SECRET,
          fb_exchange_token: shortTokenData.access_token,
        })
    );
    const longTokenData = await longTokenRes.json<{ access_token?: string; expires_in?: number; error?: any }>();
    if (!longTokenData.access_token) {
      return redirectWithStatus("meta", "error", longTokenData.error?.message || "long_token_exchange_failed");
    }

    // Obtener las Páginas del usuario y su cuenta de Instagram Business vinculada
    const accountsRes = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/me/accounts?` +
        new URLSearchParams({
          fields: "id,name,access_token,instagram_business_account",
          access_token: longTokenData.access_token,
        })
    );
    const accountsData = await accountsRes.json<{ data?: any[] }>();

    const expiresAt = Date.now() + (longTokenData.expires_in ?? 5_184_000) * 1000; // 60 días por defecto

    await saveSession(env, {
      platform: "meta",
      accessToken: longTokenData.access_token,
      refreshToken: null, // Meta no usa refresh_token clásico; se renueva reintercambiando el long-lived token
      expiresAt,
      profile: { pages: accountsData.data ?? [] },
    });

    return redirectWithStatus("meta", "success");
  } catch {
    return redirectWithStatus("meta", "error", "unexpected_exception");
  }
};

function getCookie(cookieHeader: string, name: string): string | null {
  const match = cookieHeader.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function redirectWithStatus(platform: string, status: "success" | "error", reason?: string) {
  const url = new URL("https://alquimia-studio.pages.dev/conectar-cuentas");
  url.searchParams.set("platform", platform);
  url.searchParams.set("status", status);
  if (reason) url.searchParams.set("reason", reason);
  return new Response(null, { status: 302, headers: { Location: url.toString() } });
}
