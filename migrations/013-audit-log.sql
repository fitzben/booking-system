-- Tambah kolom audit ke tabel bookings
ALTER TABLE bookings ADD COLUMN created_by  TEXT;
ALTER TABLE bookings ADD COLUMN updated_by  TEXT;
ALTER TABLE bookings ADD COLUMN deleted_by  TEXT;
ALTER TABLE bookings ADD COLUMN deleted_at  TEXT;

-- Tambah kolom audit ke tabel rooms
ALTER TABLE rooms ADD COLUMN created_by  TEXT;
ALTER TABLE rooms ADD COLUMN updated_by  TEXT;
ALTER TABLE rooms ADD COLUMN deleted_by  TEXT;
ALTER TABLE rooms ADD COLUMN deleted_at  TEXT;

-- Tambah kolom audit ke tabel inventory
ALTER TABLE inventory ADD COLUMN created_by  TEXT;
ALTER TABLE inventory ADD COLUMN updated_by  TEXT;
ALTER TABLE inventory ADD COLUMN deleted_by  TEXT;
ALTER TABLE inventory ADD COLUMN deleted_at  TEXT;

-- Tabel audit_log untuk history lengkap semua aksi
CREATE TABLE IF NOT EXISTS audit_log (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  table_name  TEXT    NOT NULL,  -- 'bookings' | 'rooms' | 'inventory' | 'admin_users'
  record_id   INTEGER NOT NULL,
  action      TEXT    NOT NULL,  -- 'create' | 'update' | 'delete' | 'bulk_delete'
  actor       TEXT    NOT NULL,  -- username yang melakukan aksi
  actor_role  TEXT    NOT NULL,  -- role saat aksi dilakukan
  changes     TEXT,              -- JSON string: { field: [old, new] } untuk update
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_audit_log_table   ON audit_log(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_log_record  ON audit_log(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_actor   ON audit_log(actor);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at);
