import { useEffect, useState } from 'react';
import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';
import { useTranslation } from 'react-i18next';

type SyncState = 'synced' | 'pending' | 'offline' | 'error' | 'in_progress';

const DOT_COLORS: Record<SyncState, string> = {
  synced:      '#22c55e',
  pending:     '#f59e0b',
  offline:     '#94a3b8',
  error:       '#ef4444',
  in_progress: '#3b82f6',
};

export function SyncStatusBar() {
  const { t } = useTranslation();
  const [state, setState] = useState<SyncState>('offline');
  const [lastSync, setLastSync] = useState<number | null>(null);

  useEffect(() => {
    const subs = [
      listen<boolean>('sync-online-changed', (e) => {
        if (!e.payload) setState('offline');
        else if (state === 'offline') setState('pending');
      }),
      listen('sync-started',    () => setState('in_progress')),
      listen<number>('sync-completed', (e) => { setState('synced'); setLastSync(e.payload); }),
      listen('sync-error',      () => setState('error')),
    ];
    return () => { subs.forEach(p => p.then(fn => fn())); };
  }, []);

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '5px 16px', fontSize: 12, color: '#64748b',
      borderTop: '1px solid #e2e8f0', background: '#f8fafc',
      flexShrink: 0,
    }}>
      <span style={{
        width: 8, height: 8, borderRadius: '50%',
        background: DOT_COLORS[state], display: 'inline-block',
        flexShrink: 0,
      }} />
      <span>{t(`app.sync.status.${state}`)}</span>

      {lastSync && state === 'synced' && (
        <span style={{ color: '#94a3b8' }}>
          &mdash; {t('app.sync.last_synced', {
            time: new Date(lastSync * 1000).toLocaleTimeString(),
          })}
        </span>
      )}

      <button
        onClick={() => invoke('trigger_sync')}
        style={{
          marginLeft: 'auto', fontSize: 11, cursor: 'pointer',
          background: 'none', border: '1px solid #cbd5e1',
          borderRadius: 4, padding: '2px 8px', color: '#475569',
        }}
      >
        {t('app.sync.action.sync_now')}
      </button>
    </div>
  );
}
