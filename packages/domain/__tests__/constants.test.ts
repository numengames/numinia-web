import { describe, expect, it } from 'vitest';
import { SUPPORTED_LOCALES, type LocalizedString } from '../src/types/i18n.js';
import { GUILD_IDS, BRANCH_IDS, HOUSE_IDS } from '../src/types/guild.js';
import { FACTION_IDS } from '../src/types/faction.js';
import { DISTRICT_IDS } from '../src/types/district.js';
import { RANKS } from '../src/types/rank.js';
import { SPECIES_IDS } from '../src/types/species.js';
import { COMPETENCE_IDS } from '../src/types/competence.js';
import { ARCHETYPE_IDS } from '../src/types/archetype.js';
import { HUMOR_IDS } from '../src/types/humor.js';
import { SEAL_IDS, THRESHOLD_IDS } from '../src/types/seal.js';
import { GUILDS } from '../src/constants/guilds.js';
import { FACTIONS } from '../src/constants/factions.js';
import { DISTRICTS } from '../src/constants/districts.js';
import { RANK_DEFINITIONS } from '../src/constants/ranks.js';
import { SPECIES } from '../src/constants/species.js';
import { COMPETENCES, COMPETENCE_DOMAINS } from '../src/constants/competences.js';
import { ARCHETYPES } from '../src/constants/archetypes.js';
import { HUMORS } from '../src/constants/humors.js';
import { SEALS, THRESHOLDS } from '../src/constants/seals.js';
import { POSITIONS } from '../src/constants/positions.js';
import { POSITION_IDS } from '../src/types/position.js';

/** MISSION-000 Gherkin: every constant has all five UI locales populated. */
function expectFullyLocalized(context: string, value: LocalizedString): void {
  for (const locale of SUPPORTED_LOCALES) {
    const text = value[locale];
    expect(text, `${context} is missing locale "${locale}"`).toBeTypeOf('string');
    expect(text.trim().length, `${context} has empty locale "${locale}"`).toBeGreaterThan(0);
  }
}

describe('five-locale completeness (MISSION-000 acceptance)', () => {
  it('guilds, branches, and houses are fully localized', () => {
    for (const guild of GUILDS) {
      expectFullyLocalized(`guild ${guild.id} name`, guild.name);
      expectFullyLocalized(`guild ${guild.id} description`, guild.description);
      for (const branch of guild.branches) {
        expectFullyLocalized(`branch ${branch.id} name`, branch.name);
        expectFullyLocalized(`branch ${branch.id} description`, branch.description);
        for (const house of branch.houses) {
          expectFullyLocalized(`house ${house.id} name`, house.name);
          expectFullyLocalized(`house ${house.id} description`, house.description);
        }
      }
    }
  });

  it('factions are fully localized', () => {
    for (const faction of FACTIONS) {
      expectFullyLocalized(`faction ${faction.id} name`, faction.name);
      expectFullyLocalized(`faction ${faction.id} description`, faction.description);
      expect(faction.seedName.es.length).toBeGreaterThan(0);
      expect(faction.seedName.en.length).toBeGreaterThan(0);
    }
  });

  it('districts, ranks, species, competences, archetypes, humors, seals, thresholds are fully localized', () => {
    for (const d of DISTRICTS) {
      expectFullyLocalized(`district ${d.id} name`, d.name);
      expectFullyLocalized(`district ${d.id} description`, d.description);
    }
    for (const r of RANK_DEFINITIONS) {
      expectFullyLocalized(`rank ${r.id} name`, r.name);
      expectFullyLocalized(`rank ${r.id} description`, r.description);
    }
    for (const s of SPECIES) {
      expectFullyLocalized(`species ${s.id} name`, s.name);
      expectFullyLocalized(`species ${s.id} description`, s.description);
      expectFullyLocalized(`species ${s.id} character`, s.character);
      expectFullyLocalized(`species ${s.id} forceField`, s.forceField);
    }
    for (const c of COMPETENCES) {
      expectFullyLocalized(`competence ${c.id} name`, c.name);
      expectFullyLocalized(`competence ${c.id} description`, c.description);
    }
    for (const domain of COMPETENCE_DOMAINS) {
      expectFullyLocalized(`competence domain ${domain.id} name`, domain.name);
    }
    for (const a of ARCHETYPES) {
      expectFullyLocalized(`archetype ${a.id} name`, a.name);
      expectFullyLocalized(`archetype ${a.id} description`, a.description);
    }
    for (const h of HUMORS) {
      expectFullyLocalized(`humor ${h.id} name`, h.name);
      expectFullyLocalized(`humor ${h.id} description`, h.description);
      expectFullyLocalized(`humor ${h.id} temperament`, h.temperament);
    }
    for (const s of SEALS) {
      expectFullyLocalized(`seal ${s.id} name`, s.name);
      expectFullyLocalized(`seal ${s.id} description`, s.description);
    }
    for (const t of THRESHOLDS) {
      expectFullyLocalized(`threshold ${t.id} name`, t.name);
      expectFullyLocalized(`threshold ${t.id} description`, t.description);
    }
  });

  it('positions are fully localized', () => {
    for (const position of POSITIONS) {
      expectFullyLocalized(`position ${position.id} name`, position.name);
      expectFullyLocalized(`position ${position.id} description`, position.description);
    }
  });
});

describe('positions (ADR-013 — lore restrictions as inert data)', () => {
  it('covers the fifteen position ids in manual order', () => {
    expect(POSITIONS.map((p) => p.id)).toEqual([...POSITION_IDS]);
  });

  it('records exactly the four manual gender restrictions, verbatim', () => {
    const restricted = Object.fromEntries(
      POSITIONS.filter((p) => p.loreRestriction).map((p) => [p.id, p.loreRestriction?.gender]),
    );
    expect(restricted).toEqual({
      pythia: 'women-only',
      'runner-of-the-veil': 'men-only',
      oneiromancer: 'men-only',
      anacharchid: 'women-only',
    });
  });
});

describe('structural integrity (glossary as authority, ADR-012)', () => {
  it('covers every id exactly once', () => {
    expect(GUILDS.map((g) => g.id).sort()).toEqual([...GUILD_IDS].sort());
    expect(GUILDS.flatMap((g) => g.branches.map((b) => b.id)).sort()).toEqual(
      [...BRANCH_IDS].sort(),
    );
    expect(
      GUILDS.flatMap((g) => g.branches.flatMap((b) => b.houses.map((h) => h.id))).sort(),
    ).toEqual([...HOUSE_IDS].sort());
    expect(FACTIONS.map((f) => f.id).sort()).toEqual([...FACTION_IDS].sort());
    expect(DISTRICTS.map((d) => d.id).sort()).toEqual([...DISTRICT_IDS].sort());
    expect(RANK_DEFINITIONS.map((r) => r.id)).toEqual([...RANKS]);
    expect(SPECIES.map((s) => s.id).sort()).toEqual([...SPECIES_IDS].sort());
    expect(COMPETENCES.map((c) => c.id).sort()).toEqual([...COMPETENCE_IDS].sort());
    expect(ARCHETYPES.map((a) => a.id).sort()).toEqual([...ARCHETYPE_IDS].sort());
    expect(HUMORS.map((h) => h.id).sort()).toEqual([...HUMOR_IDS].sort());
    expect(SEALS.map((s) => s.id).sort()).toEqual([...SEAL_IDS].sort());
    expect(THRESHOLDS.map((t) => t.id).sort()).toEqual([...THRESHOLD_IDS].sort());
  });

  it('guild hierarchy is internally consistent (4×2×2)', () => {
    expect(GUILDS).toHaveLength(4);
    for (const guild of GUILDS) {
      expect(guild.branches).toHaveLength(2);
      for (const branch of guild.branches) {
        expect(branch.guildId).toBe(guild.id);
        expect(branch.houses).toHaveLength(2);
        for (const house of branch.houses) {
          expect(house.guildId).toBe(guild.id);
          expect(house.branchId).toBe(branch.id);
        }
      }
    }
  });

  it('scholars order is Hierophants B.1, Thaumaturges B.2 (Oracle resolution 3)', () => {
    const exegetes = GUILDS.find((g) => g.id === 'exegetes');
    const scholars = exegetes?.branches.find((b) => b.id === 'scholars');
    expect(scholars?.houses.map((h) => h.id)).toEqual(['hierophants', 'thaumaturges']);
  });

  it('archangel houses are Healers and Explorers, never Guides (Oracle resolution 1)', () => {
    const sentinels = GUILDS.find((g) => g.id === 'sentinels');
    const archangels = sentinels?.branches.find((b) => b.id === 'archangels');
    expect(archangels?.houses.map((h) => h.id)).toEqual(['healers', 'explorers']);
  });

  it('faction ↔ district pairing matches the manual', () => {
    const pairs = Object.fromEntries(FACTIONS.map((f) => [f.id, f.districtId]));
    expect(pairs).toEqual({
      hermeticists: 'vitruvian',
      'heirs-of-eleusis': 'ouroboros',
      'stellar-circle': 'solomon',
      'neo-atlantists': 'sycamore',
    });
    for (const district of DISTRICTS) {
      const faction = FACTIONS.find((f) => f.id === district.factionId);
      expect(faction?.districtId).toBe(district.id);
    }
  });

  it('gamification is the prototype and art is itinerant (Prototype Theory)', () => {
    const roles = Object.fromEntries(FACTIONS.map((f) => [f.field, f.prototypeRole]));
    expect(roles).toEqual({
      gamification: 'prototype',
      education: 'peripheral',
      organization: 'peripheral',
      art: 'itinerant',
    });
  });

  it('rank levels ascend 0..5 with no cardinality metadata (ADR-011)', () => {
    expect(RANK_DEFINITIONS.map((r) => r.level)).toEqual([0, 1, 2, 3, 4, 5]);
    for (const rank of RANK_DEFINITIONS) {
      expect(Object.keys(rank).sort()).toEqual(['description', 'id', 'level', 'name']);
    }
  });

  it('each competence domain holds exactly three competences', () => {
    for (const domain of COMPETENCE_DOMAINS) {
      expect(COMPETENCES.filter((c) => c.domainId === domain.id)).toHaveLength(3);
    }
  });

  it('each guild and faction aligns with exactly three archetypes', () => {
    for (const guildId of GUILD_IDS) {
      expect(ARCHETYPES.filter((a) => a.alignedGuilds.includes(guildId))).toHaveLength(3);
    }
    for (const factionId of FACTION_IDS) {
      expect(ARCHETYPES.filter((a) => a.alignedFactions.includes(factionId))).toHaveLength(3);
    }
  });

  it('humors link one physical + one psychic attribute, per the manual', () => {
    const links = Object.fromEntries(HUMORS.map((h) => [h.id, h.linkedAttributes]));
    expect(links).toEqual({
      blood: ['movement', 'charisma'],
      'yellow-bile': ['strength', 'wisdom'],
      'black-bile': ['constitution', 'perception'],
      phlegm: ['size', 'intelligence'],
    });
  });

  it('each threshold grants one chest seal and one challenge seal', () => {
    for (const threshold of THRESHOLDS) {
      const seals = SEALS.filter((s) => s.thresholdId === threshold.id);
      expect(seals.map((s) => s.obtainedBy).sort()).toEqual(['challenge', 'chest']);
    }
  });

  it('Threshold of Thought grants Culture + Wisdom (seminal source, not the old constitution)', () => {
    const thoughtSeals = SEALS.filter((s) => s.thresholdId === 'threshold-of-thought').map(
      (s) => s.id,
    );
    expect(thoughtSeals.sort()).toEqual(['seal-of-culture', 'seal-of-wisdom']);
  });

  it('district geometry matches the manual (heights, diameters, coordinates)', () => {
    const byId = Object.fromEntries(DISTRICTS.map((d) => [d.id, d]));
    expect(byId['vitruvian']).toMatchObject({
      heightMeters: 130,
      diameterKm: 100,
      coordinates: { x: -131, y: 290 },
    });
    expect(byId['ouroboros']).toMatchObject({
      heightMeters: 40,
      diameterKm: 90,
      coordinates: { x: 271, y: -361 },
    });
    expect(byId['solomon']).toMatchObject({
      heightMeters: 70,
      diameterKm: 120,
      coordinates: { x: -247, y: -221 },
    });
    expect(byId['sycamore']).toMatchObject({
      heightMeters: 100,
      diameterKm: 80,
      coordinates: { x: 375, y: 232 },
    });
  });
});
