export const BOOKING_STATUSES = [
  'pending',
  'in_progress',
  'approved',
  'rejected',
  'finished',
] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const STATUS_LABELS: Record<BookingStatus, string> = {
  pending: 'Menunggu',
  in_progress: 'Dalam Proses',
  approved: 'Disetujui',
  rejected: 'Ditolak',
  finished: 'Selesai',
};

export const STATUS_COLORS: Record<BookingStatus, string> = {
  pending: 'warning',
  in_progress: 'processing',
  approved: 'success',
  rejected: 'error',
  finished: 'processing',
};

export const ADMIN_ROLES = [
  'superadmin',
  'booking_admin',
  'inventory_admin',
  'manager',
] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

// Permissions per role — apa saja yang boleh dilakukan
export const ROLE_PERMISSIONS: Record<AdminRole, {
  bookings:  'none' | 'read' | 'write';
  inventory: 'none' | 'read' | 'write';
  users:     'none' | 'read' | 'write';
  reports:   'none' | 'read';
  settings:  'none' | 'read' | 'write';
  rooms:     'none' | 'read' | 'write';
}> = {
  superadmin:      { bookings: 'write', rooms: 'write', inventory: 'write', users: 'write', reports: 'read', settings: 'write' },
  booking_admin:   { bookings: 'write', rooms: 'write', inventory: 'none',  users: 'none',  reports: 'none', settings: 'none'  },
  inventory_admin: { bookings: 'read',  rooms: 'read',  inventory: 'write', users: 'none',  reports: 'none', settings: 'none'  },
  manager:         { bookings: 'read',  rooms: 'read',  inventory: 'read',  users: 'none',  reports: 'read', settings: 'none'  },
};

export const ROLE_LABELS: Record<AdminRole, string> = {
  superadmin:      'Super Admin',
  booking_admin:   'Admin Booking',
  inventory_admin: 'Admin Inventaris',
  manager:         'Manager',
};

export const KEPERLUAN_OPTIONS = [
  'Photoshoot',
  'Videoshoot',
  'Shooting',
  'Reading',
  'Lainnya',
] as const;

export const JENIS_PRODUKSI_OPTIONS = [
  'Film',
  'TV Program',
  'Iklan',
  'Konten Digital',
  'Lainnya',
] as const;

export const RUANGAN_OPTIONS = [
  '6th Floor Room 2 (Meeting Room)',
  '6th Floor Room 4 (Meeting Room)',
  'Carbon (Function Room)',
  'Studio',
  'Ruang Make Up',
  'Ruang Casting',
  'Lainnya',
] as const;

export const FASILITAS_OPTIONS = [
  { label: 'Listrik', value: 'Listrik' },
  { label: 'Air Conditioning (AC)', value: 'AC' },
] as const;

export const ROOM_TYPE_OPTIONS = [
  { label: 'Meeting Room', value: 'meeting_room' },
  { label: 'Function Room', value: 'function_room' },
  { label: 'Hall', value: 'hall' },
  { label: 'Studio', value: 'studio' },
  { label: 'Lainnya', value: 'other' },
] as const;

// Authentication is fully handled via HTTP-only session cookies and the AdminAuthContext.
// These keys are being phased out in favor of the centralized context.
export const ADMIN_USERNAME_KEY = 'admin_username';
export const ADMIN_ROLE_KEY = 'admin_role';
export const ADMIN_PASSWORD_KEY = 'admin_password';
