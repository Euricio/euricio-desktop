import { useState } from "react";
import { useTranslation } from "react-i18next";

interface SessionInfo {
  user_id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  access_token: string;
  expires_at: string;
}

interface SettingsProps {
  session: SessionInfo;
  onLogout: () => void;
}

const languages = [
  { code: "de", label: "Deutsch" },
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "ca", label: "Català" },
  { code: "eu", label: "Euskara" },
];

export default function Settings({ session, onLogout }: SettingsProps) {
  const { t, i18n } = useTranslation();
  const [lang, setLang] = useState(i18n.language.slice(0, 2));
  const [confirmLogout, setConfirmLogout] = useState(false);

  async function handleLangChange(code: string) {
    setLang(code);
    await i18n.changeLanguage(code);
  }

  const initials = session.full_name
    ? session.full_name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : session.email.slice(0, 2).toUpperCase();

  return (
    <div style={styles.page}>
      <h2 style={styles.title}>{t("nav.settings")}</h2>

      {/* User Card */}
      <div style={styles.card}>
        <div style={styles.cardTitle}>{t("settings.account")}</div>
        <div style={styles.userRow}>
          <div style={styles.avatar}>
            {session.avatar_url ? (
              <img src={session.avatar_url} alt="" style={styles.avatarImg} />
            ) : (
              <span style={styles.initials}>{initials}</span>
            )}
          </div>
          <div>
            <div style={styles.userName}>{session.full_name || session.email}</div>
            {session.full_name && (
              <div style={styles.userEmail}>{session.email}</div>
            )}
          </div>
        </div>
      </div>

      {/* Language */}
      <div style={styles.card}>
        <div style={styles.cardTitle}>{t("settings.language")}</div>
        <select
          value={lang}
          onChange={(e) => handleLangChange(e.target.value)}
          style={styles.select}
        >
          {languages.map((l) => (
            <option key={l.code} value={l.code}>
              {l.label}
            </option>
          ))}
        </select>
      </div>

      {/* Connection */}
      <div style={styles.card}>
        <div style={styles.cardTitle}>{t("settings.connection")}</div>
        <div style={styles.infoRow}>
          <span style={styles.infoLabel}>Backend</span>
          <span style={styles.infoValue}>euricio-crm.fly.dev</span>
        </div>
        <div style={styles.infoRow}>
          <span style={styles.infoLabel}>Supabase</span>
          <span style={styles.infoValue}>vddfghfvmnrbotmxhvvi</span>
        </div>
        <div style={styles.infoRow}>
          <span style={styles.infoLabel}>{t("settings.tokenExpiry")}</span>
          <span style={styles.infoValue}>
            {new Date(session.expires_at).toLocaleString()}
          </span>
        </div>
      </div>

      {/* Logout */}
      <div style={styles.card}>
        {!confirmLogout ? (
          <button
            onClick={() => setConfirmLogout(true)}
            style={styles.logoutBtn}
          >
            {t("auth.signOut")}
          </button>
        ) : (
          <div style={styles.confirmRow}>
            <span style={styles.confirmText}>{t("auth.confirmSignOut")}</span>
            <button onClick={onLogout} style={styles.confirmYes}>
              {t("common.yes")}
            </button>
            <button onClick={() => setConfirmLogout(false)} style={styles.confirmNo}>
              {t("common.cancel")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { maxWidth: "480px" },
  title: { margin: "0 0 20px", fontSize: "22px", fontWeight: "700", color: "#111827" },
  card: {
    background: "white",
    borderRadius: "10px",
    padding: "16px 20px",
    marginBottom: "12px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
  },
  cardTitle: {
    fontSize: "11px",
    fontWeight: "700",
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: "0.8px",
    marginBottom: "12px",
  },
  userRow: { display: "flex", alignItems: "center", gap: "12px" },
  avatar: {
    width: "44px",
    height: "44px",
    borderRadius: "50%",
    background: "linear-gradient(135deg, #005ab4, #0080ff)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    flexShrink: 0,
  },
  avatarImg: { width: "100%", height: "100%", objectFit: "cover" },
  initials: { color: "white", fontWeight: "700", fontSize: "16px" },
  userName: { fontWeight: "600", fontSize: "15px", color: "#111827" },
  userEmail: { fontSize: "13px", color: "#6b7280", marginTop: "2px" },
  select: {
    width: "100%",
    padding: "8px 12px",
    border: "1.5px solid #e5e7eb",
    borderRadius: "8px",
    fontSize: "14px",
    color: "#111827",
    background: "#f9fafb",
    cursor: "pointer",
  },
  infoRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "6px 0",
    borderBottom: "1px solid #f3f4f6",
  },
  infoLabel: { fontSize: "13px", color: "#6b7280", fontWeight: "500" },
  infoValue: { fontSize: "13px", color: "#374151", fontFamily: "monospace" },
  logoutBtn: {
    background: "#fef2f2",
    color: "#dc2626",
    border: "1.5px solid #fecaca",
    borderRadius: "8px",
    padding: "10px 20px",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
    width: "100%",
  },
  confirmRow: { display: "flex", alignItems: "center", gap: "10px" },
  confirmText: { flex: 1, fontSize: "13px", color: "#374151" },
  confirmYes: {
    background: "#dc2626",
    color: "white",
    border: "none",
    borderRadius: "6px",
    padding: "8px 16px",
    fontWeight: "600",
    cursor: "pointer",
    fontSize: "13px",
  },
  confirmNo: {
    background: "#f3f4f6",
    color: "#374151",
    border: "none",
    borderRadius: "6px",
    padding: "8px 16px",
    fontWeight: "600",
    cursor: "pointer",
    fontSize: "13px",
  },
};
