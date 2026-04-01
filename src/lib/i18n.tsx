'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import React from 'react';

import { locales, type Locale } from './i18n-config';
export { locales, type Locale } from './i18n-config';

// Static imports — Turbopack cannot reliably bundle dynamic template-literal imports
// (import(`../locales/${locale}/file.json`)) because the locale is a runtime variable.
// Using static imports guarantees all translation files are included in the bundle.
import enCommon    from '../locales/en/common.json';
import enHeader    from '../locales/en/header.json';
import enAvatar    from '../locales/en/avatar.json';
import enAbout     from '../locales/en/about.json';
import enResources from '../locales/en/resources.json';
import enVrmviewer from '../locales/en/vrmviewer.json';
import enHome      from '../locales/en/home.json';
import enFinder    from '../locales/en/finder.json';

import jaCommon    from '../locales/ja/common.json';
import jaHeader    from '../locales/ja/header.json';
import jaAvatar    from '../locales/ja/avatar.json';
import jaAbout     from '../locales/ja/about.json';
import jaResources from '../locales/ja/resources.json';
import jaVrmviewer from '../locales/ja/vrmviewer.json';
import jaHome      from '../locales/ja/home.json';
import jaFinder    from '../locales/ja/finder.json';

import esCommon    from '../locales/es/common.json';
import esHeader    from '../locales/es/header.json';
import esAvatar    from '../locales/es/avatar.json';
import esAbout     from '../locales/es/about.json';
import esResources from '../locales/es/resources.json';
import esVrmviewer from '../locales/es/vrmviewer.json';
import esHome      from '../locales/es/home.json';
import esFinder    from '../locales/es/finder.json';

// Type for translation keys
type TranslationKey = string;

// Type for translation values
type TranslationValue = string | string[] | Record<string, unknown>;

// Context type
type I18nContextType = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey, options?: { returnObjects?: boolean }) => string | string[];
  isLoading: boolean;
};

// Create context
export const I18nContext = createContext<I18nContextType | null>(null);

// All translations bundled statically — no async loading needed.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const translations: Record<Locale, Record<string, any>> = {
  en: {
    common: enCommon,
    header: enHeader,
    avatar: enAvatar,
    about: enAbout,
    resources: enResources,
    vrmviewer: enVrmviewer,
    home: enHome,
    finder: enFinder,
  },
  ja: {
    common: jaCommon,
    header: jaHeader,
    avatar: jaAvatar,
    about: jaAbout,
    resources: jaResources,
    vrmviewer: jaVrmviewer,
    home: jaHome,
    finder: jaFinder,
  },
  es: {
    common: esCommon,
    header: esHeader,
    avatar: esAvatar,
    about: esAbout,
    resources: esResources,
    vrmviewer: esVrmviewer,
    home: esHome,
    finder: esFinder,
  },
};

// Provider props type
type I18nProviderProps = {
  children: ReactNode;
  defaultLocale?: Locale;
};

// Provider component
export const I18nProvider: React.FC<I18nProviderProps> = ({
  children,
  defaultLocale = 'en',
}) => {
  // Translations are bundled statically — locale switching is synchronous.
  // On the server defaultLocale is used directly (no localStorage).
  const [locale, setLocaleState] = useState<Locale>(() => {
    if (typeof window === 'undefined') return defaultLocale;
    const stored = localStorage.getItem('preferred-locale') as Locale | null;
    return stored && locales.includes(stored) ? stored : defaultLocale;
  });

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    if (typeof window !== 'undefined') {
      localStorage.setItem('preferred-locale', newLocale);
    }
  }, []);

  const t = useCallback((key: TranslationKey, options?: { returnObjects?: boolean }): string | string[] => {
    const [namespace, ...keys] = key.split('.');
    let current: TranslationValue = translations[locale]?.[namespace];

    if (!current) {
      console.warn(`Translation namespace not found: ${namespace}`);
      return key;
    }

    for (const k of keys) {
      if (typeof current !== 'object' || Array.isArray(current)) {
        console.warn(`Translation key not found: ${key}`);
        return key;
      }
      current = (current as Record<string, TranslationValue>)[k];
      if (current === undefined) {
        console.warn(`Translation key not found: ${key}`);
        return key;
      }
    }

    if (options?.returnObjects && Array.isArray(current)) {
      return current;
    }

    if (typeof current === 'string') {
      return current;
    }

    if (Array.isArray(current)) {
      console.warn(`Translation value is an array but returnObjects is not set: ${key}`);
      return key;
    }

    console.warn(`Translation value is not a string or array: ${key}`);
    return key;
  }, [locale]);

  return (
    <I18nContext.Provider value={{ locale, setLocale, t, isLoading: false }}>
      {children}
    </I18nContext.Provider>
  );
};

// Hook for using translations
export function useI18n(): I18nContextType {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
} 