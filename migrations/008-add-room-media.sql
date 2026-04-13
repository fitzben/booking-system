-- Migration 008: dedicated room_media table
-- Replaces cover_image / images[] text fields for per-room media management.

CREATE TABLE IF NOT EXISTS room_media (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  room_id    INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  url        TEXT NOT NULL,
  type       TEXT NOT NULL DEFAULT 'image',   -- 'image' | 'video'
  is_cover   INTEGER NOT NULL DEFAULT 0,       -- 0 | 1  (only one per room should be 1)
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_room_media_room_id ON room_media(room_id);
