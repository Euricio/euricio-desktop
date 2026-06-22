import { useTranslation } from 'react-i18next';
import { changeLocale } from '../i18n/index';

const LOCALES = [
  { code: 'de', label: 'Deutsch'  },
  { code: 'en', label: 'English'  },
  { code: 'es', label: 'Español'  },
  { code: 'ca', label: 'Català'   },
  { code: 'eu', label: 'Euskara'  },
];

export function Settings() {
  const { t, i18n } = useTranslation();

  return (
    <div style={{ maxWidth: 480 }}>
      <h1 style={{ margin: '0 0 24px', fontSize: 20, fontWeight: 700 }}>
        {t('app.navigation.settings')}
      </h1>

      <section>
        <label style={{ fontWeight: 600, display: 'block', marginBottom: 8 }}>
          {t('app.settings.language')}
        </label>
        <select
          value={i18n.language}
          onChange={e => changeLocale(e.target.value)}
          style={{
            padding: '8px 12px', border: '1px solid #d1d5db',
            borderRadius: 6, fontSize: 14, width: 200, cursor: 'pointer',
          }}
        >
          {LOCALES.map(l => (
            <option key={l.code} value={l.code}>{l.label}</option>
          ))}
        </select>
        <p style={{ color: '#94a3b8', fontSize: 12, marginTop: 8 }}>
          de · en · es · ca · eu
        </p>
      </section>
    </div>
  );
}
