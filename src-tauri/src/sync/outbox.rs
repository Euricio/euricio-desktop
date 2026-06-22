//! Outbox-Hilfsfunktionen.
//! Die eigentliche Outbox-Logik (enqueue, process_outbox) befindet sich in push.rs.

use chrono::Utc;
use uuid::Uuid;

/// Aktuellen Unix-Timestamp zurückgeben.
pub fn now_timestamp() -> i64 {
    Utc::now().timestamp()
}

/// Neue UUID als String generieren.
pub fn new_id() -> String {
    Uuid::new_v4().to_string()
}
