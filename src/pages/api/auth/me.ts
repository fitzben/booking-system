import type { APIRoute } from 'astro';
import { getAuthUser } from '../../../lib/auth';
import { getDB } from '../../../lib/db';

const SUPERADMIN_PERMISSIONS: Record<string, string> = {
  bookings:  'write',
  rooms:     'write',
  inventory: 'write',
  users:     'write',
  reports:   'read',
  settings:  'write',
};

export const GET: APIRoute = async (context) => {
  const user = await getAuthUser(context);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  if (user.role === 'superadmin') {
    return Response.json({
      username: user.username,
      role: user.role,
      permissions: SUPERADMIN_PERMISSIONS,
    });
  }

  const db = getDB(context.locals);
  const result = await db
    .prepare('SELECT resource, level FROM role_permissions WHERE role = ?')
    .bind(user.role)
    .all<{ resource: string; level: string }>();

  const permissions: Record<string, string> = {};
  for (const row of result.results) {
    permissions[row.resource] = row.level;
  }

  return Response.json({ username: user.username, role: user.role, permissions });
};
