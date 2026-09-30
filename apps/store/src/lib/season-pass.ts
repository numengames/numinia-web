/**
 * The season pass on sale, read from its record in the archive:
 * the `goods:` block in the header of operations/OPS-016-season-pass-the-offer.md
 * (numinia-archive). STD-033 PAY-003: "Sites read the price from that record."
 * Nothing in this site states a price.
 *
 * Same two-source pattern as the lore and the Summa: scripts/fetch-lore.mjs
 * writes the real record into the gitignored apps/store/.lore/offers/ on a
 * deploy; hermetic/CI builds (DATA_SOURCE=fixture) use the committed copy in
 * fixtures/offers/. A record that breaks shape stops the build.
 */

import { parse } from 'yaml';
import { z } from 'zod';

const OFFER_FILE = 'OPS-016-season-pass-the-offer.md';
export const SEASON_ONE_PASS_ID = 'season-001-pass';

const GoodSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  kind: z.string().min(1),
  sentence: z.string().min(1),
  delivers: z.string().min(1),
  amounts: z.array(z.number().positive()).min(1),
  intervals: z.array(z.string()).min(1),
  state: z.string().min(1),
  link: z.string().default(''),
});

const HeaderSchema = z.object({ goods: z.array(GoodSchema).min(1) });

export interface PassGood {
  readonly id: string;
  readonly name: string;
  readonly sentence: string;
  readonly delivers: string;
  /** Price with VAT, in EUR, exactly as the record gives it. */
  readonly priceEur: number;
  readonly state: string;
  readonly link: string;
}

export class OfferRecordError extends Error {
  constructor(message: string) {
    super(`${OFFER_FILE}: ${message}`);
    this.name = 'OfferRecordError';
  }
}

/** The goods of an offer record, from its Markdown. Throws on any broken shape. */
export function parseOfferRecord(markdown: string): readonly PassGood[] {
  const header = /^---\s*\n([\s\S]*?)\n---\s*\n/.exec(markdown)?.[1];
  if (header === undefined) throw new OfferRecordError('no header');
  const parsed = HeaderSchema.safeParse(parse(header));
  if (!parsed.success) {
    throw new OfferRecordError(
      parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; '),
    );
  }
  return parsed.data.goods.map((good) => ({
    id: good.id,
    name: good.name,
    sentence: good.sentence,
    delivers: good.delivers,
    priceEur: good.amounts[0] as number,
    state: good.state,
    link: good.link,
  }));
}

/**
 * Payable means a payment link exists AND the record says so: `on sale`, or
 * `test` while the whole path is walked in the processor's test mode
 * (PRO-020 step 7).
 */
export function onSale(good: PassGood): boolean {
  return (good.state === 'on sale' || good.state === 'test') && /^https:\/\//.test(good.link);
}

/** A processor test link charges nothing; the page says so beside the button. */
export function isTestLink(good: PassGood): boolean {
  return good.state === 'test' || /^https:\/\/buy\.stripe\.com\/test_/.test(good.link);
}

/** The price as a reader of that locale writes euros. */
export function formatEur(amount: number, locale: string): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR' }).format(amount);
}

/** One good by id, or a build-stopping error naming it. */
export function pickGood(goods: readonly PassGood[], id: string): PassGood {
  const good = goods.find((candidate) => candidate.id === id);
  if (!good) throw new OfferRecordError(`no good "${id}"`);
  return good;
}

const realRecords = import.meta.glob('../../.lore/offers/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;
const fixtureRecords = import.meta.glob('../../fixtures/offers/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const useFixture = (): boolean => process.env.DATA_SOURCE === 'fixture';

/**
 * The record's text: the fetched one on a deploy, the committed copy on a
 * hermetic build or when the fetch left nothing. Pure, so both paths are tested.
 */
export function pickRecordText(
  real: Record<string, string>,
  fixture: Record<string, string>,
  fixtureOnly: boolean,
): string {
  const find = (files: Record<string, string>): string | undefined =>
    Object.entries(files).find(([path]) => path.endsWith(`/${OFFER_FILE}`))?.[1];
  const text = (fixtureOnly ? undefined : find(real)) ?? find(fixture);
  if (text === undefined) throw new OfferRecordError('not found, fetched or committed');
  return text;
}

/** The Season I pass, read from the live record when fetched, else the committed copy. */
export function loadSeasonPass(): PassGood {
  return pickGood(
    parseOfferRecord(pickRecordText(realRecords, fixtureRecords, useFixture())),
    SEASON_ONE_PASS_ID,
  );
}
