import { useEffect, useState, useCallback } from "react";
import { listen } from "@tauri-apps/api/event";
import { useTranslation } from "react-i18next";
// @ts-ignore
import Database from "@tauri-apps/plugin-sql";
import ContactDetail from "./ContactDetail";

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
  onCall?: (phone: string, name: string) => void;
}

export default function Contacts({ session, onCall }: ContactsProps) {
  const { t } = useTranslation();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [detailId, setDetailId] = useState<string | null>(null);

  const loadContacts = useCallback(async () => {
    try {
      const db = await Database.load("sqlite:crm.db");
      const query = search
        ? `SELECT id, first_name, last_name, email, phone, mobile, company, status, updated_at
           FROM contacts
           WHERE deleted_at IS NULL
             AND (first_name LIKE ? OR last_name LIKE ? OR email LIKE ? OR company LIKE ?)
           ORDER BY first_name, last_name LIMIT 200`
        : `SELECT id, first_name, last_name, email, phone, mobile, company, status, updated_at
           FROM contacts WHERE deleted_at IS NULL
           ORDER BY first_name, last_name LIMIT 200`;
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

  useEffect(() => { loadContacts(); }, [loadContacts]);

  useEffect(() => {
    const u = listen("sync:data-updated", () => loadContacts());
    return () => { u.then((fn) => fn()); };
  }, [loadContacts]);

  useEffect(() => {
    const timer = setTimeout(loadContacts, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Detail-View
  if (detailId) {
    return (
      <ContactDetail
        contactId={detailId}
        onBack={() => setDetailId(null)}
        onCall={onCall}
      />
    );
  }

  const fullName = (c: Contact) =>
    [c.first_name, c.last_name].filter(Boolean).join(" ") || "–";

  const initials = (c: Contact) =>
    [c.first_name?.[0], c.last_name?.[0]].filter(Boolean).join("").toUpperCase() || "?";

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h2 style={styles.title}>{t("contacts.title")}</h2>
        <div style={styles.count}>{contacts.length}</div>
      </div>

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

      {loading ? (
        <div style={styles.empty}>{t("common.loading")}</div>
      ) : contacts.length === 0 ? (
        <div style={styles.empty}>{t("contacts.noContacts")}</div>
      ) : (
        <div style={styles.list}>
          {contacts.map((c) => (
            <button
              key={c.id}
              onClick={() => setDetailId(c.id)}
              style={styles.row}
            >
              <div style={styles.avatar}>
                <span style={styles.avatarText}>{initials(c)}</span>
              </div>
              <div style={styles.info}>
                <span style={styles.name}>{fullName(c)}</span>
                <span style={styles.sub}>
                  {[c.company, c.email].filter(Boolean).join(" · ") || c.phone || ""}
                </span>
              </div>
              {(c.phone || c.mobile) && onCall && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onCall(c.mobile ?? c.phone!, fullName(c));
                  }}
                  style={styles.quickCall}
                  title="Anrufen"
                >
                  📞
                </button>
              )}
              <span style={styles.chevron}>›</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { display: "flex", flexDirection: "column", height: "100%", gap: "16px" },
  header: { display: "flex", alignItems: "center", gap: "10px" },
  title: { margin: 0, fontSize: "22px", fontWeight: "700", color: "#111827" },
  count: {
    background: "#e5e7eb", color: "#374151",
    fontSize: "12px", fontWeight: "700", padding: "2px 8px", borderRadius: "10px",
  },
  searchWrapper: { position: "relative", display: "flex", alignItems: "center" },
  searchIcon: { position: "absolute", left: "12px", fontSize: "13px", pointerEvents: "none" },
  searchInput: {
    width: "100%", padding: "9px 36px",
    border: "1.5px solid #e5e7eb", borderRadius: "8px",
    fontSize: "14px", background: "white", color: "#111827", outline: "none",
  },
  clearBtn: {
    position: "absolute", right: "10px",
    background: "none", border: "none", color: "#9ca3af", cursor: "pointer", fontSize: "13px",
  },
  list: {
    background: "white", borderRadius: "10px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.08)", overflow: "hidden", flex: 1, overflowY: "auto",
  },
  row: {
    display: "flex", alignItems: "center", gap: "12px",
    padding: "12px 16px", width: "100%",
    background: "transparent", border: "none",
    borderBottom: "1px solid #f3f4f6",
    cursor: "pointer", textAlign: "left", transition: "background 0.1s",
  },
  avatar: {
    width: "38px", height: "38px", borderRadius: "50%",
    background: "linear-gradient(135deg, #005ab4, #0080ff)",
    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  avatarText: { color: "white", fontWeight: "700", fontSize: "13px" },
  info: { flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" },
  name: { fontWeight: "600", fontSize: "14px", color: "#111827" },
  sub: {
    fontSize: "12px", color: "#6b7280",
    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
  },
  quickCall: {
    background: "#dcfce7", border: "none", borderRadius: "50%",
    width: "30px", height: "30px", fontSize: "13px", cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  chevron: { color: "#d1d5db", fontSize: "18px", fontWeight: "300", flexShrink: 0 },
  empty: { textAlign: "center", color: "#9ca3af", padding: "40px", fontSize: "14px" },
};
