/**
 * Creation rule facts (MIS-085 D) — extracted verbatim-faithful from the
 * v0.6.0 manual, ch. 3 fr. 4–5 + annex + the 15 position blocks. Numbers
 * and id associations only: rule prose stays in numinia-lore (ADR-020).
 * Known divergences are catalogued in docs/reference/sheet-rules-findings.md
 * and must be resolved by the Oracle, not silently fixed here.
 */

import type { CompetenceTriad, PositionMechanics } from '../types/creation.js';
import type { FactionId } from '../types/faction.js';
import type { GuildId } from '../types/guild.js';
import type { PositionId } from '../types/position.js';
import type { SpeciesId } from '../types/species.js';

/** 16 points across the eight attributes (manual 6204). */
export const ATTRIBUTE_CREATION_POINTS = 16;
/** Every attribute starts with at least 1 (manual 6208). */
export const ATTRIBUTE_CREATION_MIN = 1;
/** No attribute may exceed 5 at creation (manual 6209). */
export const ATTRIBUTE_CREATION_MAX = 5;
/** Guild, faction and species each grant 6 points (manual 6353, 6384). */
export const COMPETENCE_POOL_PER_SOURCE = 6;
/** Per-competence cap at creation (manual 6355). The PRINTED sheet draws
 * only five gear pips — divergence #1 for the Oracle. */
export const COMPETENCE_CREATION_CAP = 6;

/** Manual 6329–6338. */
export const GUILD_COMPETENCES: Readonly<Record<GuildId, CompetenceTriad>> = {
  alchemists: ['technomancy', 'advanced-forging', 'luminous-projection'],
  exegetes: ['decoding', 'cryptology', 'chronomancy'],
  procurators: ['virtual-architecture', 'neural-vision', 'cryptology'],
  sentinels: ['defensive-networks', 'luminous-projection', 'neural-vision'],
};

/** Manual 6341–6350. */
export const FACTION_COMPETENCES: Readonly<Record<FactionId, CompetenceTriad>> = {
  hermeticists: ['decoding', 'luminous-projection', 'cryptology'],
  'heirs-of-eleusis': ['neural-vision', 'luminous-projection', 'advanced-forging'],
  'stellar-circle': ['neural-vision', 'defensive-networks', 'virtual-architecture'],
  'neo-atlantists': ['technomancy', 'chronomancy', 'advanced-forging'],
};

/** Manual 6373–6381. */
export const SPECIES_COMPETENCES: Readonly<Record<SpeciesId, CompetenceTriad>> = {
  biomechanical: ['technomancy', 'advanced-forging', 'virtual-architecture'],
  humanitas: ['neural-vision', 'luminous-projection', 'defensive-networks'],
  reptilian: ['neural-vision', 'defensive-networks', 'cryptology'],
  cyanite: ['technomancy', 'decoding', 'virtual-architecture'],
  spectral: ['decoding', 'luminous-projection', 'chronomancy'],
};

/**
 * Per-position mechanics from the 15 position blocks. Affinity tiers are
 * ordered [preferred, compatible, neutral, incompatible]; unlisted species
 * and archetypes are neutral (manual 4503).
 */
export const POSITION_MECHANICS: Readonly<Record<PositionId, PositionMechanics>> = {
  'guardian-of-the-gates': {
    bonusAttribute: 'constitution',
    initialUmbral: 4,
    initiative: 2,
    affinity: {
      guilds: ['sentinels', 'procurators', 'exegetes', 'alchemists'],
      factions: ['hermeticists', 'stellar-circle', 'neo-atlantists', 'heirs-of-eleusis'],
      species: ['spectral', 'cyanite', 'humanitas', 'biomechanical'],
      archetypes: ['explorer', 'caregiver', 'sage', 'destroyer'],
    },
  },
  pythia: {
    bonusAttribute: 'perception',
    initialUmbral: 2,
    initiative: 1,
    affinity: {
      guilds: ['exegetes', 'alchemists', 'sentinels', 'procurators'],
      factions: ['heirs-of-eleusis', 'neo-atlantists', 'hermeticists', 'stellar-circle'],
      species: ['spectral', 'reptilian', 'humanitas', 'cyanite'],
      archetypes: ['magician', 'creator', 'destroyer', 'jester'],
    },
  },
  ambassador: {
    bonusAttribute: 'charisma',
    initialUmbral: 4,
    initiative: 2,
    affinity: {
      guilds: ['procurators', 'sentinels', 'exegetes', 'alchemists'],
      factions: ['stellar-circle', 'hermeticists', 'neo-atlantists', 'heirs-of-eleusis'],
      species: ['cyanite', 'humanitas', 'reptilian', 'spectral'],
      archetypes: ['ruler', 'caregiver', 'orphan', 'warrior'],
    },
  },
  'game-master': {
    bonusAttribute: 'intelligence',
    initialUmbral: 3,
    initiative: 1,
    affinity: {
      guilds: ['exegetes', 'alchemists', 'procurators', 'sentinels'],
      factions: ['heirs-of-eleusis', 'hermeticists', 'neo-atlantists', 'stellar-circle'],
      species: ['reptilian', 'humanitas', 'spectral', 'biomechanical'],
      archetypes: ['jester', 'magician', 'lover', 'ruler'],
    },
  },
  legionary: {
    bonusAttribute: 'strength',
    initialUmbral: 4,
    initiative: 4,
    affinity: {
      guilds: ['sentinels', 'procurators', 'alchemists', 'exegetes'],
      factions: ['stellar-circle', 'neo-atlantists', 'heirs-of-eleusis', 'hermeticists'],
      species: ['biomechanical', 'humanitas', 'cyanite', 'reptilian'],
      archetypes: ['warrior', 'destroyer', 'caregiver', 'innocent'],
    },
  },
  armonaut: {
    bonusAttribute: 'wisdom',
    initialUmbral: 3,
    initiative: 1,
    affinity: {
      guilds: ['alchemists', 'exegetes', 'sentinels', 'procurators'],
      factions: ['neo-atlantists', 'heirs-of-eleusis', 'hermeticists', 'stellar-circle'],
      species: ['reptilian', 'spectral', 'cyanite', 'biomechanical'],
      archetypes: ['creator', 'jester', 'explorer', 'destroyer'],
    },
  },
  'whisperer-of-machines': {
    bonusAttribute: 'intelligence',
    initialUmbral: 3,
    initiative: 2,
    affinity: {
      guilds: ['alchemists', 'procurators', 'exegetes', 'sentinels'],
      factions: ['stellar-circle', 'hermeticists', 'neo-atlantists', 'heirs-of-eleusis'],
      species: ['biomechanical', 'cyanite', 'humanitas', 'reptilian'],
      archetypes: ['magician', 'orphan', 'creator', 'warrior'],
    },
  },
  'runner-of-the-veil': {
    bonusAttribute: 'movement',
    initialUmbral: 2,
    initiative: 3,
    affinity: {
      guilds: ['sentinels', 'procurators', 'alchemists', 'exegetes'],
      factions: ['stellar-circle', 'hermeticists', 'neo-atlantists', 'heirs-of-eleusis'],
      species: ['humanitas', 'reptilian', 'biomechanical', 'spectral'],
      archetypes: ['explorer', 'caregiver', 'innocent', 'ruler'],
    },
  },
  archivist: {
    bonusAttribute: 'perception',
    initialUmbral: 4,
    initiative: 1,
    affinity: {
      guilds: ['procurators', 'exegetes', 'alchemists', 'sentinels'],
      factions: ['hermeticists', 'stellar-circle', 'neo-atlantists', 'heirs-of-eleusis'],
      species: ['humanitas', 'cyanite', 'spectral', 'biomechanical'],
      archetypes: ['sage', 'magician', 'caregiver', 'warrior'],
    },
  },
  hermeneut: {
    bonusAttribute: 'wisdom',
    initialUmbral: 3,
    initiative: 2,
    affinity: {
      guilds: ['exegetes', 'sentinels', 'procurators', 'alchemists'],
      factions: ['stellar-circle', 'hermeticists', 'heirs-of-eleusis', 'neo-atlantists'],
      species: ['cyanite', 'spectral', 'reptilian', 'biomechanical'],
      archetypes: ['explorer', 'sage', 'magician', 'orphan'],
    },
  },
  'mediator-of-the-prism': {
    bonusAttribute: 'intelligence',
    initialUmbral: 2,
    initiative: 3,
    affinity: {
      guilds: ['procurators', 'alchemists', 'exegetes', 'sentinels'],
      factions: ['hermeticists', 'neo-atlantists', 'stellar-circle', 'heirs-of-eleusis'],
      species: ['cyanite', 'humanitas', 'biomechanical', 'spectral'],
      archetypes: ['creator', 'magician', 'innocent', 'jester'],
    },
  },
  'cartographer-of-the-wind': {
    bonusAttribute: 'perception',
    initialUmbral: 3,
    initiative: 1,
    affinity: {
      guilds: ['sentinels', 'alchemists', 'procurators', 'exegetes'],
      factions: ['neo-atlantists', 'stellar-circle', 'hermeticists', 'heirs-of-eleusis'],
      species: ['biomechanical', 'humanitas', 'cyanite', 'reptilian'],
      archetypes: ['explorer', 'sage', 'caregiver', 'warrior'],
    },
  },
  oneiromancer: {
    bonusAttribute: 'constitution',
    initialUmbral: 2,
    initiative: 2,
    affinity: {
      guilds: ['sentinels', 'exegetes', 'alchemists', 'procurators'],
      factions: ['heirs-of-eleusis', 'neo-atlantists', 'hermeticists', 'stellar-circle'],
      species: ['spectral', 'reptilian', 'cyanite', 'humanitas'],
      archetypes: ['explorer', 'caregiver', 'ruler', 'orphan'],
    },
  },
  anacharchid: {
    bonusAttribute: 'wisdom',
    initialUmbral: 4,
    initiative: 1,
    affinity: {
      guilds: ['exegetes', 'procurators', 'sentinels', 'alchemists'],
      factions: ['stellar-circle', 'hermeticists', 'heirs-of-eleusis', 'neo-atlantists'],
      species: ['humanitas', 'spectral', 'biomechanical', 'cyanite'],
      archetypes: ['innocent', 'lover', 'destroyer', 'explorer'],
    },
  },
  ethnarch: {
    // The manual grants "+1 en Intelecto" (line 6045) — not one of the
    // eight attributes. Recorded as intelligence; divergence #4 in
    // docs/reference/sheet-rules-findings.md awaits the Oracle.
    bonusAttribute: 'intelligence',
    initialUmbral: 3,
    initiative: 1,
    affinity: {
      guilds: ['exegetes', 'procurators', 'alchemists', 'sentinels'],
      factions: ['heirs-of-eleusis', 'hermeticists', 'neo-atlantists', 'stellar-circle'],
      species: ['reptilian', 'cyanite', 'humanitas', 'biomechanical'],
      archetypes: ['sage', 'ruler', 'magician', 'orphan'],
    },
  },
};
