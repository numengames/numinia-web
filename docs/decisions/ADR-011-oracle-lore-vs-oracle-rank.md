# ADR-011: Oracle-as-lore and Oracle-as-rank are separate types

> **For humans.** Decision record: ADR-011: Oracle-as-lore and Oracle-as-rank are separate types.
> **Epistemic value.** Fixes one architectural belief so it is never silently re-derived.
> **Pragmatic value.** Binding until superseded by a newer ADR with Oracle sign-off.
> _Part of the Law. Index: [../LEY.md](../LEY.md)_

**Status:** Accepted
**Date:** 2026-08-14
**Decided by:** Pablo (Oracle) · Recorded by: Claude (Digital Agent)

## Definition

"Oracle" names two different domain concepts that share a word:

- **Oracle-as-lore** — the five founding creators of the new Numinia, heirs of Holberins. Fixed count (5), narrative entities. Belongs to the **Narrative Projection** layer. Modeled (when needed) as lore content, never as a rank property.
- **Oracle-as-rank** — rank level 5, the top of the cumulative permission ladder (Nomad 0 → Oracle 5). **Unbounded count.** Belongs to the **Operating System** layer. Modeled in `rank.ts` / `permission.ts`.

The `Rank` type MUST NOT carry a cardinality constraint of five (nor four). Any "max N Oracles" rule from superseded documents (legacy _Platform Role System_ v2 capped the rank at 4) is void.

## Epistemic value

The seminal corpus appeared self-contradictory: the RPG manual says "la figura fundacional de los Oráculos: cinco creadores" while _Brand & Culture_ names four people and the legacy role-system doc capped the rank at four. The contradiction dissolves once the two concepts are separated: the sources were describing different layers of the Peirce trichotomy with one word. This is precisely the collapse between semiotic layers that CLAUDE.md warns about (cf. ADR-005, Missions ≠ Adventures).

## Pragmatic value

- `rank.ts` stays a pure progression ladder; no special-case invariants leak into permission resolution.
- Lore surfaces (Akashic Archive, about pages) can name the five founders without implying five rank-holders.
- Future governance changes (a sixth rank-Oracle) require no type change.

## Consequences

- The bilingual glossary lists "Oráculo" twice, once per concept, with distinct identifiers.
- Any validator that counts Oracles is a bug.
