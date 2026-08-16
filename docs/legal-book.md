# Legal Book — Licensing (Numinia canon C-005)

> **For humans.** The licensing law: what license every piece is born under, what may be consumed, and where to stop and ask.
>
> **Epistemic value.** Resolves the license of any file or dependency without debate — the map from artifact kind to SPDX identifier.
> **Pragmatic value.** Gates emission (headers, REUSE.toml, package.json fields) and consumption (the CI license gate). If an action contradicts this file, the action is wrong.
> **In the system.** Observes: Numinia canon C-005 (external source of truth). Regulates: every file, every dependency, every publish. Coupled to: ADR-019, LICENSE, REUSE.toml, TRADEMARKS.md.
>
> _Part of the Law. Index: [LEY.md](./LEY.md)_

> **Verbatim copy of canon C-005 v1.1.0 (2026-08-16).** Do not edit the block
> below — it is re-copied from the Numinia Legal Book on every MAJOR or MINOR
> revision of the canon. Local interpretations live in ADR-019, never here.

---

## Licensing — from Numinia canon C-005 (source of truth; do not edit here)

**Emit:** `packages/*` — library/SDK/types/tokens/script/CI/infra → `MIT` ·
`apps/*` — deployable app that _decides_ (identity, progression, billing) →
`AGPL-3.0-only` · code on a third-party strong-copyleft engine, **separate repo** →
the engine's · assets/data/metadata/design tokens → `CC0-1.0` · docs/ADRs/specs →
`CC-BY-4.0` · lore/brand/unpublished → none, all rights reserved.

A monorepo may mix these: declare per directory in `REUSE.toml`. Dependencies MUST
flow apps → packages, never the reverse.

Every code file starts with:
// SPDX-FileCopyrightText: 2026 Numen Games S.L.
// SPDX-License-Identifier: MIT (or the applicable ID)

**Consume:** MIT · ISC · BSD · Apache-2.0 · 0BSD · CC0-1.0 · CC-BY-4.0 freely.
MPL-2.0 · EPL-2.0 · LGPL-3.0 with isolation. GPL/AGPL only in their own repo with a
signed decision. NEVER: BUSL, SSPL, Elastic, Commons Clause, proprietary, CC-NC,
CC-ND, or anything without a declared `license` field. Resolve every dependency's SPDX
from the registry BEFORE adding it — never from memory.

**Floor rule:** the strongest copyleft in the distributed tree sets the minimum
outbound license — one GPL import excludes MIT output. devDependencies and build tools
don't count; whatever ships in the client bundle does.

**Contributions:** any repo containing AGPL code requires a CLA (per repo, not per
path); MIT-only repos and docs use DCO (`git commit -s`); asset PRs need an explicit
CC0 declaration.

**Header exception:** never edit pinned third-party kits, vendored code, generated
artifacts or metadata-less binaries to insert an SPDX header — declare them in
`REUSE.toml` or an adjacent `.license` file.

**Repo skeleton on creation:** `LICENSE` · `LICENSES/` · `REUSE.toml` ·
`TRADEMARKS.md` · `NOTICE` if Apache-2.0 ships · `license` field in every
package.json. CI runs `license-check`: error on `.com`, warning on `.store`.

**Stop and ask — never proceed alone:**

- Ownership of a piece is unclear or undocumented
- Publishing anything CC0 to Arweave (irreversible; gated; requires sign-off)
- First `npm publish` of any package (locks the MIT edge forever)
- Files containing people, voices, or personal data
- Any license outside the lists above
