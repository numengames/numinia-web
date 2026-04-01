'use client';

import type { Rank } from '@/types/rank';
import { getRankDisplay } from '@/lib/rank-ui';

interface RankBadgeProps {
  rank: Rank;
  size?: 'sm' | 'md';
}

export function RankBadge({ rank, size = 'sm' }: RankBadgeProps) {
  const display = getRankDisplay(rank);
  const sizeClasses = size === 'sm'
    ? 'text-[10px] px-1.5 py-0.5'
    : 'text-xs px-2 py-0.5';

  return (
    <span className={`inline-flex items-center gap-1 rounded-full font-medium ${display.colorClasses} ${sizeClasses}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${display.dotColor}`} />
      {display.label}
    </span>
  );
}
