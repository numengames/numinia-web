/**
 * «Avisos» (cut J) in the browser: the route's answer is read strictly, a
 * fetch never throws, and «seen» is the newest moment kept in storage.
 */

import { describe, expect, it, vi } from 'vitest';
import { loadNotices, markSeen, readAnswer, readRow, readSeen, SEEN_KEY } from '../notices-client';

const row = {
  id: 'world:vic',
  kind: 'world' as const,
  at: '2026-10-17T12:00:00.000Z',
  text: { before: 'Hay ', subject: '5 personas', after: ' en Vic.' },
  when: 'hace 3 min',
  href: '/communities/vic/',
  actions: [{ id: 'enter' as const, href: 'https://vic.numinia.com/' }],
};

describe('readRow / readAnswer', () => {
  it('reads a row with its actions, a link or a decision', () => {
    expect(readRow(row)).toEqual(row);
    const decision = {
      ...row,
      href: undefined,
      actions: [
        { id: 'accept', request: 'req_1', community: 'vic' },
        { id: 'later', request: 'req_1', community: 'vic' },
      ],
    };
    expect(readRow(decision)).toEqual({ ...decision, href: undefined });
    expect(readRow({ ...row, actions: undefined })).not.toHaveProperty('actions');
    expect(readRow({ ...row, actions: [] })).not.toHaveProperty('actions');
  });

  it('refuses anything out of shape', () => {
    for (const bad of [
      null,
      'x',
      [],
      { ...row, id: 1 },
      { ...row, kind: 'odd' },
      { ...row, at: 1 },
      { ...row, when: 1 },
      { ...row, text: 'x' },
      { ...row, text: { before: 1, subject: 'x', after: '' } },
      { ...row, href: 1 },
      { ...row, actions: 'x' },
      { ...row, actions: [null] },
      { ...row, actions: [{ id: 'enter' }] },
      { ...row, actions: [{ id: 'accept', request: 'x' }] },
      { ...row, actions: [{ id: 'odd', href: 'x' }] },
    ]) {
      expect(readRow(bad)).toBeNull();
    }
  });

  it('reads the answer, or refuses it', () => {
    expect(readAnswer({ ok: true, notices: [row], unseen: 1 })).toEqual({
      ok: true,
      notices: [row],
      unseen: 1,
    });
    expect(readAnswer({ ok: true, notices: [], unseen: 0 })).toEqual({
      ok: true,
      notices: [],
      unseen: 0,
    });
    for (const bad of [
      null,
      { ok: false },
      { ok: true, notices: 'x', unseen: 0 },
      { ok: true, notices: [], unseen: 'x' },
      { ok: true, notices: [null], unseen: 0 },
    ]) {
      expect(readAnswer(bad)).toBeNull();
    }
  });
});

describe('loadNotices', () => {
  const json = (status: number, body: unknown): Response =>
    new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

  it('asks with the locale and the moment last seen, and reads the answer', async () => {
    const fetchFn = vi.fn(async () => json(200, { ok: true, notices: [row], unseen: 1 }));
    const loaded = await loadNotices(fetchFn, 'es', '2026-10-16T00:00:00.000Z');
    expect(loaded).toEqual({ ok: true, answer: { ok: true, notices: [row], unseen: 1 } });
    expect(fetchFn).toHaveBeenCalledWith(
      '/api/notices?locale=es&since=2026-10-16T00%3A00%3A00.000Z',
      {
        headers: { accept: 'application/json' },
      },
    );
    await loadNotices(fetchFn, 'en', null);
    expect(fetchFn).toHaveBeenLastCalledWith('/api/notices?locale=en', expect.anything());
  });

  it('says signed out on 401, other on anything else, and never throws', async () => {
    expect(await loadNotices(async () => json(401, { error: 'sign-in' }), 'es', null)).toEqual({
      ok: false,
      why: 'signed-out',
    });
    expect(await loadNotices(async () => json(503, {}), 'es', null)).toEqual({
      ok: false,
      why: 'other',
    });
    expect(await loadNotices(async () => json(200, { ok: false }), 'es', null)).toEqual({
      ok: false,
      why: 'other',
    });
    expect(
      await loadNotices(async () => new Response('nonsense', { status: 200 }), 'es', null),
    ).toEqual({ ok: false, why: 'other' });
    expect(
      await loadNotices(
        async () => {
          throw new Error('offline');
        },
        'es',
        null,
      ),
    ).toEqual({ ok: false, why: 'other' });
  });
});

describe('readSeen / markSeen', () => {
  const memory = (): Pick<Storage, 'getItem' | 'setItem'> & { map: Map<string, string> } => {
    const map = new Map<string, string>();
    return {
      map,
      getItem: (key) => map.get(key) ?? null,
      setItem: (key, value) => void map.set(key, value),
    };
  };

  it('keeps the newest moment of the list and reads it back; an empty list keeps what was', () => {
    const store = memory();
    expect(readSeen(store)).toBeNull();
    expect(markSeen(store, [row, { ...row, id: 'b', at: '2026-10-17T13:00:00.000Z' }])).toBe(
      '2026-10-17T13:00:00.000Z',
    );
    expect(store.map.get(SEEN_KEY)).toBe('2026-10-17T13:00:00.000Z');
    expect(readSeen(store)).toBe('2026-10-17T13:00:00.000Z');
    expect(markSeen(store, [])).toBe('2026-10-17T13:00:00.000Z');
  });

  it('reads nonsense, no storage or a closed storage as nothing seen', () => {
    const store = memory();
    store.map.set(SEEN_KEY, 'nonsense');
    expect(readSeen(store)).toBeNull();
    expect(readSeen(null)).toBeNull();
    expect(markSeen(null, [row])).toBe(row.at);
    const closed: Pick<Storage, 'getItem' | 'setItem'> = {
      getItem: () => {
        throw new Error('closed');
      },
      setItem: () => {
        throw new Error('closed');
      },
    };
    expect(readSeen(closed)).toBeNull();
    expect(markSeen(closed, [row])).toBe(row.at);
  });
});
