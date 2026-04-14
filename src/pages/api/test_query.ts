import { getDB } from "../../lib/db";
import { getAuthUser } from "../../lib/auth";

export async function test(locals: any) {
  const db = getDB(locals);
  const role = 'booking_admin';
  
  const statsRow = await db.prepare(`
    SELECT
      COUNT(*)                                                              AS total,
      SUM(CASE WHEN status = 'pending'     THEN 1 ELSE 0 END)             AS pending,
      SUM(CASE WHEN status = 'approved'    THEN 1 ELSE 0 END)             AS approved,
      SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END)             AS in_progress,
      SUM(CASE WHEN status = 'finished'    THEN 1 ELSE 0 END)             AS finished,
      SUM(CASE WHEN status = 'rejected'    THEN 1 ELSE 0 END)             AS rejected,
      SUM(CASE WHEN contacted_at IS NOT NULL THEN 1 ELSE 0 END)           AS contacted,
      SUM(CASE WHEN contacted_at IS NULL
               AND status NOT IN ('rejected','cancelled','finished')
               THEN 1 ELSE 0 END)                                         AS not_contacted,
      (
        SELECT COUNT(*)
        FROM bookings b2
        LEFT JOIN booking_reads br ON br.booking_id = b2.id AND br.role = ?
        WHERE br.booking_id IS NULL AND b2.status IN ('pending', 'approved', 'in_progress')
      ) AS unread_count
    FROM bookings
  `).bind(role).first();
  
  console.log('Stats:', statsRow);
  
  const readIds = await db
    .prepare('SELECT booking_id FROM booking_reads WHERE role = ?')
    .bind(role)
    .all();
    
  console.log('Read IDs:', readIds.results);
}
