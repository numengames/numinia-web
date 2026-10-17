/**
 * «Avisos» (cut J, 2026-10-17), the store's half: GET /api/notices gathers
 * the sources the city already answers — the till's RSVPs, the session's
 * organizations, the open requests it decides, the answers to its own, and
 * who is inside the homes (/api/live) — with the session's wallet, and
 * answers the list newest first with how many are newer than the moment the
 * browser last saw (`since`). A source that fails is skipped and logged
 * once per process: the page never breaks for one of them. Server only; the
 * pure rows are lib/notices.ts's.
 */

import { z } from 'zod';
import type { Asker } from './accounts';
import type { Community, Ritual } from './communities';
import type { Log } from './worlds-homes';
import type { NoticeWords } from '../i18n/notifications';
import {
  decisionNotices,
  encounterNotices,
  relativeTime,
  requestNotices,
  sortNotices,
  unseenCount,
  worldNotices,
  type Notice,
} from './notices';

/** The five questions, as the route asks them of the desks and of /api/live. */
export interface NoticePorts {
  myRsvps(wallet: string): Promise<unknown>;
  overview(wallet: string): Promise<unknown>;
  communityRequests(wallet: string, house: boolean, communityId: string | null): Promise<unknown>;
  myCommunityRequests(wallet: string): Promise<unknown>;
  inside(): Promise<unknown>;
}

export interface NoticeRegister {
  readonly communities: readonly Community[];
  readonly rituals: readonly Ritual[];
  /** `{ accountId: communityId }` for every organization tied to a community (lib/community-accounts.ts). */
  readonly accountToCommunity: Readonly<Record<string, string>>;
  readonly commons: { readonly href: string; readonly name: string };
}

const request = z.object({
  id: z.string(),
  communityId: z.string(),
  wallet: z.string(),
  kind: z.enum(['claim', 'join']),
  note: z.string().nullable(),
  state: z.enum(['open', 'accepted', 'declined']),
  createdAt: z.string(),
  decidedAt: z.string().nullable(),
  decidedBy: z.string().nullable(),
});
const SHAPES = {
  rsvps: z.object({ ok: z.literal(true), ritualIds: z.array(z.string()) }),
  overview: z.object({
    accounts: z.array(z.object({ id: z.string(), role: z.enum(['owner', 'admin', 'member']) })),
  }),
  open: z.object({
    ok: z.literal(true),
    requests: z.array(
      request.extend({ name: z.string().nullable(), avatar: z.string().nullable() }),
    ),
  }),
  mine: z.object({ ok: z.literal(true), requests: z.array(request) }),
  inside: z.object({ inside: z.record(z.string(), z.number().nullable()) }),
} as const;

const logged = new Set<string>();

/** Test seam: forget which sources were logged. */
export function resetNoticeLogsForTests(): void {
  logged.clear();
}

/** One source's answer in shape, or null when it threw or came out of shape — logged once per source. */
async function source<S extends z.ZodType>(
  log: Log,
  name: string,
  call: () => Promise<unknown>,
  shape: S,
): Promise<z.infer<S> | null> {
  let raw: unknown;
  try {
    raw = await call();
  } catch (error) {
    note(log, name, 'threw', error instanceof Error ? error.name : typeof error);
    return null;
  }
  const read = shape.safeParse(raw);
  if (read.success) return read.data;
  note(log, name, 'shape');
  return null;
}

function note(log: Log, name: string, rule: string, error?: string): void {
  if (logged.has(name)) return;
  logged.add(name);
  log({ level: 'error', kind: 'notices-source', source: name, rule, ...(error ? { error } : {}) });
}

/**
 * Every notice for the session, newest first. The house sees every open
 * request; an administrator (or titular) those of the communities whose
 * organization they run; everyone, the answers to their own.
 */
export async function gatherNotices(
  ports: NoticePorts,
  asker: Asker,
  register: NoticeRegister,
  locale: string,
  words: NoticeWords,
  now: Date,
  log: Log,
): Promise<readonly Notice[]> {
  const wallet = asker.wallet.toLowerCase();
  const names = Object.fromEntries(register.communities.map((c) => [c.id, c.name]));
  const [rsvps, overview, mine, inside] = await Promise.all([
    source(log, 'myRsvps', () => ports.myRsvps(wallet), SHAPES.rsvps),
    source(log, 'overview', () => ports.overview(wallet), SHAPES.overview),
    source(log, 'myCommunityRequests', () => ports.myCommunityRequests(wallet), SHAPES.mine),
    source(log, 'inside', () => ports.inside(), SHAPES.inside),
  ]);
  const accounts = overview?.accounts ?? [];
  const myCommunities = accounts.flatMap((account) => {
    const community = register.accountToCommunity[account.id];
    return community === undefined ? [] : [community];
  });
  const runCommunities = accounts.flatMap((account) => {
    const community = register.accountToCommunity[account.id];
    return community === undefined || account.role === 'member' ? [] : [community];
  });
  const openLists = asker.house
    ? [
        await source(
          log,
          'communityRequests',
          () => ports.communityRequests(wallet, true, null),
          SHAPES.open,
        ),
      ]
    : await Promise.all(
        runCommunities.map((community) =>
          source(
            log,
            'communityRequests',
            () => ports.communityRequests(wallet, false, community),
            SHAPES.open,
          ),
        ),
      );
  const open = openLists.flatMap((list) => list?.requests ?? []);
  return sortNotices([
    ...encounterNotices(rsvps?.ritualIds ?? [], {
      rituals: register.rituals,
      communities: register.communities,
      commons: register.commons,
      locale,
      now,
      words,
    }),
    ...worldNotices(inside?.inside ?? {}, myCommunities, register.communities, locale, now, words),
    ...requestNotices(open, names, words),
    ...decisionNotices(mine?.requests ?? [], names, words),
  ]);
}

/** A row as the browser gets it: the notice and when, as a person says it. */
export interface NoticeRow extends Notice {
  readonly when: string;
}

export interface NoticesAnswer {
  readonly ok: true;
  readonly notices: readonly NoticeRow[];
  /** How many are newer than `since` — the dot's reason, never a number on screen. */
  readonly unseen: number;
}

/** The answer's body: every row with its moment in words, and the unseen count against `since`. */
export function presentNotices(
  notices: readonly Notice[],
  since: string | null,
  now: Date,
  locale: string,
): NoticesAnswer {
  return {
    ok: true,
    notices: notices.map((notice) => ({ ...notice, when: relativeTime(notice.at, now, locale) })),
    unseen: unseenCount(notices, since),
  };
}
