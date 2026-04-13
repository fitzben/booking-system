-- migrations/001_init.sql

CREATE TABLE IF NOT EXISTS rooms (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT    NOT NULL,
  type       TEXT    NOT NULL,
  base_price REAL    NOT NULL DEFAULT 0,
  notes      TEXT
);

CREATE TABLE IF NOT EXISTS bookings (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  applicant_name    TEXT    NOT NULL,
  applicant_contact TEXT    NOT NULL,
  room_id           INTEGER NOT NULL REFERENCES rooms(id),
  date              TEXT    NOT NULL, -- YYYY-MM-DD
  start_time        TEXT    NOT NULL, -- HH:MM
  end_time          TEXT    NOT NULL, -- HH:MM
  purpose           TEXT    NOT NULL,
  status            TEXT    NOT NULL DEFAULT 'pending',
  admin_notes       TEXT
);

-- Seed a few rooms so the app is usable immediately
INSERT INTO rooms (name, type, base_price, notes) VALUES
  ('Ruang Rapat A', 'meeting_room', 200000, 'Kapasitas 10 orang, proyektor tersedia'),
  ('Ruang Rapat B', 'meeting_room', 150000, 'Kapasitas 6 orang'),
  ('Aula Utama',    'hall',         750000, 'Kapasitas 200 orang, AC, podium');