# ADR-012: Canonical taxonomy resolutions and the bilingual glossary as naming authority

> **For humans.** Decision record: ADR-012: Canonical taxonomy resolutions and the bilingual glossary as naming authority.
> **Epistemic value.** Fixes one architectural belief so it is never silently re-derived.
> **Pragmatic value.** Binding until superseded by a newer ADR with Oracle sign-off.
> _Part of the Law. Index: [../LEY.md](../LEY.md)_

**Status:** Accepted (glossary content pending Oracle ratification)
**Date:** 2026-08-14
**Decided by:** Pablo (Oracle) · Recorded by: Claude (Digital Agent)

## Definition

1. **Canonical source order.** For every domain term, the RPG manual (`docs/seminal/Numinia__El_juego_de_rol__manual_completo_.md`, Spanish) is the canonical source. Other seminal documents supplement it; where they disagree with the manual, the manual wins.
2. **Archangel houses.** Branch B of the Sentinels contains the houses **Sanadores (Healers)** and **Exploradores (Explorers)**. "Guides" is not a house: "Guía" is a Sentinel _trait_ and part of the Explorers' functional description ("ayudan a guiar a los ciudadanos por el camino correcto") that was mistaken for a house name in _Role structure in the Numinia system_. House id: `explorers`; its description references the guiding function.
3. **Scholars house order.** Eruditos/Scholars: B.1 **Hierofantes (Hierophants)** — specialists in distinct fields; B.2 **Taumaturgos (Thaumaturges)** — shapers of culture and new ideas. _Role structure_'s reversed order is superseded.
4. **Glossary as authority.** `docs/glossary.md` is a bilingual ES↔EN table covering every domain term (guilds, branches, houses, factions, districts, ranks, species, attributes, competences, archetypes, humors, seals, thresholds, plus supplementary terms). The **Spanish column is canonical**; the **English column is the code identifier**. It is the single authority for every string-literal union in `packages/domain`. The taxonomy is frozen there **before** any type file is written; changing a term requires changing the glossary first.

## Epistemic value

Twenty documented contradictions predate the ephemeral domain-v0.1 type files; regenerating from a ratified glossary prevents encoding a mistake into constants that MISSION-000 requires at 100% coverage in five locales. The house-name error demonstrates the failure mode: an English translation drifting from the Spanish canon and then propagating into code (cf. ADR-007, "Armonauts").

## Pragmatic value

- One file to review to approve the entire taxonomy (the Oracle's approval gate for MISSION-000).
- String-literal unions, i18n constants, and validators all cite a single source; ES↔EN drift becomes mechanically detectable.
- Translators for JA/KO/PT-BR work from a stable EN/ES pair.

## Consequences

- `docs/glossary.md` is the first deliverable of MISSION-000; no type file precedes it.
- CLAUDE.md's Session Zero seal names ("Thought + Knowledge") contradict _About Session Zero_ (Seal of **Culture** + Seal of **Wisdom**) and must be corrected to match the glossary.
