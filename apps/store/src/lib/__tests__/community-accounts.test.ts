/**
 * Which community an organization is of (cut G): the derived account and
 * the one a community's file names both lead back to the community.
 */

import { describe, expect, it } from 'vitest';
import type { Community } from '../communities';
import { communityAccountId } from '../community-teams';
import { communityNames, communityOfAccount } from '../community-accounts';

const register = [
  { id: 'reset', name: 'Reset', team: 'acc_t_legacy' },
  { id: 'merge', name: 'Merge', team: undefined },
] as unknown as readonly Community[];

describe('communityOfAccount', () => {
  it('maps the derived account and the named one to the community', async () => {
    const map = await communityOfAccount(register);
    expect(map[await communityAccountId('reset')]).toBe('reset');
    expect(map['acc_t_legacy']).toBe('reset');
    expect(map[await communityAccountId('merge')]).toBe('merge');
    expect(Object.keys(map)).toHaveLength(3);
  });
});

describe('communityNames', () => {
  it('names each community', () => {
    expect(communityNames(register)).toEqual({ reset: 'Reset', merge: 'Merge' });
  });
});
