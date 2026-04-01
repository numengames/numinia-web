/**
 * Rank UI utilities — colors, labels, and icons for each rank.
 * Used by RankBadge and sidebar components.
 */

import type { Rank } from '@/types/rank';

export interface RankDisplay {
  label: string;
  colorClasses: string;  // Tailwind classes for Badge bg + text
  dotColor: string;      // Single color class for status dots
}

export const RANK_DISPLAY: Record<Rank, RankDisplay> = {
  nomad: {
    label: 'Nomad',
    colorClasses: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    dotColor: 'bg-gray-400',
  },
  citizen: {
    label: 'Citizen',
    colorClasses: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    dotColor: 'bg-blue-500',
  },
  pilgrim: {
    label: 'Pilgrim',
    colorClasses: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    dotColor: 'bg-green-500',
  },
  vernacular: {
    label: 'Vernacular',
    colorClasses: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    dotColor: 'bg-amber-500',
  },
  archon: {
    label: 'Archon',
    colorClasses: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
    dotColor: 'bg-purple-500',
  },
  oracle: {
    label: 'Oracle',
    colorClasses: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    dotColor: 'bg-red-500',
  },
};

export function getRankDisplay(rank: Rank): RankDisplay {
  return RANK_DISPLAY[rank] ?? RANK_DISPLAY.nomad;
}
