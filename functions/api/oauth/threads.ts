// functions/api/oauth/threads.ts
// IMPORTANTE: Threads NO comparte el flujo OAuth de Facebook/Instagram.
// Usa su propia API en graph.threads.net y su propia pantalla de autorización
// en threads.net/oauth/authorize, con scopes propios.
// Para que esto funcione en producción (no solo en el código), tu app de Meta
// necesita pasar "Tech Provider Verification" — un paso de verificación de
// identidad separado del registro estándar de developer, que toma ~1 semana.
// Mientras no la tengas, este endpoint puede fallar con un error de permisos
// aunque el código esté correcto — no es un bug de este archivo.

import { saveSession } from "../../shared/session-store";

interface Env {
  THREADS_APP_ID: string;
  THREADS_APP_SECRET: string;
  THREADS_REDIRECT_URI: string;
  SESSIONS: KVNamespace;
  SESSION_SECRET: string;
}

const SCOPES = "threads_basic,threads_content_publish";

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);

  // ---------- Paso 1: iniciar el flujo ----------
  if (url.searchParams.get("start") === "1") {
    const state = crypto.randomUUID();
    const authorizeUrl = new URL("https://threads.net/oauth/authorize");
    authorizeUrl.searchParams.set("client_id", env.THREADS_APP_ID);
    authorizeUrl.searchParams.set("redirect_uri", env.THREADS_REDIRECT_URI);
    authorizeUrl.searchParams.set("scope", SCOPES);
    authorizeUrl.searchParams.set("response_type", "code");
    authorizeUrl.searchParams.set("state", state);

    const headers = new Headers({ Location: authorizeUrl.toString() });
    headers.append("Set-Cookie", `threads_oauth_state=${state}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=600`);
    return new Response(null, { status: 302, headers });
  }

  // ---------- Paso 2: callback de Threads ----------
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error) return redirectWithStatus("threads", "error", error);
  if (!code || !state) return redirectWithStatus("threads", "error", "missing_code_or_state");

  const cookieHeader = request.headers.get("Cookie") || "";
  const expectedState = getCookie(cookieHeader, "threads_oauth_state");
  if (!expectedState || expectedState !== state) {
    return redirectWithStatus("threads", "error", "state_mismatch");
  }

  try {
    // graph.threads.net usa POST con body de formulario para el primer intercambio
    const tokenRes = await fetch("https://graph.threads.net/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: env.THREADS_APP_ID,
        client_secret: env.THREADS_APP_SECRET,
        grant_type: "authorization_code",
        redirect_uri: env.THREADS_REDIRECT_URI,
        code,
      }),
    });
    const shortTokenData = await tokenRes.json<{
      access_token?: string;
      user_id?: string;
      error_message?: string;
    }>();

    if (!shortTokenData.access_token) {
      return redirectWithStatus("threads", "error", shortTokenData.error_message || "token_exchange_failed");
    }

    // Intercambiar por token de larga duración (~60 días)
    const longTokenRes = await fetch(
      "https://graph.threads.net/access_token?" +
        new URLSearchParams({
          grant_type: "th_exchange_token",
          client_secret: env.THREADS_APP_SECRET,
          access_token: shortTokenData.access_token,
        })
    );
    const longTokenData = await longTokenRes.json<{ access_token?: string; expires_in?: number }>();

    const finalToken = longTokenData.access_token ?? shortTokenData.access_token;
    const expiresAt = Date.now() + (longTokenData.expires_in ?? 5_184_000) * 1000;

    await saveSession(env, {
      platform: "threads",
      accessToken: finalToken,
      refreshToken: null,
      expiresAt,
      profile: { userId: shortTokenData.user_id },
    });

    return redirectWithStatus("threads", "success");
  } catch {
    return redirectWithStatus("threads", "error", "unexpected_exception");
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
