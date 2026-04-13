import type { APIRoute } from 'astro';
import { getDB, writeAuditLog } from '../../../lib/db';
import { checkAuth, getAuthUser } from '../../../lib/auth';

export const DELETE: APIRoute = async (context) => {
  const unauth = await checkAuth(context, { resource: 'rooms', level: 'write' });
  if (unauth) return unauth;

  let body: { ids: number[] };
  try {
    body = await context.request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { ids } = body;
  if (!Array.isArray(ids) || ids.length === 0) {
    return Response.json({ error: 'ids array wajib diisi' }, { status: 400 });
  }
  if (ids.length > 100) {
    return Response.json({ error: 'Maksimal 100 item per operasi' }, { status: 400 });
  }

  const actor = await getAuthUser(context);
  const db = getDB(context.locals);
  const placeholders = ids.map(() => '?').join(',');

  // Stamp deleted_by / deleted_at before hard delete
  await db
    .prepare(`UPDATE rooms SET deleted_by = ?, deleted_at = datetime('now') WHERE id IN (${placeholders})`)
    .bind(actor?.username ?? null, ...ids)
    .run();

  await db
    .prepare(`DELETE FROM rooms WHERE id IN (${placeholders})`)
    .bind(...ids)
    .run();

  Promise.all(
    ids.map((id) =>
      writeAuditLog(db, {
        table_name: 'rooms',
        record_id:  id,
        action:     'bulk_delete',
        actor:      actor?.username ?? 'unknown',
        actor_role: actor?.role    ?? 'unknown',
      }),
    ),
  ).catch((e) => console.error('audit log error', e));

  return Response.json({ deleted: ids.length });
};
