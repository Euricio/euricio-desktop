import React, { useEffect, useState, useCallback } from 'react';
import Database from '@tauri-apps/plugin-sql';

const generateId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

// ── Types ─────────────────────────────────────────────────────────────────────

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
  personal_notes: string | null;
  next_action: string | null;
  preferred_channel: string | null;
  preferred_language: string | null;
  assigned_to: string | null;
  created_at: string | null;
  updated_at: string | null;
}

interface Task {
  id: number;
  title: string;
  description: string | null;
  due_date: string | null;
  status: string;
  priority: string;
  task_type: string | null;
  completed_at: string | null;
  created_at: string | null;
}

interface Property {
  id: number;
  title: string | null;
  property_type: string | null;
  offer_type: string | null;
  status: string;
  address: string | null;
  city: string | null;
  province: string | null;
  price: number | null;
  size_m2: number | null;
  rooms: number | null;
  bathrooms: number | null;
  created_at: string | null;
}

interface CallLog {
  id: number;
  direction: string | null;
  duration_sec: number | null;
  outcome: string | null;
  notes: string | null;
  called_at: string | null;
  created_by: string | null;
}

// ── Colors ────────────────────────────────────────────────────────────────────

const COLORS = {
  bg: '#f5f0e8',
  surface: '#ffffff',
  border: '#e8e2d9',
  text: '#1a1a1a',
  muted: '#6b7280',
  primary: '#1a4731',
  primaryLight: '#2d6a4f',
  primaryHover: '#153d29',
  accent: '#4ade80',
};

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
  lead: 'Lead',
  contacted: 'Kontaktiert',
  qualified: 'Qualifiziert',
  proposal: 'Angebot',
  closing: 'Abschluss',
  won: 'Gewonnen',
  lost: 'Verloren',
};

type TabId = 'info' | 'tasks' | 'properties' | 'calls';

// ── LeadDetail Component ───────────────────────────────────────────────────────

interface LeadDetailProps {
  leadId: number;
  dbPath: string;
  userId: string;
  onBack: () => void;
}

function formatCurrency(value: number | null): string {
  if (value == null) return '–';
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(iso: string | null): string {
  if (!iso) return '–';
  const d = new Date(iso);
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatDateTime(iso: string | null): string {
  if (!iso) return '–';
  const d = new Date(iso);
  return d.toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function WarmthStars({
  value,
  onChange,
}: {
  value: number | null;
  onChange?: (v: number) => void;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const current = hover ?? value ?? 0;

  return (
    <span style={{ display: 'inline-flex', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          onClick={() => onChange?.(i)}
          onMouseEnter={() => onChange && setHover(i)}
          onMouseLeave={() => onChange && setHover(null)}
          style={{
            fontSize: 20,
            color: i <= current ? '#f59e0b' : '#d1d5db',
            cursor: onChange ? 'pointer' : 'default',
            transition: 'color 0.1s ease',
          }}
        >
          ★
        </span>
      ))}
    </span>
  );
}

// ── Outbox helper ─────────────────────────────────────────────────────────────

async function addToOutbox(
  db: Database,
  tableName: string,
  recordId: string | number,
  operation: string,
  payload: Record<string, unknown>
) {
  const now = new Date().toISOString();
  await db.execute(
    `INSERT INTO outbox (id, table_name, record_id, operation, payload, attempts, created_at)
     VALUES ($1, $2, $3, $4, $5, 0, $6)`,
    [generateId(), tableName, String(recordId), operation, JSON.stringify(payload), now]
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

const LeadDetail: React.FC<LeadDetailProps> = ({ leadId, dbPath, userId, onBack }) => {
  const [lead, setLead] = useState<Lead | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [activeTab, setActiveTab] = useState<TabId>('info');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editLead, setEditLead] = useState<Partial<Lead>>({});

  // New task form
  const [showNewTask, setShowNewTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState('medium');

  // New call log form
  const [showNewCall, setShowNewCall] = useState(false);
  const [newCallDirection, setNewCallDirection] = useState('outbound');
  const [newCallDuration, setNewCallDuration] = useState('');
  const [newCallOutcome, setNewCallOutcome] = useState('');
  const [newCallNotes, setNewCallNotes] = useState('');

  const loadData = useCallback(async () => {
    try {
      const db = await Database.load(`sqlite:${dbPath}`);

      const leadRows = await db.select<Lead[]>(
        `SELECT * FROM leads WHERE id = $1 LIMIT 1`,
        [leadId]
      );
      if (leadRows.length > 0) {
        setLead(leadRows[0]);
        setEditLead(leadRows[0]);
      }

      const taskRows = await db.select<Task[]>(
        `SELECT id, title, description, due_date, status, priority, task_type, completed_at, created_at
         FROM tasks
         WHERE lead_id = $1 AND deleted_at IS NULL
         ORDER BY due_date ASC, created_at DESC`,
        [leadId]
      );
      setTasks(taskRows);

      const propRows = await db.select<Property[]>(
        `SELECT * FROM properties WHERE lead_id = $1 AND deleted_at IS NULL ORDER BY created_at DESC`,
        [leadId]
      );
      setProperties(propRows);

      const callRows = await db.select<CallLog[]>(
        `SELECT * FROM call_logs WHERE lead_id = $1 ORDER BY called_at DESC, created_at DESC`,
        [leadId]
      );
      setCallLogs(callRows);
    } catch (err) {
      console.error('loadData error:', err);
    } finally {
      setLoading(false);
    }
  }, [dbPath, leadId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Save lead changes ───────────────────────────────────────────────────────

  const saveLead = async () => {
    if (!lead) return;
    setSaving(true);
    try {
      const db = await Database.load(`sqlite:${dbPath}`);
      const now = new Date().toISOString();
      await db.execute(
        `UPDATE leads SET
           pipeline_stage = $1, warmth = $2, budget = $3,
           notes = $4, personal_notes = $5, next_action = $6,
           phone = $7, email = $8, location = $9, source = $10,
           interest_type = $11, preferred_channel = $12, preferred_language = $13,
           updated_at = $14, synced = 0
         WHERE id = $15`,
        [
          editLead.pipeline_stage ?? lead.pipeline_stage,
          editLead.warmth ?? lead.warmth,
          editLead.budget ?? lead.budget,
          editLead.notes ?? lead.notes,
          editLead.personal_notes ?? lead.personal_notes,
          editLead.next_action ?? lead.next_action,
          editLead.phone ?? lead.phone,
          editLead.email ?? lead.email,
          editLead.location ?? lead.location,
          editLead.source ?? lead.source,
          editLead.interest_type ?? lead.interest_type,
          editLead.preferred_channel ?? lead.preferred_channel,
          editLead.preferred_language ?? lead.preferred_language,
          now,
          lead.id,
        ]
      );

      // Outbox
      const updatedLead = { ...lead, ...editLead, updated_at: now };
      await addToOutbox(db, 'leads', lead.id, 'upsert', updatedLead as Record<string, unknown>);

      await loadData();
    } catch (err) {
      console.error('saveLead error:', err);
    } finally {
      setSaving(false);
    }
  };

  // ── Create task ─────────────────────────────────────────────────────────────

  const createTask = async () => {
    if (!newTaskTitle.trim()) return;
    try {
      const db = await Database.load(`sqlite:${dbPath}`);
      const now = new Date().toISOString();
      await db.execute(
        `INSERT INTO tasks (title, due_date, status, priority, lead_id, created_by, synced, created_at, updated_at)
         VALUES ($1, $2, 'open', $3, $4, $5, 0, $6, $6)`,
        [newTaskTitle.trim(), newTaskDueDate || null, newTaskPriority, leadId, userId, now]
      );

      // Get last inserted id
      const rows = await db.select<{ id: number }[]>(
        `SELECT id FROM tasks WHERE lead_id = $1 ORDER BY created_at DESC LIMIT 1`,
        [leadId]
      );
      if (rows.length > 0) {
        const taskId = rows[0].id;
        await addToOutbox(db, 'tasks', taskId, 'insert', {
          id: taskId,
          title: newTaskTitle.trim(),
          due_date: newTaskDueDate || null,
          status: 'open',
          priority: newTaskPriority,
          lead_id: leadId,
          created_by: userId,
          created_at: now,
          updated_at: now,
        });
      }

      setNewTaskTitle('');
      setNewTaskDueDate('');
      setNewTaskPriority('medium');
      setShowNewTask(false);
      await loadData();
    } catch (err) {
      console.error('createTask error:', err);
    }
  };

  // ── Complete task ───────────────────────────────────────────────────────────

  const completeTask = async (taskId: number) => {
    try {
      const db = await Database.load(`sqlite:${dbPath}`);
      const now = new Date().toISOString();
      await db.execute(
        `UPDATE tasks SET status = 'done', completed_at = $1, updated_at = $1, synced = 0 WHERE id = $2`,
        [now, taskId]
      );
      await addToOutbox(db, 'tasks', taskId, 'upsert', {
        id: taskId,
        status: 'done',
        completed_at: now,
        updated_at: now,
      });
      await loadData();
    } catch (err) {
      console.error('completeTask error:', err);
    }
  };

  // ── Create call log ─────────────────────────────────────────────────────────

  const createCallLog = async () => {
    try {
      const db = await Database.load(`sqlite:${dbPath}`);
      const now = new Date().toISOString();
      const durSec = newCallDuration ? parseInt(newCallDuration, 10) : null;
      await db.execute(
        `INSERT INTO call_logs (lead_id, direction, duration_sec, outcome, notes, called_at, created_by, synced, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 0, $6)`,
        [leadId, newCallDirection, durSec, newCallOutcome || null, newCallNotes || null, now, userId]
      );

      const rows = await db.select<{ id: number }[]>(
        `SELECT id FROM call_logs WHERE lead_id = $1 ORDER BY created_at DESC LIMIT 1`,
        [leadId]
      );
      if (rows.length > 0) {
        await addToOutbox(db, 'call_logs', rows[0].id, 'insert', {
          id: rows[0].id,
          lead_id: leadId,
          direction: newCallDirection,
          duration_sec: durSec,
          outcome: newCallOutcome || null,
          notes: newCallNotes || null,
          called_at: now,
          created_by: userId,
          created_at: now,
        });
      }

      setNewCallDirection('outbound');
      setNewCallDuration('');
      setNewCallOutcome('');
      setNewCallNotes('');
      setShowNewCall(false);
      await loadData();
    } catch (err) {
      console.error('createCallLog error:', err);
    }
  };

  // ── Render helpers ──────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: COLORS.bg,
          color: COLORS.muted,
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        }}
      >
        Laden…
      </div>
    );
  }

  if (!lead) {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: COLORS.bg,
          color: COLORS.muted,
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        }}
      >
        Lead nicht gefunden.
      </div>
    );
  }

  const tabs: { id: TabId; label: string; count?: number }[] = [
    { id: 'info', label: 'Info' },
    { id: 'tasks', label: 'Aufgaben', count: tasks.filter((t) => t.status !== 'done').length },
    { id: 'properties', label: 'Immobilien', count: properties.length },
    { id: 'calls', label: 'Anrufe', count: callLogs.length },
  ];

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 10px',
    borderRadius: 7,
    border: `1px solid ${COLORS.border}`,
    backgroundColor: COLORS.surface,
    fontSize: 14,
    color: COLORS.text,
    outline: 'none',
    boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 600,
    color: COLORS.muted,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: 4,
    display: 'block',
  };

  const fieldGroupStyle: React.CSSProperties = {
    marginBottom: 16,
  };

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
          padding: '20px 28px 0',
          backgroundColor: COLORS.bg,
          flexShrink: 0,
        }}
      >
        {/* Back button */}
        <button
          onClick={onBack}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: COLORS.primary,
            fontSize: 13,
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '0 0 12px',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Zurück zu Leads
        </button>

        {/* Title row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            marginBottom: 16,
          }}
        >
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: 22,
                fontWeight: 700,
                color: COLORS.text,
              }}
            >
              {lead.full_name}
            </h1>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginTop: 4,
              }}
            >
              <span
                style={{
                  padding: '2px 9px',
                  borderRadius: 12,
                  fontSize: 11,
                  fontWeight: 600,
                  backgroundColor: (STAGE_COLORS[lead.pipeline_stage] ?? '#6b7280') + '1a',
                  color: STAGE_COLORS[lead.pipeline_stage] ?? '#6b7280',
                }}
              >
                {STAGE_LABELS[lead.pipeline_stage] ?? lead.pipeline_stage}
              </span>
              <WarmthStars value={lead.warmth} />
            </div>
          </div>

          <button
            onClick={saveLead}
            disabled={saving}
            style={{
              padding: '9px 18px',
              borderRadius: 8,
              border: 'none',
              backgroundColor: COLORS.primary,
              color: '#ffffff',
              fontSize: 13,
              fontWeight: 600,
              cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? 'Speichern…' : 'Speichern'}
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 2, borderBottom: `1px solid ${COLORS.border}` }}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '9px 16px',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: activeTab === tab.id ? 600 : 400,
                color: activeTab === tab.id ? COLORS.primary : COLORS.muted,
                borderBottom: activeTab === tab.id ? `2px solid ${COLORS.primary}` : '2px solid transparent',
                marginBottom: -1,
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                transition: 'color 0.15s ease',
              }}
            >
              {tab.label}
              {tab.count != null && tab.count > 0 && (
                <span
                  style={{
                    backgroundColor: activeTab === tab.id ? COLORS.primary : '#e5e7eb',
                    color: activeTab === tab.id ? '#fff' : COLORS.muted,
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '0px 5px',
                    borderRadius: 8,
                    minWidth: 16,
                    textAlign: 'center',
                  }}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '20px 28px 28px',
        }}
      >
        {/* ── INFO TAB ────────────────────────────────────────────────────────── */}
        {activeTab === 'info' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            {/* Left column */}
            <div>
              <div style={fieldGroupStyle}>
                <label style={labelStyle}>Pipeline-Stage</label>
                <select
                  value={editLead.pipeline_stage ?? lead.pipeline_stage}
                  onChange={(e) => setEditLead({ ...editLead, pipeline_stage: e.target.value })}
                  style={{ ...inputStyle, appearance: 'auto' }}
                >
                  {Object.entries(STAGE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>

              <div style={fieldGroupStyle}>
                <label style={labelStyle}>Wärme</label>
                <WarmthStars
                  value={editLead.warmth ?? lead.warmth}
                  onChange={(v) => setEditLead({ ...editLead, warmth: v })}
                />
              </div>

              <div style={fieldGroupStyle}>
                <label style={labelStyle}>Telefon</label>
                <input
                  type="text"
                  value={editLead.phone ?? lead.phone ?? ''}
                  onChange={(e) => setEditLead({ ...editLead, phone: e.target.value })}
                  style={inputStyle}
                />
              </div>

              <div style={fieldGroupStyle}>
                <label style={labelStyle}>E-Mail</label>
                <input
                  type="email"
                  value={editLead.email ?? lead.email ?? ''}
                  onChange={(e) => setEditLead({ ...editLead, email: e.target.value })}
                  style={inputStyle}
                />
              </div>

              <div style={fieldGroupStyle}>
                <label style={labelStyle}>Ort / Region</label>
                <input
                  type="text"
                  value={editLead.location ?? lead.location ?? ''}
                  onChange={(e) => setEditLead({ ...editLead, location: e.target.value })}
                  style={inputStyle}
                />
              </div>

              <div style={fieldGroupStyle}>
                <label style={labelStyle}>Quelle</label>
                <input
                  type="text"
                  value={editLead.source ?? lead.source ?? ''}
                  onChange={(e) => setEditLead({ ...editLead, source: e.target.value })}
                  style={inputStyle}
                />
              </div>
            </div>

            {/* Right column */}
            <div>
              <div style={fieldGroupStyle}>
                <label style={labelStyle}>Interesse</label>
                <select
                  value={editLead.interest_type ?? lead.interest_type ?? ''}
                  onChange={(e) => setEditLead({ ...editLead, interest_type: e.target.value })}
                  style={{ ...inputStyle, appearance: 'auto' }}
                >
                  <option value="">– Wählen –</option>
                  <option value="buyer">Käufer</option>
                  <option value="seller">Verkäufer</option>
                </select>
              </div>

              <div style={fieldGroupStyle}>
                <label style={labelStyle}>Budget</label>
                <input
                  type="number"
                  value={editLead.budget ?? lead.budget ?? ''}
                  onChange={(e) =>
                    setEditLead({ ...editLead, budget: e.target.value ? parseFloat(e.target.value) : null })
                  }
                  placeholder="0"
                  style={inputStyle}
                />
              </div>

              <div style={fieldGroupStyle}>
                <label style={labelStyle}>Bevorzugter Kanal</label>
                <select
                  value={editLead.preferred_channel ?? lead.preferred_channel ?? ''}
                  onChange={(e) => setEditLead({ ...editLead, preferred_channel: e.target.value })}
                  style={{ ...inputStyle, appearance: 'auto' }}
                >
                  <option value="">– Wählen –</option>
                  <option value="phone">Telefon</option>
                  <option value="email">E-Mail</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="telegram">Telegram</option>
                </select>
              </div>

              <div style={fieldGroupStyle}>
                <label style={labelStyle}>Sprache</label>
                <select
                  value={editLead.preferred_language ?? lead.preferred_language ?? ''}
                  onChange={(e) => setEditLead({ ...editLead, preferred_language: e.target.value })}
                  style={{ ...inputStyle, appearance: 'auto' }}
                >
                  <option value="">– Wählen –</option>
                  <option value="de">Deutsch</option>
                  <option value="es">Español</option>
                  <option value="en">English</option>
                  <option value="fr">Français</option>
                </select>
              </div>

              <div style={fieldGroupStyle}>
                <label style={labelStyle}>Nächste Aktion</label>
                <input
                  type="text"
                  value={editLead.next_action ?? lead.next_action ?? ''}
                  onChange={(e) => setEditLead({ ...editLead, next_action: e.target.value })}
                  style={inputStyle}
                />
              </div>

              <div>
                <span style={labelStyle}>Erstellt am</span>
                <span style={{ fontSize: 13, color: COLORS.muted }}>{formatDateTime(lead.created_at)}</span>
              </div>
            </div>

            {/* Full-width notes */}
            <div style={{ gridColumn: '1 / -1' }}>
              <div style={fieldGroupStyle}>
                <label style={labelStyle}>Notizen</label>
                <textarea
                  rows={4}
                  value={editLead.notes ?? lead.notes ?? ''}
                  onChange={(e) => setEditLead({ ...editLead, notes: e.target.value })}
                  style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }}
                />
              </div>

              <div style={fieldGroupStyle}>
                <label style={labelStyle}>Persönliche Notizen</label>
                <textarea
                  rows={3}
                  value={editLead.personal_notes ?? lead.personal_notes ?? ''}
                  onChange={(e) => setEditLead({ ...editLead, personal_notes: e.target.value })}
                  style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }}
                  placeholder="Nur für dich sichtbar…"
                />
              </div>
            </div>
          </div>
        )}

        {/* ── TASKS TAB ───────────────────────────────────────────────────────── */}
        {activeTab === 'tasks' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
              <button
                onClick={() => setShowNewTask(!showNewTask)}
                style={{
                  padding: '8px 14px',
                  borderRadius: 8,
                  border: 'none',
                  backgroundColor: COLORS.primary,
                  color: '#fff',
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                + Neue Aufgabe
              </button>
            </div>

            {showNewTask && (
              <div
                style={{
                  backgroundColor: COLORS.surface,
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: 10,
                  padding: 16,
                  marginBottom: 16,
                }}
              >
                <div style={{ ...fieldGroupStyle }}>
                  <label style={labelStyle}>Titel *</label>
                  <input
                    type="text"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    placeholder="Aufgabe beschreiben…"
                    style={inputStyle}
                    autoFocus
                  />
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Fällig am</label>
                    <input
                      type="date"
                      value={newTaskDueDate}
                      onChange={(e) => setNewTaskDueDate(e.target.value)}
                      style={inputStyle}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Priorität</label>
                    <select
                      value={newTaskPriority}
                      onChange={(e) => setNewTaskPriority(e.target.value)}
                      style={{ ...inputStyle, appearance: 'auto' }}
                    >
                      <option value="low">Niedrig</option>
                      <option value="medium">Mittel</option>
                      <option value="high">Hoch</option>
                      <option value="urgent">Dringend</option>
                    </select>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => setShowNewTask(false)}
                    style={{
                      padding: '7px 14px',
                      borderRadius: 7,
                      border: `1px solid ${COLORS.border}`,
                      backgroundColor: COLORS.surface,
                      color: COLORS.muted,
                      cursor: 'pointer',
                      fontSize: 13,
                    }}
                  >
                    Abbrechen
                  </button>
                  <button
                    onClick={createTask}
                    disabled={!newTaskTitle.trim()}
                    style={{
                      padding: '7px 14px',
                      borderRadius: 7,
                      border: 'none',
                      backgroundColor: COLORS.primary,
                      color: '#fff',
                      cursor: newTaskTitle.trim() ? 'pointer' : 'not-allowed',
                      opacity: newTaskTitle.trim() ? 1 : 0.5,
                      fontSize: 13,
                      fontWeight: 500,
                    }}
                  >
                    Erstellen
                  </button>
                </div>
              </div>
            )}

            {tasks.length === 0 ? (
              <p style={{ color: COLORS.muted, fontSize: 14 }}>Keine Aufgaben vorhanden.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    style={{
                      backgroundColor: COLORS.surface,
                      border: `1px solid ${COLORS.border}`,
                      borderRadius: 8,
                      padding: '12px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      opacity: task.status === 'done' ? 0.6 : 1,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={task.status === 'done'}
                      onChange={() => task.status !== 'done' && completeTask(task.id)}
                      style={{ width: 16, height: 16, cursor: 'pointer', flexShrink: 0, accentColor: COLORS.primary }}
                    />
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 500,
                          color: COLORS.text,
                          textDecoration: task.status === 'done' ? 'line-through' : 'none',
                        }}
                      >
                        {task.title}
                      </div>
                      {task.due_date && (
                        <div style={{ fontSize: 12, color: COLORS.muted, marginTop: 2 }}>
                          Fällig: {formatDate(task.due_date)}
                        </div>
                      )}
                    </div>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        padding: '2px 7px',
                        borderRadius: 10,
                        backgroundColor:
                          task.priority === 'high' || task.priority === 'urgent'
                            ? '#fee2e2'
                            : task.priority === 'medium'
                            ? '#fef3c7'
                            : '#f3f4f6',
                        color:
                          task.priority === 'high' || task.priority === 'urgent'
                            ? '#dc2626'
                            : task.priority === 'medium'
                            ? '#d97706'
                            : '#6b7280',
                      }}
                    >
                      {task.priority}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── PROPERTIES TAB ─────────────────────────────────────────────────── */}
        {activeTab === 'properties' && (
          <div>
            {properties.length === 0 ? (
              <p style={{ color: COLORS.muted, fontSize: 14 }}>
                Keine Immobilien verknüpft.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {properties.map((prop) => (
                  <div
                    key={prop.id}
                    style={{
                      backgroundColor: COLORS.surface,
                      border: `1px solid ${COLORS.border}`,
                      borderRadius: 10,
                      padding: '14px 16px',
                    }}
                  >
                    <div
                      style={{
                        fontSize: 15,
                        fontWeight: 600,
                        color: COLORS.text,
                        marginBottom: 6,
                      }}
                    >
                      {prop.title ?? 'Ohne Titel'}
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '4px 16px',
                        fontSize: 13,
                        color: COLORS.muted,
                      }}
                    >
                      {prop.property_type && <span>{prop.property_type}</span>}
                      {prop.offer_type && (
                        <span style={{ textTransform: 'capitalize' }}>{prop.offer_type}</span>
                      )}
                      {prop.city && <span>📍 {prop.city}{prop.province ? `, ${prop.province}` : ''}</span>}
                      {prop.price != null && (
                        <span style={{ fontWeight: 600, color: COLORS.primary }}>
                          {formatCurrency(prop.price)}
                        </span>
                      )}
                      {prop.size_m2 != null && <span>{prop.size_m2} m²</span>}
                      {prop.rooms != null && <span>{prop.rooms} Zi.</span>}
                      {prop.bathrooms != null && <span>{prop.bathrooms} Bad</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── CALLS TAB ───────────────────────────────────────────────────────── */}
        {activeTab === 'calls' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
              <button
                onClick={() => setShowNewCall(!showNewCall)}
                style={{
                  padding: '8px 14px',
                  borderRadius: 8,
                  border: 'none',
                  backgroundColor: COLORS.primary,
                  color: '#fff',
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                + Anruf erfassen
              </button>
            </div>

            {showNewCall && (
              <div
                style={{
                  backgroundColor: COLORS.surface,
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: 10,
                  padding: 16,
                  marginBottom: 16,
                }}
              >
                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ flex: 1, ...fieldGroupStyle }}>
                    <label style={labelStyle}>Richtung</label>
                    <select
                      value={newCallDirection}
                      onChange={(e) => setNewCallDirection(e.target.value)}
                      style={{ ...inputStyle, appearance: 'auto' }}
                    >
                      <option value="outbound">Ausgehend</option>
                      <option value="inbound">Eingehend</option>
                    </select>
                  </div>
                  <div style={{ flex: 1, ...fieldGroupStyle }}>
                    <label style={labelStyle}>Dauer (Sek.)</label>
                    <input
                      type="number"
                      value={newCallDuration}
                      onChange={(e) => setNewCallDuration(e.target.value)}
                      placeholder="z.B. 120"
                      style={inputStyle}
                    />
                  </div>
                </div>
                <div style={fieldGroupStyle}>
                  <label style={labelStyle}>Ergebnis</label>
                  <select
                    value={newCallOutcome}
                    onChange={(e) => setNewCallOutcome(e.target.value)}
                    style={{ ...inputStyle, appearance: 'auto' }}
                  >
                    <option value="">– Wählen –</option>
                    <option value="reached">Erreicht</option>
                    <option value="no_answer">Keine Antwort</option>
                    <option value="voicemail">Mailbox</option>
                    <option value="interested">Interessiert</option>
                    <option value="not_interested">Kein Interesse</option>
                    <option value="callback">Rückruf erbeten</option>
                  </select>
                </div>
                <div style={fieldGroupStyle}>
                  <label style={labelStyle}>Notizen</label>
                  <textarea
                    rows={2}
                    value={newCallNotes}
                    onChange={(e) => setNewCallNotes(e.target.value)}
                    style={{ ...inputStyle, resize: 'vertical' }}
                  />
                </div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => setShowNewCall(false)}
                    style={{
                      padding: '7px 14px',
                      borderRadius: 7,
                      border: `1px solid ${COLORS.border}`,
                      backgroundColor: COLORS.surface,
                      color: COLORS.muted,
                      cursor: 'pointer',
                      fontSize: 13,
                    }}
                  >
                    Abbrechen
                  </button>
                  <button
                    onClick={createCallLog}
                    style={{
                      padding: '7px 14px',
                      borderRadius: 7,
                      border: 'none',
                      backgroundColor: COLORS.primary,
                      color: '#fff',
                      cursor: 'pointer',
                      fontSize: 13,
                      fontWeight: 500,
                    }}
                  >
                    Speichern
                  </button>
                </div>
              </div>
            )}

            {callLogs.length === 0 ? (
              <p style={{ color: COLORS.muted, fontSize: 14 }}>Noch keine Anruf-Logs.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {callLogs.map((call) => (
                  <div
                    key={call.id}
                    style={{
                      backgroundColor: COLORS.surface,
                      border: `1px solid ${COLORS.border}`,
                      borderRadius: 8,
                      padding: '12px 14px',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 4,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color:
                            call.direction === 'inbound' ? '#3b82f6' : COLORS.primary,
                        }}
                      >
                        {call.direction === 'inbound' ? '↙ Eingehend' : '↗ Ausgehend'}
                        {call.duration_sec != null && (
                          <span style={{ fontWeight: 400, color: COLORS.muted, marginLeft: 8 }}>
                            {Math.floor(call.duration_sec / 60)}m {call.duration_sec % 60}s
                          </span>
                        )}
                      </span>
                      <span style={{ fontSize: 12, color: COLORS.muted }}>
                        {formatDateTime(call.called_at)}
                      </span>
                    </div>
                    {call.outcome && (
                      <span
                        style={{
                          display: 'inline-block',
                          fontSize: 11,
                          padding: '1px 7px',
                          borderRadius: 10,
                          backgroundColor: '#f0fdf4',
                          color: COLORS.primaryLight,
                          marginBottom: call.notes ? 6 : 0,
                        }}
                      >
                        {call.outcome}
                      </span>
                    )}
                    {call.notes && (
                      <p
                        style={{
                          margin: 0,
                          fontSize: 13,
                          color: COLORS.muted,
                          lineHeight: 1.5,
                        }}
                      >
                        {call.notes}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default LeadDetail;
