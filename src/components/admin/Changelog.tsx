'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

type ChangelogEntry = {
  version: string;
  date: string;
  items: { text: string; type: 'new' | 'fix' | 'improvement' }[];
};

// Changelog entries — add new versions at the top
const CHANGELOG: ChangelogEntry[] = [
  {
    version: '0.5.0',
    date: '2026-03-30',
    items: [
      { text: 'Audio player with waveform visualizer (MP3/OGG)', type: 'new' },
      { text: 'Video player in gallery and finder (MP4/WebM)', type: 'new' },
      { text: 'Admin table view with sortable columns', type: 'new' },
      { text: 'Gallery/Table view toggle (persisted)', type: 'new' },
      { text: 'Storage layer badges on asset cards (R2, GH, IPFS, AR)', type: 'new' },
      { text: 'Upload feedback: shows active layer + asset ID', type: 'improvement' },
      { text: 'Finder auto-selects random asset on load', type: 'improvement' },
      { text: 'Audio/Video/Worlds now visible in gallery sidebar', type: 'fix' },
      { text: 'PageSpeed: deferred hero VRM load (LCP fix)', type: 'improvement' },
    ],
  },
  {
    version: '0.4.0',
    date: '2026-03-30',
    items: [
      { text: 'R2 cloud storage (upload files up to 500MB)', type: 'new' },
      { text: 'UUID v7 asset ID system (RFC 9562)', type: 'new' },
      { text: 'SHA-256 file integrity verification', type: 'new' },
      { text: 'Asset stats endpoint (/api/admin/stats)', type: 'new' },
      { text: 'Upload progress bar', type: 'improvement' },
      { text: 'Storage strategy documented (R2, IPFS, Arweave)', type: 'new' },
    ],
  },
  {
    version: '0.3.0',
    date: '2026-03-30',
    items: [
      { text: 'PreviewPanel split (1943 → 1025 lines)', type: 'improvement' },
      { text: '44 → 1 any types eliminated', type: 'improvement' },
      { text: '5 JSX → TSX migrated (0 JS/JSX remaining)', type: 'improvement' },
      { text: 'GitHub API in-memory cache (1min TTL)', type: 'improvement' },
    ],
  },
  {
    version: '0.2.0',
    date: '2026-03-30',
    items: [
      { text: '82 console.log removed', type: 'fix' },
      { text: '50 tests added (auth, env, routes)', type: 'new' },
      { text: 'All branding updated to Numinia', type: 'fix' },
      { text: 'Security: upload-thumbnail auth added', type: 'fix' },
      { text: 'CORS conflict resolved', type: 'fix' },
    ],
  },
  {
    version: '0.1.0',
    date: '2026-03-29',
    items: [
      { text: 'SIWE wallet auth for admin', type: 'new' },
      { text: 'Asset upload (drag & drop)', type: 'new' },
      { text: 'Hide/show/delete/rename assets', type: 'new' },
      { text: 'Format filter buttons (GLB, VRM, HYP)', type: 'new' },
      { text: 'i18n fixed (static imports)', type: 'fix' },
      { text: 'OAuth CSRF protection', type: 'fix' },
      { text: 'Data repo organized (content/ folders)', type: 'improvement' },
    ],
  },
];

const TYPE_BADGE = {
  new: { label: 'NEW', className: 'bg-yellow-400 text-black hover:bg-yellow-400' },
  fix: { label: 'FIX', className: 'bg-red-100 text-red-700 hover:bg-red-100' },
  improvement: { label: 'UPD', className: 'bg-blue-100 text-blue-700 hover:bg-blue-100' },
};

export function Changelog() {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? CHANGELOG : CHANGELOG.slice(0, 1);

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">Updates</h3>
          <span className="text-xs text-gray-400">v{CHANGELOG[0].version}</span>
        </div>

        <div className="space-y-4">
          {visible.map((entry) => (
            <div key={entry.version}>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-xs font-mono font-bold">v{entry.version}</span>
                <span className="text-xs text-gray-400">{entry.date}</span>
              </div>
              <ul className="space-y-1">
                {entry.items.map((item, i) => {
                  const badge = TYPE_BADGE[item.type];
                  return (
                    <li key={i} className="flex items-start gap-2 text-xs">
                      <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 shrink-0 ${badge.className}`}>
                        {badge.label}
                      </Badge>
                      <span className="text-gray-600">{item.text}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        {CHANGELOG.length > 1 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-gray-400 hover:text-gray-600 mt-3 w-full text-center"
          >
            {expanded ? 'Show less' : `Show all versions (${CHANGELOG.length})`}
          </button>
        )}
      </CardContent>
    </Card>
  );
}
