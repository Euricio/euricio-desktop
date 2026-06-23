import React, { useEffect, useState, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

interface SyncStatusBarProps {
  dbPath: string;
  accessToken: string;
  userId: string;
}

const COLORS = {
  bg: '#ffffff',
  border: '#e8e2d9',
  text: '#1a1a1a',
  muted: '#6b7280',
  primary: '#1a4731',
  accent: '#4ade80',
  error: '#ef4444',
};

function formatRelativeTime(isoString: string | null): string {
  if (!isoString) return 'Noch nie synchronisiert';

  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);

  if (diffSec < 10) return 'Gerade eben';
  if (diffSec < 60) return `vor ${diffSec} Sek.`;
  if (diffMin < 60) return `vor ${diffMin} Min.`;
  if (diffHour < 24) return `vor ${diffHour} Std.`;
  return `am ${date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}`;
}

const SyncStatusBar: React.FC<SyncStatusBarProps> = ({ dbPath, accessToken, userId }) => {
  const [outboxCount, setOutboxCount] = useState<number>(0);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [relativeTime, setRelativeTime] = useState('');

  const refreshStatus = useCallback(async () => {
    try {
      const count = await invoke<number>('get_outbox_count', { dbPath });
      setOutboxCount(count);
    } catch (_) {
      // ignore
    }

    try {
      const ts = await invoke<string | null>('get_last_sync', { dbPath });
      setLastSync(ts ?? null);
    } catch (_) {
      // ignore
    }
  }, [dbPath]);

  useEffect(() => {
    refreshStatus();

    // Refresh relative time every 30 seconds
    const interval = setInterval(() => {
      setRelativeTime(formatRelativeTime(lastSync));
    }, 30_000);

    return () => clearInterval(interval);
  }, [lastSync, refreshStatus]);

  useEffect(() => {
    setRelativeTime(formatRelativeTime(lastSync));
  }, [lastSync]);

  // Listen for sync completion events
  useEffect(() => {
    const unlisten = listen('sync:data-updated', () => {
      refreshStatus();
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, [refreshStatus]);

  // Online/offline
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleSync = async () => {
    if (isSyncing || !isOnline) return;
    setIsSyncing(true);
    setSyncError(null);

    try {
      await invoke('sync_now', { accessToken, userId, dbPath });
      await refreshStatus();
    } catch (err) {
      setSyncError(typeof err === 'string' ? err : 'Sync fehlgeschlagen');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div
      style={{
        height: 36,
        backgroundColor: COLORS.bg,
        borderTop: `1px solid ${COLORS.border}`,
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        gap: 14,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        fontSize: 12,
        color: COLORS.muted,
        flexShrink: 0,
      }}
    >
      {/* Online/Offline indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <div
          style={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            backgroundColor: isOnline ? '#10b981' : '#9ca3af',
            flexShrink: 0,
          }}
        />
        <span style={{ color: isOnline ? '#10b981' : '#9ca3af', fontWeight: 500 }}>
          {isOnline ? 'Online' : 'Offline'}
        </span>
      </div>

      {/* Divider */}
      <div style={{ width: 1, height: 16, backgroundColor: COLORS.border }} />

      {/* Last sync */}
      <span>
        Letzter Sync:{' '}
        <span style={{ color: COLORS.text, fontWeight: 500 }}>{relativeTime || '–'}</span>
      </span>

      {/* Outbox pending */}
      {outboxCount > 0 && (
        <>
          <div style={{ width: 1, height: 16, backgroundColor: COLORS.border }} />
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <div
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                backgroundColor: '#f59e0b',
                flexShrink: 0,
              }}
            />
            <span>
              <span style={{ color: '#f59e0b', fontWeight: 600 }}>{outboxCount}</span>{' '}
              ausstehend
            </span>
          </div>
        </>
      )}

      {/* Error */}
      {syncError && (
        <>
          <div style={{ width: 1, height: 16, backgroundColor: COLORS.border }} />
          <span style={{ color: COLORS.error, fontWeight: 500 }} title={syncError}>
            ⚠ Fehler
          </span>
        </>
      )}

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Sync button */}
      <button
        onClick={handleSync}
        disabled={isSyncing || !isOnline}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          padding: '4px 10px',
          borderRadius: 6,
          border: `1px solid ${COLORS.border}`,
          backgroundColor: isSyncing ? '#f3f4f6' : '#ffffff',
          color: isSyncing || !isOnline ? '#9ca3af' : COLORS.primary,
          fontSize: 12,
          fontWeight: 500,
          cursor: isSyncing || !isOnline ? 'not-allowed' : 'pointer',
          transition: 'all 0.15s ease',
        }}
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            animation: isSyncing ? 'spin 1s linear infinite' : 'none',
          }}
        >
          <polyline points="23 4 23 10 17 10" />
          <polyline points="1 20 1 14 7 14" />
          <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
        </svg>
        {isSyncing ? 'Syncing…' : 'Sync'}
      </button>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default SyncStatusBar;
