use std::time::Duration;
use tauri::{AppHandle, Emitter, Listener};
use tauri_plugin_store::StoreExt;
use tokio::time;

const SYNC_INTERVAL_SECS: u64 = 30;
const HEALTH_URL: &str = "https://euricio-crm.fly.dev/health";

pub async fn run(app: AppHandle) {
    // Ersten Sync kurz nach Start (5s Delay damit UI bereit ist)
    let app_initial = app.clone();
    tauri::async_runtime::spawn(async move {
        time::sleep(Duration::from_secs(5)).await;
        run_cycle(&app_initial).await;
    });

    // Manuellen Sync-Trigger abonnieren (vom Tray-Menü oder Frontend)
    let app_trigger = app.clone();
    app.listen("trigger-sync", move |_| {
        let handle = app_trigger.clone();
        tauri::async_runtime::spawn(async move {
            run_cycle(&handle).await;
        });
    });

    // Regelmäßiger Interval-Sync
    let mut interval = time::interval(Duration::from_secs(SYNC_INTERVAL_SECS));
    loop {
        interval.tick().await;
        run_cycle(&app).await;
    }
}

pub async fn run_cycle(app: &AppHandle) {
    // Wenn kein Token vorhanden: still überspringen (Benutzer nicht eingeloggt)
    if !has_session(app) {
        return;
    }

    let online = check_online().await;
    app.emit("sync:online", online).ok();

    if !online {
        app.emit("sync:status", SyncStatusEvent {
            status: "offline".into(),
            message: None,
            timestamp: now_ts(),
        }).ok();
        return;
    }

    app.emit("sync:status", SyncStatusEvent {
        status: "syncing".into(),
        message: None,
        timestamp: now_ts(),
    }).ok();

    // 1. Outbox leeren (lokale Änderungen hochladen)
    match super::push::process_outbox(app).await {
        Ok(pushed) => {
            if pushed > 0 {
                log::info!("Sync: {} Einträge hochgeladen", pushed);
            }
        }
        Err(e) => {
            // Auth-Fehler still ignorieren — nicht als Banner anzeigen
            if is_auth_error(&e) {
                log::debug!("Sync Push: kein Token verfügbar, überspringe");
                return;
            }
            log::warn!("Sync Push fehlgeschlagen: {e}");
            app.emit("sync:status", SyncStatusEvent {
                status: "error".into(),
                message: Some(e),
                timestamp: now_ts(),
            }).ok();
            return;
        }
    }

    // 2. Änderungen vom Server holen
    match super::pull::pull_changes(app).await {
        Ok(pulled) => {
            if pulled > 0 {
                log::info!("Sync: {} Einträge heruntergeladen", pulled);
                app.emit("sync:data-updated", pulled).ok();
            }
        }
        Err(e) => {
            // Auth-Fehler still ignorieren
            if is_auth_error(&e) {
                log::debug!("Sync Pull: kein Token verfügbar, überspringe");
                return;
            }
            log::warn!("Sync Pull fehlgeschlagen: {e}");
            app.emit("sync:status", SyncStatusEvent {
                status: "error".into(),
                message: Some(e),
                timestamp: now_ts(),
            }).ok();
            return;
        }
    }

    app.emit("sync:status", SyncStatusEvent {
        status: "synced".into(),
        message: None,
        timestamp: now_ts(),
    }).ok();
}

/// Prüft ob ein Token im Store vorhanden ist (Benutzer eingeloggt)
fn has_session(app: &AppHandle) -> bool {
    app.store("auth.json")
        .ok()
        .and_then(|store| store.get("session"))
        .and_then(|session| session.get("access_token").cloned())
        .and_then(|t| t.as_str().map(|s| !s.is_empty()))
        .unwrap_or(false)
}

/// Auth-Fehler: kein Token, abgelaufen, oder 401
fn is_auth_error(e: &str) -> bool {
    e.contains("Kein Auth-Store")
        || e.contains("Keine aktive Session")
        || e.contains("Kein Access-Token")
        || e.contains("Authentifizierung abgelaufen")
}

async fn check_online() -> bool {
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(5))
        .build()
        .unwrap_or_default();

    client
        .get(HEALTH_URL)
        .send()
        .await
        .map(|r| r.status().is_success())
        .unwrap_or(false)
}

fn now_ts() -> i64 {
    chrono::Utc::now().timestamp()
}

#[derive(serde::Serialize, Clone)]
struct SyncStatusEvent {
    status: String,
    message: Option<String>,
    timestamp: i64,
}
