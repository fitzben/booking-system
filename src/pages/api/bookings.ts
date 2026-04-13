import type { APIRoute } from "astro";
import { getDB, createBooking, getBookingById, writeAuditLog, generateBookingCode, addTimelineEntry } from "../../lib/db";
import { checkAuth } from "../../lib/auth";

export const GET: APIRoute = async (context) => {
  const unauth = await checkAuth(context);
  if (unauth) return unauth;

  const url = new URL(context.request.url);

  // Pagination
  const page     = Math.max(1, Number(url.searchParams.get('page')  ?? 1));
  const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get('page_size') ?? 10)));
  const offset   = (page - 1) * pageSize;

  // Search
  const search = (url.searchParams.get('search') ?? '').trim();

  // Filter
  const status = url.searchParams.get('status') ?? 'all';

  // Sorting
  const sortField = url.searchParams.get('sort_field') ?? 'date';
  const sortOrder = url.searchParams.get('sort_order') === 'asc' ? 'ASC' : 'DESC';

  // Whitelist sort fields to prevent SQL injection
  const ALLOWED_SORT_FIELDS: Record<string, string> = {
    id:             'b.id',
    date:           'b.date',
    applicant_name: 'b.applicant_name',
    status:         'b.status',
    created_at:     'b.created_at',
  };
  const orderBy = ALLOWED_SORT_FIELDS[sortField] ?? 'b.date';

  const db = getDB(context.locals);

  // Build WHERE clause
  const conditions: string[] = [];
  const bindings: unknown[]  = [];

  if (status !== 'all') {
    conditions.push('b.status = ?');
    bindings.push(status);
  }

  if (search) {
    conditions.push(`(
      b.applicant_name LIKE ? OR
      b.purpose        LIKE ? OR
      b.booking_code   LIKE ? OR
      CAST(b.id AS TEXT) LIKE ?
    )`);
    const like = `%${search}%`;
    bindings.push(like, like, like, like);
  }

  const dateFrom = url.searchParams.get('date_from') ?? '';
  const dateTo   = url.searchParams.get('date_to')   ?? '';

  if (dateFrom) {
    conditions.push('b.date >= ?');
    bindings.push(dateFrom);
  }
  if (dateTo) {
    conditions.push('b.date <= ?');
    bindings.push(dateTo);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  // Total count for pagination
  const countRow = await db
    .prepare(`SELECT COUNT(*) as total FROM bookings b ${where}`)
    .bind(...bindings)
    .first<{ total: number }>();
  const total = countRow?.total ?? 0;

  // Paginated data
  const { results } = await db
    .prepare(
      `SELECT b.*, r.name AS room_name
       FROM bookings b
       LEFT JOIN rooms r ON b.room_id = r.id
       ${where}
       ORDER BY ${orderBy} ${sortOrder}, b.id DESC
       LIMIT ? OFFSET ?`
    )
    .bind(...bindings, pageSize, offset)
    .all();

  // Aggregate stats — always across ALL data (no filter/search)
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
               THEN 1 ELSE 0 END)                                         AS not_contacted
    FROM bookings
  `).first<{
    total: number; pending: number; approved: number;
    in_progress: number; finished: number; rejected: number;
    contacted: number; not_contacted: number;
  }>();

  return Response.json({
    data:      results,
    total,
    page,
    page_size: pageSize,
    stats:     statsRow,
  });
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function required(v: unknown): v is string | number {
  return v !== undefined && v !== null && v !== "";
}

// ── Simple-form handler (BookingFormSimple) ───────────────────────────────────

async function handleSimpleBooking(
  body: Record<string, unknown>,
  locals: App.Locals,
): Promise<Response> {
  const {
    applicant_name,
    applicant_contact,
    applicant_type,
    email,
    position,
    organization,
    acknowledged_by,
    start_date,
    end_date,
    start_time,
    end_time,
    is_full_day,
  } = body;

  if (!required(applicant_name))    return Response.json({ error: "applicant_name wajib diisi" }, { status: 400 });
  if (!required(applicant_contact)) return Response.json({ error: "applicant_contact wajib diisi" }, { status: 400 });
  if (!required(start_date))        return Response.json({ error: "start_date wajib diisi" }, { status: 400 });
  if (!required(end_date))          return Response.json({ error: "end_date wajib diisi" }, { status: 400 });
  if (!required(start_time))        return Response.json({ error: "start_time wajib diisi" }, { status: 400 });
  if (!required(end_time))          return Response.json({ error: "end_time wajib diisi" }, { status: 400 });

  // Validate 3-hour minimum for same-day, non-full-day bookings
  if (!is_full_day && String(start_date) === String(end_date)) {
    const [sh, sm] = String(start_time).split(":").map(Number);
    const [eh, em] = String(end_time).split(":").map(Number);
    if (!isNaN(sh) && !isNaN(eh) && (eh * 60 + em) - (sh * 60 + sm) < 180) {
      return Response.json({ error: "Durasi peminjaman minimal 3 jam" }, { status: 400 });
    }
  }

  const db = getDB(locals);

  // ── Conflict check before insert ─────────────────────────────────────────
  const roomId = body.room_id ? Number(body.room_id) : 1;
  const dateStr = String(start_date);
  const endDateStr = String(end_date);
  const isSameDayBooking = dateStr === endDateStr;
  const isFullDay = Boolean(is_full_day);

  const conflict = await db
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
    .bind(roomId, endDateStr, dateStr, String(end_time), String(start_time))
    .first<{ cnt: number }>();

  if ((conflict?.cnt ?? 0) > 0) {
    return Response.json(
      { error: "Ruangan sudah dipesan pada tanggal atau jam tersebut" },
      { status: 409 },
    );
  }

  const id = await createBooking(db, {
    applicant_name: String(applicant_name),
    applicant_contact: String(applicant_contact),
    room_id: roomId,
    date: String(start_date),
    start_time: String(start_time),
    end_time: String(end_time),
    purpose: "",
    details: JSON.stringify({
      applicant_type:  applicant_type  ?? null,
      email:           email           ?? null,
      end_date,
      is_full_day:     Boolean(is_full_day),
      position:        position        ?? null,
      organization:    organization    ?? null,
      acknowledged_by: acknowledged_by ?? null,
    }),
  });

  await db.prepare('UPDATE bookings SET created_by = ? WHERE id = ?').bind('public', id).run();
  writeAuditLog(db, { table_name: 'bookings', record_id: id, action: 'create', actor: 'public', actor_role: 'public' })
    .catch((e) => console.error('audit log error', e));

  const bookingCode = await generateBookingCode(db, String(start_date));
  const acknowledgedBy = acknowledged_by ? String(acknowledged_by) : null;
  await db.prepare('UPDATE bookings SET booking_code = ?, acknowledged_by = ? WHERE id = ?')
    .bind(bookingCode, acknowledgedBy, id).run();

  addTimelineEntry(db, {
    booking_id:  id,
    event_type:  'created',
    actor:       'public',
    actor_role:  null,
    from_status: null,
    to_status:   'pending',
    note:        `Booking ${bookingCode} dibuat melalui form publik`,
    metadata:    null,
  }).catch((e) => console.error('timeline error', e));

  const booking = await getBookingById(db, id);
  return Response.json({ ...booking, booking_code: bookingCode, end_date: end_date ?? start_date }, { status: 201 });
}

// ── POST /api/bookings ────────────────────────────────────────────────────────
// Accepts the rich JSON payload from BookingForm.tsx.
// Core fields are mapped to DB columns; the full payload is stored in `details`.

export const POST: APIRoute = async ({ request, locals }) => {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // ── Simple-form payload (BookingFormSimple) ──────────────────────────────
  // Detected by presence of `applicant_name` (vs. the old `applicant_type`).
  if (required(body["applicant_name"])) {
    return handleSimpleBooking(body, locals);
  }

  const {
    applicant_type,
    nama,
    pic_name,
    company_name,
    whatsapp,
    keperluan,
    keperluan_lainnya,
    jenis_produksi,
    ruangan,
    date_start,
    date_end,
    time_start,
    time_end,
  } = body;

  // ── Validate required fields ─────────────────────────────────────────────
  if (!required(applicant_type)) {
    return Response.json({ error: "applicant_type wajib diisi" }, { status: 400 });
  }
  if (applicant_type === "personal" && !required(nama)) {
    return Response.json({ error: "nama wajib diisi" }, { status: 400 });
  }
  if (applicant_type === "company" && (!required(pic_name) || !required(company_name))) {
    return Response.json(
      { error: "pic_name dan company_name wajib diisi untuk tipe perusahaan" },
      { status: 400 },
    );
  }
  if (!required(whatsapp)) {
    return Response.json({ error: "whatsapp wajib diisi" }, { status: 400 });
  }
  if (!required(keperluan)) {
    return Response.json({ error: "keperluan wajib dipilih" }, { status: 400 });
  }
  if (!required(jenis_produksi)) {
    return Response.json({ error: "jenis_produksi wajib dipilih" }, { status: 400 });
  }
  if (!Array.isArray(ruangan) || ruangan.length === 0) {
    return Response.json({ error: "Pilih minimal satu ruangan" }, { status: 400 });
  }
  if (!required(date_start) || !required(time_start) || !required(time_end)) {
    return Response.json(
      { error: "date_start, time_start, dan time_end wajib diisi" },
      { status: 400 },
    );
  }

  // ── Validate time duration (≥ 3 hours) ──────────────────────────────────
  const [sh, sm] = String(time_start).split(":").map(Number);
  const [eh, em] = String(time_end).split(":").map(Number);
  if (!isNaN(sh) && !isNaN(eh)) {
    const startMins = sh * 60 + sm;
    const endMins = eh * 60 + em;
    if (endMins - startMins < 180) {
      return Response.json(
        { error: "Durasi peminjaman minimal 3 jam" },
        { status: 400 },
      );
    }
  }

  // ── Map to DB columns ────────────────────────────────────────────────────
  const applicantName =
    applicant_type === "company"
      ? `${pic_name} (${company_name})`
      : String(nama);

  const applicantContact = `+62${whatsapp}`;

  const purposeText =
    keperluan === "Lainnya" && required(keperluan_lainnya)
      ? String(keperluan_lainnya)
      : String(keperluan);

  // room_id=1 is a placeholder; actual room list is stored in details JSON.
  const placeholderRoomId = 1;

  const db = getDB(locals);

  const id = await createBooking(db, {
    applicant_name: applicantName,
    applicant_contact: applicantContact,
    room_id: placeholderRoomId,
    date: String(date_start),
    start_time: String(time_start),
    end_time: String(time_end),
    purpose: purposeText,
    details: JSON.stringify(body),
  });

  await db.prepare('UPDATE bookings SET created_by = ? WHERE id = ?').bind('public', id).run();
  writeAuditLog(db, { table_name: 'bookings', record_id: id, action: 'create', actor: 'public', actor_role: 'public' })
    .catch((e) => console.error('audit log error', e));

  const bookingCode = await generateBookingCode(db, String(date_start));
  const acknowledged_by = body.pic_name ? String(body.pic_name) : null;
  await db.prepare('UPDATE bookings SET booking_code = ?, acknowledged_by = ? WHERE id = ?')
    .bind(bookingCode, acknowledged_by, id).run();

  addTimelineEntry(db, {
    booking_id:  id,
    event_type:  'created',
    actor:       'public',
    actor_role:  null,
    from_status: null,
    to_status:   'pending',
    note:        `Booking ${bookingCode} dibuat melalui form publik`,
    metadata:    null,
  }).catch((e) => console.error('timeline error', e));

  // Return the created record (date_end comes from details; basic columns suffice for confirmation)
  const booking = await getBookingById(db, id);
  return Response.json(
    { ...booking, booking_code: bookingCode, date_end: date_end ?? date_start },
    { status: 201 },
  );
};
