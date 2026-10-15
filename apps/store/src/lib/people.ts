/**
 * The people of an organization, as its community's page lists them
 * (STD-053 PRS-004, design «Roles, gente y estados» §5.4): first each role
 * shown apart, in the order of the roles, then everyone else. Each person
 * sits in the group of their highest role shown apart, and is drawn with
 * the colour of their highest role that has one.
 *
 * A pure model: it takes what the till says (`roles`) and gives what the
 * browser may see. A browser is never sent a whole wallet — a short one is
 * enough to tell people apart — nor anything the till did not say.
 */

import { shortWallet, type DeskMemberDetail, type DeskRole, type DeskRoles } from './accounts';

export interface Person {
  /** `0x42e6…ca26`: enough to tell two people apart, too little to copy. */
  readonly short: string;
  readonly owner: boolean;
  /** Whether this is the one reading the list. */
  readonly you: boolean;
  /** The colour of their highest role that has one, or null. */
  readonly color: string | null;
}

export interface PeopleGroup {
  /** The role's id, or `rest` for everyone who is in no role shown apart. */
  readonly id: string;
  /** The role's name; empty for `rest`, whose label the page words. */
  readonly name: string;
  readonly color: string | null;
  readonly people: readonly Person[];
}

export interface PeopleList {
  readonly members: number;
  readonly groups: readonly PeopleGroup[];
}

/** The id of the group of everyone who is in no role shown apart. */
export const REST_GROUP = 'rest';

/** The list of an organization for a member: `you` is the wallet reading, lowercase. */
export function peopleOf(organization: DeskRoles, you: string): PeopleList {
  // The till answers the roles from the top down, the base role last.
  const topDown: readonly DeskRole[] = organization.roles;
  const heldBy = (member: DeskMemberDetail): readonly DeskRole[] =>
    topDown.filter((role) => member.roleIds.includes(role.id));
  const groupOf = (member: DeskMemberDetail): string =>
    heldBy(member).find((role) => role.hoist)?.id ?? REST_GROUP;
  const personOf = (member: DeskMemberDetail): Person => ({
    short: shortWallet(member.wallet),
    owner: member.owner,
    you: member.wallet === you,
    color: heldBy(member).find((role) => role.color !== null)?.color ?? null,
  });
  const shown = [
    ...topDown.filter((role) => role.hoist).map(({ id, name, color }) => ({ id, name, color })),
    { id: REST_GROUP, name: '', color: null },
  ];
  return {
    members: organization.members.length,
    groups: shown
      .map((group) => ({
        ...group,
        people: organization.members.filter((member) => groupOf(member) === group.id).map(personOf),
      }))
      .filter((group) => group.people.length > 0),
  };
}
