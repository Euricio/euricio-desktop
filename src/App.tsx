import { useEffect, useState } from "react";
import { Store } from "@tauri-apps/plugin-store";
import { invoke } from "@tauri-apps/api/core";
import Login from "./screens/Login";
import AppShell from "./components/layout/AppShell";
import "./i18n";

interface SessionInfo {
  user_id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  access_token: string;
  expires_at: string;
}

type AppState = "loading" | "unauthenticated" | "authenticated";

export default function App() {
  const [appState, setAppState] = useState<AppState>("loading");
  const [session, setSession] = useState<SessionInfo | null>(null);

  useEffect(() => {
    checkSession();
  }, []);

  async function checkSession() {
    try {
      const store = await Store.load("auth.json", { autoSave: true });
      const stored = await store.get<SessionInfo>("session");

      if (!stored?.access_token) {
        setAppState("unauthenticated");
        return;
      }

      // Token-Ablauf prüfen
      const expiresAt = new Date(stored.expires_at).getTime();
      const now = Date.now();
      const fiveMinutes = 5 * 60 * 1000;

      if (expiresAt - now < fiveMinutes) {
        // Token fast abgelaufen — versuche zu erneuern
        // Refresh-Token ist im Store nicht gespeichert in dieser Version
        // → ausloggen
        await store.delete("session");
        setAppState("unauthenticated");
        return;
      }

      setSession(stored);
      setAppState("authenticated");
    } catch {
      setAppState("unauthenticated");
    }
  }

  async function handleLoginSuccess(newSession: SessionInfo) {
    setSession(newSession);
    setAppState("authenticated");
  }

  async function handleLogout() {
    try {
      await invoke("logout");
      const store = await Store.load("auth.json", { autoSave: true });
      await store.delete("session");
    } catch {
      // ignore
    }
    setSession(null);
    setAppState("unauthenticated");
  }

  if (appState === "loading") {
    return (
      <div style={splashStyle}>
        <div style={logoStyle}>E</div>
      </div>
    );
  }

  if (appState === "unauthenticated") {
    return <Login onSuccess={handleLoginSuccess} />;
  }

  return (
    <AppShell
      session={session!}
      onLogout={handleLogout}
    />
  );
}

const splashStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: "100vh",
  background: "linear-gradient(135deg, #0a1628 0%, #1a2f4e 100%)",
};

const logoStyle: React.CSSProperties = {
  width: "64px",
  height: "64px",
  background: "linear-gradient(135deg, #005ab4, #0080ff)",
  borderRadius: "16px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "white",
  fontWeight: "700",
  fontSize: "32px",
  animation: "pulse 1.5s ease-in-out infinite",
};
