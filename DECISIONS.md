# Architecture Decision Records — Numinia Platform

> Each decision follows the Peirce trichotomy:
> **Definition** (what) · **Epistemic value** (why we believe it) · **Pragmatic value** (what it enables)
>
> Date: 2026-04-03 · Session: CTO Architecture Review
> Participants: Pablo (Oracle), Claude (Digital Agent — CTO role)

---

## ADR-001: Five UI languages (ES, EN, JA, KO, PT-BR)

**Status:** Accepted

**Definition:** The platform supports 5 languages for UI and asset metadata. Deep lore content (RPG narrative, Akashic Archive) is only in ES and EN.

**Epistemic value:** Market analysis crossing four axes: RPG/tabletop market, Web3/wallet ecosystem, 3D/VRM/avatar culture, and digital market size. Each language scored 1-10. ZH scored 4/10 (China Web3 restrictions), DE scored 4/10 (German gamers consume English content). FR (7/10) deferred to post-launch.

**Pragmatic value:** `LocalizedString` has 5 required fields — Claude Code will never produce a type with missing translations. `LoreString` has 2 — prevents low-quality literary translations from degrading the canon.

**Alternatives considered:** 3 languages (too few for market reach), 7 languages from v0.1.0 (ZH and DE had poor ROI).

---

## ADR-002: Lore only in ES + EN

**Status:** Accepted

**Definition:** Deep narrative content (RPG manual lore, collection stories, Akashic Archive entries) exists only in Spanish and English. JA was considered and rejected for this tier.

**Epistemic value:** Numinia's lore is rooted in Mediterranean/Western esoteric traditions (Hermeticism, Eleusinian mysteries, Kybalion, Egyptian mythology). Full literary translation to JA requires specialized translators in Western esotericism — expensive and scarce. Japanese RPG enthusiasts who engage at this depth typically read English.

**Pragmatic value:** The `LoreString` type enforces the 2-language constraint at the type level. Content teams know exactly which fields to fill. No ambiguity about "should we translate this description to Korean?"

---

## ADR-003: Seven asset formats

**Status:** Accepted

**Definition:** `AssetFormat = 'glb' | 'vrm' | 'hyp' | 'mp3' | 'mp4' | 'png' | 'jpg'`

**Epistemic value:** The v0.1.0 platform screenshots revealed that the actual platform manages 7 formats, not just GLB/VRM. The Stats page showed 9 VRM, 8 GLB, 3 HYP, 2 MP3, 1 MP4, 5 PNG, 2 JPG. This was not documented in any seminal text — only visible in the running platform.

**Pragmatic value:** Validators, upload components, and viewer routing all depend on knowing the exact set of formats. A 3D-only type would have broken when encountering an MP3 in the data.

**Learning:** Always show screenshots of the running product before modeling types. Visual context reveals what text doesn't capture.

---

## ADR-004: Gherkin for acceptance criteria (Cucumber.js)

**Status:** Accepted

**Definition:** All acceptance criteria in Mission templates use Gherkin syntax (Given/When/Then). Implemented via Cucumber.js + Playwright for e2e tests.

**Epistemic value:** Gherkin is the only format that is simultaneously readable by Product Owners (natural language), executable by test runners (Cucumber.js), and consumable by AI agents (Claude Code interprets Given/When/Then as specifications). It fulfills the "documentation for biological AND digital agents" principle.

**Pragmatic value:** The `AcceptanceCriterion` type in `mission.ts` has `given`, `when`, `then` fields. `.feature` files live in `/features/` and are part of CI. No feature ships without passing its Gherkin spec.

---

## ADR-005: Missions ≠ Adventures

**Status:** Accepted

**Definition:** Missions (work items in Huly, assigned to agents) and Adventures (game experiences in Hyperfy, part of Seasons) are distinct domain concepts modeled in separate type files.

**Epistemic value:** Peirce's trichotomy applied:
- Missions = Operating System (Object) — organizational work
- Adventures = Narrative Projection (Representamen) — game experience
- Both converge in the Functional Model (Ground) — domain types

Conflating them would collapse the semiotic layers that Numinia is built on.

**Pragmatic value:** Separate types prevent an agent from accidentally linking a Huly task to a Season reward. The sidebar in v0.1.0 already separates these (no "Missions" section visible — they live in Huly, not in the platform UI).

---

## ADR-006: Progressive authentication (Web2 → Web3)

**Status:** Accepted in principle, **details TBD** (requires dedicated session)

**Definition:** Authentication is not wallet-only. The platform must support a progressive path from Web2 entry (email/social?) to Web3 sovereignty (SIWE wallet connection).

**Epistemic value:** Numinia's mission includes reducing the digital divide. Requiring a MetaMask wallet on first visit excludes the majority of potential users. The v0.1.0 screenshots show "Wallet Address: Not connected" — implying wallet is optional, not mandatory.

**Pragmatic value:** The `packages/auth` package must support multiple auth strategies. The `CharacterSheet.walletAddress` is already optional (`string | undefined`). The permission system works on rank, not on auth method.

**Open questions:**
- What is the Web2 entry method? Email + magic link? Social login? Guest session?
- At what point does Web2 auth become insufficient? (Probably at Pilgrim rank, where on-chain actions begin)
- How do we migrate a Web2 account to a wallet without losing progress?

---

## ADR-007: Guild names corrected from RPG manual

**Status:** Accepted

**Definition:** The canonical names for guild houses come from "Numinia. El juego de rol (manual completo)", not from the previous CLAUDE.md v0.1.0.

**Epistemic value:** The CLAUDE.md v0.1.0 contained English translations that do not match the RPG manual. Example: "Armonauts" appeared as a house name in the old CLAUDE.md, but the manual says "Proyectistas" (house) and the character sheet shows "Armonauta" as a Position (role), not a House.

| Old CLAUDE.md | RPG Manual (canonical) | Type |
|---|---|---|
| Armonauts | Proyectistas | House under Artisans |
| Technoweavers | Estetas | House under Artisans |
| Mnemographers | Logógrafos | House under Chroniclers |
| Archivists | Bardos | House under Chroniclers |
| Pythias | Hierofantes | House under Scholars |
| Hermeneuts | Taumaturgos | House under Scholars |
| Guides | Exploradores | House under Archangels |

**Pragmatic value:** Claude Code will use the correct names. The constants in `packages/domain/src/constants/guilds.ts` include both `[EN]` and `[ES]` names for every entity.

---

## ADR-008: All code comments in English

**Status:** Accepted

**Definition:** Every code comment, commit message, variable name, function name, and documentation string is in English. No exceptions, regardless of the developer's native language.

**Epistemic value:** English is the lingua franca of open source. Numinia's code is MIT-licensed and intended for a global community. Spanish comments would exclude contributors and AI agents trained primarily on English code.

**Pragmatic value:** Claude Code, linters, and documentation generators all work better with English. ESLint rules can enforce this. PR reviewers have a clear standard.

---

## ADR-009: Domain model is framework-agnostic

**Status:** Accepted (implicit, made explicit here)

**Definition:** `packages/domain` contains zero framework imports. No React, no Astro, no Next.js, no viem. Pure TypeScript types, constants, validators, and resolvers.

**Epistemic value:** If the Astro spike (Phase 0.7) fails and we pivot to Next.js, the domain model survives intact. If we later add a mobile app (React Native), it imports the same types. The domain is the invariant core.

**Pragmatic value:** `packages/domain/package.json` has zero dependencies except `zod` (for validators). This is by design.

---

## ADR-010: v0.1.0 design preserved, code discarded

**Status:** Accepted

**Definition:** The UX/functional design visible in v0.1.0 screenshots (sidebar structure, character sheet layout, portals map, seasons flow, permission hierarchy) is the starting point for the rebuild. The code underneath is entirely discarded.

**Epistemic value:** Initial audit scored the codebase 2/10 (monolith, 306 console.logs, 1943-line component, broken CORS). But the screenshots revealed a functional UX scored at 7/10. The problem was never the design — it was the engineering under it.

**Pragmatic value:** Designers and Product Owners can reference the v0.1.0 screenshots as baseline. Developers build from clean code that honors that design. No one wastes time reverse-engineering the old codebase.
