import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useTranslation } from 'react-i18next';

interface Props { onLogin: () => void; }
interface SessionInfo { access_token: string; }

export function Login({ onLogin }: Props) {
  const { t } = useTranslation();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const session = await invoke<SessionInfo>('login', {
        credentials: { email, password },
      });
      localStorage.setItem('euricio-token', session.access_token);
      onLogin();
    } catch {
      setError(t('app.errors.login_failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      height: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: '#f1f5f9',
    }}>
      <div style={{
        background: '#fff', padding: 40, borderRadius: 12,
        width: 360, boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
      }}>
        <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 700 }}>Euricio CRM</h1>
        <p style={{ color: '#64748b', margin: '0 0 28px', fontSize: 14 }}>
          {t('auth.login')}
        </p>

        <form onSubmit={handleLogin}>
          <label style={labelStyle}>{t('auth.email')}</label>
          <input
            type="email" value={email} onChange={e => setEmail(e.target.value)}
            required autoComplete="email" style={inputStyle}
          />
          <label style={labelStyle}>{t('auth.password')}</label>
          <input
            type="password" value={password} onChange={e => setPassword(e.target.value)}
            required autoComplete="current-password" style={inputStyle}
          />
          {error && (
            <p style={{ color: '#ef4444', fontSize: 13, margin: '8px 0 0' }}>{error}</p>
          )}
          <button
            type="submit" disabled={loading}
            style={{
              width: '100%', background: loading ? '#93c5fd' : '#3b82f6',
              color: '#fff', border: 'none', borderRadius: 8, padding: 12,
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: 15, fontWeight: 600, marginTop: 20,
            }}
          >
            {loading ? t('auth.logging_in') : t('auth.login_button')}
          </button>
        </form>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 13, color: '#374151',
  marginBottom: 4, marginTop: 16, fontWeight: 500,
};
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 12px', border: '1px solid #d1d5db',
  borderRadius: 6, fontSize: 14, boxSizing: 'border-box', outline: 'none',
};
