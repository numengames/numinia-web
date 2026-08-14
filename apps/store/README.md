# @numinia/store — numinia.store

The **spike/PoC track** ("does it work?"). Astro 7, SSG by default, React
islands only where interactivity demands it. Shared `packages/*` stay at
production (`com`) standard even when consumed here.

## Run

```bash
cp ../../.env.example .env   # fill GITHUB_REPO_OWNER / GITHUB_REPO_NAME
npm run dev                  # :4321 — a missing required var crashes the boot (by design)
npm run build && node dist/server/entry.mjs
```

## What lives here (Phase 0)

- `/`, `/es/`, `/ja/`, `/ko/`, `/pt-br/` — localized landing, each with its own `<html lang>`.
- `/spike/` — Phase 0.7 evidence: real data-repo catalog validated with Zod at
  build time + a VRM avatar rendering in a `client:visible` React island.
- `/api/auth/siwe` — SIWE spike (EOA-only; the real auth design is the ADR-006
  session). Exercise it end-to-end: `node scripts/spike-siwe.mjs` (server running).
- `e2e/` — Playwright DECISION GATE test (`npx playwright test`): island
  hydration + real framebuffer pixels.
- Every page auto-emits `page_view`; interactive elements must carry
  `data-metric` (docs/analytics.md).
