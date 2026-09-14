// functions/api/publicar/meta.ts
// Publicación real en Instagram (contenedores de dos pasos) y Facebook Page.
// El token nunca sale de este archivo hacia el frontend.

import { getSession } from "../../shared/session-store";

interface Env {
  SESSIONS: KVNamespace;
  SESSION_SECRET: string;
}

const GRAPH_VERSION = "v21.0";

interface PublishBody {
  mediaUrl: string;
  caption: string;
  mediaType: "IMAGE" | "REELS" | "STORIES" | "CAROUSEL";
  targets: Array<"instagram" | "facebook_page">;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const body = await request.json<PublishBody>();

  const session = await getSession(env, "meta");
  if (!session) {
    return Response.json({ message: "meta_not_connected" }, { status: 401 });
  }

  const pages: any[] = session.profile?.pages ?? [];
  const results = [];

  for (const target of body.targets) {
    if (target === "instagram") {
      results.push(await publishToInstagram(session.accessToken, pages, body));
    }
    if (target === "facebook_page") {
      results.push(await publishToFacebookPage(pages, body));
    }
  }

  return Response.json(results);
};

async function publishToInstagram(accessToken: string, pages: any[], body: PublishBody) {
  const igAccountId = pages.find((p) => p.instagram_business_account)?.instagram_business_account?.id;
  if (!igAccountId) {
    return { platform: "meta", target: "instagram", status: "error", errorMessage: "no_instagram_business_account" };
  }

  try {
    // Verificar el límite de publicación EN TIEMPO REAL antes de intentar (no asumir 50 ni 100 fijo)
    const limitRes = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/${igAccountId}?fields=content_publishing_limit&access_token=${accessToken}`
    );
    const limitData = await limitRes.json<{
      content_publishing_limit?: { config?: { quota_total: number; quota_usage: number } };
    }>();
    const quota = limitData.content_publishing_limit?.config;
    if (quota && quota.quota_usage >= quota.quota_total) {
      return { platform: "meta", target: "instagram", status: "error", errorMessage: "publishing_limit_reached" };
    }

    // Paso 1: crear el contenedor
    const containerRes = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${igAccountId}/media`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        [body.mediaType === "IMAGE" ? "image_url" : "video_url"]: body.mediaUrl,
        caption: body.caption,
        media_type: body.mediaType,
        access_token: accessToken,
      }),
    });
    const containerData = await containerRes.json<{ id?: string; error?: any }>();
    if (!containerData.id) {
      return {
        platform: "meta",
        target: "instagram",
        status: "error",
        errorMessage: containerData.error?.message || "container_failed",
      };
    }

    // Paso 2: publicar el contenedor
    const publishRes = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${igAccountId}/media_publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ creation_id: containerData.id, access_token: accessToken }),
    });
    const publishData = await publishRes.json<{ id?: string; error?: any }>();

    return publishData.id
      ? { platform: "meta", target: "instagram", status: "success", postId: publishData.id }
      : { platform: "meta", target: "instagram", status: "error", errorMessage: publishData.error?.message || "publish_failed" };
  } catch (err: any) {
    return { platform: "meta", target: "instagram", status: "error", errorMessage: err.message };
  }
}

async function publishToFacebookPage(pages: any[], body: PublishBody) {
  const page = pages[0];
  if (!page) {
    return { platform: "meta", target: "facebook_page", status: "error", errorMessage: "no_facebook_page" };
  }

  try {
    const endpoint = body.mediaType === "IMAGE" ? "photos" : "videos";
    const fieldName = body.mediaType === "IMAGE" ? "url" : "file_url";

    const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${page.id}/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        [fieldName]: body.mediaUrl,
        caption: body.caption,
        access_token: page.access_token, // el token de la Página, no el token de usuario
      }),
    });
    const data = await res.json<{ id?: string; post_id?: string; error?: any }>();

    return data.id || data.post_id
      ? { platform: "meta", target: "facebook_page", status: "success", postId: data.post_id || data.id }
      : { platform: "meta", target: "facebook_page", status: "error", errorMessage: data.error?.message || "publish_failed" };
  } catch (err: any) {
    return { platform: "meta", target: "facebook_page", status: "error", errorMessage: err.message };
  }
}
