'use client';

import { useI18n } from '@/lib/i18n';
import { Database, Github, Globe, Archive } from 'lucide-react';

const LAYERS = [
  { id: 'r2', label: 'Cloudflare R2', icon: Database, status: 'connected' },
  { id: 'github', label: 'GitHub', icon: Github, status: 'connected' },
  { id: 'ipfs', label: 'IPFS', icon: Globe, status: 'disconnected' },
  { id: 'arweave', label: 'Arweave', icon: Archive, status: 'disconnected' },
];

export function StorageSection() {
  const { t } = useI18n();

  return (
    <section id="settings-storageSection">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        {t('admin.settings.storageSection.title')}
      </h2>

      <div className="space-y-2">
        {LAYERS.map((layer) => {
          const Icon = layer.icon;
          const connected = layer.status === 'connected';
          return (
            <div key={layer.id} className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2.5">
                <Icon className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-900 dark:text-white">{layer.label}</span>
              </div>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                connected
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
              }`}>
                {connected ? t('admin.settings.storageSection.connected') : t('admin.settings.storageSection.disconnected')}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
