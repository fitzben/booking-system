import type { APIRoute } from 'astro';
import { checkAuth, getAuthUser } from '../../../lib/auth';
import { getDB } from '../../../lib/db';

// GET /api/reports/summary?date_from=YYYY-MM-DD&date_to=YYYY-MM-DD&company=...
export const GET: APIRoute = async (context) => {
  const unauth = await checkAuth(context);
  if (unauth) return unauth;

  const user = await getAuthUser(context);
  if (!user || (user.role !== 'superadmin' && user.role !== 'manager')) {
    return Response.json({ error: 'Forbidden — hanya superadmin dan manager' }, { status: 403 });
  }

  // ── Default: current month ─────────────────────────────────────────────────
  const now = new Date();
  const cy  = now.getFullYear();
  const cm  = now.getMonth() + 1;
  const ld  = new Date(cy, cm, 0).getDate();
  const defFrom = `${cy}-${String(cm).padStart(2,'0')}-01`;
  const defTo   = `${cy}-${String(cm).padStart(2,'0')}-${String(ld).padStart(2,'0')}`;

  const dateFrom = context.url.searchParams.get('date_from') ?? defFrom;
  const dateTo   = context.url.searchParams.get('date_to')   ?? defTo;
  const company  = context.url.searchParams.get('company')   ?? '';

  // ── Previous period (same length, for delta stat) ──────────────────────────
  const msFrom   = new Date(dateFrom).getTime();
  const msTo     = new Date(dateTo).getTime();
  const diffDays = Math.round((msTo - msFrom) / 86_400_000);
  const prevToDate   = new Date(msFrom - 86_400_000);
  const prevFromDate = new Date(prevToDate.getTime() - diffDays * 86_400_000);
  const prevFromStr  = prevFromDate.toISOString().slice(0, 10);
  const prevToStr    = prevToDate.toISOString().slice(0, 10);

  const db = getDB(context.locals);

  // Company filter: CAST trick — empty string → no filter; non-empty → exact match
  const cf = `AND (CAST(? AS TEXT) = '' OR COALESCE(json_extract(details, '$.organization'), '') = ?)`;

  const [
    overviewRaw,
    prevRaw,
    revTotalRaw,
    revByRoomRaw,
    dailyRaw,
    roomsRaw,
    statusRaw,
    applicantRaw,
    compBreakdownRaw,
    companiesRaw,
    inventoryRaw,
  ] = await Promise.all([

    // ── Overview counts ───────────────────────────────────────────────────────
    db.prepare(`
      SELECT COUNT(*) AS total_bookings,
        SUM(CASE WHEN status = 'approved'    THEN 1 ELSE 0 END) AS approved,
        SUM(CASE WHEN status = 'pending'     THEN 1 ELSE 0 END) AS pending,
        SUM(CASE WHEN status = 'rejected'    THEN 1 ELSE 0 END) AS rejected,
        SUM(CASE WHEN status = 'finished'    THEN 1 ELSE 0 END) AS finished,
        SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) AS in_progress
      FROM bookings
      WHERE date >= ? AND date <= ? ${cf}
    `).bind(dateFrom, dateTo, company, company).first<{
      total_bookings: number; approved: number; pending: number;
      rejected: number; finished: number; in_progress: number;
    }>(),

    // ── Previous-period total (same company filter) ───────────────────────────
    db.prepare(`
      SELECT COUNT(*) AS total_bookings
      FROM bookings
      WHERE date >= ? AND date <= ? ${cf}
    `).bind(prevFromStr, prevToStr, company, company).first<{ total_bookings: number }>(),

    // ── Revenue: estimated total ──────────────────────────────────────────────
    db.prepare(`
      SELECT COALESCE(SUM(r.base_price), 0) AS estimated_total
      FROM bookings b JOIN rooms r ON r.id = b.room_id
      WHERE b.status IN ('approved', 'finished')
        AND b.date >= ? AND b.date <= ? ${cf}
    `).bind(dateFrom, dateTo, company, company).first<{ estimated_total: number }>(),

    // ── Revenue by room ───────────────────────────────────────────────────────
    db.prepare(`
      SELECT b.room_id, r.name AS room_name,
        COALESCE(SUM(r.base_price), 0) AS total, COUNT(*) AS count
      FROM bookings b JOIN rooms r ON r.id = b.room_id
      WHERE b.status IN ('approved', 'finished')
        AND b.date >= ? AND b.date <= ? ${cf}
      GROUP BY b.room_id, r.name ORDER BY total DESC
    `).bind(dateFrom, dateTo, company, company).all<{
      room_id: number; room_name: string; total: number; count: number;
    }>(),

    // ── Daily bookings ────────────────────────────────────────────────────────
    db.prepare(`
      SELECT date, COUNT(*) AS count,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) AS approved,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) AS rejected
      FROM bookings
      WHERE date >= ? AND date <= ? ${cf}
      GROUP BY date ORDER BY date ASC
    `).bind(dateFrom, dateTo, company, company).all<{
      date: string; count: number; approved: number; rejected: number;
    }>(),

    // ── Rooms ranking ─────────────────────────────────────────────────────────
    db.prepare(`
      SELECT b.room_id, r.name AS room_name,
        COUNT(*) AS count,
        SUM(CASE WHEN b.status = 'approved' THEN 1 ELSE 0 END) AS approved
      FROM bookings b JOIN rooms r ON r.id = b.room_id
      WHERE b.date >= ? AND b.date <= ? ${cf}
      GROUP BY b.room_id, r.name ORDER BY count DESC
    `).bind(dateFrom, dateTo, company, company).all<{
      room_id: number; room_name: string; count: number; approved: number;
    }>(),

    // ── Status breakdown (pie chart) ──────────────────────────────────────────
    db.prepare(`
      SELECT status, COUNT(*) AS count
      FROM bookings
      WHERE date >= ? AND date <= ? ${cf}
      GROUP BY status
    `).bind(dateFrom, dateTo, company, company).all<{ status: string; count: number }>(),

    // ── Applicant type breakdown ──────────────────────────────────────────────
    db.prepare(`
      SELECT COALESCE(json_extract(details, '$.applicant_type'), 'personal') AS type,
        COUNT(*) AS count
      FROM bookings
      WHERE date >= ? AND date <= ? ${cf}
      GROUP BY type
    `).bind(dateFrom, dateTo, company, company).all<{ type: string; count: number }>(),

    // ── Company breakdown (date-filtered only; no company filter — shows all) ─
    db.prepare(`
      SELECT
        COALESCE(NULLIF(TRIM(json_extract(details, '$.organization')), ''), '(Pribadi)') AS company,
        COUNT(*) AS count,
        SUM(CASE WHEN status IN ('approved', 'finished') THEN 1 ELSE 0 END) AS approved
      FROM bookings
      WHERE date >= ? AND date <= ?
      GROUP BY company ORDER BY count DESC LIMIT 20
    `).bind(dateFrom, dateTo).all<{ company: string; count: number; approved: number }>(),

    // ── All unique companies across all time (for dropdown) ───────────────────
    db.prepare(`
      SELECT DISTINCT TRIM(json_extract(details, '$.organization')) AS company
      FROM bookings
      WHERE json_extract(details, '$.organization') IS NOT NULL
        AND TRIM(json_extract(details, '$.organization')) != ''
      ORDER BY company ASC
    `).all<{ company: string }>(),

    // ── Inventory summary (no date/company filter) ────────────────────────────
    db.prepare(`
      SELECT COUNT(*) AS total_items,
        COALESCE(SUM(quantity_damaged), 0) AS damaged,
        SUM(CASE WHEN service_date IS NOT NULL THEN 1 ELSE 0 END) AS in_service,
        SUM(CASE WHEN warranty_date IS NOT NULL
                 AND warranty_date <= date('now', '+30 days')
                 AND warranty_date >= date('now')
            THEN 1 ELSE 0 END) AS expiring_warranty
      FROM inventory
    `).first<{
      total_items: number; damaged: number; in_service: number; expiring_warranty: number;
    }>(),
  ]);

  const thisTotal = overviewRaw?.total_bookings ?? 0;
  const prevTotal = prevRaw?.total_bookings ?? 0;

  return Response.json({
    overview: {
      total_bookings:  thisTotal,
      approved:        overviewRaw?.approved    ?? 0,
      pending:         overviewRaw?.pending     ?? 0,
      rejected:        overviewRaw?.rejected    ?? 0,
      finished:        overviewRaw?.finished    ?? 0,
      in_progress:     overviewRaw?.in_progress ?? 0,
      new_this_period: thisTotal,
      vs_prev_period:  thisTotal - prevTotal,
    },
    revenue: {
      estimated_total: revTotalRaw?.estimated_total ?? 0,
      by_room:         revByRoomRaw.results,
    },
    daily_bookings:           dailyRaw.results,
    rooms_ranking:            roomsRaw.results,
    status_breakdown:         statusRaw.results,
    applicant_type_breakdown: applicantRaw.results,
    company_breakdown:        compBreakdownRaw.results,
    companies:                companiesRaw.results.map(r => r.company),
    inventory_summary: {
      total_items:       inventoryRaw?.total_items       ?? 0,
      damaged:           inventoryRaw?.damaged           ?? 0,
      in_service:        inventoryRaw?.in_service        ?? 0,
      expiring_warranty: inventoryRaw?.expiring_warranty ?? 0,
    },
  });
};
