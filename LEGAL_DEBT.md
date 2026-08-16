# LEGAL_DEBT.md — Licensing exceptions ledger

> **For humans.** Every live deviation from canon C-005, each with its exit condition. Items leave only by exiting — never by being forgotten.
>
> **Epistemic value.** Resolves which license risks we knowingly carry and what triggers their removal.
> **Pragmatic value.** Exceptions expire on thresholds, not dates; CI guards enforce the triggers. An exception without an exit is a violation.
> **In the system.** Observes: docs/legal-book.md (canon C-005), the license gate, the dist guard. Regulates: dependency exceptions. Coupled to: ADR-019, scripts/license-guard.mjs.
>
> _Part of the Law. Index: [docs/LEY.md](docs/LEY.md)_

---

## DEBT-002 — Lore opening deferred (extraction done, publication conditioned)

- **Opened:** 2026-08-16 (Oracle direction: lore leaves the code repository) · **Status:** OPEN
- **What happened:** `docs/seminal/` (7 documents incl. the unpublished RPG
  manual) moved to the private `numinia-lore` repository and was scrubbed
  from this repo's history (ADR-020). Reserving rights and not exposing
  content are different things — REUSE.toml only solved the first.
- **Exposure assumption (explicit):** whatever was taken while the repo was
  public is not recoverable; the action reduces future exposure, not past.
  The manual being outdated limits the damage.
- **Opening is deferred, NOT discarded.** Exit conditions, ALL required:
  1. Updated manual (the current text is outdated),
  2. Third-party rights review — the manual cites Jung, Eco, Blavatsky and
     Steiner; verify quotations vs long reproductions,
  3. **Signed amendment of D-03** with an entry in the version register —
     never a silent REUSE.toml change.
- **Likely license on opening:** CC BY-SA 4.0 (adoption with reciprocity —
  the same logic as the AGPL core), not CC0.

## DEBT-001 — MetaMask SDK (ConsenSys proprietary license, no `license` field)

- **Opened:** 2026-08-16 (ADR-019 hardened gate revealed it) · **Status:** OPEN
- **Packages (version-pinned in the gate's exclude list):**
  `@metamask/sdk@0.33.1` · `@metamask/sdk-communication-layer@0.33.1` ·
  `@metamask/sdk-install-modal-web@0.32.1`
  — transitive via thirdweb → x402 → wagmi → @wagmi/connectors. Any version
  bump falls out of the exclusion and re-triggers this review by design.
  (`@metamask/eth-json-rpc-provider@1.0.1` is NOT part of this debt: registry
  says ISC; its tarball merely omits the field — clarified in
  `scripts/license-clarifications.json`. `@metamask/providers`, `onboarding`
  and `sdk-analytics` are MIT.)

### Why it is tolerable today

The ConsenSys license defines "Non-Commercial Use" to include (clause 3)
**any use whose monthly active users stay ≤ 10,000 across all versions and
platforms**. Numinia is far below that ceiling, so we are inside the permission
even as a commercial entity. Verified against the bundler's own module
manifest (`dist/.license-modules.json`, written by
`scripts/vite-license-manifest.mjs`): **no ConsenSys code ships in `dist/`**
(thirdweb tree-shakes the SDK connector out; only the registry install exists
in node_modules). A plain string scan is NOT proof — minifiers strip license
comments — which is why the guard audits module paths first and keeps the
string sweep only as a second net.

### Why it cannot stay

The license propagates its Notice requirement and Non-Commercial restriction to
any "Resulting Program" — terms **incompatible with AGPL-3.0-only**, which
forbids further restrictions. Since `apps/*` is AGPL as of ADR-019, the day
this code enters `dist/` the combined work becomes impossible to license
compliantly. The guard is not prudence; it is what prevents an uncompliable
state.

### Exit condition (threshold, not date) — whichever fires first

1. **5,000 MAU** on numinia.com (half the license ceiling, our safety margin), or
2. **the first build that lands ConsenSys code in `dist/`** —
   `scripts/license-guard.mjs` audits the build's module manifest for the
   three forbidden packages on every `verify` and every CI run, and fails
   the build. This check is an **error in every app regardless of deploy
   target** (ADR-019 calibration): the trigger is the AGPL-uncompliable
   state, which exists the moment the code enters a bundle, served or not.

### Exit path (investigated 2026-08-16, ready to execute)

Remove `createWallet('io.metamask')` from the wallet list
(`apps/store/src/components/auth/LoginSpike.tsx:36`). Desktop MetaMask users
keep connecting through the injected **EIP-6963** provider; mobile users reach
MetaMask through **WalletConnect** (already in the list), which covers the
deep-link/QR flow that is the SDK's main contribution. Login is SIWE in the
browser, so no SDK-only capability is load-bearing. Requires wallet QA
(desktop extension + mobile) before shipping.
