use tauri::AppHandle;

/// Delta-Pull: Ruft Änderungen seit dem letzten Cursor vom Backend ab.
/// TODO Phase 2: Cursor-basierter Pull via Phoenix.Sync implementieren
pub async fn pull_changes(_app: &AppHandle) -> Result<(), String> {
    Ok(())
}
