use tauri::{AppHandle, Emitter};
use serde::Serialize;

#[derive(Debug, Serialize, Clone)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum DeepLinkEvent {
    IncomingCall { phone: String },
    OpenContact   { id: String },
    OpenLead      { id: String },
    OpenTask      { id: String },
    TriggerSync,
}

/// Verarbeitet CLI-Argumente beim Start (Single Instance Redirect)
pub fn handle_args(app: &AppHandle, argv: Vec<String>) {
    for arg in argv.iter().skip(1) {
        if let Ok(url) = url::Url::parse(arg) {
            if url.scheme() == "euricio" {
                handle_url(app, url);
            }
        }
    }
}

/// Verarbeitet eine geparste euricio://-URL und gibt ein typisiertes Event ans Frontend
pub fn handle_url(app: &AppHandle, url: url::Url) {
    let event = match url.host_str() {
        Some("incoming-call") => {
            let phone = url
                .query_pairs()
                .find(|(k, _)| k == "phone")
                .map(|(_, v)| v.to_string())
                .unwrap_or_default();
            DeepLinkEvent::IncomingCall { phone }
        }
        Some("contact") => {
            let id = url.path().trim_start_matches('/').to_string();
            DeepLinkEvent::OpenContact { id }
        }
        Some("lead") => {
            let id = url.path().trim_start_matches('/').to_string();
            DeepLinkEvent::OpenLead { id }
        }
        Some("task") => {
            let id = url.path().trim_start_matches('/').to_string();
            DeepLinkEvent::OpenTask { id }
        }
        Some("sync") => DeepLinkEvent::TriggerSync,
        _ => return,
    };

    app.emit("deep-link-event", event).ok();
}
