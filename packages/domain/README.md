# @numinia/domain

The Functional Model of Numinia — **the most important package in this
repository** (constitution, Rule 10). Framework-agnostic by decree:
Zod is the only runtime dependency; no React, Astro, or viem imports.

- **Types** (`src/types/`): guilds (4×2×2), factions, districts, ranks, species (+hybrids), attributes, competences,
  archetypes, humors, positions,
  Session Zero seals, assets, 22 permissions.
- **Constants** (`src/constants/`): every entity localized in the five UI
  locales (es canonical · en · ja · ko · pt-br — JA/KO/PT-BR pending native QA).
- **Validators** (`src/validators/`): fail-closed env parsing; loud asset-catalog
  validation for the data repo.
- **Resolvers** (`src/resolvers/`): Arweave→R2→IPFS→GitHub URL chain with
  hostname-parsed classification; guild hierarchy traversal.

Naming authority: numinia-nwos `CAN-003`/`CAN-004`. Changing a term
means changing the glossary first, then this package.

Coverage bar: **100% statements/lines/functions per file** (`npm test`).
Consumed via compiled `dist/` — run `npm run build` after changes.
