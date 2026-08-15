# Project Status — Numinia Platform

> **For humans.** The living state of the project: what is DONE, what is NEXT, who owns each step.
>
> **Epistemic value.** Resolves where we are without replaying history — the belief state after every session.
> **Pragmatic value.** Session planning starts here; anything shipped or decided must land here or it did not happen.
> **In the system.** Observes: every merge and Oracle order. Regulates: priorities. Coupled to: TODO.md, missions/.
>
> _Part of the Law. Index: [LEY.md](./LEY.md)_

> Living document: what is DONE, what is NEXT, and who owns each next step.
> Updated: 2026-08-15 (night) · remote LIVE: `numengames/numinia-web` (private) · **numinia.com SERVES THE PLATFORM** (deployed via GitHub Actions) · no license published (D11).

## Where we are

**v0.30.0 LIVE on numinia.com** — code on `numengames/numinia-web` (private), auto-deploy on green CI, every push that passes ships itself (docs/deploy-runbook.md).
`npm run verify` = the whole truth: turbo pipeline (24 tasks) → Gherkin acceptance (26 scenarios) → license gate → bundle budgets → link integrity (10k+ links) → e2e incl. WCAG + cross-engine (117 tests). All green.
The old standing order "nothing is published" is FULFILLED AND RETIRED (2026-08-15 push day + deploy day, Oracle-ordered); the standing rule now is: main deploys itself, so main stays green.

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
- **MISSION-010 — Settings + the door ✅ (v0.25.0)**: /lap/settings/ (session card, appearance, language, panel-section switches, rank→permissions from the domain, data & about) and /lap/session/ (the login, contextual per D16) ×5 locales. **D14 closed by Oracle order**: MISSION-002 Steps 1–3 landed. Auth now fails closed cleanly (401/503, no module-scope crash); budget gate learned the identity class; `[hidden]` guard added after a control leaked to visitors.
- **MISSION-011 — The Oracle zone ✅ (v0.27.0)**: rank granted by `ADMIN_WALLET_ADDRESSES` (Pablo's wallet configured locally; unit-pinned), `/api/admin/overview` gated by real session + domain permission ladder (403 to anonymous, proven end to end), `/lap/admin/assets/` as a §13.11 table (search, filters, sortable, per-asset storage layers, read-only), management zone signposted by rank, L.A.P. full-width via a layout `wide` mode (no vw hack — Firefox caught it), citizenship card on Phosphor.
- **Still missing for a full admin (needs the write-path ADR, queued in open-questions)**: banning/promoting users (no user store exists — the platform only knows the session it issued and the configured Oracle wallets), asset upload/edit/delete, Session Zero rank progression (Phase 3), Portals map data (domain has the type, not the constants), Seasons/Loot (Phase 3).
- **MISSION-012 — Portals of Numinia ✅ (v0.28.0, 2026-08-16 night, autonomous "trabaja" order)**: portal constants land in the domain (13 district worlds + Ágora hub as its own `PortalHub` type + 6 announced-unbuilt spaces; canonical source `data/portals/numinia-portals.json` in the data repo, recovered from the consolidated history's record; 5 locales, ja/ko queued for D9; domain still 100%). `/lap/portals/` renders the real map: positioned district map (desktop-only, aria-hidden — dots can't honor touch targets) + the canonical district-card reading with outbound oncyber links. The WCAG gate caught opacity-dimmed cards sinking contrast — quiet moved to the surface (dashed, transparent), never the text. LAP iteration item #1 done; NEXT #5 done.
- **MISSION-013 — Sheet extras, first slice ✅ (v0.29.0, 2026-08-16 night)**: Export PDF beside Export .md (window.print + print stylesheet — the browser hands the citizen the file, zero deps, File Over App) and Prestige/Prisma §9.5 probes atop the sheet in view mode. Behavior pinned in the cross-engine spec (print stubbed, probes on leaving edit). **Avatar slice deliberately queued**: an image needs a home, and that is the write-path ADR's question. LAP iteration #4 partially done.
- **MISSION-014 — Compact mobile chrome ✅ (v0.30.0, 2026-08-16 night)**: the header sprawled into three loose rows on phones (154px before any content, seen on the live site). Now two tight rows (wordmark + utilities / full-width nav at 44px targets), 105px total. Regression pinned in the cross-engine spec (≤120px at 360px, all three engines).
- **ADR-018 DECIDED + MISSION-015 groundwork ✅ (2026-08-16 night, "dale")**: the write-path session happened in-flight — Oracle adopted the dossier's recommendation in full (git-as-DB spine + citizen attestations, census public/moderation private, uploads via PR review, nothing personal server-side). `packages/state` forged ahead of its repo: fail-closed env, WinterCG base64, strict census/moderation Zod records, GitStateStore with SHA-conditional writes and the acting wallet in every commit trailer. 22 tests, 100% coverage. **Waiting only on the Oracle: create the private state repo (D23 name) + mint its fine-grained PAT** — then the census/ranks endpoints are wiring.
- **MISSION-016 server slice ✅ (v0.31.0, 2026-08-16 night)**: the census goes live-shaped. `resolveRank` at login (allowlist Oracle → census record → Nomad; outage/absence/poison all land on Nomad; a census can never mint an Oracle — pinned). `/api/admin/census` GET/POST: rank grants as audited commits (SHA retry, actor trailer), `manage-users` gate, archon needs `promote-archon`, 503 while D23 pends, 403 to anonymous (cross-engine pinned). **Remaining slice: the admin census UI** — worth building once D23 exists so it can be exercised for real.
- Next: Oracle's next punch-list items, one at a time.

## 🚀 DEPLOYED — numinia.com serves the platform (2026-08-15, night)

**The city is public.** `numinia.com` + `www` serve the new platform from the
`numinia-web` Worker, deployed via the GitHub Actions "Deploy to Cloudflare"
workflow (manual trigger, Pablo pressed the button). Externally verified:
`/`, `/city/`, `/lap/` all 200. The old landing is gone (history in the
backup bundle). **Same night, Oracle decision: AUTO-DEPLOY on green CI** —
push to main → CI green → that SHA ships itself, smoke-tested against the
live site. Manual button stays as the emergency lever (refuses non-green
commits unless `force`). Full picture: docs/deploy-runbook.md.

**First remote CI — every fresh-runner lie found and fixed tonight:**
`.nvmrc` said Node 22 while the repo lives on 24 (engine-strict refused
license-checker@5) · e2e installed only Chromium while CI config enables
chromium+firefox+webkit · deploy/e2e built the app without building
workspace packages first (dist/ exports) · `type-check` needed `^build`
(dependents resolve @numinia/domain from dist/*.d.ts) · turbo strict mode
was silently stripping build env vars — turbo.json now declares all seven.
Audit highs (axios/js-yaml/ws, thirdweb transitives) pinned via root
overrides; production audit clean at high level.

**Cleanup queue:** ~~delete the duplicate `numinia-platform` Worker~~ (gone —
confirmed absent in the dashboard 2026-08-15 night) · key rotation TOMORROW
(inherited CLOUDFLARE_API_TOKEN repo secrets, thirdweb, R2, ~21 stale legacy
Vercel vars) · cache Playwright browsers in the e2e job (~10 min → ~3) ·
confirm the e2e job's first full remote verdict.

## Previous in-flight record (superseded above, kept for context)

**The "outage" never existed.** External vantage points get `200 OK` from
`www.numinia.com` (Cloudflare edge, cache HIT). The timeouts were LOCAL: the
Oracle's ISP blocks the Cloudflare IP range 188.114.x.x (Spanish LaLiga-style
blocking, Saturday evening). Lesson recorded: always verify from an external
vantage (e.g. `curl "https://api.hackertarget.com/httpheaders/?q=https://www.numinia.com"`)
before diagnosing a Cloudflare outage from this network. check-host.net is
itself behind Cloudflare and also unreachable during blocks.

**Worker consolidation (Oracle order 2026-08-15):** only ONE Worker must exist —
`numinia-web`, matching the GitHub repo. The custom domains `numinia.com` + `www`
are back on `numinia-web` (the rollback held) and serve the OLD landing.
`wrangler.jsonc` now targets `"name": "numinia-web"`; the duplicate
`numinia-platform` Worker gets deleted after the first successful platform
deploy. `nwos-web` is unrelated — never touch it.

**GitHub remote DONE (2026-08-15, night):** the Oracle ordered the destructive
path — `git push --force origin main` to `numengames/numinia-web` (now PRIVATE,
flipped before the push because docs/seminal/ carries the unpublished RPG
manual). Old repo backed up at `~/Documentos/Repositorios/numinia-web-pre-platform.bundle`.
Old repo's GitHub-Actions deploy workflow died with the push (workflows run from
the pushed tree); its repo secrets `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID`
SURVIVE and are reusable for our deploy workflow. Our `ci.yml` ran remotely for
the first time (MISSION-000's last criterion — verify the result). GitHub flags
10 Dependabot vulnerabilities (3 high) — review pending.

**Wrangler auth:** OAuth login as pablofm@numengames.com (broad scopes), stored
in `~/.config/.wrangler/config/default.toml`. Agent shells CAN use wrangler.
The permission classifier blocks the agent from sourcing `.env` (secrets) and
from force-pushes — those exact commands must be run by the Oracle (`!` prefix).

**Remaining before the platform goes live on numinia.com:**

1. Worker secrets (Oracle runs it — classifier blocks the agent):
   `set -a; source apps/store/.env; set +a;` then for each of
   `THIRDWEB_SECRET_KEY`, `AUTH_SESSION_SECRET`, `ADMIN_WALLET_ADDRESSES`:
   `printf '%s' "$VAR" | npx wrangler secret put VAR --name numinia-web`
2. Key-rotation audit (NEXT #2) — still mandatory before the final deploy.
3. Deploy decision: GitHub Actions workflow (reuse surviving repo secrets;
   needs `PUBLIC_THIRDWEB_CLIENT_ID` as a repo variable) vs manual
   `DEPLOY_TARGET=cloudflare npm run build --workspace=apps/store && npx wrangler deploy -c wrangler.jsonc`.
4. After first successful deploy: delete the `numinia-platform` Worker.

License stays undecided (D11): the README states plainly that default copyright
applies meanwhile; the repo is private, which softens the urgency.

## NEXT (re-prioritized 2026-08-15, evening — after MISSIONS 006-011)

| #   | What                                                                                                                                                                                                                                                                                                                                           | Owner                     | Blocks / notes                                                               |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- | ---------------------------------------------------------------------------- |
| 1   | **Push day**: license D11 → repo name/visibility (D15) → `docs/remote-checklist.md` → first CI green (never run remotely yet, closes MISSION-000's last criterion)                                                                                                                                                                             | 🧬 decision, 🤖 execution | Everything below #1 is invisible to the world until this happens             |
| 2   | **Key-rotation audit** (thirdweb, R2, GitHub, ~21 stale vars in the legacy Vercel project) + decommission                                                                                                                                                                                                                                      | 🧬🤖                      | **Mandatory before deploy**; the Oracle wallet allowlist ships as config too |
| 3   | **Deploy day**: revisit D3-bis (Cloudflare case is now strong) + consent banner and analytics transport (D12 — today: memory transport, nothing leaves) + fill the 3 `[PENDING]` legal fields                                                                                                                                                  | 🧬 decision, 🤖 execution | Needs #1 and #2. Legal fields need Pablo's company data                      |
| 4   | **Write-path: DECIDED — ADR-018** (2026-08-16: git-as-DB spine + citizen attestations, census public, uploads via PR review, no personal state server-side). **Implementation needs from the Oracle**: create the private state repo (D23 name) + mint its fine-grained PAT. Then: census/ranks → moderation → upload flow → Session Zero (D4) | 🧬 repo+token, 🤖 code    | ADR-018 unblocked the queue; D23 and D4 are the last gates                   |
| 5   | **Portals data**: 14 portal constants into `@numinia/domain` (type exists) → the district map screen                                                                                                                                                                                                                                           | 🤖 (data from 🧬/manual)  | Cheap, visible, self-contained: the best next feature bite                   |
| 6   | **Fix the data repo** (data-doctor): 3 thumbnails, 1 VRM binary on R2, 3dprint catalog 404                                                                                                                                                                                                                                                     | 🧬 Pablo                  | Small; then re-run the doctor + refresh fixtures                             |
| 7   | **Session Zero design** (D4: Hyperfy infrastructure location unknown) → seals, ranks beyond Nomad, Seasons/Loot (Phase 3)                                                                                                                                                                                                                      | 🧬 info, then 🔀          | Blocked on locating the Hyperfy side                                         |
| 8   | **Quality debt**: translation QA ja/ko/pt-br (D9, sheet labels fall back to EN), WebKit/iPhone engine verification (needs system libs or CI), passkey retest on a phone                                                                                                                                                                        | 🧬 hire / 🤖              | Honest gaps recorded in MISSION-008/009                                      |
| 9   | **MISSION-005 — Data dignity narrative** (specced, seed line live)                                                                                                                                                                                                                                                                             | 🔀                        | Glossary terms first (ADR-012)                                               |
| 10  | **Decide `apps/com`'s fate**: it holds a single placeholder page while everything real lives in `store`. Keep as the future production track, or fold it in?                                                                                                                                                                                   | 🧬 decision               | Dead weight in CI and knip until decided                                     |
| 11  | **numinia.com merge** when ordered (plan ready in docs/merge-numinia-com.md, D18 decided)                                                                                                                                                                                                                                                      | 🧬 order, 🤖 execution    | Independent of #1 only in theory: same repo, same deploy story               |
| 12  | Parked sessions in `docs/open-questions.md`: taxonomy revisit, gender-restriction policy (ADR-013), Huly integration (D6), brand visual package (D8), season pricing (D7), L.A.P.→P.A.R. naming (D5)                                                                                                                                           | 🧬🤖                      | Each scoped and referenced                                                   |

**Proposed constitution update (needs Oracle authorization — open-questions §B):** CLAUDE.md's phase table still reads "Phase 0 in progress · Phases 1–2 not started". Reality: Phase 0 done, **Phase 1 done** (SSG pages, multi-format viewer, search, download), **Phase 2 largely done** (progressive auth, citizen dashboard, character sheet — pending server-side persistence, which is #4). Phase 3 not started.

## Standing orders (never forget)

- **Main deploys itself** (since 2026-08-15 deploy day): every green CI on main ships to numinia.com. Therefore: nothing lands on main that should not be public, and main stays green. npm publication of `@numinia/*` remains forbidden until ordered.
- The legacy repo is condemned: never read, never write, zero reuse (`docs/reference/` holds everything extracted; the consolidated git history is the sanctioned record).
- Glossary first, then code, for any domain term. Data-metric on every interactive element. Tests before implementation.
