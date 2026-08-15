# Manual Map — "Numinia. El juego de rol" (canon reference)

> **For humans.** The complete map of the RPG manual (docs/seminal/, 4,668 lines): chapter index, hard-fact registry, named places, and where the platform's domain model diverges from the text.
>
> **Epistemic value.** Ends "grep and hope": any session can locate canon by line number and knows exactly which platform concepts are manual-canon and which are platform inventions.
> **Pragmatic value.** Source for lore copy, portal/place data, future Codex features, and provenance honesty. Divergences listed here need Oracle rulings before "fixing" either side.
> **In the system.** Observes: the seminal corpus. Regulates: lore-touching code and copy. Coupled to: packages/domain, docs/glossary.md, CLAUDE.md.
>
> _Reference, produced by full read 2026-08-16 (night watch). Line numbers are approximate anchors into docs/seminal/Numinia__El_juego_de_rol__manual_completo_.md._

## Chapter index

| Line | Section                                                                                                                                                                                                         |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | Introducción — «Los ecos de una ciudad virtual» (Rima)                                                                                                                                                          |
| 44   | Cap. 1 — Bienvenidos a Numinia                                                                                                                                                                                  |
| 103  | Cap. 2 — Historia y leyendas (frag. 1 Historia · 2 Génesis de los Khepris · 3 La Sombra de Athanasius · 4 La Edad Oscura · 5 Las tres grandes fuerzas · 7 Los Sueños de Steiner — **no hay frag. 6**)           |
| 541  | Cap. 3 — Creación del personaje (identidad 553 · especie 706 · **posiciones 784–1455** · características 1458 · psicología 1541 · lingüística 1732 · límites y flujos 1829 · prestigio 1917 · anexo ficha 1977) |
| 1989 | Cap. 4 — Sistema de juego (sistema Numen 2012 · fases 2030 · cocreación 2087 · rumorología 2130 · Heterocósmica 2183 · Propp 2239 · tiradas 2350 · combate 2458)                                                |
| 2516 | Cap. 5 — Geografía y cultura (geografía 2526 · gobierno 2773 · escuelas 2903 · calendario 2990 · agrupaciones 3117)                                                                                             |
| 3207 | Cap. 6 — Inventario y bestiario (bestiario 3228 · antagonistas 3445 · reliquias 3547 · armas 3931)                                                                                                              |
| 4155 | Cap. 7 — Construyendo la aventura (plantilla de fases 4174 · notas DJ 4339 · «El espejo roto» 4388)                                                                                                             |

## Hard-fact registry

**Génesis.** Holberins (científico visionario, «presuntamente danés», fundador del Centro de Investigación Sigma) + 4 iniciados = los Cinco Iniciados. Numinia fundada en **1920** como tablero de juego gigante en el **Complejo Bildung, Friburgo**. Principios: armonía cósmica, ecuanimidad, curiosidad. Traidores: **Crowley** (Thelema) y **Sebottendorf** (Thule) → incendio del 31-12-1920. Holberins proyecta la ciudad a los **Registros Akáshicos** usando el Codex Hermopolitanus de **G. W. Athanasius**. Máquina de engranajes: microcosmos 7 dientes · atanor 97 · macrocosmos 18.817 (iteración 2x²−1); el escarabajo Khepri la impulsa a perpetuidad. **2020**: el geofísico **Alexander Reis** detecta la anomalía en la tumba de Petosiris (Egipto); **cinco Oráculos** abren la brecha; hallan **55 Khepris «los Primordiales»**. Eras: Precinérea → Oscura (siglo en el Akasha; Ingenieros Negros, Cronotecarios, Cartógrafos del Viento, Armonautas, Lapidarios de Sal-Inferior…) → Dorada (actual).

**Las tres fuerzas.** **Velo** (membrana psíquica; puntos de Aliento del Velo potencian tiradas psíquicas — Aliento = Percepción) · **Umbral** (fuerza telúrica; puntos de Umbral potencian tiradas físicas; cada Posición trae su reserva propia 2–4 y su Desequilibrio) · **Prisma** (refracción; **Células del Prisma** premian interpretación inspirada y alimentan la Reserva del Prisma del endgame). Reverso oscuro: **Criptaedros** (laberintos del inconsciente colectivo; los navegan los **Ostramires**).

**Distritos** (todas áreas circulares flotantes ancladas al Velo; coordenadas desde la Plaza del Ágora, que flota a 10 m y no pertenece a ninguno): Vitruvian NO (−131,+290, 130 m, ⌀100 km, Hermetistas/educación) · Sycamore NE (+375,+232, **altura oscilante**, «100 m sugerida», ⌀80 km, Neo-Atlantes/arte) · Solomon SO (−247,−221, 70 m, ⌀120 km, Círculo Estelar/organización) · Ouroboros SE (+271,−361, 40 m, ⌀90 km, Herederos de Eleusis/juego). Entradas: **Ruinas de Numinia** (Nimrod, Guardián de las Puertas — acertijo) y **Las Puertas de Numinia** (Senet, Maestro de Juegos; reproducción del Laberinto de Creta). Periferia: Mar de Sílices, Desierto de Antracita, Océano de Lúnacar, Río Virelai, Nivel Delta (Criptocelda R-Δ72 «Ojo Estático»)…

**Identidades.** Especies (5 + mestizaje 1D6, sistema Open D6/OGL): Biomecánicos, Humanitas, Reptilianos, Cyanitas, Espectrales. Gremios 4×2×2 exactamente como el dominio v0.2.0 — incluido «**Conejos** Legales» (l.618, literal; posible errata canonizada) y la doble denominación Menestrales/«Rama de los Artesanos». Facciones: mapeo facción↔distrito↔ámbito confirmado. **Posiciones: 15**, cada una con +1 característica, 6 aptitudes (elige 2), compatibilidades (la incompatible **invalida** la Posición) y reservas propias; **4 restringidas por género**: Pitia (F), Anacárquide (F), Corredor del Velo (M), Oniromante (M) — coincide con ADR-013.

**Mecánica.** 8 características (16 puntos, máx. 5; 1 punto = 1D6). 9 competencias en 3 dominios (6+6+6 puntos, máx. 6; las no asociadas quedan inhabilitadas salvo compra 500 Prestigio). Tiradas: pool de D6, **6 = éxito, 1 = anula un 6**; 3+ seises netos = éxito total; unos sin seises = fracaso con consecuencia. 16 movimientos (2 por característica). Heterocósmica (2D6 → operadores alético/deóntico/epistémico/axiológico) + Marcador de Resonancia (a 4 nodos → Tirada de Evento 1D20 sobre 20 funciones de Propp → Reloj de la Trama; hora 4 = Desequilibrio del Engranaje). Energía = Constitución×4 (<50% → −1D6; 0 → inconsciente; >8 h → muerte). Combate: iniciativa, ataque = reserva Iniciativa + arma (+Fuerza en melé), defensa = Iniciativa con modif. −2D6…+2D6; ataque cooperativo 5+ éxitos destruye. Prestigio: Semillas del Conocimiento (Verde 1…Roja 5); costes 50/100/200/500/1000.

**Calendario.** **13 Ciclos del Velo × 29 días = año de 377 días** (ajuste lunar de los Cronotecarios: lunación forzada a 29,0). Ciclos: Semilla, Prisma, Latido, Umbral, Llama, Vínculo, Laberinto, Sueño, Espejo, Legado, Fractura, Polvo, Retorno. Día 1 Nadir (Concilio Oscuro) · 15 Kairós/Plenilunio (Lunar Coven) · 29 Crepúsculo (13 festividades nombradas). Tétrada = 4 años → Luna de Khepri. Espectro = 52 años lunares → Anamnesis Mayor (los Fragmentarios descienden; se revelan los 7 Nombres Prohibidos).

**Gobierno.** Por distrito: Asamblea Cívica · Consejo de Sabios · Senado Legislativo · Proconsulado (3 cónsules), con nombres propios por distrito. **Consejo de Concordia**: único órgano supra-distrital, 50 delegados rotatorios, custodio del **Decálogo Fundacional**; incluye a los **Vernáculos** (observadores nombrados por los Oráculos: voz sin voto). Órganos gremiales: Tesaurum Verba (Exégetas) · Fábrica de la Segunda Naturaleza (Alquimistas) · Mesa del Juramento Vivo (Procuradores) · **Vigía de las Esquirlas** (Centinelas). Oráculos = **La Quinta Forma**.

**Educación.** **6 Escuelas Ontológicas** (Materia Invisible · Formas Emergentes · Tiempo Fractal · Lenguajes Primordiales · Simbiosis Extendida · Umbral Anímico), cada una con su Academia; **Academia Lemuria es la Academia global** por encima de todas.

**Bestiario.** Desgarraformas · Umbrílego (+Mayor) · Thámakar · Dragón de Voluta · Ostramir · Guardián Espectral · Esfinge Tipográfica. Antagonistas: Ferracitas, Neolapidarios, Primos del Horizonte. 33 reliquias ligadas a Posiciones; 8 armas ligadas a características (Eclipse Mnémico, Némesis Líquida, Lágrimas Errantes, Filo de Atlas, Fragmento de Khaos, Vortex de la Ruina, Mandíbula del Sol, Muro Errante).

## Named places by district (portals cross-check)

- **Vitruvian**: Sociedad Histórica (Archivos Akáshicos, Museo Histórico; catacumbas = sede del Archivo Summa) · Biblioteca Atlantis (El Abismo; Cámara de Palimpsestos) · Academia Lemuria · **Templo de Khepri** (Tabernáculo, Cámara de los Misterios).
- **Ouroboros**: Taberna Hiperbórea (Trastienda) · Casa de los Acertijos (Salas del Tesoro) · **Los Sueños de Steiner** (8 espacios-enigma; contenido Layer-3 listo en el canon).
- **Solomon**: El Ateneo · El Pritaneo · **La Casa de la Moneda** (nunca «La Ceca») · Torre de los Alquimistas.
- **Sycamore**: Museo Akasha · Multiplex de Numinia (3 salas) · La Forja de Numinia (refundición de los 8 sellos → ciudadanía).
- **No existen en el manual**: Academias Libres · Círculo Escénico · Barrio Antiguo · «Órgano de Defensa» (el órgano centinela es la Vigía de las Esquirlas). Son espacios solo-del-data-repo (anunciados, sin construir).

## Divergences: platform model vs manual (Oracle rulings pending)

1. **D24 — Templo de Khepri**: el data repo (y su mundo oncyber) lo sitúa en Ouroboros; el manual en Vitruvian (l.2598). El mapa sigue al data repo hasta que el Oráculo dictamine.
2. **La escalera de 6 rangos NO es canon del manual.** El texto solo da: ciudadanía (acertijo en las Puertas o refundición de 8 sellos en La Forja), **Vernáculos** (figura de Concordia) y **Oráculos** (cinco). Nómada/Peregrino/Arconte son invención de plataforma — legítima (Fase 2/3), pero su procedencia debe declararse como plataforma, no manual.
3. **Session Zero de plataforma ≠ manual**: los 4 umbrales con nombre, los sellos con nombre, «4 sellos = ciudadano» y el avatar Cyberdog no están en el texto; el manual solo dice 8 sellos → ciudadanía. La fuente de los umbrales es otra pieza del corpus (deck/numinia.com) — documentar procedencia en seal.ts cuando toque.
4. **Facción prototipo / itinerante**: el manual solo dice «cohipónimos, disposición horizontal»; el prototipo (Eleusis) y la itinerancia (Neo-Atlantes) vienen de otra fuente.
5. **Seasons/Adventures/Missions** no existen en el manual; su estructura temporal es el calendario de 13 ciclos (mucho más rico). Oportunidad: alinear la futura Fase 3 con Ciclos/Tétradas.
6. **Terminología inestable en el propio manual**: Prestigio/Semillas ↔ PX ↔ Puntos de Reputación ↔ «Puntos de Trascendencia» (solo l.2347). El Cap. 2 salta del fragmento 5 al 7.
7. Sycamore: la altura **oscila** («No fija», l.2559); los 100 m del dominio son la «sugerida» — correcto pero digno de nota en la ficha del distrito algún día.
