import type { APIRoute } from 'astro';
import { getDB, markBookingContacted, addTimelineEntry } from '../../../lib/db';
import { checkAuth, getAuthUser } from '../../../lib/auth';

export const POST: APIRoute = async (context) => {
  const unauth = await checkAuth(context, { resource: 'bookings', level: 'write' });
  if (unauth) return unauth;

  const user = await getAuthUser(context);
  const { booking_id } = await context.request.json() as { booking_id: number };
  if (!booking_id) return Response.json({ error: 'booking_id required' }, { status: 400 });

  const db = getDB(context.locals);

  const existing = await db
    .prepare('SELECT status FROM bookings WHERE id = ?')
    .bind(Number(booking_id))
    .first<{ status: string }>();

  await markBookingContacted(db, Number(booking_id), user!.username);

  await addTimelineEntry(db, {
    booking_id:  Number(booking_id),
    event_type:  'status_changed',
    actor:       user!.username,
    actor_role:  user!.role,
    from_status: existing?.status ?? 'pending',
    to_status:   'in_progress',
    note:        'Status diubah ke Dalam Proses saat menandai sudah dihubungi',
    metadata:    null,
  });

  await addTimelineEntry(db, {
    booking_id:  Number(booking_id),
    event_type:  'contacted',
    actor:       user!.username,
    actor_role:  user!.role,
    from_status: null,
    to_status:   null,
    note:        `Pemohon dihubungi oleh ${user!.username}`,
    metadata:    null,
  });

  return Response.json({ ok: true });
};
