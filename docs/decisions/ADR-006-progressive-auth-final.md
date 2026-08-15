# ADR-006 (final): Progressive authentication — embedded wallet via thirdweb

**Status:** Accepted (Oracle session 2026-08-15) — entry vendor **conditional on the MISSION-002 evaluation spike**; boundary and storage marked **provisional/evolving** by the Oracle.
**Supersedes:** the "details TBD" state of ADR-006 in DECISIONS.md.

## Definition

1. **Entry model (option B): embedded wallet.** Users enter with social/email/passkey and receive an embedded wallet under the hood; external wallets connect natively alongside. Vendor: **thirdweb** (In-App Wallets + Connect), **conditional** on the Oracle's clause "si se puede hacer todo con thirdweb" — MISSION-002 opens with an evaluation spike that must check every required capability before any integration code lands.
2. **Layers 0–1 need no auth at all**: browsing and CC0 downloads stay anonymous. "Nomad" is any *authenticated* identity — and thanks to the embedded wallet, every Nomad has an address from day one, which keeps the rank ladder single-primitive.
3. **Web3 boundary (provisional): Pilgrim.** Nomad and Citizen (Session Zero) work with any entry identity; exchange with Numinia (purchases, on-chain loot) requires a real wallet action. The Oracle flagged this line for **QA and possible future change** — tracked as open-questions D13; the code must keep the boundary a single configurable rank constant.
4. **User state (evolving): deferred until Citizen.** No persistent server-side user state before Citizen; completing Session Zero produces the first record — a signed attestation committed to the data repo (File Over App, like the legacy's markdown ficha but signature-backed). Evolution path: richer attestations → on-chain (Phase 3+). No traditional DB, ever (constitution).
5. **Signature scope at launch: EOA-only**, verified locally (no RPC), as proven in the Phase 0.7 spike. Contract wallets (EIP-1271) **fail closed** with a clear error until supported; when added, verification runs via RPC and **thirdweb RPC endpoints are an acceptable provider for viem** (Oracle asked; confirmed — no second vendor needed).

## Non-negotiables carried in (from the legacy audit — design law)

- Server-side **signature verification always**; no decode-without-verify helpers exist in this codebase, for any purpose.
- **Missing auth config ⇒ 401/crash, never fallback** — with a test proving it (audit rule 4).
- Sessions in httpOnly cookies; wallet addresses never enter analytics (ADR-016).
- Nonce lifecycle: bound, single-use, TTL (spike pattern).

## Epistemic value

The session collapsed four unknowns into one testable question ("does thirdweb cover everything?") plus two explicitly provisional lines (boundary, storage) — uncertainty is now located, owned and cheap to revisit instead of implicit.

## Pragmatic value

`packages/auth` can be specified completely (MISSION-002); the domain needs zero changes (permissions are rank-based and auth-agnostic; `CharacterSheet.walletAddress` already optional).

## Consequences

- MISSION-002 = evaluation spike (GATE) → `packages/auth` → login island + verified session endpoint.
- open-questions: D1 closed; **D13** (Pilgrim boundary QA) and **D14** (thirdweb evaluation outcome) opened.
- If the evaluation spike fails the "everything" clause → back to the Oracle with options C (passkeys) or self-hosted embedded wallets; nothing else in this ADR changes.
