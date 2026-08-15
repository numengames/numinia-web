# ADR-015: Astro 7 instead of the constitution's "Astro 5"

> **For humans.** Decision record: ADR-015: Astro 7 instead of the constitution's "Astro 5".
> **Epistemic value.** Fixes one architectural belief so it is never silently re-derived.
> **Pragmatic value.** Binding until superseded by a newer ADR with Oracle sign-off.
> _Part of the Law. Index: [../LEY.md](../LEY.md)_

**Status:** Accepted (autonomous, flagged for Oracle review)
**Date:** 2026-08-15

## Definition

The constitution and MISSION-000 name "Astro 5" — current stable when they were written (2026-04). At build time the registry offers Astro 7.2 as stable, with matching majors for @astrojs/react (6) and @astrojs/node (11). The monorepo adopts **Astro 7** and current stable integrations.

## Epistemic value

The architectural intent — SSG by default, islands for interactivity, native i18n routing — is version-independent and is what the Phase 0.7 spike actually validates. Pinning a two-majors-old framework in a newborn codebase converts "current stable" into instant migration debt with zero benefit.

## Pragmatic value

Latest security fixes and React 19 support out of the box; the empty-page build, the five-locale routing, and the env fail-closed boot were verified green on 7.2.2.

## Consequences

- The constitution's stack table should read "Astro (current stable — 7.x at rebuild start)".
- If the spike reveals a 7.x-specific blocker, the DECISION GATE fires exactly as it would have on 5.
