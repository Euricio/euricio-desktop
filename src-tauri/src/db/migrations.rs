use tauri_plugin_sql::{Migration, MigrationKind};

pub struct AllMigrations {
    pub crm: Vec<Migration>,
    pub auth: Vec<Migration>,
    pub cache: Vec<Migration>,
}

pub fn all() -> AllMigrations {
    AllMigrations {
        crm: crm_migrations(),
        auth: auth_migrations(),
        cache: cache_migrations(),
    }
}

fn crm_migrations() -> Vec<Migration> {
    vec![Migration {
        version: 1,
        description: "create_core_domain_tables",
        sql: "
CREATE TABLE IF NOT EXISTS contacts (
  id TEXT PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  phone_alt TEXT,
  company TEXT,
  notes TEXT,
  owner_id TEXT,
  synced_at INTEGER,
  local_updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
  server_updated_at INTEGER,
  deleted_at INTEGER,
  sync_status TEXT NOT NULL DEFAULT 'synced'
    CHECK(sync_status IN ('synced','pending','conflict','error'))
);
CREATE INDEX IF NOT EXISTS idx_contacts_phone ON contacts(phone);
CREATE INDEX IF NOT EXISTS idx_contacts_sync ON contacts(sync_status);

CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT,
  phone TEXT,
  email TEXT,
  source TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  property_id TEXT,
  owner_id TEXT,
  synced_at INTEGER,
  local_updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
  server_updated_at INTEGER,
  deleted_at INTEGER,
  sync_status TEXT NOT NULL DEFAULT 'synced'
);
CREATE INDEX IF NOT EXISTS idx_leads_phone ON leads(phone);

CREATE TABLE IF NOT EXISTS properties (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  address TEXT,
  city TEXT,
  price REAL,
  status TEXT NOT NULL DEFAULT 'active',
  owner_id TEXT,
  synced_at INTEGER,
  local_updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
  server_updated_at INTEGER,
  deleted_at INTEGER,
  sync_status TEXT NOT NULL DEFAULT 'synced'
);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  due_date INTEGER,
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'open',
  assignee_id TEXT,
  contact_id TEXT,
  lead_id TEXT,
  property_id TEXT,
  synced_at INTEGER,
  local_updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
  server_updated_at INTEGER,
  deleted_at INTEGER,
  sync_status TEXT NOT NULL DEFAULT 'synced'
);

CREATE TABLE IF NOT EXISTS activities (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  description TEXT,
  occurred_at INTEGER NOT NULL,
  contact_id TEXT,
  lead_id TEXT,
  property_id TEXT,
  user_id TEXT,
  metadata TEXT,
  synced_at INTEGER,
  local_updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
  server_updated_at INTEGER,
  sync_status TEXT NOT NULL DEFAULT 'synced'
);

CREATE TABLE IF NOT EXISTS sync_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  operation TEXT NOT NULL CHECK(operation IN ('create','update','delete')),
  payload TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
  attempts INTEGER NOT NULL DEFAULT 0,
  last_attempt_at INTEGER,
  last_error TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK(status IN ('pending','processing','failed','done'))
);
CREATE INDEX IF NOT EXISTS idx_sync_queue_pending
  ON sync_queue(status, created_at) WHERE status = 'pending';

CREATE TABLE IF NOT EXISTS sync_state (
  id INTEGER PRIMARY KEY CHECK(id = 1),
  last_bootstrap_at INTEGER,
  last_pull_at INTEGER,
  last_push_at INTEGER,
  server_cursor TEXT,
  device_id TEXT NOT NULL DEFAULT '',
  is_online INTEGER NOT NULL DEFAULT 0,
  sync_in_progress INTEGER NOT NULL DEFAULT 0
);
INSERT OR IGNORE INTO sync_state (id, device_id) VALUES (1, '');

CREATE TABLE IF NOT EXISTS call_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  phone_number TEXT NOT NULL,
  direction TEXT NOT NULL CHECK(direction IN ('inbound','outbound')),
  resolved_contact_id TEXT,
  resolved_lead_id TEXT,
  status TEXT NOT NULL DEFAULT 'ringing',
  started_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
  answered_at INTEGER,
  ended_at INTEGER,
  duration_seconds INTEGER,
  source TEXT,
  raw_payload TEXT
);
CREATE INDEX IF NOT EXISTS idx_call_events_phone ON call_events(phone_number);
        ",
        kind: MigrationKind::Up,
    }]
}

fn auth_migrations() -> Vec<Migration> {
    vec![Migration {
        version: 1,
        description: "create_session_table",
        sql: "
CREATE TABLE IF NOT EXISTS session (
  id INTEGER PRIMARY KEY CHECK(id = 1),
  user_id TEXT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  email TEXT NOT NULL
);
        ",
        kind: MigrationKind::Up,
    }]
}

fn cache_migrations() -> Vec<Migration> {
    vec![Migration {
        version: 1,
        description: "create_cache_tables",
        sql: "
CREATE TABLE IF NOT EXISTS phone_lookup_cache (
  phone_normalized TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  display_name TEXT NOT NULL,
  cached_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
);

CREATE TABLE IF NOT EXISTS event_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category TEXT NOT NULL,
  level TEXT NOT NULL DEFAULT 'info'
    CHECK(level IN ('debug','info','warn','error')),
  message TEXT NOT NULL,
  metadata TEXT,
  occurred_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
);
CREATE INDEX IF NOT EXISTS idx_event_log_cat ON event_log(category, occurred_at);
        ",
        kind: MigrationKind::Up,
    }]
}
