/**
 * i18n foundations (ADR-001, ADR-002).
 *
 * `LocalizedString` has five REQUIRED fields — a constant with a missing
 * translation does not compile. `LoreString` restricts deep narrative content
 * to the two lore languages.
 */

export const SUPPORTED_LOCALES = ['es', 'en', 'ja', 'ko', 'pt-br'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const LORE_LOCALES = ['es', 'en'] as const;
export type LoreLocale = (typeof LORE_LOCALES)[number];

/**
 * Routing default: the unprefixed root serves English; Spanish remains the
 * canonical *content* language (glossary authority).
 */
export const DEFAULT_LOCALE: SupportedLocale = 'en';

export type LocalizedString = Readonly<Record<SupportedLocale, string>>;
export type LoreString = Readonly<Record<LoreLocale, string>>;

export function isSupportedLocale(value: string): value is SupportedLocale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value);
}
