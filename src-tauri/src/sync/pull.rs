use rusqlite::{Connection, params};
use serde_json::{Value, json};
use std::process::Command;
use chrono::Utc;

const SUPABASE_URL: &str = "https://vddfghfvmnrbotmxhvvi.supabase.co";
const SUPABASE_KEY: &str = "sb_publishable_xHQlpSPtA0H75GuESG3o7A_A3evq_vv";

#[derive(Debug)]
pub struct SyncError(pub String);

impl std::fmt::Display for SyncError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "SyncError: {}", self.0)
    }
}

impl From<rusqlite::Error> for SyncError {
    fn from(e: rusqlite::Error) -> Self {
        SyncError(e.to_string())
    }
}

impl From<serde_json::Error> for SyncError {
    fn from(e: serde_json::Error) -> Self {
        SyncError(e.to_string())
    }
}

/// Perform a GET request against the Supabase REST API using curl.
/// Returns the parsed JSON body or a SyncError.
fn supabase_get(path: &str, access_token: &str) -> Result<Value, SyncError> {
    let url = format!("{}{}", SUPABASE_URL, path);

    let output = Command::new("curl")
        .args([
            "--silent",
            "--fail-with-body",
            "--max-time", "30",
            "--header", &format!("apikey: {}", SUPABASE_KEY),
            "--header", &format!("Authorization: Bearer {}", access_token),
            "--header", "Accept: application/json",
            "--header", "Prefer: return=representation",
            &url,
        ])
        .output()
        .map_err(|e| SyncError(format!("curl spawn error: {}", e)))?;

    if !output.status.success() {
        let body = String::from_utf8_lossy(&output.stderr);
        let stdout = String::from_utf8_lossy(&output.stdout);
        return Err(SyncError(format!(
            "curl failed (exit {}): {} | {}",
            output.status.code().unwrap_or(-1),
            body,
            stdout
        )));
    }

    let body = String::from_utf8_lossy(&output.stdout);
    let json: Value = serde_json::from_str(&body)
        .map_err(|e| SyncError(format!("JSON parse error: {} — body: {}", e, &body[..body.len().min(200)])))?;

    Ok(json)
}

/// Perform a PATCH / POST against Supabase REST API for outbox flushing.
fn supabase_upsert(table: &str, payload: &Value, access_token: &str) -> Result<(), SyncError> {
    let url = format!("{}/rest/v1/{}", SUPABASE_URL, table);
    let body_str = serde_json::to_string(payload)?;

    let output = Command::new("curl")
        .args([
            "--silent",
            "--fail-with-body",
            "--max-time", "30",
            "-X", "POST",
            "--header", &format!("apikey: {}", SUPABASE_KEY),
            "--header", &format!("Authorization: Bearer {}", access_token),
            "--header", "Content-Type: application/json",
            "--header", "Prefer: resolution=merge-duplicates,return=minimal",
            "--data", &body_str,
            &url,
        ])
        .output()
        .map_err(|e| SyncError(format!("curl spawn error: {}", e)))?;

    if !output.status.success() {
        let body = String::from_utf8_lossy(&output.stderr);
        let stdout = String::from_utf8_lossy(&output.stdout);
        return Err(SyncError(format!(
            "upsert failed (exit {}): {} | {}",
            output.status.code().unwrap_or(-1),
            body,
            stdout
        )));
    }

    Ok(())
}

/// Pull all leads from Supabase and upsert into local SQLite.
fn pull_leads(conn: &Connection, access_token: &str) -> Result<usize, SyncError> {
    let data = supabase_get("/rest/v1/leads?select=*&order=updated_at.desc", access_token)?;
    let rows = data.as_array().ok_or_else(|| SyncError("leads: expected array".into()))?;

    let mut count = 0usize;
    for row in rows {
        let id = row["id"].as_i64().unwrap_or(0);
        if id == 0 { continue; }

        conn.execute(
            "INSERT OR REPLACE INTO leads (
                id, full_name, email, phone, pipeline_stage, status, priority,
                warmth, budget, interest_type, location, source, notes, personal_notes,
                next_action, preferred_channel, preferred_language, assigned_to,
                synced, deleted_at, created_at, updated_at
            ) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?17,?18,1,?19,?20,?21)",
            params![
                id,
                row["full_name"].as_str().unwrap_or(""),
                row["email"].as_str(),
                row["phone"].as_str(),
                row["pipeline_stage"].as_str().unwrap_or("lead"),
                row["status"].as_str().unwrap_or("new"),
                row["priority"].as_str().unwrap_or("medium"),
                row["warmth"].as_i64(),
                row["budget"].as_f64(),
                row["interest_type"].as_str(),
                row["location"].as_str(),
                row["source"].as_str(),
                row["notes"].as_str(),
                row["personal_notes"].as_str(),
                row["next_action"].as_str(),
                row["preferred_channel"].as_str(),
                row["preferred_language"].as_str(),
                row["assigned_to"].as_str(),
                row["deleted_at"].as_str(),
                row["created_at"].as_str(),
                row["updated_at"].as_str(),
            ],
        )?;
        count += 1;
    }

    update_sync_state(conn, "leads")?;
    Ok(count)
}

/// Pull all tasks from Supabase and upsert into local SQLite.
fn pull_tasks(conn: &Connection, access_token: &str) -> Result<usize, SyncError> {
    let data = supabase_get("/rest/v1/tasks?select=*&order=updated_at.desc", access_token)?;
    let rows = data.as_array().ok_or_else(|| SyncError("tasks: expected array".into()))?;

    let mut count = 0usize;
    for row in rows {
        let id = row["id"].as_i64().unwrap_or(0);
        if id == 0 { continue; }

        conn.execute(
            "INSERT OR REPLACE INTO tasks (
                id, title, description, notes, due_date, status, priority, task_type,
                lead_id, assigned_to, created_by, completed_at,
                synced, deleted_at, created_at, updated_at
            ) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,1,?13,?14,?15)",
            params![
                id,
                row["title"].as_str().unwrap_or(""),
                row["description"].as_str(),
                row["notes"].as_str(),
                row["due_date"].as_str(),
                row["status"].as_str().unwrap_or("open"),
                row["priority"].as_str().unwrap_or("medium"),
                row["task_type"].as_str(),
                row["lead_id"].as_i64(),
                row["assigned_to"].as_str(),
                row["created_by"].as_str(),
                row["completed_at"].as_str(),
                row["deleted_at"].as_str(),
                row["created_at"].as_str(),
                row["updated_at"].as_str(),
            ],
        )?;
        count += 1;
    }

    update_sync_state(conn, "tasks")?;
    Ok(count)
}

/// Pull all properties from Supabase and upsert into local SQLite.
fn pull_properties(conn: &Connection, access_token: &str) -> Result<usize, SyncError> {
    let data = supabase_get("/rest/v1/properties?select=*&order=updated_at.desc", access_token)?;
    let rows = data.as_array().ok_or_else(|| SyncError("properties: expected array".into()))?;

    let mut count = 0usize;
    for row in rows {
        let id = row["id"].as_i64().unwrap_or(0);
        if id == 0 { continue; }

        conn.execute(
            "INSERT OR REPLACE INTO properties (
                id, title, property_type, offer_type, status, address, city, province,
                price, size_m2, rooms, bathrooms, lead_id, description, notes,
                synced, deleted_at, created_at, updated_at
            ) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,1,?16,?17,?18)",
            params![
                id,
                row["title"].as_str(),
                row["property_type"].as_str(),
                row["offer_type"].as_str(),
                row["status"].as_str().unwrap_or("available"),
                row["address"].as_str(),
                row["city"].as_str(),
                row["province"].as_str(),
                row["price"].as_f64(),
                row["size_m2"].as_f64(),
                row["rooms"].as_i64(),
                row["bathrooms"].as_i64(),
                row["lead_id"].as_i64(),
                row["description"].as_str(),
                row["notes"].as_str(),
                row["deleted_at"].as_str(),
                row["created_at"].as_str(),
                row["updated_at"].as_str(),
            ],
        )?;
        count += 1;
    }

    update_sync_state(conn, "properties")?;
    Ok(count)
}

/// Pull all call_logs from Supabase and upsert into local SQLite.
fn pull_call_logs(conn: &Connection, access_token: &str) -> Result<usize, SyncError> {
    let data = supabase_get("/rest/v1/call_logs?select=*&order=called_at.desc", access_token)?;
    let rows = data.as_array().ok_or_else(|| SyncError("call_logs: expected array".into()))?;

    let mut count = 0usize;
    for row in rows {
        let id = row["id"].as_i64().unwrap_or(0);
        if id == 0 { continue; }

        conn.execute(
            "INSERT OR REPLACE INTO call_logs (
                id, lead_id, direction, duration_sec, outcome, notes,
                called_at, created_by, synced, created_at
            ) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,1,?9)",
            params![
                id,
                row["lead_id"].as_i64(),
                row["direction"].as_str(),
                row["duration_sec"].as_i64(),
                row["outcome"].as_str(),
                row["notes"].as_str(),
                row["called_at"].as_str(),
                row["created_by"].as_str(),
                row["created_at"].as_str(),
            ],
        )?;
        count += 1;
    }

    update_sync_state(conn, "call_logs")?;
    Ok(count)
}

/// Pull time_entries for a specific user from Supabase.
fn pull_time_entries(conn: &Connection, access_token: &str, user_id: &str) -> Result<usize, SyncError> {
    let path = format!(
        "/rest/v1/time_entries?select=*&order=created_at.desc&user_id=eq.{}",
        user_id
    );
    let data = supabase_get(&path, access_token)?;
    let rows = data.as_array().ok_or_else(|| SyncError("time_entries: expected array".into()))?;

    let mut count = 0usize;
    for row in rows {
        let id = row["id"].as_i64().unwrap_or(0);
        if id == 0 { continue; }

        conn.execute(
            "INSERT OR REPLACE INTO time_entries (
                id, user_id, date, start_time, end_time, started_at, ended_at,
                activity, status, note, duration_minutes, total_hours,
                break_mode, category_id, synced, created_at
            ) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,1,?15)",
            params![
                id,
                row["user_id"].as_str(),
                row["date"].as_str(),
                row["start_time"].as_str(),
                row["end_time"].as_str(),
                row["started_at"].as_str(),
                row["ended_at"].as_str(),
                row["activity"].as_str(),
                row["status"].as_str().unwrap_or("active"),
                row["note"].as_str(),
                row["duration_minutes"].as_i64(),
                row["total_hours"].as_f64(),
                row["break_mode"].as_str(),
                row["category_id"].as_str(),
                row["created_at"].as_str(),
            ],
        )?;
        count += 1;
    }

    update_sync_state(conn, "time_entries")?;
    Ok(count)
}

/// Update sync_state timestamp for a table.
fn update_sync_state(conn: &Connection, table_name: &str) -> Result<(), SyncError> {
    let now = Utc::now().to_rfc3339();
    conn.execute(
        "INSERT OR REPLACE INTO sync_state (table_name, last_synced_at) VALUES (?1, ?2)",
        params![table_name, now],
    )?;
    Ok(())
}

/// Flush local outbox entries to Supabase.
pub fn flush_outbox(conn: &Connection, access_token: &str) -> Result<usize, SyncError> {
    let mut stmt = conn.prepare(
        "SELECT id, table_name, record_id, operation, payload
         FROM outbox
         WHERE attempts < 5
         ORDER BY created_at ASC
         LIMIT 50",
    )?;

    struct OutboxEntry {
        id: String,
        table_name: String,
        operation: String,
        payload: String,
    }

    let entries: Vec<OutboxEntry> = stmt
        .query_map([], |row| {
            Ok(OutboxEntry {
                id: row.get(0)?,
                table_name: row.get(1)?,
                operation: row.get(2)?,
                payload: row.get(4)?,
            })
        })?
        .filter_map(|r| r.ok())
        .collect();

    let mut flushed = 0usize;

    for entry in entries {
        let payload: Value = match serde_json::from_str(&entry.payload) {
            Ok(v) => v,
            Err(e) => {
                eprintln!("outbox payload parse error for {}: {}", entry.id, e);
                conn.execute(
                    "UPDATE outbox SET attempts = attempts + 1 WHERE id = ?1",
                    params![entry.id],
                )?;
                continue;
            }
        };

        let result = match entry.operation.as_str() {
            "upsert" | "insert" | "update" => {
                supabase_upsert(&entry.table_name, &payload, access_token)
            }
            "delete" => {
                // Soft-delete: patch deleted_at
                supabase_upsert(&entry.table_name, &payload, access_token)
            }
            op => Err(SyncError(format!("unknown operation: {}", op))),
        };

        match result {
            Ok(_) => {
                conn.execute("DELETE FROM outbox WHERE id = ?1", params![entry.id])?;
                // Mark the local record as synced
                let record_id = payload["id"].as_i64().unwrap_or(0);
                if record_id > 0 {
                    let _ = conn.execute(
                        &format!("UPDATE {} SET synced = 1 WHERE id = ?1", entry.table_name),
                        params![record_id],
                    );
                }
                flushed += 1;
            }
            Err(e) => {
                eprintln!("outbox flush error for {}: {}", entry.id, e);
                conn.execute(
                    "UPDATE outbox SET attempts = attempts + 1 WHERE id = ?1",
                    params![entry.id],
                )?;
            }
        }
    }

    Ok(flushed)
}

/// Main pull function: syncs all tables then flushes outbox.
/// Returns a summary JSON value.
pub fn pull_all(conn: &Connection, access_token: &str, user_id: &str) -> Result<Value, SyncError> {
    let leads_count = pull_leads(conn, access_token)
        .unwrap_or_else(|e| { eprintln!("pull_leads error: {}", e); 0 });

    let tasks_count = pull_tasks(conn, access_token)
        .unwrap_or_else(|e| { eprintln!("pull_tasks error: {}", e); 0 });

    let properties_count = pull_properties(conn, access_token)
        .unwrap_or_else(|e| { eprintln!("pull_properties error: {}", e); 0 });

    let call_logs_count = pull_call_logs(conn, access_token)
        .unwrap_or_else(|e| { eprintln!("pull_call_logs error: {}", e); 0 });

    let time_entries_count = if !user_id.is_empty() {
        pull_time_entries(conn, access_token, user_id)
            .unwrap_or_else(|e| { eprintln!("pull_time_entries error: {}", e); 0 })
    } else {
        0
    };

    let flushed_count = flush_outbox(conn, access_token)
        .unwrap_or_else(|e| { eprintln!("flush_outbox error: {}", e); 0 });

    Ok(json!({
        "ok": true,
        "synced_at": Utc::now().to_rfc3339(),
        "leads": leads_count,
        "tasks": tasks_count,
        "properties": properties_count,
        "call_logs": call_logs_count,
        "time_entries": time_entries_count,
        "outbox_flushed": flushed_count
    }))
}

/// Tauri command: trigger a full sync.
#[tauri::command]
pub async fn sync_now(
    access_token: String,
    user_id: String,
    db_path: String,
) -> Result<serde_json::Value, String> {
    let conn = Connection::open(&db_path).map_err(|e| e.to_string())?;
    pull_all(&conn, &access_token, &user_id).map_err(|e| e.0)
}

/// Tauri command: get outbox count.
#[tauri::command]
pub async fn get_outbox_count(db_path: String) -> Result<i64, String> {
    let conn = Connection::open(&db_path).map_err(|e| e.to_string())?;
    let count: i64 = conn
        .query_row("SELECT COUNT(*) FROM outbox", [], |row| row.get(0))
        .map_err(|e| e.to_string())?;
    Ok(count)
}

/// Tauri command: get last sync timestamp.
#[tauri::command]
pub async fn get_last_sync(db_path: String) -> Result<Option<String>, String> {
    let conn = Connection::open(&db_path).map_err(|e| e.to_string())?;
    let result: rusqlite::Result<Option<String>> = conn.query_row(
        "SELECT MIN(last_synced_at) FROM sync_state WHERE last_synced_at IS NOT NULL",
        [],
        |row| row.get(0),
    );
    result.map_err(|e| e.to_string())
}
