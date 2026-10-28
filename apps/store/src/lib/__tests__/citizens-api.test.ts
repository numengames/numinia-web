/**
 * «El censo» (cut of 2026-10-16) at the store's door to the till: GET
 * /api/admin/citizens (`answerCitizens`) for the house alone, the avatar
 * turned into a face before any answer reaches a browser, a till older than
 * the store, and a sign-in recorded best effort (`recordSignIn`) — a desk
 * that fails, throws, hangs or is missing never touches the sign-in.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AccountDesk, Asker } from '../accounts';
import { NOT_HOUSE_CENSUS } from '../accounts';
import {
  answerCitizens,
  boundAccounts,
  deferFrom,
  recordSignIn,
  resetFixtureAccountsForTests,
} from '../accounts-source';

const HOUSE: Asker = { wallet: `0x${'99'.repeat(20)}`, house: true };
const ADMIN: Asker = { wallet: `0x${'ab'.repeat(20)}`, house: false };
const ARLA = 'avatar-arla-mncdhz3l';
const ARLA_FACE = `/thumbs/1x/${ARLA}.webp`;
const LUCIA = `0x${'a1'.repeat(20)}`;
const MARCO = `0x${'b2'.repeat(20)}`;
const ANA = `0x${'56'.repeat(20)}`;
const FIRST = '2026-10-01T08:00:00.000Z';
const LAST = '2026-10-16T08:00:00.000Z';

/** The till's answer (apps/till src/db/census.ts). */
const TILL_LIST = {
  ok: true,
  people: [
    {
      wallet: LUCIA,
      firstSeenAt: FIRST,
      lastSeenAt: LAST,
      name: 'Lucía',
      avatar: ARLA,
      organizations: 2,
      organizationIds: ['acc_t_1', 'acc_t_2'],
    },
    {
      wallet: MARCO,
      firstSeenAt: FIRST,
      lastSeenAt: LAST,
      name: 'Marco',
      avatar: null,
      organizations: 1,
      organizationIds: ['acc_t_1'],
    },
    // An avatar this build did not bake: the person keeps their name, and no face.
    {
      wallet: ANA,
      firstSeenAt: FIRST,
      lastSeenAt: FIRST,
      name: 'Ana',
      avatar: 'avatar-not-baked-here',
      organizations: 0,
      organizationIds: [],
    },
    {
      wallet: HOUSE.wallet,
      firstSeenAt: FIRST,
      lastSeenAt: FIRST,
      organizations: 0,
      organizationIds: [],
    },
  ],
  total: 9,
  next: `${FIRST}~${HOUSE.wallet}`,
};

const answering = (value: unknown) => vi.fn(async () => value);

function fakeDesk(overrides: Partial<Record<keyof AccountDesk, unknown>> = {}): AccountDesk {
  return {
    overview: answering({ ok: true, accounts: [] }),
    directory: answering({ ok: true, accounts: [] }),
    createTeam: answering({ ok: false, problems: ['x'] }),
    renameTeam: answering({ ok: false, problems: ['x'] }),
    statement: answering({ ok: false, problems: ['x'] }),
    members: answering({ ok: true, members: [] }),
    access: answering({ ok: false, problems: ['x'] }),
    setMember: answering({ ok: true, members: [] }),
    removeMember: answering({ ok: true, members: [] }),
    roles: answering({ ok: false, problems: ['x'] }),
    headcount: answering({ ok: true, accountId: 'acc', members: 4 }),
    createRole: answering({ ok: false, problems: ['x'] }),
    editRole: answering({ ok: false, problems: ['x'] }),
    moveRole: answering({ ok: false, problems: ['x'] }),
    deleteRole: answering({ ok: false, problems: ['x'] }),
    giveRole: answering({ ok: false, problems: ['x'] }),
    takeRole: answering({ ok: false, problems: ['x'] }),
    log: answering({ ok: true, accountId: 'acc', lines: [] }),
    startTopup: answering({ ok: false, problems: ['x'] }),
    confirmTopup: answering({ ok: false, problems: ['x'] }),
    profile: answering({ ok: true, profile: null }),
    setProfile: answering({ ok: true, profile: null }),
    signedIn: answering({ ok: true }),
    citizens: answering(TILL_LIST),
    ...overrides,
  } as AccountDesk;
}

/** A till deployed before the census: every method but the two. */
function older(): Record<string, unknown> {
  const {
    signedIn: _signedIn,
    citizens: _citizens,
    ...rest
  } = fakeDesk() as unknown as Record<string, unknown>;
  return rest;
}

const url = (query = ''): URL => new URL(`https://numinia.com/api/admin/citizens${query}`);
const quiet = vi.fn();
const json = async (response: Response): Promise<unknown> => response.json();

afterEach(() => {
  resetFixtureAccountsForTests();
  quiet.mockClear();
});

describe('GET /api/admin/citizens: everyone who has signed in, to the house alone', () => {
  it('refuses with 403 whoever is not the house, signed out included, and never asks the till', async () => {
    const desk = fakeDesk();
    for (const asker of [null, ADMIN]) {
      const out = await answerCitizens(desk, asker, url('?q=luc'), quiet);
      expect(out.status).toBe(403);
      expect(await json(out)).toEqual({ error: 'forbidden' });
      expect(out.headers.get('cache-control')).toBe('private, no-store');
    }
    // Even without a till, a stranger learns only the refusal.
    expect((await answerCitizens(null, ADMIN, url(), quiet)).status).toBe(403);
    expect(desk.citizens).not.toHaveBeenCalled();
  });

  it('answers the house the till’s list, each avatar as its baked face, never the id', async () => {
    const desk = fakeDesk();
    const out = await answerCitizens(desk, HOUSE, url(), quiet);
    expect(out.status).toBe(200);
    expect(out.headers.get('cache-control')).toBe('private, no-store');
    const body = await json(out);
    expect(body).toEqual({
      ok: true,
      people: [
        {
          wallet: LUCIA,
          firstSeenAt: FIRST,
          lastSeenAt: LAST,
          name: 'Lucía',
          face: ARLA_FACE,
          organizations: 2,
          organizationIds: ['acc_t_1', 'acc_t_2'],
        },
        {
          wallet: MARCO,
          firstSeenAt: FIRST,
          lastSeenAt: LAST,
          name: 'Marco',
          face: null,
          organizations: 1,
          organizationIds: ['acc_t_1'],
        },
        {
          wallet: ANA,
          firstSeenAt: FIRST,
          lastSeenAt: FIRST,
          name: 'Ana',
          face: null,
          organizations: 0,
          organizationIds: [],
        },
        {
          wallet: HOUSE.wallet,
          firstSeenAt: FIRST,
          lastSeenAt: FIRST,
          name: null,
          face: null,
          organizations: 0,
          organizationIds: [],
        },
      ],
      total: 9,
      next: `${FIRST}~${HOUSE.wallet}`,
    });
    expect(JSON.stringify(body)).not.toContain('"avatar"');
    expect(JSON.stringify(body)).not.toContain('avatar-not-baked-here');
    expect(desk.citizens).toHaveBeenCalledWith(HOUSE.wallet, true, '', null);
  });

  it('asks with the session’s wallet lowercased, the search and the cursor, and nothing else', async () => {
    const desk = fakeDesk();
    const shouting = { wallet: HOUSE.wallet.toUpperCase().replace('0X', '0x'), house: true };
    await answerCitizens(
      desk,
      shouting,
      url('?q=Luc%C3%ADa&cursor=abc&house=false&wallet=0x1'),
      quiet,
    );
    expect(desk.citizens).toHaveBeenCalledWith(HOUSE.wallet, true, 'Lucía', 'abc');
  });

  it('refuses a search or a cursor out of measure before the till', async () => {
    const desk = fakeDesk();
    const long = await answerCitizens(desk, HOUSE, url(`?q=${'a'.repeat(101)}`), quiet);
    expect(long.status).toBe(400);
    expect(await json(long)).toEqual({ error: 'q: 100 characters at most' });
    const cursor = await answerCitizens(desk, HOUSE, url(`?cursor=${'a'.repeat(201)}`), quiet);
    expect(cursor.status).toBe(400);
    expect(await json(cursor)).toEqual({ error: 'cursor: 200 characters at most' });
    expect(desk.citizens).not.toHaveBeenCalled();
  });

  it('answers 503 without a till, or with a till older than the census', async () => {
    const none = await answerCitizens(null, HOUSE, url(), quiet);
    expect(none.status).toBe(503);
    expect(await json(none)).toEqual({ error: 'not-bound' });
    const bound = boundAccounts(older());
    if (bound === null) throw new Error('a till without the census is a desk all the same');
    const old = await answerCitizens(bound, HOUSE, url(), quiet);
    expect(old.status).toBe(503);
    expect(quiet).toHaveBeenLastCalledWith(
      expect.objectContaining({ action: 'citizens', rule: 'not-implemented' }),
    );
  });

  it('answers 502 when the till throws or answers out of shape, logged by rule only', async () => {
    const thrown = fakeDesk({
      citizens: vi.fn(async () => {
        throw new Error(`boom ${LUCIA}`);
      }),
    });
    const out = await answerCitizens(thrown, HOUSE, url(), quiet);
    expect(out.status).toBe(502);
    expect(await json(out)).toEqual({ error: 'till-failed' });
    expect(JSON.stringify(quiet.mock.calls)).not.toContain(LUCIA);
    const odd = fakeDesk({ citizens: answering({ ok: true, people: 'x' }) });
    expect((await answerCitizens(odd, HOUSE, url(), quiet)).status).toBe(502);
    expect(quiet).toHaveBeenLastCalledWith(
      expect.objectContaining({ action: 'citizens', rule: 'answer-shape' }),
    );
  });

  it('passes on the till’s refusal: 403 when it is not the house, 400 otherwise', async () => {
    const notHouse = fakeDesk({ citizens: answering({ ok: false, problems: [NOT_HOUSE_CENSUS] }) });
    const out = await answerCitizens(notHouse, HOUSE, url(), quiet);
    expect(out.status).toBe(403);
    expect(await json(out)).toEqual({ error: 'refused', problems: [NOT_HOUSE_CENSUS] });
    const badCursor = fakeDesk({
      citizens: answering({ ok: false, problems: ['cursor must be one this list gave'] }),
    });
    const bad = await answerCitizens(badCursor, HOUSE, url('?cursor=x'), quiet);
    expect(bad.status).toBe(400);
    expect(await json(bad)).toEqual({
      error: 'refused',
      problems: ['cursor must be one this list gave'],
    });
  });
});

describe('the bound till: the census methods are optional', () => {
  it('calls a till that has them as methods, with what the store was given', async () => {
    const stub = fakeDesk();
    const bound = boundAccounts(stub);
    if (bound === null) throw new Error('not bound');
    await bound.signedIn(LUCIA);
    await bound.citizens(HOUSE.wallet, true, 'luc', null);
    expect(stub.signedIn).toHaveBeenCalledWith(LUCIA);
    expect(stub.citizens).toHaveBeenCalledWith(HOUSE.wallet, true, 'luc', null);
  });

  it('answers as workerd does for a till without them', async () => {
    const bound = boundAccounts(older());
    if (bound === null) throw new Error('not bound');
    await expect(bound.signedIn(LUCIA)).rejects.toThrow('does not implement the method');
    await expect(bound.citizens(HOUSE.wallet, true)).rejects.toThrow(
      'does not implement the method',
    );
  });
});

describe('a sign-in recorded, best effort', () => {
  it('hands the till the wallet, lowercased, as work for after the answer', async () => {
    const desk = fakeDesk();
    const deferred: Promise<unknown>[] = [];
    recordSignIn(desk, LUCIA.toUpperCase().replace('0X', '0x'), (work) => deferred.push(work));
    expect(deferred).toHaveLength(1);
    await Promise.all(deferred);
    expect(desk.signedIn).toHaveBeenCalledWith(LUCIA);
  });

  it('swallows every failure: a refusal, a throw, a rejection, a missing method, a broken defer', async () => {
    const deferred: Promise<unknown>[] = [];
    const defer = (work: Promise<unknown>): void => {
      deferred.push(work);
    };
    recordSignIn(fakeDesk({ signedIn: answering({ ok: false, problems: ['x'] }) }), LUCIA, defer);
    recordSignIn(
      fakeDesk({
        signedIn: vi.fn(() => {
          throw new Error('sync');
        }),
      }),
      LUCIA,
      defer,
    );
    recordSignIn(
      fakeDesk({ signedIn: vi.fn(async () => Promise.reject(new Error('async'))) }),
      LUCIA,
      defer,
    );
    const bound = boundAccounts(older());
    if (bound === null) throw new Error('not bound');
    recordSignIn(bound, LUCIA, defer);
    // Every piece of work settles, none rejects.
    await expect(Promise.all(deferred)).resolves.toHaveLength(4);
    expect(() =>
      recordSignIn(fakeDesk(), LUCIA, () => {
        throw new Error('no context');
      }),
    ).not.toThrow();
  });

  it('does nothing without a desk', () => {
    const defer = vi.fn();
    recordSignIn(null, LUCIA, defer);
    expect(defer).not.toHaveBeenCalled();
  });

  it('never waits for the till: a till that hangs leaves the call returned', () => {
    const hanging = fakeDesk({ signedIn: vi.fn(() => new Promise(() => undefined)) });
    const defer = vi.fn();
    expect(recordSignIn(hanging, LUCIA, defer)).toBeUndefined();
    expect(defer).toHaveBeenCalledTimes(1);
  });
});

describe('where deferred work goes', () => {
  it('to the Worker’s waitUntil when the adapter gives a context', async () => {
    const waitUntil = vi.fn();
    const cfContext = { waitUntil };
    const defer = deferFrom({ cfContext });
    const work = Promise.resolve(1);
    defer(work);
    expect(waitUntil).toHaveBeenCalledWith(work);
    // Called as a method of the context: workerd's needs its receiver.
    expect(waitUntil.mock.contexts[0]).toBe(cfContext);
  });

  it('nowhere special without one: the work runs on its own', async () => {
    for (const locals of [
      undefined,
      null,
      {},
      { cfContext: null },
      { cfContext: { waitUntil: 1 } },
    ]) {
      const defer = deferFrom(locals);
      let ran = false;
      defer(
        Promise.resolve().then(() => {
          ran = true;
        }),
      );
      await Promise.resolve();
      await Promise.resolve();
      expect(ran, JSON.stringify(locals)).toBe(true);
    }
  });

  it('reads the context without tripping over a getter that throws', () => {
    const locals = Object.defineProperty({}, 'cfContext', {
      get() {
        throw new Error('not on workerd');
      },
    });
    expect(() => deferFrom(locals)(Promise.resolve())).not.toThrow();
  });
});
