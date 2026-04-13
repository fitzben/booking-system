import type { APIRoute } from "astro";
import { checkAuth } from "../../../lib/auth";
import { getDB, deleteRoomMedia, setRoomMediaCover } from "../../../lib/db";

// DELETE /api/room-media/:id  — requires auth
export const DELETE: APIRoute = async (context) => {
  const unauth = await checkAuth(context);
  if (unauth) return unauth;

  const id = Number(context.params.id);
  if (isNaN(id)) return Response.json({ error: "Invalid id" }, { status: 400 });

  const db = getDB(context.locals);
  const existing = await db
    .prepare("SELECT id FROM room_media WHERE id = ?")
    .bind(id)
    .first();
  if (!existing) return Response.json({ error: "Not found" }, { status: 404 });

  await deleteRoomMedia(db, id);
  return new Response(null, { status: 204 });
};

// PUT /api/room-media/:id  — requires auth
// Body: { action: "set_cover", room_id: number }
export const PUT: APIRoute = async (context) => {
  const unauth = await checkAuth(context);
  if (unauth) return unauth;

  const id = Number(context.params.id);
  if (isNaN(id)) return Response.json({ error: "Invalid id" }, { status: 400 });

  let body: Record<string, unknown>;
  try {
    body = await context.request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.action !== "set_cover") {
    return Response.json({ error: "Unknown action" }, { status: 400 });
  }

  const room_id = Number(body.room_id);
  if (isNaN(room_id)) return Response.json({ error: "room_id required" }, { status: 400 });

  const db = getDB(context.locals);
  await setRoomMediaCover(db, room_id, id);
  return new Response(null, { status: 204 });
};
