use serde::Serialize;
use tauri::{command, AppHandle, Emitter};
use tauri_plugin_store::StoreExt;

#[derive(Debug, Serialize, Clone)]
pub struct SyncStatus {
    pub status: String,         // "synced" | "syncing" | "error" | "offline"
    pub last_synced_at: Option<i64>,
    pub pending_count: usize,
    pub error: Option<String>,
}

#[command]
pub async fn get_sync_status(app: AppHandle) -> Result<SyncStatus, String> {
    // Letzte Status aus Store lesen
    let last_synced_at = app
        .store("sync_cursors.json")
        .ok()
        .and_then(|s| s.get("last_synced_at"))
        .and_then(|v| v.as_i64());

    // Outbox-Größe
    let pending_count = app
        .store("outbox.json")
        .ok()
        .and_then(|s| s.get("entries"))
        .and_then(|v| v.as_array().map(|a| a.len()))
        .unwrap_or(0);

    Ok(SyncStatus {
        status: if pending_count > 0 { "pending".into() } else { "synced".into() },
        last_synced_at,
        pending_count,
        error: None,
    })
}

#[command]
pub async fn trigger_sync(app: AppHandle) -> Result<(), String> {
    app.emit("trigger-sync", ()).map_err(|e| e.to_string())
}

#[command]
pub async fn reset_sync_cursors(app: AppHandle) -> Result<(), String> {
    if let Ok(store) = app.store("sync_cursors.json") {
        store.clear();
        store.save().map_err(|e| e.to_string())?;
    }
    app.emit("trigger-sync", ()).map_err(|e| e.to_string())?;
    Ok(())
}
