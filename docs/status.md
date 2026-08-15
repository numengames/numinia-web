# Project Status — Numinia Platform

> **For humans.** The living state of the project: what is DONE, what is NEXT, who owns each step.
>
> **Epistemic value.** Resolves where we are without replaying history — the belief state after every session.
> **Pragmatic value.** Session planning starts here; anything shipped or decided must land here or it did not happen.
> **In the system.** Observes: every merge and Oracle order. Regulates: priorities. Coupled to: TODO.md, missions/.
>
> _Part of the Law. Index: [LEY.md](./LEY.md)_

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

### Lineage consolidation ✅ (2026-08-15, Oracle-approved Option 1 — ADR-017)

- One repo, one timeline: 316 scrubbed legacy commits → razing commit (ADR-010 enacted) → the rebuild. 363 commits total, tree bit-identical post-surgery, authorship preserved (incl. ToxSam), zero secrets in history (forensically verified — the `.env.local` incident only ever held public data-repo coordinates).
- Nested 4.4 GB legacy clone deleted; backup bundle at `../numinia-platform-pre-consolidation.bundle`; GitHub legacy remote untouched (permanent archive). New **D15**: archive vs repurpose that remote — push-day decision with D11.

### Autonomous batch ✅ (2026-08-15, "continúa sin mí")

- **SEO plumbing** (`0a571c7`): sitemap (spike filtered out), dynamic `robots.txt` from env, canonical + hreflang ×5 locales on every page; `features/seo.feature` pins it (13 scenarios green).
- **Store lib unit tests** (`6e92a41`): data.ts + archive.ts fully unit-tested (stubbed network, loud-failure paths, memoization, storage-chain fallback); 100% per-file coverage on `src/lib`.
- **Visual regression** (`baf769e`): 5 Playwright pixel baselines (landing/archive ×2 locales + detail, canvas masked); local-only until CI regenerates its own (runbook step added).

### `packages/auth` — vendor-independent core ✅ (2026-08-15)

- All MISSION-002 groundwork that touches no vendor: fail-closed config (`parseAuthEnv`, ≥32-char secret), HMAC-SHA256 session tokens `v1.<payload>.<sig>` with constant-time compare + strict zod payload (unknown rank ⇒ rejected), single-use TTL nonce store, and the D13 boundary as ONE constant (`WEB3_BOUNDARY_RANK = 'pilgrim'` in `src/boundary.ts`).
- WinterCG-pure (Web Crypto only, no Node/DOM libs) so it runs identically on Node, Workers, or edge. 15 tests, 100% coverage, mutation score 98.09% (3 survivors are documented equivalent mutants).
- MISSION-002 Step 0 (thirdweb evaluation gate) now only needs the vendor layer on top.

### Audits & references ✅

- Legacy test audit (`docs/reference/legacy-test-audit.md`): 3 severe security findings, 12 binding test rules → all encoded into this repo's machinery.
- **Data-doctor** (`docs/reference/data-doctor-report.md`): 32 assets schema-clean; findings needing data-repo fixes (below).
- Legacy changelog v0.1.0–0.15.0 extracted as portable data.
- ADR-006 auth session dossier ready (`docs/adr-006-auth-dossier.md`).

### MISSION-004 — Three pillars ✅ (2026-08-15, Oracle directive)

- Site reorganized as **La Ciudad · Assets · L.A.P.** (deck v0.6.0 as canonical narrative; Numinia = metagame; future home numinia.com — building stays in apps/store until production order).
- New: /city/** (what/history/inhabitants/districts/game — lore ES+EN, data from @numinia/domain), /assets/ hub, /lap/ (player area + 6 ranks + honest "citizenship required" status). Landing + header/footer speak the three pillars.
- **Link-integrity gate** (`npm run links`, in verify): found and fixed 97 broken legacy links in docs content; now 8,404 internal links / 296 pages / 0 broken.
- **The Law chartered**: every governing .md opens with description + epistemic value + pragmatic value + system coupling (systems thinking / active inference); indexed in docs/LEY.md.

## NEXT (ordered, with owner)

| #   | What                                                                                                                                                                                         | Owner                     | Notes                                                                |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- | -------------------------------------------------------------------- |
| 1   | **Fix the data repo** (from data-doctor): 3 missing thumbnails, 1 missing VRM binary on R2 (`ndg-019d3f89…`), 3dprint catalog 404                                                            | 🧬 Pablo                  | Small; then re-run `node scripts/data-doctor.mjs` + refresh fixtures |
| 2   | ~~ADR-006 auth session~~ **DONE 2026-08-15**: ADR-006 final + MISSION-002 spec written (thirdweb conditional, Pilgrim provisional D13, eval gate D14)                                        | ✅                        | Next executable: MISSION-002 Step 0 gate                             |
| 3   | ~~Deferred domain types~~ **DONE 2026-08-15**: 21 type files total + 15 positions in 5 locales (restrictions as data, pinned by test)                                                        | ✅                        | Domain complete                                                      |
| 3b  | ~~MISSION-003 web parity~~ **DONE 2026-08-15**: gallery, chrome+landing, finder, updates (original LAP style + footer version), legal drafts, docs (22 originals, 55 pages), 3D inspector    | ✅                        | Legal wording + [PENDING] fields need 🧬                             |
| 4   | **Push day** when the Oracle decides: license D11 → repo name/visibility → follow `docs/remote-checklist.md` → first CI green closes MISSION-000's last criterion                            | 🧬 decision, 🤖 execution | Runbook ready                                                        |
| 5   | **Deploy day** (after push, when ordered): Vercel first (Cloudflare later, D3-bis) + consent banner + analytics backend (D12)                                                                | 🧬 decision, 🤖 execution | Both explicitly forbidden until ordered                              |
| 6   | Pending sessions parked in `docs/open-questions.md`: taxonomy revisit, gender-restriction policy (ADR-013), Huly integration, brand visual package (D8), translation QA (D9), write-path ADR | 🧬🤖                      | Each is scoped and referenced                                        |

## Standing orders (never forget)

- **Nothing is published** — no push, no deploy, no npm — until Pablo explicitly orders it.
- The legacy repo is condemned: never read, never write, zero reuse (`docs/reference/` holds everything extracted).
- Glossary first, then code, for any domain term. Data-metric on every interactive element. Tests before implementation.
