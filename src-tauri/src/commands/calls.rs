use serde::{Deserialize, Serialize};
use tauri::{command, AppHandle, Emitter};
use tauri_plugin_store::StoreExt;

const API_BASE: &str = "https://euricio-crm.fly.dev/api/v2";

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ResolvedContact {
    pub id: Option<String>,
    pub name: Option<String>,
    pub company: Option<String>,
    pub phone: String,
    pub known: bool,
}

#[derive(Debug, Serialize, Clone)]
pub struct IncomingCallEvent {
    pub phone: String,
    pub name: Option<String>,
    pub contact_id: Option<String>,
    pub direction: String,
}

/// Löst eine Telefonnummer zu einem Kontakt auf (lokale SQLite-Suche).
/// Gibt Kontaktdaten zurück falls bekannt.
#[command]
pub async fn resolve_phone(
    phone: String,
    app: AppHandle,
) -> Result<ResolvedContact, String> {
    // Nummer normalisieren (Leerzeichen, Bindestriche entfernen)
    let normalized = normalize_phone(&phone);

    // Über Elixir-Backend suchen (wenn online)
    let token = get_token(&app);

    if let Some(token) = token {
        if let Ok(result) = lookup_remote(&token, &normalized).await {
            // Eingehenden Anruf-Event ans Frontend senden
            app.emit("call:incoming", IncomingCallEvent {
                phone: phone.clone(),
                name: result.name.clone(),
                contact_id: result.id.clone(),
                direction: "outbound".into(),
            }).ok();
            return Ok(result);
        }
    }

    // Fallback: unbekannte Nummer
    let result = ResolvedContact {
        id: None,
        name: None,
        company: None,
        phone: phone.clone(),
        known: false,
    };

    app.emit("call:incoming", IncomingCallEvent {
        phone: phone.clone(),
        name: None,
        contact_id: None,
        direction: "outbound".into(),
    }).ok();

    Ok(result)
}

/// Simuliert einen eingehenden Anruf (für Tests / VoIP-Webhook)
#[command]
pub async fn simulate_incoming_call(
    phone: String,
    app: AppHandle,
) -> Result<(), String> {
    let token = get_token(&app);
    let resolved = if let Some(token) = token {
        lookup_remote(&token, &normalize_phone(&phone)).await.ok()
    } else {
        None
    };

    app.emit("call:incoming", IncomingCallEvent {
        phone: phone.clone(),
        name: resolved.as_ref().and_then(|r| r.name.clone()),
        contact_id: resolved.as_ref().and_then(|r| r.id.clone()),
        direction: "inbound".into(),
    }).map_err(|e| e.to_string())
}

async fn lookup_remote(token: &str, phone: &str) -> Result<ResolvedContact, String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(5))
        .build()
        .map_err(|e| e.to_string())?;

    let url = format!(
        "{}/contacts?filter[phone]={}&limit=1",
        API_BASE,
        urlencoding::encode(phone)
    );

    let resp = client
        .get(&url)
        .bearer_auth(token)
        .header("Accept", "application/json")
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !resp.status().is_success() {
        return Err(format!("Status {}", resp.status()));
    }

    #[derive(Deserialize)]
    struct ContactRow {
        id: String,
        first_name: Option<String>,
        last_name: Option<String>,
        company: Option<String>,
        phone: Option<String>,
        mobile: Option<String>,
    }

    let text = resp.text().await.map_err(|e| e.to_string())?;

    // Backend gibt entweder { data: [...] } oder direkt [...]
    let rows: Vec<ContactRow> = if let Ok(v) = serde_json::from_str::<serde_json::Value>(&text) {
        if let Some(arr) = v.get("data").and_then(|d| d.as_array()) {
            serde_json::from_value(serde_json::Value::Array(arr.clone())).unwrap_or_default()
        } else {
            serde_json::from_value(v).unwrap_or_default()
        }
    } else {
        return Err("Unbekanntes Format".into());
    };

    if let Some(contact) = rows.into_iter().next() {
        let name = [contact.first_name, contact.last_name]
            .into_iter()
            .flatten()
            .collect::<Vec<_>>()
            .join(" ");
        Ok(ResolvedContact {
            id: Some(contact.id),
            name: if name.is_empty() { None } else { Some(name) },
            company: contact.company,
            phone: contact.phone.or(contact.mobile).unwrap_or_default(),
            known: true,
        })
    } else {
        Err("Nicht gefunden".into())
    }
}

fn normalize_phone(phone: &str) -> String {
    phone
        .chars()
        .filter(|c| c.is_ascii_digit() || *c == '+')
        .collect()
}

fn get_token(app: &AppHandle) -> Option<String> {
    let store = app.store("auth.json").ok()?;
    let session = store.get("session")?;
    session
        .get("access_token")
        .and_then(|t| t.as_str())
        .map(String::from)
}
