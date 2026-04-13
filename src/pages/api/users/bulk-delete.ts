import type { APIRoute } from 'astro';
import { getDB, writeAuditLog } from '../../../lib/db';
import { checkAuth, getAuthUser } from '../../../lib/auth';

export const DELETE: APIRoute = async (context) => {
  const unauth = await checkAuth(context, { resource: 'users', level: 'write' });
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

  const db = getDB(context.locals);
  const placeholders = ids.map(() => '?').join(',');

  // Guard: cegah self-delete
  const authUser = await getAuthUser(context);
  if (!authUser) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (ids.includes(authUser.id)) {
    return Response.json({ error: 'Tidak bisa menghapus akun sendiri' }, { status: 400 });
  }

  // Guard: cegah hapus semua user
  const remaining = await db
    .prepare(`SELECT COUNT(*) as count FROM admin_users WHERE id NOT IN (${placeholders})`)
    .bind(...ids)
    .first<{ count: number }>();
  if ((remaining?.count ?? 0) === 0) {
    return Response.json({ error: 'Tidak bisa menghapus semua pengguna' }, { status: 400 });
  }

  await db
    .prepare(`DELETE FROM admin_users WHERE id IN (${placeholders})`)
    .bind(...ids)
    .run();

  Promise.all(
    ids.map((id) =>
      writeAuditLog(db, {
        table_name: 'admin_users',
        record_id:  id,
        action:     'bulk_delete',
        actor:      authUser.username,
        actor_role: authUser.role,
      }),
    ),
  ).catch((e) => console.error('audit log error', e));

  return Response.json({ deleted: ids.length });
};
