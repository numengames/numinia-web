'use client';

import { SeasonTimeline } from '@/components/seasons/SeasonTimeline';

export default function SeasonsPage() {
  return (
    <div className="bg-gray-950 min-h-[calc(100vh-4rem)] rounded-l-xl">
      <SeasonTimeline />
    </div>
  );
}
