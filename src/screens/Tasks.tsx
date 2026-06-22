import { useEffect, useState, useCallback } from "react";
import { listen } from "@tauri-apps/api/event";
import { useTranslation } from "react-i18next";
// @ts-ignore
import Database from "@tauri-apps/plugin-sql";

interface SessionInfo {
  user_id: string;
  email: string;
  access_token: string;
}

interface Task {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  priority: "low" | "medium" | "high";
  status: "pending" | "in_progress" | "done" | "cancelled";
  contact_id: string | null;
  contact_name: string | null;
}

interface TasksProps {
  session: SessionInfo;
}

const PRIORITY_COLOR = {
  low:    "#22c55e",
  medium: "#f59e0b",
  high:   "#ef4444",
};

const STATUS_LABEL: Record<string, string> = {
  pending:     "Offen",
  in_progress: "In Bearbeitung",
  done:        "Erledigt",
  cancelled:   "Abgebrochen",
};

export default function Tasks({ session }: TasksProps) {
  const { t } = useTranslation();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<"all" | "pending" | "in_progress" | "done">("all");
  const [loading, setLoading] = useState(true);

  const loadTasks = useCallback(async () => {
    try {
      const db = await Database.load("sqlite:crm.db");
      const where =
        filter === "all"
          ? "t.deleted_at IS NULL AND t.status != 'cancelled'"
          : `t.deleted_at IS NULL AND t.status = '${filter}'`;

      const rows = await db.select(
        `SELECT t.id, t.title, t.description, t.due_date, t.priority, t.status,
                t.contact_id,
                (c.first_name || ' ' || COALESCE(c.last_name, '')) AS contact_name
         FROM tasks t
         LEFT JOIN contacts c ON c.id = t.contact_id
         WHERE ${where}
         ORDER BY
           CASE t.priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
           t.due_date ASC NULLS LAST
         LIMIT 200`,
        []
      );
      setTasks(rows);
    } catch (err) {
      console.error("Tasks laden fehlgeschlagen:", err);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { loadTasks(); }, [loadTasks]);

  useEffect(() => {
    const unlisten = listen("sync:data-updated", () => loadTasks());
    return () => { unlisten.then((fn) => fn()); };
  }, [loadTasks]);

  function formatDueDate(dateStr: string | null): { label: string; overdue: boolean } {
    if (!dateStr) return { label: "", overdue: false };
    const d = new Date(dateStr);
    const now = new Date();
    const overdue = d < now;
    const label = d.toLocaleDateString(undefined, { day: "2-digit", month: "short" });
    return { label, overdue };
  }

  const filters: { key: typeof filter; label: string }[] = [
    { key: "all",         label: "Alle" },
    { key: "pending",     label: "Offen" },
    { key: "in_progress", label: "In Bearbeitung" },
    { key: "done",        label: "Erledigt" },
  ];

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h2 style={styles.title}>{t("tasks.title")}</h2>
        <div style={styles.count}>{tasks.length}</div>
      </div>

      {/* Filter-Tabs */}
      <div style={styles.tabs}>
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            style={{
              ...styles.tab,
              ...(filter === f.key ? styles.tabActive : {}),
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Liste */}
      {loading ? (
        <div style={styles.empty}>{t("common.loading")}</div>
      ) : tasks.length === 0 ? (
        <div style={styles.empty}>{t("tasks.noTasks")}</div>
      ) : (
        <div style={styles.list}>
          {tasks.map((task) => {
            const due = formatDueDate(task.due_date);
            return (
              <div key={task.id} style={styles.card}>
                {/* Priority Bar */}
                <div
                  style={{
                    ...styles.priorityBar,
                    background: PRIORITY_COLOR[task.priority] ?? "#9ca3af",
                  }}
                />

                <div style={styles.cardBody}>
                  <div style={styles.cardTop}>
                    <span style={styles.taskTitle}>{task.title}</span>
                    <span
                      style={{
                        ...styles.statusBadge,
                        background: task.status === "done" ? "#dcfce7" : task.status === "in_progress" ? "#dbeafe" : "#f3f4f6",
                        color: task.status === "done" ? "#15803d" : task.status === "in_progress" ? "#1d4ed8" : "#374151",
                      }}
                    >
                      {STATUS_LABEL[task.status] ?? task.status}
                    </span>
                  </div>

                  {task.description && (
                    <p style={styles.description}>{task.description}</p>
                  )}

                  <div style={styles.cardMeta}>
                    {task.contact_name?.trim() && (
                      <span style={styles.meta}>👤 {task.contact_name.trim()}</span>
                    )}
                    {due.label && (
                      <span
                        style={{
                          ...styles.meta,
                          color: due.overdue ? "#ef4444" : "#6b7280",
                          fontWeight: due.overdue ? 600 : 400,
                        }}
                      >
                        📅 {due.label}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { display: "flex", flexDirection: "column", gap: "16px", height: "100%" },
  header: { display: "flex", alignItems: "center", gap: "10px" },
  title: { margin: 0, fontSize: "22px", fontWeight: "700", color: "#111827" },
  count: {
    background: "#e5e7eb", color: "#374151",
    fontSize: "12px", fontWeight: "700",
    padding: "2px 8px", borderRadius: "10px",
  },
  tabs: { display: "flex", gap: "4px" },
  tab: {
    padding: "6px 14px", borderRadius: "20px",
    border: "1.5px solid #e5e7eb",
    background: "white", color: "#374151",
    fontSize: "13px", fontWeight: "500", cursor: "pointer",
  },
  tabActive: {
    background: "#0a1628", color: "white", borderColor: "#0a1628",
  },
  list: { display: "flex", flexDirection: "column", gap: "8px", overflowY: "auto", flex: 1 },
  card: {
    background: "white", borderRadius: "10px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
    display: "flex", overflow: "hidden",
  },
  priorityBar: { width: "4px", flexShrink: 0 },
  cardBody: { flex: 1, padding: "12px 14px", display: "flex", flexDirection: "column", gap: "6px" },
  cardTop: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" },
  taskTitle: { fontWeight: "600", fontSize: "14px", color: "#111827", flex: 1 },
  statusBadge: {
    fontSize: "11px", fontWeight: "600", padding: "2px 8px",
    borderRadius: "10px", flexShrink: 0,
  },
  description: { margin: 0, fontSize: "12px", color: "#6b7280", lineHeight: 1.4 },
  cardMeta: { display: "flex", gap: "12px", flexWrap: "wrap" },
  meta: { fontSize: "11px", color: "#6b7280" },
  empty: { textAlign: "center", color: "#9ca3af", padding: "40px", fontSize: "14px" },
};
