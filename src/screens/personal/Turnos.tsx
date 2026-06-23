import React, { useEffect, useState } from 'react';

interface TurnosProps {
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

const DAYS_ES = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

interface TimeEntry {
  id: number;
  user_id: string;
  date: string;
  start_time: string | null;
  end_time: string | null;
  activity: string | null;
  status: string | null;
  note: string | null;
  duration_minutes: number | null;
}

function getWeekDates(offset: number = 0): Date[] {
  const today = new Date();
  const dow = today.getDay();
  const mondayOffset = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayOffset + offset * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function dateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

const Turnos: React.FC<TurnosProps> = ({ dbPath, userId }) => {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [weekOffset, setWeekOffset] = useState(0);
  const [loading, setLoading] = useState(true);

  const weekDates = getWeekDates(weekOffset);

  useEffect(() => {
    if (!dbPath) return;
    loadEntries();
  }, [dbPath]);

  async function loadEntries() {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const data = await invoke<TimeEntry[]>('get_time_entries', { dbPath, userId });
      setEntries(data);
    } catch (err) {
      console.error('Turnos load error:', err);
    } finally {
      setLoading(false);
    }
  }

  function getEntriesForDate(date: Date): TimeEntry[] {
    const key = dateKey(date);
    return entries.filter(e => e.date === key || e.date?.startsWith(key));
  }

  function formatTime(t: string | null): string {
    if (!t) return '—';
    return t.slice(0, 5);
  }

  const weekLabel = weekOffset === 0
    ? 'Esta semana'
    : weekOffset === -1
    ? 'Semana pasada'
    : weekOffset === 1
    ? 'Próxima semana'
    : `Semana del ${weekDates[0].toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}`;

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
          <h1 style={{ fontSize: 22, fontWeight: 700, color: COLORS.text, margin: 0 }}>Mis Turnos</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={() => setWeekOffset(o => o - 1)} style={{ background: 'none', border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 16 }}>‹</button>
            <span style={{ fontSize: 14, fontWeight: 600, color: COLORS.text, minWidth: 140, textAlign: 'center' }}>{weekLabel}</span>
            <button onClick={() => setWeekOffset(o => o + 1)} style={{ background: 'none', border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 16 }}>›</button>
            <button onClick={() => setWeekOffset(0)} style={{ background: 'none', border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontSize: 13, color: COLORS.primary, fontWeight: 600 }}>
              Esta semana
            </button>
          </div>
        </div>
      </div>

      {/* Week grid */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
        {loading ? (
          <div style={{ color: COLORS.muted, padding: 20 }}>Cargando…</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 12 }}>
            {weekDates.map((date, idx) => {
              const dayEntries = getEntriesForDate(date);
              const isToday = dateKey(date) === dateKey(new Date());
              const totalMin = dayEntries.reduce((s, e) => s + (e.duration_minutes ?? 0), 0);
              const totalH = (totalMin / 60).toFixed(1);

              return (
                <div
                  key={idx}
                  style={{
                    backgroundColor: COLORS.surface,
                    borderRadius: 12,
                    border: isToday ? `2px solid ${COLORS.primary}` : `1px solid ${COLORS.border}`,
                    overflow: 'hidden',
                  }}
                >
                  {/* Day header */}
                  <div
                    style={{
                      padding: '10px 12px',
                      backgroundColor: isToday ? COLORS.primary : COLORS.bg,
                      borderBottom: `1px solid ${COLORS.border}`,
                    }}
                  >
                    <div style={{ fontSize: 12, fontWeight: 600, color: isToday ? '#fff' : COLORS.muted, textTransform: 'uppercase' }}>
                      {DAYS_ES[idx].slice(0, 3)}
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: isToday ? '#fff' : COLORS.text }}>
                      {date.getDate()}
                    </div>
                  </div>

                  {/* Entries */}
                  <div style={{ padding: '10px 12px', minHeight: 100 }}>
                    {dayEntries.length === 0 ? (
                      <div style={{ fontSize: 12, color: COLORS.muted, textAlign: 'center', padding: '16px 0' }}>—</div>
                    ) : (
                      dayEntries.map(e => (
                        <div
                          key={e.id}
                          style={{
                            padding: '6px 8px',
                            backgroundColor: '#e8f5ee',
                            borderRadius: 6,
                            marginBottom: 6,
                            borderLeft: `3px solid ${COLORS.primary}`,
                          }}
                        >
                          <div style={{ fontSize: 11, fontWeight: 600, color: COLORS.primary }}>
                            {formatTime(e.start_time)} – {formatTime(e.end_time)}
                          </div>
                          {e.activity && (
                            <div style={{ fontSize: 11, color: COLORS.muted, marginTop: 2 }}>{e.activity}</div>
                          )}
                        </div>
                      ))
                    )}
                    {totalMin > 0 && (
                      <div style={{ fontSize: 11, fontWeight: 600, color: COLORS.primary, marginTop: 6, textAlign: 'right' }}>
                        {totalH}h total
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Turnos;
