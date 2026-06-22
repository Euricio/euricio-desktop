use tauri::AppHandle;

/// Outbox verarbeiten: Ausstehende lokale Änderungen ans Backend senden.
/// TODO Phase 2: sync_queue lesen und via POST /sync/push übertragen
pub async fn process_outbox(_app: &AppHandle) -> Result<(), String> {
    Ok(())
}
