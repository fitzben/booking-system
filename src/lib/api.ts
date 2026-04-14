import type { BookingStatus, AdminRole } from "./constants";

// ── Shared types ──────────────────────────────────────────────────────────────

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
  date: string;
  start_time: string;
  end_time: string;
  purpose: string;
  status: BookingStatus;
  admin_notes: string | null;
  details: string | null;
  room_name?: string;
  date_end?: string;
  contacted_at?: string | null;
  contacted_by?: string | null;
  booking_code?: string | null;
  acknowledged_by?: string | null;
}

export interface PaginatedBookings {
  data: Booking[];
  total: number;
  page: number;
  page_size: number;
  stats: {
    total: number;
    pending: number;
    approved: number;
    in_progress: number;
    finished: number;
    rejected: number;
    contacted: number;
    not_contacted: number;
    unread_count: number;
  };
  read_booking_ids: number[];
}

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

export interface AdminUser {
  id: number;
  username: string;
  role: AdminRole;
  created_at: string;
}

export interface BookingDocument {
  id: number;
  booking_id: number;
  label: string;
  file_key: string;
  file_url: string;
  uploaded_at: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const JSON_HEADERS: HeadersInit = { "Content-Type": "application/json" };

async function handleResponse<T>(res: Response): Promise<T> {
  if (res.status === 401) throw new Error("UNAUTHORIZED");
  if (res.status === 404) throw new Error("NOT_FOUND");
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    throw new Error(
      (body["error"] as string | undefined) ?? `HTTP ${res.status}`,
    );
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// ── Rooms ─────────────────────────────────────────────────────────────────────

export interface RoomFull extends Room {
  tiers: RoomPricingTier[];
  media: RoomMedia[];
}

export async function getRooms(): Promise<Room[]> {
  return handleResponse<Room[]>(await fetch("/api/rooms"));
}

export async function getRoomsFull(): Promise<RoomFull[]> {
  return handleResponse<RoomFull[]>(await fetch("/api/rooms/full"));
}

export async function createRoom(data: Omit<Room, "id">): Promise<Room> {
  return handleResponse<Room>(
    await fetch("/api/rooms", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify(data),
    }),
  );
}

export async function updateRoom(
  id: number,
  data: Partial<Omit<Room, "id">>,
): Promise<Room> {
  return handleResponse<Room>(
    await fetch(`/api/rooms/${id}`, {
      method: "PUT",
      headers: JSON_HEADERS,
      body: JSON.stringify(data),
    }),
  );
}

export async function deleteRoom(id: number): Promise<void> {
  return handleResponse<void>(
    await fetch(`/api/rooms/${id}`, {
      method: "DELETE",
      headers: JSON_HEADERS,
    }),
  );
}

// ── Bookings ──────────────────────────────────────────────────────────────────

export async function getBookings(params?: {
  page?: number;
  page_size?: number;
  status?: string;
  search?: string;
  sort_field?: string;
  sort_order?: string;
  date_from?: string;
  date_to?: string;
}): Promise<PaginatedBookings> {
  const qs = params
    ? "?" +
      new URLSearchParams(
        Object.entries(params).reduce(
          (acc, [k, v]) => ({ ...acc, [k]: String(v) }),
          {},
        ),
      ).toString()
    : "";
  return handleResponse<PaginatedBookings>(
    await fetch(`/api/bookings${qs}`, { headers: JSON_HEADERS }),
  );
}

export async function getBooking(id: number): Promise<Booking> {
  return handleResponse<Booking>(
    await fetch(`/api/bookings/${id}`, { headers: JSON_HEADERS }),
  );
}

export async function updateBooking(
  id: number,
  data: {
    status?: BookingStatus;
    admin_notes?: string;
    applicant_name?: string;
    applicant_contact?: string;
    purpose?: string;
    date?: string;
    start_time?: string;
    end_time?: string;
    room_id?: number;
    details_patch?: Record<string, unknown>;
  },
): Promise<Booking> {
  return handleResponse<Booking>(
    await fetch(`/api/bookings/${id}`, {
      method: "PUT",
      headers: JSON_HEADERS,
      body: JSON.stringify(data),
    }),
  );
}

export async function createBooking(
  data: Record<string, unknown>,
): Promise<Booking> {
  return handleResponse<Booking>(
    await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),
  );
}

export async function markBookingRead(bookingId: number): Promise<void> {
  await handleResponse<{ ok: boolean }>(
    await fetch("/api/bookings/mark-read", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ booking_id: bookingId }),
    }),
  );
}

export async function markBookingContacted(bookingId: number): Promise<void> {
  await handleResponse<{ ok: boolean }>(
    await fetch("/api/bookings/mark-contacted", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ booking_id: bookingId }),
    }),
  );
}

export async function getBookingReadIds(): Promise<number[]> {
  return handleResponse<number[]>(
    await fetch("/api/bookings/read-ids", { headers: JSON_HEADERS }),
  );
}

export async function getBookingUnreadCount(): Promise<{
  unread_count: number;
  pending_total: number;
}> {
  return handleResponse(
    await fetch("/api/bookings/unread-count", { headers: JSON_HEADERS }),
  );
}

export async function getBookingTimeline(
  bookingId: number,
): Promise<BookingTimelineEntry[]> {
  return handleResponse<BookingTimelineEntry[]>(
    await fetch(`/api/bookings/${bookingId}/timeline`, {
      headers: JSON_HEADERS,
    }),
  );
}

// ── Room Pricing ──────────────────────────────────────────────────────────────

export async function getRoomPricing(
  roomId: number,
): Promise<RoomPricingTier[]> {
  return handleResponse<RoomPricingTier[]>(
    await fetch(`/api/rooms/${roomId}/pricing`),
  );
}

export async function setRoomPricing(
  roomId: number,
  data: { tiers: { hours: number; price: number }[]; overtime_rate: number },
): Promise<RoomPricingTier[]> {
  return handleResponse<RoomPricingTier[]>(
    await fetch(`/api/rooms/${roomId}/pricing`, {
      method: "PUT",
      headers: JSON_HEADERS,
      body: JSON.stringify(data),
    }),
  );
}

// ── Users ─────────────────────────────────────────────────────────────────────

export async function getUsers(): Promise<AdminUser[]> {
  return handleResponse<AdminUser[]>(
    await fetch("/api/users", { headers: JSON_HEADERS }),
  );
}

export async function createUser(data: {
  username: string;
  password: string;
  role: string;
}): Promise<AdminUser> {
  return handleResponse<AdminUser>(
    await fetch("/api/users", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify(data),
    }),
  );
}

export async function updateUserPassword(
  id: number,
  data: { password: string },
): Promise<AdminUser> {
  return handleResponse<AdminUser>(
    await fetch(`/api/users/${id}`, {
      method: "PUT",
      headers: JSON_HEADERS,
      body: JSON.stringify(data),
    }),
  );
}

export async function updateUserRole(
  id: number,
  data: { role: string },
): Promise<AdminUser> {
  return handleResponse<AdminUser>(
    await fetch(`/api/users/${id}`, {
      method: 'PUT',
      headers: JSON_HEADERS,
      body: JSON.stringify(data),
    }),
  );
}

export async function deleteUser(id: number): Promise<void> {
  return handleResponse<void>(
    await fetch(`/api/users/${id}`, {
      method: "DELETE",
      headers: JSON_HEADERS,
    }),
  );
}

// ── Inventory ─────────────────────────────────────────────────────────────────

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
  quantity_good: number;
  quantity_available: number;
  notes: string | null;
  created_at: string;
  // extras (migration 010)
  photo_url?: string | null;
  photo_key?: string | null;
  service_date?: string | null;
  warranty_date?: string | null;
}

export type NewInventoryPayload = Omit<
  InventoryItem,
  | "id"
  | "quantity_good"
  | "quantity_available"
  | "default_room_name"
  | "created_at"
>;

export async function getInventory(): Promise<InventoryItem[]> {
  return handleResponse<InventoryItem[]>(
    await fetch("/api/inventory", { headers: JSON_HEADERS }),
  );
}

export async function createInventoryItem(
  data: NewInventoryPayload,
): Promise<InventoryItem> {
  return handleResponse<InventoryItem>(
    await fetch("/api/inventory", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify(data),
    }),
  );
}

export async function updateInventoryItem(
  id: number,
  data: Partial<NewInventoryPayload>,
): Promise<InventoryItem> {
  return handleResponse<InventoryItem>(
    await fetch(`/api/inventory/${id}`, {
      method: "PUT",
      headers: JSON_HEADERS,
      body: JSON.stringify(data),
    }),
  );
}

export async function deleteInventoryItem(id: number): Promise<void> {
  return handleResponse<void>(
    await fetch(`/api/inventory/${id}`, {
      method: "DELETE",
      headers: JSON_HEADERS,
    }),
  );
}

export async function getExpiringWarrantyItems(
  days = 30,
): Promise<InventoryItem[]> {
  return handleResponse<InventoryItem[]>(
    await fetch(`/api/inventory/expiring-warranty?days=${days}`, {
      headers: JSON_HEADERS,
    }),
  );
}

// ── Settings ──────────────────────────────────────────────────────────────────

export async function getSetting(
  key: string,
): Promise<{ key: string; value: string | null }> {
  return handleResponse<{ key: string; value: string | null }>(
    await fetch(`/api/settings?key=${encodeURIComponent(key)}`),
  );
}

export interface ContactSettings {
  contact_whatsapp: string;
  contact_wa_template: string;
  contact_email: string;
  contact_address: string;
  contact_gmaps: string;
  contact_hours: string;
}

export async function getContactSettings(): Promise<ContactSettings> {
  const res = await fetch("/api/settings");
  const all = await handleResponse<Record<string, string>>(res);
  return {
    contact_whatsapp: all["contact_whatsapp"] ?? "6281393098189",
    contact_wa_template:
      all["contact_wa_template"] ??
      "Halo, saya ingin menanyakan informasi peminjaman ruangan.",
    contact_email: all["contact_email"] ?? "",
    contact_address: all["contact_address"] ?? "",
    contact_gmaps: all["contact_gmaps"] ?? "",
    contact_hours: all["contact_hours"] ?? "",
  };
}

// export function buildWaUrl(phone: string, template: string): string {
//   return `https://wa.me/${phone}?text=${encodeURIComponent(template)}`;
// }

export function buildWaUrl(phone: string, template: string): string {
  // Strip semua non-digit agar wa.me URL valid (+, spasi, strip, dll)
  const cleanPhone = phone.replace(/\D/g, '');
  // Decode dulu untuk handle jika value dari DB sudah ter-encode
  let decoded: string;
  try {
    decoded = decodeURIComponent(template);
  } catch {
    decoded = template;
  }
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(decoded)}`;
}

export async function setSetting(key: string, value: string): Promise<void> {
  await handleResponse<{ key: string; value: string }>(
    await fetch("/api/settings", {
      method: "PUT",
      headers: JSON_HEADERS,
      body: JSON.stringify({ key, value }),
    }),
  );
}

// ── Room Media ────────────────────────────────────────────────────────────────

export interface RoomMedia {
  id: number;
  room_id: number;
  url: string;
  type: "image" | "video";
  is_cover: number; // 0 | 1
  sort_order: number;
  created_at: string;
}

export async function getRoomMedia(roomId: number): Promise<RoomMedia[]> {
  return handleResponse<RoomMedia[]>(
    await fetch(`/api/room-media?room_id=${roomId}`),
  );
}

export async function addRoomMedia(data: {
  room_id: number;
  url: string;
  type: string;
  is_cover?: number;
  sort_order?: number;
}): Promise<RoomMedia> {
  return handleResponse<RoomMedia>(
    await fetch("/api/room-media", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify(data),
    }),
  );
}

export async function deleteRoomMedia(id: number): Promise<void> {
  return handleResponse<void>(
    await fetch(`/api/room-media/${id}`, {
      method: "DELETE",
      headers: JSON_HEADERS,
    }),
  );
}

export async function setRoomMediaCover(
  id: number,
  roomId: number,
): Promise<void> {
  return handleResponse<void>(
    await fetch(`/api/room-media/${id}`, {
      method: "PUT",
      headers: JSON_HEADERS,
      body: JSON.stringify({ action: "set_cover", room_id: roomId }),
    }),
  );
}

// ── Booking Documents ─────────────────────────────────────────────────────────

export async function getBookingDocuments(
  bookingId: number,
): Promise<BookingDocument[]> {
  return handleResponse<BookingDocument[]>(
    await fetch(`/api/admin/documents?booking_id=${bookingId}`, {
      headers: JSON_HEADERS,
    }),
  );
}

export async function uploadBookingDocument(
  bookingId: number,
  label: string,
  file: File,
): Promise<BookingDocument> {
  const fd = new FormData();
  fd.append("booking_id", String(bookingId));
  fd.append("label", label);
  fd.append("file", file);
  // Cookies dikirim otomatis oleh browser (same-origin)
  return handleResponse<BookingDocument>(
    await fetch("/api/admin/documents", { method: "POST", body: fd }),
  );
}

export async function deleteBookingDocument(id: number): Promise<void> {
  return handleResponse<void>(
    await fetch("/api/admin/documents", {
      method: "DELETE",
      headers: JSON_HEADERS,
      body: JSON.stringify({ id }),
    }),
  );
}

// ── Bulk Delete ───────────────────────────────────────────────────────────────

export async function bulkDeleteBookings(ids: number[]): Promise<{ deleted: number }> {
  return handleResponse(
    await fetch('/api/bookings/bulk-delete', {
      method: 'DELETE',
      headers: JSON_HEADERS,
      body: JSON.stringify({ ids }),
    }),
  );
}

export async function bulkDeleteRooms(ids: number[]): Promise<{ deleted: number }> {
  return handleResponse(
    await fetch('/api/rooms/bulk-delete', {
      method: 'DELETE',
      headers: JSON_HEADERS,
      body: JSON.stringify({ ids }),
    }),
  );
}

export async function bulkDeleteInventory(ids: number[]): Promise<{ deleted: number }> {
  return handleResponse(
    await fetch('/api/inventory/bulk-delete', {
      method: 'DELETE',
      headers: JSON_HEADERS,
      body: JSON.stringify({ ids }),
    }),
  );
}

export async function bulkDeleteUsers(ids: number[]): Promise<{ deleted: number }> {
  return handleResponse(
    await fetch('/api/users/bulk-delete', {
      method: 'DELETE',
      headers: JSON_HEADERS,
      body: JSON.stringify({ ids }),
    }),
  );
}

// ── Auth ──────────────────────────────────────────────────────────────────────

/** POST /api/auth/login — verifikasi credentials, server set session cookie. */
export async function login(
  username: string,
  password: string,
): Promise<{ username: string; role: string }> {
  return handleResponse<{ username: string; role: string }>(
    await fetch("/api/auth/login", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ username, password }),
    }),
  );
}

/** POST /api/auth/logout — hapus session di server dan clear cookie. */
export async function logout(): Promise<void> {
  await fetch("/api/auth/logout", { method: "POST" });
}

// ── Role Permissions ──────────────────────────────────────────────────────────

export interface RolePermissions {
  permissions: Record<string, Record<string, string>>;
  version:     number;
  updated_at:  string | null;
}

export async function getRolePermissions(): Promise<RolePermissions> {
  return handleResponse<RolePermissions>(
    await fetch('/api/admin/role-permissions', { headers: JSON_HEADERS }),
  );
}

export async function updateRolePermissions(
  permissions: Record<string, Record<string, string>>,
): Promise<{ ok: boolean; version: number }> {
  return handleResponse(
    await fetch('/api/admin/role-permissions', {
      method:  'PUT',
      headers: JSON_HEADERS,
      body:    JSON.stringify({ permissions }),
    }),
  );
}

/** Fetch the full role→resource→level permission map from DB. */
export async function getMyPermissions(): Promise<Record<string, Record<string, string>>> {
  const data = await getRolePermissions();
  // This is the full map — consumers filter by role themselves
  return data.permissions;
}

export async function getPermissionVersion(): Promise<{ version: number }> {
  return handleResponse(
    await fetch('/api/admin/permission-version', { headers: JSON_HEADERS }),
  );
}
