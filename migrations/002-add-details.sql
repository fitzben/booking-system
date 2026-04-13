-- Migration 002: Add details column for rich booking form data
ALTER TABLE bookings ADD COLUMN details TEXT;
