'use client';

import { useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { Link2 } from 'lucide-react';

export function BlockchainSection() {
  const { t } = useI18n();
  const [testnets, setTestnets] = useState(false);

  return (
    <section id="settings-blockchain">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        {t('admin.settings.blockchain.title')}
      </h2>

      <div className="space-y-4">
        {/* Enable testnets */}
        <div className="flex items-center justify-between py-2">
          <div>
            <div className="text-sm font-medium text-gray-900 dark:text-white">{t('admin.settings.blockchain.enableTestnets')}</div>
          </div>
          <button
            onClick={() => setTestnets(!testnets)}
            className={`relative w-9 h-5 rounded-full transition-colors ${testnets ? 'bg-gray-900 dark:bg-white' : 'bg-gray-300 dark:bg-gray-600'}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full transition-transform ${testnets ? 'translate-x-4 bg-white dark:bg-gray-900' : 'bg-white dark:bg-gray-400'}`} />
          </button>
        </div>

        {/* Network info */}
        <div className="flex items-center justify-between py-2">
          <div className="text-sm font-medium text-gray-900 dark:text-white">{t('admin.settings.blockchain.network')}</div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-blue-500" />
            <span className="text-xs text-gray-600 dark:text-gray-300">Base {testnets ? 'Sepolia' : 'Mainnet'}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
