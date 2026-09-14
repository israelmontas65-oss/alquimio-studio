// functions/api/oauth/youtube.ts
// Flujo OAuth 2.0 estándar de Google para YouTube Data API v3.
// GET /api/oauth/youtube?start=1           -> redirige al login real de Google
// GET /api/oauth/youtube?code=...&state=.. -> callback: intercambia el code por tokens

import { saveSession } from "../../shared/session-store";

interface Env {
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  GOOGLE_REDIRECT_URI: string;
  SESSIONS: KVNamespace;
  SESSION_SECRET: string;
}

const SCOPE = "https://www.googleapis.com/auth/youtube.upload";

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);

  // ---------- Paso 1: iniciar el flujo ----------
  if (url.searchParams.get("start") === "1") {
    const state = crypto.randomUUID();
    const authorizeUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    authorizeUrl.searchParams.set("client_id", env.GOOGLE_CLIENT_ID);
    authorizeUrl.searchParams.set("redirect_uri", env.GOOGLE_REDIRECT_URI);
    authorizeUrl.searchParams.set("response_type", "code");
    authorizeUrl.searchParams.set("scope", SCOPE);
    // access_type=offline + prompt=consent son necesarios para recibir refresh_token de forma confiable
    authorizeUrl.searchParams.set("access_type", "offline");
    authorizeUrl.searchParams.set("prompt", "consent");
    authorizeUrl.searchParams.set("state", state);

    const headers = new Headers({ Location: authorizeUrl.toString() });
    headers.append("Set-Cookie", `yt_oauth_state=${state}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=600`);
    return new Response(null, { status: 302, headers });
  }

  // ---------- Paso 2: callback de Google ----------
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error) return redirectWithStatus("youtube", "error", error);
  if (!code || !state) return redirectWithStatus("youtube", "error", "missing_code_or_state");

  const cookieHeader = request.headers.get("Cookie") || "";
  const expectedState = getCookie(cookieHeader, "yt_oauth_state");
  if (!expectedState || expectedState !== state) {
    return redirectWithStatus("youtube", "error", "state_mismatch");
  }

  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
        code,
        grant_type: "authorization_code",
        redirect_uri: env.GOOGLE_REDIRECT_URI,
      }),
    });
    const tokenData = await tokenRes.json<{
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
      error?: string;
    }>();

    if (!tokenData.access_token) {
      return redirectWithStatus("youtube", "error", tokenData.error || "token_exchange_failed");
    }

    const channelRes = await fetch(
      "https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true",
      { headers: { Authorization: `Bearer ${tokenData.access_token}` } }
    );
    const channelData = await channelRes.json<{ items?: any[] }>();

    await saveSession(env, {
      platform: "youtube",
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token ?? null,
      expiresAt: Date.now() + (tokenData.expires_in ?? 3600) * 1000,
      profile: channelData.items?.[0]?.snippet ?? {},
    });

    return redirectWithStatus("youtube", "success");
  } catch {
    return redirectWithStatus("youtube", "error", "unexpected_exception");
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
