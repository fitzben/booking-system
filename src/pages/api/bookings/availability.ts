import type { APIRoute } from "astro";
import { getDB } from "../../../lib/db";

// GET /api/bookings/availability
// Query params:
//   room_id     number  (required)
//   start_date  string  YYYY-MM-DD (required)
//   end_date    string  YYYY-MM-DD (required)
//   start_time  string  HH:mm (optional — only for same-day time-slot check)
//   end_time    string  HH:mm (optional — only for same-day time-slot check)

export const GET: APIRoute = async (context) => {
  const url = new URL(context.request.url);
  const roomIdRaw = url.searchParams.get("room_id");
  const startDate  = url.searchParams.get("start_date");
  const endDate    = url.searchParams.get("end_date");
  const startTime  = url.searchParams.get("start_time");
  const endTime    = url.searchParams.get("end_time");

  if (!roomIdRaw || !startDate || !endDate) {
    return Response.json({ error: "room_id, start_date, dan end_date wajib diisi" }, { status: 400 });
  }

  const roomId = Number(roomIdRaw);
  if (isNaN(roomId)) {
    return Response.json({ error: "room_id tidak valid" }, { status: 400 });
  }

  const db = getDB(context.locals);

  // ── Specific Time-Slot Check ────────────────────────────────────────────────
  if (startTime && endTime) {
    const row = await db
      .prepare(
        `SELECT COUNT(*) AS cnt FROM bookings
         WHERE room_id = ? AND status NOT IN ('rejected', 'cancelled')
         AND (
             date <= ? AND COALESCE(json_extract(details, '$.end_date'), date) >= ?
         )
         AND (
             start_time < ? AND end_time > ?
         )`
      )
      .bind(roomId, endDate, startDate, endTime, startTime)
      .first<{ cnt: number }>();

    if ((row?.cnt ?? 0) > 0) {
      return Response.json({
        available: false,
        message: 'Ruangan sudah dipesan pada tanggal atau jam tersebut'
      });
    }
    return Response.json({ available: true });
  }

  // ── Date(s) Only Check ──────────────────────────────────────────────────────
  const { results: intersectingBookings } = await db
    .prepare(
      `SELECT start_time, end_time FROM bookings
       WHERE room_id = ? AND status NOT IN ('rejected', 'cancelled')
       AND date <= ? AND COALESCE(json_extract(details, '$.end_date'), date) >= ?
       ORDER BY start_time ASC`
    )
    .bind(roomId, endDate, startDate)
    .all<{ start_time: string; end_time: string }>();

  if (intersectingBookings.length > 0) {
    if (startDate === endDate) {
      // Same-day request: check if the entire day is blocked
      const hasFullDay = intersectingBookings.some(
        (r) => r.start_time <= '00:00' && r.end_time >= '23:59'
      );
      if (hasFullDay) {
        return Response.json({
          available: false,
          full_day_blocked: true,
          message: 'Tanggal ini sudah dipesan penuh (Full Day)'
        });
      } else {
        return Response.json({
          available: true,
          full_day_blocked: true,
          message: 'Ada peminjaman pada tanggal ini, jadwal yang terisi ditandai abu-abu',
          booked_slots: intersectingBookings
        });
      }
    } else {
      // Multi-day request with ANY intersecting bookings
      return Response.json({
        available: false,
        message: 'Ada peminjaman ruangan pada sebagian/seluruh rentang tanggal ini'
      });
    }
  }

  return Response.json({ available: true });
};
