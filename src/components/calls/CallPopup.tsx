import { useEffect, useState, useRef } from "react";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";

interface CallEvent {
  phone: string;
  name?: string;
  direction: "inbound" | "outbound";
}

interface CallPopupProps {
  phone?: string;
  name?: string;
  direction?: "inbound" | "outbound";
  onClose: () => void;
}

type CallState = "ringing" | "active" | "ended";

export default function CallPopup({ phone, name, direction = "outbound", onClose }: CallPopupProps) {
  const [state, setState] = useState<CallState>(direction === "outbound" ? "ringing" : "ringing");
  const [elapsed, setElapsed] = useState(0);
  const [muted, setMuted] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (state === "active") {
      timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [state]);

  // Inbound: nach 2s klingeln automatisch "ringing" zeigen
  useEffect(() => {
    if (direction === "inbound") {
      setState("ringing");
    }
  }, [direction]);

  function accept() {
    setState("active");
  }

  function hangup() {
    setState("ended");
    if (timerRef.current) clearInterval(timerRef.current);
    setTimeout(onClose, 1500);
  }

  function formatElapsed(s: number): string {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  }

  const displayName = name || phone || "Unbekannt";

  return (
    <div style={styles.overlay}>
      <div style={styles.popup}>
        {/* Avatar */}
        <div style={styles.avatar}>
          <span style={styles.avatarText}>
            {displayName.slice(0, 2).toUpperCase()}
          </span>
          {state === "ringing" && <div style={styles.ring1} />}
          {state === "ringing" && <div style={styles.ring2} />}
        </div>

        {/* Info */}
        <div style={styles.name}>{displayName}</div>
        {phone && name && <div style={styles.phone}>{phone}</div>}

        {/* Status */}
        <div style={styles.status}>
          {state === "ringing" && (
            <span style={styles.statusRinging}>
              {direction === "inbound" ? "Eingehender Anruf..." : "Wird gewählt..."}
            </span>
          )}
          {state === "active" && (
            <span style={styles.statusActive}>⏱ {formatElapsed(elapsed)}</span>
          )}
          {state === "ended" && (
            <span style={styles.statusEnded}>Anruf beendet</span>
          )}
        </div>

        {/* Buttons */}
        {state !== "ended" && (
          <div style={styles.buttons}>
            {/* Mute */}
            {state === "active" && (
              <button
                onClick={() => setMuted((m) => !m)}
                style={{ ...styles.actionBtn, background: muted ? "#374151" : "#f3f4f6" }}
                title={muted ? "Stummschaltung aufheben" : "Stummschalten"}
              >
                {muted ? "🔇" : "🎙"}
              </button>
            )}

            {/* Accept (nur bei eingehendem, ringend) */}
            {direction === "inbound" && state === "ringing" && (
              <button onClick={accept} style={styles.acceptBtn} title="Annehmen">
                📞
              </button>
            )}

            {/* Hangup */}
            <button onClick={hangup} style={styles.hangupBtn} title="Auflegen">
              📵
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Globaler Call-Listener-Hook ───────────────────────────────────────────────

interface ActiveCall {
  phone: string;
  name?: string;
  direction: "inbound" | "outbound";
}

export function useCallListener() {
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);

  useEffect(() => {
    const unlisten = listen<CallEvent>("call:incoming", (event) => {
      setActiveCall({
        phone: event.payload.phone,
        name: event.payload.name,
        direction: "inbound",
      });
    });
    return () => { unlisten.then((fn) => fn()); };
  }, []);

  function startCall(phone: string, name?: string) {
    setActiveCall({ phone, name, direction: "outbound" });
    // Rust-Command für Outbound-Call (VoIP-Integration Phase 5)
    invoke("resolve_phone", { phone }).catch(console.error);
  }

  function endCall() {
    setActiveCall(null);
  }

  return { activeCall, startCall, endCall };
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: "fixed", inset: 0,
    background: "rgba(0,0,0,0.6)",
    display: "flex", alignItems: "center", justifyContent: "center",
    zIndex: 9999,
    backdropFilter: "blur(4px)",
  },
  popup: {
    background: "linear-gradient(135deg, #0a1628 0%, #1a2f4e 100%)",
    borderRadius: "20px",
    padding: "32px 28px",
    width: "280px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "12px",
    boxShadow: "0 25px 80px rgba(0,0,0,0.5)",
    border: "1px solid rgba(255,255,255,0.08)",
  },
  avatar: {
    position: "relative",
    width: "80px", height: "80px",
    marginBottom: "4px",
  },
  avatarText: {
    position: "absolute", inset: 0,
    background: "linear-gradient(135deg, #005ab4, #0080ff)",
    borderRadius: "50%",
    display: "flex", alignItems: "center", justifyContent: "center",
    color: "white", fontWeight: "700", fontSize: "28px",
    zIndex: 1,
  },
  ring1: {
    position: "absolute", inset: "-8px",
    border: "2px solid rgba(0,128,255,0.4)",
    borderRadius: "50%",
    animation: "ring 1.5s ease-out infinite",
  },
  ring2: {
    position: "absolute", inset: "-16px",
    border: "2px solid rgba(0,128,255,0.2)",
    borderRadius: "50%",
    animation: "ring 1.5s ease-out infinite 0.5s",
  },
  name: { color: "white", fontWeight: "700", fontSize: "20px", textAlign: "center" },
  phone: { color: "rgba(255,255,255,0.5)", fontSize: "13px" },
  status: { minHeight: "24px" },
  statusRinging: { color: "#f59e0b", fontSize: "13px", fontWeight: "500" },
  statusActive: { color: "#22c55e", fontSize: "14px", fontWeight: "600", fontFamily: "monospace" },
  statusEnded: { color: "rgba(255,255,255,0.4)", fontSize: "13px" },
  buttons: {
    display: "flex", gap: "16px", alignItems: "center",
    marginTop: "8px",
  },
  actionBtn: {
    width: "52px", height: "52px", borderRadius: "50%",
    border: "none", cursor: "pointer", fontSize: "20px",
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  acceptBtn: {
    width: "60px", height: "60px", borderRadius: "50%",
    background: "#22c55e", border: "none",
    cursor: "pointer", fontSize: "22px",
    display: "flex", alignItems: "center", justifyContent: "center",
    boxShadow: "0 4px 20px rgba(34,197,94,0.4)",
  },
  hangupBtn: {
    width: "60px", height: "60px", borderRadius: "50%",
    background: "#ef4444", border: "none",
    cursor: "pointer", fontSize: "22px",
    display: "flex", alignItems: "center", justifyContent: "center",
    boxShadow: "0 4px 20px rgba(239,68,68,0.4)",
  },
};
