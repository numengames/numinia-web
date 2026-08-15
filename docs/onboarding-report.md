# Onboarding Report — Numinia Platform Rebuild

> Author: Claude (digital agent, lead engineer)
> Date: 2026-08-14 · Updated same day with the Oracle's resolutions (see §e)
> Status: Blockers D1–D3 resolved. Executing MISSION-000 starting with the glossary (docs/glossary.md), halted at taxonomy-approval gate.

## 0. What was read (Rule 1 compliance)

Read in full, in this order:

1. **CLAUDE.md (constitution)** — ⚠️ NOT FOUND at the repository root. The root of `numinia-platform/` contains only the cloned legacy repo `numinia-digital-goods/`. The three instructions received from Pablo (onboarding directive, MISSION-000, Rules of Engagement) were studied and recorded verbatim as the operative constitution until the file exists.
2. **DECISIONS.md (ADR-001–010)** — ⚠️ NOT FOUND anywhere in the workspace.
3. **TODO.md (backlog)** — ⚠️ NOT FOUND anywhere in the workspace.
4. **Seminal documents** — found at `numinia-digital-goods/docs/seminal-documents/` (not `docs/seminal/`). All nine read in full:
   - `README.md` (index of the corpus)
   - `Epistemic relations between Numen Games and Numinia.md`
   - `Welcome to Numinia.md`
   - `Compendium of Attributes and Ranks in Numinia.md`
   - `Platform Role System.md`
   - `Role structure in the Numinia system.md`
   - `About Session Zero.md`
   - `Numinia Brand and Culture.md`
   - `Numinia. El juego de rol (manual completo).txt` (4,667 lines, Spanish)

The legacy repo's own `CLAUDE.md` was also read as context. Per Rule 9, its **code** is condemned and zero lines will be reused; its documentation was used only to understand the universe and the data repo.

---

## a) What Numinia IS — five sentences

1. Numinia is the narrative projection of Numen Games' organizational operating system: a city-state imagined as a role-playing game, where the structures that make an organization work — roles, ranks, rituals, missions — become guilds, factions, districts, and adventures, so that operating _is_ playing and playing _is_ operating.
2. It rests on a deliberate epistemic chain — Operating System → Functional Model → Narrative Projection — mapped onto Peirce's semiotics (object → ground → representamen), meaning the fiction is not decoration: it is the referent through which the organizational model recognizes, teaches, and replicates itself.
3. Its functional model is built on real theory — Basic Level Theory for the guild hierarchy, Prototype Theory for the factions (with Play as the prototype and Art as the itinerant domain), Systems Thinking for roles-as-functions, and Active Inference as cognitive ground — so every cultural unit is computable, differential, and pragmatically meaningful.
4. As a fiction, Numinia is a city rebuilt from the Akashic Records after burning in 1920, suspended between steampunk and cyberpunk, animated by three forces (Velo, Umbral, Prisma), inhabited by five species across four floating districts, governed by decentralized councils under five Oracles, and living by a 13×29-day lunar calendar.
5. The platform we are building is the digital body of that city — a File-Over-App, CC0, wallet-native home where citizens progress through ranks (Nomad → Oracle) by playing, learning, creating, and trading digital goods; the goods exist to serve the game and the organizational purpose ("leveling up organizations to build better relationships"), never the other way around.

_(Deliberately not written: any phrasing that reduces this to a marketplace of files.)_

## b) The Peirce trichotomy mapped onto this codebase

The rebuild repo has no source directories yet (Phase 0 has not started), so this maps the trichotomy onto the structure MISSION-000 mandates. Directories marked _(planned)_ do not exist yet.

| Peirce            | Chain layer              | What it is here                                                                                                                                                                                                                                                                                                                                           | Directories                                                                                                                                                                                     |
| ----------------- | ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Object**        | **Operating System**     | The organizational need and its governance: the constitution, the settled decisions, the backlog, the mission specs, and the seminal corpus that grounds everything. This layer _decides_; it never renders.                                                                                                                                              | `CLAUDE.md`, `DECISIONS.md`, `TODO.md` _(all missing — see §c)_; `docs/` (this report, `docs/decisions/` ADRs, `docs/seminal/`); `missions/` _(planned)_                                        |
| **Ground**        | **Functional Model**     | The computable structure of the model: guilds (4×2 branches×2 houses), factions (4), species (5), ranks (6), positions (15), districts (4), forces (3), competences (9), archetypes (12), humors (4), calendar (13×29). Framework-agnostic, zod-only, 100% covered, 5 locales per constant. Shared infrastructure held to `com` standard also lives here. | `packages/domain` _(planned — "the soul", Rule 10)_; other `packages/*` _(planned: e.g. ui tokens, data-source client for the GitHub data repo)_                                                |
| **Representamen** | **Narrative Projection** | The visible expression: the apps that render the city — gallery, avatars (VRM islands), SIWE session, i18n routes — plus the open data that is the File-Over-App body of the assets.                                                                                                                                                                      | `apps/store` _(planned — spikes/PoC track)_; `apps/com` _(planned — production track)_; external: `PabloFMM/numinia-digital-goods-data` (JSON + binaries, fetched at build, validated with zod) |

The **interpretant** — the new sign produced in each user — is not a directory: it is the citizen's session, their character, their progression. The platform succeeds when using it produces that interpretant.

## c) Contradictions, gaps, and ambiguities found

### Between the governance documents and reality

1. **CLAUDE.md, DECISIONS.md, TODO.md do not exist** in this workspace. Instruction 1 orders me to read them first and MISSION-000's DoD requires updating `TODO.md`; neither is possible today. Either they live in another repo/location I was not given, or they are yet to be written.
2. **`docs/seminal/` vs `docs/seminal-documents/`** — instruction 1 names the former; the corpus lives at the latter, _inside the condemned legacy repo_. Rule 9 forbids touching the legacy repo, so the seminal docs need a sanctioned home in the rebuild repo (copy wholesale, per the corpus README's "replaced wholesale" rule).
3. **The rebuild has no repository.** `numinia-platform/` is not a git repo. MISSION-000 requires CI green on `main` and clean-clone reproducibility — impossible without deciding where the monorepo lives.

### Between MISSION-000 and the legacy/seminal corpus

4. **Locales: 5 vs 7.** MISSION-000 mandates 5 UI locales (`en`, `ja`, `es`, `ko`, `pt-br`); the legacy platform shipped 7 (EN, JA, ES, KO, ZH, PT, DE). I will treat 5 as the decision unless told otherwise; ZH and DE content will be dropped.
5. **"Both apps scaffolded"** — MISSION-000 names only `apps/store`. The `com` track implies a second app (`apps/com`?), but its name, domain, and purpose are nowhere specified.
6. **The 27 existing domain type files** are referenced as a known risk ("location unknown — ask Pablo before recreating anything"). Nothing resembling them exists in this workspace. I will not recreate a single type until you point me to them or confirm they are lost.
7. **"Hyperfy Session Zero infrastructure — never touch"** (Rule 9). It is not in this workspace; I need to know where it lives so I can guarantee I never touch it (and so the SIWE/session work doesn't collide with it).

### Inside the seminal corpus (domain contradictions that block `packages/domain` constants)

8. **Five Oracles vs four.** "Founded 2020 by five Oracles" (legacy CLAUDE.md, RPG manual: "cinco Oráculos", "La Quinta Forma"), but _Numinia Brand and Culture_ lists only **four** named Oracles, and _Platform Role System v2_ caps the Oracle rank at **max 4**. The domain model needs one truth (is the cap 4 or 5? is the 5th seat vacant by design?).
9. **Sentinels' Archangel houses.** _Role structure_ (English): Archangels = **Healers + Guides**. RPG manual (Spanish, later): Arcángeles = **Sanadores (Healers) + Exploradores (Explorers)**. Same house, two different names — and "Explorer" also collides with the Explorer archetype.
10. **Exegetes' Erudite houses order.** _Role structure_: B.1 Thaumaturges, B.2 Hierophants. Manual: B.1 Hierofantes, B.2 Taumaturgos. Order matters if house IDs are positional.
11. **Alchemists' Branch A name.** "Artisans" (Role structure) vs "Menestrales" (manual; "Minstrels/Craftsmen"?). Canonical English name needed — same for every branch/house, since code and constants are English and the manual (the richest source) is Spanish. A full canonical EN glossary for the taxonomy does not exist yet.
12. **Faction field-of-development labels.** Welcome doc: Education / **Gamification** / Organization / Art. Manual: Heirs of Eleusis field = "**Proyección narrativa**" (narrative projection — which also collides with the Peirce layer name), Stellar Circle = "Organización". Legacy CLAUDE.md: "Play". One canonical label per faction is needed for the domain constants.
13. **Procurators House A.1 "Legal rabbits" / "Conejos Legales".** Consistent across sources but reads like a literal-translation artifact. Confirm it is intentional flavor before it becomes an immutable constant in five locales.
14. **Gender-restricted positions.** Pythia and Anacárquide are "women only"; Corredor del Velo and Oniromante "men only" (manual). Does the platform's domain model encode this restriction, soften it (narrative flavor only), or omit it? This has product, inclusivity, and legal (Spanish law/GDPR-adjacent equality) implications.
15. **Dark Council / Lunar Coven times disagree**: 10:00–12:00 UTC+1 (_Epistemic relations_) vs 22:00–00:00 (_Welcome_, _Brand & Culture_). Only matters if the platform surfaces the ritual calendar; flagging for the record.
16. **MISSION-000's "humor" constants** — the manual defines 4 humors with rich attributes (characteristics pairs, hours, elements, organs, conducts). The acceptance criterion only demands the constants exist with 5 locales; the depth to encode (full attribute set vs names) is unspecified.
17. **Competences: 9 total** (3 groups × 3), each tied to guild/faction/species triads. Consistent across sources — no conflict, recorded as settled.

### Process ambiguities

18. **Vercel or Cloudflare** — MISSION-000 says "Vercel/Cloudflare". One must be chosen for the empty-page deploy (and it constrains the Astro adapter).
19. **Data repo write-path** — MISSION-000's data spike is read-only (fetch + zod validate at build). Fine for Phase 0; noting that the legacy platform _wrote_ to the data repo (characters, seasons, moderation) and no ADR yet covers how the rebuild will write without a traditional database. Not blocking Phase 0.
20. **Package manager** — Gherkin says `npm ci`/`npm audit`, so npm is assumed (not pnpm/bun, despite Turborepo convention). Assumed settled by the Gherkin; say so if not.

## d) Decisions needed from the Oracle before Phase 0 can complete

Scored 1–10 by how hard they block me (10 = cannot start / cannot finish Phase 0 at all).

| #   | Decision                                                                                                                                                                                         | Blocks                                                                               | Score  |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ | ------ |
| D1  | **Where are DECISIONS.md (ADR-001–010), TODO.md, and the constitution CLAUDE.md?** Provide them, or confirm I must draft them for your approval.                                                 | Everything: I must not relitigate ADRs I cannot read; DoD requires updating TODO.md. | **10** |
| D2  | **Where are the 27 existing domain type files?** Or explicit permission to model `packages/domain` from the seminal corpus alone.                                                                | `packages/domain`, the soul of the repo.                                             | **10** |
| D3  | **Repository location & bootstrap** — is `numinia-platform/` to be `git init`-ed as the monorepo root (with the legacy clone moved out/ignored), or does a remote repo already exist?            | CI on `main`, clean-clone scenario.                                                  | **9**  |
| D4  | **Canonical English glossary for the full taxonomy** (all branches/houses per §c.9–13, faction field labels, and the Oracle count 4 vs 5). I can draft it as an ADR from the corpus; you ratify. | Domain constants + 5-locale i18n; wrong guesses cost weeks by your own warning.      | **8**  |
| D5  | **The second app** — name and purpose of the `com`-track app ("both apps scaffolded").                                                                                                           | Monorepo scaffold layout, i18n routing scenario scope.                               | **7**  |
| D6  | **Deploy target: Vercel or Cloudflare** (pick one for Phase 0).                                                                                                                                  | Empty-page deploy + Astro adapter choice.                                            | **6**  |
| D7  | **Gender-restricted positions** (§c.14): encode, soften, or omit in the domain model.                                                                                                            | Position constants schema.                                                           | **5**  |
| D8  | **Locale set = exactly {en, ja, es, ko, pt-br}?** Confirm dropping ZH/DE.                                                                                                                        | i18n scenario, domain locale type.                                                   | **4**  |
| D9  | **Where does the Hyperfy Session Zero infrastructure live**, so the never-touch guarantee is verifiable.                                                                                         | Nothing in Phase 0 directly; safety guarantee.                                       | **3**  |
| D10 | **Seminal docs home** — confirm copying `docs/seminal-documents/` wholesale into the rebuild repo as `docs/seminal/`.                                                                            | Rule 1 in every future session.                                                      | **3**  |
| D11 | **Humor/archetype constant depth** (§c.16): names+locales only, or full attribute sets in Phase 0.                                                                                               | Size of the 100%-coverage surface.                                                   | **2**  |

**Recommended unblocking path:** answer D1–D3 (one message suffices); for D4 authorize me to draft the glossary ADR for your ratification; defaults I would take if you say "proceed with defaults": D5 `apps/com`, D6 Vercel, D7 soften to narrative flavor (no hard restriction in the model), D8 confirm 5, D11 names+locales only in Phase 0.

---

## e) Oracle resolutions (2026-08-14) and governance-document audit

The Oracle answered blockers D1–D3 and resolved the domain contradictions. Recorded here; ADRs 011–013 in `docs/decisions/` formalize them.

### Blockers resolved

- **D1 — Governance docs**: `CLAUDE.md` (constitution v0.2.0), `DECISIONS.md` (ADR-001–010, accepted, not to be relitigated), `TODO.md`, `docs/numinia-rebuild-plan.md`, `missions/Mission_Template_v0_2_0.md`, and `docs/seminal/` (7 documents, self-contained copies) now exist at the repo root. All read in full. **The legacy repository is off-limits for reading and writing from this point forward**; it is git-ignored.
- **D2 — The 27 domain type files**: located in an ephemeral, uncommitted sandbox from the 2026-04-03 session. Decision: **do not recreate blindly, do not treat as canon**. The domain model will be regenerated from `docs/seminal/` using the resolutions below. If recovered, originals go to `docs/reference/domain-v0.1/` as diff target only.
- **D3 — Repository**: `git init` executed at `numinia-platform/`, branch `main`, `.gitignore` added before the first commit. No GitHub remote yet (Oracle decides name/visibility).

### Domain resolutions (canonical source: `docs/seminal/Numinia__El_juego_de_rol__manual_completo_.md`)

1. **Archangel houses = Sanadores/Healers + Exploradores/Explorers.** "Guides" was a trait ("Guía" in the Sentinel trait list) mistaken for a house name in _Role structure_. House id `explorers`, description references the guiding function. → ADR-012.
2. **Four vs five Oracles = category error, not contradiction.** Oracle-as-lore (five founding creators, fixed, Narrative Projection) and Oracle-as-rank (rank level 5, unbounded, Operating System) are separate types; the rank carries **no** cardinality constraint. → ADR-011.
3. **Scholars house order**: Hierofantes (B.1), Taumaturgos (B.2) — manual and constitution already agree; _Role structure_ is superseded on this point.
4. **English glossary**: confirmed as a real gap. `docs/glossary.md` created as the bilingual ES↔EN authority (Spanish canonical, English = code identifier) — **first deliverable of MISSION-000**, frozen before any type file. → ADR-012.
5. **Gender-restricted positions**: recorded as data (optional field mirroring the manual), never branched on in application code; the product decision remains **open** and belongs to the Oracle. → ADR-013 (open question).

### Governance docs vs seminal documents — contradictions found on first full read (flagged, not relitigated)

1. **Session Zero seal names.** Constitution (`CLAUDE.md` §Session Zero) says Threshold of Thought grants "Thought + Knowledge". The seminal _About Session Zero_ is explicit: **Seal of Culture + Seal of Wisdom**. The other three thresholds match. The glossary follows the seminal source; `CLAUDE.md` needs a one-line correction.
2. **Type-file count drift.** `CLAUDE.md` says "18 type files" but its own table lists **19**; `TODO.md` says 14 + 4 = 18. Cosmetic, but the glossary/taxonomy freeze should settle the real number.
3. **Faction field label.** Constitution uses "Gamification" for Heirs of Eleusis' field; seminal sources say "Play" (_Welcome_, prototype of the category) and "Proyección narrativa" (manual). The glossary records all three and proposes one canonical label for the Oracle to ratify.
4. **Missing referenced file.** `Mission_Template_v0_2_0.md` links `./Definition_of_Done_v0.2.0.md`, which does not exist in the repo.
5. **Seminal corpus is now 7 documents.** The legacy corpus had 9: `README.md` (index) and `Platform_Role_System.md` (v2 rank/permission matrix, Oracle cap = 4) were not carried over. Their exclusion is consistent with resolution #2 (unbounded Oracle rank) and with `permission.ts` being the permissions authority — recorded so the omission is known to be deliberate.
6. **Rebuild plan i18n is stale.** `docs/numinia-rebuild-plan.md` (v0.1.0) says "i18n: EN/JA/ES"; superseded by ADR-001 (5 languages). The plan is historical context, not an instruction source.

### Blocking-decision table — status update

| #                         | Status                                                                                                                                |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| D1, D2, D3                | ✅ Resolved (above)                                                                                                                   |
| D4 (glossary)             | 🔨 In progress — `docs/glossary.md` delivered, **awaiting Oracle ratification** (gate before encoding)                                |
| D5 (`apps/com`)           | ✅ Resolved by constitution: `apps/com` = numinia.com, production track                                                               |
| D6 (deploy)               | Constitution says "Vercel or Cloudflare Pages"; still one to pick for the Phase 0 empty-page deploy. Non-blocking until spike.        |
| D7 (gender restrictions)  | ✅ Resolved as data-not-logic; product decision open (ADR-013)                                                                        |
| D8 (locales)              | ✅ Resolved by ADR-001: exactly {es, en, ja, ko, pt-br}; lore es+en                                                                   |
| D9 (Hyperfy Session Zero) | Still unlocated; constitution confirms "never touch, integrate via API in Phase 3". Low urgency.                                      |
| D10 (seminal home)        | ✅ Resolved: `docs/seminal/`, self-contained copies                                                                                   |
| D11 (constant depth)      | Partially resolved by TODO 0.2 ("all fields, i18n" for species; "attribute links" for humors). Will follow TODO wording per constant. |

---

_Current stop point: taxonomy-approval gate. The glossary awaits the Oracle before any type is encoded._
