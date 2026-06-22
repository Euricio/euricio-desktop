use serde::Serialize;
use tauri::{command, AppHandle, Emitter};

#[derive(Debug, Serialize, Clone)]
pub struct SyncStatus {
    pub is_online: bool,
    pub sync_in_progress: bool,
    pub last_pull_at: Option<i64>,
    pub last_push_at: Option<i64>,
    pub pending_count: i64,
}

#[command]
pub async fn get_sync_status() -> Result<SyncStatus, String> {
    // TODO Phase 2: Werte aus sync_state-Tabelle lesen
    Ok(SyncStatus {
        is_online: false,
        sync_in_progress: false,
        last_pull_at: None,
        last_push_at: None,
        pending_count: 0,
    })
}

#[command]
pub async fn trigger_sync(app: AppHandle) -> Result<(), String> {
    app.emit("trigger-sync", ()).map_err(|e| e.to_string())
}
