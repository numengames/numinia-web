# ADR-021 — The package map: which packages are edge, which code is core

- **Status:** Proposed — awaiting Oracle signature (this is the signed
  decision that D-07 demands; drafted 2026-08-17 on Oracle order
  «desbloquea»)
- **Date:** 2026-08-17
- **Deciders:** Pablo (Oracle) · drafted by Claude (Digital Agent)
- **Context:** closes canon queue item **D-07 (BLOCKING)** from ADR-019 —
  gates Phase C (SPDX headers), Phase D (`reuse lint` in CI), and any first
  `npm publish`

## Context

ADR-019 adopted the frontier: code that **shows** is edge (MIT, made to be
published); code that **decides** is core (AGPL, never published as a
library). The interim map says `packages/*` → MIT, but the same ADR's
public-snapshot audit found core-by-content inside the MIT edge:
`@numinia/auth` carries authoritative session verification, and
`@numinia/state` was queued for the same review. `private: true` on every
package is a preventive brake, releasable only by this signed map.

## Decision

**The regime follows the directory, and the content must follow the regime.**
`packages/*` stays uniformly MIT; anything that *decides* migrates into
`apps/*` (AGPL) instead of creating AGPL packages. One file, one regime — no
mixed packages.

| Package | Verdict | Rationale |
| --- | --- | --- |
| `@numinia/domain` | **MIT edge — publishable** | Types, constants, resolvers, Zod validators. Pure vocabulary; this is the package the canon's Phase 4 metric (a third party consuming the data) depends on. |
| `@numinia/ui` | **MIT edge — publishable** | Design tokens and presentation primitives. Shows, never decides. |
| `@numinia/analytics` | **MIT edge — publishable** | Client instrumentation: consent gate, emitter, transports. The consent *decision* lives in the app (cookie policy); the package only carries signals. |
| `@numinia/auth` | **MIT edge after containment — until then NOT publishable** | Neutral primitives (`encoding`, `boundary`, config parsing) are edge and stay. The authoritative side (`session`, `nonce`, `attestation`, `rotation` — everything a server trusts) is core-by-content and **must move into `apps/store` (AGPL) before the package grows further or is ever published**. The already-public MIT snapshot is acknowledged and cannot be ungranted (ADR-019); containment is forward-looking. |
| `@numinia/state` | **Core-by-content — never publishable as-is** | `GitStateStore` is the census/moderation write path: it decides what enters the record. Whole content migrates into `apps/store` (AGPL) and the package dissolves; record *schemas* may move to `@numinia/domain` if a third party ever needs the shapes. Until migration: `private: true` stands. |

Complementary placements this map fixes:

- **The character-sheet rules engine** (MIS-085 §8: gate + rules engine
  *decide*) is written in `apps/store` under AGPL from its first line. Its
  vocabulary (types, IDs, score shapes) stays in `@numinia/domain` (MIT).
- **The SIWE soft gate / `AuthProvider`** likewise lives in `apps/store`.

## What this releases and what it does not

1. **Phase C may start**: SPDX headers per file — `apps/*` →
   `AGPL-3.0-only`, `packages/*` → `MIT`, following this map. Pinned Khepri
   kit copies and vendored files keep the canon's header exception.
2. **Phase D may follow**: `reuse lint` in CI (error on `.com`, warning on
   `.store`).
3. **`npm publish` of `domain`, `ui`, `analytics` is authorized in
   principle** — the brake `private: true` may be lifted on those three when
   there is a reason to publish. The first actual publish remains an
   announced, deliberate act (one-way door), not a side effect.
4. **`auth` and `state` stay `private: true`** until their containment
   migrations land. Those migrations are follow-up work, chartered as their
   own small missions; this ADR only fixes their destination.

## Consequences

- The clean rule survives contact with the audit: contributors can predict a
  file's license from its path alone.
- Two migrations (auth authoritative side, state store) become explicit debt
  with a named exit instead of an ambient worry; until they land, the
  affected packages simply cannot be published, which the brake already
  enforces.
- LEGAL_DEBT.md gains no new entry: DEBT-001 (ConsenSys) is untouched, and
  the auth public-snapshot fact is already recorded in ADR-019.
