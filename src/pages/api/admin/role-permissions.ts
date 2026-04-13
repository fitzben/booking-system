import type { APIRoute } from 'astro';
import { getDB } from '../../../lib/db';
import { checkAuth, getAuthUser } from '../../../lib/auth';

// GET — ambil semua permissions + versi
// Public untuk semua admin (semua role butuh baca ini saat login)
export const GET: APIRoute = async ({ locals }) => {
  const db = getDB(locals);

  const { results } = await db
    .prepare('SELECT role, resource, level FROM role_permissions ORDER BY role, resource')
    .all<{ role: string; resource: string; level: string }>();

  const version = await db
    .prepare('SELECT version, updated_at FROM permission_version WHERE id = 1')
    .first<{ version: number; updated_at: string }>();

  // Format jadi nested object: { booking_admin: { bookings: 'write', ... }, ... }
  const permissions: Record<string, Record<string, string>> = {};
  for (const row of results) {
    if (!permissions[row.role]) permissions[row.role] = {};
    permissions[row.role][row.resource] = row.level;
  }

  return Response.json({
    permissions,
    version:    version?.version    ?? 1,
    updated_at: version?.updated_at ?? null,
  });
};

// PUT — update permissions (superadmin only)
export const PUT: APIRoute = async (context) => {
  const unauth = await checkAuth(context, { resource: 'users', level: 'write' });
  if (unauth) return unauth;

  const actor = await getAuthUser(context);
  if (actor?.role !== 'superadmin') {
    return Response.json({ error: 'Hanya superadmin yang dapat mengubah permissions' }, { status: 403 });
  }

  let body: { permissions: Record<string, Record<string, string>> };
  try {
    body = await context.request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const VALID_ROLES     = ['booking_admin', 'inventory_admin', 'manager'];
  const VALID_RESOURCES = ['bookings', 'rooms', 'inventory', 'users', 'reports', 'settings'];
  const VALID_LEVELS    = ['none', 'read', 'write'];

  const db = getDB(context.locals);

  for (const [role, resources] of Object.entries(body.permissions)) {
    if (role === 'superadmin') continue;
    if (!VALID_ROLES.includes(role)) continue;

    for (const [resource, level] of Object.entries(resources)) {
      if (!VALID_RESOURCES.includes(resource)) continue;
      if (!VALID_LEVELS.includes(level)) continue;

      await db.prepare(`
        INSERT INTO role_permissions (role, resource, level, updated_at, updated_by)
        VALUES (?, ?, ?, datetime('now'), ?)
        ON CONFLICT(role, resource)
        DO UPDATE SET level      = excluded.level,
                      updated_at = excluded.updated_at,
                      updated_by = excluded.updated_by
      `).bind(role, resource, level, actor!.username).run();
    }
  }

  // Increment permission_version → trigger auto logout semua user lain
  await db.prepare(`
    UPDATE permission_version
    SET version    = version + 1,
        updated_at = datetime('now'),
        updated_by = ?
    WHERE id = 1
  `).bind(actor!.username).run();

  const newVersion = await db
    .prepare('SELECT version FROM permission_version WHERE id = 1')
    .first<{ version: number }>();

  return Response.json({ ok: true, version: newVersion?.version });
};
