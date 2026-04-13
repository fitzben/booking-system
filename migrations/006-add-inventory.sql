-- Migration 006: Inventory master table

CREATE TABLE IF NOT EXISTS inventory (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  name             TEXT NOT NULL,
  category         TEXT NOT NULL DEFAULT 'Misc',
  code             TEXT,
  brand            TEXT,
  model            TEXT,
  default_room_id  INTEGER REFERENCES rooms(id) ON DELETE SET NULL,
  is_fixed         INTEGER NOT NULL DEFAULT 0,   -- 0 = movable, 1 = fixed
  quantity_total   INTEGER NOT NULL DEFAULT 1,
  quantity_damaged INTEGER NOT NULL DEFAULT 0,
  quantity_in_use  INTEGER NOT NULL DEFAULT 0,
  notes            TEXT,
  created_at       TEXT NOT NULL DEFAULT (datetime('now'))
);
