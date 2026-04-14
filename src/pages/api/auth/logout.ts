import type { APIRoute } from "astro";
import { getDB } from "../../../lib/db";
import { SESSION_COOKIE, clearSessionCookie } from "../../../lib/auth";

export const POST: APIRoute = async (context) => {
  const cookieHeader = context.request.headers.get('cookie');
  if (cookieHeader) {
    const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([^;]+)`));
    if (match) {
      const token = decodeURIComponent(match[1]);
      const db = getDB(context.locals);
      db.prepare('DELETE FROM sessions WHERE token = ?').bind(token).run().catch(() => undefined);
    }
  }

  return Response.json(
    { ok: true },
    { headers: { 'Set-Cookie': clearSessionCookie() } },
  );
};
