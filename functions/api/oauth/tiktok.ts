// functions/api/oauth/tiktok.ts
// Flujo OAuth v2 de TikTok con PKCE (obligatorio en su API).
// GET /api/oauth/tiktok?start=1           -> redirige al login real de TikTok
// GET /api/oauth/tiktok?code=...&state=.. -> callback: intercambia el code por tokens

import { saveSession } from "../../shared/session-store";

interface Env {
  TIKTOK_CLIENT_KEY: string;
  TIKTOK_CLIENT_SECRET: string;
  TIKTOK_REDIRECT_URI: string; // HTTPS obligatorio, debe coincidir exacto con el portal de TikTok for Developers
  SESSIONS: KVNamespace;
  SESSION_SECRET: string;
}

const SCOPES = "user.info.basic,video.publish,video.upload";

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);

  // ---------- Paso 1: iniciar el flujo con PKCE ----------
  if (url.searchParams.get("start") === "1") {
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);
    const state = crypto.randomUUID();

    const authorizeUrl = new URL("https://www.tiktok.com/v2/auth/authorize/");
    authorizeUrl.searchParams.set("client_key", env.TIKTOK_CLIENT_KEY);
    authorizeUrl.searchParams.set("redirect_uri", env.TIKTOK_REDIRECT_URI);
    authorizeUrl.searchParams.set("scope", SCOPES);
    authorizeUrl.searchParams.set("response_type", "code");
    authorizeUrl.searchParams.set("state", state);
    authorizeUrl.searchParams.set("code_challenge", codeChallenge);
    authorizeUrl.searchParams.set("code_challenge_method", "S256");

    const headers = new Headers({ Location: authorizeUrl.toString() });
    headers.append("Set-Cookie", `tiktok_oauth_state=${state}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=600`);
    headers.append("Set-Cookie", `tiktok_code_verifier=${codeVerifier}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=600`);
    return new Response(null, { status: 302, headers });
  }

  // ---------- Paso 2: callback de TikTok ----------
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error) return redirectWithStatus("tiktok", "error", error);
  if (!code || !state) return redirectWithStatus("tiktok", "error", "missing_code_or_state");

  const cookieHeader = request.headers.get("Cookie") || "";
  const expectedState = getCookie(cookieHeader, "tiktok_oauth_state");
  const codeVerifier = getCookie(cookieHeader, "tiktok_code_verifier");

  if (!expectedState || expectedState !== state || !codeVerifier) {
    return redirectWithStatus("tiktok", "error", "state_or_verifier_mismatch");
  }

  try {
    const tokenRes = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_key: env.TIKTOK_CLIENT_KEY,
        client_secret: env.TIKTOK_CLIENT_SECRET,
        code,
        grant_type: "authorization_code",
        redirect_uri: env.TIKTOK_REDIRECT_URI,
        code_verifier: codeVerifier,
      }),
    });
    const tokenData = await tokenRes.json<{
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
      open_id?: string;
      error?: string;
    }>();

    if (!tokenData.access_token) {
      return redirectWithStatus("tiktok", "error", tokenData.error || "token_exchange_failed");
    }

    const infoRes = await fetch(
      "https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,avatar_url",
      { headers: { Authorization: `Bearer ${tokenData.access_token}` } }
    );
    const infoData = await infoRes.json<{ data?: { user?: any } }>();

    await saveSession(env, {
      platform: "tiktok",
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token ?? null,
      expiresAt: Date.now() + (tokenData.expires_in ?? 86_400) * 1000, // 24h por defecto
      profile: infoData.data?.user ?? { open_id: tokenData.open_id },
    });

    return redirectWithStatus("tiktok", "success");
  } catch {
    return redirectWithStatus("tiktok", "error", "unexpected_exception");
  }
};

// ---------- Utilidades PKCE ----------
function generateCodeVerifier(): string {
  const array = new Uint8Array(64);
  crypto.getRandomValues(array);
  return base64UrlEncode(array);
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(verifier));
  return base64UrlEncode(new Uint8Array(digest));
}

function base64UrlEncode(bytes: Uint8Array): string {
  const str = btoa(String.fromCharCode(...bytes));
  return str.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

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
