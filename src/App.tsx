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
  refresh_token: string;
  expires_at: string;
}

type AppState = "loading" | "unauthenticated" | "authenticated";

export default function App() {
  const [appState, setAppState] = useState<AppState>("loading");
  const [session, setSession] = useState<SessionInfo | null>(null);

  useEffect(() => {
    checkSession();
  }, []);

  // Auto-refresh: alle 50 Minuten Token erneuern (Supabase-Standard: 60 Min)
  useEffect(() => {
    if (appState !== "authenticated" || !session) return;

    const interval = setInterval(async () => {
      await tryRefresh();
    }, 50 * 60 * 1000);

    return () => clearInterval(interval);
  }, [appState, session]);

  async function tryRefresh(): Promise<boolean> {
    try {
      const store = await Store.load("auth.json", { autoSave: true });
      const stored = await store.get<SessionInfo>("session");
      if (!stored?.refresh_token) return false;

      const newSession = await invoke<SessionInfo>("refresh_token", {
        refreshToken: stored.refresh_token,
      });

      // refresh_token aus altem Store übernehmen falls nicht zurückgegeben
      const merged: SessionInfo = {
        ...newSession,
        refresh_token: newSession.refresh_token || stored.refresh_token,
      };

      await store.set("session", merged);
      setSession(merged);
      return true;
    } catch {
      return false;
    }
  }

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
        // Token abgelaufen — automatisch erneuern wenn refresh_token vorhanden
        if (stored.refresh_token) {
          const refreshed = await tryRefreshWithToken(stored.refresh_token);
          if (refreshed) {
            return; // tryRefreshWithToken setzt session + appState
          }
        }
        // Kein Refresh möglich → ausloggen
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

  async function tryRefreshWithToken(refreshToken: string): Promise<boolean> {
    try {
      const store = await Store.load("auth.json", { autoSave: true });
      const newSession = await invoke<SessionInfo>("refresh_token", {
        refreshToken,
      });

      const merged: SessionInfo = {
        ...newSession,
        refresh_token: newSession.refresh_token || refreshToken,
      };

      await store.set("session", merged);
      setSession(merged);
      setAppState("authenticated");
      return true;
    } catch {
      return false;
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
