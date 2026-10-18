/**
 * Card t_371c917d (2026-10-18): the words of a community's house card edit —
 * who may send it, what shape a body must have, and how the till's answer
 * becomes a response. Mirrors lib/__tests__/worlds-homes.test.ts.
 */

import { describe, expect, it, vi } from 'vitest';
import { DESK_METHODS, type AccountDesk, type Asker } from '../accounts';
import { boundAccounts } from '../accounts-source';
import {
  COMMUNITY_FIELDS_PROBLEMS,
  answerCommunityFields,
  answerEditCommunityFields,
  communityFieldName,
  communityFieldSummary,
  readEditBody,
} from '../community-fields';

const HOUSE: Asker = { wallet: `0x${'99'.repeat(20)}`, house: true };
const NOMAD: Asker = { wallet: `0x${'ab'.repeat(20)}`, house: false };

const answering = (value: unknown) => vi.fn(async () => value);
const quiet = vi.fn();
const json = async (response: Response): Promise<unknown> => response.json();

function fakeDesk(overrides: Partial<Record<keyof AccountDesk, unknown>> = {}): AccountDesk {
  return {
    editCommunityFields: answering({
      ok: true,
      fields: {
        communityId: 'vic',
        name: 'Vic',
        summary: null,
        editedBy: HOUSE.wallet,
        editedAt: '2026-10-18T13:00:00.000Z',
      },
    }),
    communityFields: answering({ ok: true, fields: null }),
    ...overrides,
  } as AccountDesk;
}

function post(body: unknown): Request {
  return new Request('https://numinia.com/api/admin/community-fields/edit', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

describe('reading the name, the summary and the body', () => {
  it('a name is 1 to 80 characters, with no leading or trailing blank', () => {
    expect(communityFieldName('Vic')).toBe('Vic');
    expect(communityFieldName('a'.repeat(80))).toHaveLength(80);
    for (const bad of ['', ' Vic', 'Vic ', 'a'.repeat(81), 'Vic\u0007', 7, null, undefined]) {
      expect(communityFieldName(bad)).toBeUndefined();
    }
  });

  it('a summary is 1 to 600 characters, with no leading or trailing blank', () => {
    expect(communityFieldSummary('Un encuentro')).toBe('Un encuentro');
    expect(communityFieldSummary('a'.repeat(600))).toHaveLength(600);
    for (const bad of ['', ' hola', 'hola ', 'a'.repeat(601), 7, null]) {
      expect(communityFieldSummary(bad)).toBeUndefined();
    }
  });

  it('reads { community, name?, summary? }, at least one, nothing else', () => {
    expect(readEditBody({ community: 'vic', name: 'Vic' })).toEqual({
      community: 'vic',
      name: 'Vic',
    });
    expect(readEditBody({ community: 'vic', summary: 'Hola' })).toEqual({
      community: 'vic',
      summary: 'Hola',
    });
    expect(readEditBody({ community: 'vic', name: 'Vic', summary: 'Hola' })).toEqual({
      community: 'vic',
      name: 'Vic',
      summary: 'Hola',
    });
    for (const bad of [
      null,
      [],
      {},
      { community: 'vic' },
      { community: 'Vic', name: 'Vic' },
      { community: 'vic', name: '' },
      { community: 'vic', summary: '' },
      { community: 'vic', name: 'Vic', other: 1 },
      { community: 'vic', name: 1 },
    ]) {
      expect(readEditBody(bad)).toBeNull();
    }
  });
});

describe('POST /api/admin/community-fields/edit', () => {
  it('refuses with 403 whoever is not the house, before reading the body', async () => {
    const desk = fakeDesk();
    for (const asker of [null, NOMAD]) {
      const out = await answerEditCommunityFields(desk, asker, post('not json'), quiet);
      expect(out.status).toBe(403);
    }
    expect(desk.editCommunityFields).not.toHaveBeenCalled();
  });

  it('answers 400 for a body out of shape, without calling the till', async () => {
    const desk = fakeDesk();
    expect((await answerEditCommunityFields(desk, HOUSE, post('{oops'), quiet)).status).toBe(400);
    expect(
      (await answerEditCommunityFields(desk, HOUSE, post({ community: 'vic' }), quiet)).status,
    ).toBe(400);
    expect(desk.editCommunityFields).not.toHaveBeenCalled();
  });

  it('edits as the house with its own wallet, and answers the new fields', async () => {
    const desk = fakeDesk();
    const out = await answerEditCommunityFields(
      desk,
      HOUSE,
      post({ community: 'vic', name: 'Vic' }),
      quiet,
    );
    expect(out.status).toBe(200);
    expect(await json(out)).toMatchObject({ ok: true, fields: { name: 'Vic' } });
    expect(desk.editCommunityFields).toHaveBeenCalledWith(HOUSE.wallet, true, 'vic', {
      name: 'Vic',
    });
  });

  it('says 503 without a till, 502 when it fails or answers oddly', async () => {
    const body = { community: 'vic', name: 'Vic' };
    expect((await answerEditCommunityFields(null, HOUSE, post(body), quiet)).status).toBe(503);
    const broken = fakeDesk({
      editCommunityFields: vi.fn().mockRejectedValue(new Error('boom')),
    });
    expect((await answerEditCommunityFields(broken, HOUSE, post(body), quiet)).status).toBe(502);
    const odd = fakeDesk({ editCommunityFields: answering({ ok: true, fields: 'nope' }) });
    expect((await answerEditCommunityFields(odd, HOUSE, post(body), quiet)).status).toBe(502);
  });

  it('turns the till’s refusals into 403, 409 or 400', async () => {
    const body = { community: 'vic', name: 'Vic' };
    const notHouse = fakeDesk({
      editCommunityFields: answering({ ok: false, problems: [COMMUNITY_FIELDS_PROBLEMS.notHouse] }),
    });
    expect((await answerEditCommunityFields(notHouse, HOUSE, post(body), quiet)).status).toBe(403);
    const hasOwner = fakeDesk({
      editCommunityFields: answering({ ok: false, problems: [COMMUNITY_FIELDS_PROBLEMS.hasOwner] }),
    });
    expect((await answerEditCommunityFields(hasOwner, HOUSE, post(body), quiet)).status).toBe(409);
    const other = fakeDesk({ editCommunityFields: answering({ ok: false, problems: ['other'] }) });
    const out = await answerEditCommunityFields(other, HOUSE, post(body), quiet);
    expect(out.status).toBe(400);
    expect(await json(out)).toEqual({ error: 'refused', problems: ['other'] });
  });
});

describe('GET /api/community-fields', () => {
  it('answers 400 for a bad community id, else the till’s override — or 503/502', async () => {
    const desk = fakeDesk();
    expect(
      (
        await answerCommunityFields(
          desk,
          new URL('https://numinia.com/api/community-fields'),
          quiet,
        )
      ).status,
    ).toBe(400);
    const out = await answerCommunityFields(
      desk,
      new URL('https://numinia.com/api/community-fields?comunidad=vic'),
      quiet,
    );
    expect(out.status).toBe(200);
    expect(await json(out)).toEqual({ ok: true, fields: null });
    expect(
      (
        await answerCommunityFields(
          null,
          new URL('https://numinia.com/api/community-fields?comunidad=vic'),
          quiet,
        )
      ).status,
    ).toBe(503);
    const broken = fakeDesk({ communityFields: vi.fn().mockRejectedValue(new Error('boom')) });
    expect(
      (
        await answerCommunityFields(
          broken,
          new URL('https://numinia.com/api/community-fields?comunidad=vic'),
          quiet,
        )
      ).status,
    ).toBe(502);
    const refusing = fakeDesk({ communityFields: answering({ ok: false, problems: ['other'] }) });
    expect(
      (
        await answerCommunityFields(
          refusing,
          new URL('https://numinia.com/api/community-fields?comunidad=vic'),
          quiet,
        )
      ).status,
    ).toBe(400);
  });
});

/** A bound till with every method a desk needs but this card's two. */
const oldBinding = (): Record<string, unknown> =>
  Object.fromEntries(
    DESK_METHODS.filter(
      (method) => !['editCommunityFields', 'communityFields'].includes(method),
    ).map((method) => [method, vi.fn()]),
  );

describe('a till older than the store (boundAccounts)', () => {
  it('is still a desk without the card’s two methods, and passes each through once the till has them', async () => {
    const old = boundAccounts(oldBinding());
    expect(old).not.toBeNull();
    await expect(
      old?.editCommunityFields(HOUSE.wallet, true, 'vic', { name: 'Vic' }),
    ).rejects.toThrow(/does not implement/);
    await expect(old?.communityFields('vic')).rejects.toThrow(/does not implement/);
    const editCommunityFields = vi.fn(async () => ({
      ok: true,
      fields: {
        communityId: 'vic',
        name: 'Vic',
        summary: null,
        editedBy: HOUSE.wallet,
        editedAt: 'now',
      },
    }));
    const communityFields = vi.fn(async () => ({ ok: true, fields: null }));
    const desk = boundAccounts({ ...oldBinding(), editCommunityFields, communityFields });
    await desk?.editCommunityFields(HOUSE.wallet, true, 'vic', { name: 'Vic' });
    expect(editCommunityFields).toHaveBeenCalledWith(HOUSE.wallet, true, 'vic', { name: 'Vic' });
    await desk?.communityFields('vic');
    expect(communityFields).toHaveBeenCalledWith('vic');
  });
});
