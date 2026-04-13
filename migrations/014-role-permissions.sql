-- Tabel untuk menyimpan permissions per role secara dinamis
CREATE TABLE IF NOT EXISTS role_permissions (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  role       TEXT NOT NULL,      -- 'booking_admin' | 'inventory_admin' | 'manager'
  resource   TEXT NOT NULL,      -- 'bookings' | 'rooms' | 'inventory' | 'users' | 'reports' | 'settings'
  level      TEXT NOT NULL,      -- 'none' | 'read' | 'write'
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_by TEXT,
  UNIQUE(role, resource)
);

-- Tabel untuk menyimpan "permission version" — increment setiap ada perubahan
-- FE akan polling/compare versi ini untuk trigger auto logout
CREATE TABLE IF NOT EXISTS permission_version (
  id         INTEGER PRIMARY KEY CHECK (id = 1),  -- hanya 1 row
  version    INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_by TEXT
);

-- Insert initial version
INSERT OR IGNORE INTO permission_version (id, version) VALUES (1, 1);

-- Seed default permissions (TANPA superadmin — superadmin selalu locked full access)
INSERT OR IGNORE INTO role_permissions (role, resource, level) VALUES
  -- booking_admin
  ('booking_admin', 'bookings',  'write'),
  ('booking_admin', 'rooms',     'write'),
  ('booking_admin', 'inventory', 'none'),
  ('booking_admin', 'users',     'none'),
  ('booking_admin', 'reports',   'none'),
  ('booking_admin', 'settings',  'none'),
  -- inventory_admin
  ('inventory_admin', 'bookings',  'read'),
  ('inventory_admin', 'rooms',     'read'),
  ('inventory_admin', 'inventory', 'write'),
  ('inventory_admin', 'users',     'none'),
  ('inventory_admin', 'reports',   'none'),
  ('inventory_admin', 'settings',  'none'),
  -- manager
  ('manager', 'bookings',  'read'),
  ('manager', 'rooms',     'read'),
  ('manager', 'inventory', 'read'),
  ('manager', 'users',     'none'),
  ('manager', 'reports',   'read'),
  ('manager', 'settings',  'none');
