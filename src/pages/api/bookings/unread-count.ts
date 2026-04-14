import type { APIRoute } from 'astro';
import { getDB } from '../../../lib/db';
import { getAuthUser } from '../../../lib/auth';

export const GET: APIRoute = async (context) => {
  const user = await getAuthUser(context);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const db = getDB(context.locals);

  const row = await db.prepare(`
    SELECT
      COUNT(*)                                           AS pending_total,
      COUNT(CASE WHEN br.booking_id IS NULL THEN 1 END) AS unread_count
    FROM bookings b
    LEFT JOIN booking_reads br
      ON br.booking_id = b.id AND br.role = ?
    WHERE b.status IN ('pending', 'approved', 'in_progress')
  `).bind(user.role).first<{ pending_total: number; unread_count: number }>();

  return Response.json({
    unread_count:  row?.unread_count  ?? 0,
    pending_total: row?.pending_total ?? 0,
  });
};
