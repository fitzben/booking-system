-- Session tokens untuk admin auth (menggantikan Basic-Auth via localStorage)
-- Token dikirim via HTTP-only cookie, tidak pernah disimpan di localStorage

CREATE TABLE IF NOT EXISTS sessions (
  token      TEXT    PRIMARY KEY,
  username   TEXT    NOT NULL,
  expires_at INTEGER NOT NULL   -- Unix timestamp (detik)
);

CREATE INDEX IF NOT EXISTS idx_sessions_username   ON sessions (username);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions (expires_at);
