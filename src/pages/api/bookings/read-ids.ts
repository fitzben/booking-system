import type { APIRoute } from 'astro';
import { getDB, getReadBookingIds } from '../../../lib/db';
import { getAuthUser } from '../../../lib/auth';

export const GET: APIRoute = async (context) => {
  const user = await getAuthUser(context);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const db = getDB(context.locals);
  const ids = await getReadBookingIds(db, user.role);
  return Response.json(ids);
};
