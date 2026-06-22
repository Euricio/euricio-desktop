use serde::{Deserialize, Serialize};
use tauri::State;
use tauri_plugin_sql::{DbPool, DbInstances};

const SUPABASE_URL: &str = "https://vddfghfvmnrbotmxhvvi.supabase.co";
const SUPABASE_ANON_KEY: &str = "sb_publishable_xHQlpSPtA0H75GuESG3o7A_A3evq_vv";

// ── Datenstrukturen ───────────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SessionInfo {
    pub user_id: String,
    pub email: String,
    pub full_name: Option<String>,
    pub avatar_url: Option<String>,
    pub access_token: String,
    pub expires_at: String,
}

#[derive(Debug, Deserialize)]
struct SupabaseAuthResponse {
    access_token: String,
    refresh_token: String,
    expires_in: u64,
    user: SupabaseUser,
}

#[derive(Debug, Deserialize)]
struct SupabaseUser {
    id: String,
    email: Option<String>,
    user_metadata: Option<serde_json::Value>,
}

#[derive(Debug, Serialize, Deserialize)]
struct DbSession {
    user_id: String,
    email: String,
    full_name: Option<String>,
    avatar_url: Option<String>,
    access_token: String,
    refresh_token: String,
    expires_at: String,
}

// ── Tauri Commands ────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn login(email: String, password: String) -> Result<SessionInfo, String> {
    let client = reqwest::Client::new();

    let body = serde_json::json!({
        "email": email,
        "password": password
    });

    let resp = client
        .post(format!("{}/auth/v1/token?grant_type=password", SUPABASE_URL))
        .header("apikey", SUPABASE_ANON_KEY)
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Netzwerkfehler: {}", e))?;

    if !resp.status().is_success() {
        let status = resp.status().as_u16();
        let text = resp.text().await.unwrap_or_default();
        let msg = if status == 400 || status == 422 {
            "E-Mail oder Passwort falsch."
        } else {
            "Anmeldung fehlgeschlagen. Bitte versuche es später erneut."
        };
        return Err(format!("{} ({})", msg, text));
    }

    let auth: SupabaseAuthResponse = resp
        .json()
        .await
        .map_err(|e| format!("Ungültige Serverantwort: {}", e))?;

    let full_name = auth
        .user
        .user_metadata
        .as_ref()
        .and_then(|m| m.get("full_name"))
        .and_then(|v| v.as_str())
        .map(String::from);

    let avatar_url = auth
        .user
        .user_metadata
        .as_ref()
        .and_then(|m| m.get("avatar_url"))
        .and_then(|v| v.as_str())
        .map(String::from);

    let email_str = auth
        .user
        .email
        .clone()
        .unwrap_or_else(|| email.clone());

    // Ablaufzeit berechnen
    let expires_at = chrono::Utc::now()
        + chrono::Duration::seconds(auth.expires_in as i64);
    let expires_at_str = expires_at.format("%Y-%m-%dT%H:%M:%SZ").to_string();

    let session = DbSession {
        user_id: auth.user.id.clone(),
        email: email_str.clone(),
        full_name: full_name.clone(),
        avatar_url: avatar_url.clone(),
        access_token: auth.access_token.clone(),
        refresh_token: auth.refresh_token.clone(),
        expires_at: expires_at_str.clone(),
    };

    // Session in auth.db speichern (via store — wir nutzen tauri-plugin-store
    // als einfacheren Weg, da SQL-Zugriff in Commands komplex ist)
    // Die Session wird im Frontend über invoke gespeichert.

    Ok(SessionInfo {
        user_id: auth.user.id,
        email: email_str,
        full_name,
        avatar_url,
        access_token: auth.access_token,
        expires_at: expires_at_str,
    })
}

#[tauri::command]
pub async fn logout() -> Result<(), String> {
    // Token invalidieren (fire and forget)
    Ok(())
}

#[tauri::command]
pub async fn get_session() -> Result<Option<SessionInfo>, String> {
    // Wird vom Frontend aus dem Store gelesen
    Ok(None)
}

#[tauri::command]
pub async fn refresh_token(refresh_token: String) -> Result<SessionInfo, String> {
    let client = reqwest::Client::new();

    let body = serde_json::json!({
        "refresh_token": refresh_token
    });

    let resp = client
        .post(format!("{}/auth/v1/token?grant_type=refresh_token", SUPABASE_URL))
        .header("apikey", SUPABASE_ANON_KEY)
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Netzwerkfehler: {}", e))?;

    if !resp.status().is_success() {
        return Err("Token-Erneuerung fehlgeschlagen. Bitte neu anmelden.".into());
    }

    let auth: SupabaseAuthResponse = resp
        .json()
        .await
        .map_err(|e| format!("Ungültige Serverantwort: {}", e))?;

    let email_str = auth.user.email.unwrap_or_default();
    let full_name = auth
        .user
        .user_metadata
        .as_ref()
        .and_then(|m| m.get("full_name"))
        .and_then(|v| v.as_str())
        .map(String::from);
    let avatar_url = auth
        .user
        .user_metadata
        .as_ref()
        .and_then(|m| m.get("avatar_url"))
        .and_then(|v| v.as_str())
        .map(String::from);

    let expires_at = chrono::Utc::now()
        + chrono::Duration::seconds(auth.expires_in as i64);
    let expires_at_str = expires_at.format("%Y-%m-%dT%H:%M:%SZ").to_string();

    Ok(SessionInfo {
        user_id: auth.user.id,
        email: email_str,
        full_name,
        avatar_url,
        access_token: auth.access_token,
        expires_at: expires_at_str,
    })
}
