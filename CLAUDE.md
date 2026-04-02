# CLAUDE.md — Numinia Digital Goods

> Context file for AI agents (Claude, Copilot, etc.) and human developers.
> Read this before touching any code. Updated: 2026-04-02.

---

## What this project is

**Numinia Digital Goods** is an open platform for CC0-licensed digital assets and an RPG metaverse hub. 3D models (GLB), avatars (VRM), Hyperfy apps (HYP), STL for 3D printing, audio, video, images. Built by [Numen Games](https://numen.games).

**Core philosophy: File Over App + Decentralized + Open Source**
- The app is a viewer/interface, not the source of truth
- Data lives in open files (JSON in GitHub, binaries on CDN/Arweave/IPFS)
- The app can be replaced; the files remain forever
- All code is MIT, all curated assets are CC0

**Live:** https://numinia.store

---

## Numinia Universe Context

> For deep understanding, read the canonical sources in `docs/seminal-documents/`.

Numinia Digital Goods exists within a larger universe. Understanding this context is essential for making coherent decisions about the platform.

**What Numen Games is:** An organizational experiment that uses gamification to transform how organizations work. Founded 2020 by five Oracles (co-founders). The core thesis: play is how humans learn, grow, and build better relationships.

**What Numinia is:** A city-state imagined as an RPG — the narrative projection of Numen Games' organizational model. The relationship follows a chain: **Operating System** (organizational need) → **Functional Model** (structural architecture) → **Narrative Projection** (the game/story that makes it tangible). These three are inseparable.

**Key structural elements:**
- **4 Guilds** (knowledge profiles): Alchemists, Exegetes, Procurators, Sentinels — each with 2 branches and 2 houses per branch (Basic Level Theory)
- **4 Factions** (fields of development): Hermeticists (Education), Heirs of Eleusis (Play), Stellar Circle (Organization), Neo-Atlantists (Art) — horizontal Prototype Theory arrangement with Play as prototype
- **5 Species:** Biomechanical, Humanitas, Reptilian, Cyanite, Spectral
- **15 Positions:** Guardian of the Gates, Pythia, Ambassador, Game Master, Legionary, Armonauta, Whisperer of Machines, Runner of the Veil, Archivist, Hermeneut, Mediator of the Prism, Cartographer of the Wind, Oniromant, Anacárquide, Ethnarch
- **4 Districts** (floating): Vitruvian (130m, Education), Ouroboros (40m, Play), Solomon (70m, Organization), Sycamore (100m, Art)
- **3 Forces:** Velo (psychic/spiritual), Umbral (physical/natural), Prisma (refractive/creative)
- **6 Ranks:** Nomad → Citizen → Pilgrim → Vernacular → Archon → Oracle

**Purpose:** Leveling up organizations to build better relationships.
**Mission:** Build games to make work better.
**Values:** Cosmic Harmony, Equability, Curiosity, Healthy Environments.
**Pillars:** Craft (art as driver), Learn (play to learn), Remix (copy and improve).
**Cause:** Digital Humanism.

**Game system (Numen):** Hybrid of PbtA + Carved from Brindlewood + D6 system. Collaborative narrative construction. Players co-create the world through Heterocósmica mechanics and Propp narrative functions.

**Calendar:** 13 lunar cycles × 29 days = 377 days/year. Key rituals: Dark Council (strategy, Mondays), Lunar Coven (creative play, Thursdays).

---

## Repository map (2 repos)

```
numinia-digital-goods          ← THIS REPO: Next.js 16 app (code only)
numinia-digital-goods-data     ← Data repo: JSON metadata + asset binaries + portals + characters
```

### Data repo structure
```
numinia-digital-goods-data/
├── data/
│   ├── projects.json                    ← project index
│   ├── assets/numinia-assets.json       ← GLB catalog
│   ├── avatars/numinia-avatars.json     ← VRM catalog
│   ├── worlds/numinia-worlds.json       ← HYP catalog
│   ├── audio/numinia-audio.json         ← audio catalog
│   ├── video/numinia-video.json         ← video catalog
│   ├── images/numinia-images.json       ← image catalog
│   ├── 3dprint/numinia-3dprint.json     ← STL catalog
│   ├── portals/numinia-portals.json     ← world map (4 districts, oncyber links)
│   └── characters/{wallet}.md           ← per-user character sheets (markdown)
├── content/
│   ├── models/      ← .glb files
│   ├── avatars/     ← .vrm files
│   ├── worlds/      ← .hyp files
│   ├── audio/       ← .mp3, .ogg
│   ├── video/       ← .mp4, .webm
│   ├── images/      ← .jpg, .png, .webp
│   ├── 3dprint/     ← .stl files
│   └── thumbnails/  ← .png previews
```

---

## Platform sections

| Section | URL | Purpose |
|---|---|---|
| Archive | `/en/archive` | Public gallery — browse, search, filter, download assets |
| Finder | `/en/finder` | File-level browser with batch download |
| Inspector | `/en/glbinspector` | GLB/VRM file inspector |
| L.A.P. | `/en/LAP` | Logged-in user panel (was "Admin") |
| Seasons | `/en/LAP/seasons` | Season Pass — Battle Pass with adventures, loot tracks, Stripe purchase |

### L.A.P. sidebar (top → bottom)
1. **Character** — RPG character sheet (markdown, editable, PDF/MD export)
2. **Portals** — Interactive world map (4 districts, 14 oncyber 3D worlds)
3. **Loot** — NFT collections (ERC-721/1155, linked assets)
4. **Seasons** — Season Pass (Battle Pass), adventure timeline, purchase flow
5. **Codex** — Game lore and documentation
6. **Assets** — Admin asset management (CRUD, tags, thumbnails)
7. **Archive** — Link to public gallery
8. Stats / Settings / Updates — bottom section

---

## Asset ID System (UUID v7)

Format: `ndg-{uuid-v7}` — Example: `ndg-019078e5-5a4c-7b00-8000-1a2b3c4d5e6f`

- RFC 9562 standard, 122 bits entropy, zero coordination
- `generateAssetId()` in `src/lib/asset-id.ts`
- `createAssetMetadata()` builds complete JSON entry with version, status, nft, storage, tags
- Old IDs (slug-timestamp, UUID v4) continue to work — backward compatible

---

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16.2.1, App Router, React 18, TypeScript |
| Styling | Tailwind CSS 3 + shadcn/ui (copied to `src/components/ui/`) |
| 3D | Three.js 0.162 + @pixiv/three-vrm + STL viewer |
| Auth | Thirdweb Connect v5 (sole auth — 350+ wallets, social login, email, passkeys) |
| Payments | Stripe Checkout (redirect mode, server-side webhook) |
| NFT Mint | Thirdweb SDK — ERC-1155 Drop on Base mainnet (claimTo) |
| Database | GitHub JSON (primary), Neon PostgreSQL via Drizzle ORM (enterprise, optional) |
| Cache | Upstash Redis (rate limiting, audit queue — fallback to in-memory) |
| Storage | GitHub (metadata), Cloudflare R2 (CDN), Arweave + IPFS (permanent) |
| Logging | Pino (structured JSON) + Sentry (error tracking, optional) |
| Env | Zod validation in `src/lib/env.ts` |
| i18n | Static imports in `src/lib/i18n.tsx` — EN + JA |
| Tests | Vitest 4 + RTL + jsdom — 173 tests |
| Deploy | Vercel |
| Legal | Numen Games S.L., Spanish law, GDPR compliant |

---

## Architecture decisions (do not change without discussion)

### 1. Data access: Repository Pattern + dual data sources
**New architecture (Phase 2, 2026-04-01):**
- `src/lib/data-source.ts` — factory: `getDataSource()` returns GitHub or DB repos
- `src/lib/repositories/types.ts` — 8 interfaces (IAssetRepo, IProjectRepo, etc.)
- `src/lib/repositories/github.repo.ts` — wraps `github-storage.ts`
- `src/lib/repositories/db.repo.ts` — Drizzle ORM queries against Neon PostgreSQL
- Feature flag: `DATABASE_URL` present = DB mode, absent = GitHub mode
- 14 API routes already migrated to use `getDataSource()` instead of direct imports

**Legacy (still works, still the default):**
`src/lib/github-storage.ts` — reads/writes JSON + markdown to data repo via GitHub API.
- Optimistic locking: retries 3x on 409 Conflict
- In-memory cache with 1min TTL, full invalidation on writes
- Routes using `fetchData`/`updateData` directly: presign, upload, characters, portals

### 2. Database schema (Neon PostgreSQL + Drizzle ORM)
- `src/db/schema.ts` — 13 tables, mirrors GitHub JSON structures
- `src/db/index.ts` — `getDb()` singleton, returns null if DATABASE_URL not configured
- `drizzle/` — SQL migrations (plain SQL, File Over App compatible)
- Key tables: `assets` (37 cols, flattened storage/nft for indexing), `projects`, `users`, `seasons`, `adventures`, `pass_holders`, `characters`, `portals`, `audit_events`

### 3. Shared state: Redis (Upstash)
- `src/lib/redis.ts` — singleton client, null if not configured
- `src/lib/rate-limit.ts` — Redis sorted sets (ZADD/ZRANGEBYSCORE) with in-memory fallback
- `src/lib/audit.ts` — Redis LPUSH queue with periodic GitHub flush
- All 14 rate-limited API routes use `await` for async Redis calls

### 4. Structured logging
- `src/lib/logger.ts` — Pino logger with `createLogger(module)` for scoped logs
- JSON output in production, pretty-print in development
- ~80 `console.error/warn` calls replaced across 37 files
- Sentry integration: `sentry.{client,server,edge}.config.ts` — activates only when `SENTRY_DSN` set

### 5. Asset URL resolution chain
`src/lib/assetUrls.ts`: Arweave TX → R2 CDN → GitHub raw fallback

### 6. 3D components are lazy-loaded
Always `next/dynamic({ ssr: false })`. Never static import for 3D.

### 7. i18n uses static imports
16 JSON files loaded statically. No dynamic `import()` with template literals.

### 8. Auth: Thirdweb Connect v5 (sole method)
- `tw_jwt` httpOnly cookie — JWT issued by Thirdweb Auth (SIWE under the hood)
- Admin wallets: `ADMIN_WALLET_ADDRESSES` env var (comma-separated)
- `requireRank(req, 'archon')` — **verifies JWT signature** via Thirdweb SDK, checks rank + ban
- `getAdminSession(req)` — sync, decodes JWT without verification (read-only checks only)
- `getUserSession(req)` — sync, decodes JWT without verification (non-critical reads)
- `verifyAdminSession(req)` — async, full JWT signature verification for elevated access
- CSRF: token set at Thirdweb login, verified by `verifyCsrf()` on all mutation routes
- Middleware (`tw_jwt` decode only): lightweight routing guard, NOT real auth enforcement

---

## Environment variables

See `.env.example`. Validated by Zod at runtime. All optional vars degrade gracefully.

| Variable | Required | Purpose |
|---|---|---|
| `GITHUB_REPO_OWNER` | Yes | Data repo owner |
| `GITHUB_REPO_NAME` | Yes | Data repo name |
| `GITHUB_TOKEN` | Yes | Read/write data repo |
| `ADMIN_WALLET_ADDRESSES` | No | Comma-separated ETH admin addresses |
| `R2_*` | No | Cloudflare R2 storage |
| `ARWEAVE_WALLET_KEY` | No | Arweave uploads (JWK JSON) |
| `IPFS_PIN_API_URL/KEY` | No | IPFS pinning (Pinata-compatible) |
| `DATABASE_URL` | No | Neon PostgreSQL (enables DB mode, falls back to GitHub) |
| `UPSTASH_REDIS_REST_URL` | No | Redis for shared rate limiting + audit |
| `UPSTASH_REDIS_REST_TOKEN` | No | Redis auth token |
| `SENTRY_DSN` | No | Error tracking + performance monitoring |
| `STRIPE_SECRET_KEY` | No | Stripe API key (season pass purchases) |
| `STRIPE_WEBHOOK_SECRET` | No | Stripe webhook signature verification |
| `THIRDWEB_SECRET_KEY` | No | Thirdweb server-side operations |
| `THIRDWEB_AUTH_DOMAIN` | No | SIWE domain for JWT verification |
| `THIRDWEB_AUTH_ADMIN_KEY` | No | Private key for signing Thirdweb JWTs |
| `NEXT_PUBLIC_THIRDWEB_CLIENT_ID` | No | Client-side Thirdweb ConnectButton |
| `SEASON_PASS_CONTRACT` | No | ERC-1155 contract address on Base |
| `SEASON_PASS_CHAIN_ID` | No | Chain ID (default: 8453 = Base mainnet) |
| `MINT_WALLET_PRIVATE_KEY` | No | Private key of wallet that mints NFTs |

---

## Current status (v0.15.0 — 2026-04-02)

### Platform features (done)
- ✅ Auth: Thirdweb Connect v5 (sole method — SIWE/GitHub OAuth removed)
- ✅ L.A.P.: Character Sheet, Portals Map, Loot, Seasons, Assets, Stats, Settings, Changelog
- ✅ Viewers: VRM, GLB, HYP (Files/Script/Props tabs), STL, Image (zoom/pan), audio, video
- ✅ Storage: R2 presigned (500MB), Arweave archive, IPFS pin
- ✅ Data: UUID v7, tags, optimistic locking, auto-thumbnails
- ✅ Seasons: Season Pass (Battle Pass), 8 adventures, free + premium loot, Stripe Checkout (9.99€)
- ✅ NFT Mint: Thirdweb SDK ERC-1155 Drop on Base mainnet (best-effort, degrades gracefully)
- ✅ Payments: Stripe Checkout → webhook → GitHub JSON + NFT mint
- ✅ Quality: 173 tests, 0 process.env bypasses, SECURITY.md, CONTRIBUTING.md, Dependabot
- ✅ Legal: Terms, Privacy, Cookie Policy + consent banner (Numen Games S.L.)
- ✅ Portals: 4 districts, 14 oncyber worlds, interactive SVG map
- ✅ Character: RPG ficha as markdown (File Over App), edit/view modes, PDF/MD export

### Enterprise migration (in progress — Phase 1+2 done)
- ✅ Phase 1A: Redis/Upstash — shared rate limiting + audit across serverless instances
- ✅ Phase 1B: CI/CD — GitHub Actions (type-check + test + license + audit + build)
- ✅ Phase 1C: Structured logging (Pino) + Sentry error tracking
- ✅ Phase 1D: Health check enhanced (GitHub + R2 + Redis)
- ✅ Phase 2A: Neon PostgreSQL schema (13 tables) + Drizzle ORM
- ✅ Phase 2B: Repository pattern + data source factory
- ✅ Phase 2D: 14 API routes migrated to repository pattern
- 🔲 Phase 2C: Data migration script (JSON → Postgres) — needs Neon configured
- 🔲 Phase 2E: GitHub sync (DB → JSON periodic export for File Over App)
- ✅ Phase 2F: Auth consolidated to Thirdweb Connect v5 (legacy SIWE + GitHub OAuth removed)
- 🔲 Phase 3: API versioning + OpenAPI + SDK + Inngest jobs + webhooks
- 🔲 Phase 4: Multi-creator + E2E tests + security hardening + dev portal

### Remaining (low priority)
| Task | Impact |
|---|---|
| 5 @ts-nocheck files (Three.js viewers, 8K lines) | Low |
| Upload Mixamo GLB to R2 (replace legacy FBX CDN) | Low |

---

## Key files for AI agents

### Data layer (start here when modifying data access)
| File | Purpose |
|---|---|
| `src/lib/data-source.ts` | **Entry point** — `getDataSource()` returns GitHub or DB repos |
| `src/lib/repositories/types.ts` | Repository interfaces (IAssetRepo, IProjectRepo, etc.) |
| `src/lib/repositories/github.repo.ts` | GitHub implementation (wraps github-storage.ts) |
| `src/lib/repositories/db.repo.ts` | PostgreSQL implementation (Drizzle queries) |
| `src/lib/github-storage.ts` | Legacy data CRUD (still used by routes not yet migrated) |
| `src/db/schema.ts` | Drizzle schema — 13 tables, the source of truth for DB structure |
| `src/db/index.ts` | `getDb()` — Neon client singleton |

### Infrastructure
| File | Purpose |
|---|---|
| `src/lib/env.ts` | Zod-validated env vars (all services registered here) |
| `src/lib/redis.ts` | Upstash Redis client (null if not configured) |
| `src/lib/rate-limit.ts` | Redis sorted sets + in-memory fallback |
| `src/lib/audit.ts` | Redis queue + GitHub flush |
| `src/lib/logger.ts` | Pino structured logger with `createLogger(module)` |
| `src/lib/auth/getSession.ts` | Session check (admin + user) |

### UI & features
| File | Purpose |
|---|---|
| `src/components/character/CharacterSheet.tsx` | RPG character sheet |
| `src/components/portals/PortalsMap.tsx` | Interactive world map |
| `src/components/asset/HypViewer.tsx` | .hyp viewer (Files/Script/Props) |
| `src/components/asset/ImageViewer.tsx` | Image zoom/pan/fullscreen |
| `src/components/asset/STLViewer.tsx` | STL 3D print viewer |
| `src/components/auth/ConnectWallet.tsx` | Thirdweb ConnectButton (sole auth UI) |
| `src/components/admin/AdminSidebar.tsx` | L.A.P. sidebar navigation |

### Seasons & Payments
| File | Purpose |
|---|---|
| `src/types/season.ts` | Season, Adventure, PassHolder, LootItem types |
| `src/lib/season-storage.ts` | Season data CRUD against GitHub data repo |
| `src/lib/thirdweb-mint.ts` | NFT minting service (ERC-1155 claimTo) |
| `src/lib/thirdweb-auth.ts` | Thirdweb JWT auth (SIWE + cookie) |
| `src/components/seasons/SeasonTimeline.tsx` | Adventure timeline UI + purchase flow |
| `src/app/api/seasons/route.ts` | GET season data + user progress |
| `src/app/api/seasons/checkout/route.ts` | POST Stripe Checkout session |
| `src/app/api/seasons/webhook/route.ts` | POST Stripe webhook (pass holder + NFT mint) |

---

## What NOT to do

- Do NOT commit `.env.local`
- Do NOT import 3D components statically — always `next/dynamic({ ssr: false })`
- Do NOT use `process.env.X` directly — use `env.ts`
- Do NOT write to `data/avatars.json` — use `updateAvatarInSource()`
- Do NOT bump to v1.0.0 without explicit user approval (versioning is a business decision)
- Do NOT delete dice files (Dice3D.tsx, DiceTapete.tsx, diceRoller.ts) — they were restored after accidental deletion

---

## Running locally

```bash
git clone https://github.com/PabloFMM/numinia-digital-goods.git
cd numinia-digital-goods
cp .env.example .env.local
npm install
npm run dev          # http://localhost:3000
npm run type-check   # TypeScript validation
npm test             # Vitest (190 tests)
npm run build        # Production build

# Optional enterprise services (all degrade gracefully without them):
# DATABASE_URL=...        → Neon PostgreSQL (otherwise GitHub JSON)
# UPSTASH_REDIS_REST_URL= → shared rate limiting (otherwise in-memory)
# SENTRY_DSN=...          → error tracking (otherwise console only)
```
