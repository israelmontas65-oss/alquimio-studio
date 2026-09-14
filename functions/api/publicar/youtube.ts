// functions/api/publicar/youtube.ts
// Publicación real vía YouTube Data API v3 (upload resumable).
// NOTA DE ESCALA: esta versión carga el video completo en memoria antes de
// subirlo, lo cual es aceptable para el MVP de 60 días con archivos pequeños/medianos.
// Para videos grandes en producción, hay que dividir la subida en chunks reales
// contra la uploadUrl en vez de un solo PUT — dejarlo así documentado para la
// siguiente iteración, no lo resuelvas inventando un chunking a medias.

import { getSession, saveSession, PlatformSession } from "../../shared/session-store";

interface Env {
  SESSIONS: KVNamespace;
  SESSION_SECRET: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
}

interface PublishBody {
  videoUrl: string;
  title: string;
  description: string;
  privacyStatus: "private" | "unlisted" | "public";
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const body = await request.json<PublishBody>();

  let session = await getSession(env, "youtube");
  if (!session) {
    return Response.json({ message: "youtube_not_connected" }, { status: 401 });
  }

  // Refrescar el token si está por expirar (margen de 5 minutos)
  if (session.expiresAt - Date.now() < 5 * 60 * 1000 && session.refreshToken) {
    session = await refreshYouTubeToken(env, session);
  }

  try {
    const mediaRes = await fetch(body.videoUrl);
    if (!mediaRes.ok || !mediaRes.body) {
      return Response.json({ message: "media_fetch_failed" }, { status: 400 });
    }
    const mediaBlob = await mediaRes.arrayBuffer();

    // Iniciar sesión de upload resumable
    const initRes = await fetch(
      "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          "Content-Type": "application/json",
          "X-Upload-Content-Type": "video/*",
        },
        body: JSON.stringify({
          snippet: { title: body.title, description: body.description },
          status: { privacyStatus: body.privacyStatus },
        }),
      }
    );

    const uploadUrl = initRes.headers.get("Location");
    if (!uploadUrl) {
      const initError = await initRes.json().catch(() => ({}));
      return Response.json(
        { status: "error", errorMessage: initError?.error?.message || "resumable_session_init_failed" },
        { status: 502 }
      );
    }

    const uploadRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": "video/*" },
      body: mediaBlob,
    });
    const uploadData = await uploadRes.json<{ id?: string; error?: any }>();

    if (!uploadData.id) {
      return Response.json({ status: "error", errorMessage: uploadData.error?.message || "upload_failed" }, { status: 502 });
    }

    return Response.json({ platform: "youtube", status: "success", videoId: uploadData.id });
  } catch (err: any) {
    return Response.json({ platform: "youtube", status: "error", errorMessage: err.message }, { status: 500 });
  }
};

async function refreshYouTubeToken(env: Env, session: PlatformSession): Promise<PlatformSession> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      refresh_token: session.refreshToken ?? "",
      grant_type: "refresh_token",
    }),
  });
  const data = await res.json<{ access_token?: string; expires_in?: number }>();

  if (data.access_token) {
    session.accessToken = data.access_token;
    session.expiresAt = Date.now() + (data.expires_in ?? 3600) * 1000;
    await saveSession(env, session);
  }
  return session;
}
