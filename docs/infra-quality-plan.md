# Infrastructure & Quality Plan — raising the project's floor

> Rule 2: L-rated effort — **approved and EXECUTED 2026-08-15** ("haz la mejor opción").
> Results: W1 hooks live-verified (secret commit rejected) · W3 hermetic builds green ·
> W2 `npm run verify` = CI parity · W5 governance pack complete · W4 mutation scores
> analytics 100% / domain-logic 99.02%, knip clean after fixing 3 real findings.
> Scope: everything stays LOCAL (no deploy, no remote, no vendors) per standing order.
> Date: 2026-08-15 · Current baseline: 27 commits, 16/16 pipeline, 77 unit tests at 100%,
> 8/8 Gherkin, 1/1 e2e — green, but green *only when someone remembers to run it*.

## Diagnosis — where quality can still leak

1. **Nothing runs automatically before a commit.** A bad commit lands silently; the gates exist but are opt-in. The legacy leaked `.env.local` once ("this has happened before") — we have no secret scanner.
2. **CI is a single shallow job** that has never run (no remote): no e2e, no license gate (the legacy *had* one blocking GPL/AGPL — relevant until D11 is decided), no coverage artifacts, no workflow lint.
3. **Builds require the network** (data spike fetches the catalog at build time): offline dev or a GitHub outage breaks `astro build`.
4. **100% coverage can still be vacuous** — coverage proves execution, not assertion strength. Mutation testing is the honest check.
5. **Dead code has no detector**; unused exports will accumulate from Phase 1 onward.
6. **Governance files referenced but missing**: `Definition_of_Done_v0.2.0.md` (broken link in the mission template), no CONTRIBUTING/SECURITY, no PR template — all needed the day the remote exists.

## Workstream 1 — Local guardrails (git hooks, zero dependencies) · Impact ALTO / Effort S

| File | Why |
|---|---|
| `.githooks/pre-commit` | prettier --check + eslint on staged files + secret scan — a bad commit becomes impossible, not just detectable |
| `.githooks/commit-msg` | enforce `[track] type(scope): description` (constitution format) with a regex — track discipline stops depending on memory |
| `.githooks/pre-push` | full `npm run ci` + acceptance — nothing leaves the machine broken (future-proof for the remote) |
| `scripts/install-hooks.mjs` + `package.json` `prepare` | `git config core.hooksPath .githooks` on `npm ci` — no husky dependency |
| `.secretlintrc.json` + devDep `secretlint` (+ recommend preset) | scan staged files for tokens/keys — the legacy's `.env.local` incident cannot repeat |

## Workstream 2 — CI hardening (ready to be real the day we push) · Impact ALTO / Effort M

| File | Why |
|---|---|
| `.github/workflows/ci.yml` (rework) | job split: **quality** (pipeline+acceptance) · **e2e** (playwright install + store build + VRM gate) · **supply-chain** (audit + license gate); `concurrency` cancel-in-progress; turbo cache via actions/cache; coverage lcov uploaded as artifact |
| `package.json` root script `verify` | one command = exactly what CI does (`ci` + acceptance + e2e) — local/CI parity, no drift |
| devDep `license-checker-rseidelsohn` + root script `licenses:check` | block GPL/LGPL/AGPL/SSPL in production deps (legacy lesson kept; protects optionality until D11) |
| `zizmor`/actionlint note in workflow comments | workflow-security lint documented; run locally when tooling available |

## Workstream 3 — Reproducibility & supply hygiene · Impact MEDIO / Effort S

| File | Why |
|---|---|
| `.nvmrc` (`22`) | one node version signal for humans, editors and CI |
| `.npmrc` (`engine-strict=true`) | wrong node/npm fails fast instead of half-working |
| `renovate.json` (inert until remote) | dependency updates arrive as PRs from day one on GitHub — zero setup later |
| `apps/store/fixtures/avatar-catalog.json` + `data.ts` fallback via `DATA_SOURCE=fixture` | hermetic builds: offline dev and deterministic CI; the network path stays the default so the loud-failure guarantee is intact |
| Gherkin: `features/data-fixture.feature` | the fixture path is a contract, so it gets a scenario |

## Workstream 4 — Deep quality (prove the tests, kill dead code) · Impact ALTO / Effort M-L

| File | Why |
|---|---|
| `stryker.config.json` in `packages/domain` + `packages/analytics` (devDep `@stryker-mutator/core` + vitest runner) | **mutation testing**: verifies the 100% coverage actually asserts behavior; thresholds start informative (report), gate later |
| `knip.json` + root script `deadcode` | unused files/exports/dependencies detector — keeps Phase 1 growth clean; runs in CI as warning first, gate after stabilizing |
| `vitest.workspace.ts` (root) | one `vitest run` across packages + merged coverage report — simpler DX and a single artifact |

## Workstream 5 — Governance ready-for-remote · Impact MEDIO / Effort S

| File | Why |
|---|---|
| `missions/Definition_of_Done_v0.2.0.md` | fixes the broken template link (open-questions B3); one DoD authority for every mission |
| `CONTRIBUTING.md` | tracks, commit format, TDD rule, glossary authority, data-metric rule — onboarding for future contributors (human or digital) |
| `SECURITY.md` | disclosure policy + the fail-closed principles as commitments |
| `.github/PULL_REQUEST_TEMPLATE.md` | checklist mirroring the gates (tests-first, ADR needed?, glossary touched?, data-metric) |
| `.github/CODEOWNERS` (inert until remote) | `com/` and `packages/domain` require Oracle-visible review |
| `docs/remote-checklist.md` | the exact push-day runbook: license D11 → repo name/visibility → branch protection → secrets → first CI run |

## Execution order & gates

1. **W1** (guardrails) → immediate, protects everything after it.
2. **W3** (reproducibility) → cheap, unblocks hermetic W2 e2e.
3. **W2** (CI) → committed and verified via `npm run verify` locally.
4. **W5** (governance) → docs, fast.
5. **W4** (mutation + knip) → last; heaviest, and its report may generate follow-up test work — reported to the Oracle before turning any of it into a blocking gate.

Non-goals (explicit): no deploy, no analytics vendor, no turbo remote cache, no renovate activation, no GitHub remote — all gated on your orders (D3-bis, D11, D12).

Estimated: ~20–25 atomic commits. Everything reversible; no constitution changes required.
