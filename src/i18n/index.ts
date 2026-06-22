import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import de from './locales/de.json';
import en from './locales/en.json';
import es from './locales/es.json';
import ca from './locales/ca.json';
import eu from './locales/eu.json';

const SUPPORTED = ['de', 'en', 'es', 'ca', 'eu'] as const;
type SupportedLocale = typeof SUPPORTED[number];

function detectLocale(): SupportedLocale {
  const saved = localStorage.getItem('euricio-locale') as SupportedLocale | null;
  if (saved && SUPPORTED.includes(saved)) return saved;

  const browser = navigator.language.split('-')[0] as SupportedLocale;
  return SUPPORTED.includes(browser) ? browser : 'es';
}

i18n
  .use(initReactI18next)
  .init({
    resources: {
      de: { translation: de },
      en: { translation: en },
      es: { translation: es },
      ca: { translation: ca },
      eu: { translation: eu },
    },
    lng: detectLocale(),
    fallbackLng: ['es', 'en'],
    interpolation: { escapeValue: false },
  });

export default i18n;

export function changeLocale(locale: string) {
  localStorage.setItem('euricio-locale', locale);
  i18n.changeLanguage(locale);
}
