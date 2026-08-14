/**
 * Attributes — four physical + four psychic characteristics (glossary §7).
 * The Veil boosts psychic actions; the Threshold boosts physical ones.
 */

export const PHYSICAL_ATTRIBUTES = ['strength', 'movement', 'size', 'constitution'] as const;
export type PhysicalAttribute = (typeof PHYSICAL_ATTRIBUTES)[number];

export const PSYCHIC_ATTRIBUTES = ['intelligence', 'wisdom', 'perception', 'charisma'] as const;
export type PsychicAttribute = (typeof PSYCHIC_ATTRIBUTES)[number];

export type AttributeId = PhysicalAttribute | PsychicAttribute;

export type AttributeScores = Readonly<Record<AttributeId, number>>;
