import React, { useEffect, useState, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { emit } from '@tauri-apps/api/event';

import Sidebar, { Screen } from './components/layout/Sidebar';
import SyncStatusBar from './components/layout/SyncStatusBar';
import Leads from './screens/Leads';
import LeadDetail from './screens/LeadDetail';
import Tasks from './screens/Tasks';
import TimeTracking from './screens/TimeTracking';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Session {
  access_token: string;
  refresh_token: string;
  user_id: string;
  email: string;
  expires_at: number; // unix timestamp
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

// ── Storage helpers (tauri-plugin-store falls back to localStorage) ─────────────

function saveSession(session: Session) {
  try {
    localStorage.setItem('euricio_session', JSON.stringify(session));
  } catch (_) {}
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
  } catch (_) {
    return null;
  }
}

function clearSession() {
  localStorage.removeItem('euricio_session');
}

// ── DB path helper ─────────────────────────────────────────────────────────────

async function getDbPath(): Promise<string> {
  try {
    const appDataDir = await invoke<string>('get_app_data_dir');
    return `${appDataDir}/crm.db`;
  } catch (_) {
    // Fallback
    return 'crm.db';
  }
}

// ── Login Screen ───────────────────────────────────────────────────────────────

interface LoginScreenProps {
  onLogin: (session: Session) => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ email: email.trim(), password }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error_description ?? data.message ?? 'Anmeldung fehlgeschlagen');
      }

      const session: Session = {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        user_id: data.user?.id ?? '',
        email: data.user?.email ?? email.trim(),
        expires_at: Math.floor(Date.now() / 1000) + (data.expires_in ?? 3600),
      };

      saveSession(session);
      onLogin(session);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '11px 14px',
    borderRadius: 8,
    border: `1px solid ${COLORS.border}`,
    backgroundColor: '#ffffff',
    fontSize: 15,
    color: COLORS.text,
    outline: 'none',
    boxSizing: 'border-box',
  };

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.bg,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <div
        style={{
          width: 380,
          backgroundColor: COLORS.surface,
          borderRadius: 16,
          padding: '36px 32px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
          border: `1px solid ${COLORS.border}`,
        }}
      >
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 12,
              backgroundColor: COLORS.primary,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 12,
            }}
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7l10 5 10-5-10-5z" fill="#4ade80" />
              <path d="M2 17l10 5 10-5" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" />
              <path d="M2 12l10 5 10-5" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <h1
            style={{
              margin: 0,
              fontSize: 22,
              fontWeight: 700,
              color: COLORS.text,
            }}
          >
            Euricio CRM
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 14, color: COLORS.muted }}>
            Melde dich an, um fortzufahren
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 14 }}>
            <label
              style={{
                display: 'block',
                fontSize: 13,
                fontWeight: 500,
                color: COLORS.text,
                marginBottom: 5,
              }}
            >
              E-Mail
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@beispiel.de"
              required
              autoFocus
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label
              style={{
                display: 'block',
                fontSize: 13,
                fontWeight: 500,
                color: COLORS.text,
                marginBottom: 5,
              }}
            >
              Passwort
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={inputStyle}
            />
          </div>

          {error && (
            <div
              style={{
                padding: '10px 12px',
                borderRadius: 8,
                backgroundColor: '#fee2e2',
                color: COLORS.error,
                fontSize: 13,
                marginBottom: 14,
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: 9,
              border: 'none',
              backgroundColor: COLORS.primary,
              color: '#ffffff',
              fontSize: 15,
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.75 : 1,
              transition: 'opacity 0.15s ease',
            }}
          >
            {loading ? 'Anmelden…' : 'Anmelden'}
          </button>
        </form>
      </div>
    </div>
  );
};

// ── Settings Screen ────────────────────────────────────────────────────────────

interface SettingsScreenProps {
  session: Session;
  dbPath: string;
}

const SettingsScreen: React.FC<SettingsScreenProps> = ({ session, dbPath }) => (
  <div
    style={{
      flex: 1,
      padding: '28px',
      backgroundColor: COLORS.bg,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      overflowY: 'auto',
    }}
  >
    <h1 style={{ margin: '0 0 20px', fontSize: 24, fontWeight: 700, color: COLORS.text }}>
      Einstellungen
    </h1>
    <div
      style={{
        backgroundColor: COLORS.surface,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 12,
        padding: '20px 22px',
        maxWidth: 480,
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: COLORS.muted,
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          marginBottom: 14,
        }}
      >
        Konto
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: COLORS.muted }}>E-Mail</span>
          <span style={{ fontWeight: 500 }}>{session.email}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: COLORS.muted }}>Benutzer-ID</span>
          <span
            style={{
              fontFamily: 'monospace',
              fontSize: 12,
              color: COLORS.muted,
            }}
          >
            {session.user_id.slice(0, 12)}…
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: COLORS.muted }}>Datenbank</span>
          <span
            style={{
              fontFamily: 'monospace',
              fontSize: 11,
              color: COLORS.muted,
            }}
          >
            {dbPath}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: COLORS.muted }}>Supabase URL</span>
          <span style={{ fontSize: 12, color: COLORS.muted }}>
            vddfghfvmnrbotmxhvvi.supabase.co
          </span>
        </div>
      </div>
    </div>
  </div>
);

// ── Properties stub (placeholder until full implementation) ────────────────────

const PropertiesScreen: React.FC<{ dbPath: string }> = () => (
  <div
    style={{
      flex: 1,
      padding: '28px',
      backgroundColor: COLORS.bg,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      overflowY: 'auto',
    }}
  >
    <h1 style={{ margin: '0 0 20px', fontSize: 24, fontWeight: 700, color: COLORS.text }}>
      Immobilien
    </h1>
    <p style={{ color: COLORS.muted, fontSize: 14 }}>
      Vollständige Immobilien-Verwaltung folgt in der nächsten Version.
    </p>
  </div>
);

// ── Pipeline stub ──────────────────────────────────────────────────────────────

interface PipelineScreenProps {
  dbPath: string;
  onSelectLead: (leadId: number) => void;
}

interface PipelineRow {
  id: number;
  full_name: string;
  pipeline_stage: string;
  budget: number | null;
  warmth: number | null;
  location: string | null;
}

const STAGE_ORDER = ['lead', 'contacted', 'qualified', 'proposal', 'closing', 'won', 'lost'];
const STAGE_LABELS: Record<string, string> = {
  lead: 'Lead',
  contacted: 'Kontaktiert',
  qualified: 'Qualifiziert',
  proposal: 'Angebot',
  closing: 'Abschluss',
  won: 'Gewonnen',
  lost: 'Verloren',
};
const STAGE_COLORS: Record<string, string> = {
  lead: '#6b7280',
  contacted: '#3b82f6',
  qualified: '#8b5cf6',
  proposal: '#f59e0b',
  closing: '#10b981',
  won: '#059669',
  lost: '#ef4444',
};

import Database from '@tauri-apps/plugin-sql';

const PipelineScreen: React.FC<PipelineScreenProps> = ({ dbPath, onSelectLead }) => {
  const [leadsByStage, setLeadsByStage] = useState<Record<string, PipelineRow[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const db = await Database.load(`sqlite:${dbPath}`);
        const rows = await db.select<PipelineRow[]>(
          `SELECT id, full_name, pipeline_stage, budget, warmth, location
           FROM leads WHERE deleted_at IS NULL ORDER BY updated_at DESC`
        );
        const grouped: Record<string, PipelineRow[]> = {};
        for (const stage of STAGE_ORDER) grouped[stage] = [];
        for (const row of rows) {
          const s = row.pipeline_stage ?? 'lead';
          if (!grouped[s]) grouped[s] = [];
          grouped[s].push(row);
        }
        setLeadsByStage(grouped);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, [dbPath]);

  if (loading) {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: COLORS.bg,
          color: COLORS.muted,
          fontFamily: 'sans-serif',
        }}
      >
        Laden…
      </div>
    );
  }

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: COLORS.bg,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        overflow: 'hidden',
      }}
    >
      <div style={{ padding: '24px 28px 16px', flexShrink: 0 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: COLORS.text }}>
          Pipeline
        </h1>
      </div>
      <div
        style={{
          flex: 1,
          overflowX: 'auto',
          display: 'flex',
          gap: 12,
          padding: '0 28px 24px',
          alignItems: 'flex-start',
        }}
      >
        {STAGE_ORDER.map((stage) => {
          const stageLeads = leadsByStage[stage] ?? [];
          const color = STAGE_COLORS[stage];
          return (
            <div
              key={stage}
              style={{
                minWidth: 200,
                width: 200,
                flexShrink: 0,
                backgroundColor: '#f9f5ef',
                border: `1px solid ${COLORS.border}`,
                borderRadius: 10,
                padding: '12px 10px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 7,
                  marginBottom: 10,
                }}
              >
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    backgroundColor: color,
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: COLORS.text,
                  }}
                >
                  {STAGE_LABELS[stage]}
                </span>
                <span
                  style={{
                    marginLeft: 'auto',
                    fontSize: 11,
                    backgroundColor: color + '20',
                    color,
                    padding: '1px 6px',
                    borderRadius: 8,
                    fontWeight: 600,
                  }}
                >
                  {stageLeads.length}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {stageLeads.map((lead) => (
                  <div
                    key={lead.id}
                    onClick={() => onSelectLead(lead.id)}
                    style={{
                      backgroundColor: COLORS.surface,
                      border: `1px solid ${COLORS.border}`,
                      borderRadius: 7,
                      padding: '9px 10px',
                      cursor: 'pointer',
                      fontSize: 13,
                      fontWeight: 500,
                      color: COLORS.text,
                    }}
                  >
                    {lead.full_name}
                    {lead.location && (
                      <div
                        style={{
                          fontSize: 11,
                          color: COLORS.muted,
                          marginTop: 2,
                        }}
                      >
                        {lead.location}
                      </div>
                    )}
                  </div>
                ))}
                {stageLeads.length === 0 && (
                  <div style={{ fontSize: 12, color: COLORS.muted, textAlign: 'center', padding: '8px 0' }}>
                    Leer
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ── Main App ───────────────────────────────────────────────────────────────────

const App: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [screen, setScreen] = useState<Screen>('leads');
  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null);
  const [dbPath, setDbPath] = useState<string>('crm.db');
  const [dbReady, setDbReady] = useState(false);

  // Load session on mount
  useEffect(() => {
    const s = loadSession();
    if (s) setSession(s);
  }, []);

  // Get DB path and run migrations on mount
  useEffect(() => {
    (async () => {
      const path = await getDbPath();
      setDbPath(path);

      try {
        await invoke('run_migrations', { dbPath: path });
      } catch (err) {
        console.warn('run_migrations error (may not be registered):', err);
      }

      setDbReady(true);

      // Trigger initial sync if logged in
      if (session) {
        try {
          await invoke('sync_now', {
            accessToken: session.access_token,
            userId: session.user_id,
            dbPath: path,
          });
          await emit('sync:data-updated', {});
        } catch (err) {
          console.warn('initial sync error:', err);
        }
      }
    })();
  }, []);

  // Auto-sync every 5 minutes
  useEffect(() => {
    if (!session || !dbReady) return;

    const interval = setInterval(async () => {
      try {
        await invoke('sync_now', {
          accessToken: session.access_token,
          userId: session.user_id,
          dbPath,
        });
        await emit('sync:data-updated', {});
      } catch (err) {
        console.warn('auto-sync error:', err);
      }
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [session, dbReady, dbPath]);

  const handleLogin = useCallback((s: Session) => {
    setSession(s);
    setScreen('leads');
  }, []);

  const handleLogout = useCallback(() => {
    clearSession();
    setSession(null);
    setScreen('leads');
    setSelectedLeadId(null);
  }, []);

  const handleNavigate = useCallback((s: Screen) => {
    setScreen(s);
    if (s !== 'lead-detail') setSelectedLeadId(null);
  }, []);

  const handleSelectLead = useCallback((leadId: number) => {
    setSelectedLeadId(leadId);
    setScreen('lead-detail');
  }, []);

  const handleBackFromDetail = useCallback(() => {
    setScreen('leads');
    setSelectedLeadId(null);
  }, []);

  // Not logged in → show login screen
  if (!session) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  // DB still loading
  if (!dbReady) {
    return (
      <div
        style={{
          width: '100vw',
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: COLORS.bg,
          color: COLORS.muted,
          fontFamily: 'sans-serif',
          fontSize: 14,
        }}
      >
        Datenbank wird initialisiert…
      </div>
    );
  }

  // Render active screen
  const renderScreen = () => {
    switch (screen) {
      case 'leads':
        return (
          <Leads
            dbPath={dbPath}
            accessToken={session.access_token}
            userId={session.user_id}
            onSelectLead={handleSelectLead}
          />
        );
      case 'lead-detail':
        return selectedLeadId != null ? (
          <LeadDetail
            leadId={selectedLeadId}
            dbPath={dbPath}
            userId={session.user_id}
            onBack={handleBackFromDetail}
          />
        ) : (
          <Leads
            dbPath={dbPath}
            accessToken={session.access_token}
            userId={session.user_id}
            onSelectLead={handleSelectLead}
          />
        );
      case 'pipeline':
        return (
          <PipelineScreen
            dbPath={dbPath}
            onSelectLead={handleSelectLead}
          />
        );
      case 'tasks':
        return (
          <Tasks
            dbPath={dbPath}
            userId={session.user_id}
            onSelectLead={handleSelectLead}
          />
        );
      case 'properties':
        return <PropertiesScreen dbPath={dbPath} />;
      case 'time-tracking':
        return <TimeTracking dbPath={dbPath} userId={session.user_id} />;
      case 'settings':
        return <SettingsScreen session={session} dbPath={dbPath} />;
      default:
        return (
          <Leads
            dbPath={dbPath}
            accessToken={session.access_token}
            userId={session.user_id}
            onSelectLead={handleSelectLead}
          />
        );
    }
  };

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        overflow: 'hidden',
        backgroundColor: COLORS.bg,
      }}
    >
      {/* Main content row */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Sidebar */}
        <Sidebar
          currentScreen={screen}
          onNavigate={handleNavigate}
          userEmail={session.email}
          onLogout={handleLogout}
        />

        {/* Screen content */}
        <main
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            minWidth: 0,
          }}
        >
          {renderScreen()}
        </main>
      </div>

      {/* Sync status bar */}
      <SyncStatusBar
        dbPath={dbPath}
        accessToken={session.access_token}
        userId={session.user_id}
      />
    </div>
  );
};

export default App;
