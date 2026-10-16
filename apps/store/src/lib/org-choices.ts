/**
 * «Una comunidad ES una organización» in the browser (cut 6, 2026-10-16):
 * what the Worlds room's «Asignar a una organización» and the Census's
 * «Añadir a una organización» dialogs list and do. They list the register's
 * communities first, then the till teams no community owns («Otras»), so
 * nothing already assignable disappears. A community the house has not used
 * yet has no till account: choosing it makes the house open one on save
 * (POST /api/admin/community-team), and only then does the place or the add
 * run with the account's id.
 *
 * Pure and zod-free (islands import it: zod in an island breaks the bundle
 * budget). The server side (lib/community-teams.ts) checks everything; these
 * readers only keep a wrong body from breaking a screen.
 */

/** The register for the house: its communities, with the account the till opens for each. */
export const COMMUNITIES_API = '/api/admin/communities';
/** Where the house has the till open a community's account. */
export const COMMUNITY_TEAM_API = '/api/admin/community-team';

type Fetch = (input: string, init?: RequestInit) => Promise<Response>;

/** A community as the house's API lists it (lib/community-teams.ts `CommunityEntry`). */
export interface CommunityEntry {
  readonly id: string;
  readonly name: string;
  readonly team: string | null;
  readonly account: string;
}

/** One line of a dialog's list: a community, or a till team no community owns. */
export interface OrgChoice {
  /** Unique in the list: `c:<community>` or `t:<account>`. */
  readonly key: string;
  readonly label: string;
  /** The till account to use now; null for a community whose account is still to be opened. */
  readonly accountId: string | null;
  /** The community, null for a till team no community owns. */
  readonly community: string | null;
}

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isText = (value: unknown): value is string => typeof value === 'string' && value !== '';

function readEntry(value: unknown): CommunityEntry | null {
  if (!isRecord(value)) return null;
  const { id, name, team, account } = value;
  if (!isText(id) || !isText(name) || !isText(account)) return null;
  if (team !== null && !isText(team)) return null;
  return { id, name, team, account };
}

/** The register as GET /api/admin/communities answers it; null when the body is not that. */
export function readCommunities(json: unknown): readonly CommunityEntry[] | null {
  if (!isRecord(json) || !Array.isArray(json.communities)) return null;
  const entries = json.communities.map(readEntry);
  return entries.every((entry): entry is CommunityEntry => entry !== null) ? entries : null;
}

/**
 * The list a dialog shows: the communities by name, each with the till
 * account it already has — the one its file links, else the one the house
 * opened — or null; then the till teams that are none of those, by name.
 */
export function orgChoices(
  communities: readonly CommunityEntry[],
  teams: readonly { readonly id: string; readonly name: string }[],
): readonly OrgChoice[] {
  const existing = new Set(teams.map((team) => team.id));
  const owned = new Set(
    communities.flatMap((c) => (c.team === null ? [c.account] : [c.team, c.account])),
  );
  const byLabel = (a: OrgChoice, b: OrgChoice): number => a.label.localeCompare(b.label);
  const ofCommunities = communities
    .map((community): OrgChoice => ({
      key: `c:${community.id}`,
      label: community.name,
      accountId:
        community.team !== null && existing.has(community.team)
          ? community.team
          : existing.has(community.account)
            ? community.account
            : null,
      community: community.id,
    }))
    .sort(byLabel);
  const others = teams
    .filter((team) => !owned.has(team.id))
    .map((team): OrgChoice => ({
      key: `t:${team.id}`,
      label: team.name,
      accountId: team.id,
      community: null,
    }))
    .sort(byLabel);
  return [...ofCommunities, ...others];
}

/** The register, or null when the house cannot read it; never throws. */
export async function loadCommunities(fetcher: Fetch): Promise<readonly CommunityEntry[] | null> {
  try {
    const response = await fetcher(COMMUNITIES_API, { headers: { accept: 'application/json' } });
    return response.ok ? readCommunities(await response.json().catch(() => null)) : null;
  } catch {
    return null;
  }
}

/** The account to use for a choice. */
export type Account =
  | { readonly ok: true; readonly accountId: string }
  | { readonly ok: false; readonly why: 'forbidden' | 'failed' };

/**
 * The till account of a choice: the one it has, or — for a community the
 * house has not used yet — the one the till opens now. Never throws.
 */
export async function accountOf(fetcher: Fetch, choice: OrgChoice): Promise<Account> {
  if (choice.accountId !== null) return { ok: true, accountId: choice.accountId };
  try {
    const response = await fetcher(COMMUNITY_TEAM_API, {
      method: 'POST',
      headers: { accept: 'application/json', 'content-type': 'application/json' },
      body: JSON.stringify({ community: choice.community }),
    });
    if (response.status === 403) return { ok: false, why: 'forbidden' };
    const json: unknown = response.ok ? await response.json().catch(() => null) : null;
    if (!isRecord(json) || !isRecord(json.account) || !isText(json.account.id)) {
      return { ok: false, why: 'failed' };
    }
    return { ok: true, accountId: json.account.id };
  } catch {
    return { ok: false, why: 'failed' };
  }
}
