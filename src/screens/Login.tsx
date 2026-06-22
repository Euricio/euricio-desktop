import { useState, FormEvent } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Store } from "@tauri-apps/plugin-store";
import { useTranslation } from "react-i18next";

interface SessionInfo {
  user_id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  access_token: string;
  refresh_token: string;
  expires_at: string;
}

interface LoginProps {
  onSuccess: (session: SessionInfo) => void;
}

export default function Login({ onSuccess }: LoginProps) {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const session = await invoke<SessionInfo>("login", { email, password });

      // Session inkl. refresh_token im persistenten Store speichern
      const store = await Store.load("auth.json", { autoSave: true });
      await store.set("session", session);

      onSuccess(session);
    } catch (err: unknown) {
      setError(typeof err === "string" ? err : "Anmeldung fehlgeschlagen.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        {/* Logo / Brand */}
        <div style={styles.brand}>
          <div style={styles.logo}>E</div>
          <h1 style={styles.brandName}>Euricio CRM</h1>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>{t("auth.email")}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@euricio.es"
              required
              autoFocus
              autoComplete="email"
              style={styles.input}
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>{t("auth.password")}</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
              style={styles.input}
            />
          </div>

          {error && <div style={styles.error}>{error}</div>}

          <button
            type="submit"
            disabled={loading || !email || !password}
            style={{
              ...styles.button,
              opacity: loading || !email || !password ? 0.6 : 1,
              cursor: loading || !email || !password ? "not-allowed" : "pointer",
            }}
          >
            {loading ? t("auth.signingIn") : t("auth.signIn")}
          </button>
        </form>

        <p style={styles.hint}>{t("auth.hint")}</p>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100vh",
    background: "linear-gradient(135deg, #0a1628 0%, #1a2f4e 100%)",
    padding: "20px",
  },
  card: {
    background: "white",
    borderRadius: "12px",
    padding: "40px",
    width: "100%",
    maxWidth: "380px",
    boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
  },
  brand: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginBottom: "32px",
    justifyContent: "center",
  },
  logo: {
    width: "40px",
    height: "40px",
    background: "linear-gradient(135deg, #005ab4, #0080ff)",
    borderRadius: "10px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "white",
    fontWeight: "700",
    fontSize: "20px",
  },
  brandName: {
    margin: 0,
    fontSize: "22px",
    fontWeight: "700",
    color: "#0a1628",
    letterSpacing: "-0.5px",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  label: {
    fontSize: "13px",
    fontWeight: "600",
    color: "#374151",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  input: {
    padding: "10px 14px",
    border: "1.5px solid #e5e7eb",
    borderRadius: "8px",
    fontSize: "15px",
    outline: "none",
    transition: "border-color 0.2s",
    color: "#111827",
    background: "#f9fafb",
  },
  error: {
    background: "#fef2f2",
    border: "1px solid #fecaca",
    color: "#dc2626",
    borderRadius: "8px",
    padding: "10px 14px",
    fontSize: "13px",
  },
  button: {
    background: "linear-gradient(135deg, #005ab4, #0080ff)",
    color: "white",
    border: "none",
    borderRadius: "8px",
    padding: "12px",
    fontSize: "15px",
    fontWeight: "600",
    marginTop: "8px",
    transition: "opacity 0.2s",
  },
  hint: {
    marginTop: "24px",
    textAlign: "center",
    fontSize: "12px",
    color: "#9ca3af",
  },
};
