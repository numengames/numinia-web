# Open Questions & Discrepancies — Session Backlog

> Every unresolved doubt, contradiction, or pending decision, consolidated for future themed sessions.
> Rule: nothing here is decided silently. Each item names its sources, its blocking score (1–10), and the session type it needs.
> Cross-references: `docs/onboarding-report.md` §c/§e (full audit trail), `docs/glossary.md` (⚠ items), ADR-013.
>
> Last updated: 2026-08-14 · Maintained by: Claude (digital agent)

## A. Taxonomy — ~~needed to freeze `docs/glossary.md` v1.0.0~~ **RESOLVED 2026-08-14**: the Oracle ratified all six proposals (glossary frozen at v1.0.0) and flagged the taxonomy as **revisitable in a future session** — any change goes through the glossary first.

| #   | Question                                                                                                                                                      | Sources                                        | Proposal on the table                                           | Blocks |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- | --------------------------------------------------------------- | :----: |
| A1  | House EN name: **Projectors** vs "Project Designers" (Proyectistas)                                                                                           | Constitution §Domain model vs _Role structure_ | Projectors                                                      |   8    |
| A2  | House EN name: **Legal Counsels** vs "Legal Rabbits" (Conejos Legales — the ES pun Conejos≈Consejos is lost either way in EN)                                 | Constitution vs _Role structure_               | Legal Counsels                                                  |   8    |
| A3  | Field-of-development label for Heirs of Eleusis: **Gamification** vs "Play" (_Welcome_) vs "Proyección narrativa" (manual)                                    | Constitution vs seminal corpus                 | Gamification (`gamification`), others recorded as lore synonyms |   8    |
| A4  | Force ids as Spanish loan-words (`velo`, `umbral`, `prisma`) to defuse the triple collision of "threshold" (force / per-position stat / Session Zero portals) | Manual, Fragmento 5                            | Yes — EN display names stay Veil/Threshold/Prism                |   6    |
| A5  | EN coinages for untranslatable position names: **Armonaut** (Armonauta), **Anacharchid** (Anacárquide)                                                        | Manual, positions 6 & 14                       | As written in glossary §S2                                      |   4    |

## B. Constitution corrections — require Oracle authorization to edit CLAUDE.md

| #   | Discrepancy                                                                                                                                                  | Evidence                                    |               Severity               |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------- | :----------------------------------: |
| B1  | ~~**Session Zero seal names.**~~ **RESOLVED 2026-08-14**: Oracle authorized the correction (glossary ratification #4); CLAUDE.md now says Culture + Wisdom.  | `CLAUDE.md` §Session Zero (fixed)           |                Closed                |
| B2  | **Type-file count drift.** CLAUDE.md says "18 type files" but its own table lists 19; TODO.md says 14+4=18. Real number gets settled by the taxonomy freeze. | `CLAUDE.md` §Domain model vs `TODO.md` §0.2 | Low — cosmetic until `types/` exists |
| B3  | ~~**Mission template references a missing file**~~ **RESOLVED 2026-08-15**: `missions/Definition_of_Done_v0.2.0.md` created (infra-quality W5).              | Fixed                                       |                Closed                |

## C. Corpus & provenance

| #   | Question                                                                                                                                                                                                                                                                                                                                                                           | Detail                                                             |   Severity    |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | :-----------: |
| C1  | **Seminal corpus went from 9 to 7 documents.** `README.md` (index) and `Platform_Role_System.md` (v2 rank/permission matrix; Oracle cap = 4; rank-detection table) were not carried into `docs/seminal/`. Consistent with ADR-011 (unbounded Oracle rank) — confirm the omission is deliberate and that `permission.ts` (22 permissions, 6 groups) fully supersedes the v2 matrix. | Legacy corpus vs `docs/seminal/`                                   |    Medium     |
| C2  | **Recovered domain-v0.1 files.** If recovered, they go to `docs/reference/domain-v0.1/` as diff target only. Not yet present. When placed, run a systematic diff against the regenerated model and report divergences.                                                                                                                                                             | Oracle directive 2026-08-14                                        | Low (waiting) |
| C3  | **Rebuild plan is stale on i18n** ("EN/JA/ES") — superseded by ADR-001 (5 languages). Treat `docs/numinia-rebuild-plan.md` as historical context, never as instruction source. Consider a superseded-notice header.                                                                                                                                                                | `docs/numinia-rebuild-plan.md` §3/§6                               |      Low      |
| C4  | **Ritual times contradict each other in the seminal corpus**: Dark Council / Lunar Coven at 10:00–12:00 (_Epistemic relations_) vs 22:00–00:00 (_Welcome_, _Brand & Culture_). Only matters if the platform ever surfaces the ritual calendar.                                                                                                                                     | Seminal corpus (immutable — needs an external ruling, not an edit) |      Low      |

## D. Product & architecture — dedicated sessions (from TODO.md plus onboarding findings)

| #   | Topic                                                                                                                                                                                                                 | Status                              | Session type        |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- | ------------------- |
| D1  | ~~**Progressive auth Web2→Web3**~~ **RESOLVED 2026-08-15** — session held; ADR-006 final in docs/decisions/. Follow-ups: D13, D14.                                                                                    | Closed                              | —                   |
| D2  | **Gender-restricted positions policy** (ADR-013 open question: enforce, display, or ignore in user-facing flows; inclusivity + legal implications)                                                                    | Data field exists, nothing reads it | 🧬 Pablo decision   |
| D3  | ~~**Deploy target for Phase 0**~~ **RESOLVED 2026-08-14**: Vercel for Phase 0 (v0.16.0); the Oracle considers Cloudflare more suitable long-term — **migration planned for a future version** (new open item D3-bis). | Vercel now / Cloudflare later       | Closed → D3-bis     |
| D4  | **Hyperfy Session Zero infrastructure location** — never-touch guarantee is unverifiable until located; Phase 3 integrates via API                                                                                    | Unlocated                           | 🧬 info             |
| D5  | **"L.A.P." acronym** (Vernacular permission "access-lap") — legacy sidebar panel; planned rename to "P.A.R. — Personal Akashic Reader" per legacy docs. Confirm naming for `permission.ts`.                           | Unknown                             | 🧬 info             |
| D6  | **Huly integration design** (missions board ↔ platform: API, deep links, bidirectional?)                                                                                                                              | Not designed                        | 🧬🤖 Hybrid         |
| D7  | **Season pricing / business model** (9.99 € pass from v0.1.0 — validated?)                                                                                                                                            | Unvalidated                         | 🧬 Pablo            |
| D8  | **Brand & Culture visual package** (logo, guild icons, seal designs) — blocks final `tokens.css`; provisional values ship meanwhile                                                                                   | Blocked on assets                   | 🧬 Pablo            |
| D9  | **Translation QA** for JA/KO/PT-BR constants (native review)                                                                                                                                                          | Pending workflow                    | 🧬 hire/find        |
| D10 | **Humor/archetype constant depth** — TODO says "attribute links" (humors) and "guild/faction alignment" (archetypes); confirm full attribute sets (hours, elements, organs, conducts) are Phase 0 or later            | Partially resolved                  | 🤖 with 🧬 sign-off |

### D11 — License: MIT vs AGPL-3.0 (Oracle decision, raised 2026-08-14)

`numinia-platform` is clean-room (zero legacy lines, fresh history): Numen Games holds full copyright and can pick **any** license — no relicensing constraints, MIT deps are AGPL-compatible. Trade-off is strategic, not legal: AGPL protects against closed SaaS forks but adds friction to the Remix pillar and to corporate adopters; assets remain CC0 either way. Constitution currently says MIT (and root/domain `package.json` say MIT). **Decide before the first public release / GitHub remote creation**; if AGPL, update constitution + `package.json` files + an ADR. _(Not legal advice; confirm with counsel.)_

### D13 — Pilgrim boundary is provisional (raised 2026-08-15)

The Web2→Web3 line sits at **Pilgrim** by Oracle decision, explicitly flagged "tenemos que evaluar y hacer QA, puede que lo cambiemos". Code keeps it a single configurable rank constant; revisit after MISSION-002 QA.

### D14 — thirdweb evaluation outcome (raised 2026-08-15)

MISSION-002 Step 0 gate: does thirdweb cover the full ADR-006 checklist under fail-closed + no-PII constraints? If not → back to the Oracle (options C/self-hosted). Also confirmed: thirdweb RPC is acceptable for future EIP-1271 verification via viem.

### D12 — Analytics backend/vendor (Oracle decision, raised 2026-08-15)

`packages/analytics` (ADR-016) is transport-pluggable and currently local-only (memory transport). Before any public deploy: pick the backend (Plausible / self-hosted Umami / custom beacon endpoint / other) **and** ship the consent banner. Privacy constraints already fixed: no PII, referrer host only, drop-not-buffer before consent. The choice never touches call sites.

### D15 — Destiny of the GitHub legacy remote (Oracle decision, push day; raised 2026-08-15)

The consolidated history (ADR-017) makes `github.com/PabloFMM/numinia-digital-goods` redundant as a live repo. At push day, choose: **(a)** archive it read-only with a pointer to the new repo (clean separation; old SHAs stay citable), or **(b)** repurpose it by pushing the consolidated history there (keeps URL/stars; requires force-push and renaming the repo to match the platform scope). Decide together with D11 (license). Until then it stays untouched as a permanent backup.

## E. Process conflicts needing an explicit ruling

| #   | Conflict                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Detail |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| E1  | **Test-code review vs legacy ban.** Order of 2026-08-14: "Never read from or write to the legacy repository again." Later same-day request: "deep evaluation of the test code, focus on bugs and improvements." The only existing test code in the workspace is the legacy repo's 173 Vitest tests; the rebuild has none yet (TDD starts after glossary ratification). Cannot satisfy both orders without a ruling: (a) bounded read-only exception to audit legacy tests for learnings, (b) wait and review the rebuild's own tests as they are written, or (c) another target I'm not seeing. |

---

_Items get struck through with a pointer to the resolving ADR/session note — never deleted._
