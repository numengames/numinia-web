/**
 * «Hazla tuya» for real (cut G) at the store's door: what a browser sends
 * is read strictly, the session alone says who asks, and each of the three
 * routes turns the till's answer into a status. A till older than the store
 * answers 503.
 */

import { describe, expect, it, vi } from 'vitest';
import { DESK_METHODS, NOT_IMPLEMENTED, type AccountDesk, type Asker } from '../accounts';
import { boundAccounts } from '../accounts-source';
import type { Community } from '../communities';
import {
  NOTE_MAX,
  REQUEST_PROBLEMS,
  answerCommunityRequests,
  answerDecide,
  answerMyRequests,
  answerRequestCommunity,
  readDecideBody,
  readRequestBody,
  readRequestId,
  readRequestKind,
  readRequestNote,
} from '../community-requests';

const HOUSE: Asker = { wallet: `0x${'99'.repeat(20)}`, house: true };
const PABLO: Asker = { wallet: `0x${'AB'.repeat(20)}`, house: false };
const ID = `req_${'0'.repeat(31)}1`;

const register = [
  { id: 'numen-games', name: 'Numen Games' },
  { id: 'reset', name: 'Reset' },
] as unknown as readonly Community[];

const quiet = vi.fn();
const json = async (response: Response): Promise<unknown> => response.json();
const post = (body: unknown, type = 'application/json'): Request =>
  new Request('https://numinia.test/api/community-request', {
    method: 'POST',
    headers: { 'content-type': type },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
const url = (query = ''): URL => new URL(`https://numinia.test/api/x${query}`);

const request = {
  id: ID,
  communityId: 'reset',
  wallet: PABLO.wallet.toLowerCase(),
  kind: 'claim',
  note: 'Soy Pablo',
  state: 'open',
  createdAt: '2026-10-17T10:00:00.000Z',
  decidedAt: null,
  decidedBy: null,
};
const entry = { ...request, name: 'Pablo', avatar: null };

const deskWith = (methods: Partial<Record<keyof AccountDesk, () => Promise<unknown>>>) =>
  Object.fromEntries(
    Object.entries(methods).map(([name, answer]) => [name, vi.fn(answer)]),
  ) as unknown as AccountDesk;

const older = (method: string): AccountDesk =>
  deskWith({
    [method]: async () => {
      throw new TypeError(`The desk ${NOT_IMPLEMENTED} "${method}".`);
    },
  } as Partial<Record<keyof AccountDesk, () => Promise<unknown>>>);

/** A bound till with every method a desk needs but this cut's four. */
const oldBinding = (): Record<string, unknown> =>
  Object.fromEntries(
    DESK_METHODS.filter(
      (method) =>
        ![
          'requestCommunity',
          'myCommunityRequests',
          'communityRequests',
          'decideCommunityRequest',
        ].includes(method),
    ).map((method) => [method, vi.fn(async () => ({ ok: true }))]),
  );

describe('reading what a browser sends', () => {
  it('reads a kind, a note and a request id', () => {
    expect(readRequestKind('claim')).toBe('claim');
    expect(readRequestKind('join')).toBe('join');
    for (const bad of ['owner', '', 1, null]) expect(readRequestKind(bad)).toBeUndefined();
    expect(readRequestNote(undefined)).toBeNull();
    expect(readRequestNote('  ')).toBeNull();
    expect(readRequestNote(' hola ')).toBe('hola');
    expect(readRequestNote('a'.repeat(NOTE_MAX))).toHaveLength(NOTE_MAX);
    expect(readRequestNote('a'.repeat(NOTE_MAX + 1))).toBeUndefined();
    expect(readRequestNote('a\u0007b')).toBeUndefined();
    expect(readRequestNote(3)).toBeUndefined();
    expect(readRequestId(ID)).toBe(ID);
    for (const bad of ['req_1', ID.toUpperCase(), 7]) expect(readRequestId(bad)).toBeUndefined();
  });

  it('reads exactly { community, kind, note? } and { request, accept, community }', () => {
    expect(readRequestBody({ community: 'reset', kind: 'claim' })).toEqual({
      community: 'reset',
      kind: 'claim',
      note: null,
    });
    expect(readRequestBody({ community: 'reset', kind: 'join', note: ' hi ' })).toEqual({
      community: 'reset',
      kind: 'join',
      note: 'hi',
    });
    for (const bad of [
      { community: 'reset' },
      { community: 'Reset', kind: 'claim' },
      { community: 'reset', kind: 'owner' },
      { community: 'reset', kind: 'claim', note: 'a'.repeat(281) },
      { community: 'reset', kind: 'claim', house: true },
      [],
      null,
      'x',
    ]) {
      expect(readRequestBody(bad)).toBeNull();
    }
    expect(readDecideBody({ request: ID, accept: true, community: 'reset' })).toEqual({
      request: ID,
      accept: true,
      community: 'reset',
    });
    for (const bad of [
      { request: ID, accept: true },
      { request: 'nope', accept: true, community: 'reset' },
      { request: ID, accept: 'yes', community: 'reset' },
      { request: ID, accept: false, community: 'reset', x: 1 },
      null,
    ]) {
      expect(readDecideBody(bad)).toBeNull();
    }
  });
});

describe('POST /api/community-request', () => {
  it('asks the till for the signed-in wallet, lowercased, and answers the request', async () => {
    const desk = deskWith({ requestCommunity: async () => ({ ok: true, request }) });
    const log = vi.fn();
    const reply = await answerRequestCommunity(
      desk,
      PABLO,
      register,
      post({ community: 'reset', kind: 'claim', note: 'Soy Pablo' }),
      log,
    );
    expect(reply.status).toBe(200);
    expect(await json(reply)).toEqual({ ok: true, request });
    expect(desk.requestCommunity).toHaveBeenCalledWith(
      PABLO.wallet.toLowerCase(),
      'reset',
      'claim',
      'Soy Pablo',
    );
    expect(log).toHaveBeenCalledWith({
      level: 'info',
      kind: 'community-request',
      action: 'claim',
      community: 'reset',
    });
  });

  it('is 401 with no session, 415/400 for a bad body, 404 for a community the register lacks', async () => {
    const desk = deskWith({ requestCommunity: async () => ({ ok: true, request }) });
    const run = (asker: Asker | null, body: Request) =>
      answerRequestCommunity(desk, asker, register, body, quiet);
    expect((await run(null, post({ community: 'reset', kind: 'claim' }))).status).toBe(401);
    expect((await run(PABLO, post('{}', 'text/plain'))).status).toBe(415);
    const bad = await run(PABLO, post({ community: 'reset' }));
    expect(bad.status).toBe(400);
    expect(await json(bad)).toEqual({ error: 'body: { community, kind, note? }' });
    expect((await run(PABLO, post({ community: 'merge', kind: 'join' }))).status).toBe(404);
    expect(desk.requestCommunity).not.toHaveBeenCalled();
  });

  it('turns the till’s refusals into 409 for a member or a titular taken, 400 otherwise', async () => {
    const run = async (problem: string) => {
      const desk = deskWith({
        requestCommunity: async () => ({ ok: false, problems: [problem] }),
      });
      return answerRequestCommunity(
        desk,
        PABLO,
        register,
        post({ community: 'reset', kind: 'claim' }),
        quiet,
      );
    };
    expect((await run(REQUEST_PROBLEMS.member)).status).toBe(409);
    expect((await run(REQUEST_PROBLEMS.hasOwner)).status).toBe(409);
    const other = await run(REQUEST_PROBLEMS.note);
    expect(other.status).toBe(400);
    expect(await json(other)).toEqual({ error: 'refused', problems: [REQUEST_PROBLEMS.note] });
  });

  it('is 503 without a till or with one older than this cut, 502 when it answers oddly', async () => {
    const body = () => post({ community: 'reset', kind: 'claim' });
    expect((await answerRequestCommunity(null, PABLO, register, body(), quiet)).status).toBe(503);
    expect(
      (await answerRequestCommunity(older('requestCommunity'), PABLO, register, body(), quiet))
        .status,
    ).toBe(503);
    const odd = deskWith({ requestCommunity: async () => ({ ok: true }) });
    expect((await answerRequestCommunity(odd, PABLO, register, body(), quiet)).status).toBe(502);
  });
});

describe('GET /api/community-request', () => {
  it('lists the signed-in wallet’s own, for one community or all', async () => {
    const desk = deskWith({ myCommunityRequests: async () => ({ ok: true, requests: [request] }) });
    const reply = await answerMyRequests(desk, PABLO, url('?comunidad=reset'), quiet);
    expect(reply.status).toBe(200);
    expect(await json(reply)).toEqual({ ok: true, requests: [request] });
    expect(desk.myCommunityRequests).toHaveBeenCalledWith(PABLO.wallet.toLowerCase(), 'reset');
    await answerMyRequests(desk, PABLO, url(), quiet);
    expect(desk.myCommunityRequests).toHaveBeenLastCalledWith(PABLO.wallet.toLowerCase(), null);
    expect((await answerMyRequests(desk, PABLO, url('?comunidad=Reset'), quiet)).status).toBe(400);
    expect((await answerMyRequests(desk, null, url(), quiet)).status).toBe(401);
    expect((await answerMyRequests(null, PABLO, url(), quiet)).status).toBe(503);
    expect((await answerMyRequests(older('myCommunityRequests'), PABLO, url(), quiet)).status).toBe(
      503,
    );
    const refusing = deskWith({
      myCommunityRequests: async () => ({ ok: false, problems: [REQUEST_PROBLEMS.community] }),
    });
    expect((await answerMyRequests(refusing, PABLO, url(), quiet)).status).toBe(400);
  });
});

describe('GET /api/admin/community-requests', () => {
  it('asks the till with the session’s house flag; every community is for the house alone', async () => {
    const desk = deskWith({ communityRequests: async () => ({ ok: true, requests: [entry] }) });
    const reply = await answerCommunityRequests(desk, PABLO, url('?comunidad=reset'), quiet);
    expect(reply.status).toBe(200);
    expect(await json(reply)).toEqual({ ok: true, requests: [entry] });
    expect(desk.communityRequests).toHaveBeenCalledWith(PABLO.wallet.toLowerCase(), false, 'reset');
    expect((await answerCommunityRequests(desk, HOUSE, url(), quiet)).status).toBe(200);
    expect(desk.communityRequests).toHaveBeenLastCalledWith(HOUSE.wallet, true, null);
    expect((await answerCommunityRequests(desk, PABLO, url(), quiet)).status).toBe(403);
    expect((await answerCommunityRequests(desk, null, url('?comunidad=reset'), quiet)).status).toBe(
      403,
    );
    expect(desk.communityRequests).toHaveBeenCalledTimes(2);
  });

  it('is 403 when the till says the door is not theirs, 503 without a till', async () => {
    const desk = deskWith({
      communityRequests: async () => ({ ok: false, problems: [REQUEST_PROBLEMS.notAllowed] }),
    });
    const reply = await answerCommunityRequests(desk, PABLO, url('?comunidad=reset'), quiet);
    expect(reply.status).toBe(403);
    expect(await json(reply)).toEqual({
      error: 'refused',
      problems: [REQUEST_PROBLEMS.notAllowed],
    });
    expect((await answerCommunityRequests(null, HOUSE, url(), quiet)).status).toBe(503);
    expect(
      (await answerCommunityRequests(older('communityRequests'), HOUSE, url(), quiet)).status,
    ).toBe(503);
    expect((await answerCommunityRequests(desk, HOUSE, url('?comunidad=Bad'), quiet)).status).toBe(
      400,
    );
  });
});

describe('POST /api/admin/community-request/decide', () => {
  const decided = {
    ...request,
    state: 'accepted',
    decidedAt: request.createdAt,
    decidedBy: HOUSE.wallet,
  };

  it('passes the decision and the register’s name of the community to the till', async () => {
    const desk = deskWith({ decideCommunityRequest: async () => ({ ok: true, request: decided }) });
    const log = vi.fn();
    const reply = await answerDecide(
      desk,
      HOUSE,
      register,
      post({ request: ID, accept: true, community: 'reset' }),
      log,
    );
    expect(reply.status).toBe(200);
    expect(await json(reply)).toEqual({ ok: true, request: decided });
    expect(desk.decideCommunityRequest).toHaveBeenCalledWith(HOUSE.wallet, ID, true, true, 'Reset');
    expect(log).toHaveBeenCalledWith({
      level: 'info',
      kind: 'community-request',
      action: 'claim-accepted',
      community: 'reset',
    });
    await answerDecide(
      desk,
      PABLO,
      register,
      post({ request: ID, accept: false, community: 'reset' }),
      log,
    );
    expect(desk.decideCommunityRequest).toHaveBeenLastCalledWith(
      PABLO.wallet.toLowerCase(),
      ID,
      false,
      false,
      'Reset',
    );
    expect(log).toHaveBeenLastCalledWith(expect.objectContaining({ action: 'claim-declined' }));
  });

  it('is 403 with no session, 400 for a bad body, 404 for a community the register lacks', async () => {
    const desk = deskWith({ decideCommunityRequest: async () => ({ ok: true, request: decided }) });
    const run = (asker: Asker | null, body: unknown) =>
      answerDecide(desk, asker, register, post(body), quiet);
    expect((await run(null, { request: ID, accept: true, community: 'reset' })).status).toBe(403);
    expect((await run(HOUSE, { request: ID, accept: true })).status).toBe(400);
    expect((await run(HOUSE, { request: ID, accept: true, community: 'merge' })).status).toBe(404);
    expect(desk.decideCommunityRequest).not.toHaveBeenCalled();
    expect(
      (await answerDecide(desk, HOUSE, register, post('{}', 'text/plain'), quiet)).status,
    ).toBe(415);
    expect(
      (
        await answerDecide(
          older('decideCommunityRequest'),
          HOUSE,
          register,
          post({ request: ID, accept: true, community: 'reset' }),
          quiet,
        )
      ).status,
    ).toBe(503);
  });

  it('turns the till’s refusals into 403, 404, 409 or 400 by their words; 503 without a till', async () => {
    const run = async (problem: string) => {
      const desk = deskWith({
        decideCommunityRequest: async () => ({ ok: false, problems: [problem] }),
      });
      return answerDecide(
        desk,
        HOUSE,
        register,
        post({ request: ID, accept: true, community: 'reset' }),
        quiet,
      );
    };
    expect((await run(REQUEST_PROBLEMS.notAllowed)).status).toBe(403);
    expect((await run(REQUEST_PROBLEMS.noSuchRequest)).status).toBe(404);
    expect((await run(REQUEST_PROBLEMS.decided)).status).toBe(409);
    expect((await run(REQUEST_PROBLEMS.noOrganization)).status).toBe(400);
    expect(
      (
        await answerDecide(
          null,
          HOUSE,
          register,
          post({ request: ID, accept: true, community: 'reset' }),
          quiet,
        )
      ).status,
    ).toBe(503);
  });
});

describe('a till older than the store (boundAccounts)', () => {
  it('is still a desk without the four methods, and passes each through to a till that has them', async () => {
    const old = boundAccounts(oldBinding());
    expect(old).not.toBeNull();
    await expect(old?.requestCommunity(PABLO.wallet, 'reset', 'claim', null)).rejects.toThrow(
      /does not implement/,
    );
    await expect(old?.myCommunityRequests(PABLO.wallet)).rejects.toThrow(/does not implement/);
    await expect(old?.communityRequests(HOUSE.wallet, true)).rejects.toThrow(/does not implement/);
    await expect(old?.decideCommunityRequest(HOUSE.wallet, ID, true)).rejects.toThrow(
      /does not implement/,
    );
    const requestCommunity = vi.fn(async () => ({ ok: true, request }));
    const myCommunityRequests = vi.fn(async () => ({ ok: true, requests: [request] }));
    const communityRequests = vi.fn(async () => ({ ok: true, requests: [entry] }));
    const decideCommunityRequest = vi.fn(async () => ({ ok: true, request }));
    const desk = boundAccounts({
      ...oldBinding(),
      requestCommunity,
      myCommunityRequests,
      communityRequests,
      decideCommunityRequest,
    });
    await desk?.requestCommunity(PABLO.wallet, 'reset', 'claim', 'hi');
    expect(requestCommunity).toHaveBeenCalledWith(PABLO.wallet, 'reset', 'claim', 'hi');
    await desk?.myCommunityRequests(PABLO.wallet, 'reset');
    expect(myCommunityRequests).toHaveBeenCalledWith(PABLO.wallet, 'reset');
    await desk?.communityRequests(HOUSE.wallet, true, null);
    expect(communityRequests).toHaveBeenCalledWith(HOUSE.wallet, true, null);
    await desk?.decideCommunityRequest(HOUSE.wallet, ID, true, true, 'Reset');
    expect(decideCommunityRequest).toHaveBeenCalledWith(HOUSE.wallet, ID, true, true, 'Reset');
  });
});
