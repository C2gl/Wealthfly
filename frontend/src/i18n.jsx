import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import en from './locales/en.json';
import fr from './locales/fr.json';

const catalogs = { en, fr };
const DEFAULT_LANGUAGE = 'en';
const LanguageContext = createContext(null);

function normalizeLanguage(value) {
  const language = String(value || '').toLowerCase().split('-')[0];
  return catalogs[language] ? language : DEFAULT_LANGUAGE;
}

function getValue(catalog, key) {
  return key.split('.').reduce((value, part) => value?.[part], catalog);
}

function interpolate(value, variables) {
  return String(value).replace(/{{(\w+)}}/g, (_, name) => String(variables[name] ?? ''));
}

export function TranslationProvider({ children }) {
  const [language, setLanguage] = useState(() => normalizeLanguage(import.meta.env.VITE_LANGUAGE));

  useEffect(() => {
    fetch('/api/config')
      .then((response) => (response.ok ? response.json() : null))
      .then((config) => {
        if (config?.language) setLanguage(normalizeLanguage(config.language));
      })
      .catch(() => {});
  }, []);

  const value = useMemo(() => {
    const locale = normalizeLanguage(language);
    const catalog = catalogs[locale];
    return {
      language: locale,
      t: (key, variables = {}) => {
        const message = getValue(catalog, key) ?? getValue(en, key) ?? key;
        return interpolate(message, variables);
      },
      formatNumber: (number, options) => new Intl.NumberFormat(locale, options).format(number),
      formatDate: (date, options) => new Intl.DateTimeFormat(locale, options).format(date),
    };
  }, [language]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useTranslation() {
  return useContext(LanguageContext);
}