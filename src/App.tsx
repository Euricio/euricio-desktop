import React, { useEffect, useState, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { emit } from '@tauri-apps/api/event';

import Sidebar, { Screen } from './components/layout/Sidebar';
import SyncStatusBar from './components/layout/SyncStatusBar';

// Screens — VENTAS
import Dashboard from './screens/Dashboard';
import Pipeline from './screens/Pipeline';
import Leads from './screens/Leads';
import LeadDetail from './screens/LeadDetail';
import Properties from './screens/Properties';
import Tasks from './screens/Tasks';
import Calendar from './screens/Calendar';
import Calculadora from './screens/Calculadora';

// Screens — PERSONAL
import TimeTracking from './screens/TimeTracking';
import Turnos from './screens/personal/Turnos';
import Vacaciones from './screens/personal/Vacaciones';
import PersonalPlanning from './screens/personal/PersonalPlanning';

// Screens — LLAMADAS
import Calls from './screens/Calls';

// Screens — REPORTS
import ReporteSales from './screens/reports/ReporteSales';
import ReporteActividad from './screens/reports/ReporteActividad';
import ReportePersonal from './screens/reports/ReportePersonal';
import ReportePropiedades from './screens/reports/ReportePropiedades';

// Screens — SETTINGS
import Configuracion from './screens/Configuracion';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Session {
  access_token: string;
  refresh_token: string;
  user_id: string;
  email: string;
  expires_at: number;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const SUPABASE_URL = 'https://vddfghfvmnrbotmxhvvi.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_xHQlpSPtA0H75GuESG3o7A_A3evq_vv';

const COLORS = {
  bg: '#f5f0e8',
  surface: '#ffffff',
  border: '#e8e2d9',
  text: '#1a1a1a',
  muted: '#6b7280',
  primary: '#1a4731',
  accent: '#4ade80',
  error: '#ef4444',
};

// ── Session helpers ────────────────────────────────────────────────────────────

function saveSession(session: Session) {
  try { localStorage.setItem('euricio_session', JSON.stringify(session)); } catch (_) {}
}

function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem('euricio_session');
    if (!raw) return null;
    const s = JSON.parse(raw) as Session;
    if (s.expires_at && Date.now() / 1000 > s.expires_at - 60) {
      localStorage.removeItem('euricio_session');
      return null;
    }
    return s;
  } catch (_) { return null; }
}

function clearSession() { localStorage.removeItem('euricio_session'); }

// ── DB path helper ─────────────────────────────────────────────────────────────

async function getDbPath(): Promise<string> {
  try {
    const appDataDir = await invoke<string>('get_app_data_dir');
    return `${appDataDir}/crm.db`;
  } catch (_) { return 'crm.db'; }
}

// ── Login Screen ───────────────────────────────────────────────────────────────

interface LoginScreenProps {
  onLogin: (session: Session) => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok || !data.access_token) {
        setError(data.error_description || data.msg || 'Credenciales incorrectas');
        return;
      }
      const session: Session = {
        access_token: data.access_token,
        refresh_token: data.refresh_token || '',
        user_id: data.user?.id || '',
        email: data.user?.email || email,
        expires_at: Math.floor(Date.now() / 1000) + (data.expires_in || 3600),
      };
      saveSession(session);
      onLogin(session);
    } catch (err) {
      setError('Error de conexión. Comprueba tu red.');
    } finally {
      setLoading(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '12px 16px', borderRadius: 10,
    border: `1px solid ${COLORS.border}`, fontSize: 15,
    backgroundColor: '#faf8f4', color: COLORS.text,
    outline: 'none', boxSizing: 'border-box',
  };

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.bg, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      <div style={{ width: 380, backgroundColor: COLORS.surface, borderRadius: 20, padding: '40px 36px', boxShadow: '0 20px 60px rgba(0,0,0,0.12)', border: `1px solid ${COLORS.border}` }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32, justifyContent: 'center' }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: COLORS.primary, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7l10 5 10-5-10-5z" fill="#4ade80"/>
              <path d="M2 17l10 5 10-5" stroke="#4ade80" strokeWidth="2" strokeLinecap="round"/>
              <path d="M2 12l10 5 10-5" stroke="#4ade80" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: COLORS.primary, letterSpacing: '-0.5px' }}>Euricio CRM</div>
            <div style={{ fontSize: 12, color: COLORS.muted }}>Accede a tu cuenta</div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: COLORS.muted, marginBottom: 6 }}>Correo electrónico</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} placeholder="tu@correo.com" required autoFocus />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: COLORS.muted, marginBottom: 6 }}>Contraseña</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} style={inputStyle} placeholder="••••••••" required />
          </div>
          {error && (
            <div style={{ marginBottom: 16, padding: '10px 14px', backgroundColor: '#fee2e2', borderRadius: 8, color: '#dc2626', fontSize: 13, border: '1px solid #fca5a5' }}>
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            style={{ width: '100%', padding: '13px', backgroundColor: COLORS.primary, color: '#fff', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.7 : 1, transition: 'opacity 0.15s' }}
          >
            {loading ? 'Iniciando sesión…' : 'Iniciar sesión'}
          </button>
        </form>
      </div>
    </div>
  );
};

// ── Personal Planning placeholder ─────────────────────────────────────────────

const PersonalPlanningPlaceholder: React.FC<{ dbPath: string }> = ({ dbPath: _dbPath }) => (
  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f5f0e8', fontFamily: 'sans-serif' }}>
    <div style={{ textAlign: 'center', color: '#6b7280' }}>
      <div style={{ fontSize: 40, marginBottom: 16 }}>📅</div>
      <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Planificación de Personal</div>
      <div style={{ fontSize: 14 }}>Próximamente disponible</div>
    </div>
  </div>
);

// ── App ────────────────────────────────────────────────────────────────────────

const App: React.FC = () => {
  const [session, setSession] = useState<Session | null>(loadSession());
  const [screen, setScreen] = useState<Screen>('dashboard');
  const [dbPath, setDbPath] = useState('');
  const [dbReady, setDbReady] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      const path = await getDbPath();
      setDbPath(path);
      try {
        await invoke('run_migrations', { dbPath: path });
      } catch (err) {
        console.warn('Migration error (may be first run):', err);
      }
      setDbReady(true);
      if (session) {
        try {
          await invoke('sync_now', { accessToken: session.access_token, userId: session.user_id, dbPath: path });
          await emit('sync:data-updated', {});
        } catch (err) { console.warn('initial sync error:', err); }
      }
    })();
  }, []);

  useEffect(() => {
    if (!session || !dbReady) return;
    const interval = setInterval(async () => {
      try {
        await invoke('sync_now', { accessToken: session.access_token, userId: session.user_id, dbPath });
        await emit('sync:data-updated', {});
      } catch (err) { console.warn('auto-sync error:', err); }
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [session, dbReady, dbPath]);

  const handleLogin = useCallback((s: Session) => { setSession(s); setScreen('dashboard'); }, []);
  const handleLogout = useCallback(() => { clearSession(); setSession(null); setScreen('dashboard'); setSelectedLeadId(null); }, []);
  const handleNavigate = useCallback((s: Screen) => { setScreen(s); if (s !== 'lead-detail') setSelectedLeadId(null); }, []);
  const handleSelectLead = useCallback((leadId: number) => { setSelectedLeadId(leadId); setScreen('lead-detail'); }, []);
  const handleBackFromDetail = useCallback(() => { setScreen('leads'); setSelectedLeadId(null); }, []);

  if (!session) return <LoginScreen onLogin={handleLogin} />;

  if (!dbReady) {
    return (
      <div style={{ width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.bg, color: COLORS.muted, fontFamily: 'sans-serif', fontSize: 14 }}>
        Inicializando base de datos…
      </div>
    );
  }

  const renderScreen = () => {
    switch (screen) {
      case 'dashboard':
        return <Dashboard dbPath={dbPath} onNavigate={handleNavigate} onSelectLead={handleSelectLead} />;
      case 'pipeline':
        return <Pipeline dbPath={dbPath} onSelectLead={handleSelectLead} />;
      case 'leads':
        return <Leads dbPath={dbPath} accessToken={session.access_token} userId={session.user_id} onSelectLead={handleSelectLead} />;
      case 'lead-detail':
        return selectedLeadId != null
          ? <LeadDetail leadId={selectedLeadId} dbPath={dbPath} userId={session.user_id} onBack={handleBackFromDetail} />
          : <Leads dbPath={dbPath} accessToken={session.access_token} userId={session.user_id} onSelectLead={handleSelectLead} />;
      case 'properties':
        return <Properties dbPath={dbPath} />;
      case 'tasks':
        return <Tasks dbPath={dbPath} userId={session.user_id} onSelectLead={handleSelectLead} />;
      case 'calendar':
        return <Calendar dbPath={dbPath} />;
      case 'calculadora':
        return <Calculadora />;
      case 'time-tracking':
        return <TimeTracking dbPath={dbPath} userId={session.user_id} />;
      case 'turnos':
        return <Turnos dbPath={dbPath} userId={session.user_id} />;
      case 'vacaciones':
        return <Vacaciones dbPath={dbPath} userId={session.user_id} />;
      case 'personal-planning':
        return <PersonalPlanningPlaceholder dbPath={dbPath} />;
      case 'calls':
        return <Calls dbPath={dbPath} userId={session.user_id} />;
      case 'reports-sales':
        return <ReporteSales dbPath={dbPath} />;
      case 'reports-activity':
        return <ReporteActividad dbPath={dbPath} />;
      case 'reports-personal':
        return <ReportePersonal dbPath={dbPath} />;
      case 'reports-properties':
        return <ReportePropiedades dbPath={dbPath} />;
      case 'settings':
        return <Configuracion session={session} dbPath={dbPath} onLogout={handleLogout} />;
      default:
        return <Dashboard dbPath={dbPath} onNavigate={handleNavigate} onSelectLead={handleSelectLead} />;
    }
  };

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', overflow: 'hidden', backgroundColor: COLORS.bg }}>
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <Sidebar currentScreen={screen} onNavigate={handleNavigate} userEmail={session.email} onLogout={handleLogout} />
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
          {renderScreen()}
        </main>
      </div>
      <SyncStatusBar dbPath={dbPath} accessToken={session.access_token} userId={session.user_id} />
    </div>
  );
};

export default App;
