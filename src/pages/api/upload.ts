import type { APIRoute } from "astro";
import { checkAuth } from "../../lib/auth";
import { uploadObject } from "../../lib/r2";
import type { Env } from "../../lib/r2";

const EXT_TO_MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  mp4: "video/mp4",
  mov: "video/quicktime",
  webm: "video/webm",
  pdf: "application/pdf",
};

export const POST: APIRoute = async (context) => {
  // Auth via admin_users table (same as all other admin endpoints)
  const unauth = await checkAuth(context);
  if (unauth) return unauth;

  // ── Parse multipart ───────────────────────────────────────────────────────
  let formData: FormData;
  try {
    formData = await context.request.formData();
  } catch {
    return Response.json({ error: "Invalid multipart/form-data" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return Response.json({ error: "Missing 'file' field" }, { status: 400 });
  }

  // ── Build object key ──────────────────────────────────────────────────────
  const rawFolder = formData.get("folder") as string | null;
  const safeFolder = rawFolder?.replace(/[^a-zA-Z0-9/_-]/g, "") || "misc";
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
  const contentType = file.type || EXT_TO_MIME[ext] || "application/octet-stream";
  const key = `${safeFolder}/${Date.now()}-${Math.random().toString(16).slice(2)}.${ext}`;

  // ── Upload to R2 ──────────────────────────────────────────────────────────
  const env = context.locals.runtime?.env as unknown as Env;

  try {
    const body = await file.arrayBuffer();
    const url = await uploadObject(env, key, contentType, body);
    return Response.json({ url, key, contentType });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed";
    return Response.json({ error: message }, { status: 502 });
  }
};
