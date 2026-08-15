# Project Status — Numinia Platform

> Living document: what is DONE, what is NEXT, and who owns each next step.
> Updated: 2026-08-15 · 38 commits on `main` · everything LOCAL (no remote, no deploy, no license published).

## Where we are

**v0.16.0 built and verified — v0.17.0 (the Archive) built and verified — nothing published, by standing order.**
`npm run verify` = the whole truth: turbo pipeline (20 tasks) → Gherkin acceptance (11 scenarios) → license gate → bundle budgets → e2e incl. WCAG (11 tests). All green.

## DONE (chronological)

### Foundations — MISSION-000 ✅ (v0.16.0)
- Turborepo monorepo: `apps/store` + `apps/com` (Astro 7, ADR-015), `packages/domain` + `analytics` + `ui`.
- **Domain (the soul)**: 15 type files, 10 constant sets in 5 locales (~740 strings), fail-closed env validator, loud asset-catalog validator, hostname-parsed URL resolvers. 100% coverage per file.
- Glossary ratified v1.0.0 (naming authority, revisitable); ADRs 011–016.
- i18n routing: `/`, `/es/`, `/ja/`, `/ko/`, `/pt-br/`, each with own `<html lang>`.
- Phase 0.7 spike — **DECISION GATE PASSED**: VRM renders in Astro island (Playwright pixel-verified), SIWE verify with real keys (200/401/401), real data validated at build. No Next.js fallback needed.

### Quality floor — infra plan ✅
- **Git hooks** (zero-dep, armed on `npm ci`): prettier + eslint + **secretlint** (live-verified: a real-pattern token cannot be committed), commit-format `[track] type(scope)`, pre-push pipeline.
- **Hermetic builds**: `DATA_SOURCE=fixture` from committed real-catalog snapshots; `.nvmrc`, `engine-strict`, Renovate ready-inert.
- **3-job CI** (quality / VRM e2e gate / supply-chain): turbo cache, coverage artifacts, `npm audit` blocking, **license gate** (strong copyleft blocked; LGPL reviewed exception: sharp/libvips). Never run remotely yet — no remote.
- **Mutation testing**: analytics **100%** (140/140), domain logic **99.02%** (202/204, 2 proven-equivalent). Knip dead-code: clean after fixing 3 real findings.
- Governance pack: DoD v0.2.0, CONTRIBUTING, SECURITY, PR template, CODEOWNERS, **push-day runbook** (`docs/remote-checklist.md`).

### Analytics foundation ✅ (ADR-016)
- `@numinia/analytics`: 7-event frozen funnel taxonomy (Phases 0–3), consent-gated (drop-not-buffer), no PII by design, pluggable transports, zero runtime deps (~2KB inline after removing a measured 60KB zod bundle). Convention: every interactive element carries `data-metric` (constitution rule).

### The Archive — MISSION-001 ✅ (v0.17.0 material)
- **32 real public assets → 165 SSG pages** (5 locales) with SEO/OG; multi-format previews (native img/audio/video, unified GLB+VRM island, HYP note); client-side search + format filters; downloads via the domain storage chain; fully instrumented (funnel visitor→download live).
- Gates extended and paying off: WCAG axe gate caught a real contrast violation (fixed via `--numinia-color-primary-strong` token).

### Audits & references ✅
- Legacy test audit (`docs/reference/legacy-test-audit.md`): 3 severe security findings, 12 binding test rules → all encoded into this repo's machinery.
- **Data-doctor** (`docs/reference/data-doctor-report.md`): 32 assets schema-clean; findings needing data-repo fixes (below).
- Legacy changelog v0.1.0–0.15.0 extracted as portable data.
- ADR-006 auth session dossier ready (`docs/adr-006-auth-dossier.md`).

## NEXT (ordered, with owner)

| # | What | Owner | Notes |
|---|---|---|---|
| 1 | **Fix the data repo** (from data-doctor): 3 missing thumbnails, 1 missing VRM binary on R2 (`ndg-019d3f89…`), 3dprint catalog 404 | 🧬 Pablo | Small; then re-run `node scripts/data-doctor.mjs` + refresh fixtures |
| 2 | **ADR-006 auth session** (60–90 min, agenda in the dossier) → ADR final + MISSION-002 spec | 🧬🤖 together | Blocks Phase 2 (identity) |
| 3 | **Deferred domain types** (#3): season, portal, equipment, linguistic, mission, character-sheet + 15 positions constants in 5 locales | 🤖 Claude | Mechanical, ~1 session; needed before Phase 2/3 features |
| 4 | **Push day** when the Oracle decides: license D11 → repo name/visibility → follow `docs/remote-checklist.md` → first CI green closes MISSION-000's last criterion | 🧬 decision, 🤖 execution | Runbook ready |
| 5 | **Deploy day** (after push, when ordered): Vercel first (Cloudflare later, D3-bis) + consent banner + analytics backend (D12) | 🧬 decision, 🤖 execution | Both explicitly forbidden until ordered |
| 6 | Pending sessions parked in `docs/open-questions.md`: taxonomy revisit, gender-restriction policy (ADR-013), Huly integration, brand visual package (D8), translation QA (D9), write-path ADR | 🧬🤖 | Each is scoped and referenced |

## Standing orders (never forget)

- **Nothing is published** — no push, no deploy, no npm — until Pablo explicitly orders it.
- The legacy repo is condemned: never read, never write, zero reuse (`docs/reference/` holds everything extracted).
- Glossary first, then code, for any domain term. Data-metric on every interactive element. Tests before implementation.
