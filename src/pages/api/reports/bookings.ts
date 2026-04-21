import type { APIRoute } from 'astro';
import { checkAuth, getAuthUser } from '../../../lib/auth';
import { getDB } from '../../../lib/db';

// GET /api/reports/bookings?date_from=YYYY-MM-DD&date_to=YYYY-MM-DD&company=...&page=1&limit=10
export const GET: APIRoute = async (context) => {
  const unauth = await checkAuth(context);
  if (unauth) return unauth;

  const user = await getAuthUser(context);
  if (!user || (user.role !== 'superadmin' && user.role !== 'manager')) {
    return Response.json(
      { error: 'Forbidden — hanya superadmin dan manager' },
      { status: 403 },
    );
  }

  // ── Default: current month ─────────────────────────────────────────────────
  const now = new Date();
  const cy  = now.getFullYear();
  const cm  = now.getMonth() + 1;
  const ld  = new Date(cy, cm, 0).getDate();
  const defFrom = `${cy}-${String(cm).padStart(2, '0')}-01`;
  const defTo   = `${cy}-${String(cm).padStart(2, '0')}-${String(ld).padStart(2, '0')}`;

  const dateFrom = context.url.searchParams.get('date_from') ?? defFrom;
  const dateTo   = context.url.searchParams.get('date_to')   ?? defTo;
  const company  = context.url.searchParams.get('company')   ?? '';
  const page     = Math.max(1, parseInt(context.url.searchParams.get('page')  ?? '1',  10));
  const limit    = Math.min(9999, Math.max(1, parseInt(context.url.searchParams.get('limit') ?? '10', 10)));
  const offset   = (page - 1) * limit;

  const db = getDB(context.locals);

  // Company filter: empty string → no filter; non-empty → exact match on organization field
  const cf = `AND (CAST(? AS TEXT) = '' OR COALESCE(json_extract(b.details, '$.organization'), '') = ?)`;

  const [countRaw, rowsRaw] = await Promise.all([
    db.prepare(`
      SELECT COUNT(*) AS total
      FROM bookings b
      WHERE b.date >= ? AND b.date <= ? ${cf}
    `).bind(dateFrom, dateTo, company, company).first<{ total: number }>(),

    db.prepare(`
      SELECT
        COALESCE(b.booking_code, 'BK-' || b.id) AS booking_id,
        b.applicant_name,
        NULLIF(TRIM(COALESCE(json_extract(b.details, '$.organization'), '')), '') AS company_name,
        r.name AS room_name,
        b.date  AS booking_date,
        b.start_time AS start_hour,
        b.end_time   AS end_hour,
        b.status
      FROM bookings b
      JOIN rooms r ON r.id = b.room_id
      WHERE b.date >= ? AND b.date <= ? ${cf}
      ORDER BY b.date DESC, b.start_time DESC
      LIMIT ? OFFSET ?
    `).bind(dateFrom, dateTo, company, company, limit, offset).all<{
      booking_id:     string;
      applicant_name: string;
      company_name:   string | null;
      room_name:      string;
      booking_date:   string;
      start_hour:     string;
      end_hour:       string;
      status:         string;
    }>(),
  ]);

  return Response.json({
    data:  rowsRaw.results,
    total: countRaw?.total ?? 0,
    page,
    limit,
  });
};
