# Numinia Domain Glossary — ES ↔ EN

> **Authority file** (ADR-012). The Spanish column is canonical (source: the RPG manual unless noted).
> The English column is the code name; the `id` column is the exact string-literal used in `packages/domain` unions.
> No type file may use a term absent from this glossary. Changing a term requires changing this file first.
>
> Version: 1.0.0 — 2026-08-14 · Status: **RATIFIED by the Oracle** (all 6 ⚠ proposals accepted; the Oracle flagged the taxonomy as revisitable in a future session — changes go through this file first, then code).
> Items marked ⚠️ record the ratified proposal and its alternatives, kept for that future revisit.

Sources: `docs/seminal/Numinia__El_juego_de_rol__manual_completo_.md` (manual, canonical), `About_Session_Zero.md`, `Compendium_of_Attributes_and_Ranks_in_Numinia.md`, `Role_structure_in_the_Numinia_system.md`, `Welcome_to_Numinia.md`, plus resolutions ADR-011/012/013.

---

## 1. Guilds · Gremios

| ES (canonical) | EN | `id` | Notes |
|---|---|---|---|
| Alquimistas | Alchemists | `alchemists` | Imagination, invention, creation |
| Exégetas | Exegetes | `exegetes` | History, theory, narrative |
| Procuradores | Procurators | `procurators` | Management, law, organization |
| Centinelas | Sentinels | `sentinels` | Care, moderation, guidance |

## 2. Branches · Ramas (basic level)

| Guild | ES | EN | `id` |
|---|---|---|---|
| Alchemists | Menestrales | Artisans | `artisans` |
| Alchemists | Ingenieros | Engineers | `engineers` |
| Exegetes | Cronistas | Chroniclers | `chroniclers` |
| Exegetes | Eruditos | Scholars | `scholars` |
| Procurators | Juristas | Jurists | `jurists` |
| Procurators | Síndicos | Syndics | `syndics` |
| Sentinels | Serafines | Seraphim | `seraphim` |
| Sentinels | Arcángeles | Archangels | `archangels` |

## 3. Houses · Casas (subordinate level)

| Branch | ES | EN | `id` | Notes |
|---|---|---|---|---|
| Artisans | Proyectistas | Projectors | `projectors` | ⚠️ Alternative EN: "Project Designers" (*Role structure*). Constitution v0.2.0 uses "Projectors" — proposed canonical. |
| Artisans | Estetas | Aesthetes | `aesthetes` | |
| Engineers | Arquitectos | Architects | `architects` | Digital architecture of Numinia |
| Engineers | Autómatas | Automata | `automata` | Virtual realities & artificial consciousness |
| Chroniclers | Logógrafos | Logographers | `logographers` | Diachronic (histories, legends) |
| Chroniclers | Bardos | Bards | `bards` | Synchronic (news, chronicles) |
| Scholars | Hierofantes | Hierophants | `hierophants` | **B.1** — specialists in distinct fields (ADR-012) |
| Scholars | Taumaturgos | Thaumaturges | `thaumaturges` | **B.2** — shape culture, develop new ideas (ADR-012) |
| Jurists | Conejos Legales | Legal Counsels | `legal-counsels` | ⚠️ ES is wordplay ("Conejos"/rabbits ≈ "Consejos"/counsels). EN "Legal Counsels" (constitution) drops the pun; literal "Legal Rabbits" keeps it. Proposed: keep **Legal Counsels**. |
| Jurists | Heraldos | Heralds | `heralds` | Represent the city in legal/diplomatic matters |
| Syndics | Tesoreros | Treasurers | `treasurers` | Economy |
| Syndics | Concejales | Councillors | `councillors` | Internal organization |
| Seraphim | Capitanes | Captains | `captains` | Supervise & manage structure |
| Seraphim | Guardianes | Guardians | `guardians` | Norm compliance, community conflicts |
| Archangels | Sanadores | Healers | `healers` | Mental care & wellbeing |
| Archangels | Exploradores | Explorers | `explorers` | Guide citizens along the right path ("Guides" was a trait, not a house — ADR-012). Distinct from the `explorer` archetype (§9). |

## 4. Factions · Facciones

| ES (canonical) | EN | `id` | Field of development | District | Notes |
|---|---|---|---|---|---|
| Hermetistas | Hermeticists | `hermeticists` | Educación → **Education** (`education`) | Vitruvian | Seed name: Sociedad Hermética de los Siete Principios |
| Herederos de Eleusis | Heirs of Eleusis | `heirs-of-eleusis` | ⚠️ Juego / Proyección narrativa → **Gamification** (`gamification`) | Ouroboros | Prototype of the category. Sources disagree on the label: "Play" (*Welcome*), "Proyección narrativa" (manual), "Gamification" (constitution). Proposed canonical: **Gamification** — avoids collision with the Peirce layer "Narrative Projection". Seed name: Orden Mística de los Nuevos Cultos Eleusinos |
| Círculo Estelar | Stellar Circle | `stellar-circle` | Organización → **Organization** (`organization`) | Solomon | Seed name: Círculo Estelar del Estudio de la Tabla de Venus |
| Neo-Atlantes | Neo-Atlantists | `neo-atlantists` | Arte → **Art** (`art`) | Sycamore | Itinerant domain (Prototype Theory). Seed name: Confederación Internacional de la Sexta Raza Raíz |

## 5. Districts · Distritos

| ES | EN | `id` | Faction | Height | Notes |
|---|---|---|---|---|---|
| Distrito Vitruvian | Vitruvian District | `vitruvian` | Hermeticists | 130 m | NW · (-131, +290) · Ø 100 km |
| Distrito Ouroboros | Ouroboros District | `ouroboros` | Heirs of Eleusis | 40 m | SE · (+271, -361) · Ø 90 km |
| Distrito Solomon | Solomon District | `solomon` | Stellar Circle | 70 m | SW · (-247, -221) · Ø 120 km |
| Distrito Sycamore | Sycamore District | `sycamore` | Neo-Atlantists | 100 m | NE · (+375, +232) · Ø 80 km |

## 6. Ranks · Rangos

| Level | ES | EN | `id` | Trigger (per seminal corpus) |
|:---:|---|---|---|---|
| 0 | Nómada | Nomad | `nomad` | Registered by the system (Akashic Records), no guild/faction |
| 1 | Ciudadano | Citizen | `citizen` | Completes Session Zero, chooses guild + faction |
| 2 | Peregrino | Pilgrim | `pilgrim` | Exchange with Numinia (collaboration or business) |
| 3 | Vernáculo | Vernacular | `vernacular` | Circle of trust of the Oracles |
| 4 | Arconte | Archon | `archon` | Closest circle, high-level attributions |
| 5 | Oráculo | Oracle | `oracle` | Rank only — **unbounded count, no cardinality** (ADR-011) |

> "Oráculo" also names the **five founding creators** (Oracle-as-lore, Narrative Projection). Separate concept, never encoded in `rank.ts` (ADR-011).

## 7. Attributes · Características

| Group | ES | EN | `id` |
|---|---|---|---|
| Física / Physical | Fuerza | Strength | `strength` |
| Física / Physical | Movimiento | Movement | `movement` |
| Física / Physical | Tamaño | Size | `size` |
| Física / Physical | Constitución | Constitution | `constitution` |
| Psíquica / Psychic | Inteligencia | Intelligence | `intelligence` |
| Psíquica / Psychic | Sabiduría | Wisdom | `wisdom` |
| Psíquica / Psychic | Percepción | Perception | `perception` |
| Psíquica / Psychic | Carisma | Charisma | `charisma` |

## 8. Competences · Competencias (3 domains × 3)

| Domain (ES → EN, `id`) | ES | EN | `id` |
|---|---|---|---|
| Ingeniería y Construcción → Engineering & Construction (`engineering-construction`) | Tecnomancia | Technomancy | `technomancy` |
| | Forja Avanzada | Advanced Forging | `advanced-forging` |
| | Arquitectura Virtual | Virtual Architecture | `virtual-architecture` |
| Seguridad y Protección → Security & Protection (`security-protection`) | Redes Defensivas | Defensive Networks | `defensive-networks` |
| | Cronomancia | Chronomancy | `chronomancy` |
| | Criptología | Cryptology | `cryptology` |
| Comunicación y Conexión → Communication & Connection (`communication-connection`) | Descodificación | Decoding | `decoding` |
| | Visión Neural | Neural Vision | `neural-vision` |
| | Proyección Lumínica | Luminous Projection | `luminous-projection` |

## 9. Archetypes · Arquetipos (12, Pearson/Jung)

| ES | EN | `id` | ES | EN | `id` |
|---|---|---|---|---|---|
| El Inocente | Innocent | `innocent` | El Amante | Lover | `lover` |
| El Huérfano | Orphan | `orphan` | El Creador | Creator | `creator` |
| El Guerrero | Warrior | `warrior` | El Gobernante | Ruler | `ruler` |
| El Cuidador | Caregiver | `caregiver` | El Mago | Magician | `magician` |
| El Explorador | Explorer | `explorer` | El Sabio | Sage | `sage` |
| El Destructor | Destroyer | `destroyer` | El Bufón | Jester | `jester` |

> Note: archetype `explorer` (singular) vs house `explorers` (plural) are distinct ids by design; validators must not conflate them.

## 10. Humors · Humores (4)

| ES | EN | `id` | Temperament (ES → EN) | Linked attributes |
|---|---|---|---|---|
| Sangre | Blood | `blood` | Sanguíneo → Sanguine (dysfunction: Histérico → Hysterical) | movement + charisma |
| Bilis Amarilla | Yellow Bile | `yellow-bile` | Colérico → Choleric (Agresivo → Aggressive) | strength + wisdom |
| Bilis Negra | Black Bile | `black-bile` | Melancólico → Melancholic (Depresivo → Depressive) | constitution + perception |
| Flema | Phlegm | `phlegm` | Flemático → Phlegmatic (Indiferente → Indifferent) | size + intelligence |

## 11. Species · Especies (5)

| ES | EN | `id` | Character | Force field |
|---|---|---|---|---|
| Biomecánicos | Biomechanicals | `biomechanical` | El Racional → The Rational | Tecnología → Technology |
| Humanitas | Humanitas | `humanitas` | El Idealista → The Idealist | Cultura → Culture |
| Reptilianos | Reptilians | `reptilian` | El Ritualista → The Ritualist | Naturaleza → Nature |
| Cyanitas | Cyanites | `cyanite` | El Dialéctico → The Dialectic | Conocimiento → Knowledge |
| Espectrales | Spectrals | `spectral` | El Místico → The Mystic | Éter → Aether |

> Mestizaje → **Hybrid system** (`hybrid`): 1st generation 50/50; 2nd generation 35/35 + 30 (15/15). Modeled as discriminated union per constitution.

## 12. Session Zero: Thresholds · Umbrales (4)

| ES | EN | `id` | Guild | NPC guide |
|---|---|---|---|---|
| Umbral del Pensamiento | Threshold of Thought | `threshold-of-thought` | Exegetes | Lyra |
| Umbral de la Transformación | Threshold of Transformation | `threshold-of-transformation` | Alchemists | Ursa |
| Umbral de la Justicia | Threshold of Justice | `threshold-of-justice` | Procurators | Cepheus |
| Umbral del Valor | Threshold of Valor | `threshold-of-valor` | Sentinels | Pictor |

## 13. Session Zero: Seals · Sellos (8)

| Threshold | ES | EN | `id` | How obtained |
|---|---|---|---|---|
| Thought | Sello de la Cultura | Seal of Culture | `seal-of-culture` | Chest |
| Thought | Sello de la Sabiduría | Seal of Wisdom | `seal-of-wisdom` | Platforming + symbolic payment |
| Transformation | Sello de la Transformación | Seal of Transformation | `seal-of-transformation` | Chest |
| Transformation | Sello de la Creatividad | Seal of Creativity | `seal-of-creativity` | Platforming |
| Justice | Sello de la Justicia | Seal of Justice | `seal-of-justice` | Chest |
| Justice | Sello del Valor | Seal of Valor | `seal-of-valor` | Platforming |
| Valor | Sello de la Protección | Seal of Protection | `seal-of-protection` | Chest |
| Valor | Sello del Equilibrio | Seal of Balance | `seal-of-balance` | Platforming |

> 4 chest-seals → Citizen status. All 8, reforged at La Forja de Numinia (The Forge, Sycamore) → **Cyberdog avatar** (`cyberdog`).
> ⚠️ Constitution §Session Zero says "Thought + Knowledge" for the first threshold; the seminal *About Session Zero* says **Culture + Wisdom** (used here). CLAUDE.md needs a one-line correction.

---

## Supplementary terms (recorded for later type files; same authority rules)

### S1. Forces · Fuerzas (3)

| ES | EN | `id` | Bonus domain |
|---|---|---|---|
| El Velo | The Veil | `velo` | Psychic attributes ("Aliento del Velo" → Breath of the Veil) |
| El Umbral | The Threshold (force) | `umbral` | Physical attributes |
| El Prisma | The Prism | `prisma` | Prism Reserve / interpretation |

> ⚠️ Naming collision: "Umbral" is simultaneously (a) a cosmic force, (b) a per-position resource stat, and (c) the Session Zero portals ("Umbral del Pensamiento"…). Proposal: force ids keep the Spanish loan-words (`velo`, `umbral`, `prisma`) so they never collide with `threshold-of-*` ids; English display names remain Veil/Threshold/Prism.

### S2. Positions · Posiciones (15)

| ES (canonical) | EN | `id` | Lore restriction (ADR-013, data only) |
|---|---|---|---|
| Guardián de las Puertas | Guardian of the Gates | `guardian-of-the-gates` | — |
| Pitia | Pythia | `pythia` | women-only |
| Embajador | Ambassador | `ambassador` | — |
| Maestro de Juego | Game Master | `game-master` | — |
| Legionario del Umbral | Legionary of the Threshold | `legionary` | — |
| Armonauta | Armonaut | `armonaut` | — |
| Susurrador de Máquinas | Whisperer of Machines | `whisperer-of-machines` | — |
| Corredor del Velo | Runner of the Veil | `runner-of-the-veil` | men-only |
| Archivista | Archivist | `archivist` | — |
| Hermeneuta | Hermeneut | `hermeneut` | — |
| Mediador del Prisma | Mediator of the Prism | `mediator-of-the-prism` | — |
| Cartógrafo del Viento | Cartographer of the Wind | `cartographer-of-the-wind` | — |
| Oniromante | Oneiromancer | `oneiromancer` | men-only |
| Anacárquide | Anacharchid | `anacharchid` | women-only |
| Etnarca | Ethnarch | `ethnarch` | — |

### S3. Progression tokens

| ES | EN | `id` | Notes |
|---|---|---|---|
| Células del Prisma | Prism Cells | `prism-cell` | Faction affinity tokens. Colors: Hermeticists pink, Heirs of Eleusis violet, Stellar Circle brown, Neo-Atlantists yellow |
| Semillas del Conocimiento | Seeds of Knowledge | `seed-of-knowledge` | Prestige currency. Colors: green 1 · blue 2 · silver 3 · gold 4 · red 5 |
| Puntos de Prestigio | Prestige Points | `prestige` | Cultural experience, cumulative |
| Puntos de Experiencia | Experience Points | `experience` | Session rewards |
| Aliento del Velo | Breath of the Veil | `breath-of-the-veil` | Psychic reserve stat (= Perception) |
| Umbral (recurso) | Threshold (stat) | `umbral-points` | Psycho-emotional reserve per Position |
| Energía | Energy | `energy` | Vital points (= Constitution × 4) |
| Iniciativa | Initiative | `initiative` | Action order + attack reserve |
| Desequilibrio | Imbalance | `imbalance` | State at 0 Umbral points |

### S4. Linguistic variations · Variaciones lingüísticas

| Category (ES → EN, `id`) | ES | EN | `id` | Bound to |
|---|---|---|---|---|
| Dialecto → Dialect (`dialect`) | Cibernético | Cybernetic | `cybernetic` | Biomechanicals |
| | Epistolar | Epistolary | `epistolary` | Humanitas |
| | Primordial | Primordial | `primordial` | Reptilians |
| | Bizarro | Bizarre | `bizarre` | Cyanites |
| | Profético | Prophetic | `prophetic` | Spectrals |
| Sociolecto → Sociolect (`sociolect`) | Ilustrado | Erudite | `erudite` | Vitruvian |
| | Histrión | Histrionic | `histrionic` | Ouroboros |
| | Profesor | Professorial | `professorial` | Solomon |
| | Místico | Mystic | `mystic` | Sycamore |
| Lingo → Lingo (`lingo`) | Transmutativo | Transmutative | `transmutative` | Alchemists |
| | Mitológico | Mythological | `mythological` | Exegetes |
| | Pragmático | Pragmatic | `pragmatic` | Procurators |
| | Marcial | Martial | `martial` | Sentinels |
| Idiolecto → Idiolect (`idiolect`) | *(free text)* | *(free text)* | — | Per character |

---

## Open items for the Oracle (⚠ summary)

1. §3 — House `projectors`: "Projectors" (constitution) vs "Project Designers" (*Role structure*). **Proposed: Projectors.**
2. §3 — House `legal-counsels`: keep "Legal Counsels" (loses the "Conejos" pun) vs "Legal Rabbits" (keeps it). **Proposed: Legal Counsels.**
3. §4 — Field label for Heirs of Eleusis: **Proposed: Gamification** (`gamification`), noting "Play" and "Proyección narrativa" as lore synonyms.
4. §13 — Confirm CLAUDE.md correction: Threshold of Thought seals = Culture + Wisdom.
5. §S1 — Force ids as Spanish loan-words (`velo`, `umbral`, `prisma`) to avoid the triple "threshold" collision. **Proposed: yes.**
6. §S2 — EN coinages for untranslatable names: "Armonaut" (Armonauta) and "Anacharchid" (Anacárquide). **Proposed as written.**

Once ratified, this file is frozen at v1.0.0 and `packages/domain` encoding begins.
