# Project Status — Numinia Platform

> **For humans.** The living state of the project: what is DONE, what is NEXT, who owns each step.
>
> **Epistemic value.** Resolves where we are without replaying history — the belief state after every session.
> **Pragmatic value.** Session planning starts here; anything shipped or decided must land here or it did not happen.
> **In the system.** Observes: every merge and Oracle order. Regulates: priorities. Coupled to: TODO.md, missions/.
>
> _Part of the Law. Index: [LEY.md](./LEY.md)_

> Living document: what is DONE, what is NEXT, and who owns each next step.
> Updated: 2026-08-15 · 41 commits on `main` · everything LOCAL (no remote, no deploy, no license published).

## Where we are

**v0.18.0 (progressive identity spike, MISSION-002 Step 0) built and locally verified — nothing published, by standing order.**
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

## In progress

### MISSION-002 Step 0 — thirdweb evaluation gate (started 2026-08-15)

- thirdweb project configured: Client ID in local `apps/store/.env` (public by design), allowed domains set on dashboard — **pending fix: `localhost:3000` → `localhost:4321`** (Astro dev port).
- `THIRDWEB_SECRET_KEY` recovered from the legacy Vercel project env vars; goes into local `.env` only (never committed — history forensically clean, verified again 2026-08-15).
- **Spike built and server-side verified (2026-08-15)**: `thirdweb@5.121` installed; `/spike/auth` page + `LoginSpike` island (ConnectEmbed: google/email/passkey In-App Wallet + MetaMask/WalletConnect); endpoints `/api/auth/login|session|logout` — thirdweb only proves address ownership (`verifyPayload`), the session is OUR `@numinia/auth` HMAC token (rank nomad, httpOnly, sameSite strict). Type-check clean.
- **Proven locally** (`apps/store/scripts/spike-auth-e2e.mjs` + curl): no cookie → 401 · forged token → 401 (signature) · garbage signature → 401 · real signed payload → 200 + session {address, rank nomad} · payload replay → 401 (single-use nonce via `@numinia/auth` store) · logout → 200. Known/accepted: stateless tokens have no server-side revocation (out of spike scope).
- **Browser pass (Pablo, 2026-08-15)**: Google ✅ (logout fixed: must disconnect the wallet too — in-app wallets re-sign silently) · email OTP ✅ · MetaMask ✅ · passkey ⚠️ environment-limited (Linux desktop lacks a platform authenticator; retest on phone/Chrome QR — not a vendor failure).
- **Login UX iterated to final**: no static copy; tapping a method inside ConnectEmbed (capture-phase listener + `getLastAuthProvider` detection) reveals that method's 1-2-3 progress bar — current step highlighted, next steps muted, advanced by real state (no wallet → connected-unsigned → verified session). Copy rule: never mention payments/transactions. Playwright-verified.
- **Remaining to close the gate**: Pablo's final pass on the finished UX, then Oracle sign-off → MISSION-002 Step 1.

## Oracle directives (2026-08-15, afternoon)

- **D16 — L.A.P. opens to Nomads**: part of the L.A.P. content is visible without logging in. Login is asked exactly where it earns its place — gated content or data persistence — never as an entrance wall. This softens MISSION-002 Steps 1–3 (login becomes a contextual moment inside L.A.P., not its door) and will retire the "citizenship required" copy in `i18n/pillars.ts` when implemented.
- **Design system incoming**: the Oracle holds the design-system document. Priority shifts to rebuilding the rest of the platform with it — preparation first (ingest doc → tokens in `packages/ui` → primitives inventory), execution after.

### MISSION-006 Phase A ✅ (2026-08-15 evening) — the platform wears Khepri

- Token bridge live: legacy `--numinia-*` aliases point at Khepri; kit CSS byte-identical copy in packages/ui pinned by test; Geist/Geist Mono self-hosted. Modes: Diurno default + Nocturno toggle in the chrome, pre-paint boot (D17: localStorage for chrome preference only). Chrome dressed (wordmark in ink, active pillar = ink pill, binary signature in the footer). Amber contrast fixes (§9.7 avisos). Bundle gate learned spike-only reachability. **Full verify green (38/38 e2e incl. WCAG both-mode tokens).**
- **Phase B done (same evening)**: platform.css layer (§4.3 scale, §5 elevation, §9 components, §13.11 ink primary, §6.2 relief, §13.2 menu), kit motion inline (tecleo + reveal + orchestrated entry), and every surface dressed — landing per the §13.2 hero plan, archive/gallery/finder/inspector/city/lap/updates/docs/legal on tarjetas + amber etiquetas + Mono-for-measured. Gates encode the system's own exemptions (binaria = WCAG decoration; axe waits for the settled page; reduced-motion runs). Verify exit 0.
- **Punch-list round 1 done (v0.19.0)**: mode toggle = Phosphor sun/moon icon, languages in a §9.8 dropdown (current = ink), Phosphor subset self-hosted (packages/ui/src/icons + chrome/Icon.astro), download icon on archive detail. Verify exit 0.
- **Working mode from here (Oracle order)**: SMALL missions — one reviewable increment per unit, versioned, with visual evidence. Recorded in agent memory.
- **MISSION-007 — The City chronicle ✅ (v0.20.0)**: /city/ is one four-chapter scroller carrying the numinia.com canon verbatim (city-landing.ts + art/seals), Khepri-dressed, with the waxing-moon reading progress; old subpages = host-agnostic redirect stubs. **D18 decided: EN root at the numinia.com merge**; full adaptation checklist in docs/merge-numinia-com.md (today: Cloudflare Workers assets, manual wrangler, no CI).
- **MISSION-008 — The L.A.P. platform ✅ (v0.22.0)**: §13.11 shell ×5 locales; character sheet as the player's own .md file (File Over App + data dignity — export/import, tolerant parser, unit-pinned round-trip); Codex read-only from the domain; honest empty states for portals/loot/seasons; Nd6 dice. Legacy surveyed read-only (veda lifted by the Oracle). ja/ko sheet labels fall back to EN (D9 queue).
- **v0.23.0**: LAP sidebar folds to an icon rail (Phosphor 18px, D17-style persistence); knip findings fixed (unlisted zod/satteri declared, kit ignored, exports trimmed).
- **LAP iteration map from the Oracle's legacy screenshots (2026-08-15)** — small missions queue, in rough order of value/feasibility:
  1. **Portals map** — the district map with 14 portal nodes (needs portal CONSTANTS in domain; type exists, data extractable from the manual/legacy).
  2. **Codex book reader** — the RPG manual as a readable book (source already in docs/seminal/Numinia__El_juego_de_rol__manual_completo_.md; index sidebar + page view, lore ES+EN).
  3. **Stats (public)** — archive KPIs from real catalog data (counts by type, storage layers, redundancy health): §9.5 probes, feasible today.
  4. **Sheet extras** — avatar image, PDF export beside MD, prestige/prisma KPI cards like the legacy view.
  5. **Seasons pass timeline** — adventure nodes + rewards track (UI can precede Phase 3 with demo data only if the Oracle wants).
  6. **Loot / digital goods** — NFT-linked collections (needs identity + write path).
  7. **Settings / Users / admin zone** — needs MISSION-002 identity + rank gating (minRank pattern from legacy sidebar).
- **MISSION-009 — Codex manual + Archive stats ✅ (v0.24.0)**: the RPG manual reads as a book inside /lap/codex/ (own parser: structure added, author text untouched, tables preserved, fragment anchors), archive statistics from real catalog data (§9.5 probes + §9.8 redundancy bar). Reviewed by a UX panel and a Khepri compliance audit — every finding applied (no-JS content restored, wallet truncation, light 48px empty states, ink primary that never lightens, canonical binaria, 44px targets…). New gate: cross-browser + responsive + no-JS.
- **Known gap**: WebKit (iPhone/Safari engine) cannot launch on this workstation — missing system libs. The gate runs it under `PLAYWRIGHT_WEBKIT=1` or in CI after `playwright install-deps`; phone-width coverage today is Chromium + Firefox.
- Next: Oracle's next punch-list items, one at a time.

## NEXT (re-prioritized 2026-08-15 after MISSION-002 Step 0 + afternoon directives)

| #   | What                                                                                                                                                                                                                                                               | Owner                     | Notes                                                                                                      |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------- | ---------------------------------------------------------------------------------------------------------- |
| 1   | **MISSION-006 — Khepri execution**: kit v4.2.0 installed at `khepri/` and verified (2026-08-15); CLAUDE.md carries the design block. Next: Phase A prep (token bridge vs `packages/ui`, kit adoption + theme-persistence decision, surface audit) → Phase B reskin | 🤖, 🧬 visual reviews     | THE priority. Spec: missions/MISSION-006-khepri.md. Heavy 3D materials stay out of git (~/Descargas)       |
| 2   | **Close the D14 gate**: Pablo's final pass on `/spike/auth` → Oracle sign-off. Passkey stays conditionally verified (Linux desktop limitation; retest on phone/deploy)                                                                                             | 🧬 Oracle                 | Cheap to close; identity then waits for its persistence moment                                             |
| 2b  | **MISSION-002 Steps 1–3** (after gate, re-scoped by D16): login as a contextual moment inside an open-to-Nomads L.A.P. (gated content / persistence), not its door — own buttons via `useConnect`, i18n ×5, funnel events, com-grade tests on the vendor layer     | 🤖                        | Deprioritized behind the design system by Oracle order                                                     |
| 3   | **Fix the data repo** (from data-doctor): 3 missing thumbnails, 1 missing VRM binary on R2 (`ndg-019d3f89…`), 3dprint catalog 404                                                                                                                                  | 🧬 Pablo                  | Small; then re-run `node scripts/data-doctor.mjs` + refresh fixtures                                       |
| 4   | **Security: full key-rotation audit** — inventory every credential (thirdweb, R2, GitHub tokens; legacy Vercel project holds ~21 env vars, several "Needs Attention"), rotate stale ones, verify each lives only where it should, decommission legacy Vercel vars  | 🧬🤖                      | Raised 2026-08-15. **Mandatory before deploy day**; thirdweb secret was recovered from legacy Vercel today |
| 5   | **Push day** when the Oracle decides: license D11 → repo name/visibility → `docs/remote-checklist.md` → first CI green closes MISSION-000's last criterion                                                                                                         | 🧬 decision, 🤖 execution | Runbook ready                                                                                              |
| 6   | **Deploy day** (after push + #4): **revisit D3-bis first** — the Cloudflare case hardened today (`@numinia/auth` is WinterCG-pure by design, R2 already in the stack, egress economics); then consent banner + analytics backend (D12)                             | 🧬 decision, 🤖 execution | Both explicitly forbidden until ordered                                                                    |
| 7   | **MISSION-005 — Data dignity narrative**: rental-vs-ownership copy at every trust moment + /city/ page, anchored on Lanier (NYT 2019). Seed line live on `/spike/auth`. Glossary terms first (ADR-012)                                                             | 🔀                        | Spec in missions/MISSION-005-data-dignity.md                                                               |
| 8   | Pending sessions parked in `docs/open-questions.md`: taxonomy revisit, gender-restriction policy (ADR-013), Huly integration, brand visual package (D8), translation QA (D9), write-path ADR                                                                       | 🧬🤖                      | Each is scoped and referenced                                                                              |

## Standing orders (never forget)

- **Nothing is published** — no push, no deploy, no npm — until Pablo explicitly orders it.
- The legacy repo is condemned: never read, never write, zero reuse (`docs/reference/` holds everything extracted).
- Glossary first, then code, for any domain term. Data-metric on every interactive element. Tests before implementation.
