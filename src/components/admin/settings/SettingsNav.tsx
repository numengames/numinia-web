'use client';

import { useI18n } from '@/lib/i18n';
import { User, Globe, Layout, Shield, Bell, Languages, Database, Link2, Info } from 'lucide-react';

interface SettingsNavProps {
  activeSection: string;
  onNavigate: (id: string) => void;
}

const SECTIONS = [
  { group: 'settings.sections.account', items: [
    { id: 'profile', icon: User },
  ]},
  { group: 'settings.sections.space', items: [
    { id: 'overview', icon: Layout },
    { id: 'roles', icon: Shield },
    { id: 'sidebarOptions', icon: Globe },
  ]},
  { group: 'settings.sections.platform', items: [
    { id: 'language', icon: Languages },
    { id: 'storageSection', icon: Database },
    { id: 'blockchain', icon: Link2 },
  ]},
  { group: '', items: [
    { id: 'about', icon: Info },
  ]},
];

export function SettingsNav({ activeSection, onNavigate }: SettingsNavProps) {
  const { t } = useI18n();

  return (
    <nav className="space-y-4">
      {SECTIONS.map((section, i) => (
        <div key={i}>
          {section.group && (
            <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 px-3 mb-1">
              {t(`admin.${section.group}`)}
            </div>
          )}
          <div className="space-y-0.5">
            {section.items.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              const label = t(`admin.settings.${item.id === 'about' ? 'about' : item.id}.title`) as string;
              // Fallback for sections that use a different key structure
              const displayLabel = label.startsWith('admin.') ? t(`admin.settings.${item.id}`) as string : label;

              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                    isActive
                      ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-medium'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{displayLabel}</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
