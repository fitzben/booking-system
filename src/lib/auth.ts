import type { APIContext } from "astro";
import { getDB, getAdminUserByUsername } from "./db";
import { sha256hex } from "./crypto";
import type { AdminRole } from "./constants";
import { ROLE_PERMISSIONS } from "./constants";

type PermissionKey = 'bookings' | 'rooms' | 'inventory' | 'users' | 'reports' | 'settings';
type PermissionLevel = 'read' | 'write';

// Ambil permission dari DB, fallback ke constants jika tidak ada
async function getPermissionLevel(
  db: ReturnType<typeof getDB>,
  role: string,
  resource: PermissionKey,
): Promise<string> {
  // superadmin selalu locked full access — tidak query DB
  if (role === 'superadmin') return 'write';

  try {
    const row = await db
      .prepare('SELECT level FROM role_permissions WHERE role = ? AND resource = ?')
      .bind(role, resource)
      .first<{ level: string }>();

    if (row) return row.level;
  } catch {
    // DB tidak tersedia, fallback ke constants
  }

  // Fallback ke constants
  const staticPerms = ROLE_PERMISSIONS[role as AdminRole];
  return staticPerms?.[resource] ?? 'none';
}

export async function checkAuth(
  context: APIContext,
  permission?: { resource: PermissionKey; level: PermissionLevel },
): Promise<Response | null> {
  const username = context.request.headers.get("x-admin-username");
  const password = context.request.headers.get("x-admin-password");

  if (!username || !password) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDB(context.locals);
  const user = await getAdminUserByUsername(db, username);
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const hash = await sha256hex(password);
  if (hash !== user.password_hash) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!permission) return null;

  const resourcePerm = await getPermissionLevel(db, user.role, permission.resource);
  // 'write' includes 'read', 'none' means no access
  const hasAccess =
    resourcePerm === permission.level ||
    (permission.level === 'read' && resourcePerm === 'write');

  if (!hasAccess) {
    return Response.json({ error: "Forbidden — insufficient role" }, { status: 403 });
  }

  return null;
}

/** Helper: ambil user dari request (untuk dapat username/role di handler). */
export async function getAuthUser(context: APIContext) {
  const username = context.request.headers.get("x-admin-username");
  if (!username) return null;
  const db = getDB(context.locals);
  return getAdminUserByUsername(db, username);
}
