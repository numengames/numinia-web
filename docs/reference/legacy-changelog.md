# Legacy Platform Changelog — extracted data (v0.1.0 → v0.15.0)

> **Data extraction, not code reuse.** Source: hardcoded arrays inside the legacy component
> `src/components/admin/Changelog.tsx` (LAP → Updates panel, wallet-gated in production).
> Extracted 2026-08-14 under the Oracle's read-only exception so this history survives the
> condemned repository — the legacy violated File Over App by keeping its own history inside
> a client component. This file is the portable record.
>
> Entry types: **NEW** (feature) · **FIX** · **IMP** (improvement).
> The "Incoming" roadmap reflects intentions as of 2026-04-02; several lines (PostgreSQL
> migration, DB sync) belong to the path the rebuild ADRs have since discarded.

## Incoming roadmap (as displayed in v0.15.0)

| Item | Status |
|---|---|
| Data migration script (JSON → PostgreSQL) | planned |
| GitHub sync (DB → JSON periodic export for File Over App) | planned |
| Spanish (ES) translation | planned |
| Blog/content section para SEO long-tail | planned |
| Server-side pagination en API de assets | planned |
| Download counts visibles en gallery cards | planned |
| E2E tests with Playwright (critical user flows) | planned |
| Archive UX redesign (layout, filters, search) | planned |
| API versioning + OpenAPI playground | research |
| Multi-creator platform (user uploads + moderation) | research |
| Radicle.xyz — decentralized git (keep GitHub too) | research |
| On-chain season progress verification | planned |
| Multiple seasons support (sequential) | planned |
| Burn ritual — on-chain NFT burn mechanic | planned |

---

## v0.15.0 — 2026-04-02 22:00

- NEW — Season Pass (Battle Pass) — 8 adventures, free + premium loot tracks, burn ritual placeholder
- NEW — Stripe Checkout integration (9.99€ season pass purchase)
- NEW — Stripe webhook records pass holders in GitHub JSON
- NEW — NFT minting via Thirdweb SDK (ERC-1155 Drop on Base mainnet)
- NEW — Season timeline UI with adventure nodes, puzzle types, difficulty stars, hover tooltips
- NEW — Admin progress management panel for seasons
- NEW — Season data files in GitHub data repo (index, definition, progress)
- IMP — Season types with puzzle types, duration, difficulty, descriptions (EN + JA)
- IMP — Graceful degradation: Stripe, Thirdweb, NFT mint degrade independently
- IMP — Best-effort NFT minting pattern (pass works via JSON even if mint fails)
- IMP — LAPShell uses Thirdweb ConnectButton when configured (fallback to legacy)
- FIX — CSP: added *.thirdweb.com to connect-src (was blocking ConnectButton)
- FIX — Chain ID fixed from 84532 (testnet) to 8453 (Base mainnet)
- FIX — Webhook: enhanced structured logging for debugging pass holder recording
- FIX — SeasonTimeline: replaced 2s timeout with polling (5 retries, 2s intervals)
- FIX — Purchase banner shows "Processing..." until confirmed, then "Complete!"
- FIX — Auth consolidated to Thirdweb Connect v5 only — removed SIWE + GitHub OAuth legacy

## v0.14.0 — 2026-04-02 16:00

- NEW — 6-tier rank system: Nomad → Citizen → Pilgrim → Vernacular → Archon → Oracle
- NEW — Rank-based permissions across all admin actions and API routes
- NEW — Thirdweb Connect auth — 350+ wallets, embedded wallets, social login
- NEW — Neon PostgreSQL + Drizzle ORM schema (13 tables, dual data source)
- NEW — Repository pattern: getDataSource() factory (GitHub ↔ DB switchable)
- IMP — 14 API routes migrated to repository pattern
- NEW — Upstash Redis — shared rate limiting + audit queue across serverless
- IMP — Structured logging (Pino) replacing console.* across 37 files
- NEW — Sentry error tracking (optional, activates with SENTRY_DSN)
- IMP — Health endpoint now checks GitHub + R2 + Redis
- NEW — Billing section in LAP Settings (tabs, credits, invoices)
- NEW — Data migration script (JSON → Postgres) + GitHub sync
- IMP — Season Pass chain switched to Base mainnet (8453)
- FIX — Oracle protection — cannot be banned at any layer
- FIX — Wallet users registered as Nomad (not Citizen), rank enforcement fixed
- FIX — Complete logout clears all auth cookies, prevents admin re-entry
- FIX — Stats counter and user list dark mode fixed
- IMP — 190 tests across 19 files (was 158/18)

## v0.13.0 — 2026-04-02 03:30

- NEW — Dynamic [locale] routing — all pages now support any locale via URL segment
- NEW — i18n: added Korean, Chinese, Portuguese, and German translations
- IMP — i18n: complete coverage for gallery, actions, viewer, and finder components
- NEW — LAP admin UI fully translated + compact language dropdown in Settings
- NEW — Language selector persists preference via cookie
- IMP — Skeleton screens replace spinner loading states across the platform
- IMP — Gallery card micro-interactions (hover scale, shadow transitions)
- IMP — Blur placeholder (LQIP) replaces animate-pulse for image loading
- NEW — Error pages (404, 500) with branded design + global-error boundary
- IMP — Accessibility: improved touch targets and keyboard navigation
- FIX — API routes hardened with error boundaries and input validation
- FIX — Dark mode: Assets admin dashboard, logo, Khepri icon inversions fixed
- FIX — Fallback image unified to /placeholder.png (removed picsum.photos)
- FIX — Page transitions, header height, and loading screen text color fixed
- IMP — PWA manifest improvements + visual consistency polish
- FIX — AdminSidebar: removed stale href/label references

## v0.12.0 — 2026-04-01 23:00

- NEW — Aviso Legal LSSI-CE — NIF, domicilio, Registro Mercantil de Numen Games S.L.
- IMP — Health endpoint upgraded — checks GitHub API + R2 CDN with latency
- NEW — Privacy Policy — international data transfers (GDPR Art. 44-49) documented
- IMP — Cookie consent redesigned — floating card, accept/reject, auditable record
- IMP — Thumbnails migrated to Next.js <Image> — WebP/AVIF, responsive srcset
- NEW — ThumbnailImage component — reusable with auto-fallback to placeholder
- NEW — Breadcrumb navigation on asset detail pages (EN + JA)
- IMP — Cache headers: stale-while-revalidate on assets, portals, collections API
- NEW — Vercel Analytics + Speed Insights integrated
- NEW — CI: license-checker gate (blocks GPL/LGPL/AGPL/SSPL)
- NEW — CI: Vitest coverage reporting with @vitest/coverage-v8
- IMP — CI: npm audit now blocking (was continue-on-error)
- NEW — prefers-reduced-motion — disables all animations (WCAG 2.1)
- IMP — llms.txt expanded — FAQ, all API endpoints, AI agent instructions
- IMP — next.config.js — 9 new remotePatterns (R2, Arweave, IPFS domains)
- NEW — Consent utility (consent.ts) — getConsentRecord, hasAnalyticsConsent
- FIX — Finder: avatar selection stuck on first click — feedback loop fixed
- FIX — Aviso Legal link added to footer

## v0.11.0 — 2026-04-01 12:00

- NEW — Security hardening: HMAC cookie signing, rate limiting, CSRF protection
- FIX — Security: MIME validation, URL allowlist, path traversal fix, SSRF fix
- FIX — Security: 15 vulnerabilities fixed (5 critical, 6 high, 5 medium)
- NEW — Storage redundancy: sync R2 ↔ GitHub with one-click buttons
- NEW — Bulk sync: "Sync N" button syncs all assets to missing layers
- NEW — Redundancy Health dashboard in Stats (progress bar + counts)
- IMP — SEO: sitemap updated, hreflang, canonical URLs, home page SSR
- NEW — AI SEO: llms.txt + OpenAPI docs (/openapi.json)
- IMP — Accessibility: aria-labels on all viewers, skip-to-content, focus trap
- NEW — Health check endpoint: GET /api/health
- IMP — CI: GitHub Actions pinned to SHA (supply chain security)
- NEW — Backfill hashes script (SHA-256 for all assets)
- IMP — Three.js skipped on mobile (saves ~2MB)
- FIX — Hardcoded "991+" counts removed (generic CC0 text)
- FIX — All /gallery links migrated to /archive
- FIX — Prisma dead config removed from next.config.js
- NEW — Discord-style avatar crop modal (react-easy-crop)
- IMP — Dice roll buttons always visible on character stats
- NEW — Portals: interactive steampunk world map (4 districts, 14 portals)
- IMP — 158 tests across 18 files

## v0.10.0 — 2026-03-31 01:30

- NEW — Character Sheet — editable RPG ficha stored as markdown (File Over App)
- NEW — Character Sheet — profile picture, view/edit modes, export MD + PDF
- NEW — .hyp viewer rewrite — Files/Script/Props tabs (madjin-style)
- NEW — ImageViewer — zoom, pan, fullscreen, download controls
- NEW — Tags filter in gallery sidebar + admin dashboard
- NEW — Tags display on gallery mini-cards + admin table
- NEW — L.A.P. — admin renamed, new /LAP route + header nav
- NEW — Archive — gallery renamed to /archive + header nav
- NEW — Portals section placeholder (Hyperfy worlds)
- IMP — Loot section (renamed from Digital Goods)
- IMP — Sidebar reorganized: Character → Portals → Loot → Assets → Archive
- IMP — Upload merged into Assets view (inline panel)
- FIX — Tags not persisting after save — fixed schema + API response
- FIX — Auto-thumbnail not triggering — fixed stale state + proxy allowlist
- FIX — Audio/video autoplay removed
- IMP — 22 Resources pages rewritten with Numinia content
- IMP — Favicon unified with numen.games (Khepri)

## v0.9.0 — 2026-03-31 22:30

- NEW — User login flow (wallet + GitHub, any user)
- NEW — User profile page (/en/profile)
- NEW — NFT ownership check API (Base chain RPC)
- NEW — Digital Goods admin section (collections, unlinked assets)
- NEW — STL 3D printing viewer + upload support
- NEW — Hyperfy .hyp metadata panel (toggleable)
- NEW — IPFS pin + Arweave archive endpoints
- NEW — Tags system for assets (animation, emote, etc.)
- NEW — Legal pages (Terms, Privacy, Cookies) + consent banner
- NEW — 6 Mixamo animations activated (was 1)
- FIX — JPG/PNG image preview in gallery, finder, admin
- FIX — Markdown XSS vulnerability fixed (sanitize: true)
- IMP — 138 tests across 15 files (was 63)
- IMP — 0 process.env bypasses (all through env.ts Zod)
- FIX — 208 console.log removed from 3D viewers
- FIX — Optimistic locking on GitHub writes (retry on 409)
- FIX — All ToxSam branding replaced (app + docs + footer + seo)
- IMP — Favicon unified with numen.games (Khepri icon)
- IMP — 22 Resources pages rewritten with Numinia content
- NEW — SECURITY.md + CONTRIBUTING.md + Dependabot

## v0.8.0 — 2026-03-31 19:30

- NEW — Favorites system (heart button on gallery cards)
- NEW — Favorites filter toggle with counter
- NEW — NFT fields in admin modal (chain, contract, token ID, type)
- NEW — OpenSea link auto-generated from NFT data
- NEW — Mobile responsive sidebar (hamburger menu + backdrop)
- IMP — Unified wallet login design (gallery = admin)

## v0.7.0 — 2026-03-31 14:00

- NEW — Claude-style admin sidebar with 5 sections
- NEW — Centered draggable modal for asset detail
- NEW — Gallery mini-cards grid layout
- NEW — Stats dashboard (totals, by type, storage layers)
- NEW — Settings page (profile, platform toggles, about)
- NEW — Notification badge on Updates
- FIX — Creator, license, status, version now persist on save
- IMP — Asset count moved to filter bar

## v0.6.0 — 2026-03-30 22:00

- NEW — Mixamo animations for VRM avatars (auto-play on load)
- NEW — Floating detail panel with 3D/audio/video preview
- NEW — Zod validation for all data repo JSON schemas
- IMP — View toggle moved next to filter buttons
- IMP — Tooltips on admin UI elements
- FIX — Debug endpoint protected
- FIX — .env.example updated with all variables
- IMP — Storage/status/version/NFT fields passed to frontend

## v0.5.0 — 2026-03-30 18:00

- NEW — Audio player with waveform visualizer
- NEW — Video player in gallery and finder
- NEW — Admin table view with sortable columns
- NEW — Gallery/Table view toggle
- NEW — Storage layer badges on asset cards
- IMP — Upload feedback: active layer + asset ID
- FIX — Audio/Video/Worlds visible in gallery sidebar
- IMP — PageSpeed: deferred hero VRM load

## v0.4.0 — 2026-03-30 14:00

- NEW — R2 cloud storage (up to 500MB)
- NEW — UUID v7 asset ID system (RFC 9562)
- NEW — SHA-256 file integrity verification
- NEW — Asset stats endpoint
- IMP — Upload progress bar

## v0.3.0 — 2026-03-30 11:00

- IMP — PreviewPanel split (1943→1025 lines)
- IMP — 44→1 any types eliminated
- IMP — 5 JSX→TSX migrated
- IMP — GitHub API in-memory cache

## v0.2.0 — 2026-03-30 08:00

- FIX — 82 console.log removed
- NEW — 50 tests added
- FIX — All branding updated to Numinia
- FIX — Security: upload-thumbnail auth

## v0.1.0 — 2026-03-29 20:00

- NEW — SIWE wallet auth for admin
- NEW — Asset upload (drag & drop)
- NEW — Hide/show/delete/rename assets
- FIX — i18n fixed (static imports)
- FIX — OAuth CSRF protection

---

## Observations for the rebuild (recorded, not actionable here)

1. **File Over App violation**: the platform's own history lived inside a `'use client'` component. The rebuild should treat its changelog as data from day one (markdown/JSON in the repo or data repo, rendered by the app).
2. Dates in v0.9.0/v0.10.0 are internally inconsistent in the source (v0.10.0 dated 01:30 of the same day v0.9.0 is dated 22:30) — preserved as-is; the extraction does not correct the record.
3. The test-count claims in the changelog (190 tests / 19 files at v0.14.0) exceed what exists at HEAD (173 / 17 per legacy docs) — a reminder that unverified claims drift.
