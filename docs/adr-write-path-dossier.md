# Write-Path ADR Dossier — how the platform writes

> **For humans.** Prepared input for the write-path decision session (status.md NEXT #4). Nothing here is decided; this maps the option space so the session starts at the decision, not at the research.
>
> **Epistemic value.** Resolves what "the platform writes something" can mean under the constitution, and what each meaning costs.
> **Pragmatic value.** The single biggest unlock for the game half of the platform: users, ranks, uploads, Session Zero, loot. Every blocked feature waits on this page.
> **In the system.** Observes: constitution (File Over App), ADR-006 auth dossier, permission model. Regulates: every future write. Coupled to: docs/status.md, docs/open-questions.md, packages/auth.
>
> _Part of the Law. Index: [LEY.md](./LEY.md)_

## Fixed constraints (already decided elsewhere — not up for debate)

1. **No traditional database** (constitution): data lives in files — GitHub
   JSON for metadata, Arweave/R2/IPFS for binaries. Whatever writes, the
   durable form must be a file a human can read outside the app.
2. **File Over App and data dignity** (MISSION-005 seed, sheet precedent):
   what belongs to the citizen stays in the citizen's file. The platform
   holds as little as possible.
3. **Sessions are stateless** (ADR-006 line, `@numinia/auth`): HMAC tokens,
   no server-side session table. The platform currently knows only the
   session it issued and the Oracle wallet allowlist. There is NO user store.
4. **Fail closed** everywhere; the 22-permission ladder
   (`resolvePermissions`) is the only authority for who may write what.
5. **Runtime is a Cloudflare Worker**: no filesystem, no long processes.
   Anything durable must leave the Worker (GitHub API, R2 API, chain).
6. The data repo (`numinia-digital-goods-data`) is public; anything written
   there is published. Private state needs a private home.

## The core product question

> When the city remembers something about a citizen — a rank, a seal, an
> upload, a ban — **whose file does that memory live in, and who holds the
> pen?**

Everything else derives from this. Three honest answers exist: the
platform's file (a state repo), the citizen's file (signed attestations),
or the chain (Phase 4). They are not exclusive — the real decision is
which memory goes where.

## Write inventory — everything currently blocked on this ADR

| Write                              | Actor            | Permission (ladder)      | Frequency | Sensitivity                          |
| ---------------------------------- | ---------------- | ------------------------ | --------- | ------------------------------------ |
| Promote/demote a citizen's rank    | Archon/Oracle    | `manage-users`           | rare      | high (governance)                    |
| Ban a user                         | Archon/Oracle    | `manage-users`           | rare      | high                                 |
| Session Zero seal earned           | system (Hyperfy) | `session-zero`           | bursts    | high (drives citizenship)            |
| Asset upload (binary + metadata)   | Vernacular+      | `upload-assets`          | low       | medium (public once accepted)        |
| Asset metadata edit                | owner / Archon   | `edit-own-metadata`      | low       | medium                               |
| Sheet sync to a session (optional) | citizen          | `edit-profile`           | medium    | personal — citizen-owned by doctrine |
| Favorites / loot claims            | citizen          | `favorite`/`access-loot` | high      | low/personal                         |
| Audit log of all the above         | system           | `view-audit-log` (read)  | mirrors   | high (must be tamper-evident)        |

## Option map — the durable write mechanism

| Option                                                                 | How                                                                                                                                                                                                              | Pros                                                                                                                                                                                  | Cons / nuances                                                                                                                                                                                                                                                   |
| ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A. **Git as the database**                                             | The Worker commits JSON files to a repo via the GitHub API (bot token). One file per entity (`users/0xabc….json`), directories as tables.                                                                        | Purest File Over App; the audit log is free and tamper-evident (git history); PR-gating possible for sensitive writes; zero new infrastructure; data readable forever without the app | Latency (~1-3s/commit) and GitHub rate limits (5k/h) — fine for rare writes, wrong for favorites-scale; write races need care (SHA-conditional PUTs); needs a PRIVATE state repo (bans and rank history must not be public), which splits "the" data repo in two |
| B. **Operational store + git export** (KV/D1/Durable Object as buffer) | Fast writes land in Cloudflare storage; a scheduled job folds them into JSON commits (hourly/daily).                                                                                                             | Absorbs high-frequency writes (favorites, telemetry); users see instant effect; git remains the durable truth                                                                         | A database in the pipeline even if git is canonical — walks the constitutional line and must be argued as cache, not store; two sources of truth between exports; more moving parts (cron, replay, conflict rules)                                               |
| C. **Citizen-signed attestations** (the citizen's file grows)          | The platform never stores personal state; it ISSUES signed statements (seal earned, rank granted) that the citizen keeps — in their sheet file, wallet, or both. Verification is signature-checking, not lookup. | Maximum data dignity; nothing personal on our side to breach, rotate, or subpoena; aligns with the sheet's export/import design; naturally portable to chain later                    | Cannot express BANS (a banned user simply won't carry the "banned" attestation) or any state the citizen benefits from hiding; revocation needs a platform-side list anyway; UX of "keep your file safe" is real friction                                        |
| D. **On-chain (SBT / attestation registry)**                           | Ranks and seals as soulbound tokens or EAS-style attestations.                                                                                                                                                   | Sovereign, interoperable, matches the Web3 half of the bridge                                                                                                                         | Phase 4 by plan; gas/custody/UX for Web2 citizens; still needs an off-chain path for moderation; premature as the FIRST write mechanism                                                                                                                          |

## The binary path (uploads — orthogonal to the above)

Binaries never travel through git. The proven industry shape fits every
option: the Worker checks `upload-assets` → issues a **presigned R2 PUT**
→ client uploads directly → Worker validates (format sniff, size caps,
Zod on metadata) → metadata JSON lands via the chosen mechanism → Arweave
pinning follows asynchronously (Phase 4 pipeline). Decision needed only on
**acceptance flow**: direct publish for Vernacular+, or PR-style review
queue (option A makes review queues literal GitHub PRs — an Archon
approving an upload is a merge).

## Recommendation (for the session to attack)

**A as the spine, C as the doctrine, B only when a write is provably too
hot for A — and D when Phase 4 arrives.** Concretely:

1. A **private `numinia-state` repo**: `users/`, `moderation/`,
   `session-zero/`, `audit/` — one JSON file per entity, bot commits with
   the acting session's wallet in the commit message trailer. Sensitive
   ops (rank changes, bans) as PRs the Oracle merges — governance becomes
   literally reviewable.
2. **Personal state stays in personal files** (sheet doctrine): favorites
   and sheet data remain client-side/exported files until a citizen
   explicitly opts into sync; sync = the platform holding a copy, never
   the original.
3. **KV strictly ephemeral** (nonces, rate-limit counters, upload tickets)
   with TTLs — cache semantics, never truth, staying inside the
   constitution's letter and spirit.
4. Seals from Session Zero arrive as **signed webhook events** from the
   Hyperfy side (D4 still open) and land as both a state-repo file (A)
   and a citizen attestation (C) — dual-written from day one so the
   Phase 4 chain migration is a format change, not a redesign.

## Security notes for whatever wins

- The bot token is the crown jewel: fine-grained PAT scoped to the ONE
  state repo, stored as a Worker secret, rotated with the standing
  key-rotation calendar (NEXT #2). It must not be able to touch this
  platform repo or the public data repo.
- Every write endpoint: session required → permission checked via the
  ladder → Zod on the payload → audit entry in the same transaction/commit.
- Rate limits per wallet on every write route (KV counters, fail closed).
- The public data repo gains writes ONLY through the upload acceptance
  flow — never directly from a request handler.

## Open questions for the Oracle (the nuances)

1. **D19 — Public vs private memory:** is a citizen's rank public data
   (city census) or private? Decides which repo `users/` lives in.
2. **D20 — Review queues:** do Vernacular uploads publish directly or wait
   for an Archon's merge? (Option A makes both one flag.)
3. **D21 — Sheet sync:** offer server-side sheet copies at all, or keep
   the sheet purely citizen-held until citizens ask?
4. **D22 — Favorites:** worth any server write, or client-side until
   loot/seasons give them meaning?
5. **D23 — The state repo's name and org** (couples with D15, the legacy
   remote's fate).
6. **D4 (standing):** where does the Hyperfy side live, and can it sign
   webhooks? Session Zero writes are blocked on this regardless of option.

---

_Prepared 2026-08-16 (night) by the digital agent, by standing order
("mejora lo que toque"). No writes were implemented; this page unblocks
the session that decides them._

---

## RESOLVED — 2026-08-16, in-session

The Oracle adopted the recommendation in full: **[ADR-018](./decisions/ADR-018-write-path.md)**
(A as spine, C as doctrine, D19 census public, D20 uploads via PR review,
D21/D22 nothing personal server-side). D23 and D4 remain open there.
This dossier stays as the option map behind that decision.
