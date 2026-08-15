# Contributing to Numinia Platform

Welcome, agent — biological or digital. Read [CLAUDE.md](./CLAUDE.md) (the
constitution) completely before touching code. This file is the operational
summary; the constitution wins on any conflict.

## The rules that are enforced by machinery (you cannot skip them)

- **Hooks are armed on `npm ci`** (`.githooks/`): pre-commit runs prettier,
  eslint and a secret scanner on staged files; commit-msg enforces
  `[store|com] type(scope): description`; pre-push runs the full pipeline.
- **`npm run verify`** = exactly what CI runs. Green before you push, always.
- `any`, `console.*` and default exports fail the lint gate with file and line.
- `packages/*` require 100% per-file statement coverage.

## The rules that require judgment

1. **Test first** (Rule 3). Write the failing test, then implement. If you
   implemented first, delete it and start over.
2. **Never assume domain facts.** The seminal documents (`docs/seminal/`) are
   canon; [docs/glossary.md](./docs/glossary.md) is the naming authority —
   change the glossary first, then code.
3. **Tracks**: `store` = spike/PoC, `com` = production. Shared `packages/*`
   are always `com`-grade. State the track in every commit.
4. **Every interactive element carries `data-metric`** (docs/analytics.md).
5. **Autonomous architectural decisions become ADRs** (`docs/decisions/`,
   Peirce format: Definition · Epistemic value · Pragmatic value).
6. **Report honestly**: completion reports list what was NOT done.
7. **The legacy repository is condemned**: never read from it, never copy from
   it. `docs/reference/` holds everything extracted from it that matters.

## Quick map

| I want to… | Go to |
|---|---|
| Understand the domain | `packages/domain` + `docs/glossary.md` |
| Add an analytics event | `docs/analytics.md` (name it there first) |
| See what is undecided | `docs/open-questions.md` |
| Know what Done means | `missions/Definition_of_Done_v0.2.0.md` |
| Push-day runbook | `docs/remote-checklist.md` |
