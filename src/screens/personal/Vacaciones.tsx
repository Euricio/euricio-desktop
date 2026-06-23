import React, { useEffect, useState } from 'react';

interface VacacionesProps {
  dbPath: string;
  userId: string;
}

const COLORS = {
  bg: '#f5f0e8',
  surface: '#ffffff',
  border: '#e8e2d9',
  text: '#1a1a1a',
  muted: '#6b7280',
  primary: '#1a4731',
};

const generateId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: '#fef3c7', text: '#d97706', label: 'Pendiente' },
  approved: { bg: '#dcfce7', text: '#15803d', label: 'Aprobado' },
  denied: { bg: '#fee2e2', text: '#dc2626', label: 'Denegado' },
};

interface VacationRequest {
  id: string;
  user_id: string;
  start_date: string;
  end_date: string;
  days: number;
  status: string;
  note: string | null;
  created_at: string;
}

const Vacaciones: React.FC<VacacionesProps> = ({ dbPath, userId }) => {
  const [requests, setRequests] = useState<VacationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ start_date: '', end_date: '', note: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!dbPath) return;
    loadRequests();
  }, [dbPath]);

  async function loadRequests() {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const data = await invoke<VacationRequest[]>('get_vacation_requests', { dbPath, userId });
      setRequests(data);
    } catch (err) {
      console.error('Vacaciones load error:', err);
    } finally {
      setLoading(false);
    }
  }

  function calcDays(start: string, end: string): number {
    if (!start || !end) return 0;
    const s = new Date(start);
    const e = new Date(end);
    const diff = e.getTime() - s.getTime();
    return Math.max(0, Math.round(diff / (1000 * 60 * 60 * 24)) + 1);
  }

  async function saveRequest() {
    if (!form.start_date || !form.end_date) return;
    setSaving(true);
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const days = calcDays(form.start_date, form.end_date);
      await invoke('insert_vacation_request', {
        dbPath,
        id: generateId(),
        userId,
        startDate: form.start_date,
        endDate: form.end_date,
        days,
        status: 'pending',
        note: form.note || null,
      });
      setShowForm(false);
      setForm({ start_date: '', end_date: '', note: '' });
      await loadRequests();
    } catch (err) {
      console.error('Save vacation error:', err);
    } finally {
      setSaving(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    padding: '9px 12px',
    borderRadius: 8,
    border: `1px solid ${COLORS.border}`,
    fontSize: 14,
    backgroundColor: COLORS.bg,
    color: COLORS.text,
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
  };

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: COLORS.bg,
        overflow: 'hidden',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      {/* Header */}
      <div style={{ padding: '24px 28px 16px', borderBottom: `1px solid ${COLORS.border}`, backgroundColor: COLORS.surface }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: COLORS.text, margin: 0 }}>Mis Vacaciones</h1>
            <p style={{ color: COLORS.muted, margin: '4px 0 0', fontSize: 14 }}>Solicitudes de días libres</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            style={{ padding: '9px 18px', backgroundColor: COLORS.primary, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14 }}
          >
            + Solicitar Vacaciones
          </button>
        </div>
      </div>

      {/* Modal */}
      {showForm && (
        <div
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}
          onClick={e => { if (e.target === e.currentTarget) setShowForm(false); }}
        >
          <div style={{ backgroundColor: COLORS.surface, borderRadius: 14, padding: 28, width: 380, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: COLORS.text, margin: '0 0 20px' }}>Solicitar Vacaciones</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: COLORS.muted, display: 'block', marginBottom: 6 }}>Fecha inicio</label>
                  <input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} style={inputStyle} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: COLORS.muted, display: 'block', marginBottom: 6 }}>Fecha fin</label>
                  <input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} style={inputStyle} />
                </div>
              </div>
              {form.start_date && form.end_date && (
                <div style={{ fontSize: 13, color: COLORS.primary, fontWeight: 600 }}>
                  {calcDays(form.start_date, form.end_date)} días laborables
                </div>
              )}
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: COLORS.muted, display: 'block', marginBottom: 6 }}>Nota (opcional)</label>
                <textarea
                  value={form.note}
                  onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                  placeholder="Motivo o información adicional…"
                  rows={3}
                  style={{ ...inputStyle, resize: 'vertical' }}
                />
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
                <button onClick={() => setShowForm(false)} style={{ padding: '9px 18px', backgroundColor: COLORS.bg, color: COLORS.text, border: `1px solid ${COLORS.border}`, borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
                  Cancelar
                </button>
                <button onClick={saveRequest} disabled={saving || !form.start_date || !form.end_date} style={{ padding: '9px 18px', backgroundColor: COLORS.primary, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14, opacity: saving ? 0.7 : 1 }}>
                  {saving ? 'Enviando…' : 'Enviar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 28px 28px' }}>
        {loading ? (
          <div style={{ padding: 40, color: COLORS.muted }}>Cargando…</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 20 }}>
            <thead>
              <tr>
                {['Fecha inicio', 'Fecha fin', 'Días', 'Estado', 'Nota'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '10px 14px', fontSize: 12, fontWeight: 600, color: COLORS.muted, textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: `2px solid ${COLORS.border}`, backgroundColor: COLORS.surface, position: 'sticky', top: 0 }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {requests.map((r, i) => {
                const ss = STATUS_STYLES[r.status] ?? { bg: '#f3f4f6', text: '#4b5563', label: r.status };
                return (
                  <tr key={r.id} style={{ backgroundColor: i % 2 === 0 ? COLORS.surface : COLORS.bg }}>
                    <td style={{ padding: '11px 14px', fontSize: 14, color: COLORS.text }}>{new Date(r.start_date).toLocaleDateString('es-ES')}</td>
                    <td style={{ padding: '11px 14px', fontSize: 14, color: COLORS.text }}>{new Date(r.end_date).toLocaleDateString('es-ES')}</td>
                    <td style={{ padding: '11px 14px', fontSize: 14, fontWeight: 600, color: COLORS.text }}>{r.days}</td>
                    <td style={{ padding: '11px 14px' }}>
                      <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, backgroundColor: ss.bg, color: ss.text, fontWeight: 600 }}>
                        {ss.label}
                      </span>
                    </td>
                    <td style={{ padding: '11px 14px', fontSize: 13, color: COLORS.muted }}>{r.note ?? '—'}</td>
                  </tr>
                );
              })}
              {requests.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ padding: 40, textAlign: 'center', color: COLORS.muted, fontSize: 14 }}>
                    No hay solicitudes de vacaciones
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default Vacaciones;
