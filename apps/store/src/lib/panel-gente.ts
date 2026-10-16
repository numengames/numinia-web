/**
 * «Gente» (the panel's people list, cut 9): who is in the organization, in
 * the groups the data supports — the Oracles (the house's own wallets), then
 * one group per role of the organization, in the organization's own order
 * and with its own role names, then everybody else. Nothing of presence:
 * no dots, no «en línea», no counts of who is on. The AI agents group of the
 * prototype is not drawn: the data does not hold agents.
 *
 * Pure: no fetch, no env, no zod, no DOM. It works on the same answer
 * «Miembros» reads (GET /api/saldo/roles, read by lib/accounts.ts) and on the
 * ranks of GET /api/saldo/ranks (lib/panel-people.ts `readRanks`); what a
 * person chose to show — a name and a face — is lib/panel-people.ts's
 * `shownOf`. The till decides who may see the list (it refuses non-members
 * and strangers), exactly as in Miembros.
 */

import { BASE_ROLE_POSITION, type Rank } from '@numinia/domain';
import { shortWallet, type DeskMemberDetail, type DeskRoles } from './accounts';
import { shownOf } from './panel-people';

/** One person of the list. */
export interface GenteRow {
  readonly wallet: string;
  /** The name they chose to show, or null (the short wallet is drawn). */
  readonly name: string | null;
  readonly short: string;
  /** Their Bazar avatar's thumbnail, or null (the initial is drawn). */
  readonly face: string | null;
  /** One letter for the round avatar when there is no face. */
  readonly initial: string;
  /** The highest role they hold here (the base role's name when they hold none). */
  readonly role: { readonly name: string; readonly color: string | null };
  /** Their rank in the city; null where nobody could read it. */
  readonly rank: Rank | null;
  readonly owner: boolean;
  readonly you: boolean;
}

export interface GenteGroup {
  /** `oracles`, `rest`, or `role:<id>`. */
  readonly id: string;
  readonly kind: 'oracles' | 'role' | 'rest';
  /** The organization's own name for the role group; null for the other two (the screen's words). */
  readonly name: string | null;
  readonly color: string | null;
  readonly rows: readonly GenteRow[];
}

type Ranks = Readonly<Record<string, Rank | null>> | null;

/** The letter of the round avatar: the name's first, else the wallet's first after `0x`. */
export function initialOf(name: string | null, wallet: string): string {
  const source = name ?? wallet.replace(/^0x/i, '');
  return (Array.from(source)[0] ?? '·').toUpperCase();
}

function rowOf(
  member: DeskMemberDetail,
  role: GenteRow['role'],
  ranks: Ranks,
  you: string | null,
): GenteRow {
  const { name, face } = shownOf(member);
  const wallet = member.wallet.toLowerCase();
  return {
    wallet: member.wallet,
    name,
    short: shortWallet(member.wallet),
    face,
    initial: initialOf(name, member.wallet),
    role,
    rank: ranks?.[wallet] ?? null,
    owner: member.owner,
    you: you !== null && wallet === you.toLowerCase(),
  };
}

/**
 * The people of the organization in groups. A person is in one group only:
 * the Oracles first (the wallets whose rank in the city is «oracle»), else
 * the group of the highest role they hold, else the rest. Inside a group the
 * owners come first, then the order the till gave (by arrival). Empty groups
 * are not drawn.
 */
export function groupsOf(view: DeskRoles, ranks: Ranks, you: string | null): GenteGroup[] {
  const base = view.roles.find((role) => role.position === BASE_ROLE_POSITION);
  const baseRole: GenteRow['role'] = { name: base?.name ?? '', color: base?.color ?? null };
  const above = view.roles.filter((role) => role.position !== BASE_ROLE_POSITION);
  const oracles: GenteRow[] = [];
  const byRole = new Map<string, GenteRow[]>();
  const rest: GenteRow[] = [];
  for (const member of view.members) {
    const top = above.find((role) => member.roleIds.includes(role.id));
    const row = rowOf(
      member,
      top === undefined ? baseRole : { name: top.name, color: top.color },
      ranks,
      you,
    );
    if (row.rank === 'oracle') oracles.push(row);
    else if (top === undefined) rest.push(row);
    else byRole.set(top.id, [...(byRole.get(top.id) ?? []), row]);
  }
  const ownersFirst = (rows: GenteRow[]): GenteRow[] => [
    ...rows.filter((row) => row.owner),
    ...rows.filter((row) => !row.owner),
  ];
  const groups: GenteGroup[] = [];
  if (oracles.length > 0) {
    groups.push({
      id: 'oracles',
      kind: 'oracles',
      name: null,
      color: null,
      rows: ownersFirst(oracles),
    });
  }
  for (const role of above) {
    const rows = byRole.get(role.id);
    if (rows !== undefined) {
      groups.push({
        id: `role:${role.id}`,
        kind: 'role',
        name: role.name,
        color: role.color,
        rows: ownersFirst(rows),
      });
    }
  }
  if (rest.length > 0) {
    groups.push({ id: 'rest', kind: 'rest', name: null, color: null, rows: ownersFirst(rest) });
  }
  return groups;
}
