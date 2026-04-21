// src/lib/db.ts
// Thin wrapper around Cloudflare D1.
// D1 is accessed via Astro.locals.runtime.env.DB (injected by the Cloudflare adapter).

import type { D1Database } from "@cloudflare/workers-types";
import type { AdminRole } from "./constants";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DefaultEquipmentItem {
  name: string;
  quantity: number;
}

export interface Room {
  id: number;
  name: string;
  type: string;
  base_price: number | null;
  overtime_rate: number;
  notes: string | null;
  // Extended landing-page fields — requires migration 005
  cover_image?: string | null;
  images?: string[];
  short_description?: string | null;
  capacity?: string | null;
  facilities?: string[];
  equipment_highlights?: string[];
  // Default equipment for booking Equipment Usage tab — requires migration 017
  default_equipment?: DefaultEquipmentItem[];
}

/** Raw row as D1 returns it: JSON-array columns are still strings. */
type RawRoom = Omit<Room, 'images' | 'facilities' | 'equipment_highlights' | 'default_equipment'> & {
  images?: string | null;
  facilities?: string | null;
  equipment_highlights?: string | null;
  default_equipment?: string | null;
};

function safeParseArray(v?: string | null): string[] {
  if (!v) return [];
  try { return JSON.parse(v) as string[]; } catch { return []; }
}

function safeParseJSON<T>(v?: string | null, fallback: T = [] as unknown as T): T {
  if (!v) return fallback;
  try { return JSON.parse(v) as T; } catch { return fallback; }
}

function parseRoom(raw: RawRoom): Room {
  return {
    ...raw,
    images: safeParseArray(raw.images),
    facilities: safeParseArray(raw.facilities),
    equipment_highlights: safeParseArray(raw.equipment_highlights),
    default_equipment: safeParseJSON<DefaultEquipmentItem[]>(raw.default_equipment),
  };
}

/** Convert array/object fields to JSON strings before writing to D1. */
function serializeArrayFields(data: Partial<NewRoom>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...data };
  if ('images' in out)               out.images               = JSON.stringify(out.images ?? []);
  if ('facilities' in out)           out.facilities           = JSON.stringify(out.facilities ?? []);
  if ('equipment_highlights' in out) out.equipment_highlights = JSON.stringify(out.equipment_highlights ?? []);
  if ('default_equipment' in out)    out.default_equipment    = JSON.stringify(out.default_equipment ?? []);
  return out;
}

export interface RoomPricingTier {
  id: number;
  room_id: number;
  hours: number;
  price: number;
  sort_order: number;
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
  status: "pending" | "in_progress" | "approved" | "rejected" | "finished";
  admin_notes: string | null;
  details: string | null; // JSON blob from the rich booking form
  contacted_at: string | null;
  contacted_by: string | null;
  booking_code?: string | null;
  acknowledged_by?: string | null;
}

export type NewRoom = Omit<Room, "id" | "overtime_rate"> & { overtime_rate?: number };
export type NewBooking = Omit<Booking, "id" | "status" | "admin_notes" | "contacted_at" | "contacted_by">;

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
    .all<RawRoom>();
  return results.map(parseRoom);
}

export async function getRoomById(
  db: D1Database,
  id: number,
): Promise<Room | null> {
  const row = await db
    .prepare("SELECT * FROM rooms WHERE id = ?")
    .bind(id)
    .first<RawRoom>();
  return row ? parseRoom(row) : null;
}

export async function createRoom(
  db: D1Database,
  data: NewRoom,
): Promise<number> {
  const result = await db
    .prepare(
      `INSERT INTO rooms
         (name, type, base_price, notes,
          cover_image, images, short_description, capacity, facilities, equipment_highlights,
          default_equipment)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      data.name,
      data.type,
      data.base_price,
      data.notes ?? null,
      data.cover_image ?? null,
      JSON.stringify(data.images ?? []),
      data.short_description ?? null,
      data.capacity ?? null,
      JSON.stringify(data.facilities ?? []),
      JSON.stringify(data.equipment_highlights ?? []),
      JSON.stringify(data.default_equipment ?? []),
    )
    .run();
  return result.meta.last_row_id as number;
}

export async function updateRoom(
  db: D1Database,
  id: number,
  data: Partial<NewRoom>,
): Promise<void> {
  const serialized = serializeArrayFields(data);
  const fields = Object.keys(serialized);
  if (fields.length === 0) return;
  const setClause = fields.map((f) => `${f} = ?`).join(", ");
  const values = fields.map((f) => serialized[f] ?? null);
  await db
    .prepare(`UPDATE rooms SET ${setClause} WHERE id = ?`)
    .bind(...values, id)
    .run();
}

export async function deleteRoom(db: D1Database, id: number): Promise<void> {
  await db.prepare("DELETE FROM rooms WHERE id = ?").bind(id).run();
}

// ─── Room Pricing ─────────────────────────────────────────────────────────────

export async function getRoomPricing(
  db: D1Database,
  roomId: number,
): Promise<RoomPricingTier[]> {
  const { results } = await db
    .prepare(
      "SELECT * FROM room_pricing WHERE room_id = ? ORDER BY hours ASC",
    )
    .bind(roomId)
    .all<RoomPricingTier>();
  return results;
}

/** Replaces all tiers for a room atomically (delete-then-insert). */
export async function setRoomPricing(
  db: D1Database,
  roomId: number,
  tiers: Pick<RoomPricingTier, "hours" | "price" | "sort_order">[],
): Promise<void> {
  await db
    .prepare("DELETE FROM room_pricing WHERE room_id = ?")
    .bind(roomId)
    .run();

  for (let i = 0; i < tiers.length; i++) {
    const { hours, price } = tiers[i];
    await db
      .prepare(
        "INSERT INTO room_pricing (room_id, hours, price, sort_order) VALUES (?, ?, ?, ?)",
      )
      .bind(roomId, hours, price, i)
      .run();
  }
}

// ─── Bookings ─────────────────────────────────────────────────────────────────

export async function getBookings(db: D1Database): Promise<Booking[]> {
  const { results } = await db
    .prepare("SELECT * FROM bookings ORDER BY date DESC, start_time DESC")
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
      `INSERT INTO bookings
        (applicant_name, applicant_contact, room_id, date, start_time, end_time, purpose, details)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      data.applicant_name,
      data.applicant_contact,
      data.room_id,
      data.date,
      data.start_time,
      data.end_time,
      data.purpose,
      data.details ?? null,
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

// Mark booking sebagai sudah dibaca oleh role tertentu
export async function markBookingRead(db: D1Database, bookingId: number, role: string): Promise<void> {
  await db.prepare(`
    INSERT INTO booking_reads (booking_id, role) VALUES (?, ?)
    ON CONFLICT(booking_id, role) DO UPDATE SET read_at = datetime('now')
  `).bind(bookingId, role).run();
}

// Ambil semua booking_id yang sudah dibaca oleh role tertentu
export async function getReadBookingIds(db: D1Database, role: string): Promise<number[]> {
  const { results } = await db.prepare(
    'SELECT booking_id FROM booking_reads WHERE role = ?'
  ).bind(role).all<{ booking_id: number }>();
  return results.map(r => r.booking_id);
}

// Cek apakah satu booking sudah dibaca oleh role tertentu
export async function isBookingRead(db: D1Database, bookingId: number, role: string): Promise<boolean> {
  const row = await db.prepare(
    'SELECT id FROM booking_reads WHERE booking_id = ? AND role = ?'
  ).bind(bookingId, role).first();
  return !!row;
}

export async function markBookingContacted(
  db: D1Database,
  bookingId: number,
  username: string,
): Promise<void> {
  await db.prepare(`
    UPDATE bookings
    SET contacted_at = datetime('now'), contacted_by = ?, status = 'in_progress'
    WHERE id = ?
  `).bind(username, bookingId).run();
}

// ─── Admin Users ──────────────────────────────────────────────────────────────

export interface AdminUser {
  id: number;
  username: string;
  password_hash: string;
  role: AdminRole;
  created_at: string;
}

export type NewAdminUser = Pick<AdminUser, "username" | "password_hash" | "role">;

/** Returns all users WITHOUT password_hash — safe for list endpoints. */
export async function getAdminUsers(
  db: D1Database,
): Promise<Omit<AdminUser, "password_hash">[]> {
  const { results } = await db
    .prepare("SELECT id, username, role, created_at FROM admin_users ORDER BY id")
    .all<Omit<AdminUser, "password_hash">>();
  return results;
}

/** Returns the full row including password_hash — only used server-side for auth. */
export async function getAdminUserByUsername(
  db: D1Database,
  username: string,
): Promise<AdminUser | null> {
  const row = await db
    .prepare("SELECT * FROM admin_users WHERE username = ?")
    .bind(username)
    .first<AdminUser>();
  return row ?? null;
}

export async function createAdminUser(
  db: D1Database,
  data: NewAdminUser,
): Promise<number> {
  const result = await db
    .prepare(
      "INSERT INTO admin_users (username, password_hash, role) VALUES (?, ?, ?)",
    )
    .bind(data.username, data.password_hash, data.role)
    .run();
  return result.meta.last_row_id as number;
}

export async function updateAdminUserPassword(
  db: D1Database,
  id: number,
  password_hash: string,
): Promise<void> {
  await db
    .prepare("UPDATE admin_users SET password_hash = ? WHERE id = ?")
    .bind(password_hash, id)
    .run();
}

export async function updateAdminUserRole(
  db: D1Database,
  id: number,
  role: AdminRole,
): Promise<void> {
  await db
    .prepare("UPDATE admin_users SET role = ? WHERE id = ?")
    .bind(role, id)
    .run();
}

export async function deleteAdminUser(db: D1Database, id: number): Promise<void> {
  await db.prepare("DELETE FROM admin_users WHERE id = ?").bind(id).run();
}

export async function countAdminUsers(db: D1Database): Promise<number> {
  const row = await db
    .prepare("SELECT COUNT(*) AS cnt FROM admin_users")
    .first<{ cnt: number }>();
  return row?.cnt ?? 0;
}

// ─── Inventory ────────────────────────────────────────────────────────────────

export interface InventoryItem {
  id: number;
  name: string;
  category: string;
  code: string | null;
  brand: string | null;
  model: string | null;
  default_room_id: number | null;
  default_room_name?: string | null;
  is_fixed: number; // 0 | 1
  quantity_total: number;
  quantity_damaged: number;
  quantity_in_use: number;
  quantity_good: number;      // computed: total - damaged
  quantity_available: number; // computed: max(0, good - in_use)
  notes: string | null;
  created_at: string;
  // extras (migration 010)
  photo_url?: string | null;
  photo_key?: string | null;
  service_date?: string | null;
  warranty_date?: string | null;
}

export type NewInventoryItem = {
  name: string;
  category: string;
  code?: string | null;
  brand?: string | null;
  model?: string | null;
  default_room_id?: number | null;
  is_fixed: number;
  quantity_total: number;
  quantity_damaged: number;
  quantity_in_use: number;
  notes?: string | null;
  // extras (migration 010)
  photo_url?: string | null;
  photo_key?: string | null;
  service_date?: string | null;
  warranty_date?: string | null;
};

type RawInventoryItem = Omit<InventoryItem, 'quantity_good' | 'quantity_available'> & {
  default_room_name?: string | null;
};

function computeInventory(raw: RawInventoryItem): InventoryItem {
  const quantity_good = raw.quantity_total - raw.quantity_damaged;
  const quantity_available = Math.max(0, quantity_good - raw.quantity_in_use);
  return { ...raw, quantity_good, quantity_available };
}

export async function getInventory(db: D1Database): Promise<InventoryItem[]> {
  const { results } = await db
    .prepare(
      `SELECT i.*, r.name AS default_room_name
       FROM inventory i
       LEFT JOIN rooms r ON r.id = i.default_room_id
       ORDER BY i.id`,
    )
    .all<RawInventoryItem>();
  return results.map(computeInventory);
}

export async function getInventoryById(
  db: D1Database,
  id: number,
): Promise<InventoryItem | null> {
  const row = await db
    .prepare(
      `SELECT i.*, r.name AS default_room_name
       FROM inventory i
       LEFT JOIN rooms r ON r.id = i.default_room_id
       WHERE i.id = ?`,
    )
    .bind(id)
    .first<RawInventoryItem>();
  return row ? computeInventory(row) : null;
}

export async function createInventoryItem(
  db: D1Database,
  data: NewInventoryItem,
): Promise<number> {
  const result = await db
    .prepare(
      `INSERT INTO inventory
         (name, category, code, brand, model, default_room_id, is_fixed,
          quantity_total, quantity_damaged, quantity_in_use, notes,
          photo_url, photo_key, service_date, warranty_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      data.name,
      data.category,
      data.code ?? null,
      data.brand ?? null,
      data.model ?? null,
      data.default_room_id ?? null,
      data.is_fixed,
      data.quantity_total,
      data.quantity_damaged,
      data.quantity_in_use,
      data.notes ?? null,
      data.photo_url ?? null,
      data.photo_key ?? null,
      data.service_date ?? null,
      data.warranty_date ?? null,
    )
    .run();
  return result.meta.last_row_id as number;
}

export async function updateInventoryItem(
  db: D1Database,
  id: number,
  data: Partial<NewInventoryItem>,
): Promise<void> {
  const fields = Object.keys(data) as (keyof typeof data)[];
  if (fields.length === 0) return;
  const setClause = fields.map((f) => `${f} = ?`).join(', ');
  const values = fields.map((f) => (data[f] === undefined ? null : data[f]));
  await db
    .prepare(`UPDATE inventory SET ${setClause} WHERE id = ?`)
    .bind(...values, id)
    .run();
}

export async function deleteInventoryItem(db: D1Database, id: number): Promise<void> {
  await db.prepare('DELETE FROM inventory WHERE id = ?').bind(id).run();
}

export async function getExpiringWarranty(
  db: D1Database,
  daysAhead: number,
): Promise<InventoryItem[]> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + daysAhead);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  const { results } = await db
    .prepare(
      `SELECT i.*, r.name AS default_room_name
       FROM inventory i
       LEFT JOIN rooms r ON r.id = i.default_room_id
       WHERE i.warranty_date IS NOT NULL
         AND i.warranty_date <= ?
         AND i.warranty_date >= date('now')
       ORDER BY i.warranty_date ASC`,
    )
    .bind(cutoffStr)
    .all<RawInventoryItem>();
  return results.map(computeInventory);
}

// ─── Room Media ───────────────────────────────────────────────────────────────

export interface RoomMedia {
  id: number;
  room_id: number;
  url: string;
  type: 'image' | 'video';
  is_cover: number; // 0 | 1
  sort_order: number;
  created_at: string;
}

export type NewRoomMedia = Pick<RoomMedia, 'room_id' | 'url' | 'type' | 'is_cover' | 'sort_order'>;

export async function getRoomMedia(db: D1Database, roomId: number): Promise<RoomMedia[]> {
  const { results } = await db
    .prepare('SELECT * FROM room_media WHERE room_id = ? ORDER BY sort_order ASC, id ASC')
    .bind(roomId)
    .all<RoomMedia>();
  return results;
}

export async function addRoomMedia(db: D1Database, data: NewRoomMedia): Promise<number> {
  const result = await db
    .prepare(
      'INSERT INTO room_media (room_id, url, type, is_cover, sort_order) VALUES (?, ?, ?, ?, ?)',
    )
    .bind(data.room_id, data.url, data.type, data.is_cover, data.sort_order)
    .run();
  return result.meta.last_row_id as number;
}

export async function deleteRoomMedia(db: D1Database, id: number): Promise<void> {
  await db.prepare('DELETE FROM room_media WHERE id = ?').bind(id).run();
}

/** Clears is_cover on all items for the room, then sets it on the given item. */
export async function setRoomMediaCover(
  db: D1Database,
  roomId: number,
  id: number,
): Promise<void> {
  await db
    .prepare('UPDATE room_media SET is_cover = 0 WHERE room_id = ?')
    .bind(roomId)
    .run();
  await db
    .prepare('UPDATE room_media SET is_cover = 1 WHERE id = ?')
    .bind(id)
    .run();
}

// ─── Booking Documents ────────────────────────────────────────────────────────

export interface BookingDocument {
  id: number;
  booking_id: number;
  label: string;
  file_key: string;
  file_url: string;
  uploaded_at: string;
}

export type NewBookingDocument = Pick<BookingDocument, 'booking_id' | 'label' | 'file_key' | 'file_url'>;

export async function getDocumentsByBookingId(
  db: D1Database,
  bookingId: number,
): Promise<BookingDocument[]> {
  const { results } = await db
    .prepare('SELECT * FROM booking_documents WHERE booking_id = ? ORDER BY uploaded_at ASC')
    .bind(bookingId)
    .all<BookingDocument>();
  return results;
}

export async function getDocumentById(
  db: D1Database,
  id: number,
): Promise<BookingDocument | null> {
  const row = await db
    .prepare('SELECT * FROM booking_documents WHERE id = ?')
    .bind(id)
    .first<BookingDocument>();
  return row ?? null;
}

export async function createDocument(
  db: D1Database,
  data: NewBookingDocument,
): Promise<number> {
  const result = await db
    .prepare(
      'INSERT INTO booking_documents (booking_id, label, file_key, file_url) VALUES (?, ?, ?, ?)',
    )
    .bind(data.booking_id, data.label, data.file_key, data.file_url)
    .run();
  return result.meta.last_row_id as number;
}

export async function deleteDocument(db: D1Database, id: number): Promise<void> {
  await db.prepare('DELETE FROM booking_documents WHERE id = ?').bind(id).run();
}

// ─── Audit Log ────────────────────────────────────────────────────────────────

export function buildChanges(
  oldRecord: Record<string, unknown>,
  newBody:   Record<string, unknown>,
): Record<string, [unknown, unknown]> {
  const changes: Record<string, [unknown, unknown]> = {};
  for (const key of Object.keys(newBody)) {
    if (key in oldRecord && oldRecord[key] !== newBody[key]) {
      changes[key] = [oldRecord[key], newBody[key]];
    }
  }
  return changes;
}

export async function writeAuditLog(
  db: D1Database,
  entry: {
    table_name: string;
    record_id:  number;
    action:     'create' | 'update' | 'delete' | 'bulk_delete';
    actor:      string;
    actor_role: string;
    changes?:   Record<string, [unknown, unknown]>;
  },
): Promise<void> {
  await db.prepare(`
    INSERT INTO audit_log (table_name, record_id, action, actor, actor_role, changes)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(
    entry.table_name,
    entry.record_id,
    entry.action,
    entry.actor,
    entry.actor_role,
    entry.changes ? JSON.stringify(entry.changes) : null,
  ).run();
}

// ─── Booking Code ─────────────────────────────────────────────────────────────

const MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];

export async function generateBookingCode(
  db: D1Database,
  bookingDate: string, // YYYY-MM-DD
): Promise<string> {
  const d      = new Date(bookingDate);
  const yy     = String(d.getFullYear()).slice(2);
  const mon    = MONTHS[d.getMonth()];
  const dd     = String(d.getDate()).padStart(2, '0');
  const prefix = `BK-${yy}${mon}${dd}`;

  const row = await db
    .prepare(`SELECT COUNT(*) AS cnt FROM bookings WHERE booking_code LIKE ?`)
    .bind(`${prefix}%`)
    .first<{ cnt: number }>();

  const seq = String((row?.cnt ?? 0) + 1).padStart(4, '0');
  return `${prefix}${seq}`;
}

// ─── Booking Timeline ─────────────────────────────────────────────────────────

export interface BookingTimelineEntry {
  id:          number;
  booking_id:  number;
  event_type:  string;
  actor:       string | null;
  actor_role:  string | null;
  from_status: string | null;
  to_status:   string | null;
  note:        string | null;
  metadata:    string | null;
  created_at:  string;
}

export async function addTimelineEntry(
  db: D1Database,
  entry: Omit<BookingTimelineEntry, 'id' | 'created_at'>,
): Promise<void> {
  await db.prepare(`
    INSERT INTO booking_timeline
      (booking_id, event_type, actor, actor_role,
       from_status, to_status, note, metadata)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    entry.booking_id,
    entry.event_type,
    entry.actor       ?? null,
    entry.actor_role  ?? null,
    entry.from_status ?? null,
    entry.to_status   ?? null,
    entry.note        ?? null,
    entry.metadata    ?? null,
  ).run();
}

export async function getBookingTimeline(
  db: D1Database,
  bookingId: number,
): Promise<BookingTimelineEntry[]> {
  const { results } = await db
    .prepare(`
      SELECT * FROM booking_timeline
      WHERE booking_id = ?
      ORDER BY created_at ASC
    `)
    .bind(bookingId)
    .all<BookingTimelineEntry>();
  return results;
}
