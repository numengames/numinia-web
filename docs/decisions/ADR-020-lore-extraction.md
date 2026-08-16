# ADR-020 — The lore leaves the code repository

- **Status:** Accepted (Oracle direction, 2026-08-16)
- **Date:** 2026-08-16
- **Deciders:** Pablo (Oracle)
- **Context:** same-day consequence of the repo going public (ADR-019 P3)

## Context

The repo went public with `docs/seminal/` in the tree — including the
unpublished RPG manual, the very content that had justified making the repo
private on 2026-08-15. Reserving rights (REUSE.toml) and not exposing content
are different things: the reserved license prevents legal reuse but not
reading, copying, indexing, or training. The state was the worst of both
worlds — readable by anyone with all rights reserved: neither moat nor
adoption.

## Decision

**No lore in the code monorepo: only code, technical documentation, and
assets.** This is what the canon asked from the start — governance documents
and narrative do not belong in the code repo.

1. `docs/seminal/` moved to the private **`numinia-lore`** repository, with
   its git history extracted along (filter-repo path extraction, provenance
   preserved).
2. History rewritten in `numinia-web` to remove those files from every commit
   — a plain `git rm` leaves them reachable by SHA: removing without
   rewriting is theater.
3. The Codex (`/lap/codex/`, MISSION-009) had a build-time dependency on the
   manual (`?raw` static import). Resolution mirrors the data-repo pattern:
   `npm run lore:fetch` pulls the real manual from the private repo into
   gitignored `apps/store/.lore/` (deploys run it, fail-closed — production
   must never silently ship synthetic content); hermetic/CI builds use a
   committed **synthetic fixture** that mirrors the manual's structural
   skeleton (intro, numbered chapters, fragments, tables, quotes) with zero
   lore. The parser tests hold against either source.
4. Visibility reopening passes the canon C-005 §4 visibility gate, verified
   against the real directory listing, not a hand-written list.

## Consequences

- All commit SHAs change (second history rewrite after ADR-017). Backup:
  `../numinia-web-pre-lore-extraction.bundle`. SHA references in older docs
  point at the pre-rewrite lineage.
- Deploys require the `LORE_TOKEN` repo secret (read access to
  `numinia-lore`); without it the deploy fails loudly by design.
- Lore opening is deferred, not discarded — conditions and target license
  recorded in LEGAL_DEBT.md **DEBT-002** (updated manual + third-party rights
  review + signed D-03 amendment; likely CC BY-SA 4.0).
- Explicit assumption: exposure already incurred while public is not
  recoverable; this reduces future exposure only.
- Still in the tree and annotated reserved: the lore embedded in
  `apps/store/src/i18n/city-landing.ts` (public-facing /city/ narrative — a
  different, deliberate exposure) — its extraction to a data file is already
  queued for the canon v1.3.0 no-mixed-regimes rule.
