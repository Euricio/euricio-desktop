import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import Database from '@tauri-apps/plugin-sql';
import { useTranslation } from 'react-i18next';

interface Contact {
  id: string;
  first_name: string;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  notes: string | null;
  sync_status: string;
}

export function ContactDetail() {
  const { id } = useParams<{ id: string }>();
  const { t }  = useTranslation();
  const [contact, setContact] = useState<Contact | null>(null);

  useEffect(() => {
    if (!id) return;
    Database.load('sqlite:crm.db')
      .then(db => db.select<Contact[]>('SELECT * FROM contacts WHERE id = $1', [id]))
      .then(rows => setContact(rows[0] ?? null));
  }, [id]);

  if (!contact) {
    return <p style={{ color: '#94a3b8' }}>{t('app.common.loading')}</p>;
  }

  return (
    <div style={{ maxWidth: 600 }}>
      <Link to="/contacts" style={{ color: '#3b82f6', fontSize: 13, textDecoration: 'none' }}>
        ← {t('app.navigation.contacts')}
      </Link>

      <h1 style={{ margin: '16px 0 4px', fontSize: 22, fontWeight: 700 }}>
        {contact.first_name} {contact.last_name ?? ''}
      </h1>

      {contact.sync_status !== 'synced' && (
        <span style={{ fontSize: 12, color: '#f59e0b' }}>
          ⚠ {contact.sync_status}
        </span>
      )}

      <dl style={{ marginTop: 24 }}>
        {contact.phone && (
          <>
            <dt style={dtStyle}>{t('app.contacts.phone')}</dt>
            <dd style={ddStyle}>{contact.phone}</dd>
          </>
        )}
        {contact.email && (
          <>
            <dt style={dtStyle}>{t('app.contacts.email')}</dt>
            <dd style={ddStyle}>{contact.email}</dd>
          </>
        )}
        {contact.company && (
          <>
            <dt style={dtStyle}>{t('app.contacts.company')}</dt>
            <dd style={ddStyle}>{contact.company}</dd>
          </>
        )}
        {contact.notes && (
          <>
            <dt style={dtStyle}>{t('app.contacts.notes')}</dt>
            <dd style={{ ...ddStyle, whiteSpace: 'pre-wrap', color: '#475569' }}>
              {contact.notes}
            </dd>
          </>
        )}
      </dl>
    </div>
  );
}

const dtStyle: React.CSSProperties = {
  fontSize: 12, color: '#94a3b8', marginTop: 20, marginBottom: 2,
  textTransform: 'uppercase', letterSpacing: '0.05em',
};
const ddStyle: React.CSSProperties = {
  margin: 0, fontWeight: 500, fontSize: 15,
};
