import React from 'react';

export type Screen =
  | 'dashboard'
  | 'pipeline'
  | 'leads'
  | 'lead-detail'
  | 'properties'
  | 'tasks'
  | 'calendar'
  | 'calculadora'
  | 'time-tracking'
  | 'turnos'
  | 'vacaciones'
  | 'personal-planning'
  | 'calls'
  | 'reports-sales'
  | 'reports-activity'
  | 'reports-personal'
  | 'reports-properties'
  | 'settings';

interface SidebarProps {
  currentScreen: Screen;
  onNavigate: (screen: Screen) => void;
  userEmail: string;
  onLogout: () => void;
}

const C = {
  bg: '#1a4731',
  text: 'rgba(255,255,255,0.85)',
  active: 'rgba(255,255,255,0.15)',
  hover: 'rgba(255,255,255,0.08)',
  accent: '#4ade80',
  section: 'rgba(255,255,255,0.35)',
  divider: 'rgba(255,255,255,0.08)',
};

function getInitials(email: string): string {
  const parts = email.split('@')[0].split(/[._-]/);
  return parts.slice(0, 2).map(p => p.charAt(0).toUpperCase()).join('');
}

// Simple icon components
const I = {
  Dashboard: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
  Pipeline: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>,
  Leads: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  Properties: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  Tasks: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>,
  Calendar: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  Calc: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="10" x2="16" y2="10"/><line x1="8" y1="14" x2="16" y2="14"/><line x1="8" y1="18" x2="12" y2="18"/></svg>,
  Time: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  Shifts: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="9" y1="2" x2="9" y2="4"/><line x1="15" y1="2" x2="15" y2="4"/></svg>,
  Vacation: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>,
  Planning: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>,
  Calls: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.36 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.11 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 8.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>,
  Chart: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  Settings: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  Logout: () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
};

interface NavItem {
  id: Screen;
  label: string;
  icon: React.ReactNode;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: 'VENTAS',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: <I.Dashboard /> },
      { id: 'pipeline', label: 'Pipeline', icon: <I.Pipeline /> },
      { id: 'leads', label: 'Leads', icon: <I.Leads /> },
      { id: 'properties', label: 'Propiedades', icon: <I.Properties /> },
      { id: 'tasks', label: 'Tareas', icon: <I.Tasks /> },
      { id: 'calendar', label: 'Calendario', icon: <I.Calendar /> },
      { id: 'calculadora', label: 'Calculadora', icon: <I.Calc /> },
    ],
  },
  {
    title: 'PERSONAL',
    items: [
      { id: 'time-tracking', label: 'Tiempo', icon: <I.Time /> },
      { id: 'turnos', label: 'Turnos', icon: <I.Shifts /> },
      { id: 'vacaciones', label: 'Vacaciones', icon: <I.Vacation /> },
      { id: 'personal-planning', label: 'Planificación', icon: <I.Planning /> },
    ],
  },
  {
    title: 'LLAMADAS',
    items: [
      { id: 'calls', label: 'Registro', icon: <I.Calls /> },
    ],
  },
  {
    title: 'AUSWERTUNGEN',
    items: [
      { id: 'reports-sales', label: 'Ventas', icon: <I.Chart /> },
      { id: 'reports-activity', label: 'Actividad', icon: <I.Chart /> },
      { id: 'reports-personal', label: 'Personal', icon: <I.Chart /> },
      { id: 'reports-properties', label: 'Propiedades', icon: <I.Chart /> },
    ],
  },
];

const Sidebar: React.FC<SidebarProps> = ({ currentScreen, onNavigate, userEmail, onLogout }) => {
  const [hovered, setHovered] = React.useState<string | null>(null);
  const [collapsed, setCollapsed] = React.useState<Record<string, boolean>>({});

  const isActive = (id: Screen) => {
    if (id === 'leads' && currentScreen === 'lead-detail') return true;
    return currentScreen === id;
  };

  const toggleSection = (title: string) => {
    setCollapsed(c => ({ ...c, [title]: !c[title] }));
  };

  return (
    <aside
      style={{
        width: 220,
        minWidth: 220,
        height: '100vh',
        backgroundColor: C.bg,
        display: 'flex',
        flexDirection: 'column',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        flexShrink: 0,
        overflow: 'hidden',
      }}
    >
      {/* Logo */}
      <div style={{ padding: '20px 18px 16px', borderBottom: `1px solid ${C.divider}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: C.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7l10 5 10-5-10-5z" fill="#1a4731"/>
              <path d="M2 17l10 5 10-5" stroke="#1a4731" strokeWidth="2" strokeLinecap="round"/>
              <path d="M2 12l10 5 10-5" stroke="#1a4731" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <span style={{ color: '#fff', fontSize: 17, fontWeight: 700, letterSpacing: '-0.3px' }}>Euricio</span>
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '8px 10px' }}>
        {NAV_SECTIONS.map(section => (
          <div key={section.title} style={{ marginBottom: 4 }}>
            {/* Section header */}
            <button
              onClick={() => toggleSection(section.title)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                padding: '6px 8px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: C.section,
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.08em',
                marginBottom: 2,
              }}
            >
              {section.title}
              <span style={{ fontSize: 10, opacity: 0.6 }}>
                {collapsed[section.title] ? '▶' : '▼'}
              </span>
            </button>

            {/* Items */}
            {!collapsed[section.title] && section.items.map(item => {
              const active = isActive(item.id);
              const hov = hovered === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  onMouseEnter={() => setHovered(item.id)}
                  onMouseLeave={() => setHovered(null)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 9,
                    width: '100%',
                    padding: '8px 10px',
                    marginBottom: 1,
                    borderRadius: 7,
                    border: active ? `1px solid rgba(74,222,128,0.3)` : '1px solid transparent',
                    borderLeft: active ? `3px solid ${C.accent}` : '3px solid transparent',
                    cursor: 'pointer',
                    backgroundColor: active ? C.active : hov ? C.hover : 'transparent',
                    color: active ? '#fff' : C.text,
                    fontSize: 13,
                    fontWeight: active ? 600 : 400,
                    textAlign: 'left',
                    transition: 'all 0.12s ease',
                    paddingLeft: active ? 8 : 10,
                  }}
                >
                  <span style={{ color: active ? C.accent : C.text, display: 'flex', flexShrink: 0 }}>
                    {item.icon}
                  </span>
                  {item.label}
                </button>
              );
            })}
          </div>
        ))}

        {/* Settings */}
        <div style={{ borderTop: `1px solid ${C.divider}`, marginTop: 8, paddingTop: 8 }}>
          {(() => {
            const active = currentScreen === 'settings';
            const hov = hovered === 'settings';
            return (
              <button
                onClick={() => onNavigate('settings')}
                onMouseEnter={() => setHovered('settings')}
                onMouseLeave={() => setHovered(null)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 9,
                  width: '100%', padding: '8px 10px', marginBottom: 1, borderRadius: 7,
                  border: active ? `1px solid rgba(74,222,128,0.3)` : '1px solid transparent',
                  borderLeft: active ? `3px solid ${C.accent}` : '3px solid transparent',
                  cursor: 'pointer',
                  backgroundColor: active ? C.active : hov ? C.hover : 'transparent',
                  color: active ? '#fff' : C.text,
                  fontSize: 13, fontWeight: active ? 600 : 400, textAlign: 'left',
                  transition: 'all 0.12s ease', paddingLeft: active ? 8 : 10,
                }}
              >
                <span style={{ color: active ? C.accent : C.text, display: 'flex', flexShrink: 0 }}>
                  <I.Settings />
                </span>
                Configuración
              </button>
            );
          })()}
        </div>
      </nav>

      {/* User footer */}
      <div style={{ padding: '10px 12px', borderTop: `1px solid ${C.divider}`, display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', backgroundColor: C.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#1a4731', fontSize: 11, fontWeight: 700 }}>
          {getInitials(userEmail || 'U')}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: C.text, fontSize: 11, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userEmail}</div>
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10 }}>Online</div>
        </div>
        <button
          onClick={onLogout}
          onMouseEnter={() => setHovered('logout')}
          onMouseLeave={() => setHovered(null)}
          title="Cerrar sesión"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: hovered === 'logout' ? '#ef4444' : 'rgba(255,255,255,0.4)', display: 'flex', padding: 4, borderRadius: 4, transition: 'color 0.15s', flexShrink: 0 }}
        >
          <I.Logout />
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
