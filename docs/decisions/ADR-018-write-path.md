# ADR-018 — The write path: git as the database, the citizen as the archive

> **For humans.** Decision record: how the platform writes — where each memory lives and who holds the pen.
> **Epistemic value.** Fixes one architectural belief so it is never silently re-derived.
> **Pragmatic value.** Binding until superseded by a newer ADR with Oracle sign-off.
> _Part of the Law. Index: [../LEY.md](../LEY.md)_

- **Status:** Accepted (Oracle decision, 2026-08-16, in-session from the dossier)
- **Deciders:** Pablo (Oracle) — all four recommendations of the dossier adopted
- **Related:** [Write-path dossier](../adr-write-path-dossier.md) (option map),
  ADR-006 (auth), constitution (File Over App, no traditional DB), D4 (Hyperfy,
  still open), D23 (state repo name, still open), NEXT #2 (key rotation)

## Peirce trichotomy

- **Object (Operating System):** Writes are governed acts: session → permission
  ladder → validated payload → auditable record. The pen is never anonymous.
- **Ground (Functional Model):** Two archives with different owners: the city's
  file (a private state repo, git history as tamper-evident audit) and the
  citizen's file (signed attestations they keep). KV is never truth.
- **Representamen (Narrative Projection):** Governance you can literally read:
  a rank change is a commit, a sensitive act is a pull request an Archon
  merges, a citizen's story travels in the citizen's own file.

## Decision

1. **Mechanism — Option A as the spine, C as the doctrine** (dossier map):
   durable platform state is JSON files in a **private state repo**, written
   by the Worker through the GitHub API (bot token, SHA-conditional PUTs,
   acting wallet recorded in the commit trailer). Personal state is issued to
   the citizen as signed attestations and lives in the citizen's file. KV is
   strictly ephemeral (nonces, rate limits, upload tickets — TTL'd, cache
   semantics, never canonical). Option B is admitted only when a specific
   write is PROVEN too hot for A, case by case, argued in its own ADR note.
2. **D19 — The census is public:** a citizen's rank is civic identity,
   readable by anyone (and chain-portable in Phase 4). Moderation state —
   bans, rank-change history, reasons — is private (state repo only).
3. **D20 — Uploads pass review:** a Vernacular upload becomes a pull request;
   an Archon's merge IS the acceptance. Nothing reaches the public CC0
   catalog without human eyes. May be relaxed later by amending this ADR.
4. **D21/D22 — No personal state server-side for now:** the sheet remains a
   citizen-held file (export/import), favorites remain client-side. Server
   sync becomes its own decision when loot/seasons give it meaning.

## Consequences

- Unblocked (in feasibility order): user census + rank management
  (promote/demote as commits/PRs), moderation (bans, private), upload flow
  (R2 presigned + metadata PR), Session Zero seal recording (dual-written:
  state file + citizen attestation — blocked only on D4 webhooks).
- New secret to mint on implementation day: fine-grained PAT scoped to the
  state repo alone; joins the rotation calendar (NEXT #2). It must not reach
  this repo or the public data repo.
- Still open: **D23** (state repo name/org — couples with D15) and **D4**
  (Hyperfy side, webhook signing). First implementation slice cannot ship
  until the Oracle creates the private repo and mints the token.

## Rejected

- **B as spine** (operational store + export): two sources of truth and a
  database in the pipeline — walks the constitutional line for no present
  need. Admitted only per-write with proof.
- **D (on-chain) as first mechanism:** Phase 4 by plan; the attestation
  format keeps the door open without paying gas/custody/UX today.
