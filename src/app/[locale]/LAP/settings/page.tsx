'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useI18n } from '@/lib/i18n';
import { locales, type Locale } from '@/lib/i18n-config';
import { ChevronDown, Globe } from 'lucide-react';

import { SettingsNav } from '@/components/admin/settings/SettingsNav';
import { ProfileSection } from '@/components/admin/settings/ProfileSection';
import { RolesSection } from '@/components/admin/settings/RolesSection';
import { SidebarOptionsSection } from '@/components/admin/settings/SidebarOptionsSection';
import { StorageSection } from '@/components/admin/settings/StorageSection';
import { BlockchainSection } from '@/components/admin/settings/BlockchainSection';

import type { Rank } from '@/types/rank';

const languageNames: Record<Locale, string> = {
  en: 'English', ja: '日本語', es: 'Español',
  ko: '한국어', zh: '中文', pt: 'Português', de: 'Deutsch',
};

export default function SettingsPage() {
  const { locale, setLocale, t } = useI18n();
  const [activeSection, setActiveSection] = useState('profile');
  const [langOpen, setLangOpen] = useState(false);
  const [session, setSession] = useState<{ address?: string; rank?: Rank } | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Fetch session for profile data
  useEffect(() => {
    fetch('/api/auth/wallet/session')
      .then(r => r.json())
      .then(data => setSession({ address: data.address, rank: data.rank || 'citizen' }))
      .catch(() => {});
  }, []);

  // Close language dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setLangOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Track active section on scroll
  useEffect(() => {
    const container = contentRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const id = entry.target.id.replace('settings-', '');
            setActiveSection(id);
          }
        }
      },
      { root: container, rootMargin: '-20% 0px -70% 0px', threshold: 0 }
    );

    container.querySelectorAll('[id^="settings-"]').forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const handleNavigate = useCallback((id: string) => {
    setActiveSection(id);
    const el = document.getElementById(`settings-${id}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const handleLanguageChange = (newLocale: Locale) => {
    setLocale(newLocale);
    document.cookie = `preferred-locale=${newLocale};path=/;max-age=${60 * 60 * 24 * 365};SameSite=Lax`;
    setLangOpen(false);
    window.location.href = `/${newLocale}/LAP/settings`;
  };

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Settings Nav — hidden on mobile */}
      <div className="hidden md:block w-52 shrink-0 border-r border-gray-200 dark:border-gray-800 overflow-y-auto py-4 px-2">
        <SettingsNav activeSection={activeSection} onNavigate={handleNavigate} />
      </div>

      {/* Content */}
      <div ref={contentRef} className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto p-6 space-y-10">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('admin.settings.title')}</h1>

          {/* 1. Profile */}
          <ProfileSection
            walletAddress={session?.address}
            rank={session?.rank || 'citizen'}
          />

          <div className="border-t border-gray-200 dark:border-gray-700" />

          {/* 2. Overview */}
          <section id="settings-overview">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {t('admin.settings.overview.title')}
            </h2>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <img src="/icon-khepri.svg" alt="Numinia" className="h-12 w-12 dark:invert" />
                <div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white">{t('admin.settings.overview.spaceName')}</div>
                  <div className="text-lg font-bold text-gray-900 dark:text-white">Numinia</div>
                </div>
              </div>
            </div>
          </section>

          <div className="border-t border-gray-200 dark:border-gray-700" />

          {/* 3. Roles & Permissions */}
          <RolesSection />

          <div className="border-t border-gray-200 dark:border-gray-700" />

          {/* 4. Sidebar Options */}
          <SidebarOptionsSection />

          <div className="border-t border-gray-200 dark:border-gray-700" />

          {/* 5. Language */}
          <section id="settings-language">
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

          {/* 6. Storage */}
          <StorageSection />

          <div className="border-t border-gray-200 dark:border-gray-700" />

          {/* 7. Blockchain */}
          <BlockchainSection />

          <div className="border-t border-gray-200 dark:border-gray-700" />

          {/* 8. About */}
          <section id="settings-about">
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
      </div>
    </div>
  );
}
