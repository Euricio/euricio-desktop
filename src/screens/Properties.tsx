import React, { useEffect, useState } from 'react';

interface PropertiesProps {
  dbPath: string;
  onSelectProperty?: (id: number) => void;
}

const COLORS = {
  bg: '#f5f0e8',
  surface: '#ffffff',
  border: '#e8e2d9',
  text: '#1a1a1a',
  muted: '#6b7280',
  primary: '#1a4731',
  accent: '#4ade80',
};

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  available: { bg: '#dcfce7', text: '#15803d' },
  reserved: { bg: '#fef3c7', text: '#d97706' },
  sold: { bg: '#f1f5f9', text: '#64748b' },
  rented: { bg: '#f1f5f9', text: '#64748b' },
};

const STATUS_LABELS: Record<string, string> = {
  available: 'Disponible',
  reserved: 'Reservado',
  sold: 'Vendido',
  rented: 'Alquilado',
};

interface Property {
  id: number;
  title: string;
  property_type: string | null;
  offer_type: string | null;
  status: string | null;
  address: string | null;
  city: string | null;
  province: string | null;
  price: number | null;
  size_m2: number | null;
  rooms: number | null;
  bathrooms: number | null;
  lead_id: number | null;
  created_at: string | null;
}

const Properties: React.FC<PropertiesProps> = ({ dbPath, onSelectProperty }) => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [search, setSearch] = useState('');
  const [filterOffer, setFilterOffer] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Property | null>(null);

  useEffect(() => {
    if (!dbPath) return;
    loadProperties();
  }, [dbPath]);

  async function loadProperties() {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const data = await invoke<Property[]>('get_properties', { dbPath });
      setProperties(data);
    } catch (err) {
      console.error('Properties load error:', err);
    } finally {
      setLoading(false);
    }
  }

  const filtered = properties.filter(p => {
    const matchSearch = !search ||
      (p.title?.toLowerCase().includes(search.toLowerCase())) ||
      (p.city?.toLowerCase().includes(search.toLowerCase())) ||
      (p.address?.toLowerCase().includes(search.toLowerCase()));
    const matchOffer = !filterOffer || p.offer_type === filterOffer;
    const matchStatus = !filterStatus || p.status === filterStatus;
    return matchSearch && matchOffer && matchStatus;
  });

  const selectStyle = {
    padding: '7px 12px',
    borderRadius: 8,
    border: `1px solid ${COLORS.border}`,
    fontSize: 13,
    backgroundColor: COLORS.bg,
    color: COLORS.text,
    outline: 'none',
    cursor: 'pointer',
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
          <h1 style={{ fontSize: 22, fontWeight: 700, color: COLORS.text, margin: 0 }}>
            Propiedades
          </h1>
          <span style={{ fontSize: 13, color: COLORS.muted }}>{filtered.length} inmuebles</span>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <input
            placeholder="Buscar por título, ciudad, dirección…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              padding: '7px 14px',
              borderRadius: 8,
              border: `1px solid ${COLORS.border}`,
              fontSize: 13,
              width: 280,
              backgroundColor: COLORS.bg,
              color: COLORS.text,
              outline: 'none',
            }}
          />
          <select value={filterOffer} onChange={e => setFilterOffer(e.target.value)} style={selectStyle}>
            <option value="">Operación: Todas</option>
            <option value="sale">Venta</option>
            <option value="rent">Alquiler</option>
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={selectStyle}>
            <option value="">Estado: Todos</option>
            <option value="available">Disponible</option>
            <option value="reserved">Reservado</option>
            <option value="sold">Vendido</option>
            <option value="rented">Alquilado</option>
          </select>
        </div>
      </div>

      {/* Content: table or detail */}
      {selected ? (
        <PropertyDetail property={selected} onBack={() => setSelected(null)} />
      ) : (
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 28px 28px' }}>
          {loading ? (
            <div style={{ padding: 40, color: COLORS.muted }}>Cargando…</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 20 }}>
              <thead>
                <tr>
                  {['Título', 'Tipo', 'Operación', 'Ciudad', 'Precio', 'm²', 'Hab.', 'Estado'].map(h => (
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
                {filtered.map((p, i) => {
                  const sc = STATUS_COLORS[p.status ?? ''] ?? { bg: '#f1f5f9', text: '#64748b' };
                  return (
                    <tr
                      key={p.id}
                      onClick={() => onSelectProperty ? onSelectProperty(p.id) : setSelected(p)}
                      style={{
                        cursor: 'pointer',
                        backgroundColor: i % 2 === 0 ? COLORS.surface : COLORS.bg,
                        transition: 'background-color 0.1s',
                      }}
                      onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.backgroundColor = '#eef7f2'}
                      onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.backgroundColor = i % 2 === 0 ? COLORS.surface : COLORS.bg}
                    >
                      <td style={{ padding: '11px 14px', fontSize: 14, fontWeight: 500, color: COLORS.text }}>{p.title}</td>
                      <td style={{ padding: '11px 14px', fontSize: 13, color: COLORS.muted }}>{p.property_type ?? '—'}</td>
                      <td style={{ padding: '11px 14px', fontSize: 13, color: COLORS.muted }}>
                        {p.offer_type === 'sale' ? 'Venta' : p.offer_type === 'rent' ? 'Alquiler' : '—'}
                      </td>
                      <td style={{ padding: '11px 14px', fontSize: 13, color: COLORS.muted }}>{p.city ?? '—'}</td>
                      <td style={{ padding: '11px 14px', fontSize: 13, fontWeight: 600, color: '#059669' }}>
                        {p.price ? p.price.toLocaleString('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }) : '—'}
                      </td>
                      <td style={{ padding: '11px 14px', fontSize: 13, color: COLORS.muted }}>{p.size_m2 ? `${p.size_m2} m²` : '—'}</td>
                      <td style={{ padding: '11px 14px', fontSize: 13, color: COLORS.muted }}>{p.rooms ?? '—'}</td>
                      <td style={{ padding: '11px 14px' }}>
                        <span
                          style={{
                            fontSize: 11,
                            padding: '3px 10px',
                            borderRadius: 20,
                            backgroundColor: sc.bg,
                            color: sc.text,
                            fontWeight: 600,
                          }}
                        >
                          {STATUS_LABELS[p.status ?? ''] ?? p.status ?? '—'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} style={{ padding: 40, textAlign: 'center', color: COLORS.muted, fontSize: 14 }}>
                      No se encontraron propiedades
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
};

// ── Property Detail (inline) ───────────────────────────────────────────────────

interface PropertyDetailProps {
  property: Property;
  onBack: () => void;
}

const PropertyDetail: React.FC<PropertyDetailProps> = ({ property: p, onBack }) => {
  const sc = STATUS_COLORS[p.status ?? ''] ?? { bg: '#f1f5f9', text: '#64748b' };

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: 28 }}>
      <button
        onClick={onBack}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: COLORS.muted,
          fontSize: 14,
          marginBottom: 20,
          padding: 0,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        ← Volver a Propiedades
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: COLORS.text, margin: 0 }}>{p.title}</h1>
        <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 20, backgroundColor: sc.bg, color: sc.text, fontWeight: 600 }}>
          {STATUS_LABELS[p.status ?? ''] ?? p.status ?? '—'}
        </span>
        {p.offer_type && (
          <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 20, backgroundColor: '#dbeafe', color: '#1d4ed8', fontWeight: 600 }}>
            {p.offer_type === 'sale' ? 'Venta' : 'Alquiler'}
          </span>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={{ backgroundColor: COLORS.surface, borderRadius: 12, padding: 20, border: `1px solid ${COLORS.border}` }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: COLORS.muted, margin: '0 0 14px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Datos</h3>
          {[
            ['Tipo', p.property_type],
            ['Dirección', p.address],
            ['Ciudad', p.city],
            ['Provincia', p.province],
            ['Precio', p.price ? p.price.toLocaleString('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }) : null],
            ['Superficie', p.size_m2 ? `${p.size_m2} m²` : null],
            ['Habitaciones', p.rooms?.toString()],
            ['Baños', p.bathrooms?.toString()],
          ].map(([label, value]) => value ? (
            <div key={label as string} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${COLORS.border}` }}>
              <span style={{ fontSize: 13, color: COLORS.muted }}>{label}</span>
              <span style={{ fontSize: 13, fontWeight: 500, color: COLORS.text }}>{value}</span>
            </div>
          ) : null)}
        </div>

        <div style={{ backgroundColor: COLORS.surface, borderRadius: 12, padding: 20, border: `1px solid ${COLORS.border}` }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: COLORS.muted, margin: '0 0 14px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Info</h3>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${COLORS.border}` }}>
            <span style={{ fontSize: 13, color: COLORS.muted }}>Lead vinculado</span>
            <span style={{ fontSize: 13, color: COLORS.text }}>{p.lead_id ? `#${p.lead_id}` : 'Ninguno'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${COLORS.border}` }}>
            <span style={{ fontSize: 13, color: COLORS.muted }}>Creado</span>
            <span style={{ fontSize: 13, color: COLORS.text }}>
              {p.created_at ? new Date(p.created_at).toLocaleDateString('es-ES') : '—'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Properties;
