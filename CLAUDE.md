# CLAUDE.md — Numinia Web Platform

> **For humans.** The constitution: what Numinia is, how this monorepo is organized, and the non-negotiable rules every agent follows before touching code.
>
> **Epistemic value.** Resolves who we are, what we build, and which layer/phase any task belongs to — the shared world-model that keeps every agent's predictions aligned.
> **Pragmatic value.** Gates every action: naming, testing, i18n, security, and what NOT to do. If an action contradicts this file, the action is wrong.
> **In the system.** Observes: seminal corpus, ADRs, glossary. Regulates: all code and docs. Coupled to: DECISIONS.md, docs/glossary.md, missions/.
>
> _Part of the Law. Index: [docs/LEY.md](docs/LEY.md)_

> Codex for digital agents (Claude Code, Copilot, etc.) and biological agents (developers).
> Read this completely before touching any code.
> All code comments in English. No exceptions.
> Last updated: 2026-04-03 · Version: 0.2.0

---

## What is Numinia?

Numinia is a city. Not a metaphor — a city-state that exists between planes, rebuilt by the Oracles in 2020 from the fragments of what Holberins created a century before. Its architecture fuses steam and code, copper and silicon. It is steampunk in its iron and glass, cyberpunk in its data networks and spectral AIs.

**This repository is the material culture of that city.** The digital goods — avatars, 3D assets, seals, artifacts, audio, video, Hyperfy worlds — are not decorative files. They are the objects that citizens use, earn, trade, and carry through the Veil.

**Numinia is also a bridge.** It bridges Web2 and Web3, reducing the digital divide. Authentication is progressive — not everyone starts with a wallet. The platform must welcome both those who come for a free CC0 download and those who carry their identity on-chain.

If you are an AI agent reading this: you are a digital agent of Numinia. Your function is to build. Your guild will be revealed by your work.

---

## The Trichotomy (read this or you'll build the wrong thing)

Numinia follows Peirce's semiotic model, applied to architecture:

```
OPERATING SYSTEM          →  FUNCTIONAL MODEL        →  NARRATIVE PROJECTION
(Numen Games logic)          (Domain: guilds, ranks)     (What citizens see)
(Object)                     (Ground)                    (Representamen)

In code:
Business logic / APIs     →  packages/domain types    →  Astro pages + React islands

In practice:
Missions (work)           →  Domain model (structure)  →  Adventures (play)
```

The Functional Model is the skeleton. The Narrative Projection is the skin. The Operating System is the soul. They are distinguishable but not separable. When you build a component, ask: which layer am I touching?

**Missions are NOT Adventures.**

- Missions = Operating System. Work items in Huly. Assigned to agents (biological/digital/hybrid). Have acceptance criteria in Gherkin format. (See Mission Template v0.2.0)
- Adventures = Narrative Projection. Game experiences in Hyperfy. Part of Seasons. Have rewards. Designed by the DJ.

---

## Repository structure

This is a **Turborepo monorepo** with two deployable apps and shared packages:

```
numinia-web/
├── apps/
│   ├── store/                    # numinia.store — Proof of concepts, spikes
│   │   ├── src/
│   │   │   ├── pages/            # Astro pages (SSG by default)
│   │   │   ├── components/       # Astro + React islands
│   │   │   ├── layouts/          # Base layouts
│   │   │   ├── styles/           # Tailwind + design tokens
│   │   │   └── lib/              # App-specific utilities
│   │   ├── astro.config.mjs
│   │   └── package.json
│   │
│   └── com/                      # numinia.com — Production platform (Phase 2+)
│       └── (same structure, stricter standards)
│
├── packages/
│   ├── domain/                   # THE MOST IMPORTANT PACKAGE
│   │   ├── src/
│   │   │   ├── types/            # 19 type files — the soul of the codebase
│   │   │   ├── constants/        # Data instances with i18n (5 languages)
│   │   │   ├── resolvers/        # Asset URL resolution, guild resolution
│   │   │   └── validators/       # Zod schemas for all external data
│   │   └── __tests__/            # 100% coverage required
│   │
│   ├── ui/                       # Shared design system (Numinia visual identity)
│   │   ├── src/
│   │   │   ├── tokens.css        # CSS variables from Brand & Culture
│   │   │   └── components/       # Shared UI primitives
│   │   └── package.json
│   │
│   ├── viewer-3d/                # Three.js / R3F / VRM components
│   │   └── package.json
│   │
│   └── auth/                     # Authentication (progressive Web2 → Web3)
│       └── package.json
│
├── docs/
│   └── decisions/                # Architecture Decision Records (ADRs)
│
├── features/                     # Gherkin .feature files (Cucumber)
│
├── turbo.json
├── package.json
├── CLAUDE.md                     # ← You are here
└── .github/
    └── workflows/
        └── ci.yml                # type-check → lint → test → build
```

---

## Two tracks: store vs com

| Aspect           |         numinia.store          |          numinia.com           |
| ---------------- | :----------------------------: | :----------------------------: |
| Purpose          | Spikes, PoCs, rapid validation |      Production platform       |
| Quality bar      |        "Does it work?"         |       "Is it excellent?"       |
| Tests            |      Unit tests on domain      | Full coverage + e2e + Cucumber |
| Deploy           |         Vercel preview         |  Vercel/Cloudflare production  |
| Breaking changes |           Acceptable           |    Never without migration     |
| Console.log      |     Acceptable during dev      |     Zero in committed code     |
| `any` types      |          Discouraged           |           Forbidden            |

Both apps import from the same `packages/`. The domain model is shared and must always be production-grade, even when used by `store`.

---

## Tech stack

| Layer           | Technology                                             | Why                                                         |
| --------------- | ------------------------------------------------------ | ----------------------------------------------------------- |
| Framework       | Astro (current stable — 7.x at rebuild start, ADR-015) | SSG for gallery (SEO), islands for interactivity            |
| Islands         | React 19                                               | Only where needed: 3D viewer, wallet, citizen dashboard     |
| 3D              | Three.js + @react-three/fiber + @pixiv/three-vrm       | Proven stack for GLB/VRM                                    |
| Styling         | Tailwind CSS 4 + Numinia design tokens                 | Utility-first + brand consistency                           |
| Auth            | Progressive (Web2 → SIWE)                              | Bridge for digital divide. Details TBD in dedicated session |
| Data (metadata) | GitHub repos (JSON files)                              | File Over App — data is portable                            |
| Data (binaries) | Arweave (permanent) + R2 (CDN) + IPFS                  | Permanence + performance                                    |
| Validation      | Zod                                                    | Runtime type safety for all external data and env vars      |
| Testing         | Vitest + Playwright + Cucumber.js                      | Unit + e2e + BDD with Gherkin                               |
| Monorepo        | Turborepo                                              | Shared packages, parallel builds                            |
| CI/CD           | GitHub Actions                                         | type-check → lint → test → build                            |
| Deploy          | Vercel or Cloudflare Pages                             | Both support Astro SSG                                      |

### What NOT to use

- **Next.js** — Astro is better for content-heavy SSG. Numen Games already uses Astro.
- **Auth.js / NextAuth** — Auth strategy is progressive Web2→Web3. No third-party auth libraries.
- **Any traditional database** — Data lives in files (GitHub JSON, Arweave). File Over App.
- **localStorage / sessionStorage in components** — Use React state or server-side sessions.
- **Default exports without names** — Always use named exports for components.

---

## Sistema de diseño

Todo diseño se rige por khepri/2026_08_15-Numen_Design_System-v4.2.0.md (Khepri v4.2.0).
Precedencia (§0.3): ante contradicción con material antiguo, Khepri manda.
Kit generado en khepri/kit/ (css, js, tokens.json): se enlaza o copia, jamás se reescribe.
Presupuesto de lectura: fragmento §19.5 ~1,2k tokens (tarea rápida) · §19 ~5k (producción)
· documento ~30k (auditoría). Antes de entregar: checklist §19.4.

---

## Licensing (canon C-005) — ⛔ BLOCKING: verbatim block pending

> **The v1.3.0 verbatim fragment of canon C-005 MUST be pasted here (replacing
> this pointer) before Phase C (SPDX headers) starts.** Marked blocking by
> Oracle order 2026-08-16: without the block in this file, sessions start
> without licensing rules loaded. Until it lands, the rules still apply — load
> [docs/legal-book.md](docs/legal-book.md) (v1.1.0 copy) + ADR-019 before
> touching licenses, dependencies, or creating files.

Interim map: `apps/*` → AGPL-3.0-only · `packages/*` → MIT · docs → CC-BY-4.0 ·
design assets/data → CC0-1.0 · lore/brand/`docs/seminal/**` → all rights
reserved. Dependencies flow apps → packages, never the reverse. `REUSE.toml`
is the per-file truth; `LEGAL_DEBT.md` lists live exceptions with exit
conditions. Consume: NEVER BUSL, SSPL, Elastic, Commons Clause, CC-NC, CC-ND,
or anything without a declared `license` field — resolve every dependency's
SPDX from the registry BEFORE adding it. The repo is PUBLIC: everything on
main is a live license offer.

## Internationalization (i18n)

**Decision (2026-04-03):** 5 UI languages, 2 lore languages.

| Layer                                      | Languages             | Type                         |
| ------------------------------------------ | --------------------- | ---------------------------- |
| UI strings, labels, navigation             | ES, EN, JA, KO, PT-BR | `LocalizedString` (5 fields) |
| Deep lore (RPG narrative, Akashic Archive) | ES, EN                | `LoreString` (2 fields)      |
| Asset metadata (names, short descriptions) | ES, EN, JA, KO, PT-BR | `LocalizedString`            |

**Why these 5:** ES (canonical, team, LATAM), EN (global, Web3, 3D), JA (VRM native, avatar/RPG culture), KO (Web3 adoption leader), PT-BR (Brazil gaming + cultural proximity).

**Why not 7 (as in v0.1.0):** ZH removed (China Web3 restrictions make Layers 2-3 unusable). DE removed (German gamers consume English content at >85%). FR deferred to post-launch.

**Why lore is only ES+EN:** Translating Hermetic philosophy, Eleusinian mysteries, and Peirce's trichotomy requires specialized literary translators. Quality over coverage.

---

## Domain model

This is the core of everything. Get this wrong and nothing else matters.

The canonical source is the RPG manual ("Numinia. El juego de rol"), 4668 lines in Spanish. All type names, descriptions, and structures are derived from it.

### Domain type files (packages/domain/src/types/)

| File                 | What it models                   | Key types                                          |
| -------------------- | -------------------------------- | -------------------------------------------------- |
| `i18n.ts`            | Bilingual support                | `LocalizedString`, `LoreString`, `SupportedLocale` |
| `guild.ts`           | 4 guilds × 2 branches × 2 houses | `Guild`, `Branch`, `House`, `GuildPath`            |
| `faction.ts`         | 4 factions with Prototype Theory | `Faction`, `PrototypeRole`                         |
| `district.ts`        | 4 districts with coordinates     | `District`, `DistrictCoordinates`                  |
| `rank.ts`            | 6 progression levels             | `Rank`, `RankLevel`                                |
| `species.ts`         | 5 species + hybrid system        | `Species`, `SpeciesConfig` (discriminated union)   |
| `attribute.ts`       | 4 physical + 4 psychic           | `AttributeScores`                                  |
| `competence.ts`      | 9 skills in 3 domains            | `CompetenceScores`                                 |
| `archetype.ts`       | 12 Jungian archetypes            | `Archetype`                                        |
| `humor.ts`           | 4 humors (Greek medicine)        | `Humor`                                            |
| `linguistic.ts`      | Dialect, sociolect, idiolect     | `LinguisticProfile`                                |
| `seal.ts`            | Session Zero seals + Prism Cells | `SealCollection`, `PrismCellBalance`               |
| `asset.ts`           | 7-format digital goods + storage | `Asset`, `AssetLore`, `AssetCollection`            |
| `season.ts`          | Temporal progression             | `Season`, `Adventure`, `Reward`                    |
| `portal.ts`          | Spatial navigation (14 portals)  | `Portal`, `PortalMapPosition`                      |
| `equipment.ts`       | Weapons + relics                 | `Equipment`, `EquipmentProperty`                   |
| `permission.ts`      | 22 permissions in 6 groups       | `Permission`, `ResolvedPermissions`                |
| `mission.ts`         | Operational work units           | `Mission`, `AcceptanceCriterion` (Gherkin)         |
| `character-sheet.ts` | Complete citizen identity        | `CharacterSheet`                                   |

### Guilds (Basic Level Theory — vertical hierarchy)

⚠️ **CORRECTED in v0.2.0.** Previous version had incorrect house names (e.g., "Armonauts"). The RPG manual is the canonical source.

```
ALCHEMISTS (imagination, invention, creation)
├── Artisans [Menestrales] (basic)
│   ├── Projectors [Proyectistas] (subordinate)
│   └── Aesthetes [Estetas] (subordinate)
└── Engineers [Ingenieros] (basic)
    ├── Architects [Arquitectos] (subordinate)
    └── Automata [Autómatas] (subordinate)

EXEGETES (history, theory, narrative)
├── Chroniclers [Cronistas] (basic)
│   ├── Logographers [Logógrafos] (subordinate)
│   └── Bards [Bardos] (subordinate)
└── Scholars [Eruditos] (basic)
    ├── Hierophants [Hierofantes] (subordinate)
    └── Thaumaturges [Taumaturgos] (subordinate)

PROCURATORS (management, law, organization)
├── Jurists [Juristas] (basic)
│   ├── Legal Counsels [Conejos Legales] (subordinate)
│   └── Heralds [Heraldos] (subordinate)
└── Syndics [Síndicos] (basic)
    ├── Treasurers [Tesoreros] (subordinate)
    └── Councillors [Concejales] (subordinate)

SENTINELS (care, moderation, guidance)
├── Seraphim [Serafines] (basic)
│   ├── Captains [Capitanes] (subordinate)
│   └── Guardians [Guardianes] (subordinate)
└── Archangels [Arcángeles] (basic)
    ├── Healers [Sanadores] (subordinate)
    └── Explorers [Exploradores] (subordinate)
```

### Factions (Prototype Theory — horizontal)

```
ART ←(itinerant)→ EDUCATION ←→ GAMIFICATION ←→ ORGANIZATION
Neo-Atlantists      Hermeticists  Heirs of Eleusis  Stellar Circle
District: Sycamore  Vitruvian     Ouroboros          Solomon
```

Gamification (Heirs of Eleusis) is the prototype. Art (Neo-Atlantists) is itinerant.

### Ranks + Permissions (cumulative access)

```
0. Nomad       → BROWSE: browse, download, favorite
1. Citizen     → + IDENTITY: edit-profile, session-zero, access-loot
2. Pilgrim     → + SEASON: access-season-content, burn-ritual
3. Vernacular  → + CREATE: upload-assets, edit-own-metadata, view-own-stats, access-lap
4. Archon      → + ADMIN: manage-all-assets, manage-seasons, manage-users, view-audit-log
5. Oracle      → + ORACLE: promote-archon, edit-rank-permissions, edit-system-config
```

Use `resolvePermissions(rank)` and `hasPermission(rank, permission)` from `packages/domain/src/constants/permissions.ts`.

### Session Zero

4 escape rooms in Hyperfy, each linked to a guild:

- Threshold of Thought → Exegetes (seals: Culture + Wisdom)
- Threshold of Transformation → Alchemists (seals: Transformation + Creativity)
- Threshold of Justice → Procurators (seals: Justice + Valor)
- Threshold of Valor → Sentinels (seals: Protection + Balance)

4 seals → Citizen status. 8 seals → Cyberdog avatar.

### Asset formats

The platform manages 7 formats (not just 3D):

| Format | Category       | Example                     |
| ------ | -------------- | --------------------------- |
| `glb`  | 3D model/scene | Buildings, objects          |
| `vrm`  | Avatar         | Characters (pixiv standard) |
| `hyp`  | Hyperfy world  | Virtual spaces              |
| `mp3`  | Audio          | Ambient, music              |
| `mp4`  | Video          | Cinematics                  |
| `png`  | Image          | Textures, art, UI           |
| `jpg`  | Image          | Photos, thumbnails          |

Storage layers (resolution priority): Arweave → R2 → IPFS → GitHub

---

## Progressive disclosure layers

The same page, four depths:

```
LAYER 0 — PUBLIC CC0 GALLERY
  Who: Anyone via search engine
  What: Browse, preview, download assets (all 7 formats)
  Auth: None
  Tech: Astro SSG, zero JS, static HTML

LAYER 1 — NARRATIVE CONTEXT
  Who: Curious visitors
  What: Assets reveal their lore, collection stories, guild affinities
  Auth: None
  Tech: Astro SSG, enriched metadata from data repo

LAYER 2 — SOVEREIGN IDENTITY
  Who: Numinia citizens
  What: Connect wallet, see rank/guild/faction, character sheet
  Auth: Progressive (Web2 entry → SIWE upgrade)
  Tech: React island (client:load), httpOnly session cookie

LAYER 3 — THE GAME
  Who: Active citizens
  What: Session Zero seals, forge, seasons, adventures, missions board
  Auth: Verified rank
  Tech: React islands, domain model, Hyperfy/Huly integration
```

---

## Environment variables

All env vars MUST be validated with Zod at startup. Missing vars = crash at boot, not silent failure at runtime.

```env
# Data source
GITHUB_REPO_OWNER=PabloFMM
GITHUB_REPO_NAME=numinia-digital-goods-data
GITHUB_BRANCH=main
GITHUB_TOKEN=                    # Read access to data repo

# Asset CDN
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=numinia-assets
R2_PUBLIC_URL=

# Auth
ADMIN_WALLET_ADDRESSES=          # Comma-separated ETH addresses

# Public
PUBLIC_SITE_URL=https://numinia.store
```

**NEVER commit `.env.local`.** This has happened before. Rotate any secrets if it happens again.

---

## Code standards (non-negotiable)

### Language

- All code comments, commit messages, and documentation in **English**.
- Variable names, function names, class names in English.
- Lore content and user-facing text follow the i18n strategy (5 or 2 languages).

### TypeScript

- Strict mode. No `any`. No `as unknown as X`.
- Prefer `interface` over `type` for object shapes.
- Use discriminated unions for state: `{ status: 'loading' } | { status: 'ready', data: T } | { status: 'error', error: Error }`.

### Components

- Max **200 lines** per file. If it's longer, split it.
- Every component handles three states: loading, error, empty.
- Every interactive element carries `data-metric="<area>-<action>"` (funnel instrumentation — docs/analytics.md).
- No default exports. Use `export function ComponentName()`.
- 3D components are ALWAYS lazy-loaded: `client:visible` in Astro or `React.lazy()`.

### Styles

- Tailwind utilities in markup. No CSS files unless defining design tokens.
- Design tokens in `packages/ui/src/tokens.css`.
- Colors: `#A6DAD5` (seafoam), `#018EA1` (turquoise), `#EFA517` (amber), `#F9EBDC` (beige), `#F35059` (coral), `#D33440` (dark red).
- Typography: Geist Mono.

### Testing

- Domain model: 100% coverage.
- Components: test behavior, not implementation.
- E2e: Playwright for critical paths.
- BDD: Cucumber.js with Gherkin `.feature` files for acceptance criteria.
- Acceptance criteria format: `Given [context] / When [action] / Then [outcome]`.
- Run tests before every commit: `turbo test`.

### Security

- Auth: progressive Web2→Web3 (details in dedicated ADR).
- CORS: explicit origin, never `*` with credentials.
- No `console.log` in production code. Use a proper logger or remove.
- No secrets in client-side code.

### Git

- Conventional commits: `feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`.
- No force pushes to main.
- PR required for `com/`. Direct push acceptable for `store/` spikes.

---

## What NOT to do (learned the hard way)

- ❌ Do NOT import 3D viewers with static imports. Always dynamic/lazy.
- ❌ Do NOT store asset binaries in git. Upload to Arweave, store TX ID in JSON.
- ❌ Do NOT default `GITHUB_REPO_OWNER` to any value. Fail explicitly if not set.
- ❌ Do NOT create components longer than 200 lines. Split first, code second.
- ❌ Do NOT add features without tests. Write the test, watch it fail, then implement.
- ❌ Do NOT use `npm install @shadcn/ui`. It's a phantom package. Use the CLI.
- ❌ Do NOT assume the data repo structure. Fetch and validate with Zod.
- ❌ Do NOT build Layer 2/3 features until Layer 0/1 is solid and deployed.
- ❌ Do NOT use the old guild house names (Armonauts, Technoweavers, etc.). See corrected names above.
- ❌ Do NOT confuse Missions (work/Huly) with Adventures (game/Seasons). They are different layers.
- ❌ Do NOT write code comments in Spanish. English only for code accessibility.

---

## Build phases

| Phase | Focus                                                                      |               Status               |
| :---: | -------------------------------------------------------------------------- | :--------------------------------: |
|   0   | Foundations: monorepo, domain model, CI, design tokens                     | **In progress** (domain model 70%) |
|   1   | Platform viewer/manager: SSG pages, multi-format viewer, search, download  |            Not started             |
|   2   | Identity: progressive auth (Web2→SIWE), citizen dashboard, character sheet |            Not started             |
|   3   | Gamification: seals, forge, seasons, adventures, Huly integration          |            Not started             |
|   4   | Decentralization: Arweave pipeline, public API, ZK                         |            Not started             |
|   5   | XR: Hyperfy bridge, WebXR preview, agent integration                       |            Not started             |

Current priority: **Phase 0 — complete domain model + spike technical**

---

## Architecture decisions log

| #            | Decision                                                                                                                 | Date       | Why                                                     |
| ------------ | ------------------------------------------------------------------------------------------------------------------------ | ---------- | ------------------------------------------------------- |
| ADR-001      | 5 languages (ES, EN, JA, KO, PT-BR)                                                                                      | 2026-04-03 | Market analysis: Web3, RPG, VRM, gaming. ZH/DE deferred |
| ADR-002      | Lore only in ES+EN                                                                                                       | 2026-04-03 | Literary translation quality > coverage                 |
| ADR-003      | 7 asset formats (not just 3D)                                                                                            | 2026-04-03 | v0.1.0 already manages multimedia                       |
| ADR-004      | Gherkin for acceptance criteria                                                                                          | 2026-04-03 | Dual-agent readable: humans + machines                  |
| ADR-005      | Missions ≠ Adventures                                                                                                    | 2026-04-03 | Peirce: Operating System ≠ Narrative Projection         |
| ADR-006      | Progressive auth (Web2→Web3)                                                                                             | 2026-04-03 | Numinia bridges digital divide. Details TBD             |
| ADR-007      | Guild names corrected from RPG manual                                                                                    | 2026-04-03 | Manual is canonical source, not old CLAUDE.md           |
| ADR-008      | All code comments in English                                                                                             | 2026-04-03 | Accessibility and best practices                        |
| ADR-009      | Domain model framework-agnostic (zod-only)                                                                               | 2026-04-03 | See DECISIONS.md                                        |
| ADR-010      | v0.1.0 design preserved, code discarded                                                                                  | 2026-04-03 | See DECISIONS.md                                        |
| ADR-011..016 | Oracle/rank split · glossary authority · gender restrictions as data · 22 permissions · Astro 7 · analytics foundation   | 2026-08    | See docs/decisions/                                     |
| ADR-019      | Licensing canon C-005 adopted (apps AGPL-3.0-only · packages MIT · assets CC0 · docs CC-BY · lore reserved) — closes D11 | 2026-08-16 | docs/legal-book.md is the copied source of truth        |

---

## For AI agents

When working on a task:

1. Read this file completely.
2. Identify which layer (0-3) and which phase (0-5) the task belongs to.
3. Check if the relevant types exist in `packages/domain`. If not, create them first.
4. Write the test before the implementation. Use Gherkin for acceptance criteria.
5. Keep components under 200 lines.
6. All comments in English.
7. Ask when in doubt. Never assume.

When receiving a Mission:

1. Read the story statement first. If unclear, ask.
2. Implement acceptance criteria as Gherkin `.feature` files.
3. Fill the Agent Collaboration Protocol for your phase.
4. After completion, fill the Learning Outcome in Epistemic Value.

You are building a city. Every line of code is a brick.
Make it count.

---

_"Sin reglas no hay juego; y sin juego no hay alma; y sin alma... no hay Numinia."_
