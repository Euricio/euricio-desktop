import React, { useEffect, useState } from 'react';

interface CalendarProps {
  dbPath: string;
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

const PRIORITY_COLORS: Record<string, string> = {
  high: '#ef4444',
  medium: '#f59e0b',
  low: '#6b7280',
};

const DAYS_ES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const MONTHS_ES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

interface TaskItem {
  id: number;
  title: string;
  due_date: string;
  priority: string;
  status: string;
}

interface CallItem {
  id: number;
  lead_name?: string;
  called_at: string;
  outcome: string;
}

interface DayItem {
  type: 'task' | 'call';
  label: string;
  color: string;
}

const Calendar: React.FC<CalendarProps> = ({ dbPath }) => {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth()); // 0-indexed
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [calls, setCalls] = useState<CallItem[]>([]);
  const [selectedDay, setSelectedDay] = useState<number | null>(today.getDate());

  useEffect(() => {
    if (!dbPath) return;
    loadData();
  }, [dbPath]);

  async function loadData() {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const [tasksData, callsData] = await Promise.all([
        invoke<TaskItem[]>('get_tasks', { dbPath }),
        invoke<CallItem[]>('get_call_logs', { dbPath }),
      ]);
      setTasks(tasksData);
      setCalls(callsData);
    } catch (err) {
      console.error('Calendar load error:', err);
    }
  }

  // Build calendar grid
  const firstDay = new Date(year, month, 1);
  // Convert Sunday=0 to Monday=0
  let startDow = firstDay.getDay() - 1;
  if (startDow < 0) startDow = 6;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Map items to day of month
  function getItemsForDay(day: number): DayItem[] {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const items: DayItem[] = [];

    tasks.forEach(t => {
      if (t.due_date && t.due_date.startsWith(dateStr)) {
        items.push({
          type: 'task',
          label: t.title,
          color: PRIORITY_COLORS[t.priority] ?? '#6b7280',
        });
      }
    });

    calls.forEach(c => {
      if (c.called_at && c.called_at.startsWith(dateStr)) {
        items.push({
          type: 'call',
          label: c.lead_name ?? 'Llamada',
          color: c.outcome === 'answered' ? '#059669' : c.outcome === 'missed' ? '#ef4444' : '#6b7280',
        });
      }
    });

    return items;
  }

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  }

  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  }

  const selectedItems = selectedDay ? getItemsForDay(selectedDay) : [];

  // Build grid cells
  const cells: Array<number | null> = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const isToday = (day: number) =>
    day === today.getDate() && month === today.getMonth() && year === today.getFullYear();

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
          display: 'flex',
          alignItems: 'center',
          gap: 16,
        }}
      >
        <h1 style={{ fontSize: 22, fontWeight: 700, color: COLORS.text, margin: 0, flex: 1 }}>Calendario</h1>
        <button onClick={prevMonth} style={{ background: 'none', border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 16 }}>‹</button>
        <span style={{ fontSize: 16, fontWeight: 600, color: COLORS.text, minWidth: 160, textAlign: 'center' }}>
          {MONTHS_ES[month]} {year}
        </span>
        <button onClick={nextMonth} style={{ background: 'none', border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 16 }}>›</button>
        <button
          onClick={() => { setYear(today.getFullYear()); setMonth(today.getMonth()); setSelectedDay(today.getDate()); }}
          style={{ background: 'none', border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontSize: 13, color: COLORS.primary, fontWeight: 600 }}
        >
          Hoy
        </button>
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Calendar grid */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
          {/* Day headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1, marginBottom: 1 }}>
            {DAYS_ES.map(d => (
              <div key={d} style={{ textAlign: 'center', padding: '8px 4px', fontSize: 12, fontWeight: 600, color: COLORS.muted, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {d}
              </div>
            ))}
          </div>
          {/* Weeks */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1 }}>
            {cells.map((day, idx) => {
              if (!day) {
                return <div key={`empty-${idx}`} style={{ minHeight: 80, backgroundColor: 'rgba(0,0,0,0.02)', borderRadius: 4 }} />;
              }
              const items = getItemsForDay(day);
              const isSel = selectedDay === day;
              const todayDay = isToday(day);
              return (
                <div
                  key={day}
                  onClick={() => setSelectedDay(day)}
                  style={{
                    minHeight: 80,
                    backgroundColor: isSel ? '#e8f5ee' : COLORS.surface,
                    borderRadius: 8,
                    padding: '6px 8px',
                    cursor: 'pointer',
                    border: isSel ? `2px solid ${COLORS.primary}` : `1px solid ${COLORS.border}`,
                    transition: 'background-color 0.1s',
                  }}
                >
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: todayDay ? 700 : 500,
                      color: todayDay ? COLORS.primary : COLORS.text,
                      marginBottom: 4,
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      backgroundColor: todayDay ? `${COLORS.accent}60` : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {day}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                    {items.slice(0, 3).map((item, i) => (
                      <div
                        key={i}
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          backgroundColor: item.color,
                        }}
                      />
                    ))}
                    {items.length > 3 && (
                      <span style={{ fontSize: 10, color: COLORS.muted }}>+{items.length - 3}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Side panel */}
        <div
          style={{
            width: 260,
            borderLeft: `1px solid ${COLORS.border}`,
            backgroundColor: COLORS.surface,
            padding: 20,
            overflowY: 'auto',
          }}
        >
          <h3 style={{ fontSize: 15, fontWeight: 600, color: COLORS.text, margin: '0 0 16px' }}>
            {selectedDay ? `${selectedDay} de ${MONTHS_ES[month]}` : 'Selecciona un día'}
          </h3>
          {selectedItems.length === 0 ? (
            <p style={{ color: COLORS.muted, fontSize: 13 }}>Sin eventos</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {selectedItems.map((item, i) => (
                <div
                  key={i}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 8,
                    border: `1px solid ${COLORS.border}`,
                    backgroundColor: COLORS.bg,
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                  }}
                >
                  <div
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      backgroundColor: item.color,
                      marginTop: 3,
                      flexShrink: 0,
                    }}
                  />
                  <div>
                    <div style={{ fontSize: 12, color: COLORS.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 2 }}>
                      {item.type === 'task' ? 'Tarea' : 'Llamada'}
                    </div>
                    <div style={{ fontSize: 13, color: COLORS.text }}>{item.label}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Calendar;
