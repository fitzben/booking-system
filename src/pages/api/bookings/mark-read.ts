import type { APIRoute } from 'astro';
import { getDB, markBookingRead, isBookingRead, addTimelineEntry } from '../../../lib/db';
import { getAuthUser, checkAuth } from '../../../lib/auth';

export const POST: APIRoute = async (context) => {
  // checkAuth queries DB role_permissions — no static fallback needed
  const permError = await checkAuth(context, { resource: 'bookings', level: 'read' });
  if (permError) return permError;

  const user = await getAuthUser(context);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { booking_id } = await context.request.json() as { booking_id: number };
  if (!booking_id) return Response.json({ error: 'booking_id required' }, { status: 400 });

  const db = getDB(context.locals);
  const bookingId = Number(booking_id);

  const isFirstRead = !(await isBookingRead(db, bookingId, user.role));
  await markBookingRead(db, bookingId, user.role);

  if (isFirstRead) {
    addTimelineEntry(db, {
      booking_id:  bookingId,
      event_type:  'read',
      actor:       user.username,
      actor_role:  user.role,
      from_status: null,
      to_status:   null,
      note:        `Dibaca oleh ${user.username}`,
      metadata:    null,
    }).catch((e) => console.error('timeline error', e));
  }

  return Response.json({ ok: true });
};
