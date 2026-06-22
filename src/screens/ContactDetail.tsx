import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { invoke } from "@tauri-apps/api/core";
// @ts-ignore
import Database from "@tauri-apps/plugin-sql";

interface Contact {
  id: string;
  first_name: string;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  company: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  notes: string | null;
  avatar_url: string | null;
  tags: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

interface Note {
  id: string;
  content: string;
  created_at: string;
}

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  due_date: string | null;
}

interface ContactDetailProps {
  contactId: string;
  onBack: () => void;
  onCall?: (phone: string, name: string) => void;
}

export default function ContactDetail({ contactId, onBack, onCall }: ContactDetailProps) {
  const { t } = useTranslation();
  const [contact, setContact] = useState<Contact | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newNote, setNewNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [tab, setTab] = useState<"info" | "notes" | "tasks">("info");

  useEffect(() => {
    loadContact();
  }, [contactId]);

  async function loadContact() {
    try {
      const db = await Database.load("sqlite:crm.db");
      const rows = await db.select(
        "SELECT * FROM contacts WHERE id = ? LIMIT 1",
        [contactId]
      );
      if (rows.length > 0) setContact(rows[0]);

      const noteRows = await db.select(
        "SELECT id, content, created_at FROM notes WHERE contact_id = ? AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 50",
        [contactId]
      );
      setNotes(noteRows);

      const taskRows = await db.select(
        "SELECT id, title, status, priority, due_date FROM tasks WHERE contact_id = ? AND deleted_at IS NULL ORDER BY due_date ASC NULLS LAST LIMIT 50",
        [contactId]
      );
      setTasks(taskRows);
    } catch (err) {
      console.error("Kontakt-Detail laden fehlgeschlagen:", err);
    }
  }

  async function saveNote() {
    if (!newNote.trim() || !contact) return;
    setSavingNote(true);
    try {
      const db = await Database.load("sqlite:crm.db");
      const id = crypto.randomUUID();
      await db.execute(
        "INSERT INTO notes (id, contact_id, content, created_at, updated_at) VALUES (?, ?, ?, datetime('now'), datetime('now'))",
        [id, contact.id, newNote.trim()]
      );
      setNewNote("");
      await loadContact();
    } catch (err) {
      console.error("Notiz speichern fehlgeschlagen:", err);
    } finally {
      setSavingNote(false);
    }
  }

  if (!contact) {
    return (
      <div style={styles.loading}>
        <span>{t("common.loading")}</span>
      </div>
    );
  }

  const fullName = [contact.first_name, contact.last_name].filter(Boolean).join(" ");
  const initials = [contact.first_name?.[0], contact.last_name?.[0]]
    .filter(Boolean).join("").toUpperCase();

  const tags: string[] = (() => {
    try { return JSON.parse(contact.tags ?? "[]"); }
    catch { return []; }
  })();

  return (
    <div style={styles.page}>
      {/* Back Button */}
      <button onClick={onBack} style={styles.backBtn}>
        ← {t("contacts.title")}
      </button>

      {/* Hero */}
      <div style={styles.hero}>
        <div style={styles.heroAvatar}>
          {contact.avatar_url ? (
            <img src={contact.avatar_url} alt="" style={styles.heroAvatarImg} />
          ) : (
            <span style={styles.heroInitials}>{initials}</span>
          )}
        </div>
        <div style={styles.heroInfo}>
          <h2 style={styles.heroName}>{fullName}</h2>
          {contact.company && <p style={styles.heroCompany}>{contact.company}</p>}
          {tags.length > 0 && (
            <div style={styles.tags}>
              {tags.map((tag) => (
                <span key={tag} style={styles.tag}>{tag}</span>
              ))}
            </div>
          )}
        </div>

        {/* Quick-Action Buttons */}
        <div style={styles.actions}>
          {(contact.phone || contact.mobile) && onCall && (
            <button
              onClick={() => onCall(contact.mobile ?? contact.phone!, fullName)}
              style={styles.callBtn}
              title="Anrufen"
            >
              📞
            </button>
          )}
          {contact.email && (
            <a
              href={`mailto:${contact.email}`}
              style={styles.emailBtn}
              title="E-Mail senden"
            >
              ✉
            </a>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={styles.tabs}>
        {(["info", "notes", "tasks"] as const).map((tabId) => (
          <button
            key={tabId}
            onClick={() => setTab(tabId)}
            style={{ ...styles.tab, ...(tab === tabId ? styles.tabActive : {}) }}
          >
            {tabId === "info" ? "Info" : tabId === "notes" ? `Notizen (${notes.length})` : `Aufgaben (${tasks.length})`}
          </button>
        ))}
      </div>

      {/* Tab-Content */}
      {tab === "info" && (
        <div style={styles.card}>
          {[
            { label: "E-Mail",   value: contact.email, href: `mailto:${contact.email}` },
            { label: "Telefon",  value: contact.phone },
            { label: "Mobil",    value: contact.mobile },
            { label: "Adresse",  value: [contact.address, contact.city, contact.country].filter(Boolean).join(", ") || null },
          ].filter((r) => r.value).map((r) => (
            <div key={r.label} style={styles.row}>
              <span style={styles.rowLabel}>{r.label}</span>
              {r.href ? (
                <a href={r.href} style={styles.rowLink}>{r.value}</a>
              ) : (
                <span style={styles.rowValue}>{r.value}</span>
              )}
            </div>
          ))}
          {contact.notes && (
            <div style={{ ...styles.row, flexDirection: "column", alignItems: "flex-start", gap: "6px" }}>
              <span style={styles.rowLabel}>Interne Notiz</span>
              <p style={styles.noteText}>{contact.notes}</p>
            </div>
          )}
        </div>
      )}

      {tab === "notes" && (
        <div style={styles.notesSection}>
          <div style={styles.noteInput}>
            <textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Neue Notiz hinzufügen..."
              style={styles.textarea}
              rows={3}
            />
            <button
              onClick={saveNote}
              disabled={!newNote.trim() || savingNote}
              style={{
                ...styles.saveNoteBtn,
                opacity: !newNote.trim() || savingNote ? 0.5 : 1,
              }}
            >
              {savingNote ? "Speichern..." : "Speichern"}
            </button>
          </div>
          {notes.length === 0 ? (
            <div style={styles.emptyTab}>Noch keine Notizen</div>
          ) : (
            notes.map((note) => (
              <div key={note.id} style={styles.noteCard}>
                <p style={styles.noteContent}>{note.content}</p>
                <span style={styles.noteDate}>
                  {new Date(note.created_at).toLocaleString()}
                </span>
              </div>
            ))
          )}
        </div>
      )}

      {tab === "tasks" && (
        <div style={styles.taskList}>
          {tasks.length === 0 ? (
            <div style={styles.emptyTab}>Keine Aufgaben</div>
          ) : (
            tasks.map((task) => (
              <div key={task.id} style={styles.taskCard}>
                <div style={{
                  ...styles.taskPriBar,
                  background: task.priority === "high" ? "#ef4444" : task.priority === "medium" ? "#f59e0b" : "#22c55e",
                }} />
                <div style={styles.taskBody}>
                  <span style={styles.taskTitle}>{task.title}</span>
                  {task.due_date && (
                    <span style={styles.taskDue}>
                      📅 {new Date(task.due_date).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { display: "flex", flexDirection: "column", gap: "16px", maxWidth: "600px" },
  loading: { display: "flex", justifyContent: "center", padding: "40px", color: "#9ca3af" },
  backBtn: {
    background: "none", border: "none", color: "#005ab4",
    fontSize: "14px", fontWeight: "600", cursor: "pointer",
    padding: 0, alignSelf: "flex-start",
  },
  hero: {
    background: "white", borderRadius: "12px", padding: "20px",
    display: "flex", alignItems: "center", gap: "16px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
  },
  heroAvatar: {
    width: "60px", height: "60px", borderRadius: "50%",
    background: "linear-gradient(135deg, #005ab4, #0080ff)",
    display: "flex", alignItems: "center", justifyContent: "center",
    overflow: "hidden", flexShrink: 0,
  },
  heroAvatarImg: { width: "100%", height: "100%", objectFit: "cover" },
  heroInitials: { color: "white", fontWeight: "700", fontSize: "22px" },
  heroInfo: { flex: 1 },
  heroName: { margin: "0 0 4px", fontSize: "20px", fontWeight: "700", color: "#111827" },
  heroCompany: { margin: "0 0 8px", fontSize: "13px", color: "#6b7280" },
  tags: { display: "flex", flexWrap: "wrap", gap: "4px" },
  tag: {
    background: "#eff6ff", color: "#1d4ed8",
    fontSize: "11px", fontWeight: "600",
    padding: "2px 8px", borderRadius: "10px",
  },
  actions: { display: "flex", gap: "8px" },
  callBtn: {
    background: "#dcfce7", border: "none", borderRadius: "50%",
    width: "38px", height: "38px", fontSize: "16px",
    cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
  },
  emailBtn: {
    background: "#eff6ff", borderRadius: "50%",
    width: "38px", height: "38px", fontSize: "16px",
    display: "flex", alignItems: "center", justifyContent: "center",
    textDecoration: "none",
  },
  tabs: { display: "flex", gap: "4px" },
  tab: {
    padding: "6px 14px", borderRadius: "20px",
    border: "1.5px solid #e5e7eb",
    background: "white", color: "#374151",
    fontSize: "13px", fontWeight: "500", cursor: "pointer",
  },
  tabActive: { background: "#0a1628", color: "white", borderColor: "#0a1628" },
  card: {
    background: "white", borderRadius: "10px", padding: "4px 0",
    boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
  },
  row: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "10px 16px", borderBottom: "1px solid #f3f4f6",
  },
  rowLabel: { fontSize: "12px", color: "#9ca3af", fontWeight: "600", minWidth: "80px" },
  rowValue: { fontSize: "14px", color: "#111827" },
  rowLink: { fontSize: "14px", color: "#005ab4", textDecoration: "none" },
  noteText: { margin: 0, fontSize: "13px", color: "#374151", lineHeight: 1.5 },
  notesSection: { display: "flex", flexDirection: "column", gap: "10px" },
  noteInput: { display: "flex", flexDirection: "column", gap: "8px" },
  textarea: {
    padding: "10px 12px", border: "1.5px solid #e5e7eb", borderRadius: "8px",
    fontSize: "14px", resize: "vertical", outline: "none", color: "#111827",
  },
  saveNoteBtn: {
    background: "linear-gradient(135deg, #005ab4, #0080ff)",
    color: "white", border: "none", borderRadius: "8px",
    padding: "8px 20px", fontWeight: "600", cursor: "pointer",
    alignSelf: "flex-end", fontSize: "13px",
  },
  noteCard: {
    background: "white", borderRadius: "8px", padding: "12px 14px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
  },
  noteContent: { margin: "0 0 6px", fontSize: "13px", color: "#374151", lineHeight: 1.5 },
  noteDate: { fontSize: "11px", color: "#9ca3af" },
  emptyTab: { textAlign: "center", color: "#9ca3af", padding: "32px", fontSize: "14px" },
  taskList: { display: "flex", flexDirection: "column", gap: "8px" },
  taskCard: {
    background: "white", borderRadius: "8px",
    display: "flex", overflow: "hidden",
    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
  },
  taskPriBar: { width: "4px", flexShrink: 0 },
  taskBody: {
    flex: 1, padding: "10px 12px",
    display: "flex", justifyContent: "space-between", alignItems: "center",
  },
  taskTitle: { fontSize: "13px", fontWeight: "600", color: "#111827" },
  taskDue: { fontSize: "11px", color: "#6b7280" },
};
