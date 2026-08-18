# ADR-022 — The design system is governed elsewhere: this repo pins it, never holds it

- **Status:** Accepted — Oracle order 2026-08-18 («borra del todo el sistema
  de diseño y tenlo delegado»)
- **Date:** 2026-08-18
- **Deciders:** Pablo (Oracle) · drafted by Claude (Digital Agent)
- **Context:** the v5.0.0 handover exposed the cost of two copies; generalizes
  the pattern ADR-020 established for lore

## Context

Until today this repository carried the whole design system: master document,
living guide, generated kit, brand assets, templates. It arrived as a zip and
was installed here, so **numinia-web held a copy of something it does not
govern**.

That copy cost real work on 2026-08-18. The v5.0.0 handover had to be read,
diffed against the v4.2.0 copy, re-generated into a kit, renamed across the
repo — and, in the middle of it, the copy turned out to be byte-identical to
`numinia-nwos:standards/2026_08_18-Sistema_de_Diseno-v5.0.0.md`, already
published at numinia.org. Two copies of one law, kept in step by hand.

Worse, the contradictions found while incorporating it (§19.5 saying twelve
animations where §10.1 says fourteen; a `10px` frame radius against `8px` in
§5 and §19.3; production tokens the document never absorbed) had **nowhere
correct to be fixed**. Patching them here would have forked the law; the only
right address is the repository that governs it.

The same reasoning already produced ADR-020 for lore: the seminal corpus lives
in a repo of its own, and this platform reads it at build. Design is the same
kind of thing — canon, not code.

## Decision

**Canon is not vendored. It is pinned.** The Sistema de Diseño is governed by
`numengames/numinia-nwos` (`standards/`), which owns the document, its version
history, its kit generation and its publication. This repository:

1. **Does not keep the master document, the living guide, the templates or the
   asset library.** They were deleted; git history holds what was there.
2. **Keeps only what the product ships**: the generated kit copies
   (`packages/ui/src/sistema.css`, `apps/store/src/scripts/sistema.js`), the
   fonts it serves with their licenses, the textures and the two brand marks
   the chrome renders (`packages/ui/src/assets/brand/`).
3. **Pins the source in `design-source.json`**: governing repo, path, published
   URL, version and the sha256 of the master, plus a digest per vendored file.
4. **Guards both directions.** `design-system-bridge.test.ts` fails the build
   if a vendored file is edited by hand — the kit is generated, never rewritten
   (§13.1). `npm run design:check` fetches the published master and fails on
   drift; it needs the network on purpose and therefore stays **out** of the
   hermetic CI suite.
5. **Fixes nothing about design here.** A contradiction, a gap or a missing
   token is reported to numinia-nwos and returns as a new version. Re-pinning
   is the only design change this repo ever makes.

**Where to read it.** With the sibling checkout:
`../numinia-nwos/standards/2026_08_18-Sistema_de_Diseno-v5.0.0.md`. Without it:
<https://numinia.org/corpus/standards/2026_08_18-sistema_de_diseno-v500.md>
(the same bytes — that is what `design:check` verifies).

## Consequences

**Good.** One law, one address. An agent working here cannot silently fork the
design system, because the only editable design artifacts are digest-pinned.
Upstream drift becomes a command with an exit code instead of a memory.
Whoever fixes design fixes it where the fix survives.

**Costs.** Reading the full document now requires the sibling repo or the
network — the reading budget in CLAUDE.md still applies, but the file is not
in `git grep` range. A new version is a two-repo operation: nwos publishes,
this repo re-pins. The drift check is not enforced by CI (hermeticity wins),
so it needs a schedule or a habit — that guard belongs to **MIS-068**
(«NWOS propagation: consumer repos never drift from the source of truth»),
which this ADR gives a first concrete case to.

**Not decided here.** Whether nwos also publishes the *kit* (today it
publishes only the document, so the kit was generated on this side from §13.1
and §19.3). Until it does, re-pinning includes regenerating those two files
from the master — the request is on the record in the v5.0.0 handover brief.

## Precedents

- **ADR-020** — lore left the monorepo for `numinia-lore`; the platform reads
  it at build. Same doctrine, different canon.
- **§0.3 / §19.1 of the Sistema** — precedence: the master document wins over
  any older material. A local copy is, by construction, older material waiting
  to happen.
