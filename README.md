# Euricio CRM Desktop

Plattformübergreifende CRM-Desktop-App für das Euricio-Team.  
Gebaut mit **Tauri 2** (Rust) + **React** (TypeScript) + **SQLite** (offline-first).

## Stack

| Schicht | Technologie |
|---|---|
| Shell | Tauri 2 (Rust) |
| Frontend | React 18 + TypeScript + Vite |
| Datenbank | SQLite (3 DBs: crm, auth, cache) |
| Auth | Supabase JWT |
| Backend-Sync | Elixir/Phoenix auf Fly.io |
| i18n | react-i18next (de, en, es, ca, eu) |

## Voraussetzungen

```bash
# Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Node.js 20+
# https://nodejs.org oder via nvm

# Linux: System-Dependencies
sudo apt install -y libwebkit2gtk-4.1-dev libgtk-3-dev \
  libayatana-appindicator3-dev librsvg2-dev patchelf
```

## Entwicklung

```bash
git clone https://github.com/Euricio/euricio-desktop.git
cd euricio-desktop
npm install
npm run tauri dev
```

## Architektur

```
src/                          # React Frontend
├── screens/                  # Login, Contacts, ContactDetail, Tasks, Settings
├── components/
│   ├── layout/               # AppShell, Sidebar, SyncStatusBar
│   └── calls/                # CallPopup
├── i18n/locales/             # de, en, es, ca, eu
└── utils/                    # format.ts, phone.ts

src-tauri/src/                # Rust Backend
├── commands/                 # auth, contacts, sync, calls
├── sync/                     # engine, pull, push, outbox
├── db/migrations.rs          # SQLite-Schemas
├── tray.rs                   # System-Tray
├── deep_link.rs              # euricio:// URL-Handler
└── i18n.rs                   # Systemsprache erkennen
```

## SQLite-Datenbanken

| DB | Tabellen | Zweck |
|---|---|---|
| `crm.db` | contacts, tasks, notes, outbox | Domänendaten |
| `auth.db` | session | JWT-Session |
| `cache.db` | settings, sync_state | Einstellungen, Sync-Cursor |

## Sync-Strategie

1. **Pull**: Delta-Sync via Cursor gegen `GET /api/v2/contacts?cursor=...`
2. **Push**: Outbox-Pattern — lokale Änderungen werden in `outbox.json` gequeued und bei nächster Verbindung gesendet (max. 3 Retries)
3. **Konflikt**: Last-Write-Wins (Server gewinnt bei Pull, Client gewinnt bei Push)
4. **Interval**: alle 30 Sekunden + manueller Trigger via Tray-Menü

## Deep Links

```
euricio://incoming-call?phone=+34600000000
euricio://contact/<id>
euricio://task/<id>
euricio://sync
```

## Release

```bash
# Version taggen → GitHub Actions baut automatisch für alle Plattformen
git tag v0.2.0
git push origin v0.2.0
```

Builds für: macOS (arm64 + x86_64), Linux (AppImage + .deb), Windows (.msi + .exe)

## Verbindungen

| Service | URL |
|---|---|
| Elixir Backend | `https://euricio-crm.fly.dev` |
| Supabase | `https://vddfghfvmnrbotmxhvvi.supabase.co` |
| Web-CRM | `https://crm.euricio.es` |

---

© 2026 Euricio · ez@euricio.es
