-- Migration 009: booking identity documents
CREATE TABLE IF NOT EXISTS booking_documents (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id  INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  label       TEXT    NOT NULL,
  file_key    TEXT    NOT NULL,
  file_url    TEXT    NOT NULL,
  uploaded_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_booking_documents_booking_id
  ON booking_documents(booking_id);
