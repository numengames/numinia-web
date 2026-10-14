/**
 * Who is here: one memoised read per page, heard by the whole chrome, again
 * after every sign-in or sign-out; anything odd reads as «out»; the short
 * wallet for the page; the client published on the window for the island.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  SESSION_READY,
  SIGNED_OUT,
  createSessionClient,
  pageSession,
  rankLevel,
  readSession,
  sessionFromBody,
  shortAddress,
  type SessionView,
} from '../session-client';
import { SESSION_CHANGED } from '../session-signal';

const WALLET = '0x42E6000000000000000000000000000000CA26';
const IN: SessionView = {
  status: 'in',
  rank: 'oracle',
  short: '0x42E6…CA26',
  address: WALLET.toLowerCase(),
};

const answer = (status: number, body: unknown) => async () =>
  new Response(JSON.stringify(body), { status });

/** Let every pending promise in the client settle. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('the short wallet', () => {
  it('keeps the first six and the last four characters', () => {
    expect(shortAddress(WALLET)).toBe('0x42E6…CA26');
  });

  it('leaves a short string as it is', () => {
    expect(shortAddress('0xabc')).toBe('0xabc');
  });
});

describe('the endpoint body', () => {
  it('reads an address and a rank as signed in', () => {
    expect(sessionFromBody({ address: WALLET, rank: 'oracle' })).toEqual(IN);
  });

  it('reads anything else as signed out', () => {
    for (const body of [null, 'x', 7, {}, { address: WALLET }, { rank: 'oracle' }]) {
      expect(sessionFromBody(body)).toBe(SIGNED_OUT);
    }
    expect(sessionFromBody({ address: '', rank: 'oracle' })).toBe(SIGNED_OUT);
    expect(sessionFromBody({ address: WALLET, rank: '' })).toBe(SIGNED_OUT);
    expect(sessionFromBody({ address: 1, rank: 'oracle' })).toBe(SIGNED_OUT);
  });
});

describe('one read of the endpoint', () => {
  it('asks the same-origin session endpoint', async () => {
    const fetcher = vi.fn(answer(200, { address: WALLET, rank: 'oracle' }));
    expect(await readSession(fetcher)).toEqual(IN);
    expect(fetcher).toHaveBeenCalledWith('/api/auth/session', { credentials: 'same-origin' });
  });

  it('fails closed on 401, 503, a broken body and a network error', async () => {
    expect(await readSession(answer(401, { error: 'No session' }))).toBe(SIGNED_OUT);
    expect(await readSession(answer(503, {}))).toBe(SIGNED_OUT);
    expect(await readSession(async () => new Response('not json', { status: 200 }))).toBe(
      SIGNED_OUT,
    );
    expect(
      await readSession(async () => {
        throw new TypeError('offline');
      }),
    ).toBe(SIGNED_OUT);
  });

  it('reads the body even when the answer is a refusal, so the request closes', async () => {
    const response = new Response('{"error":"No session"}', { status: 401 });
    await readSession(async () => response);
    expect(response.bodyUsed).toBe(true);
  });
});

describe('the page client', () => {
  it('asks once, however many parts of the page listen', async () => {
    const fetcher = vi.fn(answer(200, { address: WALLET, rank: 'oracle' }));
    const client = createSessionClient(fetcher, new EventTarget());
    const bar = vi.fn();
    const card = vi.fn();
    client.subscribe(bar);
    client.subscribe(card);
    expect(await client.current()).toEqual(IN);
    await settle();
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(bar).toHaveBeenCalledTimes(1);
    expect(bar).toHaveBeenCalledWith(IN);
    expect(card).toHaveBeenCalledWith(IN);
  });

  it('reads again after a sign-in or a sign-out, and tells every listener', async () => {
    let signedIn = false;
    const fetcher = vi.fn(async () =>
      signedIn
        ? new Response(JSON.stringify({ address: WALLET, rank: 'oracle' }), { status: 200 })
        : new Response('{}', { status: 401 }),
    );
    const client = createSessionClient(fetcher, new EventTarget());
    const seen: SessionView[] = [];
    client.subscribe((session) => seen.push(session));
    await settle();
    signedIn = true;
    client.changed();
    await settle();
    expect(seen).toEqual([SIGNED_OUT, IN]);
    expect(await client.current()).toEqual(IN);
  });

  it('announces a change as the page-wide event every listener hears', () => {
    const page = new EventTarget();
    const heard = vi.fn();
    page.addEventListener(SESSION_CHANGED, heard);
    createSessionClient(answer(401, {}), page).changed();
    expect(heard).toHaveBeenCalledTimes(1);
  });

  it('stops telling a listener that left', async () => {
    const client = createSessionClient(answer(401, {}), new EventTarget());
    const gone = vi.fn();
    const stop = client.subscribe(gone);
    await settle();
    stop();
    client.changed();
    await settle();
    expect(gone).toHaveBeenCalledTimes(1);
  });

  it('starts the read on the first `current()` too, and `fresh()` always asks again', async () => {
    const fetcher = vi.fn(answer(401, {}));
    const client = createSessionClient(fetcher, new EventTarget());
    expect(await client.current()).toBe(SIGNED_OUT);
    expect(await client.current()).toBe(SIGNED_OUT);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(await client.fresh()).toBe(SIGNED_OUT);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});

describe('the browser page client', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('is one per page, published on the window for the island, with a ready signal', async () => {
    const fetcher = vi.fn(answer(200, { address: WALLET, rank: 'oracle' }));
    const win: EventTarget & { numiniaSession?: unknown } = new EventTarget();
    const ready = vi.fn();
    win.addEventListener(SESSION_READY, ready);
    vi.stubGlobal('window', win);
    vi.stubGlobal('fetch', fetcher);
    const client = pageSession();
    expect(pageSession()).toBe(client);
    expect(win.numiniaSession).toBe(client);
    expect(ready).toHaveBeenCalledTimes(1);
    expect(await client.current()).toEqual(IN);
    expect(fetcher).toHaveBeenCalledWith('/api/auth/session', { credentials: 'same-origin' });
  });
});

describe('the ladder of ranks', () => {
  const order = ['nomad', 'pilgrim', 'citizen', 'archon', 'oracle'];

  it('stands at your rank', () => {
    expect(rankLevel(order, IN)).toBe(4);
    expect(rankLevel(order, { ...IN, rank: 'nomad' })).toBe(0);
  });

  it('stands below the first step without a session, or with a rank it does not draw', () => {
    expect(rankLevel(order, SIGNED_OUT)).toBe(-1);
    expect(rankLevel(order, { ...IN, rank: 'ghost' })).toBe(-1);
  });
});
