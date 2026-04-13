-- Migration 005: Add rich room detail fields for public landing page
-- Run: npx wrangler d1 migrations apply mde-booking-db --local
--      npx wrangler d1 migrations apply mde-booking-db --remote  (for production)

ALTER TABLE rooms ADD COLUMN cover_image          TEXT;
ALTER TABLE rooms ADD COLUMN images               TEXT NOT NULL DEFAULT '[]';
ALTER TABLE rooms ADD COLUMN short_description    TEXT;
ALTER TABLE rooms ADD COLUMN capacity             TEXT;
ALTER TABLE rooms ADD COLUMN facilities           TEXT NOT NULL DEFAULT '[]';
ALTER TABLE rooms ADD COLUMN equipment_highlights TEXT NOT NULL DEFAULT '[]';
