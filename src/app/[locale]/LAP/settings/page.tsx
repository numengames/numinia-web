'use client';

import { useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { locales, type Locale } from '@/lib/i18n-config';
import { Globe } from 'lucide-react';

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
  const { locale, setLocale } = useI18n();

  const handleLanguageChange = (newLocale: Locale) => {
    setLocale(newLocale);
    // Set cookie so middleware respects the choice on next visit
    document.cookie = `preferred-locale=${newLocale};path=/;max-age=${60 * 60 * 24 * 365};SameSite=Lax`;
    // Navigate to the same page in the new locale
    window.location.href = `/${newLocale}/LAP/settings`;
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-8">Settings</h1>

      {/* Language */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Globe className="h-4 w-4" />
          Language
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {locales.map((code) => (
            <button
              key={code}
              onClick={() => handleLanguageChange(code)}
              className={`px-4 py-3 rounded-lg border text-sm font-medium transition-all ${
                locale === code
                  ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 border-gray-900 dark:border-white'
                  : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500'
              }`}
            >
              {languageNames[code]}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-2">
          Language is auto-detected from your browser. Your choice here overrides auto-detection.
        </p>
      </section>

      <div className="border-t border-gray-200 dark:border-gray-700" />

      {/* Platform */}
      <section className="my-8">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Platform</h2>
        <div className="space-y-4">
          <SettingRow label="Public Gallery" description="Show assets in the public gallery at numinia.store" enabled={true} />
          <SettingRow label="Auto-upload to R2" description="Automatically upload files to Cloudflare R2 CDN when available" enabled={true} />
          <SettingRow label="Download Tracking" description="Track anonymous download counts for assets" enabled={true} />
        </div>
      </section>

      <div className="border-t border-gray-200 dark:border-gray-700" />

      {/* About */}
      <section className="my-8">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">About</h2>
        <div className="space-y-2 text-sm text-gray-500">
          <div className="flex justify-between"><span>Version</span><span className="text-gray-900 dark:text-white">0.12.0</span></div>
          <div className="flex justify-between"><span>ID System</span><span className="text-gray-900 dark:text-white">UUID v7 (RFC 9562)</span></div>
          <div className="flex justify-between"><span>Storage</span><span className="text-gray-900 dark:text-white">R2 + GitHub</span></div>
          <div className="flex justify-between">
            <span>Documentation</span>
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
