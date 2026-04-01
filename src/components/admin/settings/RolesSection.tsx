'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { RankBadge } from '@/components/admin/users/RankBadge';
import { RANK_HIERARCHY, DEFAULT_RANK_PERMISSIONS, type Rank, type RankPermissions } from '@/types/rank';

const PERMISSION_GROUPS: { key: string; permissions: (keyof RankPermissions)[] }[] = [
  { key: 'browse', permissions: ['canBrowse', 'canDownload', 'canFavorite'] },
  { key: 'identity', permissions: ['canEditProfile', 'canSessionZero', 'canAccessLoot'] },
  { key: 'season', permissions: ['canAccessSeasonContent', 'canBurnRitual'] },
  { key: 'create', permissions: ['canUploadAssets', 'canEditOwnMetadata', 'canDeleteOwnAssets', 'canViewOwnStats', 'canAccessLAP'] },
  { key: 'admin', permissions: ['canManageAllAssets', 'canManageSeasons', 'canViewGlobalStats', 'canViewAuditLog', 'canBanUsers', 'canManageUsers', 'canPromoteVernacular'] },
  { key: 'oracle', permissions: ['canPromoteArchon', 'canEditRankPermissions', 'canEditSystemConfig'] },
];

function formatPermissionName(key: string): string {
  return key.replace('can', '').replace(/([A-Z])/g, ' $1').trim();
}

export function RolesSection() {
  const { t } = useI18n();
  const [expandedRank, setExpandedRank] = useState<Rank | null>(null);

  return (
    <section id="settings-roles">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
        {t('admin.settings.roles.title')}
      </h2>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
        {t('admin.settings.roles.description')}
      </p>

      <div className="space-y-2">
        {RANK_HIERARCHY.map((rank, level) => {
          const isExpanded = expandedRank === rank;
          const perms = DEFAULT_RANK_PERMISSIONS[rank];

          return (
            <div key={rank} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              {/* Rank header */}
              <button
                onClick={() => setExpandedRank(isExpanded ? null : rank)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <RankBadge rank={rank} size="md" />
                  <span className="text-xs text-gray-400">Level {level}</span>
                </div>
                <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
              </button>

              {/* Permissions accordion */}
              {isExpanded && (
                <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-3 bg-gray-50/50 dark:bg-gray-800/30">
                  {PERMISSION_GROUPS.map((group) => {
                    const hasAny = group.permissions.some(p => perms[p]);
                    if (!hasAny && level < 3) return null; // Skip empty groups for lower ranks

                    return (
                      <div key={group.key} className="mb-3 last:mb-0">
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
                          {t(`admin.settings.roles.permissionGroups.${group.key}`)}
                        </div>
                        <div className="space-y-1">
                          {group.permissions.map((perm) => (
                            <div key={perm} className="flex items-center justify-between py-1">
                              <span className="text-xs text-gray-600 dark:text-gray-300">
                                {formatPermissionName(perm)}
                              </span>
                              <div className={`w-2 h-2 rounded-full ${perms[perm] ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
