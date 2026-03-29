# CLAUDE.md — Numinia Digital Goods

> Context file for AI agents (Claude, Copilot, etc.) and human developers.
> Read this before touching any code. Updated: 2026-03-29.

---

## What this project is

**Numinia Digital Goods** is a public gallery of CC0-licensed VRM avatars and GLB 3D assets.
It is a fork of [ToxSam/os3a-gallery](https://github.com/ToxSam/os3a-gallery), rebranded and extended to focus on VRM avatars and the Numinia store ecosystem.

**Core philosophy: File Over App + Decentralized**
- The app is a viewer/interface, not the source of truth
- Data lives in open files (JSON in GitHub, binaries on Arweave/IPFS)
- The app can be replaced; the files remain forever
- R2 is a cache layer only, not the source of truth

**Live:** https://numinia.store

---

## Repository map (3 repos)

```
numinia-digital-goods          ← THIS REPO: Next.js 16 app (code only)
numinia-digital-goods-data     ← Data repo: JSON metadata + CC0 assets
open-source-3D-assets          ← ToxSam's original data repo (read-only, legacy)
```

The app reads metadata from `numinia-digital-goods-data` and resolves asset URLs to:
1. Arweave (permanent, canonical) — via TX IDs in JSON or `arweaveMapping.ts`
2. R2 (cache/CDN) — for performance
3. GitHub raw (fallback) — for new assets not yet on Arweave

---

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16.2.1, App Router, React 18 |
| Styling | Tailwind CSS 3 + shadcn/ui (copied to `src/components/ui/`) |
| 3D | Three.js 0.162 + @react-three/fiber + @pixiv/three-vrm |
| Auth | Custom GitHub OAuth (NOT Auth.js). Cookie: httpOnly, secure in prod |
| Storage | GitHub (metadata JSON), Cloudflare R2 (CDN), Arweave/ArDrive (permanent) |
| i18n | Manual middleware routing — English (`/en`) and Japanese (`/ja`) |
| Tests | Vitest 4 + React Testing Library + jsdom |
| CI | GitHub Actions: type-check → test → build |
| Deploy | Vercel, standalone output |

---

## Architecture decisions (do not change without discussion)

### 1. GitHub as metadata database
`src/lib/github-storage.ts` reads/writes JSON files to a GitHub repo via Octokit.
- `GITHUB_REPO_OWNER` defaults to `'ToxSam'` if not set — **always set this env var**
- camelCase in TypeScript, snake_case in JSON — conversion happens in `github-storage.ts`
- This is intentional (file over app): data is portable, no vendor lock-in

### 2. Asset URL resolution chain
`src/lib/assetUrls.ts` → `resolveAvatarAssetUrl(url, type)`:
1. Arweave TX ID mapping (legacy ToxSam content via `arweaveMapping.ts`)
2. R2 CDN URL
3. GitHub raw fallback

New Numinia content should have Arweave TX IDs in JSON directly (skip the static mapping file).

### 3. 3D components are all lazy-loaded
VRMViewer, GLBInspector, HomeVRMViewer → all use `next/dynamic({ ssr: false })`.
Do NOT add `import VRMViewer from ...` at the top of any page/layout. Always use dynamic import.

### 4. i18n routing is manual (middleware)
`src/middleware.ts` handles locale detection and redirects. Every page lives under `/en/` or `/ja/`.
Do NOT use `next-intl` or similar — the current pattern is load-bearing for SEO.

### 5. shadcn/ui components are copied, not installed
`@shadcn/ui: ^0.0.4` in package.json is a phantom package (ignore it).
Actual components are in `src/components/ui/`. To add a new shadcn component:
```bash
npx shadcn-ui@latest add [component-name]
```

---

## Environment variables

See `.env.example` for all required vars. Key ones:

| Variable | Purpose | Risk if missing |
|---|---|---|
| `GITHUB_REPO_OWNER` | Points to data repo owner | Defaults to ToxSam — data goes to wrong repo |
| `GITHUB_TOKEN` | Read/write data repo | All data operations fail silently |
| `GITHUB_CLIENT_SECRET` | OAuth callback | Login broken |
| `R2_*` | Asset CDN | Upload/serve from R2 fails |
| `NEXT_PUBLIC_OPEN_SOURCE_3D_ASSETS_RAW_BASE` | Base URL for asset JSON | Gallery shows no assets |

No runtime validation (Zod) exists yet — missing vars fail silently. **This is a known gap.**

---

## Current plan status

### Fase 1 — Higiene rápida
| # | Task | Status | Score |
|---|---|---|---|
| 1 | `.env.example` + runtime validation | `.env.example` ✓, `env.ts` centralized ✓, Zod validation ✗ | 7/10 |
| 2 | Eliminar 306 `console.log` de producción | Not done — 306 remain (226 in VRMViewer alone) | 1/10 |
| 3 | Migrar `.jsx` → `.tsx` + borrar `App.js` | `App.js` gone ✓, 16 JSX files remain in VRMViewer/GLBInspector | 4/10 |

### Fase 2 — Infraestructura
| # | Task | Status | Score |
|---|---|---|---|
| 4 | CI/CD GitHub Actions | Done: type-check + vitest + next build | 9/10 |
| 5 | Reducir `any` en áreas críticas | ~42 remain (down from 107). `github-storage.ts` tiene 24 solos | 6/10 |

### Fase 3 — Tests
| # | Task | Status | Score |
|---|---|---|---|
| 6 | Configurar Vitest + RTL | Done: vitest.config.ts, setup.ts, jsdom, path aliases | 8/10 |
| 7 | Tests rutas API críticas (auth, upload, download) | 0 API tests. Only `download-utils.test.ts` exists | 1/10 |
| 8 | Tests flujo descarga + viewer 3D | `download-utils` parcialmente cubierto. Viewer: 0 tests | 3/10 |

### Fase 4 — Performance 3D
| # | Task | Status | Score |
|---|---|---|---|
| 9 | Suspense + lazy loading modelos pesados | Done: 9 dynamic imports, 39 Suspense usages | 9/10 |
| 10 | Memoización componentes Three.js | PreviewPanel has `memo`. VRMViewer hooks need audit | 6/10 |

### Fase 5 — Refactor arquitectura (largo plazo)
| # | Task | Status | Score |
|---|---|---|---|
| 11 | Dividir `PreviewPanel.tsx` (1943 líneas) | Not started | 0/10 |
| 12 | Caché GitHub API (rate limit) | Not started | 0/10 |

**Overall plan completion: ~4.5/12 tasks fully done**

---

## Known bugs / security issues

| Issue | Severity | File | Fix |
|---|---|---|---|
| OAuth CSRF: `state` param is a URL, not a nonce | High | `api/auth/github/route.ts` | Use `crypto.randomUUID()` stored in httpOnly cookie |
| CORS: `Allow-Origin: *` + `Allow-Credentials: true` is invalid | Medium | `next.config.js` | Replace `*` with actual origin |
| `github-storage.ts` defaults to ToxSam's repo | Medium | `src/lib/github-storage.ts` | Ensure `GITHUB_REPO_OWNER` is always set |
| New assets stored as git binaries (not Arweave) | Medium | `numinia-digital-goods-data` repo | Upload to Arweave, store TX IDs in JSON |
| 306 `console.log` in production (including secrets context) | Low | VRMViewer/*, API routes | Remove or replace with proper logger |
| No Zod env validation | Low | `src/lib/env.ts` | Add `@t3-oss/env-nextjs` or similar |

---

## Key files for AI agents

When working on a task, these are the most important files to read first:

| File | Purpose |
|---|---|
| `src/lib/github-storage.ts` | All data CRUD operations |
| `src/lib/assetUrls.ts` | URL resolution chain (GitHub → Arweave → R2) |
| `src/middleware.ts` | i18n routing + auth guard |
| `src/lib/auth/AuthProvider.tsx` | Client-side auth context |
| `src/app/api/auth/github/callback/route.ts` | OAuth flow + session cookie |
| `src/lib/env.ts` | All env var access (use this, never `process.env.X` directly) |
| `src/components/finder/PreviewPanel.tsx` | Main asset viewer UI (1943 lines — handle with care) |
| `src/lib/arweaveMapping.ts` | Static map: filename → Arweave TX ID (legacy content) |

---

## What NOT to do (learned the hard way)

- Do NOT commit `.env.local` — it has been done once, rotate any secrets that were there
- Do NOT import VRMViewer/GLBInspector with static imports — always use `next/dynamic`
- Do NOT run `npm install @shadcn/ui` — it's a phantom package, use the CLI
- Do NOT add `GITHUB_REPO_OWNER=ToxSam` — that points to the original author's data
- Do NOT add blocking `getServerSideProps` style data fetching — use ISR or client fetch
- Do NOT split PRs for VRMViewer refactors without tests — it's 1943 lines of complex Three.js state

---

## Running locally

```bash
cp .env.example .env.local
# Fill in GITHUB_*, R2_* values

npm install
npm run dev          # http://localhost:3000
npm run type-check   # TypeScript validation
npm test             # Vitest
npm run build        # Production build
```

---

## Next priorities (as of 2026-03-29)

1. **OAuth CSRF fix** — 15 min, high security impact
2. **CORS fix** — 5 min, fixes potential auth breakage
3. **console.log cleanup** — focus on VRMViewer (226/306 logs)
4. **JSX → TSX migration** — VRMViewer hooks and utils first (they're smallest)
5. **API route tests** — auth callback + download endpoint
6. **Zod env validation** — catch missing vars at startup, not at runtime
7. **Arweave upload for Numinia assets** — move binaries out of git, store TX IDs
8. **GitHub API cache** — ISR or in-memory cache to avoid rate limiting
