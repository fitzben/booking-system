import type { APIRoute } from "astro";
import { getDB, getRooms, createRoom, writeAuditLog } from "../../lib/db";
import { checkAuth, getAuthUser } from "../../lib/auth";

export const GET: APIRoute = async ({ locals }) => {
  const db = getDB(locals);
  const rooms = await getRooms(db);
  return Response.json(rooms);
};

export const POST: APIRoute = async (context) => {
  const unauth = await checkAuth(context, { resource: 'rooms', level: 'write' });
  if (unauth) return unauth;

  let body: Record<string, unknown>;
  try {
    body = await context.request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { name, type, notes } = body;
  if (!name || !type) {
    return Response.json({ error: "name dan type wajib diisi" }, { status: 400 });
  }

  // Helper: coerce a body value to string[] — accepts array or falls back to []
  function toStringArray(v: unknown): string[] {
    if (Array.isArray(v)) return (v as unknown[]).map(String);
    return [];
  }

  // Helper: coerce default_equipment array of { name, quantity } objects
  function toEquipmentArray(v: unknown): { name: string; quantity: number }[] {
    if (!Array.isArray(v)) return [];
    return (v as unknown[]).flatMap((item) => {
      if (typeof item === 'object' && item !== null && 'name' in item) {
        return [{ name: String((item as Record<string, unknown>).name), quantity: Number((item as Record<string, unknown>).quantity) || 1 }];
      }
      return [];
    });
  }

  const actor = await getAuthUser(context);
  const db = getDB(context.locals);

  const id = await createRoom(db, {
    name:                 String(name),
    type:                 String(type),
    base_price:           body.base_price != null && body.base_price !== '' ? Number(body.base_price) : null,
    notes:                notes ? String(notes) : null,
    cover_image:          body.cover_image ? String(body.cover_image) : null,
    images:               toStringArray(body.images),
    short_description:    body.short_description ? String(body.short_description) : null,
    capacity:             body.capacity ? String(body.capacity) : null,
    facilities:           toStringArray(body.facilities),
    equipment_highlights: toStringArray(body.equipment_highlights),
    default_equipment:    toEquipmentArray(body.default_equipment),
  });

  await db.prepare('UPDATE rooms SET created_by = ? WHERE id = ?').bind(actor?.username ?? null, id).run();

  writeAuditLog(db, {
    table_name: 'rooms',
    record_id:  id,
    action:     'create',
    actor:      actor?.username ?? 'unknown',
    actor_role: actor?.role    ?? 'unknown',
  }).catch((e) => console.error('audit log error', e));

  const room = await db.prepare("SELECT * FROM rooms WHERE id = ?").bind(id).first();
  return Response.json(room, { status: 201 });
};
