# Numinia Platform

The monorepo of the Numinia rebuild — the material culture of a city-state that
exists between planes. This is **not** a 3D asset marketplace: the digital goods
are the objects its citizens use, earn, and carry through the Veil. Read
[CLAUDE.md](./CLAUDE.md) (the constitution) before touching any code.

> Version line continues numinia.store: legacy ended at 0.15.0 → this repo is **v0.16.0**.
> Local-only for now: no remote, no deploy, no license published (open-questions D11).

## Layout

```
apps/
  store/        numinia.store — spike/PoC track (Astro 7 + React islands)
  com/          numinia.com — production track skeleton (Phase 2+)
packages/
  domain/       THE SOUL — types, constants (5 locales), validators, resolvers. Zod-only, 100% covered
  analytics/    Typed funnel events, consent-gated, zero runtime deps (docs/analytics.md)
  ui/           Design tokens (PROVISIONAL until the brand package arrives)
docs/           Constitution support: glossary (naming authority), ADRs, plans, audits
features/       Gherkin acceptance criteria + Cucumber steps (run against real artifacts)
missions/       Mission specs and completion reports
```

## Quickstart

```bash
npm ci                       # reproducible install
npm run ci                   # turbo: type-check → lint → test → build (16 tasks)
npm run test:acceptance      # Gherkin scenarios (Cucumber)
cd apps/store && npm run dev # store on :4321 (needs .env — see .env.example)
```

## Quality gates (enforced, not aspirational)

- TypeScript strict; `any` and `console.*` fail the lint gate with file and line.
- `packages/*` require 100% statement coverage per file (decoy tests impossible).
- Every env var is Zod-validated; missing vars crash at boot naming the variable.
- Acceptance criteria are executable Gherkin, asserted against real build output.
- Every interactive element carries `data-metric` (see docs/analytics.md).

## Governance

Decisions live in [DECISIONS.md](./DECISIONS.md) (ADR-001–010) and
[docs/decisions/](./docs/decisions/) (ADR-011+). Open questions and their owners:
[docs/open-questions.md](./docs/open-questions.md). Naming authority for every
domain term: [docs/glossary.md](./docs/glossary.md).
