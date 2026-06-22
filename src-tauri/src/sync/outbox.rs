use chrono::Utc;
use uuid::Uuid;

pub struct OutboxEntry {
    pub entity_type: String,
    pub entity_id: String,
    pub operation: String, // "create" | "update" | "delete"
    pub payload: String,   // JSON-Snapshot der Änderung
}

pub fn now_timestamp() -> i64 {
    Utc::now().timestamp()
}

pub fn new_id() -> String {
    Uuid::new_v4().to_string()
}
