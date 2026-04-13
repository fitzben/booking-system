import type { APIRoute } from "astro";
import { getDB } from "../../lib/db";
import { checkAuth } from "../../lib/auth";

export const GET: APIRoute = async ({ request, locals }) => {
  const db = getDB(locals);
  const key = new URL(request.url).searchParams.get("key");

  if (key) {
    const row = await db
      .prepare("SELECT value FROM settings WHERE key = ?")
      .bind(key)
      .first<{ value: string }>();
    return Response.json({ key, value: row?.value ?? null });
  }

  const { results } = await db
    .prepare("SELECT key, value FROM settings")
    .all<{ key: string; value: string }>();
  return Response.json(Object.fromEntries(results.map((r) => [r.key, r.value])));
};

export const PUT: APIRoute = async (context) => {
  const unauth = await checkAuth(context);
  if (unauth) return unauth;

  let body: { key: string; value: string };
  try {
    body = await context.request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { key, value } = body;
  if (!key || typeof value !== "string") {
    return Response.json({ error: "key and value are required" }, { status: 400 });
  }

  const db = getDB(context.locals);
  await db
    .prepare(
      `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    )
    .bind(key, value)
    .run();

  return Response.json({ key, value });
};
