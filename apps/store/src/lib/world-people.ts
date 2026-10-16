/**
 * «Sede» complete (cut 8): who may enter a community's world, worked out from
 * what the till already says of the organization (its roles and members, as
 * /api/saldo/roles answers a member or the house) — nothing is asked twice and
 * nothing is invented. Whoever holds `enter-worlds` or `administrator`, through
 * a role of their own or through the base role everyone holds, may enter; the
 * owners always may. Pure: no fetch, no DOM — an island imports it.
 */

import {
  fill,
  shortWallet,
  type DeskMemberDetail,
  type DeskRole,
  type DeskRoles,
} from './accounts';

/** The base role is the one at the bottom (lib/panel.ts: position 0); everyone holds it. */
const BASE_POSITION = 0;

/** Who may enter, as a community's panel can say it. */
export interface Enterers {
  /** The base role carries it: every person of the community may. */
  readonly everyone: boolean;
  /** The roles besides the base one that carry it, from the top down. */
  readonly roles: readonly DeskRole[];
  /** The people who may, owners first as the till lists them. */
  readonly people: readonly DeskMemberDetail[];
}

function opens(role: DeskRole): boolean {
  return role.permissions.some(
    (permission) => permission === 'enter-worlds' || permission === 'administrator',
  );
}

export function enterersOf(view: DeskRoles): Enterers {
  const everyone = view.roles.some((role) => role.position === BASE_POSITION && opens(role));
  const roles = view.roles.filter((role) => role.position !== BASE_POSITION && opens(role));
  const ids = new Set(roles.map((role) => role.id));
  const people = view.members.filter(
    (member) => everyone || member.owner || member.roleIds.some((id) => ids.has(id)),
  );
  return { everyone, roles, people };
}

/** A person as the list names them: the name they published, else a short wallet. */
export function personLabel(member: DeskMemberDetail): string {
  return member.name ?? shortWallet(member.wallet);
}

/** «Pueden entrar 3 personas» in the visitor's words: `one` for a single person, `other` with `{n}`. */
export function enterCount(
  count: number,
  words: { readonly one: string; readonly other: string },
): string {
  return count === 1 ? words.one : fill(words.other, { n: count });
}

/** How many people the world's page lists before «y {n} más». */
export const PEOPLE_SHOWN = 8;

/** The people to list, and how many more there are. */
export function shownPeople(people: readonly DeskMemberDetail[]): {
  readonly list: readonly DeskMemberDetail[];
  readonly rest: number;
} {
  return { list: people.slice(0, PEOPLE_SHOWN), rest: Math.max(0, people.length - PEOPLE_SHOWN) };
}
