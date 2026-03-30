'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';

type ChangelogEntry = {
  version: string;
  date: string;
  time: string;
  items: { text: string; type: 'new' | 'fix' | 'improvement' }[];
};

type IncomingItem = {
  text: string;
  status: 'planned' | 'in-progress' | 'research';
};

const INCOMING: IncomingItem[] = [
  { text: 'Character Sheet — editable markdown ficha, profile pic, PDF export', status: 'in-progress' },
  { text: 'Character Sheet — dice rolls (D6 pool) in web', status: 'planned' },
  { text: 'Archive UX redesign (layout, filters, search)', status: 'planned' },
  { text: 'Finder UX improvements', status: 'planned' },
  { text: 'Upload Mixamo GLB animations to R2 (replace legacy FBX)', status: 'planned' },
  { text: 'On-chain NFT ownership display in user profile', status: 'research' },
  { text: 'Arweave bulk archive for existing assets', status: 'research' },
];

const CHANGELOG: ChangelogEntry[] = [
  {
    version: '0.9.0',
    date: '2026-03-31',
    time: '22:30',
    items: [
      { text: 'User login flow (wallet + GitHub, any user)', type: 'new' },
      { text: 'User profile page (/en/profile)', type: 'new' },
      { text: 'NFT ownership check API (Base chain RPC)', type: 'new' },
      { text: 'Digital Goods admin section (collections, unlinked assets)', type: 'new' },
      { text: 'STL 3D printing viewer + upload support', type: 'new' },
      { text: 'Hyperfy .hyp metadata panel (toggleable)', type: 'new' },
      { text: 'IPFS pin + Arweave archive endpoints', type: 'new' },
      { text: 'Tags system for assets (animation, emote, etc.)', type: 'new' },
      { text: 'Legal pages (Terms, Privacy, Cookies) + consent banner', type: 'new' },
      { text: '6 Mixamo animations activated (was 1)', type: 'new' },
      { text: 'JPG/PNG image preview in gallery, finder, admin', type: 'fix' },
      { text: 'Markdown XSS vulnerability fixed (sanitize: true)', type: 'fix' },
      { text: '138 tests across 15 files (was 63)', type: 'improvement' },
      { text: '0 process.env bypasses (all through env.ts Zod)', type: 'improvement' },
      { text: '208 console.log removed from 3D viewers', type: 'fix' },
      { text: 'Optimistic locking on GitHub writes (retry on 409)', type: 'fix' },
      { text: 'All ToxSam branding replaced (app + docs + footer + seo)', type: 'fix' },
      { text: 'Favicon unified with numen.games (Khepri icon)', type: 'improvement' },
      { text: '22 Resources pages rewritten with Numinia content', type: 'improvement' },
      { text: 'SECURITY.md + CONTRIBUTING.md + Dependabot', type: 'new' },
    ],
  },
  {
    version: '0.8.0',
    date: '2026-03-31',
    time: '19:30',
    items: [
      { text: 'Favorites system (heart button on gallery cards)', type: 'new' },
      { text: 'Favorites filter toggle with counter', type: 'new' },
      { text: 'NFT fields in admin modal (chain, contract, token ID, type)', type: 'new' },
      { text: 'OpenSea link auto-generated from NFT data', type: 'new' },
      { text: 'Mobile responsive sidebar (hamburger menu + backdrop)', type: 'new' },
      { text: 'Unified wallet login design (gallery = admin)', type: 'improvement' },
    ],
  },
  {
    version: '0.7.0',
    date: '2026-03-31',
    time: '14:00',
    items: [
      { text: 'Claude-style admin sidebar with 5 sections', type: 'new' },
      { text: 'Centered draggable modal for asset detail', type: 'new' },
      { text: 'Gallery mini-cards grid layout', type: 'new' },
      { text: 'Stats dashboard (totals, by type, storage layers)', type: 'new' },
      { text: 'Settings page (profile, platform toggles, about)', type: 'new' },
      { text: 'Notification badge on Updates', type: 'new' },
      { text: 'Creator, license, status, version now persist on save', type: 'fix' },
      { text: 'Asset count moved to filter bar', type: 'improvement' },
    ],
  },
  {
    version: '0.6.0',
    date: '2026-03-30',
    time: '22:00',
    items: [
      { text: 'Mixamo animations for VRM avatars (auto-play on load)', type: 'new' },
      { text: 'Floating detail panel with 3D/audio/video preview', type: 'new' },
      { text: 'Zod validation for all data repo JSON schemas', type: 'new' },
      { text: 'View toggle moved next to filter buttons', type: 'improvement' },
      { text: 'Tooltips on admin UI elements', type: 'improvement' },
      { text: 'Debug endpoint protected', type: 'fix' },
      { text: '.env.example updated with all variables', type: 'fix' },
      { text: 'Storage/status/version/NFT fields passed to frontend', type: 'improvement' },
    ],
  },
  {
    version: '0.5.0',
    date: '2026-03-30',
    time: '18:00',
    items: [
      { text: 'Audio player with waveform visualizer', type: 'new' },
      { text: 'Video player in gallery and finder', type: 'new' },
      { text: 'Admin table view with sortable columns', type: 'new' },
      { text: 'Gallery/Table view toggle', type: 'new' },
      { text: 'Storage layer badges on asset cards', type: 'new' },
      { text: 'Upload feedback: active layer + asset ID', type: 'improvement' },
      { text: 'Audio/Video/Worlds visible in gallery sidebar', type: 'fix' },
      { text: 'PageSpeed: deferred hero VRM load', type: 'improvement' },
    ],
  },
  {
    version: '0.4.0',
    date: '2026-03-30',
    time: '14:00',
    items: [
      { text: 'R2 cloud storage (up to 500MB)', type: 'new' },
      { text: 'UUID v7 asset ID system (RFC 9562)', type: 'new' },
      { text: 'SHA-256 file integrity verification', type: 'new' },
      { text: 'Asset stats endpoint', type: 'new' },
      { text: 'Upload progress bar', type: 'improvement' },
    ],
  },
  {
    version: '0.3.0',
    date: '2026-03-30',
    time: '11:00',
    items: [
      { text: 'PreviewPanel split (1943\u21921025 lines)', type: 'improvement' },
      { text: '44\u21921 any types eliminated', type: 'improvement' },
      { text: '5 JSX\u2192TSX migrated', type: 'improvement' },
      { text: 'GitHub API in-memory cache', type: 'improvement' },
    ],
  },
  {
    version: '0.2.0',
    date: '2026-03-30',
    time: '08:00',
    items: [
      { text: '82 console.log removed', type: 'fix' },
      { text: '50 tests added', type: 'new' },
      { text: 'All branding updated to Numinia', type: 'fix' },
      { text: 'Security: upload-thumbnail auth', type: 'fix' },
    ],
  },
  {
    version: '0.1.0',
    date: '2026-03-29',
    time: '20:00',
    items: [
      { text: 'SIWE wallet auth for admin', type: 'new' },
      { text: 'Asset upload (drag & drop)', type: 'new' },
      { text: 'Hide/show/delete/rename assets', type: 'new' },
      { text: 'i18n fixed (static imports)', type: 'fix' },
      { text: 'OAuth CSRF protection', type: 'fix' },
    ],
  },
];

const TYPE_BADGE = {
  new: { label: 'NEW', className: 'bg-yellow-400 text-black' },
  fix: { label: 'FIX', className: 'bg-red-100 text-red-700' },
  improvement: { label: 'UPD', className: 'bg-blue-100 text-blue-700' },
};

const STATUS_BADGE = {
  'planned': { label: 'PLANNED', className: 'bg-purple-100 text-purple-700' },
  'in-progress': { label: 'IN PROGRESS', className: 'bg-yellow-100 text-yellow-800' },
  'research': { label: 'RESEARCH', className: 'bg-gray-100 text-gray-600' },
};

// Export for notification badge
export const LATEST_VERSION = CHANGELOG[0].version;
export const CHANGELOG_DATA = CHANGELOG;

export function Changelog() {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? CHANGELOG : CHANGELOG.slice(0, 3);

  return (
    <div className="space-y-4">
      {/* Incoming — roadmap card */}
      <div className="rounded-lg border border-dashed border-purple-300 dark:border-purple-700 bg-purple-50/50 dark:bg-purple-950/20 overflow-hidden">
        <div className="px-4 py-3 border-b border-purple-200 dark:border-purple-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold font-mono text-purple-800 dark:text-purple-300">Incoming</span>
            <Badge variant="secondary" className="bg-purple-200 text-purple-800 dark:bg-purple-800 dark:text-purple-200 text-[9px]">Roadmap</Badge>
          </div>
        </div>
        <div className="px-4 py-3">
          <ul className="space-y-1.5">
            {INCOMING.map((item, i) => {
              const badge = STATUS_BADGE[item.status];
              return (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <Badge variant="secondary" className={`text-[9px] px-1.5 py-0 shrink-0 mt-0.5 ${badge.className}`}>
                    {badge.label}
                  </Badge>
                  <span className="text-gray-600 dark:text-gray-400">{item.text}</span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {/* Released versions */}
      {visible.map((entry) => (
        <div
          key={entry.version}
          className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden"
        >
          {/* Card header */}
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold font-mono text-gray-900 dark:text-white">v{entry.version}</span>
              {entry === CHANGELOG[0] && (
                <Badge variant="secondary" className="bg-green-100 text-green-700 text-[9px]">Latest</Badge>
              )}
            </div>
            <span className="text-xs text-gray-400">{entry.date} &middot; {entry.time} <span title="Coordinated Universal Time" className="cursor-help">UTC</span></span>
          </div>

          {/* Card body */}
          <div className="px-4 py-3">
            <ul className="space-y-1.5">
              {entry.items.map((item, i) => {
                const badge = TYPE_BADGE[item.type];
                return (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <Badge variant="secondary" className={`text-[9px] px-1.5 py-0 shrink-0 mt-0.5 ${badge.className}`}>
                      {badge.label}
                    </Badge>
                    <span className="text-gray-600 dark:text-gray-400">{item.text}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      ))}

      {CHANGELOG.length > 3 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="text-xs text-gray-400 hover:text-gray-600 w-full text-center py-2"
        >
          {showAll ? 'Show less' : `Show all ${CHANGELOG.length} versions`}
        </button>
      )}
    </div>
  );
}
