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
  { text: 'Data migration script (JSON → PostgreSQL)', status: 'planned' },
  { text: 'GitHub sync (DB → JSON periodic export for File Over App)', status: 'planned' },
  { text: 'Spanish (ES) translation', status: 'planned' },
  { text: 'Blog/content section para SEO long-tail', status: 'planned' },
  { text: 'Server-side pagination en API de assets', status: 'planned' },
  { text: 'Download counts visibles en gallery cards', status: 'planned' },
  { text: 'E2E tests with Playwright (critical user flows)', status: 'planned' },
  { text: 'Archive UX redesign (layout, filters, search)', status: 'planned' },
  { text: 'API versioning + OpenAPI playground', status: 'research' },
  { text: 'Multi-creator platform (user uploads + moderation)', status: 'research' },
  { text: 'Radicle.xyz — decentralized git (keep GitHub too)', status: 'research' },
  { text: 'On-chain season progress verification', status: 'planned' },
  { text: 'Multiple seasons support (sequential)', status: 'planned' },
  { text: 'Burn ritual — on-chain NFT burn mechanic', status: 'planned' },
];

const CHANGELOG: ChangelogEntry[] = [
  {
    version: '0.15.0',
    date: '2026-04-02',
    time: '22:00',
    items: [
      { text: 'Season Pass (Battle Pass) — 8 adventures, free + premium loot tracks, burn ritual placeholder', type: 'new' },
      { text: 'Stripe Checkout integration (9.99€ season pass purchase)', type: 'new' },
      { text: 'Stripe webhook records pass holders in GitHub JSON', type: 'new' },
      { text: 'NFT minting via Thirdweb SDK (ERC-1155 Drop on Base mainnet)', type: 'new' },
      { text: 'Season timeline UI with adventure nodes, puzzle types, difficulty stars, hover tooltips', type: 'new' },
      { text: 'Admin progress management panel for seasons', type: 'new' },
      { text: 'Season data files in GitHub data repo (index, definition, progress)', type: 'new' },
      { text: 'Season types with puzzle types, duration, difficulty, descriptions (EN + JA)', type: 'improvement' },
      { text: 'Graceful degradation: Stripe, Thirdweb, NFT mint degrade independently', type: 'improvement' },
      { text: 'Best-effort NFT minting pattern (pass works via JSON even if mint fails)', type: 'improvement' },
      { text: 'LAPShell uses Thirdweb ConnectButton when configured (fallback to legacy)', type: 'improvement' },
      { text: 'CSP: added *.thirdweb.com to connect-src (was blocking ConnectButton)', type: 'fix' },
      { text: 'Chain ID fixed from 84532 (testnet) to 8453 (Base mainnet)', type: 'fix' },
      { text: 'Webhook: enhanced structured logging for debugging pass holder recording', type: 'fix' },
      { text: 'SeasonTimeline: replaced 2s timeout with polling (5 retries, 2s intervals)', type: 'fix' },
      { text: 'Purchase banner shows "Processing..." until confirmed, then "Complete!"', type: 'fix' },
      { text: 'Auth consolidated to Thirdweb Connect v5 only — removed SIWE + GitHub OAuth legacy', type: 'fix' },
    ],
  },
  {
    version: '0.14.0',
    date: '2026-04-02',
    time: '16:00',
    items: [
      { text: '6-tier rank system: Nomad → Citizen → Pilgrim → Vernacular → Archon → Oracle', type: 'new' },
      { text: 'Rank-based permissions across all admin actions and API routes', type: 'new' },
      { text: 'Thirdweb Connect auth — 350+ wallets, embedded wallets, social login', type: 'new' },
      { text: 'Neon PostgreSQL + Drizzle ORM schema (13 tables, dual data source)', type: 'new' },
      { text: 'Repository pattern: getDataSource() factory (GitHub ↔ DB switchable)', type: 'new' },
      { text: '14 API routes migrated to repository pattern', type: 'improvement' },
      { text: 'Upstash Redis — shared rate limiting + audit queue across serverless', type: 'new' },
      { text: 'Structured logging (Pino) replacing console.* across 37 files', type: 'improvement' },
      { text: 'Sentry error tracking (optional, activates with SENTRY_DSN)', type: 'new' },
      { text: 'Health endpoint now checks GitHub + R2 + Redis', type: 'improvement' },
      { text: 'Billing section in LAP Settings (tabs, credits, invoices)', type: 'new' },
      { text: 'Data migration script (JSON → Postgres) + GitHub sync', type: 'new' },
      { text: 'Season Pass chain switched to Base mainnet (8453)', type: 'improvement' },
      { text: 'Oracle protection — cannot be banned at any layer', type: 'fix' },
      { text: 'Wallet users registered as Nomad (not Citizen), rank enforcement fixed', type: 'fix' },
      { text: 'Complete logout clears all auth cookies, prevents admin re-entry', type: 'fix' },
      { text: 'Stats counter and user list dark mode fixed', type: 'fix' },
      { text: '190 tests across 19 files (was 158/18)', type: 'improvement' },
    ],
  },
  {
    version: '0.13.0',
    date: '2026-04-02',
    time: '03:30',
    items: [
      { text: 'Dynamic [locale] routing — all pages now support any locale via URL segment', type: 'new' },
      { text: 'i18n: added Korean, Chinese, Portuguese, and German translations', type: 'new' },
      { text: 'i18n: complete coverage for gallery, actions, viewer, and finder components', type: 'improvement' },
      { text: 'LAP admin UI fully translated + compact language dropdown in Settings', type: 'new' },
      { text: 'Language selector persists preference via cookie', type: 'new' },
      { text: 'Skeleton screens replace spinner loading states across the platform', type: 'improvement' },
      { text: 'Gallery card micro-interactions (hover scale, shadow transitions)', type: 'improvement' },
      { text: 'Blur placeholder (LQIP) replaces animate-pulse for image loading', type: 'improvement' },
      { text: 'Error pages (404, 500) with branded design + global-error boundary', type: 'new' },
      { text: 'Accessibility: improved touch targets and keyboard navigation', type: 'improvement' },
      { text: 'API routes hardened with error boundaries and input validation', type: 'fix' },
      { text: 'Dark mode: Assets admin dashboard, logo, Khepri icon inversions fixed', type: 'fix' },
      { text: 'Fallback image unified to /placeholder.png (removed picsum.photos)', type: 'fix' },
      { text: 'Page transitions, header height, and loading screen text color fixed', type: 'fix' },
      { text: 'PWA manifest improvements + visual consistency polish', type: 'improvement' },
      { text: 'AdminSidebar: removed stale href/label references', type: 'fix' },
    ],
  },
  {
    version: '0.12.0',
    date: '2026-04-01',
    time: '23:00',
    items: [
      { text: 'Aviso Legal LSSI-CE — NIF, domicilio, Registro Mercantil de Numen Games S.L.', type: 'new' },
      { text: 'Health endpoint upgraded — checks GitHub API + R2 CDN with latency', type: 'improvement' },
      { text: 'Privacy Policy — international data transfers (GDPR Art. 44-49) documented', type: 'new' },
      { text: 'Cookie consent redesigned — floating card, accept/reject, auditable record', type: 'improvement' },
      { text: 'Thumbnails migrated to Next.js <Image> — WebP/AVIF, responsive srcset', type: 'improvement' },
      { text: 'ThumbnailImage component — reusable with auto-fallback to placeholder', type: 'new' },
      { text: 'Breadcrumb navigation on asset detail pages (EN + JA)', type: 'new' },
      { text: 'Cache headers: stale-while-revalidate on assets, portals, collections API', type: 'improvement' },
      { text: 'Vercel Analytics + Speed Insights integrated', type: 'new' },
      { text: 'CI: license-checker gate (blocks GPL/LGPL/AGPL/SSPL)', type: 'new' },
      { text: 'CI: Vitest coverage reporting with @vitest/coverage-v8', type: 'new' },
      { text: 'CI: npm audit now blocking (was continue-on-error)', type: 'improvement' },
      { text: 'prefers-reduced-motion — disables all animations (WCAG 2.1)', type: 'new' },
      { text: 'llms.txt expanded — FAQ, all API endpoints, AI agent instructions', type: 'improvement' },
      { text: 'next.config.js — 9 new remotePatterns (R2, Arweave, IPFS domains)', type: 'improvement' },
      { text: 'Consent utility (consent.ts) — getConsentRecord, hasAnalyticsConsent', type: 'new' },
      { text: 'Finder: avatar selection stuck on first click — feedback loop fixed', type: 'fix' },
      { text: 'Aviso Legal link added to footer', type: 'fix' },
    ],
  },
  {
    version: '0.11.0',
    date: '2026-04-01',
    time: '12:00',
    items: [
      { text: 'Security hardening: HMAC cookie signing, rate limiting, CSRF protection', type: 'new' },
      { text: 'Security: MIME validation, URL allowlist, path traversal fix, SSRF fix', type: 'fix' },
      { text: 'Security: 15 vulnerabilities fixed (5 critical, 6 high, 5 medium)', type: 'fix' },
      { text: 'Storage redundancy: sync R2 ↔ GitHub with one-click buttons', type: 'new' },
      { text: 'Bulk sync: "Sync N" button syncs all assets to missing layers', type: 'new' },
      { text: 'Redundancy Health dashboard in Stats (progress bar + counts)', type: 'new' },
      { text: 'SEO: sitemap updated, hreflang, canonical URLs, home page SSR', type: 'improvement' },
      { text: 'AI SEO: llms.txt + OpenAPI docs (/openapi.json)', type: 'new' },
      { text: 'Accessibility: aria-labels on all viewers, skip-to-content, focus trap', type: 'improvement' },
      { text: 'Health check endpoint: GET /api/health', type: 'new' },
      { text: 'CI: GitHub Actions pinned to SHA (supply chain security)', type: 'improvement' },
      { text: 'Backfill hashes script (SHA-256 for all assets)', type: 'new' },
      { text: 'Three.js skipped on mobile (saves ~2MB)', type: 'improvement' },
      { text: 'Hardcoded "991+" counts removed (generic CC0 text)', type: 'fix' },
      { text: 'All /gallery links migrated to /archive', type: 'fix' },
      { text: 'Prisma dead config removed from next.config.js', type: 'fix' },
      { text: 'Discord-style avatar crop modal (react-easy-crop)', type: 'new' },
      { text: 'Dice roll buttons always visible on character stats', type: 'improvement' },
      { text: 'Portals: interactive steampunk world map (4 districts, 14 portals)', type: 'new' },
      { text: '158 tests across 18 files', type: 'improvement' },
    ],
  },
  {
    version: '0.10.0',
    date: '2026-03-31',
    time: '01:30',
    items: [
      { text: 'Character Sheet — editable RPG ficha stored as markdown (File Over App)', type: 'new' },
      { text: 'Character Sheet — profile picture, view/edit modes, export MD + PDF', type: 'new' },
      { text: '.hyp viewer rewrite — Files/Script/Props tabs (madjin-style)', type: 'new' },
      { text: 'ImageViewer — zoom, pan, fullscreen, download controls', type: 'new' },
      { text: 'Tags filter in gallery sidebar + admin dashboard', type: 'new' },
      { text: 'Tags display on gallery mini-cards + admin table', type: 'new' },
      { text: 'L.A.P. — admin renamed, new /LAP route + header nav', type: 'new' },
      { text: 'Archive — gallery renamed to /archive + header nav', type: 'new' },
      { text: 'Portals section placeholder (Hyperfy worlds)', type: 'new' },
      { text: 'Loot section (renamed from Digital Goods)', type: 'improvement' },
      { text: 'Sidebar reorganized: Character → Portals → Loot → Assets → Archive', type: 'improvement' },
      { text: 'Upload merged into Assets view (inline panel)', type: 'improvement' },
      { text: 'Tags not persisting after save — fixed schema + API response', type: 'fix' },
      { text: 'Auto-thumbnail not triggering — fixed stale state + proxy allowlist', type: 'fix' },
      { text: 'Audio/video autoplay removed', type: 'fix' },
      { text: '22 Resources pages rewritten with Numinia content', type: 'improvement' },
      { text: 'Favicon unified with numen.games (Khepri)', type: 'improvement' },
    ],
  },
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
