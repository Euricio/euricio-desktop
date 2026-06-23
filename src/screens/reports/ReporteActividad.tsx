import React, { useEffect, useState } from 'react';

interface ReporteActividadProps {
  dbPath: string;
}

const COLORS = {
  bg: '#f5f0e8', surface: '#ffffff', border: '#e8e2d9',
  text: '#1a1a1a', muted: '#6b7280', primary: '#1a4731',
};

interface ActivityStats {
  tasks_completed_this_week: number;
  tasks_completed_last_week: number;
  calls_this_week: number;
  tasks_by_status: Array<{ status: string; count: number }>;
  calls_by_outcome: Array<{ outcome: string; count: number }>;
  tasks_by_priority: Array<{ priority: string; count: number }>;
}

const TASK_STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente', in_progress: 'En curso', completed: 'Completada', cancelled: 'Cancelada',
};
const CALL_OUTCOME_LABELS: Record<string, string> = {
  answered: 'Contestado', missed: 'Perdida', voicemail: 'Buzón', no_answer: 'Sin resp.',
};
const PRIORITY_LABELS: Record<string, string> = {
  high: 'Alta', medium: 'Media', low: 'Baja',
};
const PRIORITY_COLORS: Record<string, string> = {
  high: '#ef4444', medium: '#f59e0b', low: '#6b7280',
};

const ReporteActividad: React.FC<ReporteActividadProps> = ({ dbPath }) => {
  const [stats, setStats] = useState<ActivityStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!dbPath) return;
    loadStats();
  }, [dbPath]);

  async function loadStats() {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const data = await invoke<ActivityStats>('get_activity_stats', { dbPath });
      setStats(data);
    } catch (err) {
      console.error('ReporteActividad error:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div style={{ padding: 40, color: COLORS.muted, fontFamily: 'sans-serif' }}>Cargando…</div>;
  if (!stats) return <div style={{ padding: 40, color: COLORS.muted, fontFamily: 'sans-serif' }}>Sin datos</div>;

  const taskChange = stats.tasks_completed_last_week > 0
    ? (((stats.tasks_completed_this_week - stats.tasks_completed_last_week) / stats.tasks_completed_last_week) * 100).toFixed(0)
    : null;

  const maxTaskStatus = Math.max(...stats.tasks_by_status.map(s => s.count), 1);
  const maxCallOutcome = Math.max(...stats.calls_by_outcome.map(s => s.count), 1);

  return (
    <div style={{ flex: 1, overflowY: 'auto', backgroundColor: COLORS.bg, padding: 28, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: COLORS.text, margin: '0 0 6px' }}>Informe de Actividad</h1>
      <p style={{ color: COLORS.muted, fontSize: 14, margin: '0 0 28px' }}>Rendimiento del equipo esta semana</p>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 28 }}>
        {[
          { label: 'Tareas completadas (semana)', value: stats.tasks_completed_this_week, color: '#059669', sub: taskChange ? `${parseInt(taskChange) >= 0 ? '+' : ''}${taskChange}% vs semana anterior` : null },
          { label: 'Llamadas esta semana', value: stats.calls_this_week, color: '#3b82f6', sub: null },
          { label: 'Tareas semana anterior', value: stats.tasks_completed_last_week, color: COLORS.muted, sub: null },
        ].map(k => (
          <div key={k.label} style={{ backgroundColor: COLORS.surface, borderRadius: 12, padding: '20px 24px', border: `1px solid ${COLORS.border}` }}>
            <div style={{ fontSize: 32, fontWeight: 700, color: k.color }}>{k.value}</div>
            <div style={{ fontSize: 13, color: COLORS.muted, marginTop: 4 }}>{k.label}</div>
            {k.sub && <div style={{ fontSize: 11, color: '#059669', marginTop: 2 }}>{k.sub}</div>}
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20 }}>
        {/* Tasks by status */}
        <div style={{ backgroundColor: COLORS.surface, borderRadius: 12, padding: 24, border: `1px solid ${COLORS.border}` }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: COLORS.text, margin: '0 0 18px' }}>Tareas por Estado</h2>
          {stats.tasks_by_status.map(s => (
            <div key={s.status} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <div style={{ width: 80, fontSize: 12, color: COLORS.muted, flexShrink: 0 }}>{TASK_STATUS_LABELS[s.status] ?? s.status}</div>
              <div style={{ flex: 1, height: 16, backgroundColor: '#f0ebe3', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ width: `${(s.count / maxTaskStatus) * 100}%`, height: '100%', backgroundColor: COLORS.primary, borderRadius: 4, minWidth: s.count > 0 ? 4 : 0 }} />
              </div>
              <div style={{ width: 24, fontSize: 12, fontWeight: 600, color: COLORS.text, textAlign: 'right' }}>{s.count}</div>
            </div>
          ))}
        </div>

        {/* Calls by outcome */}
        <div style={{ backgroundColor: COLORS.surface, borderRadius: 12, padding: 24, border: `1px solid ${COLORS.border}` }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: COLORS.text, margin: '0 0 18px' }}>Llamadas por Resultado</h2>
          {stats.calls_by_outcome.map(s => (
            <div key={s.outcome} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <div style={{ width: 80, fontSize: 12, color: COLORS.muted, flexShrink: 0 }}>{CALL_OUTCOME_LABELS[s.outcome] ?? s.outcome}</div>
              <div style={{ flex: 1, height: 16, backgroundColor: '#f0ebe3', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ width: `${(s.count / maxCallOutcome) * 100}%`, height: '100%', backgroundColor: '#3b82f6', borderRadius: 4, minWidth: s.count > 0 ? 4 : 0 }} />
              </div>
              <div style={{ width: 24, fontSize: 12, fontWeight: 600, color: COLORS.text, textAlign: 'right' }}>{s.count}</div>
            </div>
          ))}
        </div>

        {/* Tasks by priority */}
        <div style={{ backgroundColor: COLORS.surface, borderRadius: 12, padding: 24, border: `1px solid ${COLORS.border}` }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: COLORS.text, margin: '0 0 18px' }}>Tareas por Prioridad</h2>
          {stats.tasks_by_priority.map(s => (
            <div key={s.priority} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div
                style={{
                  width: 10, height: 10, borderRadius: '50%',
                  backgroundColor: PRIORITY_COLORS[s.priority] ?? '#6b7280',
                  flexShrink: 0,
                }}
              />
              <span style={{ fontSize: 13, color: COLORS.text, flex: 1 }}>{PRIORITY_LABELS[s.priority] ?? s.priority}</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: PRIORITY_COLORS[s.priority] ?? '#6b7280' }}>{s.count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ReporteActividad;
