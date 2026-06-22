use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter};
use tauri_plugin_store::StoreExt;

const API_BASE: &str = "https://euricio-crm.fly.dev/api/v2";

#[derive(Debug, Deserialize)]
struct PullResponse<T> {
    data: Vec<T>,
    cursor: Option<String>,
    has_more: bool,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct RemoteContact {
    pub id: String,
    pub first_name: Option<String>,
    pub last_name: Option<String>,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub mobile: Option<String>,
    pub company: Option<String>,
    pub address: Option<String>,
    pub city: Option<String>,
    pub country: Option<String>,
    pub notes: Option<String>,
    pub avatar_url: Option<String>,
    pub tags: Option<serde_json::Value>,
    pub status: Option<String>,
    pub inserted_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct RemoteTask {
    pub id: String,
    pub title: String,
    pub description: Option<String>,
    pub due_date: Option<String>,
    pub priority: Option<String>,
    pub status: Option<String>,
    pub contact_id: Option<String>,
    pub assigned_to: Option<String>,
    pub inserted_at: Option<String>,
    pub updated_at: Option<String>,
}

/// Holt alle Änderungen seit dem letzten Cursor vom Backend.
/// Gibt die Anzahl der verarbeiteten Datensätze zurück.
pub async fn pull_changes(app: &AppHandle) -> Result<usize, String> {
    let token = get_access_token(app)?;

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .build()
        .map_err(|e| e.to_string())?;

    let mut total = 0;

    total += pull_entity::<RemoteContact>(&client, &token, "contacts", app).await?;
    total += pull_entity::<RemoteTask>(&client, &token, "tasks", app).await?;

    // Letzten Sync-Zeitstempel speichern
    if let Ok(store) = app.store("sync_cursors.json") {
        store.set(
            "last_synced_at",
            serde_json::Value::Number(
                chrono::Utc::now().timestamp().into(),
            ),
        );
        let _ = store.save();
    }

    Ok(total)
}

async fn pull_entity<T: for<'de> Deserialize<'de> + Serialize>(
    client: &reqwest::Client,
    token: &str,
    entity: &str,
    app: &AppHandle,
) -> Result<usize, String> {
    let cursor = get_cursor(app, entity);
    let mut count = 0;
    let mut current_cursor = cursor;
    let mut has_more = true;

    while has_more {
        let url = match &current_cursor {
            Some(c) => format!("{}/{}?cursor={}&limit=100", API_BASE, entity, c),
            None    => format!("{}/{}?limit=100", API_BASE, entity),
        };

        let resp = client
            .get(&url)
            .bearer_auth(token)
            .header("Accept", "application/json")
            .send()
            .await
            .map_err(|e| format!("Netzwerkfehler beim Pull von {}: {}", entity, e))?;

        if resp.status().as_u16() == 401 {
            return Err("Authentifizierung abgelaufen. Bitte neu anmelden.".into());
        }

        if !resp.status().is_success() {
            log::debug!("Pull {}: Status {} — überspringe", entity, resp.status());
            return Ok(0);
        }

        let text = resp.text().await.map_err(|e| e.to_string())?;

        let (items, next_cursor, more): (Vec<serde_json::Value>, Option<String>, bool) =
            if let Ok(pr) = serde_json::from_str::<PullResponse<serde_json::Value>>(&text) {
                (pr.data, pr.cursor, pr.has_more)
            } else if let Ok(items) = serde_json::from_str::<Vec<serde_json::Value>>(&text) {
                (items, None, false)
            } else {
                log::debug!("Pull {}: Unbekanntes Format — überspringe", entity);
                return Ok(0);
            };

        count += items.len();

        if let Some(ref nc) = next_cursor {
            save_cursor(app, entity, nc);
            current_cursor = Some(nc.clone());
        }

        has_more = more && next_cursor.is_some();

        if !items.is_empty() {
            app.emit(&format!("sync:pull:{}", entity), &items)
                .map_err(|e| e.to_string())?;
        }
    }

    Ok(count)
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
