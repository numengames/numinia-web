# ADR-013: Gender-restricted positions are modeled as data, never as logic

**Status:** Accepted (modeling) · **OPEN QUESTION** (product policy)
**Date:** 2026-08-14
**Decided by:** Pablo (Oracle) · Recorded by: Claude (Digital Agent)

## Definition

The RPG manual restricts four of the fifteen Positions by gender: Pitia (women only), Anacárquide (women only), Corredor del Velo (men only), Oniromante (men only).

Modeling rule:

- The `Position` type carries an **optional field** (e.g. `loreRestriction?: { gender: 'women-only' | 'men-only' }`) that records the restriction exactly as stated in the manual.
- **Application code never branches on this field.** No validator rejects a character, no UI hides an option, no permission check reads it. It is lore data, preserved losslessly.

## Epistemic value

The restriction is part of the canonical narrative and must not be silently softened or silently enforced — either would be an unauthorized product decision. Recording it as inert data keeps the seminal corpus lossless while deferring policy: the manual stays the source of truth for *what the lore says*; the Oracle stays the source of truth for *what the platform does with it*.

## Pragmatic value

- The domain model can ship (MISSION-000) without waiting for the policy decision.
- Whichever policy is later chosen (enforce, soften to flavor text, or omit from UI), it becomes a presentation/application concern with zero domain migration.

## Open question (for the Oracle — deliberately NOT resolved here)

Does the platform ever enforce, display, or ignore these restrictions in user-facing flows (character creation, position selection)? This has product, inclusivity, and legal implications and belongs to a dedicated session. Until answered, the field exists and nothing reads it.
