/**
 * «Qué ha pasado» (the panel's summary, cut 8), the pure part: one line of
 * an organization's log said as a sentence — who, what — and the cursor of
 * the next page. Nothing is invented: only what the log has; an act this
 * module does not know is said with a safe generic sentence, never an id.
 * A reader of `DeskHappening`, the answer of GET /api/saldo/happened.
 */

import { fill, shortWallet, type DeskHappening } from './accounts';

/** The words a line is said with (i18n/panel-summary.ts, in the visitor's locale). */
export interface HappenedWords {
  /** One phrase per act the log knows. */
  readonly acts: Readonly<Record<string, string>>;
  /** For an act this site does not know yet. */
  readonly generic: string;
  /** The house acting with no published name. */
  readonly house: string;
  /** `{name}`: the house acting under a published name. */
  readonly houseNamed: string;
}

/** Who did it: «La casa (Nombre)» for the house, else their published name, else a short wallet. */
export function whoOf(line: DeskHappening, words: HappenedWords): string {
  if (line.asHouse) {
    return line.actorName === null ? words.house : fill(words.houseNamed, { name: line.actorName });
  }
  return line.actorName ?? shortWallet(line.actor);
}

/** What was done: the act's phrase, the name it carries (a role's) and who it was to. */
export function whatOf(line: DeskHappening, words: HappenedWords): string {
  const known = Object.entries(words.acts).find(([id]) => id === line.act);
  const name = line.detail?.['name'];
  return [
    known === undefined ? words.generic : known[1],
    name === undefined ? '' : ` · ${name}`,
    line.subject === null ? '' : ` → ${shortWallet(line.subject)}`,
  ].join('');
}

/** The cursor of the page after these lines: the `seq` of the oldest, or null for none. */
export function oldestOf(lines: readonly DeskHappening[]): number | null {
  return lines.at(-1)?.seq ?? null;
}

/** A page appended to what is shown; a line seen twice (the log moved between pages) is kept once. */
export function withPage(
  shown: readonly DeskHappening[],
  page: readonly DeskHappening[],
): DeskHappening[] {
  const seen = new Set(shown.map((line) => line.seq));
  return [...shown, ...page.filter((line) => !seen.has(line.seq))];
}
