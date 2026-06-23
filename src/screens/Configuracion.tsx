import React, { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';

interface ConfiguracionProps {
  session: { email: string; user_id: string; access_token: string };
  dbPath: string;
  onLogout: () => void;
}

const COLORS = {
  bg: '#f5f0e8', surface: '#ffffff', border: '#e8e2d9',
  text: '#1a1a1a', muted: '#6b7280', primary: '#1a4731', accent: '#4ade80',
};

const Configuracion: React.FC<ConfiguracionProps> = ({ session, dbPath, onLogout }) => {
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [outboxCount, setOutboxCount] = useState(0);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    loadSyncInfo();
  }, [dbPath]);

  async function loadSyncInfo() {
    try {
      const [last, count] = await Promise.all([
        invoke<string | null>('get_last_sync', { dbPath }),
        invoke<number>('get_outbox_count', { dbPath }),
      ]);
      setLastSync(last);
      setOutboxCount(count);
    } catch (_) {}
  }

  async function handleSync() {
    setSyncing(true);
    try {
      await invoke('sync_now', { accessToken: session.access_token, userId: session.user_id, dbPath });
      await loadSyncInfo();
    } catch (err) {
      console.error('Sync error:', err);
    } finally {
      setSyncing(false);
    }
  }

  const cardStyle: React.CSSProperties = {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 24,
    border: `1px solid ${COLORS.border}`,
    marginBottom: 16,
  };

  const rowStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 0',
    borderBottom: `1px solid ${COLORS.border}`,
  };

  return (
    <div style={{ flex: 1, overflowY: 'auto', backgroundColor: COLORS.bg, padding: 28, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: COLORS.text, margin: '0 0 6px' }}>Configuración</h1>
      <p style={{ color: COLORS.muted, fontSize: 14, margin: '0 0 28px' }}>Ajustes de la aplicación</p>

      {/* Cuenta */}
      <div style={cardStyle}>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: COLORS.text, margin: '0 0 16px' }}>Cuenta</h2>
        <div style={rowStyle}>
          <span style={{ fontSize: 14, color: COLORS.muted }}>Usuario</span>
          <span style={{ fontSize: 14, fontWeight: 500, color: COLORS.text }}>{session.email}</span>
        </div>
        <div style={{ ...rowStyle, borderBottom: 'none' }}>
          <span style={{ fontSize: 14, color: COLORS.muted }}>ID de usuario</span>
          <span style={{ fontSize: 12, fontFamily: 'monospace', color: COLORS.muted }}>{session.user_id.slice(0, 16)}…</span>
        </div>
        <div style={{ marginTop: 16 }}>
          <button
            onClick={onLogout}
            style={{
              padding: '9px 20px', backgroundColor: '#fee2e2', color: '#dc2626',
              border: '1px solid #fca5a5', borderRadius: 8, cursor: 'pointer',
              fontWeight: 600, fontSize: 14,
            }}
          >
            Cerrar sesión
          </button>
        </div>
      </div>

      {/* Sincronización */}
      <div style={cardStyle}>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: COLORS.text, margin: '0 0 16px' }}>Sincronización</h2>
        <div style={rowStyle}>
          <span style={{ fontSize: 14, color: COLORS.muted }}>Última sincronización</span>
          <span style={{ fontSize: 14, color: COLORS.text }}>
            {lastSync ? new Date(lastSync).toLocaleString('es-ES') : 'Nunca'}
          </span>
        </div>
        <div style={{ ...rowStyle, borderBottom: 'none' }}>
          <span style={{ fontSize: 14, color: COLORS.muted }}>Cambios pendientes</span>
          <span style={{ fontSize: 14, fontWeight: 600, color: outboxCount > 0 ? '#f59e0b' : '#059669' }}>
            {outboxCount} {outboxCount === 1 ? 'elemento' : 'elementos'}
          </span>
        </div>
        <div style={{ marginTop: 16 }}>
          <button
            onClick={handleSync}
            disabled={syncing}
            style={{
              padding: '9px 20px', backgroundColor: COLORS.primary, color: '#fff',
              border: 'none', borderRadius: 8, cursor: syncing ? 'default' : 'pointer',
              fontWeight: 600, fontSize: 14, opacity: syncing ? 0.7 : 1,
            }}
          >
            {syncing ? 'Sincronizando…' : 'Sincronizar ahora'}
          </button>
        </div>
      </div>

      {/* Acerca de */}
      <div style={cardStyle}>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: COLORS.text, margin: '0 0 16px' }}>Acerca de</h2>
        <div style={rowStyle}>
          <span style={{ fontSize: 14, color: COLORS.muted }}>Aplicación</span>
          <span style={{ fontSize: 14, color: COLORS.text }}>Euricio CRM Desktop</span>
        </div>
        <div style={rowStyle}>
          <span style={{ fontSize: 14, color: COLORS.muted }}>Versión</span>
          <span style={{ fontSize: 14, color: COLORS.text }}>0.1.0</span>
        </div>
        <div style={{ ...rowStyle, borderBottom: 'none' }}>
          <span style={{ fontSize: 14, color: COLORS.muted }}>Tecnología</span>
          <span style={{ fontSize: 14, color: COLORS.text }}>Tauri v2 + React + Supabase</span>
        </div>
      </div>
    </div>
  );
};

export default Configuracion;
