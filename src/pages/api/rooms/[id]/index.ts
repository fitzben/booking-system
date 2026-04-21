import type { APIRoute } from "astro";
import { getDB, updateRoom, deleteRoom, getRoomById, buildChanges, writeAuditLog } from "../../../../lib/db";
import { checkAuth, getAuthUser } from "../../../../lib/auth";

export const PUT: APIRoute = async (context) => {
  const unauth = await checkAuth(context, { resource: 'rooms', level: 'write' });
  if (unauth) return unauth;

  const id = Number(context.params.id);
  if (isNaN(id)) return Response.json({ error: "Invalid id" }, { status: 400 });

  let body: Record<string, unknown>;
  try {
    body = await context.request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
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

  // Fetch existing for change tracking
  const existing = await getRoomById(db, id);
  if (!existing) return Response.json({ error: "Not found" }, { status: 404 });

  const data: Record<string, unknown> = {};

  // Scalar fields
  if (body.name !== undefined)              data.name              = String(body.name);
  if (body.type !== undefined)              data.type              = String(body.type);
  if (body.base_price !== undefined)        data.base_price        = body.base_price != null && body.base_price !== '' ? Number(body.base_price) : null;
  if (body.overtime_rate !== undefined)     data.overtime_rate     = Number(body.overtime_rate);
  if (body.notes !== undefined)             data.notes             = body.notes ? String(body.notes) : null;
  if (body.cover_image !== undefined)       data.cover_image       = body.cover_image ? String(body.cover_image) : null;
  if (body.short_description !== undefined) data.short_description = body.short_description ? String(body.short_description) : null;
  if (body.capacity !== undefined)          data.capacity          = body.capacity ? String(body.capacity) : null;

  // Array fields — pass as arrays; updateRoom serializes them
  if (body.images !== undefined)               data.images               = toStringArray(body.images);
  if (body.facilities !== undefined)           data.facilities           = toStringArray(body.facilities);
  if (body.equipment_highlights !== undefined) data.equipment_highlights = toStringArray(body.equipment_highlights);
  if (body.default_equipment !== undefined)    data.default_equipment    = toEquipmentArray(body.default_equipment);

  // Stamp updated_by
  data.updated_by = actor?.username ?? null;

  await updateRoom(db, id, data);

  writeAuditLog(db, {
    table_name: 'rooms',
    record_id:  id,
    action:     'update',
    actor:      actor?.username ?? 'unknown',
    actor_role: actor?.role    ?? 'unknown',
    changes:    buildChanges(existing as unknown as Record<string, unknown>, body),
  }).catch((e) => console.error('audit log error', e));

  const room = await getRoomById(db, id);
  if (!room) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(room);
};

export const DELETE: APIRoute = async (context) => {
  const unauth = await checkAuth(context, { resource: 'rooms', level: 'write' });
  if (unauth) return unauth;

  const id = Number(context.params.id);
  if (isNaN(id)) return Response.json({ error: "Invalid id" }, { status: 400 });

  const actor = await getAuthUser(context);
  const db = getDB(context.locals);

  const existing = await db.prepare("SELECT id FROM rooms WHERE id = ?").bind(id).first();
  if (!existing) return Response.json({ error: "Not found" }, { status: 404 });

  // Stamp deleted_by / deleted_at before hard delete
  await db
    .prepare("UPDATE rooms SET deleted_by = ?, deleted_at = datetime('now') WHERE id = ?")
    .bind(actor?.username ?? null, id)
    .run();

  writeAuditLog(db, {
    table_name: 'rooms',
    record_id:  id,
    action:     'delete',
    actor:      actor?.username ?? 'unknown',
    actor_role: actor?.role    ?? 'unknown',
  }).catch((e) => console.error('audit log error', e));

  await deleteRoom(db, id);
  return new Response(null, { status: 204 });
};
