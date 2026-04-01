'use client';

import { useState, useRef, useEffect } from 'react';
import { useI18n } from '@/lib/i18n';
import { locales, type Locale } from '@/lib/i18n-config';
import { Globe, ChevronDown } from 'lucide-react';

const languageNames: Record<Locale, string> = {
  en: 'English',
  ja: '日本語',
  es: 'Español',
  ko: '한국어',
  zh: '中文',
  pt: 'Português',
  de: 'Deutsch',
};

export default function SettingsPage() {
  const { locale, setLocale, t } = useI18n();
  const [langOpen, setLangOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setLangOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLanguageChange = (newLocale: Locale) => {
    setLocale(newLocale);
    document.cookie = `preferred-locale=${newLocale};path=/;max-age=${60 * 60 * 24 * 365};SameSite=Lax`;
    setLangOpen(false);
    window.location.href = `/${newLocale}/LAP/settings`;
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-8">{t('admin.settings.title')}</h1>

      {/* Language */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Globe className="h-4 w-4" />
          {t('admin.settings.language')}
        </h2>
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setLangOpen(!langOpen)}
            className="w-full sm:w-64 flex items-center justify-between px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm font-medium text-gray-900 dark:text-white hover:border-gray-400 dark:hover:border-gray-500 transition-colors"
          >
            <span>{languageNames[locale as Locale]}</span>
            <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${langOpen ? 'rotate-180' : ''}`} />
          </button>
          {langOpen && (
            <div className="absolute z-50 mt-1 w-full sm:w-64 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {locales.map((code) => (
                <button
                  key={code}
                  onClick={() => handleLanguageChange(code)}
                  className={`w-full px-4 py-2.5 text-left text-sm transition-colors ${
                    locale === code
                      ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-medium'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  {languageNames[code]}
                </button>
              ))}
            </div>
          )}
        </div>
        <p className="text-xs text-gray-400 mt-2">{t('admin.settings.languageHint')}</p>
      </section>

      <div className="border-t border-gray-200 dark:border-gray-700" />

      {/* Platform */}
      <section className="my-8">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('admin.settings.platform')}</h2>
        <div className="space-y-4">
          <SettingRow label={t('admin.settings.publicGallery') as string} description={t('admin.settings.publicGalleryDesc') as string} enabled={true} />
          <SettingRow label={t('admin.settings.autoUploadR2') as string} description={t('admin.settings.autoUploadR2Desc') as string} enabled={true} />
          <SettingRow label={t('admin.settings.downloadTracking') as string} description={t('admin.settings.downloadTrackingDesc') as string} enabled={true} />
        </div>
      </section>

      <div className="border-t border-gray-200 dark:border-gray-700" />

      {/* About */}
      <section className="my-8">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('admin.settings.about')}</h2>
        <div className="space-y-2 text-sm text-gray-500">
          <div className="flex justify-between"><span>{t('admin.settings.version')}</span><span className="text-gray-900 dark:text-white">0.13.0</span></div>
          <div className="flex justify-between"><span>{t('admin.settings.idSystem')}</span><span className="text-gray-900 dark:text-white">UUID v7 (RFC 9562)</span></div>
          <div className="flex justify-between"><span>{t('admin.settings.storage')}</span><span className="text-gray-900 dark:text-white">R2 + GitHub</span></div>
          <div className="flex justify-between">
            <span>{t('admin.settings.documentation')}</span>
            <a href="https://github.com/PabloFMM/numinia-digital-goods" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-700">GitHub ↗</a>
          </div>
        </div>
      </section>
    </div>
  );
}

function SettingRow({ label, description, enabled }: { label: string; description: string; enabled: boolean }) {
  const [on, setOn] = useState(enabled);
  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <div className="text-sm font-medium text-gray-900 dark:text-white">{label}</div>
        <div className="text-xs text-gray-500 mt-0.5">{description}</div>
      </div>
      <button
        onClick={() => setOn(!on)}
        className={`relative w-10 h-5 rounded-full transition-colors ${on ? 'bg-gray-900 dark:bg-white' : 'bg-gray-300 dark:bg-gray-600'}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full transition-transform ${on ? 'translate-x-5 bg-white dark:bg-gray-900' : 'bg-white dark:bg-gray-400'}`} />
      </button>
    </div>
  );
}
