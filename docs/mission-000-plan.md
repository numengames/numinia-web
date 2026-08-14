# MISSION-000 Execution Plan — file-by-file, with rationale

> Rule 2 compliance: MISSION-000 is rated **L**, so this plan requires Oracle approval before any code.
> Each file lists one line of WHY. Order = commit order (one acceptance criterion per commit).
> Inputs: constitution (CLAUDE.md v0.2.0), MISSION-000 spec, TODO.md §0, glossary v0.1.0 (pending ratification),
> legacy test audit rules (docs/reference/legacy-test-audit.md §D).
> Date: 2026-08-14 · Status: **AWAITING APPROVAL**

## Architectural verdict feeding this plan

**Legacy architecture: mismatched, not just buggy.** A 90%-static CC0 gallery was built as a fully dynamic
Next.js app: 37 serverless API routes, client-heavy rendering, no domain layer (types scattered), a data layer
frozen mid-migration (repository pattern + 5 routes still hitting `github-storage` directly), and security
boundaries that decode instead of verify. The defects found in the audit are symptoms of that mismatch.

**Rebuild architecture (constitution): sound.** Astro SSG + islands matches the actual read/write ratio;
`packages/domain` gives the domain a home; File Over App keeps data portable; the progressive layers 0–3 map
cleanly onto Peirce. Four risks remain, each with a mitigation in this plan or a scheduled session:

| # | Risk | Mitigation |
|---|---|---|
| R1 | Astro islands + Three.js/VRM friction | Phase 0.7 spike is last, behind a DECISION GATE (fallback: Next.js `output: export`) |
| R2 | Progressive auth undefined (ADR-006 TBD) | Phase 0 only builds the SIWE *spike*; audit rule "fail closed + test proving it" becomes a design constraint for the dedicated session |
| R3 | Write path without a database undecided (legacy wrote JSON to GitHub with optimistic locking) | Out of Phase 0 (read-only build). Needs an ADR before Phase 2; recorded in open-questions D-block |
| R4 | Data-repo schema vs new Zod schemas divergence | Phase 0 validates *current* real JSON shape; migration is Phase 1's first task |

Anti-goals inherited from the audit: no asset proxy route (serve CDN/Arweave URLs directly; CORS solved at the
bucket, not with `*`), no unverified-decode helpers of any kind, no validation constants outside Zod schemas.

## Gate 0 — before any code (Oracle)

- [ ] Ratify `docs/glossary.md` (6 ⚠ items) → freeze as v1.0.0
- [ ] Approve this plan

---

## Step 1 — Monorepo scaffold (TODO 0.1) — `[com]`

| File | Why |
|---|---|
| `package.json` (root, private, workspaces) | npm workspaces root; `npm ci` reproducibility is a Gherkin scenario |
| `turbo.json` | Pipeline `type-check → lint → test → build`; blocking-bad-code scenario |
| `tsconfig.base.json` | `strict: true`, no `any` escape hatches, shared by every package |
| `eslint.config.mjs` (root, flat) | Bans `any`, `console.*`, default exports; the pipeline must *fail* on them (Gherkin) |
| `.prettierrc` | One formatting authority, zero debate |
| `.editorconfig` | Same, for non-JS editors |
| `.env.example` | Every var documented; pairs with env validation (Step 4) |
| `.github/workflows/ci.yml` | CI green on `main` is in the DoD; runs the turbo pipeline + `npm audit` |

## Step 2 — `packages/domain` (TODO 0.2) — `[com]`, THE SOUL, test-first

Order inside the step: glossary-derived types → constants → validators → resolvers. Every file's test is written
and failing before its implementation (Rule 3).

| File | Why |
|---|---|
| `packages/domain/package.json` | Zod as the **only** runtime dependency (ADR-009; Gherkin scenario checks this) |
| `src/types/i18n.ts` | `LocalizedString` (5 required fields), `LoreString` (2), `SupportedLocale` — ADR-001/002 enforced at type level |
| `src/types/guild.ts` | 4×2×2 hierarchy (Basic Level Theory); ids from glossary §1–3 |
| `src/types/faction.ts` | 4 factions + prototype/itinerant roles (glossary §4) |
| `src/types/district.ts` | 4 districts + coordinates/heights (glossary §5) |
| `src/types/rank.ts` | 6 levels, cumulative; **no Oracle cardinality** (ADR-011) |
| `src/types/species.ts` | 5 species + hybrid discriminated union (glossary §11) |
| `src/types/attribute.ts` | 4 physical + 4 psychic (glossary §7) |
| `src/types/competence.ts` | 9 competences in 3 domains (glossary §8) |
| `src/types/archetype.ts` | 12 archetypes + guild/faction alignment (glossary §9) |
| `src/types/humor.ts` | 4 humors + attribute links (glossary §10) |
| `src/types/position.ts` | 15 positions; `loreRestriction` as inert data (ADR-013) |
| `src/types/seal.ts` | 8 seals + 4 thresholds + Prism Cells (glossary §12–13, **seminal names**, fixes constitution B1) |
| `src/types/asset.ts` | 7 formats + storage layers; mirrors real data-repo shape (ADR-003) |
| `src/types/permission.ts` | 22 permissions / 6 groups; rank-cumulative |
| `src/constants/guilds.ts` `factions.ts` `districts.ts` `ranks.ts` `species.ts` `competences.ts` `archetypes.ts` `humors.ts` `seals.ts` `permissions.ts` | Data instances, 5 locales each — the 100%-coverage + all-locales Gherkin scenario |
| `src/validators/env.ts` | Zod schema; **crash at boot, fail closed** (audit rule 4) |
| `src/validators/asset.ts` | Validates data-repo JSON; build fails loudly (Gherkin data-spike scenario) |
| `src/resolvers/asset-url.ts` | Arweave → R2 → IPFS → GitHub chain by **parsed hostname**, never substring (audit B6) |
| `src/resolvers/guild-resolver.ts` | superordinate → basic → subordinate traversal |
| `__tests__/*` (one per module) | 100% statement coverage enforced per-file (anti-tautology: audit rule 1) |

Deferred type files (season, portal, equipment, linguistic, mission, character-sheet): TODO lists them as done
in the ephemeral sandbox, but no Phase 0 Gherkin scenario needs them → they move to Phase 1's plan to keep
Phase 0's 100%-coverage surface honest. *(Deviation from TODO 0.2 — flagged for approval.)*

## Step 3 — Design tokens (TODO 0.3) — `[com]`

| File | Why |
|---|---|
| `packages/ui/package.json` + `src/tokens.css` | Brand palette + Geist Mono as CSS variables, `/* PROVISIONAL */` until the visual package arrives (mission risk table) |

## Step 4 — `apps/store` + testing config (TODO 0.4/0.5) — `[store]` app, `[com]` config

| File | Why |
|---|---|
| `apps/store/package.json`, `astro.config.mjs` | Astro 5 + React island integration; SSG default |
| `apps/store/src/env.ts` | Imports domain env validator at boot — missing var kills the server before it binds (Gherkin) |
| `apps/store/src/layouts/BaseLayout.astro` | Minimal semantic shell, `<html lang>` per locale |
| `apps/store/src/pages/[...locale]/index.astro` (5 locales) | The "empty page" that deploys; i18n routing Gherkin (`/`, `/ja/`, `/es/`, `/ko/`, `/pt-br/` → 200 + distinct lang) |
| `apps/store/vitest.config.ts`, `playwright.config.ts`, `cucumber.js` | Unit + e2e + BDD wiring |
| `features/i18n-routing.feature`, `features/env-validation.feature`, `features/quality-pipeline.feature` | MISSION-000 acceptance criteria as executable Gherkin |
| `apps/com/` (same skeleton, no pages beyond index) | "Both apps scaffolded" per mission header |

## Step 5 — Spike 0.7 — `[store]`, last, DECISION GATE

| File | Why |
|---|---|
| `apps/store/src/components/spike/VRMViewer.tsx` (island, `client:visible`, <200 lines) | Hypothesis: Astro islands host Three.js/@pixiv/three-vrm; zero JS above the fold (Gherkin) |
| `apps/store/src/pages/api/auth/siwe.ts` | SIWE verify with viem; session without personal data; **fails closed on missing config, with the test proving it** (audit B2 lesson) |
| `apps/store/src/lib/data.ts` (+ build-time fetch) | Fetch `numinia-digital-goods-data` JSON, validate with `@numinia/domain` asset schema; loud build failure |
| `features/spike-*.feature` ×3 | The three spike scenarios from MISSION-000 |

**GATE:** if the VRM island fricciona → full stop, report to the Oracle, evaluate Next.js `output: export` fallback. No workarounds without a ruling.

## Step 6 — Close MISSION-000 — `[com]`

| File | Why |
|---|---|
| `missions/MISSION-000-report.md` | Completion report incl. what was NOT done (Rule 8) + Learning Outcome |
| `TODO.md` (update) | Check Phase 0 items — DoD requirement |
| `docs/decisions/ADR-014+` | Any autonomous decision taken during execution |

## Decisions this plan needs from the Oracle (beyond Gate 0)

1. **Deploy target for the empty page**: Vercel or Cloudflare Pages (open-questions D3). Needed by Step 4's deploy criterion; default proposal: **Vercel** (constitution lists it first; zero-config Astro).
2. **Deferred type files** (Step 2 note): confirm moving season/portal/equipment/linguistic/mission/character-sheet types to Phase 1.
3. **Package manager**: Gherkin says `npm ci` → npm assumed; confirm (no pnpm).

---

*Nothing in Steps 1–6 starts until Gate 0 clears. Estimated commit count: ~35–40 atomic commits.*
