import type { APIRoute } from "astro";
import { getDB, getAdminUsers, createAdminUser, writeAuditLog } from "../../lib/db";
import { checkAuth, getAuthUser } from "../../lib/auth";
import { sha256hex } from "../../lib/crypto";

export const GET: APIRoute = async (context) => {
  const unauth = await checkAuth(context, { resource: 'users', level: 'write' });
  if (unauth) return unauth;

  const db = getDB(context.locals);
  const users = await getAdminUsers(db);
  return Response.json(users);
};

export const POST: APIRoute = async (context) => {
  const unauth = await checkAuth(context, { resource: 'users', level: 'write' });
  if (unauth) return unauth;

  let body: Record<string, unknown>;
  try {
    body = await context.request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { username, password, role } = body;
  if (!username || typeof username !== "string" || !username.trim()) {
    return Response.json({ error: "username wajib diisi" }, { status: 400 });
  }
  if (!password || typeof password !== "string" || password.length < 6) {
    return Response.json(
      { error: "password minimal 6 karakter" },
      { status: 400 },
    );
  }

  const VALID_ROLES = ['superadmin', 'booking_admin', 'inventory_admin', 'manager'];
  if (!role || !VALID_ROLES.includes(String(role))) {
    return Response.json({ error: "Role tidak valid" }, { status: 400 });
  }

  const db = getDB(context.locals);

  const existing = await db
    .prepare("SELECT id FROM admin_users WHERE username = ?")
    .bind(username.trim())
    .first();
  if (existing) {
    return Response.json({ error: "Username sudah digunakan" }, { status: 409 });
  }

  const actor = await getAuthUser(context);
  const hash = await sha256hex(password);
  const id = await createAdminUser(db, {
    username: username.trim(),
    password_hash: hash,
    role: String(role) as import("../../lib/constants").AdminRole,
  });

  writeAuditLog(db, {
    table_name: 'admin_users',
    record_id:  id,
    action:     'create',
    actor:      actor?.username ?? 'unknown',
    actor_role: actor?.role    ?? 'unknown',
  }).catch((e) => console.error('audit log error', e));

  const newUser = await db
    .prepare("SELECT id, username, role, created_at FROM admin_users WHERE id = ?")
    .bind(id)
    .first();
  return Response.json(newUser, { status: 201 });
};
