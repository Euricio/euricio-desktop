use serde::{Deserialize, Serialize};
use tauri::command;

const SUPABASE_URL: &str = "https://vddfghfvmnrbotmxhvvi.supabase.co";
const SUPABASE_ANON_KEY: &str = "sb_publishable_xHQlpSPtA0H75GuESG3o7A_A3evq_vv";

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SessionInfo {
    pub user_id: String,
    pub email: String,
    pub access_token: String,
    pub refresh_token: String,
    pub expires_at: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct LoginCredentials {
    pub email: String,
    pub password: String,
}

#[command]
pub async fn login(credentials: LoginCredentials) -> Result<SessionInfo, String> {
    let client = reqwest::Client::new();

    let resp = client
        .post(format!("{SUPABASE_URL}/auth/v1/token?grant_type=password"))
        .header("apikey", SUPABASE_ANON_KEY)
        .header("Content-Type", "application/json")
        .json(&serde_json::json!({
            "email": credentials.email,
            "password": credentials.password
        }))
        .send()
        .await
        .map_err(|e| format!("Netzwerkfehler: {e}"))?;

    if !resp.status().is_success() {
        let body = resp.text().await.unwrap_or_default();
        return Err(format!("Login fehlgeschlagen: {body}"));
    }

    let data: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;

    Ok(SessionInfo {
        user_id: data["user"]["id"].as_str().unwrap_or("").to_string(),
        email: data["user"]["email"].as_str().unwrap_or("").to_string(),
        access_token: data["access_token"].as_str().unwrap_or("").to_string(),
        refresh_token: data["refresh_token"].as_str().unwrap_or("").to_string(),
        expires_at: chrono::Utc::now().timestamp()
            + data["expires_in"].as_i64().unwrap_or(3600),
    })
}

#[command]
pub async fn logout() -> Result<(), String> {
    // Token-Invalidierung — lokale Session wird vom Frontend via DB geleert
    Ok(())
}

#[command]
pub async fn get_session() -> Result<Option<SessionInfo>, String> {
    // Stub: Frontend liest Session direkt aus auth.db via tauri-plugin-sql
    Ok(None)
}
