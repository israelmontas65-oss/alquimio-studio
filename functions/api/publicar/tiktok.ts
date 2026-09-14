// functions/api/publicar/tiktok.ts
// Publicación real vía TikTok Content Posting API, con limitador de tasa
// (6 solicitudes/minuto, 25 videos/día) respaldado en KV para que persista
// entre invocaciones de la función (una variable en memoria no sirve en serverless).

import { getSession } from "../../shared/session-store";

interface Env {
  SESSIONS: KVNamespace;
  SESSION_SECRET: string;
  RATE_LIMITS: KVNamespace; // namespace de KV separado, solo para contadores (no datos sensibles)
}

const MAX_PER_MINUTE = 6;
const MAX_PER_DAY = 25;

interface PublishBody {
  videoUrl: string;
  caption: string;
  sandbox: boolean; // true mientras la app no esté auditada por TikTok
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const body = await request.json<PublishBody>();

  const session = await getSession(env, "tiktok");
  if (!session) {
    return Response.json({ message: "tiktok_not_connected" }, { status: 401 });
  }

  const withinLimits = await checkAndIncrementRateLimit(env);
  if (!withinLimits) {
    return Response.json({ platform: "tiktok", status: "error", errorMessage: "rate_limit_exceeded" }, { status: 429 });
  }

  try {
    // Nota: PULL_FROM_URL requiere que el dominio de videoUrl esté verificado
    // en "Manage URL properties" del portal de TikTok for Developers.
    const initRes = await fetch("https://open.tiktokapis.com/v2/post/publish/video/init/", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        post_info: {
          title: body.caption,
          // Mientras la app no esté auditada, TikTok fuerza SELF_ONLY sin importar este valor.
          privacy_level: body.sandbox ? "SELF_ONLY" : "PUBLIC_TO_EVERYONE",
        },
        source_info: {
          source: "PULL_FROM_URL",
          video_url: body.videoUrl,
        },
      }),
    });
    const initData = await initRes.json<{ data?: { publish_id?: string }; error?: any }>();

    if (!initData.data?.publish_id) {
      return Response.json(
        { platform: "tiktok", status: "error", errorMessage: initData.error?.message || "init_failed" },
        { status: 502 }
      );
    }

    // La publicación de TikTok es asíncrona: devolvemos "processing" y el frontend
    // debe consultar el estado con el publish_id (ver tiktok-status.ts).
    return Response.json({ platform: "tiktok", status: "processing", publishId: initData.data.publish_id });
  } catch (err: any) {
    return Response.json({ platform: "tiktok", status: "error", errorMessage: err.message }, { status: 500 });
  }
};

async function checkAndIncrementRateLimit(env: Env): Promise<boolean> {
  const now = Date.now();
  const minuteKey = `tiktok:minute:${Math.floor(now / 60000)}`;
  const dayKey = `tiktok:day:${new Date().toISOString().slice(0, 10)}`;

  const minuteCount = parseInt((await env.RATE_LIMITS.get(minuteKey)) || "0", 10);
  const dayCount = parseInt((await env.RATE_LIMITS.get(dayKey)) || "0", 10);

  if (minuteCount >= MAX_PER_MINUTE || dayCount >= MAX_PER_DAY) {
    return false;
  }

  await env.RATE_LIMITS.put(minuteKey, String(minuteCount + 1), { expirationTtl: 60 });
  await env.RATE_LIMITS.put(dayKey, String(dayCount + 1), { expirationTtl: 86400 });
  return true;
}
