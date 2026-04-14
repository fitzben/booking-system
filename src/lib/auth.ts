import type { APIContext } from "astro";
import { getDB, getAdminUserByUsername } from "./db";
import type { AdminRole } from "./constants";
import { ROLE_PERMISSIONS } from "./constants";

type PermissionKey = 'bookings' | 'rooms' | 'inventory' | 'users' | 'reports' | 'settings';
type PermissionLevel = 'read' | 'write';

export const SESSION_COOKIE = 'admin_session';
export const SESSION_MAX_AGE = 8 * 60 * 60; // 8 jam dalam detik

/** Parse satu nilai dari Cookie header. */
function parseCookie(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}

/** Buat Set-Cookie header untuk session token. */
export function makeSessionCookie(token: string, maxAge = SESSION_MAX_AGE): string {
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${maxAge}`;
}

/** Set-Cookie header untuk menghapus session (expired). */
export function clearSessionCookie(): string {
  return `${SESSION_COOKIE}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`;
}

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
  const cookieHeader = context.request.headers.get('cookie');
  const token = parseCookie(cookieHeader, SESSION_COOKIE);

  if (!token) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = getDB(context.locals);

  // Cari session di DB
  const session = await db
    .prepare('SELECT username, expires_at FROM sessions WHERE token = ?')
    .bind(token)
    .first<{ username: string; expires_at: number }>();

  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Cek expiry
  if (Math.floor(Date.now() / 1000) > session.expires_at) {
    // Hapus session kedaluwarsa
    db.prepare('DELETE FROM sessions WHERE token = ?').bind(token).run().catch(() => undefined);
    return Response.json({ error: 'Session expired' }, { status: 401 });
  }

  // Pastikan user masih ada di DB
  const user = await getAdminUserByUsername(db, session.username);
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!permission) return null;

  const resourcePerm = await getPermissionLevel(db, user.role, permission.resource);
  const hasAccess =
    resourcePerm === permission.level ||
    (permission.level === 'read' && resourcePerm === 'write');

  if (!hasAccess) {
    return Response.json({ error: 'Forbidden — insufficient role' }, { status: 403 });
  }

  return null;
}

/** Ambil user yang sedang login dari session cookie. */
export async function getAuthUser(context: APIContext) {
  const cookieHeader = context.request.headers.get('cookie');
  const token = parseCookie(cookieHeader, SESSION_COOKIE);
  if (!token) return null;

  const db = getDB(context.locals);

  const session = await db
    .prepare('SELECT username, expires_at FROM sessions WHERE token = ?')
    .bind(token)
    .first<{ username: string; expires_at: number }>();

  if (!session || Math.floor(Date.now() / 1000) > session.expires_at) return null;

  return getAdminUserByUsername(db, session.username);
}
