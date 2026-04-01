'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { RankBadge } from '@/components/admin/users/RankBadge';
import type { Rank } from '@/types/rank';

interface ProfileSectionProps {
  walletAddress?: string;
  rank: Rank;
}

export function ProfileSection({ walletAddress, rank }: ProfileSectionProps) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);

  const copyAddress = () => {
    if (walletAddress) {
      navigator.clipboard.writeText(walletAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <section id="settings-profile">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        {t('admin.settings.profile.title')}
      </h2>
      <div className="space-y-4">
        {/* Wallet */}
        <div className="flex items-center justify-between py-2">
          <div>
            <div className="text-sm font-medium text-gray-900 dark:text-white">{t('admin.settings.profile.wallet')}</div>
            <div className="text-xs text-gray-500 font-mono mt-0.5">
              {walletAddress || 'Not connected'}
            </div>
          </div>
          {walletAddress && (
            <button
              onClick={copyAddress}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
              title={copied ? t('admin.settings.profile.copied') as string : 'Copy'}
            >
              {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            </button>
          )}
        </div>

        {/* Rank */}
        <div className="flex items-center justify-between py-2">
          <div className="text-sm font-medium text-gray-900 dark:text-white">{t('admin.settings.profile.rank')}</div>
          <RankBadge rank={rank} size="md" />
        </div>
      </div>
    </section>
  );
}
