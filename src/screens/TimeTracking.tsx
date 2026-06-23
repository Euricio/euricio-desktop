import React, { useEffect, useState, useRef, useCallback } from 'react';
import Database from '@tauri-apps/plugin-sql';

const generateId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

interface TimeEntry {
  id: number;
  user_id: string | null;
  date: string | null;
  start_time: string | null;
  end_time: string | null;
  started_at: string | null;
  ended_at: string | null;
  activity: string | null;
  status: string;
  note: string | null;
  duration_minutes: number | null;
  total_hours: number | null;
  break_mode: string | null;
  category_id: string | null;
  created_at: string | null;
}

interface TimeTrackingProps {
  dbPath: string;
  userId: string;
}

const COLORS = {
  bg: '#f5f0e8',
  surface: '#ffffff',
  border: '#e8e2d9',
  text: '#1a1a1a',
  muted: '#6b7280',
  primary: '#1a4731',
  primaryLight: '#2d6a4f',
  accent: '#4ade80',
  error: '#ef4444',
};

function padTwo(n: number): string {
  return String(n).padStart(2, '0');
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${padTwo(h)}:${padTwo(m)}:${padTwo(s)}`;
}

function formatMinutes(minutes: number | null): string {
  if (minutes == null || minutes === 0) return '–';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} Min.`;
  if (m === 0) return `${h} Std.`;
  return `${h} Std. ${m} Min.`;
}

function getTodayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${padTwo(d.getMonth() + 1)}-${padTwo(d.getDate())}`;
}

function formatTime(iso: string | null): string {
  if (!iso) return '–';
  const d = new Date(iso);
  return `${padTwo(d.getHours())}:${padTwo(d.getMinutes())}`;
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

const TimeTracking: React.FC<TimeTrackingProps> = ({ dbPath, userId }) => {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Timer state
  const [activeEntry, setActiveEntry] = useState<TimeEntry | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // New entry form
  const [showForm, setShowForm] = useState(false);
  const [activity, setActivity] = useState('');
  const [note, setNote] = useState('');
  const [breakMode, setBreakMode] = useState('');

  // Summary
  const [totalMinutesToday, setTotalMinutesToday] = useState(0);
  const [breakMinutesToday, setBreakMinutesToday] = useState(0);

  const loadEntries = useCallback(async () => {
    try {
      const db = await Database.load(`sqlite:${dbPath}`);
      const today = getTodayStr();
      const rows = await db.select<TimeEntry[]>(
        `SELECT * FROM time_entries
         WHERE user_id = $1 AND (date = $2 OR (date IS NULL AND DATE(created_at) = $2))
         ORDER BY created_at DESC`,
        [userId, today]
      );
      setEntries(rows);

      // Find active entry (no ended_at)
      const running = rows.find((e) => e.status === 'active' && !e.ended_at);
      if (running) {
        setActiveEntry(running);
        if (running.started_at) {
          const diff = Math.floor((Date.now() - new Date(running.started_at).getTime()) / 1000);
          setElapsedSeconds(Math.max(0, diff));
        }
      } else {
        setActiveEntry(null);
      }

      // Calculate today's totals
      const completed = rows.filter((e) => e.ended_at && e.duration_minutes != null);
      const totalWork = completed
        .filter((e) => !e.break_mode)
        .reduce((acc, e) => acc + (e.duration_minutes ?? 0), 0);
      const totalBreak = completed
        .filter((e) => !!e.break_mode)
        .reduce((acc, e) => acc + (e.duration_minutes ?? 0), 0);

      setTotalMinutesToday(totalWork);
      setBreakMinutesToday(totalBreak);
    } catch (err) {
      console.error('loadEntries error:', err);
    } finally {
      setLoading(false);
    }
  }, [dbPath, userId]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  // Timer tick
  useEffect(() => {
    if (activeEntry) {
      timerRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [activeEntry]);

  const startTimer = async () => {
    if (activeEntry) return;
    try {
      const db = await Database.load(`sqlite:${dbPath}`);
      const now = new Date();
      const nowIso = now.toISOString();
      const today = getTodayStr();
      const startTime = `${padTwo(now.getHours())}:${padTwo(now.getMinutes())}`;

      await db.execute(
        `INSERT INTO time_entries (user_id, date, start_time, started_at, activity, status, note, break_mode, synced, created_at)
         VALUES ($1, $2, $3, $4, $5, 'active', $6, $7, 0, $4)`,
        [
          userId,
          today,
          startTime,
          nowIso,
          activity.trim() || 'Arbeit',
          note.trim() || null,
          breakMode || null,
        ]
      );

      setElapsedSeconds(0);
      setShowForm(false);
      await loadEntries();
    } catch (err) {
      console.error('startTimer error:', err);
    }
  };

  const stopTimer = async () => {
    if (!activeEntry) return;
    try {
      const db = await Database.load(`sqlite:${dbPath}`);
      const now = new Date();
      const nowIso = now.toISOString();
      const endTime = `${padTwo(now.getHours())}:${padTwo(now.getMinutes())}`;
      const durationMinutes = Math.floor(elapsedSeconds / 60);
      const totalHours = parseFloat((durationMinutes / 60).toFixed(2));

      await db.execute(
        `UPDATE time_entries
         SET status = 'completed', ended_at = $1, end_time = $2,
             duration_minutes = $3, total_hours = $4, synced = 0
         WHERE id = $5`,
        [nowIso, endTime, durationMinutes, totalHours, activeEntry.id]
      );

      const updatedEntry = {
        ...activeEntry,
        status: 'completed',
        ended_at: nowIso,
        end_time: endTime,
        duration_minutes: durationMinutes,
        total_hours: totalHours,
      };
      await addToOutbox(db, 'time_entries', activeEntry.id, 'upsert', updatedEntry as unknown as Record<string, unknown>);

      setActiveEntry(null);
      setElapsedSeconds(0);
      await loadEntries();
    } catch (err) {
      console.error('stopTimer error:', err);
    }
  };

  const addManualEntry = async (
    manualActivity: string,
    manualNote: string,
    startIso: string,
    endIso: string,
    isBreak: boolean
  ) => {
    try {
      const db = await Database.load(`sqlite:${dbPath}`);
      const start = new Date(startIso);
      const end = new Date(endIso);
      const durationMin = Math.floor((end.getTime() - start.getTime()) / 60000);
      const totalH = parseFloat((durationMin / 60).toFixed(2));
      const today = getTodayStr();
      const startTime = `${padTwo(start.getHours())}:${padTwo(start.getMinutes())}`;
      const endTime = `${padTwo(end.getHours())}:${padTwo(end.getMinutes())}`;
      const nowIso = new Date().toISOString();

      await db.execute(
        `INSERT INTO time_entries (user_id, date, start_time, end_time, started_at, ended_at, activity, status, note, duration_minutes, total_hours, break_mode, synced, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'completed', $8, $9, $10, $11, 0, $12)`,
        [
          userId,
          today,
          startTime,
          endTime,
          startIso,
          endIso,
          manualActivity.trim() || 'Arbeit',
          manualNote.trim() || null,
          durationMin,
          totalH,
          isBreak ? 'break' : null,
          nowIso,
        ]
      );

      const rows = await db.select<{ id: number }[]>(
        `SELECT id FROM time_entries WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
        [userId]
      );
      if (rows.length > 0) {
        await addToOutbox(db, 'time_entries', rows[0].id, 'insert', {
          id: rows[0].id,
          user_id: userId,
          date: today,
          start_time: startTime,
          end_time: endTime,
          started_at: startIso,
          ended_at: endIso,
          activity: manualActivity.trim() || 'Arbeit',
          status: 'completed',
          note: manualNote.trim() || null,
          duration_minutes: durationMin,
          total_hours: totalH,
          break_mode: isBreak ? 'break' : null,
          created_at: nowIso,
        });
      }

      await loadEntries();
    } catch (err) {
      console.error('addManualEntry error:', err);
    }
  };

  // ── Quick Manual Entry State ────────────────────────────────────────────────
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualActivity, setManualActivity] = useState('');
  const [manualNote, setManualNote] = useState('');
  const [manualStart, setManualStart] = useState('');
  const [manualEnd, setManualEnd] = useState('');
  const [manualIsBreak, setManualIsBreak] = useState(false);

  const handleManualSubmit = async () => {
    if (!manualStart || !manualEnd) return;
    const today = getTodayStr();
    const startIso = `${today}T${manualStart}:00`;
    const endIso = `${today}T${manualEnd}:00`;
    await addManualEntry(manualActivity, manualNote, startIso, endIso, manualIsBreak);
    setManualActivity('');
    setManualNote('');
    setManualStart('');
    setManualEnd('');
    setManualIsBreak(false);
    setShowManualForm(false);
  };

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

  const isRunning = !!activeEntry;

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
        <h1 style={{ margin: '0 0 20px', fontSize: 24, fontWeight: 700, color: COLORS.text }}>
          Zeiterfassung
        </h1>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 28px 28px' }}>

        {/* ── Timer Card ──────────────────────────────────────────────────────── */}
        <div
          style={{
            backgroundColor: COLORS.surface,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 14,
            padding: '28px 24px',
            marginBottom: 20,
            textAlign: 'center',
          }}
        >
          {/* Elapsed time display */}
          <div
            style={{
              fontSize: 56,
              fontWeight: 700,
              color: isRunning ? COLORS.primary : COLORS.muted,
              fontVariantNumeric: 'tabular-nums',
              letterSpacing: '-2px',
              marginBottom: 8,
              transition: 'color 0.3s ease',
            }}
          >
            {formatDuration(elapsedSeconds)}
          </div>

          {/* Active activity label */}
          {isRunning && activeEntry?.activity && (
            <div
              style={{
                fontSize: 14,
                color: COLORS.primaryLight,
                fontWeight: 500,
                marginBottom: 20,
              }}
            >
              {activeEntry.activity}
              {activeEntry.break_mode && (
                <span
                  style={{
                    marginLeft: 8,
                    fontSize: 11,
                    backgroundColor: '#fef3c7',
                    color: '#d97706',
                    padding: '1px 7px',
                    borderRadius: 8,
                  }}
                >
                  Pause
                </span>
              )}
            </div>
          )}

          {!isRunning && !showForm && (
            <div style={{ marginBottom: 20 }}>
              <input
                type="text"
                placeholder="Aktivität (z.B. Kundengespräch)…"
                value={activity}
                onChange={(e) => setActivity(e.target.value)}
                style={{
                  ...inputStyle,
                  textAlign: 'center',
                  fontSize: 15,
                  marginBottom: 8,
                }}
              />
              <input
                type="text"
                placeholder="Notiz (optional)…"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                style={{
                  ...inputStyle,
                  textAlign: 'center',
                  fontSize: 13,
                  marginBottom: 8,
                }}
              />
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  fontSize: 13,
                  color: COLORS.muted,
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={breakMode === 'break'}
                  onChange={(e) => setBreakMode(e.target.checked ? 'break' : '')}
                  style={{ accentColor: COLORS.primary }}
                />
                Als Pause erfassen
              </label>
            </div>
          )}

          {/* Start / Stop button */}
          <button
            onClick={isRunning ? stopTimer : startTimer}
            style={{
              width: 120,
              height: 120,
              borderRadius: '50%',
              border: 'none',
              backgroundColor: isRunning ? '#ef4444' : COLORS.primary,
              color: '#ffffff',
              fontSize: 16,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              boxShadow: isRunning
                ? '0 4px 20px rgba(239,68,68,0.35)'
                : '0 4px 20px rgba(26,71,49,0.30)',
              transition: 'background-color 0.2s ease, box-shadow 0.2s ease, transform 0.1s ease',
              transform: 'scale(1)',
            }}
            onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.95)')}
            onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          >
            {isRunning ? (
              <>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="4" width="4" height="16" />
                  <rect x="14" y="4" width="4" height="16" />
                </svg>
                Stop
              </>
            ) : (
              <>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="5,3 19,12 5,21" />
                </svg>
                Start
              </>
            )}
          </button>
        </div>

        {/* ── Today Summary ────────────────────────────────────────────────────── */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 12,
            marginBottom: 20,
          }}
        >
          <div
            style={{
              backgroundColor: COLORS.surface,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 10,
              padding: '16px 18px',
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 600, color: COLORS.muted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>
              Gearbeitet heute
            </div>
            <div style={{ fontSize: 26, fontWeight: 700, color: COLORS.primary }}>
              {totalMinutesToday > 0
                ? `${Math.floor(totalMinutesToday / 60)}h ${totalMinutesToday % 60}m`
                : '–'}
            </div>
          </div>

          <div
            style={{
              backgroundColor: COLORS.surface,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 10,
              padding: '16px 18px',
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 600, color: COLORS.muted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>
              Pausen heute
            </div>
            <div style={{ fontSize: 26, fontWeight: 700, color: COLORS.muted }}>
              {breakMinutesToday > 0
                ? `${Math.floor(breakMinutesToday / 60)}h ${breakMinutesToday % 60}m`
                : '–'}
            </div>
          </div>
        </div>

        {/* ── Manual entry button ─────────────────────────────────────────────── */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
          <button
            onClick={() => setShowManualForm(!showManualForm)}
            style={{
              padding: '7px 13px',
              borderRadius: 7,
              border: `1px solid ${COLORS.border}`,
              backgroundColor: COLORS.surface,
              color: COLORS.primary,
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            + Manuell hinzufügen
          </button>
        </div>

        {/* Manual entry form */}
        {showManualForm && (
          <div
            style={{
              backgroundColor: COLORS.surface,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 10,
              padding: 16,
              marginBottom: 16,
            }}
          >
            <div style={{ marginBottom: 10 }}>
              <label style={labelStyle}>Aktivität</label>
              <input
                type="text"
                value={manualActivity}
                onChange={(e) => setManualActivity(e.target.value)}
                placeholder="z.B. Kundengespräch"
                style={inputStyle}
              />
            </div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Von</label>
                <input
                  type="time"
                  value={manualStart}
                  onChange={(e) => setManualStart(e.target.value)}
                  style={inputStyle}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Bis</label>
                <input
                  type="time"
                  value={manualEnd}
                  onChange={(e) => setManualEnd(e.target.value)}
                  style={inputStyle}
                />
              </div>
            </div>
            <div style={{ marginBottom: 10 }}>
              <label style={labelStyle}>Notiz</label>
              <input
                type="text"
                value={manualNote}
                onChange={(e) => setManualNote(e.target.value)}
                style={inputStyle}
              />
            </div>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 13,
                color: COLORS.muted,
                cursor: 'pointer',
                marginBottom: 12,
              }}
            >
              <input
                type="checkbox"
                checked={manualIsBreak}
                onChange={(e) => setManualIsBreak(e.target.checked)}
                style={{ accentColor: COLORS.primary }}
              />
              Als Pause erfassen
            </label>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowManualForm(false)}
                style={{
                  padding: '7px 13px',
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
                onClick={handleManualSubmit}
                disabled={!manualStart || !manualEnd}
                style={{
                  padding: '7px 13px',
                  borderRadius: 7,
                  border: 'none',
                  backgroundColor: COLORS.primary,
                  color: '#fff',
                  cursor: manualStart && manualEnd ? 'pointer' : 'not-allowed',
                  opacity: manualStart && manualEnd ? 1 : 0.5,
                  fontSize: 13,
                  fontWeight: 500,
                }}
              >
                Hinzufügen
              </button>
            </div>
          </div>
        )}

        {/* ── Today entries list ───────────────────────────────────────────────── */}
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: COLORS.muted,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            marginBottom: 10,
          }}
        >
          Heutige Einträge ({entries.length})
        </div>

        {loading ? (
          <div style={{ color: COLORS.muted, fontSize: 14 }}>Laden…</div>
        ) : entries.length === 0 ? (
          <div
            style={{
              color: COLORS.muted,
              fontSize: 14,
              textAlign: 'center',
              padding: '24px 0',
            }}
          >
            Noch keine Einträge für heute.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {entries.map((entry) => (
              <div
                key={entry.id}
                style={{
                  backgroundColor: COLORS.surface,
                  border: `1px solid ${entry.status === 'active' ? COLORS.primary : COLORS.border}`,
                  borderRadius: 8,
                  padding: '11px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                {/* Status dot */}
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    backgroundColor:
                      entry.status === 'active'
                        ? '#10b981'
                        : entry.break_mode
                        ? '#f59e0b'
                        : COLORS.primary,
                    flexShrink: 0,
                  }}
                />

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: COLORS.text }}>
                    {entry.activity ?? 'Arbeit'}
                    {entry.break_mode && (
                      <span
                        style={{
                          marginLeft: 6,
                          fontSize: 11,
                          backgroundColor: '#fef3c7',
                          color: '#d97706',
                          padding: '1px 6px',
                          borderRadius: 7,
                        }}
                      >
                        Pause
                      </span>
                    )}
                    {entry.status === 'active' && (
                      <span
                        style={{
                          marginLeft: 6,
                          fontSize: 11,
                          backgroundColor: '#d1fae5',
                          color: '#059669',
                          padding: '1px 6px',
                          borderRadius: 7,
                        }}
                      >
                        Läuft
                      </span>
                    )}
                  </div>
                  {entry.note && (
                    <div style={{ fontSize: 12, color: COLORS.muted, marginTop: 1 }}>
                      {entry.note}
                    </div>
                  )}
                  <div style={{ fontSize: 12, color: COLORS.muted, marginTop: 2 }}>
                    {formatTime(entry.started_at)}
                    {entry.ended_at && ` – ${formatTime(entry.ended_at)}`}
                  </div>
                </div>

                {/* Duration */}
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: COLORS.primary,
                    flexShrink: 0,
                  }}
                >
                  {entry.status === 'active'
                    ? '…'
                    : formatMinutes(entry.duration_minutes)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TimeTracking;
