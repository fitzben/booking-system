-- migrations/004-add-room-pricing.sql
-- Adds per-room pricing tiers and overtime rate.
-- Pricing logic: find highest tier where tier.hours <= booking_hours,
-- then charge tier.price + (remaining_hours * overtime_rate).

ALTER TABLE rooms ADD COLUMN overtime_rate REAL NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS room_pricing (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  room_id    INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  hours      INTEGER NOT NULL,
  price      REAL    NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  UNIQUE(room_id, hours)
);
