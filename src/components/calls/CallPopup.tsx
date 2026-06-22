import { useEffect, useState } from 'react';
import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';
import { useTranslation } from 'react-i18next';

interface DeepLinkEvent { type: string; phone?: string; }

interface ResolvedCall {
  phone: string;
  found: boolean;
  type?: string;
  id?: string;
  display_name?: string;
}

export function CallPopup() {
  const { t } = useTranslation();
  const [call, setCall] = useState<ResolvedCall | null>(null);

  useEffect(() => {
    const unlisten = listen<DeepLinkEvent>('deep-link-event', async (event) => {
      if (event.payload.type === 'incoming_call' && event.payload.phone) {
        const resolved = await invoke<ResolvedCall>('resolve_phone', {
          phone: event.payload.phone,
        });
        setCall(resolved);
      }
    });
    return () => { unlisten.then(fn => fn()); };
  }, []);

  if (!call) return null;

  return (
    <div style={{
      position: 'fixed', top: 20, right: 20, zIndex: 9999,
      background: '#fff', border: '1px solid #e2e8f0',
      borderRadius: 12, padding: 20, width: 300,
      boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
    }}>
      <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 15 }}>
        📞 {t('app.calls.incoming')}
      </div>
      <div style={{ fontSize: 20, marginBottom: 12, color: '#1e293b', fontWeight: 600 }}>
        {call.phone}
      </div>

      {call.found ? (
        <>
          <div style={{ color: '#64748b', fontSize: 12, marginBottom: 4 }}>
            {t('app.calls.contact_found')}
          </div>
          <div style={{ fontWeight: 600, marginBottom: 16 }}>
            {call.display_name}
          </div>
          <button onClick={() => setCall(null)} style={btn('#3b82f6')}>
            {t('app.calls.open')}
          </button>
        </>
      ) : (
        <>
          <div style={{ color: '#64748b', fontSize: 13, marginBottom: 12 }}>
            {t('app.calls.unknown_number')}
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <button style={btn('#3b82f6')}>{t('app.calls.create_contact')}</button>
            <button style={btn('#8b5cf6')}>{t('app.calls.create_lead')}</button>
          </div>
        </>
      )}

      <button
        onClick={() => setCall(null)}
        style={{ ...btn('#94a3b8'), marginTop: 8, width: '100%' }}
      >
        {t('app.common.dismiss')}
      </button>
    </div>
  );
}

function btn(bg: string): React.CSSProperties {
  return {
    background: bg, color: '#fff', border: 'none',
    borderRadius: 6, padding: '8px 12px', cursor: 'pointer',
    fontSize: 13, fontWeight: 500,
  };
}
