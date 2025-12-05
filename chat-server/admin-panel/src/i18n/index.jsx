import { createContext, useContext, useState, useCallback, useEffect } from 'react';

import uk from './uk.json';
import en from './en.json';
import ru from './ru.json';

const translations = { uk, en, ru };

export const LANGUAGES = [
  { code: 'uk', name: 'Українська' },
  { code: 'en', name: 'English' },
  { code: 'ru', name: 'Русский' }
];

const I18nContext = createContext(null);

export function I18nProvider({ children, initialLanguage = 'uk' }) {
  const [language, setLanguage] = useState(initialLanguage);

  // Update language when initialLanguage changes (from server config)
  useEffect(() => {
    if (initialLanguage && translations[initialLanguage]) {
      setLanguage(initialLanguage);
    }
  }, [initialLanguage]);

  const t = useCallback((key) => {
    const keys = key.split('.');
    let value = translations[language];

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        // Fallback to Ukrainian if key not found
        let fallback = translations['uk'];
        for (const fk of keys) {
          if (fallback && typeof fallback === 'object' && fk in fallback) {
            fallback = fallback[fk];
          } else {
            return key; // Return key if not found in fallback either
          }
        }
        return fallback;
      }
    }

    return value;
  }, [language]);

  const changeLanguage = useCallback((lang) => {
    if (translations[lang]) {
      setLanguage(lang);
    }
  }, []);

  return (
    <I18nContext.Provider value={{ language, t, changeLanguage, languages: LANGUAGES }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useTranslation must be used within I18nProvider');
  }
  return context;
}
