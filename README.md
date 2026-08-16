# Numinia Platform

> **For humans.** The front door: what this repository is, its layout, and how to run it.
>
> **Epistemic value.** Resolves a newcomer's first uncertainty — what am I looking at and where do I start.
> **Pragmatic value.** Points every reader to the constitution before they touch code.
> **In the system.** Observes: nothing. Regulates: first contact. Coupled to: CLAUDE.md, docs/LEY.md.
>
> _Part of the Law. Index: [docs/LEY.md](docs/LEY.md)_

The monorepo of the Numinia rebuild — the material culture of a city-state that
exists between planes. This is **not** a 3D asset marketplace: the digital goods
are the objects its citizens use, earn, and carry through the Veil. Read
[CLAUDE.md](./CLAUDE.md) (the constitution) before touching any code.

> Version line continues numinia.store: legacy ended at 0.15.0; the current
> version lives at [numinia.com/updates](https://numinia.com/updates/) and in
> `apps/store/src/lib/updates.ts` — this file does not track it. Live at
> **numinia.com**, auto-deployed on green CI (docs/deploy-runbook.md).
> **No license yet (D11 undecided):** until a LICENSE file
> lands, default copyright applies — all rights reserved. Nothing here is granted
> for reuse by publication alone. The digital goods in the data repository keep
> their own CC0 terms; this note is about the code.

## Lineage

This repository carries the **full git history** of the project: 316 commits of
numinia-digital-goods (v0.1.0–v0.15.0, Next.js, Feb–Apr 2026), a razing commit
where that implementation ends (ADR-010: design preserved, code discarded), and
the rebuild from there on. The legacy history is archaeology — never copy code
from it (ADR-017). Its `.env.local` commits were scrubbed (they held only public
data-repo coordinates), so legacy SHAs differ from the original GitHub repo.

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
