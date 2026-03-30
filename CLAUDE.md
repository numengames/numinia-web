# CLAUDE.md — Numinia Digital Goods

> Context file for AI agents (Claude, Copilot, etc.) and human developers.
> Read this before touching any code. Updated: 2026-03-30.

---

## What this project is

**Numinia Digital Goods** is a platform for CC0-licensed digital assets: 3D models (GLB), avatars (VRM), Hyperfy worlds (HYP), audio, and video. Fork of [ToxSam/os3a-gallery](https://github.com/ToxSam/os3a-gallery), rebranded and extended.

**Core philosophy: File Over App + Decentralized**
- The app is a viewer/interface, not the source of truth
- Data lives in open files (JSON in GitHub, binaries on CDN/Arweave)
- The app can be replaced; the files remain forever

**Live:** https://numinia.store

---

## Repository map (2 repos)

```
numinia-digital-goods          ← THIS REPO: Next.js 16 app (code only)
numinia-digital-goods-data     ← Data repo: JSON metadata + asset binaries
```

### Data repo structure
```
numinia-digital-goods-data/
├── data/
│   ├── projects.json                    ← project index (5 categories)
│   ├── assets/numinia-assets.json       ← GLB catalog
│   ├── avatars/numinia-avatars.json     ← VRM catalog
│   ├── worlds/numinia-worlds.json       ← HYP catalog
│   ├── audio/numinia-audio.json         ← audio catalog
│   └── video/numinia-video.json         ← video catalog
├── content/
│   ├── models/      ← .glb files
│   ├── avatars/     ← .vrm files
│   ├── worlds/      ← .hyp files
│   ├── audio/       ← .mp3, .ogg
│   ├── video/       ← .mp4, .webm
│   └── thumbnails/  ← .png previews
├── data/versions/   ← version history per asset
```

---

## Asset ID System (UUID v7)

**See `ID_SYSTEM.md` for the full specification.**

Format: `ndg-{uuid-v7}` — Example: `ndg-019078e5-5a4c-7b00-8000-1a2b3c4d5e6f`

- RFC 9562 standard, 122 bits entropy, zero coordination
- `generateAssetId()` in `src/lib/asset-id.ts`
- `createAssetMetadata()` builds complete JSON entry with version, status, nft, storage
- `formatCanonical()` for NFT tokenURIs: `ndg:vrm:{uuid}:v0.1.0`
- Old IDs (slug-timestamp, UUID v4) continue to work — backward compatible

---

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16.2.1, App Router, React 18 |
| Styling | Tailwind CSS 3 + shadcn/ui (copied to `src/components/ui/`) |
| 3D | Three.js 0.162 + @pixiv/three-vrm |
| Admin Auth | SIWE (Sign-In with Ethereum) via MetaMask |
| User Auth | GitHub OAuth (session cookie, httpOnly, secure) |
| Storage | GitHub (metadata), R2/CDN planned, Arweave (permanent, future) |
| Env | Zod validation in `src/lib/env.ts` (skips during build phase) |
| i18n | Static imports in `src/lib/i18n.tsx` — EN + JA |
| Tests | Vitest 4 + React Testing Library + jsdom — 50 tests |
| CI | GitHub Actions: type-check → test → build |
| Deploy | Vercel |

---

## Architecture decisions (do not change without discussion)

### 1. GitHub as metadata database
`src/lib/github-storage.ts` reads/writes JSON files to `numinia-digital-goods-data` via GitHub API.
- All env vars go through `src/lib/env.ts` — never use `process.env.X` directly
- camelCase in TypeScript, snake_case in JSON — conversion happens in github-storage.ts
- `updateAvatarInSource()` and `deleteAvatarFromSource()` write back to the correct per-project file

### 2. Asset URL resolution chain
`src/lib/assetUrls.ts` resolves relative paths to full URLs:
1. Arweave TX ID mapping (legacy content via `arweaveMapping.ts`)
2. R2 CDN URL (when configured)
3. GitHub raw fallback (`content/{type}/{file}`)

### 3. 3D components are all lazy-loaded
VRMViewer, GLBInspector, HomeVRMViewer → all use `next/dynamic({ ssr: false })`.
Do NOT add static imports for 3D components in any page/layout.

### 4. i18n uses static imports
`src/lib/i18n.tsx` imports all 16 translation files statically (8 per locale).
Do NOT use dynamic `import()` with template literals — Turbopack cannot bundle them.

### 5. Admin auth is wallet-based (SIWE)
- `/en/admin` shows WalletConnect gate
- Only ETH addresses in `ADMIN_WALLET_ADDRESSES` env var can access
- Session stored in `admin_session` httpOnly cookie (24h TTL)
- `getAdminSession()` in `src/lib/auth/getSession.ts` checks both wallet and OAuth

### 6. shadcn/ui components are copied, not installed
Actual components are in `src/components/ui/`. Use the CLI to add new ones:
```bash
npx shadcn-ui@latest add [component-name]
```

---

## Environment variables

See `.env.example`. Validated by Zod at runtime (skipped during `next build`).

| Variable | Required | Purpose |
|---|---|---|
| `GITHUB_REPO_OWNER` | Yes | Data repo owner (`PabloFMM`) |
| `GITHUB_REPO_NAME` | Yes | Data repo name (`numinia-digital-goods-data`) |
| `GITHUB_TOKEN` | Yes | Read/write data repo (PAT with `repo` scope) |
| `GITHUB_BRANCH` | No | Defaults to `main` |
| `GITHUB_CLIENT_ID` | No | GitHub OAuth (login only, not needed for gallery) |
| `GITHUB_CLIENT_SECRET` | No | GitHub OAuth |
| `ADMIN_WALLET_ADDRESSES` | No | Comma-separated ETH addresses for admin access |
| `NEXT_PUBLIC_SITE_URL` | No | Defaults to `http://localhost:3000` |
| `R2_*` | No | Cloudflare R2 (upload degrades gracefully) |

---

## Current status (2026-03-31)

### What's done
- ✅ OAuth CSRF fixed (crypto.randomUUID + httpOnly cookie)
- ✅ CORS conflict resolved (removed `*` from middleware)
- ✅ Branding: all ToxSam/opensource3dassets/opensourceavatars → Numinia
- ✅ i18n: static imports, correct provider nesting
- ✅ Env: Zod validation, build-phase skip, 0 direct process.env bypasses
- ✅ Admin: SIWE wallet auth, Claude-style sidebar, draggable modal, stats, settings
- ✅ Data repo: organized content/ folder structure, orphaned files cleaned
- ✅ console.log: 1 remaining (text only), 208 removed from 3D viewers
- ✅ Tests: 137 passing across 15 files (API routes, auth, libs, hooks)
- ✅ .env.local removed from git tracking
- ✅ All admin API routes protected with getAdminSession()
- ✅ R2 presigned upload (500MB limit), GitHub fallback
- ✅ UUID v7 asset ID system (RFC 9562)
- ✅ Favorites system (heart button, localStorage)
- ✅ NFT fields in admin modal (chain, contract, tokenId, type, OpenSea link)
- ✅ Hyperfy .hyp preview (GLB extraction from binary)
- ✅ Auto-thumbnail generation (Three.js offscreen canvas)
- ✅ Mobile responsive admin sidebar
- ✅ Actions menu on gallery cards (download, copy link, share)
- ✅ 0 JSX files remaining (all migrated to TSX)
- ✅ 1 `any` type remaining (VRMLoaderPlugin parser callback)

### What's remaining
| Task | Impact | Effort |
|---|---|---|
| User login flow (wallet + email) | High | 4h |
| User profile page (OpenSea style) | High | 3h |
| NFT ownership check (Base chain) | High | 2h |
| Digital Goods / Loot section (admin) | High | 3h |
| IPFS/Arweave storage layer | High | 4h |
| Optimistic locking (GitHub API writes) | Medium | 1h |
| Animation/Emote catalog structure | Medium | 2h |
| 5 @ts-nocheck files (3D viewers, 8K lines) | Low | 6h |

---

## Key files for AI agents

| File | Purpose |
|---|---|
| `src/lib/github-storage.ts` | All data CRUD + per-project file write-back |
| `src/lib/env.ts` | Zod-validated env vars (use this, never process.env) |
| `src/lib/auth/getSession.ts` | Unified admin session check (wallet + OAuth) |
| `src/lib/i18n.tsx` | Static translation loading (16 files) |
| `src/lib/assetUrls.ts` | URL resolution chain |
| `src/middleware.ts` | i18n routing + CORS |
| `src/app/api/admin/upload/route.ts` | Asset upload (GitHub API) |
| `src/app/api/auth/wallet/verify/route.ts` | SIWE signature verification |
| `src/components/admin/WalletConnect.tsx` | MetaMask connection flow |
| `src/components/AvatarAdminDashboard.tsx` | Admin CRUD UI |
| `src/components/finder/PreviewPanel.tsx` | Main viewer (940 lines, media viewer extracted) |
| `src/lib/utils/hypParser.ts` | Hyperfy .hyp binary parser (GLB extraction) |
| `src/lib/hooks/useFavorites.ts` | Favorites system (localStorage) |
| `src/components/asset/AssetActions.tsx` | Three-dot actions menu on gallery cards |

---

## What NOT to do

- Do NOT commit `.env.local` — already happened once, was cleaned
- Do NOT import 3D components statically — always `next/dynamic({ ssr: false })`
- Do NOT use dynamic `import()` with template literals in i18n — Turbopack breaks
- Do NOT use `process.env.X` directly — use `env.ts`
- Do NOT write to `data/avatars.json` — use `updateAvatarInSource()` / `deleteAvatarFromSource()` which write to the correct per-project file
- Do NOT add `GITHUB_REPO_OWNER=ToxSam` — that points to the original author's data

---

## Running locally

```bash
git clone https://github.com/PabloFMM/numinia-digital-goods.git
cd numinia-digital-goods
cp .env.example .env.local
# Fill in GITHUB_TOKEN, GITHUB_REPO_OWNER=PabloFMM, GITHUB_REPO_NAME=numinia-digital-goods-data

npm install
npm run dev          # http://localhost:3000
npm run type-check   # TypeScript validation
npm test             # Vitest (50 tests)
npm run build        # Production build
```
