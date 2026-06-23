import React, { useEffect, useState } from 'react';

interface ReporteSalesProps {
  dbPath: string;
}

const COLORS = {
  bg: '#f5f0e8',
  surface: '#ffffff',
  border: '#e8e2d9',
  text: '#1a1a1a',
  muted: '#6b7280',
  primary: '#1a4731',
};

const STAGE_COLORS: Record<string, string> = {
  lead: '#6b7280', contacted: '#3b82f6', qualified: '#8b5cf6',
  proposal: '#f59e0b', closing: '#10b981', won: '#059669', lost: '#ef4444',
};

const STAGE_LABELS: Record<string, string> = {
  lead: 'Prospecto', contacted: 'Contactado', qualified: 'Calificado',
  proposal: 'Propuesta', closing: 'Cierre', won: 'Ganado', lost: 'Perdido',
};

interface SalesStats {
  total_leads: number;
  leads_this_month: number;
  leads_last_month: number;
  won_count: number;
  won_budget: number;
  lost_count: number;
  stage_counts: Array<{ stage: string; count: number }>;
  source_counts: Array<{ source: string; count: number }>;
  monthly_counts: Array<{ month: string; count: number }>;
}

const ReporteSales: React.FC<ReporteSalesProps> = ({ dbPath }) => {
  const [stats, setStats] = useState<SalesStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!dbPath) return;
    loadStats();
  }, [dbPath]);

  async function loadStats() {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const data = await invoke<SalesStats>('get_sales_stats', { dbPath });
      setStats(data);
    } catch (err) {
      console.error('ReporteSales error:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div style={{ padding: 40, color: COLORS.muted, fontFamily: 'sans-serif' }}>Cargando…</div>;
  if (!stats) return <div style={{ padding: 40, color: COLORS.muted, fontFamily: 'sans-serif' }}>Sin datos</div>;

  const convRate = stats.total_leads > 0 ? ((stats.won_count / stats.total_leads) * 100).toFixed(1) : '0';
  const monthlyChange = stats.leads_last_month > 0
    ? (((stats.leads_this_month - stats.leads_last_month) / stats.leads_last_month) * 100).toFixed(0)
    : null;

  const maxStage = Math.max(...stats.stage_counts.map(s => s.count), 1);
  const maxMonthly = Math.max(...stats.monthly_counts.map(m => m.count), 1);
  const totalSources = stats.source_counts.reduce((s, x) => s + x.count, 0);

  return (
    <div style={{ flex: 1, overflowY: 'auto', backgroundColor: COLORS.bg, padding: 28, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: COLORS.text, margin: '0 0 6px' }}>Informe de Ventas</h1>
      <p style={{ color: COLORS.muted, fontSize: 14, margin: '0 0 28px' }}>Resumen del rendimiento comercial</p>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
        {[
          { label: 'Leads totales', value: stats.total_leads, color: '#3b82f6', sub: null },
          { label: 'Leads este mes', value: stats.leads_this_month, color: COLORS.primary, sub: monthlyChange ? `${monthlyChange > '0' ? '+' : ''}${monthlyChange}% vs mes anterior` : null },
          { label: 'Ganados', value: stats.won_count, color: '#059669', sub: stats.won_budget > 0 ? `${stats.won_budget.toLocaleString('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}` : null },
          { label: 'Conversión', value: `${convRate}%`, color: '#8b5cf6', sub: `${stats.lost_count} perdidos` },
        ].map(k => (
          <div key={k.label} style={{ backgroundColor: COLORS.surface, borderRadius: 12, padding: '20px 24px', border: `1px solid ${COLORS.border}` }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: k.color }}>{k.value}</div>
            <div style={{ fontSize: 13, color: COLORS.muted, marginTop: 4 }}>{k.label}</div>
            {k.sub && <div style={{ fontSize: 11, color: COLORS.muted, marginTop: 2 }}>{k.sub}</div>}
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        {/* Pipeline distribution */}
        <div style={{ backgroundColor: COLORS.surface, borderRadius: 12, padding: 24, border: `1px solid ${COLORS.border}` }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: COLORS.text, margin: '0 0 18px' }}>Distribución Pipeline</h2>
          {stats.stage_counts.map(s => (
            <div key={s.stage} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <div style={{ width: 90, fontSize: 12, color: COLORS.muted, textAlign: 'right', flexShrink: 0 }}>
                {STAGE_LABELS[s.stage] ?? s.stage}
              </div>
              <div style={{ flex: 1, height: 18, backgroundColor: '#f0ebe3', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ width: `${(s.count / maxStage) * 100}%`, height: '100%', backgroundColor: STAGE_COLORS[s.stage] ?? '#6b7280', borderRadius: 4, minWidth: s.count > 0 ? 4 : 0 }} />
              </div>
              <div style={{ width: 28, fontSize: 13, fontWeight: 600, color: COLORS.text, flexShrink: 0 }}>{s.count}</div>
            </div>
          ))}
        </div>

        {/* Lead sources */}
        <div style={{ backgroundColor: COLORS.surface, borderRadius: 12, padding: 24, border: `1px solid ${COLORS.border}` }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: COLORS.text, margin: '0 0 18px' }}>Fuentes de Leads</h2>
          {stats.source_counts.slice(0, 8).map(s => (
            <div key={s.source ?? 'unknown'} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: `1px solid ${COLORS.border}` }}>
              <span style={{ fontSize: 13, color: COLORS.text }}>{s.source ?? 'Desconocida'}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 80, height: 6, backgroundColor: '#f0ebe3', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ width: `${(s.count / totalSources) * 100}%`, height: '100%', backgroundColor: COLORS.primary, borderRadius: 3 }} />
                </div>
                <span style={{ fontSize: 12, fontWeight: 600, color: COLORS.muted, width: 28, textAlign: 'right' }}>{s.count}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Monthly trend */}
      <div style={{ backgroundColor: COLORS.surface, borderRadius: 12, padding: 24, border: `1px solid ${COLORS.border}` }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, color: COLORS.text, margin: '0 0 18px' }}>Leads por Mes (últimos 6 meses)</h2>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, height: 120 }}>
          {stats.monthly_counts.map(m => (
            <div key={m.month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: COLORS.muted }}>{m.count}</div>
              <div
                style={{
                  width: '100%',
                  height: `${Math.max((m.count / maxMonthly) * 90, m.count > 0 ? 8 : 2)}px`,
                  backgroundColor: COLORS.primary,
                  borderRadius: '4px 4px 0 0',
                  transition: 'height 0.3s ease',
                }}
              />
              <div style={{ fontSize: 11, color: COLORS.muted, textAlign: 'center' }}>
                {m.month.slice(5, 7)}/{m.month.slice(2, 4)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ReporteSales;
