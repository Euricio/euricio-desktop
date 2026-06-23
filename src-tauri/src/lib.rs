use tauri::{Manager, Listener};

mod db;
mod deep_link;
mod i18n;
mod sync;
mod tray;

rust_i18n::i18n!("i18n", fallback = "es");

/// Resolve (and create) the app data directory where `crm.db` lives.
#[tauri::command]
fn get_app_data_dir(app: tauri::AppHandle) -> Result<String, String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.to_string_lossy().to_string())
}

/// Generic row counter
#[tauri::command]
fn count_table(db_path: String, table: String, filter: String) -> Result<i64, String> {
    let conn = rusqlite::Connection::open(&db_path).map_err(|e| e.to_string())?;
    let sql = if filter.is_empty() {
        format!("SELECT COUNT(*) FROM {}", table)
    } else {
        format!("SELECT COUNT(*) FROM {} WHERE {}", table, filter)
    };
    let count: i64 = conn.query_row(&sql, [], |r| r.get(0)).map_err(|e| e.to_string())?;
    Ok(count)
}

/// Get all leads as JSON
#[tauri::command]
fn get_leads(db_path: String) -> Result<Vec<serde_json::Value>, String> {
    let conn = rusqlite::Connection::open(&db_path).map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare(
        "SELECT id, full_name, email, phone, pipeline_stage, status, priority, warmth, budget, interest_type, location, source, notes, personal_notes, next_action, preferred_channel, assigned_to, created_at, updated_at FROM leads ORDER BY created_at DESC"
    ).map_err(|e| e.to_string())?;
    let rows = stmt.query_map([], |row| {
        Ok(serde_json::json!({
            "id": row.get::<_,i64>(0).unwrap_or(0),
            "full_name": row.get::<_,String>(1).unwrap_or_default(),
            "email": row.get::<_,Option<String>>(2).unwrap_or(None),
            "phone": row.get::<_,Option<String>>(3).unwrap_or(None),
            "pipeline_stage": row.get::<_,Option<String>>(4).unwrap_or(None),
            "status": row.get::<_,Option<String>>(5).unwrap_or(None),
            "priority": row.get::<_,Option<String>>(6).unwrap_or(None),
            "warmth": row.get::<_,Option<i64>>(7).unwrap_or(None),
            "budget": row.get::<_,Option<f64>>(8).unwrap_or(None),
            "interest_type": row.get::<_,Option<String>>(9).unwrap_or(None),
            "location": row.get::<_,Option<String>>(10).unwrap_or(None),
            "source": row.get::<_,Option<String>>(11).unwrap_or(None),
            "notes": row.get::<_,Option<String>>(12).unwrap_or(None),
            "personal_notes": row.get::<_,Option<String>>(13).unwrap_or(None),
            "next_action": row.get::<_,Option<String>>(14).unwrap_or(None),
            "preferred_channel": row.get::<_,Option<String>>(15).unwrap_or(None),
            "assigned_to": row.get::<_,Option<String>>(16).unwrap_or(None),
            "created_at": row.get::<_,Option<String>>(17).unwrap_or(None),
            "updated_at": row.get::<_,Option<String>>(18).unwrap_or(None),
        }))
    }).map_err(|e| e.to_string())?;
    let result: Result<Vec<_>, _> = rows.collect();
    result.map_err(|e| e.to_string())
}

/// Simplified leads list (id + full_name only)
#[tauri::command]
fn get_leads_simple(db_path: String) -> Result<Vec<serde_json::Value>, String> {
    let conn = rusqlite::Connection::open(&db_path).map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare("SELECT id, full_name FROM leads ORDER BY full_name ASC").map_err(|e| e.to_string())?;
    let rows = stmt.query_map([], |row| {
        Ok(serde_json::json!({
            "id": row.get::<_,i64>(0).unwrap_or(0),
            "full_name": row.get::<_,String>(1).unwrap_or_default(),
        }))
    }).map_err(|e| e.to_string())?;
    let result: Result<Vec<_>, _> = rows.collect();
    result.map_err(|e| e.to_string())
}

/// Stage counts for pipeline/dashboard
#[tauri::command]
fn get_stage_counts(db_path: String) -> Result<Vec<serde_json::Value>, String> {
    let conn = rusqlite::Connection::open(&db_path).map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare(
        "SELECT pipeline_stage, COUNT(*) as count FROM leads WHERE pipeline_stage IS NOT NULL GROUP BY pipeline_stage ORDER BY count DESC"
    ).map_err(|e| e.to_string())?;
    let rows = stmt.query_map([], |row| {
        Ok(serde_json::json!({
            "stage": row.get::<_,String>(0).unwrap_or_default(),
            "count": row.get::<_,i64>(1).unwrap_or(0),
        }))
    }).map_err(|e| e.to_string())?;
    let result: Result<Vec<_>, _> = rows.collect();
    result.map_err(|e| e.to_string())
}

/// Recent leads for dashboard
#[tauri::command]
fn get_recent_leads(db_path: String, limit: i64) -> Result<Vec<serde_json::Value>, String> {
    let conn = rusqlite::Connection::open(&db_path).map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare(
        "SELECT id, full_name, pipeline_stage, created_at FROM leads ORDER BY created_at DESC LIMIT ?1"
    ).map_err(|e| e.to_string())?;
    let rows = stmt.query_map([limit], |row| {
        Ok(serde_json::json!({
            "id": row.get::<_,i64>(0).unwrap_or(0),
            "full_name": row.get::<_,String>(1).unwrap_or_default(),
            "pipeline_stage": row.get::<_,Option<String>>(2).unwrap_or(None),
            "created_at": row.get::<_,Option<String>>(3).unwrap_or(None),
        }))
    }).map_err(|e| e.to_string())?;
    let result: Result<Vec<_>, _> = rows.collect();
    result.map_err(|e| e.to_string())
}

/// Recent/upcoming tasks for dashboard
#[tauri::command]
fn get_recent_tasks(db_path: String, limit: i64) -> Result<Vec<serde_json::Value>, String> {
    let conn = rusqlite::Connection::open(&db_path).map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare(
        "SELECT id, title, due_date, status FROM tasks WHERE status != 'completed' ORDER BY due_date ASC LIMIT ?1"
    ).map_err(|e| e.to_string())?;
    let rows = stmt.query_map([limit], |row| {
        Ok(serde_json::json!({
            "id": row.get::<_,i64>(0).unwrap_or(0),
            "title": row.get::<_,String>(1).unwrap_or_default(),
            "due_date": row.get::<_,Option<String>>(2).unwrap_or(None),
            "status": row.get::<_,Option<String>>(3).unwrap_or(None),
        }))
    }).map_err(|e| e.to_string())?;
    let result: Result<Vec<_>, _> = rows.collect();
    result.map_err(|e| e.to_string())
}

/// Get all tasks
#[tauri::command]
fn get_tasks(db_path: String) -> Result<Vec<serde_json::Value>, String> {
    let conn = rusqlite::Connection::open(&db_path).map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare(
        "SELECT id, title, description, notes, due_date, status, priority, task_type, lead_id, assigned_to, created_by, completed_at, created_at, updated_at FROM tasks ORDER BY due_date ASC"
    ).map_err(|e| e.to_string())?;
    let rows = stmt.query_map([], |row| {
        Ok(serde_json::json!({
            "id": row.get::<_,i64>(0).unwrap_or(0),
            "title": row.get::<_,String>(1).unwrap_or_default(),
            "description": row.get::<_,Option<String>>(2).unwrap_or(None),
            "notes": row.get::<_,Option<String>>(3).unwrap_or(None),
            "due_date": row.get::<_,Option<String>>(4).unwrap_or(None),
            "status": row.get::<_,Option<String>>(5).unwrap_or(None),
            "priority": row.get::<_,Option<String>>(6).unwrap_or(None),
            "task_type": row.get::<_,Option<String>>(7).unwrap_or(None),
            "lead_id": row.get::<_,Option<i64>>(8).unwrap_or(None),
            "assigned_to": row.get::<_,Option<String>>(9).unwrap_or(None),
            "created_by": row.get::<_,Option<String>>(10).unwrap_or(None),
            "completed_at": row.get::<_,Option<String>>(11).unwrap_or(None),
            "created_at": row.get::<_,Option<String>>(12).unwrap_or(None),
            "updated_at": row.get::<_,Option<String>>(13).unwrap_or(None),
        }))
    }).map_err(|e| e.to_string())?;
    let result: Result<Vec<_>, _> = rows.collect();
    result.map_err(|e| e.to_string())
}

/// Get all properties
#[tauri::command]
fn get_properties(db_path: String) -> Result<Vec<serde_json::Value>, String> {
    let conn = rusqlite::Connection::open(&db_path).map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare(
        "SELECT id, title, property_type, offer_type, status, address, city, province, price, size_m2, rooms, bathrooms, lead_id, created_at, updated_at FROM properties ORDER BY created_at DESC"
    ).map_err(|e| e.to_string())?;
    let rows = stmt.query_map([], |row| {
        Ok(serde_json::json!({
            "id": row.get::<_,i64>(0).unwrap_or(0),
            "title": row.get::<_,String>(1).unwrap_or_default(),
            "property_type": row.get::<_,Option<String>>(2).unwrap_or(None),
            "offer_type": row.get::<_,Option<String>>(3).unwrap_or(None),
            "status": row.get::<_,Option<String>>(4).unwrap_or(None),
            "address": row.get::<_,Option<String>>(5).unwrap_or(None),
            "city": row.get::<_,Option<String>>(6).unwrap_or(None),
            "province": row.get::<_,Option<String>>(7).unwrap_or(None),
            "price": row.get::<_,Option<f64>>(8).unwrap_or(None),
            "size_m2": row.get::<_,Option<f64>>(9).unwrap_or(None),
            "rooms": row.get::<_,Option<i64>>(10).unwrap_or(None),
            "bathrooms": row.get::<_,Option<i64>>(11).unwrap_or(None),
            "lead_id": row.get::<_,Option<i64>>(12).unwrap_or(None),
            "created_at": row.get::<_,Option<String>>(13).unwrap_or(None),
            "updated_at": row.get::<_,Option<String>>(14).unwrap_or(None),
        }))
    }).map_err(|e| e.to_string())?;
    let result: Result<Vec<_>, _> = rows.collect();
    result.map_err(|e| e.to_string())
}

/// Get call logs (with lead name join)
#[tauri::command]
fn get_call_logs(db_path: String) -> Result<Vec<serde_json::Value>, String> {
    let conn = rusqlite::Connection::open(&db_path).map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare(
        "SELECT c.id, c.lead_id, l.full_name as lead_name, c.direction, c.duration_sec, c.outcome, c.notes, c.called_at, c.created_by FROM call_logs c LEFT JOIN leads l ON c.lead_id = l.id ORDER BY c.called_at DESC"
    ).map_err(|e| e.to_string())?;
    let rows = stmt.query_map([], |row| {
        Ok(serde_json::json!({
            "id": row.get::<_,i64>(0).unwrap_or(0),
            "lead_id": row.get::<_,Option<i64>>(1).unwrap_or(None),
            "lead_name": row.get::<_,Option<String>>(2).unwrap_or(None),
            "direction": row.get::<_,Option<String>>(3).unwrap_or(None),
            "duration_sec": row.get::<_,Option<i64>>(4).unwrap_or(None),
            "outcome": row.get::<_,Option<String>>(5).unwrap_or(None),
            "notes": row.get::<_,Option<String>>(6).unwrap_or(None),
            "called_at": row.get::<_,Option<String>>(7).unwrap_or(None),
            "created_by": row.get::<_,Option<String>>(8).unwrap_or(None),
        }))
    }).map_err(|e| e.to_string())?;
    let result: Result<Vec<_>, _> = rows.collect();
    result.map_err(|e| e.to_string())
}

/// Insert call log
#[tauri::command]
fn insert_call_log(
    db_path: String, id: String, lead_id: Option<i64>, direction: String,
    duration_sec: Option<i64>, outcome: String, notes: String,
    called_at: String, created_by: String,
) -> Result<(), String> {
    let conn = rusqlite::Connection::open(&db_path).map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO call_logs (id, lead_id, direction, duration_sec, outcome, notes, called_at, created_by) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        rusqlite::params![id, lead_id, direction, duration_sec, outcome, notes, called_at, created_by],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

/// Get time entries for a user
#[tauri::command]
fn get_time_entries(db_path: String, user_id: String) -> Result<Vec<serde_json::Value>, String> {
    let conn = rusqlite::Connection::open(&db_path).map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare(
        "SELECT id, user_id, date, start_time, end_time, activity, status, note, duration_minutes FROM time_entries WHERE user_id = ?1 ORDER BY date DESC"
    ).map_err(|e| e.to_string())?;
    let rows = stmt.query_map([user_id], |row| {
        Ok(serde_json::json!({
            "id": row.get::<_,i64>(0).unwrap_or(0),
            "user_id": row.get::<_,String>(1).unwrap_or_default(),
            "date": row.get::<_,Option<String>>(2).unwrap_or(None),
            "start_time": row.get::<_,Option<String>>(3).unwrap_or(None),
            "end_time": row.get::<_,Option<String>>(4).unwrap_or(None),
            "activity": row.get::<_,Option<String>>(5).unwrap_or(None),
            "status": row.get::<_,Option<String>>(6).unwrap_or(None),
            "note": row.get::<_,Option<String>>(7).unwrap_or(None),
            "duration_minutes": row.get::<_,Option<i64>>(8).unwrap_or(None),
        }))
    }).map_err(|e| e.to_string())?;
    let result: Result<Vec<_>, _> = rows.collect();
    result.map_err(|e| e.to_string())
}

/// Get vacation requests for a user
#[tauri::command]
fn get_vacation_requests(db_path: String, user_id: String) -> Result<Vec<serde_json::Value>, String> {
    let conn = rusqlite::Connection::open(&db_path).map_err(|e| e.to_string())?;
    // Create table if not exists (migration may have run earlier)
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS vacation_requests (id TEXT PRIMARY KEY, user_id TEXT, start_date TEXT, end_date TEXT, days INTEGER, status TEXT DEFAULT 'pending', note TEXT, created_at TEXT DEFAULT (datetime('now')), synced_at TEXT);"
    ).ok();
    let mut stmt = conn.prepare(
        "SELECT id, user_id, start_date, end_date, days, status, note, created_at FROM vacation_requests WHERE user_id = ?1 ORDER BY created_at DESC"
    ).map_err(|e| e.to_string())?;
    let rows = stmt.query_map([user_id], |row| {
        Ok(serde_json::json!({
            "id": row.get::<_,String>(0).unwrap_or_default(),
            "user_id": row.get::<_,String>(1).unwrap_or_default(),
            "start_date": row.get::<_,String>(2).unwrap_or_default(),
            "end_date": row.get::<_,String>(3).unwrap_or_default(),
            "days": row.get::<_,Option<i64>>(4).unwrap_or(None),
            "status": row.get::<_,Option<String>>(5).unwrap_or(None),
            "note": row.get::<_,Option<String>>(6).unwrap_or(None),
            "created_at": row.get::<_,Option<String>>(7).unwrap_or(None),
        }))
    }).map_err(|e| e.to_string())?;
    let result: Result<Vec<_>, _> = rows.collect();
    result.map_err(|e| e.to_string())
}

/// Insert vacation request
#[tauri::command]
fn insert_vacation_request(
    db_path: String, id: String, user_id: String, start_date: String,
    end_date: String, days: i64, status: String, note: Option<String>,
) -> Result<(), String> {
    let conn = rusqlite::Connection::open(&db_path).map_err(|e| e.to_string())?;
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS vacation_requests (id TEXT PRIMARY KEY, user_id TEXT, start_date TEXT, end_date TEXT, days INTEGER, status TEXT DEFAULT 'pending', note TEXT, created_at TEXT DEFAULT (datetime('now')), synced_at TEXT);"
    ).ok();
    conn.execute(
        "INSERT INTO vacation_requests (id, user_id, start_date, end_date, days, status, note) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        rusqlite::params![id, user_id, start_date, end_date, days, status, note],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

/// Sales stats for report
#[tauri::command]
fn get_sales_stats(db_path: String) -> Result<serde_json::Value, String> {
    let conn = rusqlite::Connection::open(&db_path).map_err(|e| e.to_string())?;

    let total: i64 = conn.query_row("SELECT COUNT(*) FROM leads", [], |r| r.get(0)).unwrap_or(0);
    let this_month: i64 = conn.query_row("SELECT COUNT(*) FROM leads WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')", [], |r| r.get(0)).unwrap_or(0);
    let last_month: i64 = conn.query_row("SELECT COUNT(*) FROM leads WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now', '-1 month')", [], |r| r.get(0)).unwrap_or(0);
    let won_count: i64 = conn.query_row("SELECT COUNT(*) FROM leads WHERE pipeline_stage = 'won'", [], |r| r.get(0)).unwrap_or(0);
    let won_budget: f64 = conn.query_row("SELECT COALESCE(SUM(budget),0) FROM leads WHERE pipeline_stage = 'won'", [], |r| r.get(0)).unwrap_or(0.0);
    let lost_count: i64 = conn.query_row("SELECT COUNT(*) FROM leads WHERE pipeline_stage = 'lost'", [], |r| r.get(0)).unwrap_or(0);

    let mut stmt = conn.prepare("SELECT pipeline_stage, COUNT(*) FROM leads WHERE pipeline_stage IS NOT NULL GROUP BY pipeline_stage").map_err(|e| e.to_string())?;
    let stage_counts: Vec<serde_json::Value> = stmt.query_map([], |r| Ok(serde_json::json!({"stage": r.get::<_,String>(0).unwrap_or_default(), "count": r.get::<_,i64>(1).unwrap_or(0)}))).map_err(|e| e.to_string())?.filter_map(|r| r.ok()).collect();

    let mut stmt2 = conn.prepare("SELECT source, COUNT(*) FROM leads WHERE source IS NOT NULL GROUP BY source ORDER BY COUNT(*) DESC").map_err(|e| e.to_string())?;
    let source_counts: Vec<serde_json::Value> = stmt2.query_map([], |r| Ok(serde_json::json!({"source": r.get::<_,String>(0).unwrap_or_default(), "count": r.get::<_,i64>(1).unwrap_or(0)}))).map_err(|e| e.to_string())?.filter_map(|r| r.ok()).collect();

    let mut stmt3 = conn.prepare("SELECT strftime('%Y-%m', created_at) as month, COUNT(*) FROM leads WHERE created_at >= date('now', '-6 months') GROUP BY month ORDER BY month ASC").map_err(|e| e.to_string())?;
    let monthly: Vec<serde_json::Value> = stmt3.query_map([], |r| Ok(serde_json::json!({"month": r.get::<_,String>(0).unwrap_or_default(), "count": r.get::<_,i64>(1).unwrap_or(0)}))).map_err(|e| e.to_string())?.filter_map(|r| r.ok()).collect();

    Ok(serde_json::json!({
        "total_leads": total,
        "leads_this_month": this_month,
        "leads_last_month": last_month,
        "won_count": won_count,
        "won_budget": won_budget,
        "lost_count": lost_count,
        "stage_counts": stage_counts,
        "source_counts": source_counts,
        "monthly_counts": monthly,
    }))
}

/// Activity stats for report
#[tauri::command]
fn get_activity_stats(db_path: String) -> Result<serde_json::Value, String> {
    let conn = rusqlite::Connection::open(&db_path).map_err(|e| e.to_string())?;

    let this_week: i64 = conn.query_row("SELECT COUNT(*) FROM tasks WHERE status='completed' AND completed_at >= date('now', '-7 days')", [], |r| r.get(0)).unwrap_or(0);
    let last_week: i64 = conn.query_row("SELECT COUNT(*) FROM tasks WHERE status='completed' AND completed_at >= date('now', '-14 days') AND completed_at < date('now', '-7 days')", [], |r| r.get(0)).unwrap_or(0);
    let calls_week: i64 = conn.query_row("SELECT COUNT(*) FROM call_logs WHERE called_at >= date('now', '-7 days')", [], |r| r.get(0)).unwrap_or(0);

    let mut stmt = conn.prepare("SELECT status, COUNT(*) FROM tasks GROUP BY status").map_err(|e| e.to_string())?;
    let by_status: Vec<serde_json::Value> = stmt.query_map([], |r| Ok(serde_json::json!({"status": r.get::<_,String>(0).unwrap_or_default(), "count": r.get::<_,i64>(1).unwrap_or(0)}))).map_err(|e| e.to_string())?.filter_map(|r| r.ok()).collect();

    let mut stmt2 = conn.prepare("SELECT outcome, COUNT(*) FROM call_logs WHERE outcome IS NOT NULL GROUP BY outcome").map_err(|e| e.to_string())?;
    let by_outcome: Vec<serde_json::Value> = stmt2.query_map([], |r| Ok(serde_json::json!({"outcome": r.get::<_,String>(0).unwrap_or_default(), "count": r.get::<_,i64>(1).unwrap_or(0)}))).map_err(|e| e.to_string())?.filter_map(|r| r.ok()).collect();

    let mut stmt3 = conn.prepare("SELECT priority, COUNT(*) FROM tasks WHERE priority IS NOT NULL GROUP BY priority").map_err(|e| e.to_string())?;
    let by_priority: Vec<serde_json::Value> = stmt3.query_map([], |r| Ok(serde_json::json!({"priority": r.get::<_,String>(0).unwrap_or_default(), "count": r.get::<_,i64>(1).unwrap_or(0)}))).map_err(|e| e.to_string())?.filter_map(|r| r.ok()).collect();

    Ok(serde_json::json!({
        "tasks_completed_this_week": this_week,
        "tasks_completed_last_week": last_week,
        "calls_this_week": calls_week,
        "tasks_by_status": by_status,
        "calls_by_outcome": by_outcome,
        "tasks_by_priority": by_priority,
    }))
}

/// Personal stats for report
#[tauri::command]
fn get_personal_stats(db_path: String) -> Result<Vec<serde_json::Value>, String> {
    let conn = rusqlite::Connection::open(&db_path).map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare(
        "SELECT user_id, SUM(duration_minutes) as total_min, COUNT(DISTINCT date) as days, AVG(duration_minutes) as avg_min FROM time_entries WHERE strftime('%Y-%m', date) = strftime('%Y-%m', 'now') AND user_id IS NOT NULL GROUP BY user_id"
    ).map_err(|e| e.to_string())?;
    let rows = stmt.query_map([], |r| {
        Ok(serde_json::json!({
            "user_id": r.get::<_,String>(0).unwrap_or_default(),
            "total_minutes": r.get::<_,Option<i64>>(1).unwrap_or(Some(0)).unwrap_or(0),
            "days_worked": r.get::<_,Option<i64>>(2).unwrap_or(Some(0)).unwrap_or(0),
            "avg_minutes_per_day": r.get::<_,Option<f64>>(3).unwrap_or(Some(0.0)).unwrap_or(0.0),
        }))
    }).map_err(|e| e.to_string())?;
    let result: Result<Vec<_>, _> = rows.collect();
    result.map_err(|e| e.to_string())
}

/// Open a URL or tel:// link via the system default handler
#[tauri::command]
fn open_url(url: String) -> Result<(), String> {
    #[cfg(target_os = "linux")]
    std::process::Command::new("xdg-open")
        .arg(&url)
        .spawn()
        .map_err(|e| e.to_string())?;

    #[cfg(target_os = "macos")]
    std::process::Command::new("open")
        .arg(&url)
        .spawn()
        .map_err(|e| e.to_string())?;

    #[cfg(target_os = "windows")]
    std::process::Command::new("cmd")
        .args(["/c", "start", "", &url])
        .spawn()
        .map_err(|e| e.to_string())?;

    Ok(())
}

/// Property stats for report
#[tauri::command]
fn get_property_stats(db_path: String) -> Result<serde_json::Value, String> {
    let conn = rusqlite::Connection::open(&db_path).map_err(|e| e.to_string())?;

    let total: i64 = conn.query_row("SELECT COUNT(*) FROM properties", [], |r| r.get(0)).unwrap_or(0);
    let avg_price: f64 = conn.query_row("SELECT COALESCE(AVG(price),0) FROM properties WHERE price > 0", [], |r| r.get(0)).unwrap_or(0.0);
    let avg_price_m2: f64 = conn.query_row("SELECT COALESCE(AVG(price/size_m2),0) FROM properties WHERE price > 0 AND size_m2 > 0", [], |r| r.get(0)).unwrap_or(0.0);

    let mut stmt = conn.prepare("SELECT status, COUNT(*) FROM properties WHERE status IS NOT NULL GROUP BY status").map_err(|e| e.to_string())?;
    let by_status: Vec<serde_json::Value> = stmt.query_map([], |r| Ok(serde_json::json!({"status": r.get::<_,String>(0).unwrap_or_default(), "count": r.get::<_,i64>(1).unwrap_or(0)}))).map_err(|e| e.to_string())?.filter_map(|r| r.ok()).collect();

    let mut stmt2 = conn.prepare("SELECT property_type, COUNT(*) FROM properties WHERE property_type IS NOT NULL GROUP BY property_type ORDER BY COUNT(*) DESC").map_err(|e| e.to_string())?;
    let by_type: Vec<serde_json::Value> = stmt2.query_map([], |r| Ok(serde_json::json!({"property_type": r.get::<_,String>(0).unwrap_or_default(), "count": r.get::<_,i64>(1).unwrap_or(0)}))).map_err(|e| e.to_string())?.filter_map(|r| r.ok()).collect();

    let mut stmt3 = conn.prepare("SELECT offer_type, COUNT(*) FROM properties WHERE offer_type IS NOT NULL GROUP BY offer_type").map_err(|e| e.to_string())?;
    let by_offer: Vec<serde_json::Value> = stmt3.query_map([], |r| Ok(serde_json::json!({"offer_type": r.get::<_,String>(0).unwrap_or_default(), "count": r.get::<_,i64>(1).unwrap_or(0)}))).map_err(|e| e.to_string())?.filter_map(|r| r.ok()).collect();

    Ok(serde_json::json!({
        "total": total,
        "avg_price": avg_price,
        "avg_price_per_m2": avg_price_m2,
        "by_status": by_status,
        "by_type": by_type,
        "by_offer": by_offer,
    }))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, argv, _cwd| {
            deep_link::handle_args(app, argv);
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.unminimize();
                let _ = window.set_focus();
            }
        }))
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_sql::Builder::default().build())
        .setup(|app| {
            let locale = i18n::detect_system_locale();
            rust_i18n::set_locale(&locale);
            tray::setup(app)?;
            let handle2 = app.handle().clone();
            app.listen("deep-link://new-url", move |event| {
                let payload = event.payload();
                let url_str = payload.trim_matches('"');
                if let Ok(url) = url::Url::parse(url_str) {
                    deep_link::handle_url(&handle2, url);
                }
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_app_data_dir,
            db::migrations::run_migrations,
            sync::pull::sync_now,
            sync::pull::get_outbox_count,
            sync::pull::get_last_sync,
            // Data read commands
            count_table,
            get_leads,
            get_leads_simple,
            get_stage_counts,
            get_recent_leads,
            get_recent_tasks,
            get_tasks,
            get_properties,
            get_call_logs,
            insert_call_log,
            get_time_entries,
            get_vacation_requests,
            insert_vacation_request,
            // System
            open_url,
            // Report commands
            get_sales_stats,
            get_activity_stats,
            get_personal_stats,
            get_property_stats,
        ])
        .run(tauri::generate_context!())
        .expect("Euricio Desktop konnte nicht gestartet werden");
}
