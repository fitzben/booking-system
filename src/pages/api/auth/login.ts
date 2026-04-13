import type { APIRoute } from "astro";
import { getDB, getAdminUserByUsername } from "../../../lib/db";
import { sha256hex } from "../../../lib/crypto";

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

  return Response.json({ ok: true, username: user.username });
};
