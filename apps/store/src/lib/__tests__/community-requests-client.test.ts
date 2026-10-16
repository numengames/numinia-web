/**
 * «Hazla tuya» in the browser (cut G): the strip reads where the person
 * stands and decides its face; the lists read the open requests and decide;
 * every answer is read strictly and every failure has a name.
 */

import { describe, expect, it, vi } from 'vitest';
import {
  DECIDE_API,
  NOTE_MAX,
  REQUEST_API,
  REQUESTS_ADMIN_API,
  askedAt,
  askerOf,
  decide,
  loadMine,
  loadOpen,
  noteToSend,
  readEntry,
  readProblems,
  readRequest,
  sendRequest,
  stripFace,
  withWho,
} from '../community-requests-client';

const WALLET = `0x${'ab'.repeat(20)}`;
const request = {
  id: `req_${'0'.repeat(31)}1`,
  communityId: 'reset',
  wallet: WALLET,
  kind: 'claim',
  note: 'Soy Pablo',
  state: 'open',
  createdAt: '2026-10-17T10:00:00.000Z',
  decidedAt: null,
  decidedBy: null,
} as const;
const entry = { ...request, name: 'Pablo', avatar: null };

const reply = (status: number, body: unknown = null): Response =>
  new Response(body === null ? '' : JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
const fetching = (...answers: Response[]): typeof fetch => {
  const queue = [...answers];
  return vi.fn(async () => queue.shift() ?? reply(500)) as unknown as typeof fetch;
};
const failing: typeof fetch = vi.fn(async () => {
  throw new TypeError('offline');
}) as unknown as typeof fetch;

describe('reading what the store answers', () => {
  it('reads a request and an entry, and refuses any other shape', () => {
    expect(readRequest(request)).toEqual(request);
    expect(readEntry(entry)).toEqual(entry);
    expect(readEntry({ ...entry, avatar: '/caras/a.png' })?.avatar).toBe('/caras/a.png');
    for (const bad of [
      null,
      [],
      { ...request, id: 'nope' },
      { ...request, communityId: 'Reset' },
      { ...request, wallet: WALLET.toUpperCase() },
      { ...request, kind: 'owner' },
      { ...request, state: 'maybe' },
      { ...request, createdAt: 1 },
      { ...request, note: 3 },
      { ...request, decidedAt: 3 },
      { ...request, decidedBy: 3 },
    ]) {
      expect(readRequest(bad)).toBeNull();
    }
    expect(readEntry(null)).toBeNull();
    expect(readEntry({ ...entry, name: 1 })).toBeNull();
    expect(readEntry({ ...entry, avatar: 1 })).toBeNull();
    expect(readProblems({ problems: ['a', 1, 'b'] })).toEqual(['a', 'b']);
    expect(readProblems(null)).toEqual([]);
  });

  it('names the asker, fills in «{who}», says when', () => {
    expect(askerOf(entry)).toBe('Pablo');
    expect(askerOf({ ...entry, name: null })).toBe('0xabab…abab');
    expect(withWho('Aceptar la petición de {who}', 'Pablo')).toBe('Aceptar la petición de Pablo');
    expect(askedAt(request.createdAt, 'es', 'UTC')).toMatch(/2026/);
    expect(askedAt('nope', 'es')).toBe('—');
  });
});

describe('the strip', () => {
  it('reads the person’s own requests with their standing, and names each failure', async () => {
    const standing = { member: false, hasOwner: true };
    const fetchFn = fetching(reply(200, { ok: true, requests: [request], standing }));
    expect(await loadMine(fetchFn, 'reset')).toEqual({
      at: 'ready',
      mine: { requests: [request], standing },
    });
    expect(fetchFn).toHaveBeenCalledWith(`${REQUEST_API}?comunidad=reset`, expect.anything());
    expect(await loadMine(fetching(reply(401)), 'reset')).toEqual({ at: 'signed-out' });
    expect(await loadMine(fetching(reply(503)), 'reset')).toEqual({ at: 'unavailable' });
    expect(await loadMine(fetching(reply(200, { ok: true, requests: [] })), 'reset')).toEqual({
      at: 'failed',
    });
    expect(
      await loadMine(
        fetching(reply(200, { ok: true, requests: [], standing: { member: 'yes' } })),
        'reset',
      ),
    ).toEqual({ at: 'failed' });
    expect(await loadMine(fetching(reply(200, { ok: false, standing })), 'reset')).toEqual({
      at: 'failed',
    });
    expect(
      await loadMine(fetching(reply(200, { ok: true, requests: [{}], standing })), 'reset'),
    ).toEqual({ at: 'failed' });
    expect(await loadMine(fetching(reply(500)), 'reset')).toEqual({ at: 'failed' });
    expect(await loadMine(failing, 'reset')).toEqual({ at: 'failed' });
  });

  it('shows one face: nothing to a member, sent while open, a claim or a join otherwise', () => {
    const nobody = { member: false, hasOwner: false };
    expect(stripFace({ requests: [], standing: nobody })).toEqual({ face: 'claim' });
    expect(stripFace({ requests: [], standing: { member: false, hasOwner: true } })).toEqual({
      face: 'join',
    });
    expect(stripFace({ requests: [request], standing: { member: true, hasOwner: true } })).toEqual({
      face: 'none',
    });
    expect(stripFace({ requests: [request], standing: nobody })).toEqual({
      face: 'sent',
      kind: 'claim',
    });
    const join = { ...request, kind: 'join' as const };
    expect(
      stripFace({ requests: [join, { ...request, state: 'declined' }], standing: nobody }),
    ).toEqual({ face: 'sent', kind: 'join' });
    expect(stripFace({ requests: [join, request], standing: nobody })).toEqual({
      face: 'sent',
      kind: 'claim',
    });
    expect(stripFace({ requests: [{ ...request, state: 'declined' }], standing: nobody })).toEqual({
      face: 'claim',
    });
  });

  it('sends the ask with a trimmed note, or none, and refuses a note that cannot go', async () => {
    expect(noteToSend('  ')).toBeNull();
    expect(noteToSend(' hola ')).toBe('hola');
    expect(noteToSend('a'.repeat(NOTE_MAX))).toHaveLength(NOTE_MAX);
    expect(noteToSend('a'.repeat(NOTE_MAX + 1))).toBeUndefined();
    expect(noteToSend('a\nb')).toBeUndefined();
    const fetchFn = fetching(reply(200, { ok: true, request }));
    expect(await sendRequest(fetchFn, 'reset', 'claim', ' Soy Pablo ')).toEqual({
      ok: true,
      request,
    });
    expect(fetchFn).toHaveBeenCalledWith(
      REQUEST_API,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ community: 'reset', kind: 'claim', note: 'Soy Pablo' }),
      }),
    );
    await sendRequest(fetchFn, 'reset', 'join', '');
    expect(fetchFn).toHaveBeenLastCalledWith(
      REQUEST_API,
      expect.objectContaining({ body: JSON.stringify({ community: 'reset', kind: 'join' }) }),
    );
    expect(await sendRequest(fetchFn, 'reset', 'claim', 'a\u0007')).toEqual({
      ok: false,
      why: 'note',
    });
    expect(await sendRequest(fetching(reply(401)), 'reset', 'claim', '')).toEqual({
      ok: false,
      why: 'signed-out',
    });
    expect(await sendRequest(fetching(reply(503)), 'reset', 'claim', '')).toEqual({
      ok: false,
      why: 'unavailable',
    });
    expect(
      await sendRequest(fetching(reply(409, { error: 'refused' })), 'reset', 'claim', ''),
    ).toEqual({ ok: false, why: 'other' });
    expect(await sendRequest(fetching(reply(200, { ok: true })), 'reset', 'claim', '')).toEqual({
      ok: false,
      why: 'other',
    });
    expect(await sendRequest(failing, 'reset', 'claim', '')).toEqual({ ok: false, why: 'other' });
  });
});

describe('the lists', () => {
  it('reads the open requests of one community or of every one', async () => {
    const fetchFn = fetching(reply(200, { ok: true, requests: [entry] }));
    expect(await loadOpen(fetchFn, 'reset')).toEqual({ at: 'ready', requests: [entry] });
    expect(fetchFn).toHaveBeenCalledWith(
      `${REQUESTS_ADMIN_API}?comunidad=reset`,
      expect.anything(),
    );
    await loadOpen(fetchFn, null);
    expect(fetchFn).toHaveBeenLastCalledWith(REQUESTS_ADMIN_API, expect.anything());
    expect(await loadOpen(fetching(reply(403)), null)).toEqual({ at: 'forbidden' });
    expect(await loadOpen(fetching(reply(401)), null)).toEqual({ at: 'forbidden' });
    expect(await loadOpen(fetching(reply(503)), null)).toEqual({ at: 'unavailable' });
    expect(await loadOpen(fetching(reply(200, { ok: true, requests: [request] })), null)).toEqual({
      at: 'failed',
    });
    expect(await loadOpen(fetching(reply(500)), null)).toEqual({ at: 'failed' });
    expect(await loadOpen(failing, null)).toEqual({ at: 'failed' });
  });

  it('decides, naming the community, and brings back the till’s words when refused', async () => {
    const decided = {
      ...request,
      state: 'accepted',
      decidedAt: request.createdAt,
      decidedBy: WALLET,
    };
    const fetchFn = fetching(reply(200, { ok: true, request: decided }));
    expect(await decide(fetchFn, request.id, true, 'reset')).toEqual({
      ok: true,
      request: decided,
    });
    expect(fetchFn).toHaveBeenCalledWith(
      DECIDE_API,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ request: request.id, accept: true, community: 'reset' }),
      }),
    );
    expect(await decide(fetching(reply(503)), request.id, true, 'reset')).toEqual({
      ok: false,
      why: 'unavailable',
      problems: [],
    });
    expect(
      await decide(
        fetching(reply(403, { error: 'refused', problems: ['x'] })),
        request.id,
        false,
        'reset',
      ),
    ).toEqual({ ok: false, why: 'other', problems: ['x'] });
    expect(
      await decide(fetching(new Response('nope', { status: 500 })), request.id, true, 'reset'),
    ).toEqual({
      ok: false,
      why: 'other',
      problems: [],
    });
    expect(await decide(fetching(reply(200, { ok: true })), request.id, true, 'reset')).toEqual({
      ok: false,
      why: 'other',
      problems: [],
    });
    expect(await decide(failing, request.id, true, 'reset')).toEqual({
      ok: false,
      why: 'other',
      problems: [],
    });
  });
});
