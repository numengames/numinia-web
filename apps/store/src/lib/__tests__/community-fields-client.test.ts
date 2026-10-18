/**
 * Card t_371c917d (2026-10-18) in the browser: loading and saving a
 * community's house override, and the Oracle's one-step join (claim,
 * chained into its own acceptance). Mirrors
 * lib/__tests__/community-requests-client.test.ts.
 */

import { describe, expect, it, vi } from 'vitest';
import { loadFields, oracleClaim, saveFields } from '../community-fields-client';

const request = {
  id: `req_${'0'.repeat(31)}1`,
  communityId: 'vic',
  wallet: `0x${'99'.repeat(20)}`,
  kind: 'claim',
  note: null,
  state: 'open',
  createdAt: '2026-10-18T13:00:00.000Z',
  decidedAt: null,
  decidedBy: null,
} as const;

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

describe('loadFields', () => {
  it('reads the community’s override, or null for anything that is not that', async () => {
    const fetchFn = fetching(reply(200, { ok: true, fields: { name: 'Vic', summary: null } }));
    expect(await loadFields(fetchFn, 'vic')).toEqual({ name: 'Vic', summary: null });
    expect(fetchFn).toHaveBeenCalledWith('/api/community-fields?comunidad=vic', expect.anything());
    expect(await loadFields(fetching(reply(200, { ok: true, fields: null })), 'vic')).toBeNull();
    expect(await loadFields(fetching(reply(503)), 'vic')).toBeNull();
    expect(
      await loadFields(fetching(reply(200, { ok: true, fields: { name: 1 } })), 'vic'),
    ).toBeNull();
    expect(await loadFields(fetching(reply(200, { ok: true, fields: 'nope' })), 'vic')).toBeNull();
    expect(
      await loadFields(
        fetching(reply(200, { ok: true, fields: { name: null, summary: 1 } })),
        'vic',
      ),
    ).toBeNull();
    expect(await loadFields(fetching(reply(200, { ok: false })), 'vic')).toBeNull();
    expect(await loadFields(failing, 'vic')).toBeNull();
  });
});

describe('saveFields', () => {
  it('sends the edit and reads the saved fields, or the till’s problems', async () => {
    const fetchFn = fetching(reply(200, { ok: true, fields: { name: 'Vic', summary: null } }));
    expect(await saveFields(fetchFn, 'vic', { name: 'Vic' })).toEqual({
      ok: true,
      fields: { name: 'Vic', summary: null },
    });
    expect(fetchFn).toHaveBeenCalledWith(
      '/api/admin/community-fields/edit',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ community: 'vic', name: 'Vic' }),
      }),
    );
    expect(
      await saveFields(fetching(reply(409, { error: 'refused', problems: ['x'] })), 'vic', {
        name: 'Vic',
      }),
    ).toEqual({ ok: false, problems: ['x'] });
    expect(
      await saveFields(fetching(reply(200, { ok: true, fields: null })), 'vic', { name: 'Vic' }),
    ).toEqual({ ok: false, problems: [] });
    expect(await saveFields(failing, 'vic', { name: 'Vic' })).toEqual({ ok: false, problems: [] });
    expect(await saveFields(fetching(reply(500)), 'vic', { name: 'Vic' })).toEqual({
      ok: false,
      problems: [],
    });
  });
});

describe('oracleClaim: the one-step «Añadirme como Titular»', () => {
  it('claims and immediately accepts its own claim', async () => {
    const decided = {
      ...request,
      state: 'accepted',
      decidedAt: request.createdAt,
      decidedBy: request.wallet,
    };
    const fetchFn = fetching(
      reply(200, { ok: true, request }),
      reply(200, { ok: true, request: decided }),
    );
    expect(await oracleClaim(fetchFn, 'vic')).toEqual({ ok: true });
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it('says why when the claim, or the decision, does not go through', async () => {
    expect(await oracleClaim(fetching(reply(401)), 'vic')).toEqual({
      ok: false,
      why: 'signed-out',
      problems: [],
    });
    expect(await oracleClaim(fetching(reply(503)), 'vic')).toEqual({
      ok: false,
      why: 'other',
      problems: [],
    });
    expect(
      await oracleClaim(
        fetching(
          reply(200, { ok: true, request }),
          reply(403, { error: 'refused', problems: ['x'] }),
        ),
        'vic',
      ),
    ).toEqual({ ok: false, why: 'other', problems: ['x'] });
  });
});
