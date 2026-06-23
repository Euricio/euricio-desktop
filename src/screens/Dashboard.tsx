import React, { useEffect, useState } from 'react';

interface DashboardProps {
  dbPath: string;
  onNavigate: (screen: string) => void;
  onSelectLead: (id: number) => void;
}

const STAGE_COLORS: Record<string, string> = {
  lead: '#6b7280',
  contacted: '#3b82f6',
  qualified: '#8b5cf6',
  proposal: '#f59e0b',
  closing: '#10b981',
  won: '#059669',
  lost: '#ef4444',
};

const STAGE_LABELS: Record<string, string> = {
  lead: 'Prospecto',
  contacted: 'Contactado',
  qualified: 'Calificado',
  proposal: 'Propuesta',
  closing: 'Cierre',
  won: 'Ganado',
  lost: 'Perdido',
};

const COLORS = {
  bg: '#f5f0e8',
  surface: '#ffffff',
  border: '#e8e2d9',
  text: '#1a1a1a',
  muted: '#6b7280',
  primary: '#1a4731',
  accent: '#4ade80',
};

interface KPI {
  label: string;
  value: number | string;
  color: string;
  icon: string;
}

interface StageCount {
  stage: string;
  count: number;
}

interface RecentLead {
  id: number;
  full_name: string;
  pipeline_stage: string;
  created_at: string;
}

interface RecentTask {
  id: number;
  title: string;
  due_date: string;
  status: string;
}

const Dashboard: React.FC<DashboardProps> = ({ dbPath, onNavigate, onSelectLead }) => {
  const [kpis, setKpis] = useState({ leads: 0, properties: 0, tasks: 0, calls: 0 });
  const [stageCounts, setStageCounts] = useState<StageCount[]>([]);
  const [recentLeads, setRecentLeads] = useState<RecentLead[]>([]);
  const [recentTasks, setRecentTasks] = useState<RecentTask[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!dbPath) return;
    loadData();
  }, [dbPath]);

  async function loadData() {
    try {
      const { invoke } = await import('@tauri-apps/api/core');

      const [leadsData, propertiesData, tasksData, callsData, stagesData, recentLeadsData, recentTasksData] =
        await Promise.all([
          invoke<number>('count_table', { dbPath, table: 'leads', filter: '' }),
          invoke<number>('count_table', { dbPath, table: 'properties', filter: "status='available'" }),
          invoke<number>('count_table', { dbPath, table: 'tasks', filter: "status='pending'" }),
          invoke<number>('count_table', { dbPath, table: 'call_logs', filter: `date(called_at)=date('now')` }),
          invoke<StageCount[]>('get_stage_counts', { dbPath }),
          invoke<RecentLead[]>('get_recent_leads', { dbPath, limit: 8 }),
          invoke<RecentTask[]>('get_recent_tasks', { dbPath, limit: 5 }),
        ]);

      setKpis({ leads: leadsData, properties: propertiesData, tasks: tasksData, calls: callsData });
      setStageCounts(stagesData);
      setRecentLeads(recentLeadsData);
      setRecentTasks(recentTasksData);
    } catch (err) {
      console.error('Dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  }

  const maxStageCount = Math.max(...stageCounts.map(s => s.count), 1);

  if (loading) {
    return (
      <div style={{ padding: 40, color: COLORS.muted, fontFamily: 'sans-serif' }}>
        Cargando…
      </div>
    );
  }

  const kpiCards: KPI[] = [
    { label: 'Leads Totales', value: kpis.leads, color: '#3b82f6', icon: '👥' },
    { label: 'Prop. Activas', value: kpis.properties, color: '#059669', icon: '🏠' },
    { label: 'Tareas Pend.', value: kpis.tasks, color: '#f59e0b', icon: '✅' },
    { label: 'Llamadas Hoy', value: kpis.calls, color: '#8b5cf6', icon: '📞' },
  ];

  return (
    <div
      style={{
        flex: 1,
        overflowY: 'auto',
        backgroundColor: COLORS.bg,
        padding: 28,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: COLORS.text, margin: 0 }}>Dashboard</h1>
        <p style={{ color: COLORS.muted, margin: '4px 0 0', fontSize: 14 }}>
          Resumen general del CRM
        </p>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
        {kpiCards.map((kpi) => (
          <div
            key={kpi.label}
            style={{
              backgroundColor: COLORS.surface,
              borderRadius: 12,
              padding: '20px 24px',
              border: `1px solid ${COLORS.border}`,
              boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            }}
          >
            <div style={{ fontSize: 28, marginBottom: 8 }}>{kpi.icon}</div>
            <div style={{ fontSize: 32, fontWeight: 700, color: kpi.color, lineHeight: 1 }}>
              {kpi.value}
            </div>
            <div style={{ fontSize: 13, color: COLORS.muted, marginTop: 4 }}>{kpi.label}</div>
          </div>
        ))}
      </div>

      {/* Bottom row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Pipeline Funnel */}
        <div
          style={{
            backgroundColor: COLORS.surface,
            borderRadius: 12,
            padding: 24,
            border: `1px solid ${COLORS.border}`,
          }}
        >
          <h2 style={{ fontSize: 16, fontWeight: 600, color: COLORS.text, margin: '0 0 20px' }}>
            Pipeline por Etapa
          </h2>
          {stageCounts.length === 0 ? (
            <p style={{ color: COLORS.muted, fontSize: 14 }}>Sin datos</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {stageCounts.map((s) => (
                <div key={s.stage} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 90, fontSize: 12, color: COLORS.muted, textAlign: 'right', flexShrink: 0 }}>
                    {STAGE_LABELS[s.stage] ?? s.stage}
                  </div>
                  <div
                    style={{
                      flex: 1,
                      height: 20,
                      backgroundColor: '#f0ebe3',
                      borderRadius: 4,
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${(s.count / maxStageCount) * 100}%`,
                        height: '100%',
                        backgroundColor: STAGE_COLORS[s.stage] ?? '#6b7280',
                        borderRadius: 4,
                        minWidth: s.count > 0 ? 4 : 0,
                        transition: 'width 0.4s ease',
                      }}
                    />
                  </div>
                  <div style={{ width: 28, fontSize: 13, fontWeight: 600, color: COLORS.text, flexShrink: 0 }}>
                    {s.count}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent activity */}
        <div
          style={{
            backgroundColor: COLORS.surface,
            borderRadius: 12,
            padding: 24,
            border: `1px solid ${COLORS.border}`,
          }}
        >
          <h2 style={{ fontSize: 16, fontWeight: 600, color: COLORS.text, margin: '0 0 16px' }}>
            Actividad Reciente
          </h2>

          {/* Recent leads */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: COLORS.muted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
              Últimos Leads
            </div>
            {recentLeads.slice(0, 5).map((lead) => (
              <div
                key={lead.id}
                onClick={() => onSelectLead(lead.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '6px 0',
                  borderBottom: `1px solid ${COLORS.border}`,
                  cursor: 'pointer',
                }}
              >
                <span style={{ fontSize: 13, color: COLORS.text, fontWeight: 500 }}>{lead.full_name}</span>
                <span
                  style={{
                    fontSize: 11,
                    padding: '2px 8px',
                    borderRadius: 20,
                    backgroundColor: `${STAGE_COLORS[lead.pipeline_stage] ?? '#6b7280'}20`,
                    color: STAGE_COLORS[lead.pipeline_stage] ?? '#6b7280',
                    fontWeight: 600,
                  }}
                >
                  {STAGE_LABELS[lead.pipeline_stage] ?? lead.pipeline_stage}
                </span>
              </div>
            ))}
          </div>

          {/* Recent tasks */}
          <div style={{ fontSize: 12, fontWeight: 600, color: COLORS.muted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
            Próximas Tareas
          </div>
          {recentTasks.map((task) => (
            <div
              key={task.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 0',
                borderBottom: `1px solid ${COLORS.border}`,
              }}
            >
              <span style={{ fontSize: 13, color: COLORS.text }}>{task.title}</span>
              <span style={{ fontSize: 11, color: COLORS.muted }}>
                {task.due_date ? new Date(task.due_date).toLocaleDateString('es-ES') : '—'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Quick actions */}
      <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
        <button
          onClick={() => onNavigate('leads')}
          style={{
            padding: '10px 20px',
            backgroundColor: COLORS.primary,
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: 14,
          }}
        >
          + Nuevo Lead
        </button>
        <button
          onClick={() => onNavigate('tasks')}
          style={{
            padding: '10px 20px',
            backgroundColor: COLORS.surface,
            color: COLORS.primary,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 8,
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: 14,
          }}
        >
          + Nueva Tarea
        </button>
        <button
          onClick={() => onNavigate('properties')}
          style={{
            padding: '10px 20px',
            backgroundColor: COLORS.surface,
            color: COLORS.primary,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 8,
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: 14,
          }}
        >
          + Nueva Propiedad
        </button>
      </div>
    </div>
  );
};

export default Dashboard;
