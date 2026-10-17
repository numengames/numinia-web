/**
 * «Seguir» for real (cut «Seguir»): the store's side of the till's follows.
 * The desk read off a binding, the fixture desk, what the browser sends
 * read as untrusted, and the two routes' answers — fail closed: 401, 503,
 * 502, 404, 400 — against a fake desk and the fixture one.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Asker } from '../accounts';
import { NOT_IMPLEMENTED } from '../accounts';
import {
  FOLLOW_IDS_MAX,
  answerFollowChange,
  answerFollows,
  boundFollows,
  createFollowFixtureDesk,
  fixtureFollows,
  followsFrom,
  readFollowBody,
  readFollowIds,
  resetFixtureFollowsForTests,
  type FollowDesk,
} from '../follows';

const WALLET = `0x${'ab'.repeat(20)}`;
const OTHER = `0x${'cd'.repeat(20)}`;
const asker: Asker = { wallet: WALLET.toUpperCase().replace('0X', '0x'), house: false };
const KNOWN: ReadonlySet<string> = new Set(['la-tarugo', 'merge']);
const log = vi.fn();

const url = (ids?: string): URL =>
  new URL(`https://numinia.com/api/follow${ids === undefined ? '' : `?ids=${ids}`}`);

const post = (body: unknown, type = 'application/json'): Request =>
  new Request('https://numinia.com/api/follow', {
    method: 'POST',
    headers: { 'content-type': type },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });

afterEach(() => {
  resetFixtureFollowsForTests();
  log.mockReset();
});

describe('the desk read off a binding', () => {
  it('needs the four RPCs, and calls them as methods of the stub', async () => {
    const calls: unknown[][] = [];
    class Stub {
      follow(...args: unknown[]): Promise<unknown> {
        calls.push(['follow', this instanceof Stub, ...args]);
        return Promise.resolve({ ok: true, communityIds: ['la-tarugo'] });
      }
      unfollow(...args: unknown[]): Promise<unknown> {
        calls.push(['unfollow', this instanceof Stub, ...args]);
        return Promise.resolve({ ok: true, communityIds: [] });
      }
      myFollows(...args: unknown[]): Promise<unknown> {
        calls.push(['myFollows', this instanceof Stub, ...args]);
        return Promise.resolve({ ok: true, communityIds: [] });
      }
      followCounts(...args: unknown[]): Promise<unknown> {
        calls.push(['followCounts', this instanceof Stub, ...args]);
        return Promise.resolve({ ok: true, counts: {} });
      }
    }
    const desk = boundFollows(new Stub());
    expect(desk).not.toBeNull();
    await desk?.follow(WALLET, 'la-tarugo');
    await desk?.unfollow(WALLET, 'la-tarugo');
    await desk?.myFollows(WALLET);
    await desk?.followCounts(['la-tarugo']);
    expect(calls).toEqual([
      ['follow', true, WALLET, 'la-tarugo'],
      ['unfollow', true, WALLET, 'la-tarugo'],
      ['myFollows', true, WALLET],
      ['followCounts', true, ['la-tarugo']],
    ]);
  });

  it('is null for nothing bound, a value that is not a desk, or a till older than the cut', () => {
    for (const binding of [undefined, null, 7, 'desk', {}, { follow: () => 1 }]) {
      expect(boundFollows(binding)).toBeNull();
    }
    const older = { follow: () => 1, unfollow: () => 1, myFollows: () => 1 };
    expect(boundFollows(older)).toBeNull();
  });

  it('falls back to the fixture desk only when the build reads fixtures', () => {
    expect(followsFrom({ binding: undefined, dataSource: 'fixture' })).toBe(fixtureFollows());
    expect(followsFrom({ binding: undefined, dataSource: 'github' })).toBeNull();
    expect(followsFrom({ binding: undefined, dataSource: undefined })).toBeNull();
    const stub = {
      follow: () => Promise.resolve(1),
      unfollow: () => Promise.resolve(1),
      myFollows: () => Promise.resolve(1),
      followCounts: () => Promise.resolve(1),
    };
    expect(followsFrom({ binding: stub, dataSource: 'fixture' })).not.toBe(fixtureFollows());
    resetFixtureFollowsForTests();
    expect(fixtureFollows()).not.toBe(followsFrom({ binding: undefined, dataSource: 'github' }));
  });
});

describe('the fixture desk', () => {
  it('remembers per wallet, once per community, counts across wallets, and forgets on unfollow', async () => {
    const desk = createFollowFixtureDesk();
    expect(await desk.myFollows(WALLET)).toEqual({ ok: true, communityIds: [] });
    expect(await desk.follow(WALLET, 'la-tarugo')).toEqual({
      ok: true,
      communityIds: ['la-tarugo'],
    });
    expect(await desk.follow(WALLET, 'la-tarugo')).toEqual({
      ok: true,
      communityIds: ['la-tarugo'],
    });
    await desk.follow(WALLET, 'merge');
    await desk.follow(OTHER, 'la-tarugo');
    expect(await desk.followCounts(['la-tarugo', 'merge', 'tetuan-valley'])).toEqual({
      ok: true,
      counts: { 'la-tarugo': 2, merge: 1, 'tetuan-valley': 0 },
    });
    expect(await desk.unfollow(WALLET, 'la-tarugo')).toEqual({ ok: true, communityIds: ['merge'] });
    expect(await desk.unfollow(OTHER, 'nothing')).toEqual({
      ok: true,
      communityIds: ['la-tarugo'],
    });
    expect(await desk.unfollow(`0x${'ef'.repeat(20)}`, 'la-tarugo')).toEqual({
      ok: true,
      communityIds: [],
    });
  });
});

describe('what the browser sends', () => {
  it('reads ?ids= as ids the register knows, duplicates dropped, 100 at most', () => {
    expect(FOLLOW_IDS_MAX).toBe(100);
    expect(readFollowIds(null, KNOWN)).toEqual([]);
    expect(readFollowIds('', KNOWN)).toEqual([]);
    expect(readFollowIds('la-tarugo,merge,la-tarugo', KNOWN)).toEqual(['la-tarugo', 'merge']);
    expect(readFollowIds('la-tarugo,unknown', KNOWN)).toBeNull();
    expect(readFollowIds('La-Tarugo', KNOWN)).toBeNull();
    expect(readFollowIds('la-tarugo,', KNOWN)).toBeNull();
    const many = new Set(Array.from({ length: 101 }, (_, index) => `c${index}`));
    expect(readFollowIds([...many].join(','), many)).toBeNull();
    expect(readFollowIds([...many].slice(0, 100).join(','), many)).toHaveLength(100);
  });

  it('reads { communityId, on } and nothing looser', () => {
    expect(readFollowBody({ communityId: 'la-tarugo', on: true })).toEqual({
      communityId: 'la-tarugo',
      on: true,
    });
    expect(readFollowBody({ communityId: 'merge', on: false, extra: 1 })).toEqual({
      communityId: 'merge',
      on: false,
    });
    for (const bad of [
      null,
      7,
      'la-tarugo',
      {},
      { communityId: 'la-tarugo' },
      { communityId: 'La-Tarugo', on: true },
      { communityId: '-tarugo', on: true },
      { communityId: 7, on: true },
      { communityId: 'la-tarugo', on: 'yes' },
    ]) {
      expect(readFollowBody(bad), JSON.stringify(bad)).toBeNull();
    }
  });
});

const status = async (response: Response): Promise<[number, unknown]> => [
  response.status,
  await response.json(),
];

describe('GET /api/follow', () => {
  it('is 401 signed out, 503 without a till, and asks nothing', async () => {
    expect(await status(await answerFollows(fixtureFollows(), null, url(), KNOWN, log))).toEqual([
      401,
      { error: 'signed-out' },
    ]);
    expect(await status(await answerFollows(null, asker, url(), KNOWN, log))).toEqual([
      503,
      { error: 'not-bound' },
    ]);
  });

  it('answers the wallet’s own ids and the counts of the ids asked, lowercase wallet', async () => {
    const desk = fixtureFollows();
    await desk.follow(WALLET, 'la-tarugo');
    await desk.follow(OTHER, 'la-tarugo');
    await desk.follow(OTHER, 'merge');
    const response = await answerFollows(desk, asker, url('la-tarugo,merge'), KNOWN, log);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(await status(response)).toEqual([
      200,
      { mine: ['la-tarugo'], counts: { 'la-tarugo': 2, merge: 1 } },
    ]);
    expect(await status(await answerFollows(desk, asker, url(), KNOWN, log))).toEqual([
      200,
      { mine: ['la-tarugo'], counts: {} },
    ]);
  });

  it('is 400 for an id the register lacks', async () => {
    expect(
      await status(await answerFollows(fixtureFollows(), asker, url('nope'), KNOWN, log)),
    ).toEqual([400, { error: 'ids must name communities of the register' }]);
  });

  it('is 503 for a till older than the cut, 502 for one that fails or answers out of shape, 400 for a refusal', async () => {
    const older: FollowDesk = {
      ...fixtureFollows(),
      myFollows: () => Promise.reject(new TypeError(`The desk ${NOT_IMPLEMENTED} "myFollows".`)),
    };
    expect(await status(await answerFollows(older, asker, url(), KNOWN, log))).toEqual([
      503,
      { error: 'not-bound' },
    ]);
    const failing: FollowDesk = {
      ...fixtureFollows(),
      myFollows: () => Promise.reject(new Error('down')),
    };
    expect(await status(await answerFollows(failing, asker, url(), KNOWN, log))).toEqual([
      502,
      { error: 'till-failed' },
    ]);
    const odd: FollowDesk = {
      ...fixtureFollows(),
      followCounts: () => Promise.resolve({ nope: 1 }),
    };
    expect(await status(await answerFollows(odd, asker, url('la-tarugo'), KNOWN, log))).toEqual([
      502,
      { error: 'till-failed' },
    ]);
    const refusing: FollowDesk = {
      ...fixtureFollows(),
      myFollows: () => Promise.resolve({ ok: false, problems: ['wallet must be lowercase'] }),
    };
    expect(await status(await answerFollows(refusing, asker, url(), KNOWN, log))).toEqual([
      400,
      { error: 'refused', problems: ['wallet must be lowercase'] },
    ]);
    const refusingCounts: FollowDesk = {
      ...fixtureFollows(),
      followCounts: () => Promise.resolve({ ok: false, problems: ['communityIds must be a list'] }),
    };
    expect(await status(await answerFollows(refusingCounts, asker, url(), KNOWN, log))).toEqual([
      400,
      { error: 'refused', problems: ['communityIds must be a list'] },
    ]);
    expect(log).toHaveBeenCalledTimes(3);
  });
});

describe('POST /api/follow', () => {
  it('is 401 signed out and 503 without a till, before the body is read', async () => {
    const body = post({ communityId: 'la-tarugo', on: true });
    expect(
      await status(await answerFollowChange(fixtureFollows(), null, body, KNOWN, log)),
    ).toEqual([401, { error: 'signed-out' }]);
    expect(await status(await answerFollowChange(null, asker, body, KNOWN, log))).toEqual([
      503,
      { error: 'not-bound' },
    ]);
  });

  it('says «sigo» and «ya no sigo», answering the view with that community’s count', async () => {
    const desk = fixtureFollows();
    await desk.follow(OTHER, 'la-tarugo');
    expect(
      await status(
        await answerFollowChange(
          desk,
          asker,
          post({ communityId: 'la-tarugo', on: true }),
          KNOWN,
          log,
        ),
      ),
    ).toEqual([200, { mine: ['la-tarugo'], counts: { 'la-tarugo': 2 } }]);
    expect(
      await status(
        await answerFollowChange(
          desk,
          asker,
          post({ communityId: 'la-tarugo', on: false }),
          KNOWN,
          log,
        ),
      ),
    ).toEqual([200, { mine: [], counts: { 'la-tarugo': 1 } }]);
  });

  it('refuses a body out of shape (415, 400) and a community the register lacks (404)', async () => {
    const desk = fixtureFollows();
    expect(
      await status(
        await answerFollowChange(
          desk,
          asker,
          post('{"communityId":"la-tarugo"}', 'text/plain'),
          KNOWN,
          log,
        ),
      ),
    ).toEqual([415, { error: 'content-type must be application/json' }]);
    expect(
      await status(
        await answerFollowChange(desk, asker, post({ communityId: 'la-tarugo' }), KNOWN, log),
      ),
    ).toEqual([400, { error: 'body must be { communityId, on }' }]);
    expect(
      await status(
        await answerFollowChange(desk, asker, post({ communityId: 'nope', on: true }), KNOWN, log),
      ),
    ).toEqual([404, { error: 'unknown-community' }]);
    expect(await desk.myFollows(WALLET)).toEqual({ ok: true, communityIds: [] });
  });

  it('is 400 for a till that refuses the change', async () => {
    const refusing: FollowDesk = {
      ...fixtureFollows(),
      follow: () => Promise.resolve({ ok: false, problems: ['nope'] }),
    };
    expect(
      await status(
        await answerFollowChange(
          refusing,
          asker,
          post({ communityId: 'la-tarugo', on: true }),
          KNOWN,
          log,
        ),
      ),
    ).toEqual([400, { error: 'refused', problems: ['nope'] }]);
  });
});
