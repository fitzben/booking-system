import type { APIRoute } from 'astro';
import { getDB, getInventory, getInventoryById, createInventoryItem, writeAuditLog } from '../../lib/db';
import { checkAuth, getAuthUser } from '../../lib/auth';

export const GET: APIRoute = async ({ locals }) => {
  const db = getDB(locals);
  const items = await getInventory(db);
  return Response.json(items);
};

export const POST: APIRoute = async (context) => {
  const unauth = await checkAuth(context, { resource: 'inventory', level: 'write' });
  if (unauth) return unauth;

  let body: Record<string, unknown>;
  try {
    body = await context.request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { name, category, quantity_total } = body;
  if (!name || !category || quantity_total === undefined || quantity_total === '') {
    return Response.json(
      { error: 'name, category, dan quantity_total wajib diisi' },
      { status: 400 },
    );
  }

  const actor = await getAuthUser(context);
  const db = getDB(context.locals);

  const id = await createInventoryItem(db, {
    name:             String(name),
    category:         String(category),
    code:             body.code ? String(body.code) : null,
    brand:            body.brand ? String(body.brand) : null,
    model:            body.model ? String(body.model) : null,
    default_room_id:  body.default_room_id != null ? Number(body.default_room_id) : null,
    is_fixed:         body.is_fixed ? 1 : 0,
    quantity_total:   Number(quantity_total),
    quantity_damaged: Number(body.quantity_damaged ?? 0),
    quantity_in_use:  Number(body.quantity_in_use ?? 0),
    notes:            body.notes ? String(body.notes) : null,
    photo_url:        body.photo_url ? String(body.photo_url) : null,
    photo_key:        body.photo_key ? String(body.photo_key) : null,
    service_date:     body.service_date ? String(body.service_date) : null,
    warranty_date:    body.warranty_date ? String(body.warranty_date) : null,
  });

  await db.prepare('UPDATE inventory SET created_by = ? WHERE id = ?').bind(actor?.username ?? null, id).run();

  writeAuditLog(db, {
    table_name: 'inventory',
    record_id:  id,
    action:     'create',
    actor:      actor?.username ?? 'unknown',
    actor_role: actor?.role    ?? 'unknown',
  }).catch((e) => console.error('audit log error', e));

  const item = await getInventoryById(db, id);
  return Response.json(item, { status: 201 });
};
