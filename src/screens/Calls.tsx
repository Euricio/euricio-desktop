import React, { useEffect, useState } from 'react';

interface CallsProps {
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

interface CallLog {
  id: number;
  lead_id: number | null;
  lead_name?: string;
  direction: string | null;
  duration_sec: number | null;
  outcome: string | null;
  notes: string | null;
  called_at: string | null;
  created_by: string | null;
}

interface Lead {
  id: number;
  full_name: string;
}

const OUTCOME_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  answered: { bg: '#dcfce7', text: '#15803d', label: 'Contestado' },
  missed: { bg: '#fee2e2', text: '#dc2626', label: 'Perdida' },
  voicemail: { bg: '#f3f4f6', text: '#4b5563', label: 'Buzón' },
  no_answer: { bg: '#fef3c7', text: '#d97706', label: 'Sin resp.' },
};

function formatDuration(sec: number | null): string {
  if (!sec) return '—';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

const Calls: React.FC<CallsProps> = ({ dbPath, userId }) => {
  const [calls, setCalls] = useState<CallLog[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filterDir, setFilterDir] = useState('');
  const [filterOutcome, setFilterOutcome] = useState('');
  const [search, setSearch] = useState('');

  // Form state
  const [form, setForm] = useState({
    lead_id: '',
    direction: 'outgoing',
    duration_sec: '',
    outcome: 'answered',
    notes: '',
    called_at: new Date().toISOString().slice(0, 16),
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!dbPath) return;
    loadData();
  }, [dbPath]);

  async function loadData() {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const [callsData, leadsData] = await Promise.all([
        invoke<CallLog[]>('get_call_logs', { dbPath }),
        invoke<Lead[]>('get_leads_simple', { dbPath }),
      ]);
      setCalls(callsData);
      setLeads(leadsData);
    } catch (err) {
      console.error('Calls load error:', err);
    } finally {
      setLoading(false);
    }
  }

  async function saveCall() {
    setSaving(true);
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('insert_call_log', {
        dbPath,
        id: generateId(),
        leadId: form.lead_id ? parseInt(form.lead_id) : null,
        direction: form.direction,
        durationSec: form.duration_sec ? parseInt(form.duration_sec) : null,
        outcome: form.outcome,
        notes: form.notes,
        calledAt: form.called_at,
        createdBy: userId,
      });
      setShowForm(false);
      setForm({ lead_id: '', direction: 'outgoing', duration_sec: '', outcome: 'answered', notes: '', called_at: new Date().toISOString().slice(0, 16) });
      await loadData();
    } catch (err) {
      console.error('Save call error:', err);
    } finally {
      setSaving(false);
    }
  }

  const filtered = calls.filter(c => {
    const matchDir = !filterDir || c.direction === filterDir;
    const matchOutcome = !filterOutcome || c.outcome === filterOutcome;
    const matchSearch = !search || (c.lead_name ?? '').toLowerCase().includes(search.toLowerCase());
    return matchDir && matchOutcome && matchSearch;
  });

  const selectStyle = {
    padding: '7px 12px',
    borderRadius: 8,
    border: `1px solid ${COLORS.border}`,
    fontSize: 13,
    backgroundColor: COLORS.bg,
    color: COLORS.text,
    outline: 'none',
  };

  const inputStyle = {
    padding: '8px 12px',
    borderRadius: 8,
    border: `1px solid ${COLORS.border}`,
    fontSize: 14,
    backgroundColor: COLORS.bg,
    color: COLORS.text,
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box' as const,
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
      <div
        style={{
          padding: '24px 28px 16px',
          borderBottom: `1px solid ${COLORS.border}`,
          backgroundColor: COLORS.surface,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: COLORS.text, margin: 0 }}>Llamadas</h1>
          <button
            onClick={() => setShowForm(true)}
            style={{
              padding: '8px 18px',
              backgroundColor: COLORS.primary,
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 14,
            }}
          >
            + Registrar Llamada
          </button>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <input
            placeholder="Buscar por contacto…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ ...inputStyle, width: 220 }}
          />
          <select value={filterDir} onChange={e => setFilterDir(e.target.value)} style={selectStyle}>
            <option value="">Dirección: Todas</option>
            <option value="incoming">Entrante</option>
            <option value="outgoing">Saliente</option>
          </select>
          <select value={filterOutcome} onChange={e => setFilterOutcome(e.target.value)} style={selectStyle}>
            <option value="">Resultado: Todos</option>
            <option value="answered">Contestado</option>
            <option value="missed">Perdida</option>
            <option value="voicemail">Buzón</option>
            <option value="no_answer">Sin respuesta</option>
          </select>
        </div>
      </div>

      {/* New call form modal */}
      {showForm && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
          }}
          onClick={e => { if (e.target === e.currentTarget) setShowForm(false); }}
        >
          <div
            style={{
              backgroundColor: COLORS.surface,
              borderRadius: 14,
              padding: 28,
              width: 420,
              boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
            }}
          >
            <h2 style={{ fontSize: 18, fontWeight: 700, color: COLORS.text, margin: '0 0 20px' }}>
              Registrar Llamada
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: COLORS.muted, display: 'block', marginBottom: 6 }}>Contacto</label>
                <select value={form.lead_id} onChange={e => setForm(f => ({ ...f, lead_id: e.target.value }))} style={{ ...inputStyle }}>
                  <option value="">Sin contacto</option>
                  {leads.map(l => <option key={l.id} value={l.id}>{l.full_name}</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: COLORS.muted, display: 'block', marginBottom: 6 }}>Dirección</label>
                  <select value={form.direction} onChange={e => setForm(f => ({ ...f, direction: e.target.value }))} style={{ ...inputStyle }}>
                    <option value="outgoing">Saliente</option>
                    <option value="incoming">Entrante</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: COLORS.muted, display: 'block', marginBottom: 6 }}>Resultado</label>
                  <select value={form.outcome} onChange={e => setForm(f => ({ ...f, outcome: e.target.value }))} style={{ ...inputStyle }}>
                    <option value="answered">Contestado</option>
                    <option value="missed">Perdida</option>
                    <option value="voicemail">Buzón</option>
                    <option value="no_answer">Sin respuesta</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: COLORS.muted, display: 'block', marginBottom: 6 }}>Duración (seg)</label>
                  <input
                    type="number"
                    placeholder="ej. 120"
                    value={form.duration_sec}
                    onChange={e => setForm(f => ({ ...f, duration_sec: e.target.value }))}
                    style={{ ...inputStyle }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: COLORS.muted, display: 'block', marginBottom: 6 }}>Fecha y hora</label>
                  <input
                    type="datetime-local"
                    value={form.called_at}
                    onChange={e => setForm(f => ({ ...f, called_at: e.target.value }))}
                    style={{ ...inputStyle }}
                  />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: COLORS.muted, display: 'block', marginBottom: 6 }}>Notas</label>
                <textarea
                  placeholder="Resumen de la llamada…"
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  rows={3}
                  style={{ ...inputStyle, resize: 'vertical' }}
                />
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
                <button
                  onClick={() => setShowForm(false)}
                  style={{ padding: '9px 18px', backgroundColor: COLORS.bg, color: COLORS.text, border: `1px solid ${COLORS.border}`, borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14 }}
                >
                  Cancelar
                </button>
                <button
                  onClick={saveCall}
                  disabled={saving}
                  style={{ padding: '9px 18px', backgroundColor: COLORS.primary, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14, opacity: saving ? 0.7 : 1 }}
                >
                  {saving ? 'Guardando…' : 'Guardar'}
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
                {['Fecha y Hora', 'Dir.', 'Contacto', 'Duración', 'Resultado', 'Notas'].map(h => (
                  <th
                    key={h}
                    style={{
                      textAlign: 'left',
                      padding: '10px 14px',
                      fontSize: 12,
                      fontWeight: 600,
                      color: COLORS.muted,
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      borderBottom: `2px solid ${COLORS.border}`,
                      backgroundColor: COLORS.surface,
                      position: 'sticky',
                      top: 0,
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((c, i) => {
                const os = OUTCOME_STYLES[c.outcome ?? ''] ?? { bg: '#f3f4f6', text: '#4b5563', label: c.outcome ?? '—' };
                return (
                  <tr
                    key={c.id}
                    style={{ backgroundColor: i % 2 === 0 ? COLORS.surface : COLORS.bg }}
                  >
                    <td style={{ padding: '11px 14px', fontSize: 13, color: COLORS.muted }}>
                      {c.called_at ? new Date(c.called_at).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                    </td>
                    <td style={{ padding: '11px 14px', fontSize: 18 }}>
                      {c.direction === 'incoming' ? '←' : '→'}
                    </td>
                    <td style={{ padding: '11px 14px', fontSize: 14, fontWeight: 500, color: COLORS.text }}>
                      {c.lead_name ?? `Lead #${c.lead_id}` ?? '—'}
                    </td>
                    <td style={{ padding: '11px 14px', fontSize: 13, color: COLORS.muted }}>
                      {formatDuration(c.duration_sec)}
                    </td>
                    <td style={{ padding: '11px 14px' }}>
                      <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, backgroundColor: os.bg, color: os.text, fontWeight: 600 }}>
                        {os.label}
                      </span>
                    </td>
                    <td style={{ padding: '11px 14px', fontSize: 13, color: COLORS.muted, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.notes ?? '—'}
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: 40, textAlign: 'center', color: COLORS.muted, fontSize: 14 }}>
                    No se encontraron llamadas
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

export default Calls;
