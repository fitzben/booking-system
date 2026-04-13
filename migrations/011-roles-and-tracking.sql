-- 1. Tambah kolom role ke admin_users
ALTER TABLE admin_users ADD COLUMN role TEXT NOT NULL DEFAULT 'booking_admin';

-- 2. Update superadmin pertama (username 'admin') jadi superadmin
-- Sesuaikan username jika berbeda
UPDATE admin_users SET role = 'superadmin' WHERE id = 1;

-- 3. Tabel tracking siapa yang sudah baca booking
CREATE TABLE IF NOT EXISTS booking_reads (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  role       TEXT    NOT NULL,  -- role yang sudah membaca, bukan per-user
  read_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_booking_reads ON booking_reads(booking_id, role);

-- 4. Tambah kolom tracking ke bookings
ALTER TABLE bookings ADD COLUMN contacted_at   TEXT;  -- datetime, nullable
ALTER TABLE bookings ADD COLUMN contacted_by   TEXT;  -- username admin, nullable
