use tauri_plugin_sql::Migration;

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
    vec![
        Migration {
            version: 1,
            description: "create_contacts",
            sql: "
                CREATE TABLE IF NOT EXISTS contacts (
                    id          TEXT PRIMARY KEY,
                    remote_id   TEXT UNIQUE,
                    first_name  TEXT NOT NULL DEFAULT '',
                    last_name   TEXT NOT NULL DEFAULT '',
                    email       TEXT,
                    phone       TEXT,
                    mobile      TEXT,
                    company     TEXT,
                    address     TEXT,
                    city        TEXT,
                    country     TEXT DEFAULT 'ES',
                    notes       TEXT,
                    avatar_url  TEXT,
                    tags        TEXT DEFAULT '[]',
                    status      TEXT NOT NULL DEFAULT 'active',
                    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
                    updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
                    synced_at   TEXT,
                    deleted_at  TEXT
                );
                CREATE INDEX IF NOT EXISTS idx_contacts_remote_id ON contacts(remote_id);
                CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);
                CREATE INDEX IF NOT EXISTS idx_contacts_status ON contacts(status);
            ",
            kind: tauri_plugin_sql::MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "create_tasks",
            sql: "
                CREATE TABLE IF NOT EXISTS tasks (
                    id           TEXT PRIMARY KEY,
                    remote_id    TEXT UNIQUE,
                    contact_id   TEXT REFERENCES contacts(id),
                    title        TEXT NOT NULL,
                    description  TEXT,
                    due_date     TEXT,
                    priority     TEXT NOT NULL DEFAULT 'medium',
                    status       TEXT NOT NULL DEFAULT 'pending',
                    assigned_to  TEXT,
                    created_by   TEXT,
                    created_at   TEXT NOT NULL DEFAULT (datetime('now')),
                    updated_at   TEXT NOT NULL DEFAULT (datetime('now')),
                    synced_at    TEXT,
                    deleted_at   TEXT
                );
                CREATE INDEX IF NOT EXISTS idx_tasks_contact_id ON tasks(contact_id);
                CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
                CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
            ",
            kind: tauri_plugin_sql::MigrationKind::Up,
        },
        Migration {
            version: 3,
            description: "create_notes",
            sql: "
                CREATE TABLE IF NOT EXISTS notes (
                    id          TEXT PRIMARY KEY,
                    remote_id   TEXT UNIQUE,
                    contact_id  TEXT REFERENCES contacts(id),
                    task_id     TEXT REFERENCES tasks(id),
                    content     TEXT NOT NULL,
                    created_by  TEXT,
                    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
                    updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
                    synced_at   TEXT,
                    deleted_at  TEXT
                );
                CREATE INDEX IF NOT EXISTS idx_notes_contact_id ON notes(contact_id);
            ",
            kind: tauri_plugin_sql::MigrationKind::Up,
        },
        Migration {
            version: 4,
            description: "create_outbox",
            sql: "
                CREATE TABLE IF NOT EXISTS outbox (
                    id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
                    entity_type TEXT NOT NULL,
                    entity_id   TEXT NOT NULL,
                    operation   TEXT NOT NULL,
                    payload     TEXT NOT NULL DEFAULT '{}',
                    attempts    INTEGER NOT NULL DEFAULT 0,
                    last_error  TEXT,
                    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
                );
                CREATE INDEX IF NOT EXISTS idx_outbox_entity ON outbox(entity_type, entity_id);
            ",
            kind: tauri_plugin_sql::MigrationKind::Up,
        },
    ]
}

fn auth_migrations() -> Vec<Migration> {
    vec![
        Migration {
            version: 1,
            description: "create_session",
            sql: "
                CREATE TABLE IF NOT EXISTS session (
                    id            INTEGER PRIMARY KEY CHECK (id = 1),
                    user_id       TEXT NOT NULL,
                    email         TEXT NOT NULL,
                    full_name     TEXT,
                    avatar_url    TEXT,
                    access_token  TEXT NOT NULL,
                    refresh_token TEXT NOT NULL,
                    expires_at    TEXT NOT NULL,
                    created_at    TEXT NOT NULL DEFAULT (datetime('now')),
                    updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
                );
            ",
            kind: tauri_plugin_sql::MigrationKind::Up,
        },
    ]
}

fn cache_migrations() -> Vec<Migration> {
    vec![
        Migration {
            version: 1,
            description: "create_settings",
            sql: "
                CREATE TABLE IF NOT EXISTS settings (
                    key        TEXT PRIMARY KEY,
                    value      TEXT NOT NULL,
                    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
                );

                INSERT OR IGNORE INTO settings (key, value) VALUES
                    ('language', 'es'),
                    ('sync_interval_seconds', '30'),
                    ('notifications_enabled', 'true'),
                    ('theme', 'light'),
                    ('api_url', 'https://euricio-crm.fly.dev');
            ",
            kind: tauri_plugin_sql::MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "create_sync_state",
            sql: "
                CREATE TABLE IF NOT EXISTS sync_state (
                    entity_type     TEXT PRIMARY KEY,
                    last_synced_at  TEXT,
                    last_cursor     TEXT,
                    status          TEXT NOT NULL DEFAULT 'idle',
                    error           TEXT
                );

                INSERT OR IGNORE INTO sync_state (entity_type) VALUES
                    ('contacts'),
                    ('tasks'),
                    ('notes');
            ",
            kind: tauri_plugin_sql::MigrationKind::Up,
        },
    ]
}
