use serde::{Deserialize, Serialize};
use tauri::command;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Contact {
    pub id: String,
    pub first_name: String,
    pub last_name: Option<String>,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub company: Option<String>,
    pub notes: Option<String>,
    pub sync_status: String,
    pub local_updated_at: i64,
}

/// Kontaktliste — Frontend nutzt tauri-plugin-sql direkt für einfache Queries.
/// Dieser Command ist für komplexe server-seitige Operationen reserviert.
#[command]
pub async fn list_contacts(_search: Option<String>) -> Result<Vec<Contact>, String> {
    Ok(vec![])
}

#[command]
pub async fn get_contact(_id: String) -> Result<Option<Contact>, String> {
    Ok(None)
}

/// Speichert einen Kontakt lokal und legt einen Sync-Queue-Eintrag an.
#[command]
pub async fn upsert_contact(contact: Contact) -> Result<Contact, String> {
    // TODO Phase 2: Schreiben in crm.db + sync_queue-Eintrag anlegen
    Ok(contact)
}
