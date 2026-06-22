use tauri::{
    App, Manager,
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::{MouseButton, TrayIconBuilder, TrayIconEvent},
};
use rust_i18n::t;

pub fn setup(app: &mut App) -> tauri::Result<()> {
    let open = MenuItem::with_id(app, "open", t!("tray.open"), true, None::<&str>)?;
    let sync  = MenuItem::with_id(app, "sync",  t!("tray.sync"),  true, None::<&str>)?;
    let sep   = PredefinedMenuItem::separator(app)?;
    let quit  = MenuItem::with_id(app, "quit",  t!("tray.quit"),  true, None::<&str>)?;

    let menu = Menu::with_items(app, &[&open, &sync, &sep, &quit])?;

    TrayIconBuilder::new()
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "open" => {
                if let Some(w) = app.get_webview_window("main") {
                    let _ = w.show();
                    let _ = w.set_focus();
                }
            }
            "sync" => {
                app.emit("trigger-sync", ()).ok();
            }
            "quit" => {
                app.exit(0);
            }
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            // Linksklick auf Tray-Icon: Fenster zeigen
            if let TrayIconEvent::Click { button: MouseButton::Left, .. } = event {
                let app = tray.app_handle();
                if let Some(w) = app.get_webview_window("main") {
                    let _ = w.show();
                    let _ = w.set_focus();
                }
            }
        })
        .build(app)?;

    Ok(())
}
