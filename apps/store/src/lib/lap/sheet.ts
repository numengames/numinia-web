/**
 * The character sheet as a FILE the player owns (MISSION-008, File Over App
 * + data dignity): a portable Markdown document, exported and imported from
 * the browser — no accounts, no server, no silent storage.
 *
 * Identity fields hold domain ids (locale-independent, validated against
 * @numinia/domain on import); free-text fields stay free. Parsing fails
 * soft: unknown keys are ignored, malformed numbers become 0, unknown ids
 * are dropped — a sheet never explodes, it degrades.
 */

import {
  ARCHETYPES,
  COMPETENCES,
  DISTRICTS,
  FACTIONS,
  GUILDS,
  HUMORS,
  POSITIONS,
  SPECIES,
} from '@numinia/domain';

export const SHEET_FORMAT = 'numinia-sheet/v2';

const IDENTITY_KEYS = [
  'name',
  'player',
  'species',
  'position',
  'guild',
  'branch',
  'house',
  'faction',
  'district',
  'archetype',
  'humor',
  'wallet',
] as const;
const TEXT_KEYS = ['dialect', 'sociolect', 'lingo', 'idiolect', 'weapons', 'relics'] as const;
export const ATTRIBUTE_KEYS = [
  'strength',
  'movement',
  'size',
  'constitution',
  'intelligence',
  'wisdom',
  'perception',
  'charisma',
] as const;
export const VALUE_KEYS = [
  'threshold',
  'veilBreath',
  'initiative',
  'energy',
  'prestige',
  'prisma',
] as const;
const COMPETENCE_KEYS = COMPETENCES.map((competence) => competence.id);

type IdentityKey = (typeof IDENTITY_KEYS)[number];
type TextKey = (typeof TEXT_KEYS)[number];
type AttributeKey = (typeof ATTRIBUTE_KEYS)[number];
type ValueKey = (typeof VALUE_KEYS)[number];

export interface LapSheet {
  identity: Record<IdentityKey, string>;
  text: Record<TextKey, string>;
  attributes: Record<AttributeKey, number>;
  values: Record<ValueKey, number>;
  competences: Record<string, number>;
  notes: string;
}

const record = <K extends string, V>(keys: readonly K[], value: V): Record<K, V> =>
  Object.fromEntries(keys.map((key) => [key, value])) as Record<K, V>;

export function emptySheet(): LapSheet {
  return {
    identity: record(IDENTITY_KEYS, ''),
    text: record(TEXT_KEYS, ''),
    attributes: record(ATTRIBUTE_KEYS, 0),
    values: { ...record(VALUE_KEYS, 0), threshold: 5 },
    competences: record(COMPETENCE_KEYS as readonly string[], 0),
    notes: '',
  };
}

/** Valid domain ids per identity field — unknown ids are dropped on import. */
const DOMAIN_IDS: Partial<Record<IdentityKey, ReadonlySet<string>>> = {
  species: new Set(SPECIES.map((item) => item.id)),
  position: new Set(POSITIONS.map((item) => item.id)),
  guild: new Set(GUILDS.map((item) => item.id)),
  branch: new Set(GUILDS.flatMap((guild) => guild.branches.map((branch) => branch.id))),
  house: new Set(
    GUILDS.flatMap((guild) =>
      guild.branches.flatMap((branch) => branch.houses.map((house) => house.id)),
    ),
  ),
  faction: new Set(FACTIONS.map((item) => item.id)),
  district: new Set(DISTRICTS.map((item) => item.id)),
  archetype: new Set(ARCHETYPES.map((item) => item.id)),
  humor: new Set(HUMORS.map((item) => item.id)),
};

function table(rows: ReadonlyArray<readonly [string, string | number]>): string {
  return ['| field | value |', '| --- | --- |', ...rows.map(([k, v]) => `| ${k} | ${v} |`)].join(
    '\n',
  );
}

export function sheetToMarkdown(sheet: LapSheet): string {
  return [
    '# Numinia — Character Sheet',
    '',
    `> format: ${SHEET_FORMAT}`,
    '',
    '## Identity',
    table(IDENTITY_KEYS.map((key) => [key, sheet.identity[key]])),
    '',
    '## Attributes',
    table(ATTRIBUTE_KEYS.map((key) => [key, sheet.attributes[key]])),
    '',
    '## Values',
    table(VALUE_KEYS.map((key) => [key, sheet.values[key]])),
    '',
    '## Competences',
    table(COMPETENCE_KEYS.map((key) => [key, sheet.competences[key] ?? 0])),
    '',
    '## Profile',
    table(TEXT_KEYS.map((key) => [key, sheet.text[key]])),
    '',
    '## Notes',
    '',
    sheet.notes,
    '',
  ].join('\n');
}

function parseSection(markdown: string, section: string): Record<string, string> {
  const out: Record<string, string> = {};
  let inside = false;
  for (const line of markdown.split('\n')) {
    if (line.startsWith('## ')) {
      inside = line.slice(3).trim() === section;
      continue;
    }
    if (!inside) continue;
    const match = /^\|\s*([^|]+?)\s*\|\s*([^|]*?)\s*\|$/.exec(line);
    if (match && match[1] !== 'field' && !match[1]!.startsWith('---')) {
      out[match[1]!] = match[2]!;
    }
  }
  return out;
}

const toScore = (raw: string | undefined): number => {
  const value = Number.parseInt(raw ?? '', 10);
  return Number.isFinite(value) ? Math.min(99, Math.max(0, value)) : 0;
};

export function sheetFromMarkdown(markdown: string): LapSheet {
  const sheet = emptySheet();
  const identity = parseSection(markdown, 'Identity');
  for (const key of IDENTITY_KEYS) {
    const raw = (identity[key] ?? '').trim();
    const valid = DOMAIN_IDS[key];
    sheet.identity[key] = valid && raw !== '' && !valid.has(raw) ? '' : raw;
  }
  // Absent keys keep their defaults (threshold starts at 5) — a partial
  // file amends the sheet, it never blanks it.
  const attributes = parseSection(markdown, 'Attributes');
  for (const key of ATTRIBUTE_KEYS) {
    if (attributes[key] !== undefined) sheet.attributes[key] = toScore(attributes[key]);
  }
  const values = parseSection(markdown, 'Values');
  for (const key of VALUE_KEYS) {
    if (values[key] !== undefined) sheet.values[key] = toScore(values[key]);
  }
  const competences = parseSection(markdown, 'Competences');
  for (const key of COMPETENCE_KEYS) {
    if (competences[key] !== undefined) sheet.competences[key] = toScore(competences[key]);
  }
  const profile = parseSection(markdown, 'Profile');
  for (const key of TEXT_KEYS) sheet.text[key] = (profile[key] ?? '').trim();
  const notesMatch = /## Notes\n\n?([\s\S]*)$/.exec(markdown);
  sheet.notes = (notesMatch?.[1] ?? '').trim();
  return sheet;
}
