use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter};
use tauri_plugin_store::StoreExt;

const API_BASE: &str = "https://euricio-crm.fly.dev/api/v2";

#[derive(Debug, Deserialize)]
struct PullResponse {
    data: Vec<serde_json::Value>,
    cursor: Option<String>,
    has_more: bool,
}

/// Holt alle Änderungen seit dem letzten Cursor vom Backend und speichert sie in SQLite.
pub async fn pull_changes(app: &AppHandle) -> Result<usize, String> {
    let token = get_access_token(app)?;

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .build()
        .map_err(|e| e.to_string())?;

    let db_path = get_db_path(app)?;
    let mut total = 0;

    total += pull_contacts(&client, &token, app, &db_path).await?;
    total += pull_tasks(&client, &token, app, &db_path).await?;

    if let Ok(store) = app.store("sync_cursors.json") {
        store.set(
            "last_synced_at",
            serde_json::Value::Number(chrono::Utc::now().timestamp().into()),
        );
        let _ = store.save();
    }

    Ok(total)
}

async fn pull_contacts(
    client: &reqwest::Client,
    token: &str,
    app: &AppHandle,
    db_path: &str,
) -> Result<usize, String> {
    let cursor = get_cursor(app, "contacts");
    let url = match &cursor {
        Some(c) => format!("{}/contacts?cursor={}&limit=100", API_BASE, c),
        None => format!("{}/contacts?limit=100", API_BASE),
    };

    let resp = client
        .get(&url)
        .bearer_auth(token)
        .header("Accept", "application/json")
        .send()
        .await
        .map_err(|e| format!("Netzwerkfehler (contacts): {}", e))?;

    if resp.status().as_u16() == 401 {
        return Err("Authentifizierung abgelaufen. Bitte neu anmelden.".into());
    }
    if !resp.status().is_success() {
        log::warn!("Pull contacts: HTTP {} — überspringe", resp.status().as_u16());
        return Ok(0);
    }

    let text = resp.text().await.map_err(|e| e.to_string())?;
    let (items, next_cursor) = parse_response(&text, "contacts");
    let count = items.len();

    if count > 0 {
        upsert_contacts_sqlite(&items, db_path)?;
        if let Some(nc) = next_cursor {
            save_cursor(app, "contacts", &nc);
        }
        app.emit("sync:data-updated", count).ok();
        log::info!("Sync: {} Kontakte gespeichert", count);
    }

    Ok(count)
}

async fn pull_tasks(
    client: &reqwest::Client,
    token: &str,
    app: &AppHandle,
    db_path: &str,
) -> Result<usize, String> {
    let cursor = get_cursor(app, "tasks");
    let url = match &cursor {
        Some(c) => format!("{}/tasks?cursor={}&limit=100", API_BASE, c),
        None => format!("{}/tasks?limit=100", API_BASE),
    };

    let resp = client
        .get(&url)
        .bearer_auth(token)
        .header("Accept", "application/json")
        .send()
        .await
        .map_err(|e| format!("Netzwerkfehler (tasks): {}", e))?;

    if resp.status().as_u16() == 401 {
        return Err("Authentifizierung abgelaufen. Bitte neu anmelden.".into());
    }
    if !resp.status().is_success() {
        log::warn!("Pull tasks: HTTP {} — überspringe", resp.status().as_u16());
        return Ok(0);
    }

    let text = resp.text().await.map_err(|e| e.to_string())?;
    let (items, next_cursor) = parse_response(&text, "tasks");
    let count = items.len();

    if count > 0 {
        upsert_tasks_sqlite(&items, db_path)?;
        if let Some(nc) = next_cursor {
            save_cursor(app, "tasks", &nc);
        }
        app.emit("sync:data-updated", count).ok();
        log::info!("Sync: {} Tasks gespeichert", count);
    }

    Ok(count)
}

fn parse_response(text: &str, entity: &str) -> (Vec<serde_json::Value>, Option<String>) {
    if let Ok(pr) = serde_json::from_str::<PullResponse>(text) {
        (pr.data, pr.cursor)
    } else if let Ok(items) = serde_json::from_str::<Vec<serde_json::Value>>(text) {
        (items, None)
    } else {
        log::warn!(
            "Pull {}: Unbekanntes Format: {}",
            entity,
            &text[..text.len().min(300)]
        );
        (vec![], None)
    }
}

fn upsert_contacts_sqlite(items: &[serde_json::Value], db_path: &str) -> Result<(), String> {
    let conn = rusqlite::Connection::open(db_path)
        .map_err(|e| format!("DB öffnen fehlgeschlagen: {}", e))?;

    for item in items {
        let id = str_val(item, "id");
        if id.is_empty() {
            continue;
        }

        conn.execute(
            "INSERT INTO contacts (
                id, first_name, last_name, email, phone, mobile,
                company, address, city, country, notes, avatar_url,
                status, synced, updated_at, inserted_at
             ) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,1,?14,?15)
             ON CONFLICT(id) DO UPDATE SET
               first_name  = excluded.first_name,
               last_name   = excluded.last_name,
               email       = excluded.email,
               phone       = excluded.phone,
               mobile      = excluded.mobile,
               company     = excluded.company,
               address     = excluded.address,
               city        = excluded.city,
               country     = excluded.country,
               notes       = excluded.notes,
               avatar_url  = excluded.avatar_url,
               status      = excluded.status,
               synced      = 1,
               updated_at  = excluded.updated_at",
            rusqlite::params![
                id,
                str_val(item, "first_name"),
                opt_str(item, "last_name"),
                opt_str(item, "email"),
                opt_str(item, "phone"),
                opt_str(item, "mobile"),
                opt_str(item, "company"),
                opt_str(item, "address"),
                opt_str(item, "city"),
                opt_str(item, "country"),
                opt_str(item, "notes"),
                opt_str(item, "avatar_url"),
                opt_str(item, "status").unwrap_or_else(|| "new".into()),
                opt_str(item, "updated_at")
                    .unwrap_or_else(|| chrono::Utc::now().to_rfc3339()),
                opt_str(item, "inserted_at")
                    .unwrap_or_else(|| chrono::Utc::now().to_rfc3339()),
            ],
        )
        .map_err(|e| format!("Upsert contact {} fehlgeschlagen: {}", id, e))?;
    }

    Ok(())
}

fn upsert_tasks_sqlite(items: &[serde_json::Value], db_path: &str) -> Result<(), String> {
    let conn = rusqlite::Connection::open(db_path)
        .map_err(|e| format!("DB öffnen fehlgeschlagen: {}", e))?;

    for item in items {
        let id = str_val(item, "id");
        if id.is_empty() {
            continue;
        }

        conn.execute(
            "INSERT INTO tasks (
                id, title, description, due_date, priority,
                status, contact_id, assigned_to, synced, updated_at, inserted_at
             ) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,1,?9,?10)
             ON CONFLICT(id) DO UPDATE SET
               title       = excluded.title,
               description = excluded.description,
               due_date    = excluded.due_date,
               priority    = excluded.priority,
               status      = excluded.status,
               contact_id  = excluded.contact_id,
               assigned_to = excluded.assigned_to,
               synced      = 1,
               updated_at  = excluded.updated_at",
            rusqlite::params![
                id,
                str_val(item, "title"),
                opt_str(item, "description"),
                opt_str(item, "due_date"),
                opt_str(item, "priority").unwrap_or_else(|| "medium".into()),
                opt_str(item, "status").unwrap_or_else(|| "open".into()),
                opt_str(item, "contact_id"),
                opt_str(item, "assigned_to"),
                opt_str(item, "updated_at")
                    .unwrap_or_else(|| chrono::Utc::now().to_rfc3339()),
                opt_str(item, "inserted_at")
                    .unwrap_or_else(|| chrono::Utc::now().to_rfc3339()),
            ],
        )
        .map_err(|e| format!("Upsert task {} fehlgeschlagen: {}", id, e))?;
    }

    Ok(())
}

// ── Hilfsfunktionen ───────────────────────────────────────────────────────────

fn get_db_path(app: &AppHandle) -> Result<String, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("App-Pfad nicht gefunden: {}", e))?;
    Ok(dir.join("crm.db").to_string_lossy().into_owned())
}

fn str_val(v: &serde_json::Value, key: &str) -> String {
    v.get(key)
        .and_then(|x| x.as_str())
        .unwrap_or("")
        .to_string()
}

fn opt_str(v: &serde_json::Value, key: &str) -> Option<String> {
    v.get(key).and_then(|x| x.as_str()).map(String::from)
}

fn get_cursor(app: &AppHandle, entity: &str) -> Option<String> {
    let store = app.store("sync_cursors.json").ok()?;
    store.get(entity).and_then(|v| v.as_str().map(String::from))
}

fn save_cursor(app: &AppHandle, entity: &str, cursor: &str) {
    if let Ok(store) = app.store("sync_cursors.json") {
        store.set(entity, serde_json::Value::String(cursor.to_string()));
        let _ = store.save();
    }
}

fn get_access_token(app: &AppHandle) -> Result<String, String> {
    let store = app
        .store("auth.json")
        .map_err(|_| "Kein Auth-Store gefunden".to_string())?;

    let session = store
        .get("session")
        .ok_or_else(|| "Keine aktive Session".to_string())?;

    session
        .get("access_token")
        .and_then(|t| t.as_str())
        .map(String::from)
        .ok_or_else(|| "Kein Access-Token in Session".to_string())
}
