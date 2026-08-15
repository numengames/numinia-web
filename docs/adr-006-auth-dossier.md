# ADR-006 Session Dossier — Progressive Auth (Web2 → Web3)

> Prepared input for the dedicated hybrid session (open-questions D1). Nothing
> here is decided; this maps the option space so the session starts at the
> decision, not at the research. The Oracle noted "many nuances" — the open
> questions at the end are exactly where those nuances belong.

## Fixed constraints (already decided elsewhere — not up for debate)

1. **Fail closed** (legacy audit B1/B2 + SECURITY.md): no unverified-decode
   helpers, no silent fallback when config is missing. Every path 401s.
2. **No email/password, no Auth.js/NextAuth** (constitution).
3. **No traditional DB**: sessions cannot rely on a server-side user table.
4. **No PII in analytics**; wallet addresses never leave the auth boundary.
5. The permission model is rank-based (`packages/domain`), auth-method-agnostic.
6. SIWE mechanics are proven (Phase 0.7 spike: EIP-4361 + viem, httpOnly
   cookies, nonce lifecycle, EOA-only for now).

## The core product question

> Who is a Nomad, technically? The rank ladder starts at Nomad ("registered by
> the system"). What is the _minimum_ identity that registration requires?

Everything else derives from this.

## Option map — Web2 entry

| Option                                                                                        | How                                                                        | Pros                                                                                                        | Cons / nuances                                                                                                                                                                               |
| --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A. **Guest-first** (no auth at Layer 0/1)                                                     | Anonymous browsing + downloads; identity only appears at Layer 2           | Zero friction, matches CC0 openness; nothing to build                                                       | "Nomad" = merely a visitor; no cross-device continuity; favorites live client-side (constitution bans localStorage in components — needs a cookie-based or deferred design)                  |
| B. **Embedded wallet via social/email login** (thirdweb-style, or self-hosted passkey→wallet) | User logs in with social/email/passkey; a wallet is created under the hood | One identity system (always a wallet address); progressive by construction; legacy already validated the UX | Vendor dependency (thirdweb) vs build cost (self-hosted AA/passkey infra); custody questions; the legacy's failure mode (unverified JWT) must not be copied                                  |
| C. **Passkeys (WebAuthn) as native Web2 tier**                                                | Passkey identity first; wallet linked later                                | Standards-based, no vendor, phishing-resistant, no passwords                                                | Two identity primitives to reconcile (passkey id ↔ wallet address); linking ceremony needed; where is the mapping stored without a DB? (File Over App: signed attestation in the data repo?) |
| D. **Wallet-only from day one**                                                               | SIWE or nothing                                                            | Simplest, sovereign, already spiked                                                                         | Excludes exactly the audience the "digital divide bridge" mission targets                                                                                                                    |

## The storage question (no DB allowed)

Sessions: stateless signed cookies (HMAC/JWT, server secret) — fine.
The hard part is **user state** (rank triggers, Session Zero completion, links
between identities). Options: (a) wallet-signed attestations committed to the
data repo (File Over App, auditable, but public); (b) on-chain (SBT/attestation
— cost, Phase 3+); (c) deferred: no persistent user state until Citizen, where
Session Zero itself produces the record. Option (c) pairs naturally with entry
option A or B.

## When does Web2 become insufficient?

Proposed line (to ratify): **Pilgrim**. Browsing/downloading (Nomad) and even
Session Zero (Citizen) can work with any identity, but exchange with Numinia
(purchases, on-chain loot) requires a wallet. This matches the seminal rank
definitions and keeps the bridge long.

## Migration Web2 → wallet without losing progress

Sketch: a signed linking ceremony — the Web2 identity requests a link
challenge; the wallet signs it (SIWE message with a `link` statement); the
attestation (both identifiers + signatures) becomes the migration record.
Where that record lives = the storage question above.

## Threat notes (carry into whatever is chosen)

- Nonce replay (spike already binds nonce to cookie + 5-min TTL).
- Contract wallets (EIP-1271) need RPC verification — the spike's local-only
  recovery is insufficient for them; decide EOA-only launch vs 1271 support.
- Session fixation/rotation, cookie scope, CSRF for any mutating endpoint.
- If thirdweb (option B): verify JWTs **with signature, always**, and fail
  closed when the verifying config is absent — the exact legacy bug class.

## Recommended session agenda (60–90 min)

1. Decide the Nomad question (guest vs identity) — 15 min.
2. Pick the Web2 entry option (A–D) and the Web2→insufficient line — 20 min.
3. Pick the user-state storage posture (a/b/c) — 20 min.
4. Ratify migration ceremony sketch + threat list — 15 min.
5. I turn the outcome into ADR-006 final + MISSION-002 spec.
