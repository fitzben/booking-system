import type { APIRoute } from "astro";
import { getDB, getAdminUserByUsername } from "../../../lib/db";
import { sha256hex } from "../../../lib/crypto";
import { makeSessionCookie, SESSION_MAX_AGE } from "../../../lib/auth";

export const POST: APIRoute = async (context) => {
  let body: Record<string, unknown>;
  try {
    body = await context.request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { username, password } = body;
  if (!username || !password) {
    return Response.json(
      { error: "username dan password wajib diisi" },
      { status: 400 },
    );
  }

  const db = getDB(context.locals);
  const user = await getAdminUserByUsername(db, String(username));
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const hash = await sha256hex(String(password));
  if (hash !== user.password_hash) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Buat session token
  const token = crypto.randomUUID();
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_MAX_AGE;

  // Simpan ke D1 dan hapus session lama milik user ini sekaligus
  await db.batch([
    db.prepare('DELETE FROM sessions WHERE username = ?').bind(user.username),
    db
      .prepare('INSERT INTO sessions (token, username, expires_at) VALUES (?, ?, ?)')
      .bind(token, user.username, expiresAt),
  ]);

  return Response.json(
    { ok: true, username: user.username, role: user.role },
    {
      status: 200,
      headers: { 'Set-Cookie': makeSessionCookie(token) },
    },
  );
};
