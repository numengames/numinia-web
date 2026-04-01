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
import enAdmin     from '../locales/en/admin.json';

import jaCommon    from '../locales/ja/common.json';
import jaHeader    from '../locales/ja/header.json';
import jaAvatar    from '../locales/ja/avatar.json';
import jaAbout     from '../locales/ja/about.json';
import jaResources from '../locales/ja/resources.json';
import jaVrmviewer from '../locales/ja/vrmviewer.json';
import jaHome      from '../locales/ja/home.json';
import jaFinder    from '../locales/ja/finder.json';
import jaAdmin     from '../locales/ja/admin.json';

import esCommon    from '../locales/es/common.json';
import esHeader    from '../locales/es/header.json';
import esAvatar    from '../locales/es/avatar.json';
import esAbout     from '../locales/es/about.json';
import esResources from '../locales/es/resources.json';
import esVrmviewer from '../locales/es/vrmviewer.json';
import esHome      from '../locales/es/home.json';
import esFinder    from '../locales/es/finder.json';
import esAdmin     from '../locales/es/admin.json';

import koCommon    from '../locales/ko/common.json';
import koHeader    from '../locales/ko/header.json';
import koAvatar    from '../locales/ko/avatar.json';
import koAbout     from '../locales/ko/about.json';
import koResources from '../locales/ko/resources.json';
import koVrmviewer from '../locales/ko/vrmviewer.json';
import koHome      from '../locales/ko/home.json';
import koFinder    from '../locales/ko/finder.json';
import koAdmin     from '../locales/ko/admin.json';

import zhCommon    from '../locales/zh/common.json';
import zhHeader    from '../locales/zh/header.json';
import zhAvatar    from '../locales/zh/avatar.json';
import zhAbout     from '../locales/zh/about.json';
import zhResources from '../locales/zh/resources.json';
import zhVrmviewer from '../locales/zh/vrmviewer.json';
import zhHome      from '../locales/zh/home.json';
import zhFinder    from '../locales/zh/finder.json';
import zhAdmin     from '../locales/zh/admin.json';

import ptCommon    from '../locales/pt/common.json';
import ptHeader    from '../locales/pt/header.json';
import ptAvatar    from '../locales/pt/avatar.json';
import ptAbout     from '../locales/pt/about.json';
import ptResources from '../locales/pt/resources.json';
import ptVrmviewer from '../locales/pt/vrmviewer.json';
import ptHome      from '../locales/pt/home.json';
import ptFinder    from '../locales/pt/finder.json';
import ptAdmin     from '../locales/pt/admin.json';

import deCommon    from '../locales/de/common.json';
import deHeader    from '../locales/de/header.json';
import deAvatar    from '../locales/de/avatar.json';
import deAbout     from '../locales/de/about.json';
import deResources from '../locales/de/resources.json';
import deVrmviewer from '../locales/de/vrmviewer.json';
import deHome      from '../locales/de/home.json';
import deFinder    from '../locales/de/finder.json';
import deAdmin     from '../locales/de/admin.json';

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
    admin: enAdmin,
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
    admin: jaAdmin,
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
    admin: esAdmin,
  },
  ko: {
    common: koCommon,
    header: koHeader,
    avatar: koAvatar,
    about: koAbout,
    resources: koResources,
    vrmviewer: koVrmviewer,
    home: koHome,
    finder: koFinder,
    admin: koAdmin,
  },
  zh: {
    common: zhCommon,
    header: zhHeader,
    avatar: zhAvatar,
    about: zhAbout,
    resources: zhResources,
    vrmviewer: zhVrmviewer,
    home: zhHome,
    finder: zhFinder,
    admin: zhAdmin,
  },
  pt: {
    common: ptCommon,
    header: ptHeader,
    avatar: ptAvatar,
    about: ptAbout,
    resources: ptResources,
    vrmviewer: ptVrmviewer,
    home: ptHome,
    finder: ptFinder,
    admin: ptAdmin,
  },
  de: {
    common: deCommon,
    header: deHeader,
    avatar: deAvatar,
    about: deAbout,
    resources: deResources,
    vrmviewer: deVrmviewer,
    home: deHome,
    finder: deFinder,
    admin: deAdmin,
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
    let current: TranslationValue = translations[locale]?.[namespace] ?? translations.en?.[namespace];

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