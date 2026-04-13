import type { APIRoute } from 'astro';
import { getDB, getInventoryById, updateInventoryItem, deleteInventoryItem, buildChanges, writeAuditLog } from '../../../lib/db';
import { checkAuth, getAuthUser } from '../../../lib/auth';

export const PUT: APIRoute = async (context) => {
  const unauth = await checkAuth(context, { resource: 'inventory', level: 'write' });
  if (unauth) return unauth;

  const id = Number(context.params.id);
  if (isNaN(id)) return Response.json({ error: 'Invalid id' }, { status: 400 });

  let body: Record<string, unknown>;
  try {
    body = await context.request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const actor = await getAuthUser(context);
  const db = getDB(context.locals);

  // Fetch existing for change tracking
  const existing = await getInventoryById(db, id);
  if (!existing) return Response.json({ error: 'Not found' }, { status: 404 });

  const data: Record<string, unknown> = {};

  if (body.name !== undefined)             data.name             = String(body.name);
  if (body.category !== undefined)         data.category         = String(body.category);
  if (body.code !== undefined)             data.code             = body.code ? String(body.code) : null;
  if (body.brand !== undefined)            data.brand            = body.brand ? String(body.brand) : null;
  if (body.model !== undefined)            data.model            = body.model ? String(body.model) : null;
  if (body.default_room_id !== undefined)  data.default_room_id  = body.default_room_id != null ? Number(body.default_room_id) : null;
  if (body.is_fixed !== undefined)         data.is_fixed         = body.is_fixed ? 1 : 0;
  if (body.quantity_total !== undefined)   data.quantity_total   = Number(body.quantity_total);
  if (body.quantity_damaged !== undefined) data.quantity_damaged = Number(body.quantity_damaged);
  if (body.quantity_in_use !== undefined)  data.quantity_in_use  = Number(body.quantity_in_use);
  if (body.notes !== undefined)            data.notes            = body.notes ? String(body.notes) : null;
  if (body.photo_url !== undefined)        data.photo_url        = body.photo_url ? String(body.photo_url) : null;
  if (body.photo_key !== undefined)        data.photo_key        = body.photo_key ? String(body.photo_key) : null;
  if (body.service_date !== undefined)     data.service_date     = body.service_date ? String(body.service_date) : null;
  if (body.warranty_date !== undefined)    data.warranty_date    = body.warranty_date ? String(body.warranty_date) : null;

  // Stamp updated_by
  data.updated_by = actor?.username ?? null;

  await updateInventoryItem(db, id, data);

  writeAuditLog(db, {
    table_name: 'inventory',
    record_id:  id,
    action:     'update',
    actor:      actor?.username ?? 'unknown',
    actor_role: actor?.role    ?? 'unknown',
    changes:    buildChanges(existing as unknown as Record<string, unknown>, body),
  }).catch((e) => console.error('audit log error', e));

  const item = await getInventoryById(db, id);
  if (!item) return Response.json({ error: 'Not found' }, { status: 404 });
  return Response.json(item);
};

export const DELETE: APIRoute = async (context) => {
  const unauth = await checkAuth(context, { resource: 'inventory', level: 'write' });
  if (unauth) return unauth;

  const id = Number(context.params.id);
  if (isNaN(id)) return Response.json({ error: 'Invalid id' }, { status: 400 });

  const actor = await getAuthUser(context);
  const db = getDB(context.locals);

  const existing = await db.prepare('SELECT id FROM inventory WHERE id = ?').bind(id).first();
  if (!existing) return Response.json({ error: 'Not found' }, { status: 404 });

  // Stamp deleted_by / deleted_at before hard delete
  await db
    .prepare("UPDATE inventory SET deleted_by = ?, deleted_at = datetime('now') WHERE id = ?")
    .bind(actor?.username ?? null, id)
    .run();

  writeAuditLog(db, {
    table_name: 'inventory',
    record_id:  id,
    action:     'delete',
    actor:      actor?.username ?? 'unknown',
    actor_role: actor?.role    ?? 'unknown',
  }).catch((e) => console.error('audit log error', e));

  await deleteInventoryItem(db, id);
  return new Response(null, { status: 204 });
};
