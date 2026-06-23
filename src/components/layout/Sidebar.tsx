import React from 'react';

export type Screen =
  | 'leads'
  | 'lead-detail'
  | 'pipeline'
  | 'properties'
  | 'tasks'
  | 'time-tracking'
  | 'settings';

interface SidebarProps {
  currentScreen: Screen;
  onNavigate: (screen: Screen) => void;
  userEmail: string;
  onLogout: () => void;
}

interface NavItem {
  id: Screen;
  label: string;
  icon: React.ReactNode;
}

const COLORS = {
  sidebarBg: '#1a4731',
  sidebarText: 'rgba(255,255,255,0.85)',
  sidebarActive: 'rgba(255,255,255,0.15)',
  sidebarHover: 'rgba(255,255,255,0.08)',
  accent: '#4ade80',
};

// SVG icon components (inline, no external deps)
const IconDashboard = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
    <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
  </svg>
);

const IconPipeline = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 12H3M22 6H3M22 18H3" />
    <circle cx="1.5" cy="6" r="1.5" fill="currentColor" />
    <circle cx="1.5" cy="12" r="1.5" fill="currentColor" />
    <circle cx="1.5" cy="18" r="1.5" fill="currentColor" />
  </svg>
);

const IconLeads = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const IconProperties = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);

const IconTasks = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 11l3 3L22 4" />
    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
  </svg>
);

const IconTime = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const IconSettings = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

const IconLogout = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

const NAV_ITEMS: NavItem[] = [
  { id: 'leads', label: 'Dashboard', icon: <IconDashboard /> },
  { id: 'pipeline', label: 'Pipeline', icon: <IconPipeline /> },
  { id: 'leads', label: 'Leads', icon: <IconLeads /> },
  { id: 'properties', label: 'Immobilien', icon: <IconProperties /> },
  { id: 'tasks', label: 'Aufgaben', icon: <IconTasks /> },
  { id: 'time-tracking', label: 'Zeiterfassung', icon: <IconTime /> },
];

// Deduplicate nav entries to avoid key collisions — Dashboard & Leads both map to 'leads',
// so we track the label separately.
const NAV_ITEMS_DISPLAY = [
  { id: 'leads' as Screen, label: 'Dashboard', icon: <IconDashboard />, key: 'dashboard' },
  { id: 'pipeline' as Screen, label: 'Pipeline', icon: <IconPipeline />, key: 'pipeline' },
  { id: 'leads' as Screen, label: 'Leads', icon: <IconLeads />, key: 'leads' },
  { id: 'properties' as Screen, label: 'Immobilien', icon: <IconProperties />, key: 'properties' },
  { id: 'tasks' as Screen, label: 'Aufgaben', icon: <IconTasks />, key: 'tasks' },
  { id: 'time-tracking' as Screen, label: 'Zeiterfassung', icon: <IconTime />, key: 'time-tracking' },
];

function getInitials(email: string): string {
  const parts = email.split('@')[0].split(/[._-]/);
  return parts
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join('');
}

const Sidebar: React.FC<SidebarProps> = ({
  currentScreen,
  onNavigate,
  userEmail,
  onLogout,
}) => {
  const [hoveredKey, setHoveredKey] = React.useState<string | null>(null);

  return (
    <aside
      style={{
        width: 220,
        minWidth: 220,
        maxWidth: 220,
        height: '100vh',
        backgroundColor: COLORS.sidebarBg,
        display: 'flex',
        flexDirection: 'column',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        flexShrink: 0,
        position: 'relative',
        zIndex: 10,
      }}
    >
      {/* Logo */}
      <div
        style={{
          padding: '24px 20px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          marginBottom: 8,
        }}
      >
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: 8,
            backgroundColor: COLORS.accent,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L2 7l10 5 10-5-10-5z" fill="#1a4731" />
            <path d="M2 17l10 5 10-5" stroke="#1a4731" strokeWidth="2" strokeLinecap="round" />
            <path d="M2 12l10 5 10-5" stroke="#1a4731" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
        <span
          style={{
            color: '#ffffff',
            fontSize: 18,
            fontWeight: 700,
            letterSpacing: '-0.3px',
          }}
        >
          Euricio
        </span>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '4px 10px', overflowY: 'auto' }}>
        {NAV_ITEMS_DISPLAY.map((item) => {
          const isActive = currentScreen === item.id && item.key !== 'dashboard';
          // Special: dashboard key is active only on 'leads' screen if coming from dashboard
          const isHighlighted = item.key === 'dashboard'
            ? currentScreen === 'leads'
            : currentScreen === item.id;

          // For duplicate ids, use key to differentiate active
          const effectiveActive = item.key === 'dashboard'
            ? currentScreen === 'leads'
            : item.key === 'leads'
            ? currentScreen === 'lead-detail'
            : currentScreen === item.id;

          const isHovered = hoveredKey === item.key;

          return (
            <button
              key={item.key}
              onClick={() => onNavigate(item.id)}
              onMouseEnter={() => setHoveredKey(item.key)}
              onMouseLeave={() => setHoveredKey(null)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                width: '100%',
                padding: '9px 12px',
                marginBottom: 2,
                borderRadius: 8,
                border: 'none',
                cursor: 'pointer',
                backgroundColor: effectiveActive
                  ? COLORS.sidebarActive
                  : isHovered
                  ? COLORS.sidebarHover
                  : 'transparent',
                color: effectiveActive ? '#ffffff' : COLORS.sidebarText,
                fontSize: 14,
                fontWeight: effectiveActive ? 600 : 400,
                textAlign: 'left',
                transition: 'background-color 0.15s ease, color 0.15s ease',
              }}
            >
              <span
                style={{
                  color: effectiveActive ? COLORS.accent : COLORS.sidebarText,
                  display: 'flex',
                  alignItems: 'center',
                  flexShrink: 0,
                }}
              >
                {item.icon}
              </span>
              {item.label}
            </button>
          );
        })}

        {/* Divider */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', margin: '8px 0' }} />

        <button
          onClick={() => onNavigate('settings')}
          onMouseEnter={() => setHoveredKey('settings')}
          onMouseLeave={() => setHoveredKey(null)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            width: '100%',
            padding: '9px 12px',
            marginBottom: 2,
            borderRadius: 8,
            border: 'none',
            cursor: 'pointer',
            backgroundColor:
              currentScreen === 'settings'
                ? COLORS.sidebarActive
                : hoveredKey === 'settings'
                ? COLORS.sidebarHover
                : 'transparent',
            color:
              currentScreen === 'settings' ? '#ffffff' : COLORS.sidebarText,
            fontSize: 14,
            fontWeight: currentScreen === 'settings' ? 600 : 400,
            textAlign: 'left',
            transition: 'background-color 0.15s ease',
          }}
        >
          <span
            style={{
              color:
                currentScreen === 'settings' ? COLORS.accent : COLORS.sidebarText,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <IconSettings />
          </span>
          Einstellungen
        </button>
      </nav>

      {/* User footer */}
      <div
        style={{
          padding: '12px 14px',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        {/* Avatar */}
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: '50%',
            backgroundColor: COLORS.accent,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            color: '#1a4731',
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          {getInitials(userEmail || 'U')}
        </div>

        {/* Email */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              color: COLORS.sidebarText,
              fontSize: 12,
              fontWeight: 500,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {userEmail}
          </div>
          <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11 }}>Online</div>
        </div>

        {/* Logout button */}
        <button
          onClick={onLogout}
          title="Abmelden"
          onMouseEnter={() => setHoveredKey('logout')}
          onMouseLeave={() => setHoveredKey(null)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color:
              hoveredKey === 'logout'
                ? '#ef4444'
                : 'rgba(255,255,255,0.45)',
            display: 'flex',
            alignItems: 'center',
            padding: 4,
            borderRadius: 4,
            transition: 'color 0.15s ease',
            flexShrink: 0,
          }}
        >
          <IconLogout />
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
