import React, { useEffect, useState, useCallback } from 'react';
import Database from '@tauri-apps/plugin-sql';
import { listen } from '@tauri-apps/api/event';

const generateId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

interface TaskWithLead {
  id: number;
  title: string;
  description: string | null;
  due_date: string | null;
  status: string;
  priority: string;
  task_type: string | null;
  lead_id: number | null;
  lead_name: string | null;
  assigned_to: string | null;
  completed_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

interface TasksProps {
  dbPath: string;
  userId: string;
  onSelectLead?: (leadId: number) => void;
}

type FilterMode = 'open' | 'today' | 'all';

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

const PRIORITY_COLORS: Record<string, { bg: string; text: string }> = {
  low: { bg: '#f3f4f6', text: '#6b7280' },
  medium: { bg: '#fef3c7', text: '#d97706' },
  high: { bg: '#fee2e2', text: '#dc2626' },
  urgent: { bg: '#fce7f3', text: '#be185d' },
};

const PRIORITY_LABELS: Record<string, string> = {
  low: 'Niedrig',
  medium: 'Mittel',
  high: 'Hoch',
  urgent: 'Dringend',
};

function isToday(dateStr: string | null): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function isOverdue(dateStr: string | null): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return d < now;
}

function formatDate(iso: string | null): string {
  if (!iso) return '–';
  const d = new Date(iso);
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

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

const Tasks: React.FC<TasksProps> = ({ dbPath, userId, onSelectLead }) => {
  const [tasks, setTasks] = useState<TaskWithLead[]>([]);
  const [filtered, setFiltered] = useState<TaskWithLead[]>([]);
  const [filterMode, setFilterMode] = useState<FilterMode>('open');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [hoveredId, setHoveredId] = useState<number | null>(null);

  // New task form
  const [showNewTask, setShowNewTask] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [newPriority, setNewPriority] = useState('medium');
  const [newDescription, setNewDescription] = useState('');

  const loadTasks = useCallback(async () => {
    try {
      const db = await Database.load(`sqlite:${dbPath}`);
      const rows = await db.select<TaskWithLead[]>(
        `SELECT t.id, t.title, t.description, t.due_date, t.status, t.priority,
                t.task_type, t.lead_id, l.full_name AS lead_name,
                t.assigned_to, t.completed_at, t.created_at, t.updated_at
         FROM tasks t
         LEFT JOIN leads l ON l.id = t.lead_id
         WHERE t.deleted_at IS NULL
         ORDER BY
           CASE t.priority
             WHEN 'urgent' THEN 1
             WHEN 'high' THEN 2
             WHEN 'medium' THEN 3
             WHEN 'low' THEN 4
             ELSE 5
           END,
           t.due_date ASC NULLS LAST,
           t.created_at DESC`
      );
      setTasks(rows);
    } catch (err) {
      console.error('loadTasks error:', err);
    } finally {
      setLoading(false);
    }
  }, [dbPath]);

  useEffect(() => {
    loadTasks();

    const unlisten = listen('sync:data-updated', () => {
      loadTasks();
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, [loadTasks]);

  useEffect(() => {
    let result = tasks;

    if (filterMode === 'open') {
      result = result.filter((t) => t.status === 'open' || t.status === 'in_progress');
    } else if (filterMode === 'today') {
      result = result.filter(
        (t) =>
          (t.status === 'open' || t.status === 'in_progress') &&
          (isToday(t.due_date) || isOverdue(t.due_date))
      );
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          (t.description ?? '').toLowerCase().includes(q) ||
          (t.lead_name ?? '').toLowerCase().includes(q)
      );
    }

    setFiltered(result);
  }, [tasks, filterMode, search]);

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
      await loadTasks();
    } catch (err) {
      console.error('completeTask error:', err);
    }
  };

  const createTask = async () => {
    if (!newTitle.trim()) return;
    try {
      const db = await Database.load(`sqlite:${dbPath}`);
      const now = new Date().toISOString();
      await db.execute(
        `INSERT INTO tasks (title, description, due_date, status, priority, created_by, synced, created_at, updated_at)
         VALUES ($1, $2, $3, 'open', $4, $5, 0, $6, $6)`,
        [newTitle.trim(), newDescription.trim() || null, newDueDate || null, newPriority, userId, now]
      );

      const rows = await db.select<{ id: number }[]>(
        `SELECT id FROM tasks WHERE created_by = $1 ORDER BY created_at DESC LIMIT 1`,
        [userId]
      );
      if (rows.length > 0) {
        await addToOutbox(db, 'tasks', rows[0].id, 'insert', {
          id: rows[0].id,
          title: newTitle.trim(),
          description: newDescription.trim() || null,
          due_date: newDueDate || null,
          status: 'open',
          priority: newPriority,
          created_by: userId,
          created_at: now,
          updated_at: now,
        });
      }

      setNewTitle('');
      setNewDueDate('');
      setNewPriority('medium');
      setNewDescription('');
      setShowNewTask(false);
      await loadTasks();
    } catch (err) {
      console.error('createTask error:', err);
    }
  };

  const openCount = tasks.filter((t) => t.status === 'open' || t.status === 'in_progress').length;
  const todayCount = tasks.filter(
    (t) =>
      (t.status === 'open' || t.status === 'in_progress') &&
      (isToday(t.due_date) || isOverdue(t.due_date))
  ).length;

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
      <div style={{ padding: '24px 28px 0', flexShrink: 0 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 16,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: COLORS.text }}>
              Aufgaben
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

        {/* Search */}
        <div style={{ position: 'relative', marginBottom: 12 }}>
          <svg
            style={{
              position: 'absolute',
              left: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              color: COLORS.muted,
              pointerEvents: 'none',
            }}
            width="14"
            height="14"
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
            placeholder="Aufgaben suchen…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              ...inputStyle,
              paddingLeft: 34,
            }}
          />
        </div>

        {/* Filter pills */}
        <div style={{ display: 'flex', gap: 6, paddingBottom: 16 }}>
          {(
            [
              { id: 'open', label: 'Offen', count: openCount },
              { id: 'today', label: 'Fällig heute', count: todayCount },
              { id: 'all', label: 'Alle' },
            ] as { id: FilterMode; label: string; count?: number }[]
          ).map((f) => (
            <button
              key={f.id}
              onClick={() => setFilterMode(f.id)}
              style={{
                padding: '5px 12px',
                borderRadius: 20,
                border: filterMode === f.id ? 'none' : `1px solid ${COLORS.border}`,
                backgroundColor: filterMode === f.id ? COLORS.primary : COLORS.surface,
                color: filterMode === f.id ? '#ffffff' : COLORS.muted,
                fontSize: 12,
                fontWeight: filterMode === f.id ? 600 : 400,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              {f.label}
              {f.count != null && f.count > 0 && (
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    backgroundColor:
                      filterMode === f.id ? 'rgba(255,255,255,0.25)' : '#e5e7eb',
                    color: filterMode === f.id ? '#fff' : COLORS.muted,
                    padding: '0 5px',
                    borderRadius: 8,
                  }}
                >
                  {f.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* New task form */}
      {showNewTask && (
        <div
          style={{
            margin: '0 28px 16px',
            backgroundColor: COLORS.surface,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 10,
            padding: 16,
            flexShrink: 0,
          }}
        >
          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>Titel *</label>
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Aufgabe beschreiben…"
              style={inputStyle}
              autoFocus
            />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>Beschreibung</label>
            <textarea
              rows={2}
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }}
            />
          </div>
          <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Fällig am</label>
              <input
                type="date"
                value={newDueDate}
                onChange={(e) => setNewDueDate(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Priorität</label>
              <select
                value={newPriority}
                onChange={(e) => setNewPriority(e.target.value)}
                style={{ ...inputStyle, appearance: 'auto' }}
              >
                <option value="low">Niedrig</option>
                <option value="medium">Mittel</option>
                <option value="high">Hoch</option>
                <option value="urgent">Dringend</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button
              onClick={() => {
                setShowNewTask(false);
                setNewTitle('');
                setNewDescription('');
                setNewDueDate('');
                setNewPriority('medium');
              }}
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
              disabled={!newTitle.trim()}
              style={{
                padding: '7px 14px',
                borderRadius: 7,
                border: 'none',
                backgroundColor: COLORS.primary,
                color: '#fff',
                cursor: newTitle.trim() ? 'pointer' : 'not-allowed',
                opacity: newTitle.trim() ? 1 : 0.5,
                fontSize: 13,
                fontWeight: 500,
              }}
            >
              Erstellen
            </button>
          </div>
        </div>
      )}

      {/* Task list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 28px 24px' }}>
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
              height: 180,
              color: COLORS.muted,
              gap: 8,
            }}
          >
            <svg
              width="36"
              height="36"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M9 11l3 3L22 4" />
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
            </svg>
            <span>Keine Aufgaben vorhanden</span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filtered.map((task) => {
              const overdue =
                task.status !== 'done' && isOverdue(task.due_date) && !isToday(task.due_date);
              const dueToday = task.status !== 'done' && isToday(task.due_date);
              const prioStyle = PRIORITY_COLORS[task.priority] ?? PRIORITY_COLORS.medium;

              return (
                <div
                  key={task.id}
                  onMouseEnter={() => setHoveredId(task.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  style={{
                    backgroundColor: COLORS.surface,
                    border: `1px solid ${
                      overdue
                        ? '#fca5a5'
                        : hoveredId === task.id
                        ? COLORS.primary
                        : COLORS.border
                    }`,
                    borderRadius: 10,
                    padding: '13px 15px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 12,
                    opacity: task.status === 'done' ? 0.55 : 1,
                    transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
                    boxShadow:
                      hoveredId === task.id
                        ? '0 2px 8px rgba(26,71,49,0.08)'
                        : '0 1px 3px rgba(0,0,0,0.04)',
                  }}
                >
                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    checked={task.status === 'done'}
                    onChange={() => task.status !== 'done' && completeTask(task.id)}
                    style={{
                      width: 17,
                      height: 17,
                      cursor: task.status !== 'done' ? 'pointer' : 'default',
                      marginTop: 1,
                      flexShrink: 0,
                      accentColor: COLORS.primary,
                    }}
                  />

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 500,
                        color: COLORS.text,
                        textDecoration: task.status === 'done' ? 'line-through' : 'none',
                        marginBottom: 3,
                      }}
                    >
                      {task.title}
                    </div>
                    {task.description && (
                      <div
                        style={{
                          fontSize: 12,
                          color: COLORS.muted,
                          marginBottom: 4,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {task.description}
                      </div>
                    )}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px 10px', fontSize: 12 }}>
                      {task.due_date && (
                        <span
                          style={{
                            color: overdue
                              ? '#ef4444'
                              : dueToday
                              ? '#f59e0b'
                              : COLORS.muted,
                            fontWeight: overdue || dueToday ? 600 : 400,
                          }}
                        >
                          {overdue ? '⚠ Überfällig: ' : dueToday ? '● Heute: ' : ''}
                          {formatDate(task.due_date)}
                        </span>
                      )}
                      {task.lead_name && onSelectLead && task.lead_id != null && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectLead(task.lead_id!);
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            padding: 0,
                            cursor: 'pointer',
                            color: COLORS.primaryLight,
                            fontSize: 12,
                            fontWeight: 500,
                            textDecoration: 'underline',
                          }}
                        >
                          {task.lead_name}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Priority badge */}
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      padding: '2px 8px',
                      borderRadius: 10,
                      backgroundColor: prioStyle.bg,
                      color: prioStyle.text,
                      flexShrink: 0,
                    }}
                  >
                    {PRIORITY_LABELS[task.priority] ?? task.priority}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Tasks;
