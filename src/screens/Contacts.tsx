import { useEffect, useState, useCallback } from "react";
import { listen } from "@tauri-apps/api/event";
import { useTranslation } from "react-i18next";

// tauri-plugin-sql wird direkt im Frontend für SQLite-Queries genutzt
// @ts-ignore — plugin types
import Database from "@tauri-apps/plugin-sql";

interface SessionInfo {
  user_id: string;
  email: string;
  access_token: string;
}

interface Contact {
  id: string;
  first_name: string;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  company: string | null;
  status: string;
  updated_at: string;
}

interface ContactsProps {
  session: SessionInfo;
}

export default function Contacts({ session }: ContactsProps) {
  const { t } = useTranslation();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Contact | null>(null);

  const loadContacts = useCallback(async () => {
    try {
      const db = await Database.load("sqlite:crm.db");
      const query = search
        ? `SELECT id, first_name, last_name, email, phone, mobile, company, status, updated_at
           FROM contacts
           WHERE deleted_at IS NULL
             AND (first_name LIKE ? OR last_name LIKE ? OR email LIKE ? OR company LIKE ?)
           ORDER BY first_name, last_name
           LIMIT 200`
        : `SELECT id, first_name, last_name, email, phone, mobile, company, status, updated_at
           FROM contacts
           WHERE deleted_at IS NULL
           ORDER BY first_name, last_name
           LIMIT 200`;

      const params = search
        ? [`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`]
        : [];

      const rows = await db.select(query, params);
      setContacts(rows);
    } catch (err) {
      console.error("Kontakte laden fehlgeschlagen:", err);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  // Auf Sync-Updates hören und Kontakte neu laden
  useEffect(() => {
    const unlisten = listen("sync:data-updated", () => {
      loadContacts();
    });
    return () => { unlisten.then((fn) => fn()); };
  }, [loadContacts]);

  // Debounce Suche
  useEffect(() => {
    const timer = setTimeout(loadContacts, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const fullName = (c: Contact) =>
    [c.first_name, c.last_name].filter(Boolean).join(" ") || "–";

  const initials = (c: Contact) =>
    [c.first_name?.[0], c.last_name?.[0]]
      .filter(Boolean)
      .join("")
      .toUpperCase() || "?";

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <h2 style={styles.title}>{t("contacts.title")}</h2>
        <div style={styles.count}>{contacts.length}</div>
      </div>

      {/* Suchfeld */}
      <div style={styles.searchWrapper}>
        <span style={styles.searchIcon}>🔍</span>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("contacts.search")}
          style={styles.searchInput}
        />
        {search && (
          <button onClick={() => setSearch("")} style={styles.clearBtn}>✕</button>
        )}
      </div>

      {/* Liste */}
      {loading ? (
        <div style={styles.empty}>{t("common.loading")}</div>
      ) : contacts.length === 0 ? (
        <div style={styles.empty}>{t("contacts.noContacts")}</div>
      ) : (
        <div style={styles.list}>
          {contacts.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelected(selected?.id === c.id ? null : c)}
              style={{
                ...styles.row,
                ...(selected?.id === c.id ? styles.rowSelected : {}),
              }}
            >
              {/* Avatar */}
              <div style={styles.avatar}>
                <span style={styles.avatarText}>{initials(c)}</span>
              </div>

              {/* Info */}
              <div style={styles.info}>
                <span style={styles.name}>{fullName(c)}</span>
                <span style={styles.sub}>
                  {[c.company, c.email].filter(Boolean).join(" · ") || c.phone || ""}
                </span>
              </div>

              {/* Status-Dot */}
              <div
                style={{
                  ...styles.statusDot,
                  background: c.status === "active" ? "#22c55e" : "#9ca3af",
                }}
              />
            </button>
          ))}
        </div>
      )}

      {/* Quick-Detail Panel */}
      {selected && (
        <div style={styles.detail}>
          <div style={styles.detailHeader}>
            <strong style={styles.detailName}>{fullName(selected)}</strong>
            <button onClick={() => setSelected(null)} style={styles.closeBtn}>✕</button>
          </div>
          {[
            { label: "E-Mail", value: selected.email },
            { label: "Telefon", value: selected.phone },
            { label: "Mobil", value: selected.mobile },
            { label: "Unternehmen", value: selected.company },
          ]
            .filter((r) => r.value)
            .map((r) => (
              <div key={r.label} style={styles.detailRow}>
                <span style={styles.detailLabel}>{r.label}</span>
                <span style={styles.detailValue}>{r.value}</span>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

const AVATAR_COLORS = [
  "#005ab4", "#0080ff", "#7c3aed", "#059669", "#d97706", "#dc2626",
];

const styles: Record<string, React.CSSProperties> = {
  page: { display: "flex", flexDirection: "column", height: "100%", gap: "16px" },
  header: { display: "flex", alignItems: "center", gap: "10px" },
  title: { margin: 0, fontSize: "22px", fontWeight: "700", color: "#111827" },
  count: {
    background: "#e5e7eb", color: "#374151",
    fontSize: "12px", fontWeight: "700",
    padding: "2px 8px", borderRadius: "10px",
  },
  searchWrapper: {
    position: "relative", display: "flex", alignItems: "center",
  },
  searchIcon: {
    position: "absolute", left: "12px", fontSize: "13px", pointerEvents: "none",
  },
  searchInput: {
    width: "100%", padding: "9px 36px",
    border: "1.5px solid #e5e7eb", borderRadius: "8px",
    fontSize: "14px", background: "white", color: "#111827",
    outline: "none",
  },
  clearBtn: {
    position: "absolute", right: "10px",
    background: "none", border: "none",
    color: "#9ca3af", cursor: "pointer", fontSize: "13px",
  },
  list: {
    background: "white", borderRadius: "10px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
    overflow: "hidden", flex: 1, overflowY: "auto",
  },
  row: {
    display: "flex", alignItems: "center", gap: "12px",
    padding: "12px 16px", width: "100%",
    background: "transparent", border: "none",
    borderBottom: "1px solid #f3f4f6",
    cursor: "pointer", textAlign: "left",
    transition: "background 0.1s",
  },
  rowSelected: { background: "#eff6ff" },
  avatar: {
    width: "38px", height: "38px", borderRadius: "50%",
    background: "linear-gradient(135deg, #005ab4, #0080ff)",
    display: "flex", alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  },
  avatarText: { color: "white", fontWeight: "700", fontSize: "13px" },
  info: { flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" },
  name: { fontWeight: "600", fontSize: "14px", color: "#111827" },
  sub: {
    fontSize: "12px", color: "#6b7280",
    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
  },
  statusDot: { width: "8px", height: "8px", borderRadius: "50%", flexShrink: 0 },
  empty: { textAlign: "center", color: "#9ca3af", padding: "40px", fontSize: "14px" },
  detail: {
    background: "white", borderRadius: "10px",
    padding: "16px", boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
  },
  detailHeader: {
    display: "flex", justifyContent: "space-between",
    alignItems: "center", marginBottom: "12px",
  },
  detailName: { fontSize: "16px", color: "#111827" },
  closeBtn: {
    background: "#f3f4f6", border: "none", borderRadius: "6px",
    padding: "4px 10px", cursor: "pointer", color: "#374151",
  },
  detailRow: {
    display: "flex", justifyContent: "space-between",
    padding: "8px 0", borderBottom: "1px solid #f3f4f6",
  },
  detailLabel: { fontSize: "12px", color: "#9ca3af", fontWeight: "600" },
  detailValue: { fontSize: "13px", color: "#111827" },
};
