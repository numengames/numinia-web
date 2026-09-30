/**
 * The season pass reads its price from the archive's record (STD-033
 * PAY-003). These tests pin the reader: a broken record stops the build,
 * and nothing is payable unless the record says so AND a link exists.
 */

import { describe, expect, it } from 'vitest';
import {
  formatEur,
  loadSeasonPass,
  OfferRecordError,
  onSale,
  parseOfferRecord,
  pickGood,
  pickRecordText,
  SEASON_ONE_PASS_ID,
  type PassGood,
} from '../season-pass';

const record = (goods: string): string => `---\nid: "OPS-016"\n${goods}\n---\n\n# Body\n`;

const GOOD = `goods:
  - id: season-001-pass
    name: "Season I pass"
    kind: "Season pass"
    sentence: "One sentence."
    delivers: "Eight premium rewards."
    amounts: [9.99]
    intervals: [once]
    state: "not on sale"
    link: ""`;

describe('parseOfferRecord', () => {
  it('reads the good and its price from the header, as the record gives it', () => {
    const [good] = parseOfferRecord(record(GOOD));
    expect(good).toEqual({
      id: 'season-001-pass',
      name: 'Season I pass',
      sentence: 'One sentence.',
      delivers: 'Eight premium rewards.',
      priceEur: 9.99,
      state: 'not on sale',
      link: '',
    });
  });

  it('defaults a missing link to empty', () => {
    const [good] = parseOfferRecord(record(GOOD.replace('    link: ""', '')));
    expect(good!.link).toBe('');
  });

  it('stops the build on a record with no header', () => {
    expect(() => parseOfferRecord('# No header\n')).toThrow(OfferRecordError);
  });

  it('stops the build on a good with no price, naming the field', () => {
    expect(() => parseOfferRecord(record(GOOD.replace('[9.99]', '[]')))).toThrow(/amounts/);
    expect(() => parseOfferRecord(record('goods: []'))).toThrow(/goods/);
  });
});

describe('onSale', () => {
  const base: PassGood = {
    id: 'x',
    name: 'x',
    sentence: 'x',
    delivers: 'x',
    priceEur: 1,
    state: 'not on sale',
    link: '',
  };
  it('needs both the state and an https link', () => {
    expect(onSale(base)).toBe(false);
    expect(onSale({ ...base, state: 'on sale' })).toBe(false);
    expect(onSale({ ...base, link: 'https://buy.stripe.com/x' })).toBe(false);
    expect(onSale({ ...base, state: 'on sale', link: 'http://buy.stripe.com/x' })).toBe(false);
    expect(onSale({ ...base, state: 'on sale', link: 'https://buy.stripe.com/x' })).toBe(true);
  });
});

describe('formatEur', () => {
  it('writes euros the way each locale does', () => {
    expect(formatEur(9.99, 'en')).toBe('€9.99');
    expect(formatEur(9.99, 'es')).toMatch(/^9,99\s€$/);
  });
});

describe('pickGood / loadSeasonPass', () => {
  it('names the good it could not find', () => {
    expect(() => pickGood([], 'nope')).toThrow(/nope/);
  });

  it('loads the Season I pass from the committed record, not on sale yet', () => {
    const pass = loadSeasonPass();
    expect(pass.id).toBe(SEASON_ONE_PASS_ID);
    expect(pass.priceEur).toBe(9.99);
    expect(onSale(pass)).toBe(false);
  });
});

describe('pickRecordText', () => {
  const real = { '/x/.lore/offers/OPS-016-season-pass-the-offer.md': 'real' };
  const fixture = { '/x/fixtures/offers/OPS-016-season-pass-the-offer.md': 'fixture' };
  it('prefers the fetched record on a deploy', () => {
    expect(pickRecordText(real, fixture, false)).toBe('real');
  });
  it('reads the committed copy on a hermetic build, or when nothing was fetched', () => {
    expect(pickRecordText(real, fixture, true)).toBe('fixture');
    expect(pickRecordText({}, fixture, false)).toBe('fixture');
  });
  it('stops the build when there is no record at all', () => {
    expect(() => pickRecordText({}, {}, false)).toThrow(OfferRecordError);
  });
});
