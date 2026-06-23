import React, { useEffect, useState, useCallback } from 'react';
import Database from '@tauri-apps/plugin-sql';
import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';
import PhoneButton from '../components/PhoneButton';

interface Lead {
  id: number;
  full_name: string;
  email: string | null;
  phone: string | null;
  pipeline_stage: string;
  status: string;
  priority: string;
  warmth: number | null;
  budget: number | null;
  interest_type: string | null;
  location: string | null;
  source: string | null;
  notes: string | null;
  next_action: string | null;
  created_at: string | null;
  updated_at: string | null;
}

interface LeadsProps {
  dbPath: string;
  accessToken: string;
  userId: string;
  onSelectLead: (leadId: number) => void;
}

type PipelineStage =
  | 'all'
  | 'lead'
  | 'contacted'
  | 'qualified'
  | 'proposal'
  | 'closing'
  | 'won'
  | 'lost';

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
  all: 'Alle',
  lead: 'Lead',
  contacted: 'Kontaktiert',
  qualified: 'Qualifiziert',
  proposal: 'Angebot',
  closing: 'Abschluss',
  won: 'Gewonnen',
  lost: 'Verloren',
};

const PRIORITY_COLORS: Record<string, string> = {
  low: '#6b7280',
  medium: '#f59e0b',
  high: '#ef4444',
  urgent: '#dc2626',
};

const PRIORITY_LABELS: Record<string, string> = {
  low: 'Niedrig',
  medium: 'Mittel',
  high: 'Hoch',
  urgent: 'Dringend',
};

const COLORS = {
  bg: '#f5f0e8',
  surface: '#ffffff',
  border: '#e8e2d9',
  text: '#1a1a1a',
  muted: '#6b7280',
  primary: '#1a4731',
  primaryLight: '#2d6a4f',
  accent: '#4ade80',
};

function WarmthStars({ warmth }: { warmth: number | null }) {
  const value = warmth ?? 0;
  return (
    <span style={{ display: 'inline-flex', gap: 1 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          style={{
            fontSize: 10,
            color: i <= value ? '#f59e0b' : '#d1d5db',
          }}
        >
          ★
        </span>
      ))}
    </span>
  );
}

const Leads: React.FC<LeadsProps> = ({ dbPath, accessToken, userId, onSelectLead }) => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filtered, setFiltered] = useState<Lead[]>([]);
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState<PipelineStage>('all');
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [hoveredId, setHoveredId] = useState<number | null>(null);

  const loadLeads = useCallback(async () => {
    try {
      const db = await Database.load(`sqlite:${dbPath}`);
      const rows = await db.select<Lead[]>(
        `SELECT id, full_name, email, phone, pipeline_stage, status, priority,
                warmth, budget, interest_type, location, source, notes, next_action,
                created_at, updated_at
         FROM leads
         WHERE deleted_at IS NULL
         ORDER BY updated_at DESC, id DESC`
      );
      setLeads(rows);
    } catch (err) {
      console.error('loadLeads error:', err);
    } finally {
      setLoading(false);
    }
  }, [dbPath]);

  useEffect(() => {
    loadLeads();

    const unlisten = listen('sync:data-updated', () => {
      loadLeads();
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, [loadLeads]);

  // Filter leads
  useEffect(() => {
    let result = leads;

    if (stageFilter !== 'all') {
      result = result.filter((l) => l.pipeline_stage === stageFilter);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (l) =>
          l.full_name.toLowerCase().includes(q) ||
          (l.email ?? '').toLowerCase().includes(q) ||
          (l.phone ?? '').toLowerCase().includes(q) ||
          (l.location ?? '').toLowerCase().includes(q)
      );
    }

    setFiltered(result);
  }, [leads, search, stageFilter]);

  const handleSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      await invoke('sync_now', { accessToken, userId, dbPath });
      await loadLeads();
    } catch (err) {
      console.error('sync error:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  const stages: PipelineStage[] = [
    'all', 'lead', 'contacted', 'qualified', 'proposal', 'closing', 'won', 'lost',
  ];

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: COLORS.bg,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '24px 28px 0',
          backgroundColor: COLORS.bg,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 20,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1
              style={{
                margin: 0,
                fontSize: 24,
                fontWeight: 700,
                color: COLORS.text,
              }}
            >
              Leads
            </h1>
            <span
              style={{
                backgroundColor: COLORS.primary,
                color: '#ffffff',
                fontSize: 12,
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: 12,
              }}
            >
              {filtered.length}
            </span>
          </div>

          <button
            onClick={handleSync}
            disabled={isSyncing}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              borderRadius: 8,
              border: 'none',
              backgroundColor: COLORS.primary,
              color: '#ffffff',
              fontSize: 13,
              fontWeight: 500,
              cursor: isSyncing ? 'not-allowed' : 'pointer',
              opacity: isSyncing ? 0.7 : 1,
              transition: 'opacity 0.15s ease',
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ animation: isSyncing ? 'spin 1s linear infinite' : 'none' }}
            >
              <polyline points="23 4 23 10 17 10" />
              <polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
            {isSyncing ? 'Syncing…' : 'Synchronisieren'}
          </button>
        </div>

        {/* Search */}
        <div style={{ position: 'relative', marginBottom: 14 }}>
          <svg
            style={{
              position: 'absolute',
              left: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              color: COLORS.muted,
              pointerEvents: 'none',
            }}
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Leads suchen (Name, E-Mail, Telefon, Ort)…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '9px 12px 9px 36px',
              borderRadius: 8,
              border: `1px solid ${COLORS.border}`,
              backgroundColor: COLORS.surface,
              fontSize: 14,
              color: COLORS.text,
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Stage filter pills */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', paddingBottom: 16 }}>
          {stages.map((stage) => {
            const isActive = stageFilter === stage;
            const stageColor = stage === 'all' ? COLORS.primary : STAGE_COLORS[stage];
            return (
              <button
                key={stage}
                onClick={() => setStageFilter(stage)}
                style={{
                  padding: '5px 12px',
                  borderRadius: 20,
                  border: isActive ? 'none' : `1px solid ${COLORS.border}`,
                  backgroundColor: isActive
                    ? stage === 'all'
                      ? COLORS.primary
                      : stageColor
                    : COLORS.surface,
                  color: isActive ? '#ffffff' : COLORS.muted,
                  fontSize: 12,
                  fontWeight: isActive ? 600 : 400,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {STAGE_LABELS[stage]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Lead list */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '0 28px 24px',
        }}
      >
        {loading ? (
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: 200,
              color: COLORS.muted,
              fontSize: 14,
            }}
          >
            Laden…
          </div>
        ) : filtered.length === 0 ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              height: 200,
              color: COLORS.muted,
              gap: 8,
            }}
          >
            <svg
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
            </svg>
            <span>Keine Leads gefunden</span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.map((lead) => (
              <div
                key={lead.id}
                onClick={() => onSelectLead(lead.id)}
                onMouseEnter={() => setHoveredId(lead.id)}
                onMouseLeave={() => setHoveredId(null)}
                style={{
                  backgroundColor: COLORS.surface,
                  border: `1px solid ${hoveredId === lead.id ? COLORS.primary : COLORS.border}`,
                  borderRadius: 10,
                  padding: '14px 16px',
                  cursor: 'pointer',
                  transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
                  boxShadow:
                    hoveredId === lead.id
                      ? '0 2px 8px rgba(26,71,49,0.10)'
                      : '0 1px 3px rgba(0,0,0,0.04)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: 10,
                    marginBottom: 8,
                  }}
                >
                  {/* Name + warmth */}
                  <div>
                    <span
                      style={{
                        fontSize: 15,
                        fontWeight: 600,
                        color: COLORS.text,
                      }}
                    >
                      {lead.full_name}
                    </span>
                    {lead.warmth != null && (
                      <span style={{ marginLeft: 8 }}>
                        <WarmthStars warmth={lead.warmth} />
                      </span>
                    )}
                  </div>

                  {/* Stage badge */}
                  <span
                    style={{
                      padding: '2px 9px',
                      borderRadius: 12,
                      fontSize: 11,
                      fontWeight: 600,
                      backgroundColor:
                        STAGE_COLORS[lead.pipeline_stage] + '1a',
                      color: STAGE_COLORS[lead.pipeline_stage] ?? COLORS.muted,
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                    }}
                  >
                    {STAGE_LABELS[lead.pipeline_stage] ?? lead.pipeline_stage}
                  </span>
                </div>

                {/* Details row */}
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '4px 14px',
                    fontSize: 12,
                    color: COLORS.muted,
                  }}
                >
                  {lead.phone && (
                    <PhoneButton
                      phone={lead.phone}
                      leadId={lead.id}
                      leadName={lead.full_name}
                      userId={userId}
                      dbPath={dbPath}
                      variant="inline"
                    />
                  )}
                  {lead.location && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                        <circle cx="12" cy="10" r="3" />
                      </svg>
                      {lead.location}
                    </span>
                  )}
                  {lead.interest_type && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                        <polyline points="9 22 9 12 15 12 15 22" />
                      </svg>
                      {lead.interest_type === 'buyer' ? 'Käufer' : lead.interest_type === 'seller' ? 'Verkäufer' : lead.interest_type}
                    </span>
                  )}
                  {lead.priority && lead.priority !== 'medium' && (
                    <span
                      style={{
                        color: PRIORITY_COLORS[lead.priority] ?? COLORS.muted,
                        fontWeight: 500,
                      }}
                    >
                      ● {PRIORITY_LABELS[lead.priority] ?? lead.priority}
                    </span>
                  )}
                </div>

                {/* Next action */}
                {lead.next_action && (
                  <div
                    style={{
                      marginTop: 8,
                      padding: '5px 9px',
                      backgroundColor: '#f0fdf4',
                      borderRadius: 6,
                      fontSize: 12,
                      color: COLORS.primaryLight,
                      borderLeft: `3px solid ${COLORS.accent}`,
                    }}
                  >
                    → {lead.next_action}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default Leads;
