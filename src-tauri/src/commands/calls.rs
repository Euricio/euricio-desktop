use serde::{Deserialize, Serialize};
use tauri::command;

const ELIXIR_BASE: &str = "https://euricio-crm.fly.dev";

#[derive(Debug, Serialize, Deserialize)]
pub struct ResolvedCall {
    pub phone: String,
    pub found: bool,
    #[serde(rename = "type")]
    pub entity_type: Option<String>,
    pub id: Option<String>,
    pub display_name: Option<String>,
}

/// Löst eine Telefonnummer gegen lokale DB (Cache) und ggf. Backend auf.
#[command]
pub async fn resolve_phone(phone: String) -> Result<ResolvedCall, String> {
    let normalized = normalize_phone(&phone);

    // Zuerst lokalen Cache prüfen (TODO Phase 2: SQLite-Lookup)
    // Fallback: Backend-Lookup
    let client = reqwest::Client::new();
    let result = client
        .get(format!(
            "{ELIXIR_BASE}/api/v2/contacts/by-phone?phone={}",
            urlencoding::encode(&normalized)
        ))
        .send()
        .await;

    match result {
        Ok(resp) if resp.status().is_success() => {
            let data: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
            Ok(ResolvedCall {
                phone: normalized,
                found: data["found"].as_bool().unwrap_or(false),
                entity_type: data["type"].as_str().map(String::from),
                id: data["record"]["id"].as_str().map(String::from),
                display_name: {
                    let first = data["record"]["first_name"].as_str().unwrap_or("");
                    let last = data["record"]["last_name"].as_str().unwrap_or("");
                    let name = format!("{} {}", first, last).trim().to_string();
                    if name.is_empty() { None } else { Some(name) }
                },
            })
        }
        _ => Ok(ResolvedCall {
            phone: normalized,
            found: false,
            entity_type: None,
            id: None,
            display_name: None,
        }),
    }
}

fn normalize_phone(phone: &str) -> String {
    phone.chars()
        .filter(|c| c.is_ascii_digit() || *c == '+')
        .collect()
}
