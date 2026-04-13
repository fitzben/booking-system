import type { APIRoute } from "astro";
import {
  getDB,
  updateAdminUserPassword,
  updateAdminUserRole,
  deleteAdminUser,
  countAdminUsers,
  writeAuditLog,
} from "../../../lib/db";
import { checkAuth, getAuthUser } from "../../../lib/auth";
import { sha256hex } from "../../../lib/crypto";
import type { AdminRole } from "../../../lib/constants";

export const PUT: APIRoute = async (context) => {
  const unauth = await checkAuth(context, { resource: 'users', level: 'write' });
  if (unauth) return unauth;

  const id = Number(context.params.id);
  if (isNaN(id)) return Response.json({ error: "Invalid id" }, { status: 400 });

  let body: Record<string, unknown>;
  try {
    body = await context.request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const actor = await getAuthUser(context);
  const db = getDB(context.locals);

  const existing = await db
    .prepare("SELECT id FROM admin_users WHERE id = ?")
    .bind(id)
    .first();
  if (!existing) return Response.json({ error: "Not found" }, { status: 404 });

  // Role update (no password provided)
  if (body.role && !body.password) {
    const VALID_ROLES = ['superadmin', 'booking_admin', 'inventory_admin', 'manager'];
    if (!VALID_ROLES.includes(String(body.role))) {
      return Response.json({ error: "Role tidak valid" }, { status: 400 });
    }
    await updateAdminUserRole(db, id, String(body.role) as AdminRole);

    writeAuditLog(db, {
      table_name: 'admin_users',
      record_id:  id,
      action:     'update',
      actor:      actor?.username ?? 'unknown',
      actor_role: actor?.role    ?? 'unknown',
      changes:    { role: [null, body.role] },
    }).catch((e) => console.error('audit log error', e));

    const updated = await db
      .prepare("SELECT id, username, role, created_at FROM admin_users WHERE id = ?")
      .bind(id)
      .first();
    return Response.json(updated);
  }

  // Password update
  const { password } = body;
  if (!password || typeof password !== "string" || password.length < 6) {
    return Response.json(
      { error: "password minimal 6 karakter" },
      { status: 400 },
    );
  }

  const hash = await sha256hex(password);
  await updateAdminUserPassword(db, id, hash);

  writeAuditLog(db, {
    table_name: 'admin_users',
    record_id:  id,
    action:     'update',
    actor:      actor?.username ?? 'unknown',
    actor_role: actor?.role    ?? 'unknown',
    changes:    { password_hash: ['[redacted]', '[redacted]'] },
  }).catch((e) => console.error('audit log error', e));

  const updated = await db
    .prepare("SELECT id, username, role, created_at FROM admin_users WHERE id = ?")
    .bind(id)
    .first();
  return Response.json(updated);
};

export const DELETE: APIRoute = async (context) => {
  const unauth = await checkAuth(context, { resource: 'users', level: 'write' });
  if (unauth) return unauth;

  const id = Number(context.params.id);
  if (isNaN(id)) return Response.json({ error: "Invalid id" }, { status: 400 });

  const actor = await getAuthUser(context);
  const db = getDB(context.locals);

  // Cannot delete the last user
  const count = await countAdminUsers(db);
  if (count <= 1) {
    return Response.json(
      { error: "Tidak bisa menghapus user terakhir" },
      { status: 400 },
    );
  }

  // Cannot delete self
  const selfUsername = context.request.headers.get("x-admin-username");
  const target = await db
    .prepare("SELECT id, username FROM admin_users WHERE id = ?")
    .bind(id)
    .first<{ id: number; username: string }>();
  if (!target) return Response.json({ error: "Not found" }, { status: 404 });

  if (target.username === selfUsername) {
    return Response.json(
      { error: "Tidak bisa menghapus akun sendiri" },
      { status: 400 },
    );
  }

  writeAuditLog(db, {
    table_name: 'admin_users',
    record_id:  id,
    action:     'delete',
    actor:      actor?.username ?? 'unknown',
    actor_role: actor?.role    ?? 'unknown',
  }).catch((e) => console.error('audit log error', e));

  await deleteAdminUser(db, id);
  return new Response(null, { status: 204 });
};
