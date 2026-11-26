import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import hi from './locales/hi.json';
import te from './locales/te.json';
import ta from './locales/ta.json';

export const LANG_STORAGE_KEY = 'udharpe_lang';

export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English', nativeLabel: 'English', intlLocale: 'en-IN' },
  { code: 'hi', label: 'Hindi', nativeLabel: 'हिन्दी', intlLocale: 'hi-IN' },
  { code: 'te', label: 'Telugu', nativeLabel: 'తెలుగు', intlLocale: 'te-IN' },
  { code: 'ta', label: 'Tamil', nativeLabel: 'தமிழ்', intlLocale: 'ta-IN' },
];

const SUPPORTED_CODES = new Set(SUPPORTED_LANGUAGES.map((l) => l.code));

function getInitialLanguage() {
  try {
    const saved = localStorage.getItem(LANG_STORAGE_KEY);
    if (saved && SUPPORTED_CODES.has(saved)) {
      return saved;
    }
  } catch {
    // Ignore storage access failures in private browsing
  }
  return 'en';
}

export function getIntlLocale(langCode) {
  const match = SUPPORTED_LANGUAGES.find((l) => l.code === langCode);
  return match ? match.intlLocale : 'en-IN';
}

const initialLanguage = getInitialLanguage();

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    hi: { translation: hi },
    te: { translation: te },
    ta: { translation: ta },
  },
  lng: initialLanguage,
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
});

if (typeof document !== 'undefined') {
  document.documentElement.lang = initialLanguage;
}

i18n.on('languageChanged', (lng) => {
  const normalized = SUPPORTED_CODES.has(lng) ? lng : 'en';
  try {
    localStorage.setItem(LANG_STORAGE_KEY, normalized);
  } catch {
    // Ignore storage write failures
  }
  if (typeof document !== 'undefined') {
    document.documentElement.lang = normalized;
  }
});

export default i18n;
