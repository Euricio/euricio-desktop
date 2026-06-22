import { useTranslation } from "react-i18next";
import type { Screen } from "./AppShell";

interface SessionInfo {
  user_id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
}

interface SidebarProps {
  currentScreen: Screen;
  onNavigate: (screen: Screen) => void;
  session: SessionInfo;
}

const navItems: { id: Screen; icon: string; labelKey: string }[] = [
  { id: "contacts", icon: "👥", labelKey: "nav.contacts" },
  { id: "tasks",    icon: "✓",  labelKey: "nav.tasks"    },
  { id: "settings", icon: "⚙",  labelKey: "nav.settings" },
];

export default function Sidebar({ currentScreen, onNavigate, session }: SidebarProps) {
  const { t } = useTranslation();

  const initials = session.full_name
    ? session.full_name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : session.email.slice(0, 2).toUpperCase();

  return (
    <div style={styles.sidebar}>
      {/* Brand */}
      <div style={styles.brand}>
        <div style={styles.logo}>E</div>
        <span style={styles.brandName}>Euricio CRM</span>
      </div>

      {/* Navigation */}
      <nav style={styles.nav}>
        {navItems.map((item) => {
          const active = currentScreen === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              style={{
                ...styles.navItem,
                ...(active ? styles.navItemActive : {}),
              }}
            >
              <span style={styles.navIcon}>{item.icon}</span>
              <span style={styles.navLabel}>{t(item.labelKey)}</span>
              {active && <div style={styles.activeIndicator} />}
            </button>
          );
        })}
      </nav>

      {/* User Avatar */}
      <div style={styles.user}>
        <div style={styles.avatar}>
          {session.avatar_url ? (
            <img src={session.avatar_url} alt="" style={styles.avatarImg} />
          ) : (
            <span style={styles.avatarInitials}>{initials}</span>
          )}
        </div>
        <div style={styles.userInfo}>
          <span style={styles.userName}>{session.full_name || session.email}</span>
          {session.full_name && (
            <span style={styles.userEmail}>{session.email}</span>
          )}
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  sidebar: {
    width: "200px",
    background: "linear-gradient(180deg, #0a1628 0%, #1a2f4e 100%)",
    display: "flex",
    flexDirection: "column",
    padding: "0",
    flexShrink: 0,
  },
  brand: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "20px 16px",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
  },
  logo: {
    width: "28px",
    height: "28px",
    background: "linear-gradient(135deg, #005ab4, #0080ff)",
    borderRadius: "6px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "white",
    fontWeight: "700",
    fontSize: "14px",
    flexShrink: 0,
  },
  brandName: {
    color: "white",
    fontWeight: "600",
    fontSize: "14px",
    letterSpacing: "-0.3px",
  },
  nav: {
    flex: 1,
    padding: "12px 8px",
    display: "flex",
    flexDirection: "column",
    gap: "2px",
  },
  navItem: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "10px 12px",
    borderRadius: "8px",
    border: "none",
    background: "transparent",
    color: "rgba(255,255,255,0.6)",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "500",
    textAlign: "left",
    width: "100%",
    position: "relative",
    transition: "all 0.15s",
  },
  navItemActive: {
    background: "rgba(255,255,255,0.12)",
    color: "white",
  },
  navIcon: {
    fontSize: "16px",
    width: "20px",
    textAlign: "center",
    flexShrink: 0,
  },
  navLabel: {
    flex: 1,
  },
  activeIndicator: {
    position: "absolute",
    right: "8px",
    width: "4px",
    height: "4px",
    borderRadius: "50%",
    background: "#0080ff",
  },
  user: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "16px",
    borderTop: "1px solid rgba(255,255,255,0.08)",
  },
  avatar: {
    width: "32px",
    height: "32px",
    borderRadius: "50%",
    background: "linear-gradient(135deg, #005ab4, #0080ff)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    overflow: "hidden",
  },
  avatarImg: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  avatarInitials: {
    color: "white",
    fontSize: "11px",
    fontWeight: "700",
  },
  userInfo: {
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  userName: {
    color: "white",
    fontSize: "12px",
    fontWeight: "600",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  userEmail: {
    color: "rgba(255,255,255,0.4)",
    fontSize: "10px",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
};
