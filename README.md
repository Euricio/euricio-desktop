# Euricio Desktop CRM

Plattformübergreifende Desktop-CRM-Anwendung für Euricio.
Gebaut mit **Tauri 2** · **React** · **TypeScript** · **SQLite** · **Rust**.

Synchronisiert sich mit dem Web-CRM unter [crm.euricio.es](https://crm.euricio.es) via Elixir/Phoenix-Backend.

## Voraussetzungen

- [Rust](https://rustup.rs/) stable
- [Node.js](https://nodejs.org/) 20+
- Plattform-Abhängigkeiten: https://v2.tauri.app/start/prerequisites/

## Entwicklung starten

```bash
npm install
npm run tauri dev
```

## Produktions-Build

```bash
npm run tauri build
```

Erzeugt Installationspakete unter `src-tauri/target/release/bundle/`:
- **macOS:** `.dmg` / `.app`
- **Windows:** `.exe` (NSIS) / `.msi`
- **Linux:** `.AppImage` / `.deb` / `.rpm`

## Protokoll-Handler

Die App registriert das `euricio://`-Protokoll:

| URL | Aktion |
|---|---|
| `euricio://incoming-call?phone=+34600123456` | Eingehenden Anruf anzeigen |
| `euricio://contact/{id}` | Kontaktdetail öffnen |
| `euricio://lead/{id}` | Lead öffnen |
| `euricio://task/{id}` | Aufgabe öffnen |
| `euricio://sync` | Synchronisierung manuell starten |

## Sprachen

| Code | Sprache |
|---|---|
| `de` | Deutsch |
| `en` | English |
| `es` | Español |
| `ca` | Català |
| `eu` | Euskara |

Fallback: Spanisch (`es`) → Englisch (`en`)

## Architektur

Drei SQLite-Datenbanken nach Concern getrennt:
- `crm.db` — Domänendaten (Kontakte, Leads, Objekte, Aufgaben, Aktivitäten, Sync-Queue)
- `auth.db` — Session / Tokens
- `cache.db` — Einstellungen, Telefon-Lookup-Cache, Event-Log

## Release

```bash
git tag desktop-v0.1.0
git push origin desktop-v0.1.0
```

GitHub Actions baut automatisch für alle drei Plattformen.
