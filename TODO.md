# TODO.md — Numinia Platform Backlog

> Tasks captured during the 2026-04-03 architecture session.
> Format: each task has a phase, priority, agent type, and status.
> This file is the single source of truth until tasks migrate to Huly.
>
> Last updated: 2026-08-15 — Phase 0 executed (MISSION-000); deploy deferred by Oracle order until the GitHub remote exists (with license decision D11)

---

## Phase 0 — Foundations

### 0.2 Domain Model (in progress)

- [x] Types: guilds, factions, districts, ranks (14 type files)
- [x] Types: seasons, adventures, portals, equipment, permissions, missions (4 new files)
- [x] Constants: guilds with full i18n (5 languages)
- [x] Constants: factions with full i18n
- [x] Constants: ranks with full i18n
- [x] Constants: seals and thresholds
- [x] Constants: permissions with `resolvePermissions()` and `hasPermission()`
- [x] Constants: species (5 species, all fields, i18n) — 🤖 Digital
- [x] Constants: districts (4 districts, coordinates, i18n) — 🤖 Digital
- [x] Constants: competences (9 competences, 3 domains, i18n) — 🤖 Digital
- [x] Constants: archetypes (12 archetypes, guild/faction alignment) — 🤖 Digital
- [x] Constants: humors (4 humors, attribute links) — 🤖 Digital
- [x] Validators: Zod schemas for all external data (GitHub repo JSON) — 🤖 Digital
- [x] Validators: Zod schema for env vars (crash at boot) — 🤖 Digital
- [x] Resolvers: `asset-url.ts` (Arweave → R2 → IPFS → GitHub chain) — 🤖 Digital
- [x] Resolvers: `guild-resolver.ts` (superordinate → basic → subordinate) — 🤖 Digital
- [x] Tests: 100% coverage on all types, constants, validators, resolvers — 🤖 Digital
- [x] `package.json` for `@numinia/domain` — 🤖 Digital

### 0.1 Monorepo Scaffold

- [x] Initialize Turborepo with `apps/store`, `apps/com`, `packages/*` — 🤖 Digital
- [x] `tsconfig` base with strict mode — 🤖 Digital
- [x] ESLint + Prettier config — 🤖 Digital
- [x] `turbo.json` with pipeline (type-check → lint → test → build) — 🤖 Digital

### 0.3 Design Tokens

- [x] `packages/ui/src/tokens.css` with Brand & Culture colors — 🤖 Digital
- [ ] Tailwind 4 config consuming tokens — 🤖 Digital
- [ ] **BLOCKED:** Need visual Brand & Culture assets (logo, guild icons, seals) — 🧬 Biological (Pablo)

### 0.4 Astro + Testing Config

- [x] `apps/store` with Astro 5 + React integration — 🤖 Digital
- [x] Vitest config — 🤖 Digital
- [x] Playwright config — 🤖 Digital
- [x] Cucumber.js config + first `.feature` file — 🤖 Digital
- [x] i18n routing (5 languages) — 🤖 Digital

### 0.5 Env Var Validation

- [x] Zod schema for all env vars — 🤖 Digital
- [x] Crash at boot if missing — 🤖 Digital
- [x] `.env.example` with all required vars — 🤖 Digital

### 0.6 CI/CD

- [x] GitHub Actions workflow: type-check → lint → test → build — 🤖 Digital
- [ ] Branch protection rules for `main` — 🧬 Biological

### 0.7 Spike Technical

- [x] Astro 5 + React island with Three.js/@pixiv/three-vrm rendering a VRM — 🔀 Hybrid
- [x] SIWE login flow with viem in Astro endpoint — 🔀 Hybrid
- [x] Fetch data from `numinia-digital-goods-data` via GitHub API — 🤖 Digital
- [x] **DECISION GATE: PASSED (2026-08-15).** VRM island renders (Playwright-verified); no Next.js fallback needed. See missions/MISSION-000-report.md

---

## Conversations Pending (dedicated sessions needed)

### 🔴 Critical

- [ ] **Auth Progressive (Web2→Web3)** — ADR-006 details TBD. Pablo has "many nuances." Dedicated chat needed. Blockers: what is Web2 entry method? When does Web2 become insufficient? How to migrate Web2→wallet? — 🧬🤖 Hybrid session

### 🟠 High

- [ ] **Clarify "L.A.P"** in permissions — Seen in v0.1.0 screenshots as "Access L.A.P" (Vernacular permission). Unknown acronym. — 🧬 Ask Pablo
- [ ] **Huly integration design** — How does the web platform connect to Huly mission boards? API? Deep links? Bidirectional? — 🧬🤖 Hybrid session
- [ ] **Season pricing / business model** — v0.1.0 shows 9.99€ season pass. Is this validated? Other revenue streams? — 🧬 Pablo decision

### 🟡 Medium

- [ ] **Open Claw agent integration** — When do AI agents (designed with Open Claw) join the project? Recommendation: not before Phase 1 at 50%. — 🧬 Pablo decision
- [ ] **Brand & Culture visual package** — Pablo to provide: logo files, guild iconography, seal designs, color usage examples. Needed for design tokens. — 🧬 Biological (Pablo)
- [ ] **Translation QA (JA, KO, PT-BR)** — All i18n constants need native speaker review. Current translations are functional but unverified. — 🧬 Biological (hire/find reviewers)

---

## Quality & Process

- [ ] Set up ADR template in `docs/decisions/` — 🤖 Digital
- [ ] Create Mission Template as a Huly template — 🧬 Biological
- [ ] Define DoR (Definition of Ready) for missions — 🔀 Hybrid
- [ ] Establish session cadence: themed sessions, not mega-sessions — 🧬 Biological (Pablo to schedule)

---

## Future Phases (not yet actionable)

### Phase 1 — Platform Viewer/Manager
- [ ] Migrate data from `numinia-digital-goods-data` to new schema
- [x] SSG pages for each asset (one URL per asset, SEO)
- [x] Multi-format viewer (GLB, VRM, images, audio, video)
- [x] Search + filter client-side
- [ ] Download flow + batch download
- [x] i18n: 5 languages in UI
- [ ] Season pass mockup (visual, not functional)
- [ ] Adventure visualization (RPG-style presentation)

### Phase 2 — Identity
- [ ] Progressive auth implementation (depends on ADR-006 completion)
- [ ] Citizen dashboard
- [ ] Character sheet (interactive, based on v0.1.0 design)

### Phase 3+ — Deferred
- [ ] Gamification, decentralization, XR (per rebuild plan)
