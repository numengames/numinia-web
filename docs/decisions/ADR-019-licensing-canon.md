# ADR-019 — Licensing canon C-005 adopted; D11 closed

- **Status:** Accepted
- **Date:** 2026-08-16
- **Deciders:** Pablo (Oracle)
- **Closes:** D11 (MIT vs AGPL-3.0, open since 2026-08-14)

## Context

D11 left the repository unlicensed ("default copyright applies" in the README)
while MIT-vs-AGPL stayed undecided. The Numinia Legal Book now exists as an
external source of truth; its licensing chapter (canon C-005, v1.1.0) is copied
verbatim into [docs/legal-book.md](../legal-book.md) and re-copied on every
MAJOR/MINOR canon revision.

## Decision

Canon C-005 v1.1.0 is adopted. The Oracle issued four rulings for this repo
(2026-08-16):

1. **Boundary is fixed at the directory line:** `apps/*` → `AGPL-3.0-only`,
   `packages/*` → `MIT`. Billing landing later does NOT move the boundary —
   apps are already "deployable apps that decide".
2. **Monorepo interpretation ratified (canon amended to v1.1.0):** licenses mix
   per directory via `REUSE.toml`; a separate repo is required only for code on
   a third-party strong-copyleft engine (e.g. Hyperfy). A lint rule must
   guarantee dependency direction: `packages/*` never imports from `apps/*`.
3. **TRADEMARKS.md ships as a stub:** ® only on registered marks, ™ on the
   rest, an explicit not-claimed section. **L.A.P. is NOT claimed.**
4. **Inventory corrections:** `khepri/` is CC0-1.0 by prior canon EXCEPT brand
   assets; `docs/seminal/` splits between reserved lore and CC-BY-4.0
   documentation; i18n files were reviewed for embedded lore (findings below).

## Inventory findings (the 2026-08-16 review)

- **Fonts are third-party, not CC0:** `khepri/assets/fonts/` ships Geist
  (Vercel/basement.studio) and Pixelify Sans, both `OFL-1.1` with full license
  texts present. Declared as such in REUSE.toml; OFL-1.1 added to `LICENSES/`.
- **Brand marks live outside `assets/marca/` too:** the wordmarks and logos at
  the root of `khepri/assets/` (`Numinia_Word.svg`, `Numen_*.svg`,
  `NG_Logo.svg`, `Khepri_Logo.svg`, `Khepri_NG_Logo.svg`) are brand and are
  reserved alongside `assets/marca/**`. This extends ruling 4's letter to honor
  its intent; CC0 is irrevocable, so the safe direction is to reserve now and
  free explicitly later if the Oracle wishes.
- **Phosphor icons** (`packages/ui/src/icons/`) are third-party MIT (Phosphor
  Icons) — annotated with their own copyright, not Numen's.
- **Deep lore found in i18n:** `apps/store/src/i18n/city-landing.ts` carries
  the /city/ narrative prose (Holberins, the Akashic Records — ES+EN). The file
  is declared `AGPL-3.0-only AND LicenseRef-Numen-AllRightsReserved`: the code
  shape is app code, the embedded lore text stays reserved. Other i18n files
  carry UI strings and domain names only (short metadata, no deep lore).
  Extracting lore prose out of code files into data is left as a future
  refactor, not a blocker.
- **`docs/seminal/` split:** reserved lore = the RPG manual,
  `Welcome_to_Numinia`, `About_Session_Zero`, `Numinia_Brand_and_Culture`,
  `Compendium_of_Attributes_and_Ranks`; CC-BY-4.0 documentation =
  `Role_structure_in_the_Numinia_system`,
  `Epistemic_relations_between_Numen_Games_and_Numinia` (methodological essays
  on the functional model, not narrative).
- **Apache-2.0 DOES ship in the client bundle** — the adoption-day claim that
  none did was an artifact of scanning from the workspace root (root has no
  production deps of its own). The bundler's module manifest shows 12
  Apache-2.0 packages in the client bucket (thirdweb, WalletConnect, Coinbase
  SDK, fuse.js, idb-keyval, multiformats, …) → `NOTICE` created at the root,
  its completeness enforced by `scripts/license-guard.mjs` (a shipped
  Apache-2.0 package missing from NOTICE fails the build).
- **The hardened gate's first catch — MetaMask SDK (DEBT-001):** exactly three
  packages ship under the ConsenSys proprietary license with no `license`
  field: `@metamask/sdk`, `@metamask/sdk-communication-layer`,
  `@metamask/sdk-install-modal-web` (transitive via thirdweb). The license is
  not purely non-commercial — its clause 3 defines use at **≤ 10,000 MAU** as
  permitted "Non-Commercial Use", so Numinia operates inside the grant today.
  But its notice/restriction propagation is **incompatible with AGPL-3.0-only**
  the moment the code is distributed. Oracle ruling (2026-08-16): documented
  exception with a mandatory exit — see [LEGAL_DEBT.md](../../LEGAL_DEBT.md)
  DEBT-001 for thresholds (5,000 MAU or first `dist/` hit) and the EIP-6963 +
  WalletConnect exit path. `scripts/license-guard.mjs` audits the bundler's
  module manifest (string scans miss minified code) on every verify/CI run.
  A fourth UNKNOWN,
  `@metamask/eth-json-rpc-provider@1.0.1`, turned out to be registry-declared
  ISC with a field-less tarball — clarified, not excepted.

## Consequences

- Phase B skeleton lands with this ADR: root `LICENSE` (overview), `LICENSES/`
  texts, `REUSE.toml`, `TRADEMARKS.md` stub, `license` fields corrected
  (`apps/*` → `AGPL-3.0-only`).
- The consume gate hardens: `BUSL-1.1`, `Elastic-2.0`, `Commons-Clause`,
  `UNKNOWN` and `UNLICENSED` join the `failOn` list.
- **Queued (not in this change):** Phase C — SPDX headers on every first-party
  code file (script-assisted; pinned Khepri kit copies and vendored files are
  exempt per the canon's header exception); Phase D — `reuse lint` in CI (error
  on `.com`, warning on `.store`) once headers exist; the `packages/*`-never-
  imports-`apps/*` lint rule; CLA text for this repo (contains AGPL code) and
  DCO adoption — the CLA document itself is a 🧬 deliverable.
- `@numinia/*` npm publication remains forbidden (standing order); first
  publish locks the MIT edge and is a stop-and-ask event.
