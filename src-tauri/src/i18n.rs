/// Ermittelt die Systemsprache und gibt einen unterstützten Locale-Code zurück.
/// Unterstützte Sprachen: de, en, es, ca, eu
/// Fallback: "es" (Spanisch — Primärmarkt)
pub fn detect_system_locale() -> String {
    let supported = ["de", "en", "es", "ca", "eu"];

    let sys_locale = std::env::var("LANG")
        .or_else(|_| std::env::var("LANGUAGE"))
        .unwrap_or_default()
        .split('.')
        .next()
        .unwrap_or("es")
        .split('_')
        .next()
        .unwrap_or("es")
        .to_lowercase();

    if supported.contains(&sys_locale.as_str()) {
        sys_locale
    } else {
        "es".to_string()
    }
}
