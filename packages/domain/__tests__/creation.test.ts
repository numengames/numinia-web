/**
 * Creation rules (MIS-085 D): competence associations, position mechanics
 * and the affinity resolver — the v0.6.0 manual's hard numbers as facts.
 * Sources: manual ch. 3 fr. 4–5 + annex (associations, point-buy) and the
 * 15 position blocks (bonus attribute, umbral, initiative, compatibility).
 */
import { describe, expect, it } from 'vitest';

import {
  ATTRIBUTE_CREATION_MAX,
  ATTRIBUTE_CREATION_MIN,
  ATTRIBUTE_CREATION_POINTS,
  COMPETENCE_CREATION_CAP,
  COMPETENCE_POOL_PER_SOURCE,
  FACTION_COMPETENCES,
  GUILD_COMPETENCES,
  POSITION_MECHANICS,
  SPECIES_COMPETENCES,
} from '../src/constants/creation.js';
import { enabledCompetences, positionAffinity } from '../src/resolvers/creation.js';
import { COMPETENCE_IDS } from '../src/types/competence.js';
import { FACTION_IDS } from '../src/types/faction.js';
import { GUILD_IDS } from '../src/types/guild.js';
import { POSITION_IDS } from '../src/types/position.js';
import { SPECIES_IDS } from '../src/types/species.js';

describe('creation constants', () => {
  it('pins the manual point-buy numbers', () => {
    expect(ATTRIBUTE_CREATION_POINTS).toBe(16);
    expect(ATTRIBUTE_CREATION_MIN).toBe(1);
    expect(ATTRIBUTE_CREATION_MAX).toBe(5);
    expect(COMPETENCE_POOL_PER_SOURCE).toBe(6);
    expect(COMPETENCE_CREATION_CAP).toBe(6);
  });

  it('associates exactly three distinct valid competences to every guild, faction and species', () => {
    const tables = [
      { ids: GUILD_IDS, table: GUILD_COMPETENCES },
      { ids: FACTION_IDS, table: FACTION_COMPETENCES },
      { ids: SPECIES_IDS, table: SPECIES_COMPETENCES },
    ] as const;
    for (const { ids, table } of tables) {
      expect(Object.keys(table).sort()).toEqual([...ids].sort());
      for (const triad of Object.values(table)) {
        expect(triad).toHaveLength(3);
        expect(new Set(triad).size).toBe(3);
        for (const id of triad) expect(COMPETENCE_IDS).toContain(id);
      }
    }
  });

  it('gives every position its mechanics with manual-bounded values', () => {
    expect(Object.keys(POSITION_MECHANICS).sort()).toEqual([...POSITION_IDS].sort());
    for (const mechanics of Object.values(POSITION_MECHANICS)) {
      expect(mechanics.initialUmbral).toBeGreaterThanOrEqual(2);
      expect(mechanics.initialUmbral).toBeLessThanOrEqual(4);
      expect(mechanics.initiative).toBeGreaterThanOrEqual(1);
      expect(mechanics.initiative).toBeLessThanOrEqual(4);
      // Affinity: guilds and factions are fully enumerated (4 tiers);
      // species and archetypes list 4 and the rest are neutral.
      expect(new Set(mechanics.affinity.guilds).size).toBe(4);
      expect(new Set(mechanics.affinity.factions).size).toBe(4);
      expect(new Set(mechanics.affinity.species).size).toBe(4);
      expect(new Set(mechanics.affinity.archetypes).size).toBe(4);
    }
  });

  it('pins spot-checked position mechanics against the manual', () => {
    const guardian = POSITION_MECHANICS['guardian-of-the-gates'];
    expect(guardian.bonusAttribute).toBe('constitution');
    expect(guardian.initialUmbral).toBe(4);
    expect(guardian.initiative).toBe(2);
    const legionary = POSITION_MECHANICS['legionary'];
    expect(legionary.bonusAttribute).toBe('strength');
    expect(legionary.initiative).toBe(4);
    // "Intelecto" (manual line 6045) is not one of the eight — recorded as
    // intelligence, provenance divergence documented in the constant.
    expect(POSITION_MECHANICS['ethnarch'].bonusAttribute).toBe('intelligence');
  });
});

describe('enabledCompetences', () => {
  it('unions the triads of guild, faction and species', () => {
    const enabled = enabledCompetences({
      guildId: 'alchemists',
      factionId: 'neo-atlantists',
      speciesId: 'biomechanical',
    });
    // Alchemists: technomancy, advanced-forging, luminous-projection
    // Neo-Atlantists: technomancy, chronomancy, advanced-forging
    // Biomechanical: technomancy, advanced-forging, virtual-architecture
    expect([...enabled].sort()).toEqual(
      [
        'advanced-forging',
        'chronomancy',
        'luminous-projection',
        'technomancy',
        'virtual-architecture',
      ].sort(),
    );
  });

  it('treats missing identity axes as contributing nothing', () => {
    expect(enabledCompetences({}).size).toBe(0);
    const onlyGuild = enabledCompetences({ guildId: 'sentinels' });
    expect([...onlyGuild].sort()).toEqual(
      ['defensive-networks', 'luminous-projection', 'neural-vision'].sort(),
    );
  });
});

describe('positionAffinity', () => {
  it('scores preferred 2, compatible 1, neutral 0 and sums across axes', () => {
    // Guardián: G sentinels(pref) F hermeticists(pref) E spectral(pref) A explorer(pref)
    const full = positionAffinity('guardian-of-the-gates', {
      guildId: 'sentinels',
      factionId: 'hermeticists',
      speciesId: 'spectral',
      archetypeId: 'explorer',
    });
    expect(full).toEqual({ compatible: true, points: 8 });
    const mixed = positionAffinity('guardian-of-the-gates', {
      guildId: 'procurators', // compatible → 1
      factionId: 'neo-atlantists', // neutral → 0
      speciesId: 'humanitas', // neutral → 0
      archetypeId: 'caregiver', // compatible → 1
    });
    expect(mixed).toEqual({ compatible: true, points: 2 });
  });

  it('treats unlisted species and archetypes as neutral', () => {
    // Guardián's species tuple omits reptilian (the manual lists only 4).
    const unlisted = positionAffinity('guardian-of-the-gates', {
      guildId: 'sentinels',
      speciesId: 'reptilian',
      archetypeId: 'lover',
    });
    expect(unlisted).toEqual({ compatible: true, points: 2 });
  });

  it('invalidates the position on any incompatible axis', () => {
    const incompatible = positionAffinity('guardian-of-the-gates', {
      guildId: 'alchemists', // incompatible tier
      factionId: 'hermeticists',
    });
    expect(incompatible).toEqual({ compatible: false, points: 0 });
  });

  it('leaves undecided axes out of the sum', () => {
    expect(positionAffinity('pythia', {})).toEqual({ compatible: true, points: 0 });
    expect(positionAffinity('pythia', { guildId: 'exegetes' })).toEqual({
      compatible: true,
      points: 2,
    });
  });
});
