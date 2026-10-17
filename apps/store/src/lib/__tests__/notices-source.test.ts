/**
 * «Avisos» (cut J), the gather: the five sources become one list newest
 * first; a source that throws or answers out of shape is skipped and logged
 * once; the house sees every open request, a titular those of their own
 * communities, a member none.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NOTIFICATIONS_UI } from '../../i18n/notifications';
import { parseCommunity, parseRitual } from '../communities';
import {
  gatherNotices,
  presentNotices,
  resetNoticeLogsForTests,
  type NoticePorts,
  type NoticeRegister,
} from '../notices-source';

const NOW = new Date('2026-10-17T12:00:00.000Z');
const WORDS = NOTIFICATIONS_UI.es.words;
const WALLET = '0xABAB000000000000000000000000000000000001';

const BASE = {
  kind: { en: 'Conference', es: 'Congreso' },
  places: ['madrid'],
  summary: { en: 'People who make things.', es: 'Gente que hace cosas.' },
  links: [],
};
const vic = parseCommunity('vic', {
  ...BASE,
  name: 'Vic',
  sede: { href: 'https://vic.numinia.com/' },
});
const merge = parseCommunity('merge', { ...BASE, name: 'Merge' });
const soon = parseRitual('soon', {
  community: 'vic',
  title: { en: 'Soon', es: 'Pronto' },
  where: { en: 'Madrid', es: 'Madrid' },
  start: '2026-10-20',
  end: '2026-10-20',
});

const REGISTER: NoticeRegister = {
  communities: [vic, merge],
  rituals: [soon],
  accountToCommunity: { acc_vic: 'vic', acc_merge: 'merge' },
  commons: { href: 'https://agora.numinia.xyz/', name: 'Agora' },
};

const open = (id: string, communityId: string) => ({
  id,
  communityId,
  wallet: '0x00000000000000000000000000000000000000a1',
  kind: 'join',
  note: null,
  state: 'open',
  createdAt: '2026-10-15T10:00:00.000Z',
  decidedAt: null,
  decidedBy: null,
  name: 'Lucía',
  avatar: null,
});

function ports(extra: Partial<NoticePorts> = {}): NoticePorts & { calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    myRsvps: async (wallet) => {
      calls.push(`myRsvps ${wallet}`);
      return { ok: true, ritualIds: ['soon', 'ghost'] };
    },
    overview: async () => ({
      accounts: [
        { id: 'acc_personal', role: 'owner' },
        { id: 'acc_vic', role: 'admin' },
        { id: 'acc_merge', role: 'member' },
      ],
    }),
    communityRequests: async (_wallet, house, communityId) => {
      calls.push(`communityRequests ${house} ${communityId}`);
      return { ok: true, requests: [open(`req_${'1'.repeat(32)}`, communityId ?? 'merge')] };
    },
    myCommunityRequests: async () => ({
      ok: true,
      requests: [
        {
          ...open(`req_${'2'.repeat(32)}`, 'merge'),
          state: 'accepted',
          decidedAt: '2026-10-16T10:00:00.000Z',
        },
      ],
    }),
    inside: async () => ({ inside: { vic: 2, merge: null } }),
    ...extra,
  };
}

beforeEach(() => resetNoticeLogsForTests());

describe('gatherNotices', () => {
  it('gathers the four kinds for a titular, newest first, asking the desks with the lowercase wallet', async () => {
    const log = vi.fn();
    const p = ports();
    const notices = await gatherNotices(
      p,
      { wallet: WALLET, house: false },
      REGISTER,
      'es',
      WORDS,
      NOW,
      log,
    );
    expect(notices.map((n) => n.id)).toEqual([
      'world:vic',
      `decision:req_${'2'.repeat(32)}`,
      `request:req_${'1'.repeat(32)}`,
      'encounter:soon',
    ]);
    expect(notices[2]?.text.after).toBe(' quiere entrar en Vic.');
    expect(p.calls).toEqual([`myRsvps ${WALLET.toLowerCase()}`, 'communityRequests false vic']);
    expect(log).not.toHaveBeenCalled();
  });

  it('asks every open request at once for the house', async () => {
    const p = ports();
    const notices = await gatherNotices(
      p,
      { wallet: WALLET, house: true },
      REGISTER,
      'es',
      WORDS,
      NOW,
      vi.fn(),
    );
    expect(p.calls.filter((c) => c.startsWith('communityRequests'))).toEqual([
      'communityRequests true null',
    ]);
    expect(notices.find((n) => n.id.startsWith('request'))?.text.after).toBe(
      ' quiere entrar en Merge.',
    );
  });

  it('skips a source that throws or answers out of shape, logs it once, and keeps the rest', async () => {
    const log = vi.fn();
    const p = ports({
      myRsvps: async () => {
        throw new Error('till down');
      },
      inside: async () => 'nonsense',
      overview: async () => {
        throw 'odd';
      },
    });
    const notices = await gatherNotices(
      p,
      { wallet: WALLET, house: false },
      REGISTER,
      'es',
      WORDS,
      NOW,
      log,
    );
    expect(notices.map((n) => n.kind)).toEqual(['community']);
    expect(log).toHaveBeenCalledTimes(3);
    expect(log).toHaveBeenCalledWith({
      level: 'error',
      kind: 'notices-source',
      source: 'myRsvps',
      rule: 'threw',
      error: 'Error',
    });
    expect(log).toHaveBeenCalledWith({
      level: 'error',
      kind: 'notices-source',
      source: 'overview',
      rule: 'threw',
      error: 'string',
    });
    expect(log).toHaveBeenCalledWith({
      level: 'error',
      kind: 'notices-source',
      source: 'inside',
      rule: 'shape',
    });
    await gatherNotices(p, { wallet: WALLET, house: false }, REGISTER, 'es', WORDS, NOW, log);
    expect(log).toHaveBeenCalledTimes(3);
  });

  it('a member of nothing that is run gets no requests to decide; a refused list is skipped', async () => {
    const log = vi.fn();
    const p = ports({
      overview: async () => ({ accounts: [{ id: 'acc_merge', role: 'member' }] }),
      myCommunityRequests: async () => ({ ok: false, problems: ['x'] }),
    });
    const notices = await gatherNotices(
      p,
      { wallet: WALLET, house: false },
      REGISTER,
      'es',
      WORDS,
      NOW,
      log,
    );
    expect(notices.map((n) => n.kind)).toEqual(['encounter']);
    expect(p.calls.some((c) => c.startsWith('communityRequests'))).toBe(false);
    expect(log).toHaveBeenCalledTimes(1);
  });

  it('an organization the register does not tie to a community counts for nothing', async () => {
    const p = ports({ overview: async () => ({ accounts: [{ id: 'acc_other', role: 'owner' }] }) });
    const notices = await gatherNotices(
      p,
      { wallet: WALLET, house: false },
      REGISTER,
      'es',
      WORDS,
      NOW,
      vi.fn(),
    );
    expect(notices.map((n) => n.kind).sort()).toEqual(['community', 'encounter']);
  });
});

describe('presentNotices', () => {
  it('adds when, as a person says it, and the unseen count against since', () => {
    const notices = [
      {
        id: 'a',
        kind: 'world' as const,
        at: '2026-10-17T11:57:00.000Z',
        text: { before: '', subject: 'a', after: '' },
      },
      {
        id: 'b',
        kind: 'encounter' as const,
        at: '2026-10-10T09:00:00.000Z',
        text: { before: '', subject: 'b', after: '' },
      },
    ];
    const body = presentNotices(notices, '2026-10-16T00:00:00.000Z', NOW, 'es');
    expect(body.unseen).toBe(1);
    expect(body.notices.map((n) => n.when)).toEqual(['hace 3 min', '10 oct']);
    expect(presentNotices(notices, null, NOW, 'en').unseen).toBe(2);
  });
});
