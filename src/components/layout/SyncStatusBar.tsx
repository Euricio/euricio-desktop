import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { useTranslation } from "react-i18next";

interface SyncStatusEvent {
  status: "synced" | "syncing" | "error" | "offline" | "pending";
  message?: string;
  timestamp: number;
}

interface SyncStatusBarProps {
  accessToken: string;
}

export default function SyncStatusBar({ accessToken }: SyncStatusBarProps) {
  const { t } = useTranslation();
  const [status, setStatus] = useState<SyncStatusEvent["status"]>("synced");
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    // Initial-Status laden
    loadStatus();

    // Auf Sync-Events hören
    const unlisteners = [
      listen<SyncStatusEvent>("sync:status", (event) => {
        const { status, message, timestamp } = event.payload;
        setStatus(status);
        setError(message ?? null);
        if (status === "synced") {
          setLastSynced(new Date(timestamp * 1000));
        }
      }),
      listen<boolean>("sync:online", (event) => {
        if (!event.payload) setStatus("offline");
      }),
      listen<number>("sync:data-updated", () => {
        loadStatus();
      }),
    ];

    return () => {
      unlisteners.forEach((p) => p.then((fn) => fn()));
    };
  }, []);

  async function loadStatus() {
    try {
      const s = await invoke<{
        status: string;
        last_synced_at: number | null;
        pending_count: number;
      }>("get_sync_status");
      setPendingCount(s.pending_count);
      if (s.last_synced_at) {
        setLastSynced(new Date(s.last_synced_at * 1000));
      }
    } catch {
      // ignore
    }
  }

  function formatTime(d: Date): string {
    const now = Date.now();
    const diff = Math.floor((now - d.getTime()) / 1000);
    if (diff < 60) return t("sync.justNow") || "gerade eben";
    if (diff < 3600) return `${Math.floor(diff / 60)} min`;
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  const dot = {
    synced:  "#22c55e",
    syncing: "#f59e0b",
    error:   "#ef4444",
    offline: "#9ca3af",
    pending: "#f59e0b",
  }[status];

  const label = {
    synced:  lastSynced ? `${t("sync.synced")} · ${formatTime(lastSynced)}` : t("sync.synced"),
    syncing: t("sync.syncing"),
    error:   error ?? t("sync.error"),
    offline: "Offline",
    pending: `${pendingCount} ${t("sync.pending") || "ausstehend"}`,
  }[status];

  return (
    <div style={styles.bar}>
      {/* Sync-Indikator */}
      <div style={styles.left}>
        <div
          style={{
            ...styles.dot,
            background: dot,
            boxShadow: status === "syncing" ? `0 0 6px ${dot}` : undefined,
          }}
        />
        <span style={styles.label}>{label}</span>
      </div>

      {/* Pending Badge */}
      {pendingCount > 0 && status !== "syncing" && (
        <div style={styles.badge}>{pendingCount}</div>
      )}

      {/* Spinner wenn syncing */}
      {status === "syncing" && (
        <div style={styles.spinner} />
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  bar: {
    height: "28px",
    background: "#1a2f4e",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 16px",
    flexShrink: 0,
  },
  left: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  dot: {
    width: "7px",
    height: "7px",
    borderRadius: "50%",
    flexShrink: 0,
    transition: "background 0.3s",
  },
  label: {
    fontSize: "11px",
    color: "rgba(255,255,255,0.6)",
    fontWeight: "500",
  },
  badge: {
    background: "#f59e0b",
    color: "white",
    fontSize: "10px",
    fontWeight: "700",
    padding: "1px 6px",
    borderRadius: "10px",
  },
  spinner: {
    width: "12px",
    height: "12px",
    border: "2px solid rgba(255,255,255,0.2)",
    borderTopColor: "#0080ff",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
};
