use serde::{Deserialize, Serialize};
use tauri::AppHandle;
use tauri_plugin_store::StoreExt;

const API_BASE: &str = "https://euricio-crm.fly.dev/api/v2";
const MAX_RETRIES: u32 = 3;

#[derive(Debug, Serialize, Deserialize, Clone)]
struct OutboxEntry {
    id: String,
    entity_type: String,
    entity_id: String,
    operation: String,
    payload: String,
    attempts: u32,
}

/// Liest die Outbox aus dem Store und sendet Einträge ans Backend.
/// Gibt die Anzahl erfolgreich gesendeter Einträge zurück.
pub async fn process_outbox(app: &AppHandle) -> Result<usize, String> {
    let token = match get_access_token(app) {
        Ok(t) => t,
        Err(_) => return Ok(0), // Nicht eingeloggt — überspringen
    };

    let store = match app.store("outbox.json") {
        Ok(s) => s,
        Err(_) => return Ok(0),
    };

    // Alle Outbox-Einträge laden
    let entries: Vec<OutboxEntry> = match store.get("entries") {
        Some(v) => serde_json::from_value(v).unwrap_or_default(),
        None => return Ok(0),
    };

    if entries.is_empty() {
        return Ok(0);
    }

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(15))
        .build()
        .map_err(|e| e.to_string())?;

    let mut remaining: Vec<OutboxEntry> = Vec::new();
    let mut sent = 0usize;

    for mut entry in entries {
        if entry.attempts >= MAX_RETRIES {
            log::warn!("Outbox: Eintrag {} nach {} Versuchen verworfen", entry.id, MAX_RETRIES);
            continue; // Dauerhaft fehlgeschlagen — verwerfen
        }

        match send_entry(&client, &token, &entry).await {
            Ok(()) => {
                sent += 1;
                log::debug!("Outbox: {} {} erfolgreich gesendet", entry.operation, entry.entity_id);
            }
            Err(e) => {
                entry.attempts += 1;
                log::warn!("Outbox: Fehler bei {} {} (Versuch {}): {}", 
                    entry.operation, entry.entity_id, entry.attempts, e);
                remaining.push(entry);
            }
        }
    }

    // Verbleibende Einträge zurückschreiben
    store.set("entries", serde_json::to_value(&remaining).unwrap_or_default());
    let _ = store.save();

    Ok(sent)
}

/// Einen Outbox-Eintrag ans Backend senden
async fn send_entry(
    client: &reqwest::Client,
    token: &str,
    entry: &OutboxEntry,
) -> Result<(), String> {
    let payload: serde_json::Value = serde_json::from_str(&entry.payload)
        .unwrap_or(serde_json::Value::Object(serde_json::Map::new()));

    let (method, url) = match entry.operation.as_str() {
        "create" => (
            reqwest::Method::POST,
            format!("{}/{}", API_BASE, entry.entity_type),
        ),
        "update" => (
            reqwest::Method::PUT,
            format!("{}/{}/{}", API_BASE, entry.entity_type, entry.entity_id),
        ),
        "delete" => (
            reqwest::Method::DELETE,
            format!("{}/{}/{}", API_BASE, entry.entity_type, entry.entity_id),
        ),
        op => return Err(format!("Unbekannte Operation: {}", op)),
    };

    let resp = client
        .request(method, &url)
        .bearer_auth(token)
        .header("Content-Type", "application/json")
        .json(&payload)
        .send()
        .await
        .map_err(|e| format!("Netzwerkfehler: {}", e))?;

    let status = resp.status();

    if status.is_success() || status.as_u16() == 409 {
        // 409 Conflict = bereits vorhanden = OK (idempotent)
        return Ok(());
    }

    if status.as_u16() == 401 {
        return Err("Token abgelaufen".into());
    }

    let body = resp.text().await.unwrap_or_default();
    Err(format!("Server-Fehler {}: {}", status, body))
}

/// Neuen Eintrag zur Outbox hinzufügen
pub fn enqueue(
    app: &AppHandle,
    entity_type: &str,
    entity_id: &str,
    operation: &str,
    payload: serde_json::Value,
) {
    let Ok(store) = app.store("outbox.json") else { return };

    let mut entries: Vec<OutboxEntry> = match store.get("entries") {
        Some(v) => serde_json::from_value(v).unwrap_or_default(),
        None => vec![],
    };

    // Bestehenden Eintrag für dieselbe Entity ersetzen (letzter Stand gewinnt)
    entries.retain(|e| !(e.entity_type == entity_type && e.entity_id == entity_id));

    entries.push(OutboxEntry {
        id: uuid::Uuid::new_v4().to_string(),
        entity_type: entity_type.to_string(),
        entity_id: entity_id.to_string(),
        operation: operation.to_string(),
        payload: payload.to_string(),
        attempts: 0,
    });

    store.set("entries", serde_json::to_value(&entries).unwrap_or_default());
    let _ = store.save();
}

fn get_access_token(app: &AppHandle) -> Result<String, String> {
    let store = app.store("auth.json")
        .map_err(|_| "Kein Auth-Store".to_string())?;

    let session = store.get("session")
        .ok_or_else(|| "Keine Session".to_string())?;

    session
        .get("access_token")
        .and_then(|t| t.as_str())
        .map(String::from)
        .ok_or_else(|| "Kein Token".to_string())
}
