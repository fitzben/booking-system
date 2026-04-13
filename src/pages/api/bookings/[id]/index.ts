import type { APIRoute } from "astro";
import { getDB, getBookingById, updateBookingStatus, buildChanges, writeAuditLog, addTimelineEntry } from "../../../../lib/db";
import { checkAuth, getAuthUser } from "../../../../lib/auth";

export const GET: APIRoute = async (context) => {
  const unauth = await checkAuth(context);
  if (unauth) return unauth;

  const id = Number(context.params.id);
  if (isNaN(id)) return Response.json({ error: "Invalid id" }, { status: 400 });

  const db = getDB(context.locals);
  const row = await db
    .prepare(
      `SELECT b.*, r.name AS room_name
       FROM bookings b JOIN rooms r ON b.room_id = r.id
       WHERE b.id = ?`,
    )
    .bind(id)
    .first();

  if (!row) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(row);
};

export const PUT: APIRoute = async (context) => {
  const unauth = await checkAuth(context, { resource: 'bookings', level: 'write' });
  if (unauth) return unauth;

  const id = Number(context.params.id);
  if (isNaN(id)) return Response.json({ error: "Invalid id" }, { status: 400 });

  let body: Record<string, unknown>;
  try {
    body = await context.request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const actor = await getAuthUser(context);
  const db = getDB(context.locals);

  // Fetch existing record for change tracking
  const existing = await db
    .prepare("SELECT * FROM bookings WHERE id = ?")
    .bind(id)
    .first<Record<string, unknown>>();
  if (!existing) return Response.json({ error: "Not found" }, { status: 404 });

  // Handle status update (existing logic)
  if (body.status !== undefined) {
    const validStatuses = ["pending", "in_progress", "approved", "rejected", "finished"];
    if (!validStatuses.includes(String(body.status))) {
      return Response.json({ error: `status harus salah satu: ${validStatuses.join(", ")}` }, { status: 400 });
    }
    await updateBookingStatus(db, id, body.status as "pending" | "in_progress" | "approved" | "rejected" | "finished", String(body.admin_notes ?? ""));
  }

  // Build dynamic UPDATE for other fields
  const setClauses: string[] = [];
  const bindings: unknown[] = [];

  if (body.applicant_name !== undefined) { setClauses.push("applicant_name = ?"); bindings.push(body.applicant_name); }
  if (body.applicant_contact !== undefined) { setClauses.push("applicant_contact = ?"); bindings.push(body.applicant_contact); }
  if (body.purpose !== undefined) { setClauses.push("purpose = ?"); bindings.push(body.purpose); }
  if (body.date !== undefined) { setClauses.push("date = ?"); bindings.push(body.date); }
  if (body.start_time !== undefined) { setClauses.push("start_time = ?"); bindings.push(body.start_time); }
  if (body.end_time !== undefined) { setClauses.push("end_time = ?"); bindings.push(body.end_time); }
  if (body.room_id !== undefined) { setClauses.push("room_id = ?"); bindings.push(body.room_id); }

  if (body.details_patch !== undefined) {
    const current = await db.prepare("SELECT details FROM bookings WHERE id = ?").bind(id).first<{ details: string | null }>();
    const existingDetails = JSON.parse(current?.details ?? "{}") as Record<string, unknown>;
    const merged = { ...existingDetails, ...(body.details_patch as Record<string, unknown>) };
    setClauses.push("details = ?");
    bindings.push(JSON.stringify(merged));
  }

  // Always stamp updated_by
  setClauses.push("updated_by = ?");
  bindings.push(actor?.username ?? null);

  bindings.push(id);
  await db.prepare(`UPDATE bookings SET ${setClauses.join(", ")} WHERE id = ?`).bind(...bindings).run();

  writeAuditLog(db, {
    table_name: 'bookings',
    record_id:  id,
    action:     'update',
    actor:      actor?.username ?? 'unknown',
    actor_role: actor?.role    ?? 'unknown',
    changes:    buildChanges(existing, body),
  }).catch((e) => console.error('audit log error', e));

  // Timeline: status changed
  if (body.status && String(body.status) !== String(existing.status)) {
    await addTimelineEntry(db, {
      booking_id:  id,
      event_type:  'status_changed',
      actor:       actor?.username ?? 'system',
      actor_role:  actor?.role     ?? null,
      from_status: String(existing.status ?? ''),
      to_status:   String(body.status),
      note:        body.admin_notes ? String(body.admin_notes) : null,
      metadata:    null,
    }).catch((e) => console.error('timeline error', e));
  }

  // Timeline: contacted
  if (body.contacted_at && !existing.contacted_at) {
    addTimelineEntry(db, {
      booking_id:  id,
      event_type:  'contacted',
      actor:       actor?.username ?? null,
      actor_role:  actor?.role ?? null,
      from_status: null,
      to_status:   null,
      note:        'Pemohon telah dihubungi',
      metadata:    null,
    }).catch((e) => console.error('timeline error', e));
  }

  const updated = await db
    .prepare(
      `SELECT b.*, r.name AS room_name
       FROM bookings b JOIN rooms r ON b.room_id = r.id
       WHERE b.id = ?`,
    )
    .bind(id)
    .first();

  if (!updated) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(updated);
};
