import type { APIRoute } from 'astro';
import { getDB, getBookingTimeline } from '../../../../lib/db';
import { checkAuth } from '../../../../lib/auth';

export const GET: APIRoute = async (context) => {
  const unauth = await checkAuth(context, { resource: 'bookings', level: 'read' });
  if (unauth) return unauth;

  const id = Number(context.params.id);
  if (isNaN(id)) {
    return Response.json({ error: 'Invalid id' }, { status: 400 });
  }

  const db = getDB(context.locals);
  const timeline = await getBookingTimeline(db, id);
  return Response.json(timeline);
};
