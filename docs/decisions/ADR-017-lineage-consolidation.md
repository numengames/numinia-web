# ADR-017 — Lineage consolidation: numinia-digital-goods history grafted into numinia-platform

- **Status:** Accepted (Oracle decision, 2026-08-15)
- **Deciders:** Pablo (Oracle) — option chosen from a CTO memo with forensic analysis
- **Related:** ADR-010 (design preserved, code discarded), D11 (license), D15 (remote destiny)

## Peirce trichotomy

- **Object (Operating System):** One project, one timeline. The rebuild is not a new
  product; it is v0.16.0 of the thing that started as numinia-digital-goods v0.1.0.
- **Ground (Functional Model):** Git history as the functional record of that
  continuity: 316 legacy commits → 1 razing commit → the rebuild.
- **Representamen (Narrative Projection):** `git log` now _tells_ the story a citizen
  of the repo reads: where we come from, the moment of the Rebuild, who built what.

## Context

The legacy repository was cloned inside `numinia-platform/` on day one for the
bounded audit, then condemned. The nested 4.4 GB clone remained as an incoherence:
two repos, one inside the other, for one project. Forensic analysis (adversarially
reviewed) established the graft was cheap and safe:

- Legacy history packs to **6.7 MB** (no heavy binaries ever committed).
- The historical `.env.local` commits contained **only public data-repo
  coordinates** (`GITHUB_REPO_OWNER/NAME/BRANCH`) — no credentials. A pattern scan
  of all 320 revisions found no secrets.
- The platform repo had **no remote yet**, so its 46 linear commits were freely
  rewritable — the last window in which this surgery costs nothing.

## Decision

Graft the scrubbed legacy history as the ancestor of the rebuild:

1. Scrubbed copy via `git filter-repo --invert-paths --path .env.local`
   (fresh `--no-local` clone): 320 → 316 commits (4 pruned; policy uniformity,
   not secrecy — the contents were public).
2. Empty-tree **razing commit** (`[com] chore(lineage): raze legacy implementation`)
   on the legacy tip: ADR-010 enacted in history itself.
3. `git rebase --root --onto` replayed the 46 rebuild commits on the razing commit.
4. Verified: final tree hash **bit-identical** to pre-surgery; 363 = 316+1+46
   commits; zero `.env.local` refs; credential scan of all 363 revisions clean;
   `git fsck --strict` clean; `npm run verify` 24/24; full Playwright 16/16;
   authorship preserved (PabloFMM 246, PabloFM 106, ToxSam 11).
5. Nested clone deleted (4.4 GB freed); backup bundle kept at
   `../numinia-platform-pre-consolidation.bundle` until push day; the GitHub
   legacy remote remains intact as permanent archive.

## Consequences and caveats

- Legacy SHAs differ from the public GitHub repo (consequence of the scrub):
  lineage is content- and metadata-identical, not hash-identical.
- `git log --follow` does not trace files across the empty-tree seam (inherent).
- The remote branch `feat/i18n-dynamic-locale` was intentionally not imported.
- Legacy `.env.example` survives in history; pattern-clean, redacted eyeball
  scheduled before push day.
- **The condemnation order evolves, it does not lapse:** the legacy history is
  archaeology/lineage. Reading it as history is fine; copying code from it into
  the platform remains forbidden (ADR-010).
- **D15 (push day, Oracle):** archive the GitHub legacy repo read-only with a
  pointer to the new repo, or repurpose it by pushing the consolidated history
  (keeps the URL). Decided together with D11.
