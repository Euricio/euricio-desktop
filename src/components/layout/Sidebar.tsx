import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const navItems = [
  { path: '/contacts', key: 'contacts' },
  { path: '/tasks',    key: 'tasks'    },
  { path: '/settings', key: 'settings' },
];

export function Sidebar() {
  const { t } = useTranslation();

  return (
    <nav style={{
      width: 200, background: '#1e293b', color: '#f1f5f9',
      display: 'flex', flexDirection: 'column', padding: '16px 0',
      flexShrink: 0,
    }}>
      <div style={{ padding: '0 16px 24px', fontWeight: 700, fontSize: 16, color: '#fff' }}>
        Euricio CRM
      </div>
      {navItems.map(item => (
        <NavLink
          key={item.path}
          to={item.path}
          style={({ isActive }) => ({
            padding: '10px 16px',
            color: isActive ? '#fff' : '#94a3b8',
            background: isActive ? '#334155' : 'transparent',
            textDecoration: 'none',
            fontSize: 14,
            transition: 'background 0.15s',
          })}
        >
          {t(`app.navigation.${item.key}`)}
        </NavLink>
      ))}
    </nav>
  );
}
