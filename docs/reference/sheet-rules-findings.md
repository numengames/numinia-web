# Sheet rules v0.6.0 — extraction findings (MIS-085 D)

> **For the Oracle.** The character-creation rules were extracted from the
> v0.6.0 manual (ch. 3 fr. 1–5, fr. 8, annex) to build the sheet's rules
> engine. These are the gaps and contradictions the manual leaves open.
> The engine implements only what the manual states; each item below is a
> decision that belongs to the author, not to code. Line numbers refer to
> `numinia-lore/seminal/Numinia_Manual_del_juego_de_rol_v0_6_0.md`.
>
> _Reference document (CC-BY-4.0). Related: docs/reference/manual-map.md._

## Implemented as stated (for context)

- Attributes: 16 points, min 1 / max 5 each, 8 attributes (6204–6212).
- Position grants +1 to one attribute, initial Umbral (2–4), Iniciativa
  (1–4) and the Desequilibrio effect (per-position blocks).
- Enabled competences = union of the triads of Gremio + Facción + Especie
  (6329–6381); the rest are disabled; enabled-but-unpointed register 0
  (annex 6705–6710). Pools: 6 + 6 + 6.
- Aptitudes Especiales: two, dice pool = affinity sum over Gremio/Facción/
  Especie/Arquetipo (preferred 2 · compatible 1 · neutral 0 · incompatible
  invalidates; unlisted species/archetypes neutral, 4503). Pool 0–8.
- Aliento del Velo = Percepción (6517). Prestigio blank until Semillas
  (annex 6699).

## Open items — Oracle decisions pending

1. **Competence cap 6 vs 5 gear pips.** Manual 6355 caps a competence at 6
   at creation; the printed sheet (and D of the brief: gears 0–5) draws
   five pips. The platform ships gears 0–5 per the Oracle-signed brief;
   a manual-legal 6 cannot be represented.
2. **Cap per pool or per summed competence?** Pools overlap (e.g. Proyección
   Lumínica in a guild AND a faction triad); the manual does not say whether
   6 caps each pool's spend or the summed value.
3. **Position's +1: before/after point-buy, and may it break 5?** Unstated
   (6204 vs 4466). The platform shows the +1 as a chip, it does not add it.
4. **«Intelecto»** (Etnarca, 6045) is not one of the eight attributes.
   Recorded as Inteligencia in `POSITION_MECHANICS`; needs canon.
5. **Arquetipo is an affinity input but the manual never defines or assigns
   it.** The platform's 12 Jungian archetypes match the 12 names harvested
   from the affinity tables, so the sheet's existing Arquetipo field feeds
   the engine — but the manual owes the chapter.
6. **Mestizos**: affinity tier for a multi-species character is undefined;
   6400 (own competences = ONE main species) contradicts 6391–6397 (points
   split across up to four species); the sheet has a single Especie line.
   The platform models pure species only, matching the sheet.
7. **Iniciativa** is valued for all 15 positions but no rule consumes it
   (grep past ch. 3: narrative uses only). Shown as an initial-value hint.
8. **Tirada de Prisma** is called one of the PJ's three attributes (6418)
   but has no sheet field and derives from Piezas del Conflicto, not
   creation.
9. **«Aprender una nueva Competencia | 500 puntos»** (15488) contradicts
   «las demás… no podrán utilizarse ni desarrollarse en ningún momento del
   juego» (6706).
10. **Prestigio**: 15492 says track two quantities (total + available
    Semillas); the sheet has one field. Seed values (1–5) vs upgrade costs
    (50–1000) are unreconciled.
11. **Estado naming**: cost list says «Inestable» (9045) where the table
    says «Desestabilizado» (8997); Incólume/Disuelto missing from the table.
12. **Armas have no sheet section** although annex 6717 says to record
    weapon parameters; the 3+2 sub-slots of «Reliquias y Objetos» and
    «Tesoros» are unlabeled. The platform keeps them as free text.
13. **Aliento del Velo**: raw Percepción or Percepción + position bonus?
    Matters for Pitia, Archivista, Cartógrafo del Viento.
14. **Branch naming**: «Menestrales» (3705) vs «Rama de los Artesanos»
    (3723); «Conejos Legales» (3821) still reads as a typo for «Consejos
    Legales» (already flagged in the copy audit — not silently fixed).

## Self-score (phase D report, brief §9)

8/10. The engine covers every stated creation rule with tests and the UI
enforces the enabling matrix without destroying imported data (audit, not
amputation). The affinity matrix and mechanics were verified by a second
independent extraction against the manual: 105 position checks + 13
competence triads, zero mismatches. Docked for: mestizaje not modeled
(sheet-faithful but incomplete vs ch. 3) and items 1–3 shipped with a
platform-side interpretation the Oracle has not yet ratified.
