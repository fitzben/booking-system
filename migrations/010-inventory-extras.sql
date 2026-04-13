-- Migration 010: inventory extras (photo, service & warranty dates)

ALTER TABLE inventory ADD COLUMN photo_url     TEXT;
ALTER TABLE inventory ADD COLUMN photo_key     TEXT;
ALTER TABLE inventory ADD COLUMN service_date  TEXT;  -- YYYY-MM-DD, tanggal masuk servis
ALTER TABLE inventory ADD COLUMN warranty_date TEXT;  -- YYYY-MM-DD, tanggal berakhir garansi
