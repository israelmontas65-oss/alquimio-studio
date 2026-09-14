// functions/api/oauth/session.ts
// GET    -> devuelve el estado de conexión de las 4 plataformas (nunca los tokens)
// DELETE -> revoca la sesión de una plataforma (?platform=meta|tiktok|youtube|threads)

import { getAllSessionsStatus, deleteSession } from "../../shared/session-store";

interface Env {
  SESSIONS: KVNamespace;
  SESSION_SECRET: string;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const status = await getAllSessionsStatus(context.env);
  return Response.json(status);
};

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const platform = url.searchParams.get("platform");
  if (!platform) {
    return Response.json({ error: "missing_platform" }, { status: 400 });
  }
  await deleteSession(context.env, platform);
  return Response.json({ platform, connected: false });
};
