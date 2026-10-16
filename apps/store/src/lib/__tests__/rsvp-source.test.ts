/**
 * «Me apunto» for real (cut «Tu agenda»): the store's side of the till's
 * RSVPs. The desk read off a binding, the fixture desk, what the browser
 * sends read as untrusted, and the two routes' answers — fail closed: 401,
 * 503, 502, 404, 400 — against a fake desk and the fixture one.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Asker } from '../accounts';
import { NOT_IMPLEMENTED } from '../accounts';
import {
  RSVP_IDS_MAX,
  answerRsvpChange,
  answerRsvps,
  boundRsvps,
  createRsvpFixtureDesk,
  fixtureRsvps,
  readRsvpBody,
  readRsvpIds,
  resetFixtureRsvpsForTests,
  rsvpsFrom,
  type RsvpDesk,
} from '../rsvp-source';

const WALLET = `0x${'ab'.repeat(20)}`;
const OTHER = `0x${'cd'.repeat(20)}`;
const asker: Asker = { wallet: WALLET.toUpperCase().replace('0X', '0x'), house: false };
const KNOWN: ReadonlySet<string> = new Set(['trg26', 'merge-madrid-2026']);
const log = vi.fn();

const url = (ids?: string): URL =>
  new URL(`https://numinia.com/api/rsvp${ids === undefined ? '' : `?ids=${ids}`}`);

const post = (body: unknown, type = 'application/json'): Request =>
  new Request('https://numinia.com/api/rsvp', {
    method: 'POST',
    headers: { 'content-type': type },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });

afterEach(() => {
  resetFixtureRsvpsForTests();
  log.mockReset();
});

describe('the desk read off a binding', () => {
  it('needs the four RPCs, and calls them as methods of the stub', async () => {
    const calls: unknown[][] = [];
    class Stub {
      rsvp(...args: unknown[]): Promise<unknown> {
        calls.push(['rsvp', this instanceof Stub, ...args]);
        return Promise.resolve({ ok: true, ritualIds: ['trg26'] });
      }
      unrsvp(...args: unknown[]): Promise<unknown> {
        calls.push(['unrsvp', this instanceof Stub, ...args]);
        return Promise.resolve({ ok: true, ritualIds: [] });
      }
      myRsvps(...args: unknown[]): Promise<unknown> {
        calls.push(['myRsvps', this instanceof Stub, ...args]);
        return Promise.resolve({ ok: true, ritualIds: [] });
      }
      rsvpCounts(...args: unknown[]): Promise<unknown> {
        calls.push(['rsvpCounts', this instanceof Stub, ...args]);
        return Promise.resolve({ ok: true, counts: {} });
      }
    }
    const desk = boundRsvps(new Stub());
    expect(desk).not.toBeNull();
    await desk?.rsvp(WALLET, 'trg26');
    await desk?.unrsvp(WALLET, 'trg26');
    await desk?.myRsvps(WALLET);
    await desk?.rsvpCounts(['trg26']);
    expect(calls).toEqual([
      ['rsvp', true, WALLET, 'trg26'],
      ['unrsvp', true, WALLET, 'trg26'],
      ['myRsvps', true, WALLET],
      ['rsvpCounts', true, ['trg26']],
    ]);
  });

  it('is null for nothing bound, a value that is not a desk, or a till older than the cut', () => {
    for (const binding of [undefined, null, 7, 'desk', {}, { rsvp: () => 1 }]) {
      expect(boundRsvps(binding)).toBeNull();
    }
    const older = { rsvp: () => 1, unrsvp: () => 1, myRsvps: () => 1 };
    expect(boundRsvps(older)).toBeNull();
  });

  it('falls back to the fixture desk only when the build reads fixtures', () => {
    expect(rsvpsFrom({ binding: undefined, dataSource: 'fixture' })).toBe(fixtureRsvps());
    expect(rsvpsFrom({ binding: undefined, dataSource: 'github' })).toBeNull();
    expect(rsvpsFrom({ binding: undefined, dataSource: undefined })).toBeNull();
    const stub = {
      rsvp: () => Promise.resolve(1),
      unrsvp: () => Promise.resolve(1),
      myRsvps: () => Promise.resolve(1),
      rsvpCounts: () => Promise.resolve(1),
    };
    expect(rsvpsFrom({ binding: stub, dataSource: 'fixture' })).not.toBe(fixtureRsvps());
    resetFixtureRsvpsForTests();
    expect(fixtureRsvps()).not.toBe(rsvpsFrom({ binding: undefined, dataSource: 'github' }));
  });
});

describe('the fixture desk', () => {
  it('remembers per wallet, once per encounter, counts across wallets, and forgets on unrsvp', async () => {
    const desk = createRsvpFixtureDesk();
    expect(await desk.myRsvps(WALLET)).toEqual({ ok: true, ritualIds: [] });
    expect(await desk.rsvp(WALLET, 'trg26')).toEqual({ ok: true, ritualIds: ['trg26'] });
    expect(await desk.rsvp(WALLET, 'trg26')).toEqual({ ok: true, ritualIds: ['trg26'] });
    await desk.rsvp(WALLET, 'merge-madrid-2026');
    await desk.rsvp(OTHER, 'trg26');
    expect(await desk.rsvpCounts(['trg26', 'merge-madrid-2026', 'cpslive-2026'])).toEqual({
      ok: true,
      counts: { trg26: 2, 'merge-madrid-2026': 1, 'cpslive-2026': 0 },
    });
    expect(await desk.unrsvp(WALLET, 'trg26')).toEqual({
      ok: true,
      ritualIds: ['merge-madrid-2026'],
    });
    expect(await desk.unrsvp(OTHER, 'nothing')).toEqual({ ok: true, ritualIds: ['trg26'] });
    expect(await desk.unrsvp(`0x${'ef'.repeat(20)}`, 'trg26')).toEqual({ ok: true, ritualIds: [] });
  });
});

describe('what the browser sends', () => {
  it('reads ?ids= as slugs the register knows, duplicates dropped, 100 at most', () => {
    expect(RSVP_IDS_MAX).toBe(100);
    expect(readRsvpIds(null, KNOWN)).toEqual([]);
    expect(readRsvpIds('', KNOWN)).toEqual([]);
    expect(readRsvpIds('trg26,merge-madrid-2026,trg26', KNOWN)).toEqual([
      'trg26',
      'merge-madrid-2026',
    ]);
    expect(readRsvpIds('trg26,unknown', KNOWN)).toBeNull();
    expect(readRsvpIds('TRG26', KNOWN)).toBeNull();
    expect(readRsvpIds('trg26,', KNOWN)).toBeNull();
    const many = new Set(Array.from({ length: 101 }, (_, index) => `r${index}`));
    expect(readRsvpIds([...many].join(','), many)).toBeNull();
    expect(readRsvpIds([...many].slice(0, 100).join(','), many)).toHaveLength(100);
  });

  it('reads { ritualId, on } and nothing looser', () => {
    expect(readRsvpBody({ ritualId: 'trg26', on: true })).toEqual({ ritualId: 'trg26', on: true });
    expect(readRsvpBody({ ritualId: 'trg26', on: false, extra: 1 })).toEqual({
      ritualId: 'trg26',
      on: false,
    });
    for (const bad of [
      null,
      7,
      'trg26',
      {},
      { ritualId: 'trg26' },
      { ritualId: 'TRG26', on: true },
      { ritualId: 7, on: true },
      { ritualId: 'trg26', on: 'yes' },
    ]) {
      expect(readRsvpBody(bad), JSON.stringify(bad)).toBeNull();
    }
  });
});

const status = async (response: Response): Promise<[number, unknown]> => [
  response.status,
  await response.json(),
];

describe('GET /api/rsvp', () => {
  it('is 401 signed out, 503 without a till, and asks nothing', async () => {
    expect(await status(await answerRsvps(fixtureRsvps(), null, url(), KNOWN, log))).toEqual([
      401,
      { error: 'signed-out' },
    ]);
    expect(await status(await answerRsvps(null, asker, url(), KNOWN, log))).toEqual([
      503,
      { error: 'not-bound' },
    ]);
  });

  it('answers the wallet’s own ids and the counts of the ids asked, lowercase wallet', async () => {
    const desk = fixtureRsvps();
    await desk.rsvp(WALLET, 'trg26');
    await desk.rsvp(OTHER, 'trg26');
    await desk.rsvp(OTHER, 'merge-madrid-2026');
    const response = await answerRsvps(desk, asker, url('trg26,merge-madrid-2026'), KNOWN, log);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(await status(response)).toEqual([
      200,
      { mine: ['trg26'], counts: { trg26: 2, 'merge-madrid-2026': 1 } },
    ]);
    expect(await status(await answerRsvps(desk, asker, url(), KNOWN, log))).toEqual([
      200,
      { mine: ['trg26'], counts: {} },
    ]);
  });

  it('is 400 for an id the register lacks', async () => {
    expect(await status(await answerRsvps(fixtureRsvps(), asker, url('nope'), KNOWN, log))).toEqual(
      [400, { error: 'ids must name encounters of the register' }],
    );
  });

  it('is 503 for a till older than the cut, 502 for one that fails or answers out of shape, 400 for a refusal', async () => {
    const older: RsvpDesk = {
      ...fixtureRsvps(),
      myRsvps: () => Promise.reject(new TypeError(`The desk ${NOT_IMPLEMENTED} "myRsvps".`)),
    };
    expect(await status(await answerRsvps(older, asker, url(), KNOWN, log))).toEqual([
      503,
      { error: 'not-bound' },
    ]);
    const failing: RsvpDesk = {
      ...fixtureRsvps(),
      myRsvps: () => Promise.reject(new Error('down')),
    };
    expect(await status(await answerRsvps(failing, asker, url(), KNOWN, log))).toEqual([
      502,
      { error: 'till-failed' },
    ]);
    const odd: RsvpDesk = { ...fixtureRsvps(), rsvpCounts: () => Promise.resolve({ nope: 1 }) };
    expect(await status(await answerRsvps(odd, asker, url('trg26'), KNOWN, log))).toEqual([
      502,
      { error: 'till-failed' },
    ]);
    const refusing: RsvpDesk = {
      ...fixtureRsvps(),
      myRsvps: () => Promise.resolve({ ok: false, problems: ['wallet must be lowercase'] }),
    };
    expect(await status(await answerRsvps(refusing, asker, url(), KNOWN, log))).toEqual([
      400,
      { error: 'refused', problems: ['wallet must be lowercase'] },
    ]);
    const refusingCounts: RsvpDesk = {
      ...fixtureRsvps(),
      rsvpCounts: () => Promise.resolve({ ok: false, problems: ['ritualIds must be a list'] }),
    };
    expect(await status(await answerRsvps(refusingCounts, asker, url(), KNOWN, log))).toEqual([
      400,
      { error: 'refused', problems: ['ritualIds must be a list'] },
    ]);
    expect(log).toHaveBeenCalledTimes(3);
  });
});

describe('POST /api/rsvp', () => {
  it('is 401 signed out and 503 without a till, before the body is read', async () => {
    const body = post({ ritualId: 'trg26', on: true });
    expect(await status(await answerRsvpChange(fixtureRsvps(), null, body, KNOWN, log))).toEqual([
      401,
      { error: 'signed-out' },
    ]);
    expect(await status(await answerRsvpChange(null, asker, body, KNOWN, log))).toEqual([
      503,
      { error: 'not-bound' },
    ]);
  });

  it('says «voy» and «ya no voy», answering the view with that encounter’s count', async () => {
    const desk = fixtureRsvps();
    await desk.rsvp(OTHER, 'trg26');
    expect(
      await status(
        await answerRsvpChange(desk, asker, post({ ritualId: 'trg26', on: true }), KNOWN, log),
      ),
    ).toEqual([200, { mine: ['trg26'], counts: { trg26: 2 } }]);
    expect(
      await status(
        await answerRsvpChange(desk, asker, post({ ritualId: 'trg26', on: false }), KNOWN, log),
      ),
    ).toEqual([200, { mine: [], counts: { trg26: 1 } }]);
  });

  it('refuses a body out of shape (415, 400) and an encounter the register lacks (404)', async () => {
    const desk = fixtureRsvps();
    expect(
      await status(
        await answerRsvpChange(desk, asker, post('{"ritualId":"trg26"}', 'text/plain'), KNOWN, log),
      ),
    ).toEqual([415, { error: 'content-type must be application/json' }]);
    expect(
      await status(await answerRsvpChange(desk, asker, post({ ritualId: 'trg26' }), KNOWN, log)),
    ).toEqual([400, { error: 'body must be { ritualId, on }' }]);
    expect(
      await status(
        await answerRsvpChange(desk, asker, post({ ritualId: 'nope', on: true }), KNOWN, log),
      ),
    ).toEqual([404, { error: 'unknown-ritual' }]);
    expect(await desk.myRsvps(WALLET)).toEqual({ ok: true, ritualIds: [] });
  });

  it('is 400 for a till that refuses the change', async () => {
    const refusing: RsvpDesk = {
      ...fixtureRsvps(),
      rsvp: () => Promise.resolve({ ok: false, problems: ['nope'] }),
    };
    expect(
      await status(
        await answerRsvpChange(refusing, asker, post({ ritualId: 'trg26', on: true }), KNOWN, log),
      ),
    ).toEqual([400, { error: 'refused', problems: ['nope'] }]);
  });
});
