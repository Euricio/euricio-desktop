import React, { useEffect, useState } from 'react';

interface ReportePropiedadesProps {
  dbPath: string;
}

const COLORS = {
  bg: '#f5f0e8', surface: '#ffffff', border: '#e8e2d9',
  text: '#1a1a1a', muted: '#6b7280', primary: '#1a4731',
};

interface PropertyStats {
  total: number;
  by_status: Array<{ status: string; count: number }>;
  by_type: Array<{ property_type: string; count: number }>;
  by_offer: Array<{ offer_type: string; count: number }>;
  avg_price_per_m2: number;
  avg_price: number;
}

const STATUS_LABELS: Record<string, string> = {
  available: 'Disponible', reserved: 'Reservado', sold: 'Vendido', rented: 'Alquilado',
};
const STATUS_COLORS: Record<string, string> = {
  available: '#059669', reserved: '#f59e0b', sold: '#6b7280', rented: '#3b82f6',
};

const ReportePropiedades: React.FC<ReportePropiedadesProps> = ({ dbPath }) => {
  const [stats, setStats] = useState<PropertyStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!dbPath) return;
    loadStats();
  }, [dbPath]);

  async function loadStats() {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const data = await invoke<PropertyStats>('get_property_stats', { dbPath });
      setStats(data);
    } catch (err) {
      console.error('ReportePropiedades error:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div style={{ padding: 40, color: COLORS.muted, fontFamily: 'sans-serif' }}>Cargando…</div>;
  if (!stats) return <div style={{ padding: 40, color: COLORS.muted, fontFamily: 'sans-serif' }}>Sin datos</div>;

  const maxType = Math.max(...stats.by_type.map(t => t.count), 1);

  return (
    <div style={{ flex: 1, overflowY: 'auto', backgroundColor: COLORS.bg, padding: 28, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: COLORS.text, margin: '0 0 6px' }}>Informe de Propiedades</h1>
      <p style={{ color: COLORS.muted, fontSize: 14, margin: '0 0 28px' }}>Análisis del inventario inmobiliario</p>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 28 }}>
        {[
          { label: 'Total propiedades', value: stats.total, color: COLORS.primary },
          { label: 'Precio medio', value: stats.avg_price > 0 ? stats.avg_price.toLocaleString('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }) : '—', color: '#059669' },
          { label: 'Precio medio/m²', value: stats.avg_price_per_m2 > 0 ? `${stats.avg_price_per_m2.toLocaleString('es-ES', { maximumFractionDigits: 0 })} €/m²` : '—', color: '#3b82f6' },
        ].map(k => (
          <div key={k.label} style={{ backgroundColor: COLORS.surface, borderRadius: 12, padding: '20px 24px', border: `1px solid ${COLORS.border}` }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: k.color }}>{k.value}</div>
            <div style={{ fontSize: 13, color: COLORS.muted, marginTop: 4 }}>{k.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20 }}>
        {/* By status */}
        <div style={{ backgroundColor: COLORS.surface, borderRadius: 12, padding: 24, border: `1px solid ${COLORS.border}` }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: COLORS.text, margin: '0 0 18px' }}>Por Estado</h2>
          {stats.by_status.map(s => (
            <div key={s.status} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: STATUS_COLORS[s.status] ?? '#6b7280', flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: COLORS.text, flex: 1 }}>{STATUS_LABELS[s.status] ?? s.status}</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: STATUS_COLORS[s.status] ?? '#6b7280' }}>{s.count}</span>
            </div>
          ))}
        </div>

        {/* By type */}
        <div style={{ backgroundColor: COLORS.surface, borderRadius: 12, padding: 24, border: `1px solid ${COLORS.border}` }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: COLORS.text, margin: '0 0 18px' }}>Por Tipo</h2>
          {stats.by_type.slice(0, 8).map(t => (
            <div key={t.property_type ?? 'unknown'} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <div style={{ width: 70, fontSize: 12, color: COLORS.muted, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {t.property_type ?? 'Otro'}
              </div>
              <div style={{ flex: 1, height: 16, backgroundColor: '#f0ebe3', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ width: `${(t.count / maxType) * 100}%`, height: '100%', backgroundColor: COLORS.primary, borderRadius: 4, minWidth: t.count > 0 ? 4 : 0 }} />
              </div>
              <div style={{ width: 24, fontSize: 12, fontWeight: 600, color: COLORS.text, textAlign: 'right' }}>{t.count}</div>
            </div>
          ))}
        </div>

        {/* By offer type */}
        <div style={{ backgroundColor: COLORS.surface, borderRadius: 12, padding: 24, border: `1px solid ${COLORS.border}` }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: COLORS.text, margin: '0 0 18px' }}>Venta vs Alquiler</h2>
          {stats.by_offer.map(o => {
            const label = o.offer_type === 'sale' ? 'Venta' : o.offer_type === 'rent' ? 'Alquiler' : o.offer_type ?? 'Otro';
            const color = o.offer_type === 'sale' ? COLORS.primary : '#3b82f6';
            const pct = stats.total > 0 ? Math.round((o.count / stats.total) * 100) : 0;
            return (
              <div key={o.offer_type ?? 'unknown'} style={{ marginBottom: 18 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: COLORS.text }}>{label}</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color }}>{o.count} ({pct}%)</span>
                </div>
                <div style={{ height: 10, backgroundColor: '#f0ebe3', borderRadius: 5, overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, height: '100%', backgroundColor: color, borderRadius: 5 }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ReportePropiedades;
