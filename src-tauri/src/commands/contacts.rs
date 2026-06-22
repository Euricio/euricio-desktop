use serde::{Deserialize, Serialize};
use tauri::{command, AppHandle};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Contact {
    pub id: String,
    pub first_name: String,
    pub last_name: Option<String>,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub mobile: Option<String>,
    pub company: Option<String>,
    pub address: Option<String>,
    pub city: Option<String>,
    pub country: Option<String>,
    pub notes: Option<String>,
    pub avatar_url: Option<String>,
    pub tags: Option<String>,
    pub status: String,
}

/// Einfache Kontaktliste — das Frontend nutzt tauri-plugin-sql direkt für Queries.
/// Dieser Command bleibt als Fallback für komplexe Server-seitige Operationen.
#[command]
pub async fn list_contacts(_search: Option<String>) -> Result<Vec<Contact>, String> {
    // Frontend liest direkt via tauri-plugin-sql aus SQLite
    Ok(vec![])
}

#[command]
pub async fn get_contact(_id: String) -> Result<Option<Contact>, String> {
    // Frontend liest direkt via tauri-plugin-sql aus SQLite
    Ok(None)
}

/// Speichert einen Kontakt lokal und stellt ihn in die Outbox für den nächsten Sync.
/// Wird genutzt wenn das Frontend keinen direkten DB-Zugriff nutzt.
#[command]
pub async fn upsert_contact(
    contact: Contact,
    app: AppHandle,
) -> Result<Contact, String> {
    // Payload für Outbox aufbauen
    let payload = serde_json::to_value(&contact)
        .map_err(|e| format!("Serialisierungsfehler: {}", e))?;

    let operation = if contact.id.starts_with("local_") {
        "create"
    } else {
        "update"
    };

    // In Outbox einstellen (wird beim nächsten Sync-Zyklus hochgeladen)
    crate::sync::push::enqueue(&app, "contacts", &contact.id, operation, payload);

    // Sync anstoßen
    use tauri::Emitter;
    app.emit("trigger-sync", ()).ok();

    Ok(contact)
}

/// Löscht einen Kontakt lokal (soft delete via Outbox).
#[command]
pub async fn delete_contact(id: String, app: AppHandle) -> Result<(), String> {
    crate::sync::push::enqueue(
        &app,
        "contacts",
        &id,
        "delete",
        serde_json::json!({ "id": id }),
    );
    use tauri::Emitter;
    app.emit("trigger-sync", ()).ok();
    Ok(())
}
