'use client';

import { useState, useEffect } from 'react';
import { useI18n } from '@/lib/i18n';
import { User, Globe, Swords, Flame, BookOpen } from 'lucide-react';

const MODULES = [
  { id: 'character', icon: User },
  { id: 'portals', icon: Globe },
  { id: 'loot', icon: Swords },
  { id: 'seasons', icon: Flame },
  { id: 'codex', icon: BookOpen },
];

const STORAGE_KEY = 'lap-sidebar-modules';

export function SidebarOptionsSection() {
  const { t } = useI18n();
  const [visibility, setVisibility] = useState<Record<string, boolean>>(() => {
    if (typeof window === 'undefined') return {};
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch { return {}; }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(visibility));
  }, [visibility]);

  const toggle = (id: string) => {
    setVisibility(prev => ({ ...prev, [id]: !(prev[id] ?? true) }));
  };

  return (
    <section id="settings-sidebarOptions">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
        {t('admin.settings.sidebarOptions.title')}
      </h2>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
        {t('admin.settings.sidebarOptions.description')}
      </p>

      <div className="space-y-1">
        {MODULES.map((mod) => {
          const Icon = mod.icon;
          const enabled = visibility[mod.id] ?? true;
          return (
            <div key={mod.id} className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2.5">
                <Icon className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-900 dark:text-white">{t(`admin.nav.${mod.id}`)}</span>
              </div>
              <button
                onClick={() => toggle(mod.id)}
                className={`relative w-9 h-5 rounded-full transition-colors ${enabled ? 'bg-gray-900 dark:bg-white' : 'bg-gray-300 dark:bg-gray-600'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full transition-transform ${enabled ? 'translate-x-4 bg-white dark:bg-gray-900' : 'bg-white dark:bg-gray-400'}`} />
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
