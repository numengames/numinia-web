/**
 * Card t_371c917d (2026-10-18) in the fixture desk: while a community has
 * no titular yet, the house renames it and fills in its summary; once it
 * does have one, the edit is refused. Mirrors
 * lib/__tests__/accounts-fixture-requests.test.ts.
 */

import { describe, expect, it } from 'vitest';
import deskSeed from '../../../fixtures/accounts/desk.json';
import type { AccountDesk, DeskCommunityFieldsAnswer, DeskRequestAnswer } from '../accounts';
import { createAccountsFixtureDesk, type AccountsSeed } from '../accounts-fixture';
import { COMMUNITY_FIELDS_PROBLEMS } from '../community-fields';

const NOW = new Date('2026-10-18T13:00:00.000Z');
const HOUSE = `0x${'99'.repeat(20)}`;
const PABLO = `0x${'0a'.repeat(20)}`;
const seed = deskSeed as unknown as AccountsSeed;

type Loose = {
  [K in keyof AccountDesk]: (...args: unknown[]) => ReturnType<AccountDesk[K]>;
};
const desk = (): Loose => createAccountsFixtureDesk(seed, () => NOW) as unknown as Loose;
const problems = (answer: DeskCommunityFieldsAnswer): readonly string[] =>
  (answer as { ok: false; problems: readonly string[] }).problems;
const requestOf = (answer: DeskRequestAnswer) => {
  if (!answer.ok) throw new Error(answer.problems.join());
  return answer.request;
};

describe('while there is no titular yet', () => {
  it('the house renames the card and answers the written fields', async () => {
    const d = desk();
    const out = await d.editCommunityFields(HOUSE, true, 'vic', { name: 'Vic, la de verdad' });
    expect(out).toEqual({
      ok: true,
      fields: {
        communityId: 'vic',
        name: 'Vic, la de verdad',
        summary: null,
        editedBy: HOUSE,
        editedAt: NOW.toISOString(),
      },
    });
    expect(await d.communityFields('vic')).toEqual(out);
  });

  it('a second edit keeps the piece not sent this time', async () => {
    const d = desk();
    await d.editCommunityFields(HOUSE, true, 'vic', { name: 'Vic' });
    const out = await d.editCommunityFields(HOUSE, true, 'vic', { summary: 'Un buen sitio' });
    expect(out).toEqual({
      ok: true,
      fields: {
        communityId: 'vic',
        name: 'Vic',
        summary: 'Un buen sitio',
        editedBy: HOUSE,
        editedAt: NOW.toISOString(),
      },
    });
  });

  it('answers null for a community nobody has edited', async () => {
    expect(await desk().communityFields('merge')).toEqual({ ok: true, fields: null });
  });

  it('refuses whoever is not the house, a bad id, or a body with nothing to change', async () => {
    const d = desk();
    expect(
      problems(await d.editCommunityFields('not-a-wallet', true, 'vic', { name: 'Vic' })),
    ).toEqual(expect.arrayContaining([expect.stringContaining('wallet')]));
    expect(problems(await d.editCommunityFields(PABLO, false, 'vic', { name: 'Vic' }))).toEqual([
      COMMUNITY_FIELDS_PROBLEMS.notHouse,
    ]);
    expect(
      problems(await d.editCommunityFields(HOUSE, true, 'not-a-community-id!', { name: 'Vic' })),
    ).toContain(COMMUNITY_FIELDS_PROBLEMS.community);
    expect(
      problems(await d.editCommunityFields(HOUSE, true, 'vic', { name: '', summary: '' })),
    ).toEqual(
      expect.arrayContaining([COMMUNITY_FIELDS_PROBLEMS.name, COMMUNITY_FIELDS_PROBLEMS.summary]),
    );
    expect(problems(await d.editCommunityFields(HOUSE, true, 'vic', {}))).toEqual([
      COMMUNITY_FIELDS_PROBLEMS.nothing,
    ]);
    expect(await d.communityFields('not-a-community-id!')).toEqual({
      ok: false,
      problems: [COMMUNITY_FIELDS_PROBLEMS.community],
    });
  });
});

describe('once the community has a titular', () => {
  it('the house’s edit is refused', async () => {
    const d = desk();
    const claim = requestOf(await d.requestCommunity(PABLO, 'merge', 'claim'));
    await d.decideCommunityRequest(HOUSE, claim.id, true, true, 'Merge');
    expect(problems(await d.editCommunityFields(HOUSE, true, 'merge', { name: 'Merge' }))).toEqual([
      COMMUNITY_FIELDS_PROBLEMS.hasOwner,
    ]);
  });
});
