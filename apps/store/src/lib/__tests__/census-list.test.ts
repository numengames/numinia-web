/**
 * «El censo» (cut of 2026-10-16) in the browser: the Census page's list of
 * who has signed in and the panel's «Add member» suggestions read
 * /api/admin/citizens through these helpers — the house known by the
 * session's Oracle rank, each state of the list honest (forbidden, till
 * missing, failed), dates in the visitor's zone, and a listbox walked by
 * keyboard.
 */

import { describe, expect, it, vi } from 'vitest';
import { SALDO_UI } from '../../i18n/saldo';
import { NOT_CONFIGURED, OWN_ROLES, type Citizen, type DeskAccount } from '../accounts';
import {
  CITIZENS_API,
  SUGGEST_MAX,
  SUGGEST_MIN,
  citizensUrl,
  isHouseSession,
  listboxStep,
  loadCitizens,
  personLines,
  refusalWords,
  seenAt,
  suggestCitizens,
  teamsToJoin,
} from '../census-list';

const LUCIA: Citizen = {
  wallet: `0x${'a1'.repeat(20)}`,
  firstSeenAt: '2026-10-01T08:00:00.000Z',
  lastSeenAt: '2026-10-16T23:30:00.000Z',
  name: 'Lucía Vidal',
  face: '/thumbs/1x/avatar-arla-mncdhz3l.webp',
  organizations: 2,
};
const NAMELESS: Citizen = { ...LUCIA, wallet: `0x${'b2'.repeat(20)}`, name: null, face: null };

const page = (people: readonly Citizen[], next: string | null = null) => ({
  ok: true,
  people,
  total: people.length,
  next,
});

const replying = (status: number, body: unknown) =>
  vi.fn(async (_input: string, _init?: RequestInit) => Response.json(body, { status }));

describe('the address of the list', () => {
  it('is one, with the search and the cursor when there are any', () => {
    expect(CITIZENS_API).toBe('/api/admin/citizens');
    expect(citizensUrl('')).toBe('/api/admin/citizens');
    expect(citizensUrl('  ')).toBe('/api/admin/citizens');
    expect(citizensUrl(' Lucía ')).toBe('/api/admin/citizens?q=Luc%C3%ADa');
    expect(citizensUrl('', 'a~b')).toBe('/api/admin/citizens?cursor=a%7Eb');
    expect(citizensUrl('x', 'c')).toBe('/api/admin/citizens?q=x&cursor=c');
  });
});

describe('the house', () => {
  it('is an Oracle’s session, and nothing else', () => {
    expect(isHouseSession({ status: 'in', rank: 'oracle' })).toBe(true);
    expect(isHouseSession({ status: 'in', rank: 'archon' })).toBe(false);
    expect(isHouseSession({ status: 'out' })).toBe(false);
  });
});

describe('loading the list', () => {
  it('reads a page', async () => {
    const fetcher = replying(200, page([LUCIA], 'next'));
    expect(await loadCitizens(fetcher, 'luc')).toEqual({
      at: 'ready',
      people: [LUCIA],
      total: 1,
      next: 'next',
    });
    expect(fetcher).toHaveBeenCalledWith('/api/admin/citizens?q=luc', {
      headers: { accept: 'application/json' },
      credentials: 'same-origin',
    });
  });

  it('tells forbidden, a missing till and a failure apart', async () => {
    expect(await loadCitizens(replying(403, { error: 'forbidden' }), '')).toEqual({
      at: 'forbidden',
    });
    expect(await loadCitizens(replying(401, { error: 'signed-out' }), '')).toEqual({
      at: 'forbidden',
    });
    expect(await loadCitizens(replying(503, { error: 'not-bound' }), '')).toEqual({
      at: 'not-bound',
    });
    expect(await loadCitizens(replying(502, { error: 'till-failed' }), '')).toEqual({
      at: 'failed',
    });
    expect(await loadCitizens(replying(200, { ok: true }), '')).toEqual({ at: 'failed' });
    const broken = vi.fn(async () => new Response('not json', { status: 200 }));
    expect(await loadCitizens(broken, '')).toEqual({ at: 'failed' });
    const offline = vi.fn(async () => {
      throw new TypeError('offline');
    });
    expect(await loadCitizens(offline, '', 'c')).toEqual({ at: 'failed' });
  });
});

describe('suggestions while typing a wallet to add', () => {
  it('asks the house’s list once something is typed, a few people at most', async () => {
    expect(SUGGEST_MIN).toBe(2);
    expect(SUGGEST_MAX).toBe(8);
    const many = Array.from({ length: 12 }, (_, index) => ({
      ...LUCIA,
      wallet: `0x${index.toString(16).padStart(40, '0')}`,
    }));
    const fetcher = replying(200, page(many));
    const found = await suggestCitizens(true, 'lu', fetcher);
    expect(found).toHaveLength(8);
    expect(fetcher).toHaveBeenCalledWith('/api/admin/citizens?q=lu', expect.anything());
  });

  it('asks nothing for one character, or for a full wallet already typed', async () => {
    const fetcher = replying(200, page([LUCIA]));
    expect(await suggestCitizens(true, ' l ', fetcher)).toEqual([]);
    expect(
      await suggestCitizens(true, LUCIA.wallet.toUpperCase().replace('0X', '0x'), fetcher),
    ).toEqual([]);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('suggests nobody when the list cannot be read', async () => {
    expect(await suggestCitizens(true, 'lu', replying(403, {}))).toEqual([]);
  });
});

describe('a person on screen', () => {
  it('reads as the name published, with the short wallet below; or the short wallet alone', () => {
    expect(personLines(LUCIA)).toEqual({ title: 'Lucía Vidal', sub: '0xa1a1…a1a1' });
    expect(personLines(NAMELESS)).toEqual({ title: '0xb2b2…b2b2', sub: null });
  });

  it('shows when in the visitor’s own zone, from the instant kept in UTC', () => {
    expect(seenAt(LUCIA.lastSeenAt, 'es', 'UTC')).toBe(
      new Intl.DateTimeFormat('es', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: 'UTC',
      }).format(new Date(LUCIA.lastSeenAt)),
    );
    // 23:30 UTC is already the next day in Madrid.
    expect(seenAt(LUCIA.lastSeenAt, 'en', 'Europe/Madrid')).toContain('17');
    expect(seenAt('not a date', 'en')).toBe('—');
    expect(seenAt(LUCIA.lastSeenAt, 'pt-br')).not.toBe('—');
  });
});

describe('the organizations to add someone to', () => {
  it('are the teams the overview lists, by name, never the personal account', () => {
    const accounts: DeskAccount[] = [
      { id: 'p', kind: 'personal', name: null, role: 'owner', balanceCents: 0 },
      { id: 'b', kind: 'team', name: 'La Tarugo', role: 'admin', balanceCents: 0, as: 'house' },
      { id: 'a', kind: 'team', name: 'Active Inference', role: 'admin', balanceCents: 0 },
    ];
    expect(teamsToJoin(accounts)).toEqual([
      { id: 'a', name: 'Active Inference' },
      { id: 'b', name: 'La Tarugo' },
    ]);
  });
});

describe('walking a listbox by keyboard', () => {
  it('moves down and up, wraps, jumps to the ends, and stays put on other keys', () => {
    expect(listboxStep(-1, 3, 'ArrowDown')).toBe(0);
    expect(listboxStep(0, 3, 'ArrowDown')).toBe(1);
    expect(listboxStep(2, 3, 'ArrowDown')).toBe(0);
    expect(listboxStep(0, 3, 'ArrowUp')).toBe(2);
    expect(listboxStep(-1, 3, 'ArrowUp')).toBe(2);
    expect(listboxStep(1, 3, 'Home')).toBe(0);
    expect(listboxStep(1, 3, 'End')).toBe(2);
    expect(listboxStep(1, 3, 'a')).toBe(1);
    expect(listboxStep(-1, 0, 'ArrowDown')).toBe(-1);
  });
});

describe('telling why the till refused an add', () => {
  const words = SALDO_UI.es.problems;

  it('uses the Saldo panel’s sentence for the refusals it knows', () => {
    expect(refusalWords([OWN_ROLES], words)).toBe(words.ownRoles);
    expect(refusalWords(['the organization has changed meanwhile'], words)).toBe(words.other);
  });

  it('keeps the one general line for a missing permission or a till not set up', () => {
    expect(refusalWords(['this needs manage-roles, which only the owners hold'], words)).toBe(
      words.other,
    );
    expect(
      refusalWords(
        ['this needs manage-balance, which the owners hold, and the role Finance'],
        words,
      ),
    ).toBe(words.other);
    expect(refusalWords([NOT_CONFIGURED], words)).toBe(words.other);
    expect(refusalWords(['this needs nothing-known, which only the owners hold'], words)).toBe(
      words.ownersOnly,
    );
  });
});
