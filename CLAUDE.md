# CLAUDE.md — Numinia Digital Goods

> Context file for AI agents (Claude, Copilot, etc.) and human developers.
> Read this before touching any code. Updated: 2026-04-01.

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

### L.A.P. sidebar (top → bottom)
1. **Character** — RPG character sheet (markdown, editable, PDF/MD export)
2. **Portals** — Interactive world map (4 districts, 14 oncyber 3D worlds)
3. **Loot** — NFT collections (ERC-721/1155, linked assets)
4. **Assets** — Admin asset management (CRUD, tags, thumbnails)
5. **Archive** — Link to public gallery
6. Stats / Settings / Updates — bottom section

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
| Auth | SIWE (any wallet) + GitHub OAuth |
| Storage | GitHub (metadata), Cloudflare R2 (CDN), Arweave + IPFS (permanent) |
| Env | Zod validation in `src/lib/env.ts` |
| i18n | Static imports in `src/lib/i18n.tsx` — EN + JA |
| Tests | Vitest 4 + RTL + jsdom — 138 tests |
| Deploy | Vercel |
| Legal | Numen Games S.L., Spanish law, GDPR compliant |

---

## Architecture decisions (do not change without discussion)

### 1. GitHub as metadata database
`src/lib/github-storage.ts` — reads/writes JSON + markdown to data repo via GitHub API.
- Optimistic locking: retries 3x on 409 Conflict
- In-memory cache with 1min TTL, full invalidation on writes
- All env vars through `src/lib/env.ts` — never `process.env.X` directly

### 2. Asset URL resolution chain
`src/lib/assetUrls.ts`: Arweave TX → R2 CDN → GitHub raw fallback

### 3. 3D components are lazy-loaded
Always `next/dynamic({ ssr: false })`. Never static import for 3D.

### 4. i18n uses static imports
16 JSON files loaded statically. No dynamic `import()` with template literals.

### 5. Auth: wallet-first, any user can sign in
- Admin wallets (whitelist) get `admin_session` cookie
- Any wallet gets `user_session` cookie
- `getAdminSession()` / `getUserSession()` in `src/lib/auth/getSession.ts`

---

## Environment variables

See `.env.example`. Validated by Zod at runtime.

| Variable | Required | Purpose |
|---|---|---|
| `GITHUB_REPO_OWNER` | Yes | Data repo owner |
| `GITHUB_REPO_NAME` | Yes | Data repo name |
| `GITHUB_TOKEN` | Yes | Read/write data repo |
| `ADMIN_WALLET_ADDRESSES` | No | Comma-separated ETH admin addresses |
| `R2_*` | No | Cloudflare R2 storage |
| `ARWEAVE_WALLET_KEY` | No | Arweave uploads (JWK JSON) |
| `IPFS_PIN_API_URL/KEY` | No | IPFS pinning (Pinata-compatible) |

---

## Current status (v0.10.0 — 2026-04-01)

### Done
- ✅ Auth: SIWE (admin + user), GitHub OAuth, LoginModal, profiles
- ✅ L.A.P.: Character Sheet, Portals Map, Loot, Assets, Stats, Settings, Changelog
- ✅ Viewers: VRM, GLB, HYP (Files/Script/Props tabs), STL, Image (zoom/pan), audio, video
- ✅ Storage: R2 presigned (500MB), Arweave archive, IPFS pin
- ✅ Data: UUID v7, tags, optimistic locking, auto-thumbnails
- ✅ Quality: 138 tests, 0 process.env bypasses, SECURITY.md, CONTRIBUTING.md, Dependabot
- ✅ Legal: Terms, Privacy, Cookie Policy + consent banner (Numen Games S.L.)
- ✅ Portals: 4 districts, 14 oncyber worlds, interactive SVG map
- ✅ Character: RPG ficha as markdown (File Over App), edit/view modes, PDF/MD export

### Remaining (low priority)
| Task | Impact |
|---|---|
| 5 @ts-nocheck files (Three.js viewers, 8K lines) | Low |
| Upload Mixamo GLB to R2 (replace legacy FBX CDN) | Low |

---

## Key files for AI agents

| File | Purpose |
|---|---|
| `src/lib/github-storage.ts` | All data CRUD + optimistic locking |
| `src/lib/env.ts` | Zod-validated env vars |
| `src/lib/auth/getSession.ts` | Session check (admin + user) |
| `src/components/character/CharacterSheet.tsx` | RPG character sheet |
| `src/components/portals/PortalsMap.tsx` | Interactive world map |
| `src/components/asset/HypViewer.tsx` | .hyp viewer (Files/Script/Props) |
| `src/components/asset/ImageViewer.tsx` | Image zoom/pan/fullscreen |
| `src/components/asset/STLViewer.tsx` | STL 3D print viewer |
| `src/components/auth/LoginModal.tsx` | User login (wallet + GitHub) |
| `src/components/admin/AdminSidebar.tsx` | L.A.P. sidebar navigation |
| `src/app/api/characters/route.ts` | Character sheet CRUD |
| `src/app/api/nft/check-ownership/route.ts` | NFT ownership (Base chain) |
| `src/app/api/admin/archive/route.ts` | Arweave upload |
| `src/lib/utils/hypParser.ts` | .hyp binary parser |
| `src/lib/hooks/useFavorites.ts` | Favorites (localStorage) |

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
npm test             # Vitest (138 tests)
npm run build        # Production build
```
