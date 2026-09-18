# CLAUDE.md — numinia-web

This repository serves **numinia.com**, the game's site. The rules, the
vocabulary and the architecture of Numen Games live in one place,
`numengames/numinia-nwos` (numinia.org): read its `AGENTS.md` first,
transition regime included. This file only says what is specific here.

## What this is

A Turborepo monorepo. `apps/store` is the site in production at
numinia.com (the folder keeps the name of the legacy numinia.store line;
renaming it is a pending cut). `apps/com` is an empty skeleton. Shared
packages: `packages/domain` (the game's types, constants in five locales,
Zod validators — 100 % coverage per file), `analytics`, `auth`, `state`,
`ui`. `features/` holds Gherkin acceptance criteria run against the built
output.

The digital goods the site shows come from the data repository
(`GITHUB_REPO_OWNER`/`GITHUB_REPO_NAME`, CC0); the Codex reads the manual
from `numinia-nwos/lore/` at build (`npm run lore:fetch`).

## Commands

```bash
npm ci
npm run ci                     # turbo: type-check → lint → test → build
npm run test:acceptance        # Gherkin (Cucumber)
npm run verify                 # everything CI runs, in order
cd apps/store && npm run dev   # :4321, needs .env — see .env.example
```

Build with the env block from `.github/workflows/ci.yml` (`DATA_SOURCE=fixture`
keeps it hermetic). Env vars reach the build only if listed in `turbo.json`
`globalEnv`.

## Gates that bite (beyond a green `test`)

- `scripts/check-version-bump.mjs`: any change under `apps/store/src/**`
  needs a new entry in `apps/store/src/lib/updates.ts` `REBUILD_UPDATES`
  and a raised version; the pinned test (`updates.test.ts`) asserts the
  literal `CURRENT_VERSION` — bump both deliberately.
- Per-file coverage on every `src/lib/*.ts`: 100 % lines/functions/
  statements, 95 % branches. A new lib file needs its test.
- `scripts/link-check.mjs` crawls `apps/store/dist/client`: no internal
  href without a built file.
- `scripts/license-guard.mjs`: the ConsenSys-licensed MetaMask SDK may sit
  in `node_modules` (transitive via thirdweb) but must never reach `dist/`;
  the guard reads the bundler's module manifest, not comment strings.
- REUSE lint: every file declares its regime (`REUSE.toml` is the map).
- Playwright visual gate (`apps/store/e2e/visual.spec.ts`): full-page
  baselines — any chrome change needs regenerated PNGs inside the CI image.

## Deploy

Cloudflare Workers Builds on push to `main`; the build command lives in
`wrangler.jsonc` (`build.command`), the panel field stays empty. Verify a
publication with `numinia.com/version.json` against the `main` SHA.

## Conventions kept here

English in code and comments; strict TypeScript, no `any`, no `console.*`
(lint fails); named exports; every interactive element carries
`data-metric` (taxonomy in `packages/analytics/src/events.ts`); 3D always
lazy-loaded; no asset binaries in git; env validated with Zod, fail closed.
