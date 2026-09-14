// functions/api/publicar/tiktok-status.ts
// TikTok procesa el video de forma asíncrona tras el init. El frontend debe
// consultar este endpoint (con el publish_id devuelto por tiktok.ts) hasta
// que el estado deje de ser "PROCESSING_DOWNLOAD" o "PROCESSING_UPLOAD".

import { getSession } from "../../shared/session-store";

interface Env {
  SESSIONS: KVNamespace;
  SESSION_SECRET: string;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);
  const publishId = url.searchParams.get("publish_id");

  if (!publishId) {
    return Response.json({ error: "missing_publish_id" }, { status: 400 });
  }

  const session = await getSession(env, "tiktok");
  if (!session) {
    return Response.json({ message: "tiktok_not_connected" }, { status: 401 });
  }

  try {
    const statusRes = await fetch("https://open.tiktokapis.com/v2/post/publish/status/fetch/", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ publish_id: publishId }),
    });
    const statusData = await statusRes.json<{ data?: { status?: string; publicaly_available_post_id?: string[] } }>();

    return Response.json({
      platform: "tiktok",
      status: mapTikTokStatus(statusData.data?.status),
      rawStatus: statusData.data?.status,
      postIds: statusData.data?.publicaly_available_post_id ?? [],
    });
  } catch (err: any) {
    return Response.json({ platform: "tiktok", status: "error", errorMessage: err.message }, { status: 500 });
  }
};

function mapTikTokStatus(rawStatus?: string): "processing" | "success" | "error" {
  if (!rawStatus) return "error";
  if (rawStatus === "PUBLISH_COMPLETE") return "success";
  if (rawStatus === "FAILED") return "error";
  return "processing";
}
