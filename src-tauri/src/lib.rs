use tauri::{Manager, Listener};

mod commands;
mod db;
mod deep_link;
mod i18n;
mod sync;
mod tray;

rust_i18n::i18n!("i18n", fallback = "es");

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let migrations = db::migrations::all();

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
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:crm.db", migrations.crm)
                .add_migrations("sqlite:auth.db", migrations.auth)
                .add_migrations("sqlite:cache.db", migrations.cache)
                .build(),
        )
        .setup(|app| {
            let locale = i18n::detect_system_locale();
            rust_i18n::set_locale(&locale);

            tray::setup(app)?;

            let handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                sync::engine::run(handle).await;
            });

            let handle2 = app.handle().clone();
            app.listen("deep-link://new-url", move |event| {
                let payload = event.payload();
                let url_str = payload.trim_matches('"'');
                if let Ok(url) = url::Url::parse(url_str) {
                    deep_link::handle_url(&handle2, url);
                }
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::auth::login,
            commands::auth::logout,
            commands::auth::get_session,
            commands::contacts::list_contacts,
            commands::contacts::get_contact,
            commands::contacts::upsert_contact,
            commands::sync::trigger_sync,
            commands::sync::get_sync_status,
            commands::calls::resolve_phone,
        ])
        .run(tauri::generate_context!())
        .expect("Euricio Desktop konnte nicht gestartet werden");
}
