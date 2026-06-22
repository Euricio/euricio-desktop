import { useEffect, useState } from 'react';
import Database from '@tauri-apps/plugin-sql';
import { useTranslation } from 'react-i18next';

interface Task {
  id: string;
  title: string;
  priority: string;
  status: string;
  due_date: number | null;
}

const PRIORITY_COLOR: Record<string, string> = {
  high:   '#ef4444',
  medium: '#f59e0b',
  low:    '#22c55e',
};

export function Tasks() {
  const { t }    = useTranslation();
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    Database.load('sqlite:crm.db')
      .then(db => db.select<Task[]>(
        `SELECT id, title, priority, status, due_date
         FROM tasks
         WHERE deleted_at IS NULL
         ORDER BY COALESCE(due_date, 99999999999), priority`
      ))
      .then(setTasks);
  }, []);

  return (
    <div>
      <h1 style={{ margin: '0 0 16px', fontSize: 20, fontWeight: 700 }}>
        {t('app.navigation.tasks')}
      </h1>

      {tasks.length === 0 ? (
        <p style={{ color: '#94a3b8' }}>{t('app.tasks.list_empty')}</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {tasks.map(task => (
            <div key={task.id} style={{
              padding: '12px 16px', background: '#fff',
              borderRadius: 8, border: '1px solid #f1f5f9',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span style={{ fontWeight: 500 }}>{task.title}</span>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{
                  fontSize: 11, fontWeight: 600, color: '#fff',
                  background: PRIORITY_COLOR[task.priority] ?? '#94a3b8',
                  borderRadius: 4, padding: '2px 6px',
                }}>
                  {t(`app.tasks.priority.${task.priority}`)}
                </span>
                <span style={{ fontSize: 12, color: '#64748b' }}>
                  {t(`app.tasks.status.${task.status}`)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
