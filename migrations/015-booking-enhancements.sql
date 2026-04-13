-- Migration 015: Booking code, acknowledged_by, and booking_timeline

-- 1. Tambah kolom ke tabel bookings
ALTER TABLE bookings ADD COLUMN booking_code     TEXT;
ALTER TABLE bookings ADD COLUMN acknowledged_by  TEXT;  -- nama PIC jika perusahaan mengandung "MD"

-- 2. Index untuk search by booking_code
CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_code ON bookings(booking_code)
  WHERE booking_code IS NOT NULL;

-- 3. Tabel booking_timeline — event log per booking
CREATE TABLE IF NOT EXISTS booking_timeline (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id  INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  event_type  TEXT    NOT NULL,
  -- 'created' | 'read' | 'contacted' | 'status_changed' |
  -- 'checkin' | 'checkout' | 'document_uploaded' | 'note_added'
  actor       TEXT,           -- username atau 'public' jika dari form publik
  actor_role  TEXT,           -- role actor, null jika public
  from_status TEXT,           -- untuk event status_changed
  to_status   TEXT,           -- untuk event status_changed
  note        TEXT,           -- keterangan tambahan
  metadata    TEXT,           -- JSON string untuk data extra
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_timeline_booking ON booking_timeline(booking_id);
CREATE INDEX IF NOT EXISTS idx_timeline_created ON booking_timeline(created_at);

-- 4. Generate booking_code untuk booking yang sudah ada
-- Format: BK-YYMMM + DD + nomor urut 4 digit per hari
-- Contoh: BK-26APR110001
UPDATE bookings
SET booking_code = (
  SELECT
    'BK-' ||
    CASE
      WHEN CAST(STRFTIME('%m', b2.date) AS INTEGER) = 1  THEN 'JAN'
      WHEN CAST(STRFTIME('%m', b2.date) AS INTEGER) = 2  THEN 'FEB'
      WHEN CAST(STRFTIME('%m', b2.date) AS INTEGER) = 3  THEN 'MAR'
      WHEN CAST(STRFTIME('%m', b2.date) AS INTEGER) = 4  THEN 'APR'
      WHEN CAST(STRFTIME('%m', b2.date) AS INTEGER) = 5  THEN 'MAY'
      WHEN CAST(STRFTIME('%m', b2.date) AS INTEGER) = 6  THEN 'JUN'
      WHEN CAST(STRFTIME('%m', b2.date) AS INTEGER) = 7  THEN 'JUL'
      WHEN CAST(STRFTIME('%m', b2.date) AS INTEGER) = 8  THEN 'AUG'
      WHEN CAST(STRFTIME('%m', b2.date) AS INTEGER) = 9  THEN 'SEP'
      WHEN CAST(STRFTIME('%m', b2.date) AS INTEGER) = 10 THEN 'OCT'
      WHEN CAST(STRFTIME('%m', b2.date) AS INTEGER) = 11 THEN 'NOV'
      ELSE 'DEC'
    END ||
    SUBSTR(STRFTIME('%Y', b2.date), 3, 2) ||
    STRFTIME('%d', b2.date) ||
    PRINTF('%04d', ROW_NUMBER() OVER (
      PARTITION BY STRFTIME('%Y-%m-%d', b2.date)
      ORDER BY b2.id
    ))
  FROM bookings b2
  WHERE b2.id = bookings.id
)
WHERE booking_code IS NULL;
