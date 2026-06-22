use std::time::Duration;
use tauri::{AppHandle, Emitter, Listener};
use tokio::time;

const SYNC_INTERVAL_SECS: u64 = 60;
const HEALTH_URL: &str = "https://euricio-crm.fly.dev/health";

pub async fn run(app: AppHandle) {
    let mut interval = time::interval(Duration::from_secs(SYNC_INTERVAL_SECS));

    // Manuellen Sync-Trigger abonnieren
    let app_trigger = app.clone();
    app.listen("trigger-sync", move |_| {
        let handle = app_trigger.clone();
        tauri::async_runtime::spawn(async move {
            run_cycle(&handle).await;
        });
    });

    loop {
        interval.tick().await;
        run_cycle(&app).await;
    }
}

async fn run_cycle(app: &AppHandle) {
    let online = check_online().await;
    app.emit("sync-online-changed", online).ok();

    if !online {
        return;
    }

    app.emit("sync-started", ()).ok();

    if let Err(e) = super::push::process_outbox(app).await {
        log::warn!("Sync Push fehlgeschlagen: {e}");
        app.emit("sync-error", e).ok();
        return;
    }

    if let Err(e) = super::pull::pull_changes(app).await {
        log::warn!("Sync Pull fehlgeschlagen: {e}");
        app.emit("sync-error", e).ok();
        return;
    }

    app.emit("sync-completed", chrono::Utc::now().timestamp()).ok();
}

async fn check_online() -> bool {
    reqwest::get(HEALTH_URL)
        .await
        .map(|r| r.status().is_success())
        .unwrap_or(false)
}
