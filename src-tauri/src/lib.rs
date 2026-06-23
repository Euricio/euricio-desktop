use tauri::{Manager, Listener};

mod db;
mod deep_link;
mod i18n;
mod sync;
mod tray;

rust_i18n::i18n!("i18n", fallback = "es");

/// Resolve (and create) the app data directory where `crm.db` lives.
#[tauri::command]
fn get_app_data_dir(app: tauri::AppHandle) -> Result<String, String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.to_string_lossy().to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, argv, _cwd| {
            deep_link::handle_args(app, argv);
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.unminimize();
                let _ = window.set_focus();
            }
        }))
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_sql::Builder::default().build())
        .setup(|app| {
            let locale = i18n::detect_system_locale();
            rust_i18n::set_locale(&locale);

            tray::setup(app)?;

            let handle2 = app.handle().clone();
            app.listen("deep-link://new-url", move |event| {
                let payload = event.payload();
                let url_str = payload.trim_matches('"');
                if let Ok(url) = url::Url::parse(url_str) {
                    deep_link::handle_url(&handle2, url);
                }
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_app_data_dir,
            db::migrations::run_migrations,
            sync::pull::sync_now,
            sync::pull::get_outbox_count,
            sync::pull::get_last_sync,
        ])
        .run(tauri::generate_context!())
        .expect("Euricio Desktop konnte nicht gestartet werden");
}
