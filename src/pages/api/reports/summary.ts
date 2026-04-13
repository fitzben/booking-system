import type { APIRoute } from 'astro';
import { checkAuth, getAuthUser } from '../../../lib/auth';
import { getDB } from '../../../lib/db';

// GET /api/reports/summary?year=2026&month=4
export const GET: APIRoute = async (context) => {
  const unauth = await checkAuth(context);
  if (unauth) return unauth;

  const user = await getAuthUser(context);
  if (!user || (user.role !== 'superadmin' && user.role !== 'manager')) {
    return Response.json({ error: 'Forbidden — hanya superadmin dan manager' }, { status: 403 });
  }

  const rawYear  = context.url.searchParams.get('year');
  const rawMonth = context.url.searchParams.get('month');

  if (!rawYear || !rawMonth) {
    return Response.json({ error: 'Parameter year dan month wajib diisi' }, { status: 400 });
  }

  const year  = parseInt(rawYear, 10);
  const month = parseInt(rawMonth, 10);

  if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
    return Response.json({ error: 'year atau month tidak valid' }, { status: 400 });
  }

  const db = getDB(context.locals);

  // Batas tanggal bulan ini: [dateStart, dateStart +1 month)
  const dateStart = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-01`;

  // Bulan lalu — handle wrap January → December tahun sebelumnya
  const lastYear  = month === 1 ? year - 1 : year;
  const lastMonth = month === 1 ? 12 : month - 1;
  const lastDateStart = `${String(lastYear).padStart(4, '0')}-${String(lastMonth).padStart(2, '0')}-01`;

  const [
    overviewRaw,
    lastMonthRaw,
    revenueTotalRaw,
    revenueByRoomRaw,
    dailyRaw,
    roomsRankingRaw,
    statusBreakdownRaw,
    applicantTypeRaw,
    inventoryRaw,
  ] = await Promise.all([
    // ── Overview: status counts bulan ini ─────────────────────────────────────
    db.prepare(`
      SELECT
        COUNT(*) AS total_bookings,
        SUM(CASE WHEN status = 'approved'    THEN 1 ELSE 0 END) AS approved,
        SUM(CASE WHEN status = 'pending'     THEN 1 ELSE 0 END) AS pending,
        SUM(CASE WHEN status = 'rejected'    THEN 1 ELSE 0 END) AS rejected,
        SUM(CASE WHEN status = 'finished'    THEN 1 ELSE 0 END) AS finished,
        SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) AS in_progress
      FROM bookings
      WHERE date >= ? AND date < date(?, '+1 month')
    `).bind(dateStart, dateStart).first<{
      total_bookings: number;
      approved: number;
      pending: number;
      rejected: number;
      finished: number;
      in_progress: number;
    }>(),

    // ── Total bulan lalu (untuk vs_last_month) ────────────────────────────────
    db.prepare(`
      SELECT COUNT(*) AS total_bookings
      FROM bookings
      WHERE date >= ? AND date < date(?, '+1 month')
    `).bind(lastDateStart, lastDateStart).first<{ total_bookings: number }>(),

    // ── Revenue estimasi: sum base_price (approved + finished) ────────────────
    db.prepare(`
      SELECT COALESCE(SUM(r.base_price), 0) AS estimated_total
      FROM bookings b
      JOIN rooms r ON r.id = b.room_id
      WHERE b.status IN ('approved', 'finished')
        AND b.date >= ? AND b.date < date(?, '+1 month')
    `).bind(dateStart, dateStart).first<{ estimated_total: number }>(),

    // ── Revenue by room ───────────────────────────────────────────────────────
    db.prepare(`
      SELECT
        b.room_id,
        r.name AS room_name,
        COALESCE(SUM(r.base_price), 0) AS total,
        COUNT(*) AS count
      FROM bookings b
      JOIN rooms r ON r.id = b.room_id
      WHERE b.status IN ('approved', 'finished')
        AND b.date >= ? AND b.date < date(?, '+1 month')
      GROUP BY b.room_id, r.name
      ORDER BY total DESC
    `).bind(dateStart, dateStart).all<{
      room_id: number;
      room_name: string;
      total: number;
      count: number;
    }>(),

    // ── Booking per hari ──────────────────────────────────────────────────────
    db.prepare(`
      SELECT
        date,
        COUNT(*) AS count,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) AS approved,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) AS rejected
      FROM bookings
      WHERE date >= ? AND date < date(?, '+1 month')
      GROUP BY date
      ORDER BY date ASC
    `).bind(dateStart, dateStart).all<{
      date: string;
      count: number;
      approved: number;
      rejected: number;
    }>(),

    // ── Rooms ranking ─────────────────────────────────────────────────────────
    db.prepare(`
      SELECT
        b.room_id,
        r.name AS room_name,
        COUNT(*) AS count,
        SUM(CASE WHEN b.status = 'approved' THEN 1 ELSE 0 END) AS approved
      FROM bookings b
      JOIN rooms r ON r.id = b.room_id
      WHERE b.date >= ? AND b.date < date(?, '+1 month')
      GROUP BY b.room_id, r.name
      ORDER BY count DESC
    `).bind(dateStart, dateStart).all<{
      room_id: number;
      room_name: string;
      count: number;
      approved: number;
    }>(),

    // ── Status breakdown (untuk pie chart) ───────────────────────────────────
    db.prepare(`
      SELECT status, COUNT(*) AS count
      FROM bookings
      WHERE date >= ? AND date < date(?, '+1 month')
      GROUP BY status
    `).bind(dateStart, dateStart).all<{ status: string; count: number }>(),

    // ── Applicant type breakdown ──────────────────────────────────────────────
    db.prepare(`
      SELECT
        COALESCE(json_extract(details, '$.applicant_type'), 'personal') AS type,
        COUNT(*) AS count
      FROM bookings
      WHERE date >= ? AND date < date(?, '+1 month')
      GROUP BY type
    `).bind(dateStart, dateStart).all<{ type: string; count: number }>(),

    // ── Inventory summary ─────────────────────────────────────────────────────
    db.prepare(`
      SELECT
        COUNT(*) AS total_items,
        COALESCE(SUM(quantity_damaged), 0) AS damaged,
        SUM(CASE WHEN service_date IS NOT NULL THEN 1 ELSE 0 END) AS in_service,
        SUM(CASE WHEN warranty_date IS NOT NULL
                 AND warranty_date <= date('now', '+30 days')
                 AND warranty_date >= date('now')
            THEN 1 ELSE 0 END) AS expiring_warranty
      FROM inventory
    `).first<{
      total_items: number;
      damaged: number;
      in_service: number;
      expiring_warranty: number;
    }>(),
  ]);

  const thisMonthTotal = overviewRaw?.total_bookings ?? 0;
  const lastMonthTotal = lastMonthRaw?.total_bookings ?? 0;

  return Response.json({
    overview: {
      total_bookings: thisMonthTotal,
      approved:       overviewRaw?.approved    ?? 0,
      pending:        overviewRaw?.pending     ?? 0,
      rejected:       overviewRaw?.rejected    ?? 0,
      finished:       overviewRaw?.finished    ?? 0,
      in_progress:    overviewRaw?.in_progress ?? 0,
      new_this_month: thisMonthTotal,
      vs_last_month:  thisMonthTotal - lastMonthTotal,
    },
    revenue: {
      estimated_total: revenueTotalRaw?.estimated_total ?? 0,
      by_room:         revenueByRoomRaw.results,
    },
    daily_bookings:           dailyRaw.results,
    rooms_ranking:            roomsRankingRaw.results,
    status_breakdown:         statusBreakdownRaw.results,
    applicant_type_breakdown: applicantTypeRaw.results,
    inventory_summary: {
      total_items:       inventoryRaw?.total_items       ?? 0,
      damaged:           inventoryRaw?.damaged           ?? 0,
      in_service:        inventoryRaw?.in_service        ?? 0,
      expiring_warranty: inventoryRaw?.expiring_warranty ?? 0,
    },
  });
};
