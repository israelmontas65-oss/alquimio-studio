// functions/api/publicar/threads.ts
// Publicación real vía Threads API (graph.threads.net) — flujo de contenedores,
// igual de estructura a Instagram pero en un host y con scopes distintos.
// Requiere Tech Provider Verification aprobada (ver comentario en oauth/threads.ts).

import { getSession } from "../../shared/session-store";

interface Env {
  SESSIONS: KVNamespace;
  SESSION_SECRET: string;
}

interface PublishBody {
  mediaUrl: string;
  caption: string;
  mediaType: "IMAGE" | "VIDEO";
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const body = await request.json<PublishBody>();

  const session = await getSession(env, "threads");
  if (!session) {
    return Response.json({ message: "threads_not_connected" }, { status: 401 });
  }

  const userId = session.profile?.userId;
  if (!userId) {
    return Response.json({ platform: "threads", status: "error", errorMessage: "missing_threads_user_id" }, { status: 400 });
  }

  try {
    const containerRes = await fetch(`https://graph.threads.net/v1.0/${userId}/threads`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        media_type: body.mediaType === "VIDEO" ? "VIDEO" : "IMAGE",
        [body.mediaType === "VIDEO" ? "video_url" : "image_url"]: body.mediaUrl,
        text: body.caption,
        access_token: session.accessToken,
      }),
    });
    const containerData = await containerRes.json<{ id?: string; error?: any }>();
    if (!containerData.id) {
      return Response.json(
        { platform: "threads", status: "error", errorMessage: containerData.error?.message || "container_failed" },
        { status: 502 }
      );
    }

    const publishRes = await fetch(`https://graph.threads.net/v1.0/${userId}/threads_publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ creation_id: containerData.id, access_token: session.accessToken }),
    });
    const publishData = await publishRes.json<{ id?: string; error?: any }>();

    return Response.json(
      publishData.id
        ? { platform: "threads", status: "success", postId: publishData.id }
        : { platform: "threads", status: "error", errorMessage: publishData.error?.message || "publish_failed" }
    );
  } catch (err: any) {
    return Response.json({ platform: "threads", status: "error", errorMessage: err.message }, { status: 500 });
  }
};
