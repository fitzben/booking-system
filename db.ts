// src/lib/db.ts
// Thin wrapper around Cloudflare D1.
// D1 is accessed via Astro.locals.runtime.env.DB (injected by the Cloudflare adapter).

import type { D1Database } from "@cloudflare/workers-types";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Room {
  id: number;
  name: string;
  type: string;
  base_price: number;
  notes: string | null;
}

export interface Booking {
  id: number;
  applicant_name: string;
  applicant_contact: string;
  room_id: number;
  date: string; // YYYY-MM-DD
  start_time: string; // HH:MM
  end_time: string; // HH:MM
  purpose: string;
  status: "pending" | "approved" | "rejected";
  admin_notes: string | null;
  acknowledged_by: string | null;
}

export type NewRoom = Omit<Room, "id">;
export type NewBooking = Omit<Booking, "id" | "status" | "admin_notes">;

// ─── Helper to grab the DB from Astro.locals ──────────────────────────────────

export function getDB(locals: App.Locals): D1Database {
  const db = locals.runtime?.env?.DB;
  if (!db)
    throw new Error(
      "D1 binding 'DB' not found. Check wrangler.toml and platformProxy config.",
    );
  return db;
}

// ─── Rooms ────────────────────────────────────────────────────────────────────

export async function getRooms(db: D1Database): Promise<Room[]> {
  const { results } = await db
    .prepare("SELECT * FROM rooms ORDER BY id")
    .all<Room>();
  return results;
}

export async function getRoomById(
  db: D1Database,
  id: number,
): Promise<Room | null> {
  const row = await db
    .prepare("SELECT * FROM rooms WHERE id = ?")
    .bind(id)
    .first<Room>();
  return row ?? null;
}

export async function createRoom(
  db: D1Database,
  data: NewRoom,
): Promise<number> {
  const result = await db
    .prepare(
      "INSERT INTO rooms (name, type, base_price, notes) VALUES (?, ?, ?, ?)",
    )
    .bind(data.name, data.type, data.base_price, data.notes ?? null)
    .run();
  return result.meta.last_row_id as number;
}

export async function updateRoom(
  db: D1Database,
  id: number,
  data: Partial<NewRoom>,
): Promise<void> {
  // Build SET clause dynamically from provided fields only
  const fields = Object.keys(data) as (keyof NewRoom)[];
  if (fields.length === 0) return;
  const setClause = fields.map((f) => `${f} = ?`).join(", ");
  const values = fields.map((f) => (data[f] as unknown) ?? null);
  await db
    .prepare(`UPDATE rooms SET ${setClause} WHERE id = ?`)
    .bind(...values, id)
    .run();
}

export async function deleteRoom(db: D1Database, id: number): Promise<void> {
  await db.prepare("DELETE FROM rooms WHERE id = ?").bind(id).run();
}

// ─── Bookings ─────────────────────────────────────────────────────────────────

export async function getBookings(db: D1Database): Promise<Booking[]> {
  const { results } = await db
    .prepare("SELECT * FROM bookings ORDER BY date DESC")
    .all<Booking>();
  return results;
}

export async function getBookingById(
  db: D1Database,
  id: number,
): Promise<Booking | null> {
  const row = await db
    .prepare("SELECT * FROM bookings WHERE id = ?")
    .bind(id)
    .first<Booking>();
  return row ?? null;
}

export async function createBooking(
  db: D1Database,
  data: NewBooking,
): Promise<number> {
  const result = await db
    .prepare(
      `
      INSERT INTO bookings
        (applicant_name, applicant_contact, room_id, date, start_time, end_time, purpose, acknowledged_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    )
    .bind(
      data.applicant_name,
      data.applicant_contact,
      data.room_id,
      data.date,
      data.start_time,
      data.end_time,
      data.purpose,
      data.acknowledged_by,
    )
    .run();
  return result.meta.last_row_id as number;
}

export async function updateBookingStatus(
  db: D1Database,
  id: number,
  status: Booking["status"],
  admin_notes?: string,
): Promise<void> {
  await db
    .prepare("UPDATE bookings SET status = ?, admin_notes = ? WHERE id = ?")
    .bind(status, admin_notes ?? null, id)
    .run();
}

export async function deleteBooking(db: D1Database, id: number): Promise<void> {
  await db.prepare("DELETE FROM bookings WHERE id = ?").bind(id).run();
}
