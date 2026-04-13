import type { APIRoute } from "astro";
import { checkAuth } from "../../lib/auth";
import { getDB, getRoomMedia, addRoomMedia } from "../../lib/db";

// GET /api/room-media?room_id=X  — public, no auth
export const GET: APIRoute = async (context) => {
  const roomId = Number(context.url.searchParams.get("room_id"));
  if (isNaN(roomId) || roomId <= 0) {
    return Response.json({ error: "Missing or invalid room_id" }, { status: 400 });
  }
  const db = getDB(context.locals);
  const media = await getRoomMedia(db, roomId);
  return Response.json(media);
};

// POST /api/room-media  — requires auth
export const POST: APIRoute = async (context) => {
  const unauth = await checkAuth(context);
  if (unauth) return unauth;

  let body: Record<string, unknown>;
  try {
    body = await context.request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const room_id = Number(body.room_id);
  const url = String(body.url ?? "").trim();
  const type = String(body.type ?? "image") === "video" ? "video" : "image";
  const is_cover = body.is_cover ? 1 : 0;
  const sort_order = Number(body.sort_order ?? 0);

  if (!room_id || isNaN(room_id)) {
    return Response.json({ error: "room_id is required" }, { status: 400 });
  }
  if (!url) {
    return Response.json({ error: "url is required" }, { status: 400 });
  }

  const db = getDB(context.locals);
  const id = await addRoomMedia(db, { room_id, url, type, is_cover, sort_order });
  const [item] = await (async () => {
    const { results } = await db
      .prepare("SELECT * FROM room_media WHERE id = ?")
      .bind(id)
      .all();
    return results;
  })();
  return Response.json(item, { status: 201 });
};
