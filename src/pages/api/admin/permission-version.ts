import type { APIRoute } from 'astro';
import { getDB } from '../../../lib/db';

export const GET: APIRoute = async ({ locals }) => {
  const db = getDB(locals);
  const row = await db
    .prepare('SELECT version FROM permission_version WHERE id = 1')
    .first<{ version: number }>();
  return Response.json({ version: row?.version ?? 1 });
};
