import React, { useState, useEffect } from 'react';

const COLORS = {
  bg: '#f5f0e8',
  surface: '#ffffff',
  border: '#e8e2d9',
  text: '#1a1a1a',
  muted: '#6b7280',
  primary: '#1a4731',
  accent: '#4ade80',
};

interface AmortRow {
  month: number;
  cuota: number;
  interes: number;
  capital: number;
  pendiente: number;
}

const Calculadora: React.FC = () => {
  const [precio, setPrecio] = useState('300000');
  const [entrada, setEntrada] = useState('20');
  const [interes, setInteres] = useState('3.5');
  const [plazo, setPlazo] = useState('30');
  const [result, setResult] = useState<{
    cuotaMensual: number;
    totalIntereses: number;
    totalPagar: number;
    capitalFinanciado: number;
    amortTable: AmortRow[];
  } | null>(null);

  useEffect(() => {
    calculate();
  }, [precio, entrada, interes, plazo]);

  function calculate() {
    const P = parseFloat(precio) || 0;
    const e = parseFloat(entrada) || 0;
    const r = parseFloat(interes) || 0;
    const n = parseInt(plazo) || 0;

    if (P <= 0 || n <= 0) { setResult(null); return; }

    const capital = P * (1 - e / 100);
    const monthlyRate = r / 100 / 12;
    const months = n * 12;

    let cuota: number;
    if (monthlyRate === 0) {
      cuota = capital / months;
    } else {
      cuota = capital * monthlyRate * Math.pow(1 + monthlyRate, months) / (Math.pow(1 + monthlyRate, months) - 1);
    }

    const totalPagar = cuota * months;
    const totalIntereses = totalPagar - capital;

    // Amortization table (first 12 months)
    const table: AmortRow[] = [];
    let pending = capital;
    for (let m = 1; m <= Math.min(12, months); m++) {
      const int = pending * monthlyRate;
      const cap = cuota - int;
      pending -= cap;
      table.push({
        month: m,
        cuota,
        interes: int,
        capital: cap,
        pendiente: Math.max(0, pending),
      });
    }

    setResult({ cuotaMensual: cuota, totalIntereses, totalPagar, capitalFinanciado: capital, amortTable: table });
  }

  const fmt = (n: number) => n.toLocaleString('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
  const fmt2 = (n: number) => n.toLocaleString('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 });

  const inputStyle: React.CSSProperties = {
    padding: '10px 14px',
    borderRadius: 8,
    border: `1px solid ${COLORS.border}`,
    fontSize: 15,
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
        overflowY: 'auto',
        backgroundColor: COLORS.bg,
        padding: 28,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <h1 style={{ fontSize: 24, fontWeight: 700, color: COLORS.text, margin: '0 0 6px' }}>
        Calculadora Hipotecaria
      </h1>
      <p style={{ color: COLORS.muted, fontSize: 14, margin: '0 0 28px' }}>
        Calcula la cuota mensual y el coste total de una hipoteca.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* Inputs */}
        <div style={{ backgroundColor: COLORS.surface, borderRadius: 14, padding: 28, border: `1px solid ${COLORS.border}` }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: COLORS.text, margin: '0 0 20px' }}>Datos del préstamo</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: COLORS.muted, display: 'block', marginBottom: 6 }}>
                Precio de compra (€)
              </label>
              <input type="number" value={precio} onChange={e => setPrecio(e.target.value)} style={inputStyle} placeholder="300000" />
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: COLORS.muted, display: 'block', marginBottom: 6 }}>
                Entrada (%)
              </label>
              <input type="number" value={entrada} onChange={e => setEntrada(e.target.value)} style={inputStyle} placeholder="20" min="0" max="100" />
              {result && (
                <div style={{ fontSize: 12, color: COLORS.muted, marginTop: 4 }}>
                  = {fmt(parseFloat(precio) * (parseFloat(entrada) / 100))} de entrada
                </div>
              )}
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: COLORS.muted, display: 'block', marginBottom: 6 }}>
                Tipo de interés anual (%)
              </label>
              <input type="number" value={interes} onChange={e => setInteres(e.target.value)} style={inputStyle} placeholder="3.5" step="0.1" min="0" />
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: COLORS.muted, display: 'block', marginBottom: 6 }}>
                Plazo (años)
              </label>
              <input type="number" value={plazo} onChange={e => setPlazo(e.target.value)} style={inputStyle} placeholder="30" min="1" max="50" />
            </div>
          </div>
        </div>

        {/* Results */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {result ? (
            <>
              {/* KPI cards */}
              {[
                { label: 'Cuota Mensual', value: fmt2(result.cuotaMensual), color: COLORS.primary, big: true },
                { label: 'Capital Financiado', value: fmt(result.capitalFinanciado), color: COLORS.text, big: false },
                { label: 'Total Intereses', value: fmt(result.totalIntereses), color: '#ef4444', big: false },
                { label: 'Total a Pagar', value: fmt(result.totalPagar), color: COLORS.text, big: false },
              ].map(card => (
                <div
                  key={card.label}
                  style={{
                    backgroundColor: COLORS.surface,
                    borderRadius: 12,
                    padding: '16px 20px',
                    border: `1px solid ${COLORS.border}`,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span style={{ fontSize: 14, color: COLORS.muted }}>{card.label}</span>
                  <span style={{ fontSize: card.big ? 24 : 18, fontWeight: 700, color: card.color }}>{card.value}</span>
                </div>
              ))}

              {/* Visual bar: capital vs interest */}
              <div style={{ backgroundColor: COLORS.surface, borderRadius: 12, padding: '16px 20px', border: `1px solid ${COLORS.border}` }}>
                <div style={{ fontSize: 13, color: COLORS.muted, marginBottom: 8 }}>Distribución del total</div>
                <div style={{ display: 'flex', height: 20, borderRadius: 10, overflow: 'hidden', marginBottom: 8 }}>
                  <div style={{ flex: result.capitalFinanciado, backgroundColor: COLORS.primary }} />
                  <div style={{ flex: result.totalIntereses, backgroundColor: '#ef4444' }} />
                </div>
                <div style={{ display: 'flex', gap: 16, fontSize: 12 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: COLORS.primary, display: 'inline-block' }} />
                    Capital ({Math.round(result.capitalFinanciado / result.totalPagar * 100)}%)
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: '#ef4444', display: 'inline-block' }} />
                    Intereses ({Math.round(result.totalIntereses / result.totalPagar * 100)}%)
                  </span>
                </div>
              </div>
            </>
          ) : (
            <div style={{ backgroundColor: COLORS.surface, borderRadius: 14, padding: 40, textAlign: 'center', border: `1px solid ${COLORS.border}`, color: COLORS.muted, fontSize: 14 }}>
              Introduce los datos para calcular
            </div>
          )}
        </div>
      </div>

      {/* Amortization table */}
      {result && result.amortTable.length > 0 && (
        <div style={{ marginTop: 28, backgroundColor: COLORS.surface, borderRadius: 14, padding: 24, border: `1px solid ${COLORS.border}` }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: COLORS.text, margin: '0 0 16px' }}>
            Tabla de amortización (primeros 12 meses)
          </h2>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Mes', 'Cuota', 'Interés', 'Capital', 'Pendiente'].map(h => (
                  <th key={h} style={{ textAlign: 'right', padding: '8px 14px', fontSize: 12, fontWeight: 600, color: COLORS.muted, textTransform: 'uppercase', borderBottom: `2px solid ${COLORS.border}` }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {result.amortTable.map((row, i) => (
                <tr key={row.month} style={{ backgroundColor: i % 2 === 0 ? 'transparent' : COLORS.bg }}>
                  <td style={{ padding: '9px 14px', textAlign: 'right', fontSize: 13, color: COLORS.muted }}>{row.month}</td>
                  <td style={{ padding: '9px 14px', textAlign: 'right', fontSize: 13, fontWeight: 600, color: COLORS.text }}>{fmt2(row.cuota)}</td>
                  <td style={{ padding: '9px 14px', textAlign: 'right', fontSize: 13, color: '#ef4444' }}>{fmt2(row.interes)}</td>
                  <td style={{ padding: '9px 14px', textAlign: 'right', fontSize: 13, color: '#059669' }}>{fmt2(row.capital)}</td>
                  <td style={{ padding: '9px 14px', textAlign: 'right', fontSize: 13, color: COLORS.text }}>{fmt(row.pendiente)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Calculadora;
