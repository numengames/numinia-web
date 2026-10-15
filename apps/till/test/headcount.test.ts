/**
 * The head count (STD-053 PRS-004): how many people an organization has,
 * asked for without any wallet — what numinia.com shows to someone who is
 * not a member of the community's organization. A number and nothing else:
 * no wallet, no role, no name. The real migrations on the D1 shim, and the
 * account desk as numinia.com's binding calls it.
 */

import { describe, expect, it } from 'vitest';
import { PROBLEMS } from '../src/db/accounts';
import { AccountDesk } from '../src/worker';
import { migratedTill } from './sqlite-d1';

const wallet = (pair: string): string => `0x${pair.repeat(20)}`;
const PABLO = wallet('ab');
const MARIA = wallet('cd');
const ANA = wallet('56');
const ctx = {} as ExecutionContext;

function scene(): { readonly desk: AccountDesk } {
  const shim = migratedTill();
  return { desk: new AccountDesk(ctx, { TILL_DB: shim.db }) };
}

async function team(desk: AccountDesk): Promise<string> {
  const created = await desk.createTeam(PABLO, 'Estudio Lucía');
  if (!created.ok) throw new Error(created.problems.join());
  return created.account.id;
}

describe('the head count', () => {
  it('counts the people of an organization, the founder included, and says nothing else', async () => {
    const { desk } = scene();
    const id = await team(desk);
    expect(await desk.headcount(id)).toEqual({ ok: true, accountId: id, members: 1 });
    await desk.setMember(PABLO, id, MARIA, 'admin');
    await desk.setMember(PABLO, id, ANA, 'member');
    expect(await desk.headcount(id)).toEqual({ ok: true, accountId: id, members: 3 });
    await desk.removeMember(PABLO, id, ANA);
    expect(await desk.headcount(id)).toEqual({ ok: true, accountId: id, members: 2 });
  });

  it('is asked with no wallet: the first argument is the organization', async () => {
    const { desk } = scene();
    const id = await team(desk);
    const answer = await desk.headcount(id);
    expect(Object.keys(answer).sort()).toEqual(['accountId', 'members', 'ok']);
  });

  it('refuses what is not an organization id, and what is not an organization', async () => {
    const { desk } = scene();
    await team(desk);
    expect(await desk.headcount(undefined)).toEqual({ ok: false, problems: [PROBLEMS.accountId] });
    expect(await desk.headcount('a b')).toEqual({ ok: false, problems: [PROBLEMS.accountId] });
    expect(await desk.headcount('acc_t_00000000000000000000000000000001')).toEqual({
      ok: false,
      problems: [PROBLEMS.notTeam],
    });
    const overview = await desk.overview(PABLO);
    if (!overview.ok) throw new Error(overview.problems.join());
    const personal = overview.accounts.find((account) => account.kind === 'personal');
    expect(await desk.headcount(personal?.id)).toEqual({
      ok: false,
      problems: [PROBLEMS.notTeam],
    });
  });
});
