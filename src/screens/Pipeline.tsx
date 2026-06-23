import React, { useEffect, useState } from 'react';

interface PipelineProps {
  dbPath: string;
  onSelectLead: (id: number) => void;
}

const STAGES = ['lead', 'contacted', 'qualified', 'proposal', 'closing', 'won', 'lost'] as const;

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
};

interface Lead {
  id: number;
  full_name: string;
  pipeline_stage: string;
  budget: number | null;
  location: string | null;
  warmth: number | null;
  phone: string | null;
}

const Pipeline: React.FC<PipelineProps> = ({ dbPath, onSelectLead }) => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!dbPath) return;
    loadLeads();
  }, [dbPath]);

  async function loadLeads() {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const data = await invoke<Lead[]>('get_leads', { dbPath });
      setLeads(data);
    } catch (err) {
      console.error('Pipeline load error:', err);
    } finally {
      setLoading(false);
    }
  }

  const filtered = leads.filter(l =>
    !search || l.full_name.toLowerCase().includes(search.toLowerCase())
  );

  const byStage = (stage: string) => filtered.filter(l => l.pipeline_stage === stage);

  const renderStars = (warmth: number | null) => {
    const w = warmth ?? 0;
    return '★'.repeat(w) + '☆'.repeat(5 - w);
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: COLORS.text, margin: 0 }}>Pipeline</h1>
          <span style={{ fontSize: 13, color: COLORS.muted }}>{filtered.length} leads</span>
        </div>
        <input
          placeholder="Buscar por nombre…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            padding: '8px 14px',
            borderRadius: 8,
            border: `1px solid ${COLORS.border}`,
            fontSize: 14,
            width: 280,
            backgroundColor: COLORS.bg,
            color: COLORS.text,
            outline: 'none',
          }}
        />
      </div>

      {/* Kanban board */}
      {loading ? (
        <div style={{ padding: 40, color: COLORS.muted }}>Cargando…</div>
      ) : (
        <div
          style={{
            flex: 1,
            overflowX: 'auto',
            overflowY: 'hidden',
            padding: '20px 24px',
            display: 'flex',
            gap: 14,
          }}
        >
          {STAGES.map(stage => {
            const stageLeads = byStage(stage);
            return (
              <div
                key={stage}
                style={{
                  width: 220,
                  minWidth: 220,
                  maxWidth: 220,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                  flexShrink: 0,
                }}
              >
                {/* Column header */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 12px',
                    backgroundColor: COLORS.surface,
                    borderRadius: 8,
                    border: `1px solid ${COLORS.border}`,
                  }}
                >
                  <div
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      backgroundColor: STAGE_COLORS[stage],
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ fontWeight: 600, fontSize: 13, color: COLORS.text, flex: 1 }}>
                    {STAGE_LABELS[stage]}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      backgroundColor: `${STAGE_COLORS[stage]}20`,
                      color: STAGE_COLORS[stage],
                      padding: '2px 7px',
                      borderRadius: 20,
                      fontWeight: 700,
                    }}
                  >
                    {stageLeads.length}
                  </span>
                </div>

                {/* Cards */}
                <div
                  style={{
                    flex: 1,
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                    maxHeight: 'calc(100vh - 180px)',
                  }}
                >
                  {stageLeads.map(lead => (
                    <div
                      key={lead.id}
                      onClick={() => onSelectLead(lead.id)}
                      style={{
                        backgroundColor: COLORS.surface,
                        borderRadius: 10,
                        padding: '12px 14px',
                        border: `1px solid ${COLORS.border}`,
                        cursor: 'pointer',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                        transition: 'box-shadow 0.15s, transform 0.1s',
                      }}
                      onMouseEnter={e => {
                        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.12)';
                        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-1px)';
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)';
                        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
                      }}
                    >
                      <div style={{ fontWeight: 600, fontSize: 14, color: COLORS.text, marginBottom: 4 }}>
                        {lead.full_name}
                      </div>
                      {lead.location && (
                        <div style={{ fontSize: 12, color: COLORS.muted, marginBottom: 4 }}>
                          📍 {lead.location}
                        </div>
                      )}
                      {lead.budget && (
                        <div style={{ fontSize: 12, color: '#059669', fontWeight: 600, marginBottom: 4 }}>
                          {lead.budget.toLocaleString('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}
                        </div>
                      )}
                      <div style={{ fontSize: 13, color: '#f59e0b', letterSpacing: 1 }}>
                        {renderStars(lead.warmth)}
                      </div>
                    </div>
                  ))}
                  {stageLeads.length === 0 && (
                    <div
                      style={{
                        textAlign: 'center',
                        padding: '20px 8px',
                        color: COLORS.muted,
                        fontSize: 12,
                        backgroundColor: 'rgba(0,0,0,0.02)',
                        borderRadius: 8,
                        border: `1px dashed ${COLORS.border}`,
                      }}
                    >
                      Sin leads
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Pipeline;
