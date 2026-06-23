import React, { useEffect, useState } from 'react';

interface ReportePersonalProps {
  dbPath: string;
}

const COLORS = {
  bg: '#f5f0e8', surface: '#ffffff', border: '#e8e2d9',
  text: '#1a1a1a', muted: '#6b7280', primary: '#1a4731',
};

interface UserHours {
  user_id: string;
  total_minutes: number;
  days_worked: number;
  avg_minutes_per_day: number;
}

const ReportePersonal: React.FC<ReportePersonalProps> = ({ dbPath }) => {
  const [data, setData] = useState<UserHours[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!dbPath) return;
    loadStats();
  }, [dbPath]);

  async function loadStats() {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const result = await invoke<UserHours[]>('get_personal_stats', { dbPath });
      setData(result);
    } catch (err) {
      console.error('ReportePersonal error:', err);
    } finally {
      setLoading(false);
    }
  }

  function fmtHours(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}h ${m}m`;
  }

  const maxMinutes = Math.max(...data.map(d => d.total_minutes), 1);

  return (
    <div style={{ flex: 1, overflowY: 'auto', backgroundColor: COLORS.bg, padding: 28, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: COLORS.text, margin: '0 0 6px' }}>Informe de Personal</h1>
      <p style={{ color: COLORS.muted, fontSize: 14, margin: '0 0 28px' }}>Horas trabajadas este mes por empleado</p>

      {loading ? (
        <div style={{ color: COLORS.muted }}>Cargando…</div>
      ) : data.length === 0 ? (
        <div style={{ backgroundColor: COLORS.surface, borderRadius: 12, padding: 40, textAlign: 'center', color: COLORS.muted, border: `1px solid ${COLORS.border}` }}>
          Sin registros de tiempo este mes
        </div>
      ) : (
        <div style={{ backgroundColor: COLORS.surface, borderRadius: 14, border: `1px solid ${COLORS.border}`, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Empleado', 'Horas totales', 'Días trabajados', 'Promedio/día', 'Distribución'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '12px 18px', fontSize: 12, fontWeight: 600, color: COLORS.muted, textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: `2px solid ${COLORS.border}`, backgroundColor: COLORS.bg }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, i) => (
                <tr key={row.user_id} style={{ backgroundColor: i % 2 === 0 ? COLORS.surface : COLORS.bg }}>
                  <td style={{ padding: '13px 18px', fontSize: 14, fontWeight: 500, color: COLORS.text }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: '50%',
                        backgroundColor: '#e8f5ee', color: COLORS.primary,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 12, fontWeight: 700, flexShrink: 0,
                      }}>
                        {row.user_id.slice(0, 2).toUpperCase()}
                      </div>
                      <span style={{ fontFamily: 'monospace', fontSize: 12, color: COLORS.muted }}>
                        {row.user_id.slice(0, 8)}…
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: '13px 18px', fontSize: 15, fontWeight: 700, color: COLORS.primary }}>
                    {fmtHours(row.total_minutes)}
                  </td>
                  <td style={{ padding: '13px 18px', fontSize: 14, color: COLORS.text }}>
                    {row.days_worked} días
                  </td>
                  <td style={{ padding: '13px 18px', fontSize: 13, color: COLORS.muted }}>
                    {fmtHours(Math.round(row.avg_minutes_per_day))}
                  </td>
                  <td style={{ padding: '13px 18px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ flex: 1, height: 8, backgroundColor: '#f0ebe3', borderRadius: 4, overflow: 'hidden', maxWidth: 120 }}>
                        <div style={{
                          width: `${(row.total_minutes / maxMinutes) * 100}%`,
                          height: '100%',
                          backgroundColor: COLORS.primary,
                          borderRadius: 4,
                        }} />
                      </div>
                      <span style={{ fontSize: 11, color: COLORS.muted }}>
                        {Math.round((row.total_minutes / maxMinutes) * 100)}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ReportePersonal;
