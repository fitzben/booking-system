-- Migration 017: add default_equipment column to rooms
-- Stores a JSON array of { name, quantity } objects used to pre-populate
-- the Equipment Usage tab when an admin opens a booking for this room.
ALTER TABLE rooms ADD COLUMN default_equipment TEXT NOT NULL DEFAULT '[]';
