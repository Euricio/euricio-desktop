use rusqlite::{Connection, Result};

pub fn run_migrations(conn: &Connection) -> Result<()> {
    conn.execute_batch(
        "PRAGMA journal_mode=WAL;
         PRAGMA foreign_keys=ON;",
    )?;

    conn.execute_batch("
        CREATE TABLE IF NOT EXISTS leads (
            id INTEGER PRIMARY KEY,
            full_name TEXT NOT NULL,
            email TEXT,
            phone TEXT,
            pipeline_stage TEXT DEFAULT 'lead',
            status TEXT DEFAULT 'new',
            priority TEXT DEFAULT 'medium',
            warmth INTEGER,
            budget REAL,
            interest_type TEXT,
            location TEXT,
            source TEXT,
            notes TEXT,
            personal_notes TEXT,
            next_action TEXT,
            preferred_channel TEXT,
            preferred_language TEXT,
            assigned_to TEXT,
            synced INTEGER DEFAULT 0,
            deleted_at TEXT,
            created_at TEXT,
            updated_at TEXT
        );

        CREATE TABLE IF NOT EXISTS tasks (
            id INTEGER PRIMARY KEY,
            title TEXT NOT NULL,
            description TEXT,
            notes TEXT,
            due_date TEXT,
            status TEXT DEFAULT 'open',
            priority TEXT DEFAULT 'medium',
            task_type TEXT,
            lead_id INTEGER,
            assigned_to TEXT,
            created_by TEXT,
            completed_at TEXT,
            synced INTEGER DEFAULT 0,
            deleted_at TEXT,
            created_at TEXT,
            updated_at TEXT
        );

        CREATE TABLE IF NOT EXISTS properties (
            id INTEGER PRIMARY KEY,
            title TEXT,
            property_type TEXT,
            offer_type TEXT,
            status TEXT DEFAULT 'available',
            address TEXT,
            city TEXT,
            province TEXT,
            price REAL,
            size_m2 REAL,
            rooms INTEGER,
            bathrooms INTEGER,
            lead_id INTEGER,
            description TEXT,
            notes TEXT,
            synced INTEGER DEFAULT 0,
            deleted_at TEXT,
            created_at TEXT,
            updated_at TEXT
        );

        CREATE TABLE IF NOT EXISTS call_logs (
            id INTEGER PRIMARY KEY,
            lead_id INTEGER,
            direction TEXT,
            duration_sec INTEGER,
            outcome TEXT,
            notes TEXT,
            called_at TEXT,
            created_by TEXT,
            synced INTEGER DEFAULT 0,
            created_at TEXT
        );

        CREATE TABLE IF NOT EXISTS time_entries (
            id INTEGER PRIMARY KEY,
            user_id TEXT,
            date TEXT,
            start_time TEXT,
            end_time TEXT,
            started_at TEXT,
            ended_at TEXT,
            activity TEXT,
            status TEXT DEFAULT 'active',
            note TEXT,
            duration_minutes INTEGER,
            total_hours REAL,
            break_mode TEXT,
            category_id TEXT,
            synced INTEGER DEFAULT 0,
            created_at TEXT
        );

        CREATE TABLE IF NOT EXISTS outbox (
            id TEXT PRIMARY KEY,
            table_name TEXT NOT NULL,
            record_id TEXT NOT NULL,
            operation TEXT NOT NULL,
            payload TEXT NOT NULL,
            attempts INTEGER DEFAULT 0,
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS sync_state (
            table_name TEXT PRIMARY KEY,
            last_synced_at TEXT,
            last_cursor TEXT
        );
    ")?;

    // Indexes for performance
    conn.execute_batch("
        CREATE INDEX IF NOT EXISTS idx_leads_pipeline_stage ON leads(pipeline_stage);
        CREATE INDEX IF NOT EXISTS idx_leads_updated_at ON leads(updated_at);
        CREATE INDEX IF NOT EXISTS idx_leads_deleted_at ON leads(deleted_at);
        CREATE INDEX IF NOT EXISTS idx_tasks_lead_id ON tasks(lead_id);
        CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
        CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
        CREATE INDEX IF NOT EXISTS idx_tasks_deleted_at ON tasks(deleted_at);
        CREATE INDEX IF NOT EXISTS idx_properties_lead_id ON properties(lead_id);
        CREATE INDEX IF NOT EXISTS idx_properties_deleted_at ON properties(deleted_at);
        CREATE INDEX IF NOT EXISTS idx_call_logs_lead_id ON call_logs(lead_id);
        CREATE INDEX IF NOT EXISTS idx_call_logs_called_at ON call_logs(called_at);
        CREATE INDEX IF NOT EXISTS idx_time_entries_user_id ON time_entries(user_id);
        CREATE INDEX IF NOT EXISTS idx_time_entries_date ON time_entries(date);
        CREATE INDEX IF NOT EXISTS idx_outbox_created_at ON outbox(created_at);
    ")?;

    // Initialize sync_state rows for each table
    conn.execute_batch("
        INSERT OR IGNORE INTO sync_state (table_name, last_synced_at, last_cursor)
            VALUES ('leads', NULL, NULL);
        INSERT OR IGNORE INTO sync_state (table_name, last_synced_at, last_cursor)
            VALUES ('tasks', NULL, NULL);
        INSERT OR IGNORE INTO sync_state (table_name, last_synced_at, last_cursor)
            VALUES ('properties', NULL, NULL);
        INSERT OR IGNORE INTO sync_state (table_name, last_synced_at, last_cursor)
            VALUES ('call_logs', NULL, NULL);
        INSERT OR IGNORE INTO sync_state (table_name, last_synced_at, last_cursor)
            VALUES ('time_entries', NULL, NULL);
    ")?;

    Ok(())
}
