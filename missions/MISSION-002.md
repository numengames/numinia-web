# 🪐 MISSION-002 — Progressive Identity (Phase 2 core)

> **For humans.** Mission spec: progressive identity (Web2→Web3) with the thirdweb evaluation gate at Step 0.
>
> **Epistemic value.** Resolves how identity will be built and which vendor questions gate it (D13, D14).
> **Pragmatic value.** No identity code beyond the vendor-independent core until Step 0 passes with the Oracle.
> **In the system.** Observes: ADR-006. Regulates: auth work. Coupled to: packages/auth, docs/decisions/ADR-006-progressive-auth-final.md.
>
> _Part of the Law. Index: [docs/LEY.md](../docs/LEY.md)_

> **Agent type:** 🔀 Hybrid (evaluation gate needs Oracle sign-off)
> **Priority:** 🔴 Critical · **Effort:** L · **Status:** 📋 Backlog
> **Guild / House:** Sentinels (protection) + Procurators (law)
> **Track:** `com`-grade `packages/auth`; `store` for the login surface. **No deploy.**
> **Governing decision:** docs/decisions/ADR-006-progressive-auth-final.md

## 📖 Story Statement

As a visitor, I want to become a Nomad with the identity I already have
(social, email, passkey, or wallet), so that entering Numinia never requires
understanding Web3 first.

## 🧠 Epistemic Value

- **Hypothesis (the Oracle's clause):** everything ADR-006 needs can be done
  with thirdweb (In-App Wallets, Connect, JWT auth with verifiable signatures,
  RPC for future EIP-1271) under our fail-closed and no-PII constraints.
- **Validation method:** Step 0 evaluation spike with a written checklist —
  every capability demonstrated locally or the gate fails.
- **Learning outcome:** _(fill on completion)_

## ✅ Acceptance Criteria (Gherkin, to be encoded in features/)

```gherkin
Scenario: Evaluation gate — the vendor covers everything (STEP 0, blocking)
  Given the ADR-006 capability checklist
  When each item is exercised against thirdweb locally
  Then every item passes, or the mission halts and reports to the Oracle

Scenario: Fail closed on missing configuration
  Given the auth verification config is absent
  When any protected endpoint is called with any token
  Then the response is 401 and no unverified decode occurs

Scenario: Forged tokens never authenticate
  Given a syntactically valid JWT with an invalid signature
  When it is presented to the session endpoint
  Then the response is 401

Scenario: A social login yields a Nomad with an address
  Given a user authenticates via the embedded-wallet flow
  When the session is created
  Then their rank is nomad and their sheet has a wallet address
  And no address ever appears in analytics events

Scenario: Anonymous browsing is untouched
  Given no session
  When visiting the archive and downloading an asset
  Then everything works exactly as before

Scenario: The Web3 boundary is one constant
  Given the boundary rank is configured as pilgrim (provisional, D13)
  When a session below the boundary attempts an exchange action
  Then it is refused with a clear upgrade path
```

## Plan sketch (plan-before-code applies at execution time)

0. **Evaluation spike + checklist → GATE** (halt on failure; report).
1. `packages/auth` (com): verified-session primitives, boundary constant,
   fail-closed config loading; 100% coverage + mutation.
2. Store: login island (client:load), session endpoint, logout; `data-metric`
   on every control (`wallet_connect_start/success` events go live).
3. Rank inference (nomad-only for now) + character-sheet stub wiring.
4. Report with what was NOT done (Session Zero recording lands with Phase 3).

## 🚫 Out of scope

Session Zero verification, purchases, EIP-1271, on-chain state, deploy.
