import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Database from '@tauri-apps/plugin-sql';
import { useTranslation } from 'react-i18next';

interface Contact {
  id: string;
  first_name: string;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  sync_status: string;
}

export function Contacts() {
  const { t } = useTranslation();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [search, setSearch]     = useState('');

  useEffect(() => {
    loadContacts(search);
  }, [search]);

  async function loadContacts(q: string) {
    const db = await Database.load('sqlite:crm.db');
    const pattern = `%${q}%`;
    const rows = await db.select<Contact[]>(
      `SELECT id, first_name, last_name, email, phone, company, sync_status
       FROM contacts
       WHERE deleted_at IS NULL
         AND (first_name LIKE $1 OR last_name LIKE $1 OR phone LIKE $1 OR email LIKE $1)
       ORDER BY first_name
       LIMIT 100`,
      [pattern]
    );
    setContacts(rows);
  }

  return (
    <div>
      <h1 style={{ margin: '0 0 16px', fontSize: 20, fontWeight: 700 }}>
        {t('app.navigation.contacts')}
      </h1>
      <input
        value={search} onChange={e => setSearch(e.target.value)}
        placeholder={t('app.contacts.search_placeholder')}
        style={{
          width: '100%', maxWidth: 400, padding: '8px 12px',
          border: '1px solid #d1d5db', borderRadius: 6,
          fontSize: 14, marginBottom: 20, outline: 'none',
        }}
      />

      {contacts.length === 0 ? (
        <p style={{ color: '#94a3b8' }}>{t('app.contacts.list_empty')}</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {contacts.map(c => (
            <Link
              to={`/contacts/${c.id}`} key={c.id}
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              <div style={{
                padding: '12px 16px', background: '#fff',
                borderRadius: 8, border: '1px solid #f1f5f9',
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', cursor: 'pointer',
              }}>
                <div>
                  <div style={{ fontWeight: 500 }}>
                    {c.first_name} {c.last_name ?? ''}
                  </div>
                  {c.phone && (
                    <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>{c.phone}</div>
                  )}
                </div>
                {c.sync_status !== 'synced' && (
                  <span title={c.sync_status} style={{ fontSize: 14, color: '#f59e0b' }}>⚠</span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
