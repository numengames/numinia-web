/**
 * The counters of your rail (cut I, «Tu agenda» · «Tus mundos»; cut
 * «Seguir», «Tus comunidades»): beside «Tu agenda», how many encounters you
 * said you are going to that are still to come; beside «Tus mundos», how
 * many worlds your communities have; beside «Tus comunidades», how many
 * communities you belong to or follow, each counted once. Read once per
 * page, right after the chrome's one session read says you are in — one
 * GET each (`/api/rsvp`, `/api/mundos/mine`, `/api/follow`) — and painted
 * into the markup the page already has (the rail, the phone's «Tú» sheet).
 * Never a «0»: with nothing to count the figure stays hidden.
 *
 * Imported only by the chrome's small counters script (YouCounts.astro), so
 * the bundler inlines it into the page: pure, no zod and no module shared
 * with any other script (a shared module would become an external file, and
 * the front page ships no external JavaScript) — whatever comes from outside
 * is read by hand, and a body out of shape reads as «nothing to show». The
 * session is read off the client the chrome publishes on the window
 * (lib/island-session.ts pins the names; they are repeated here, not imported).
 */

/** Where the two reads live. */
export const RSVP_PATH = '/api/rsvp';
export const MY_WORLDS_API_PATH = '/api/mundos/mine';
export const FOLLOW_PATH = '/api/follow';

/** The chrome's session client, as it publishes it (lib/island-session.ts PAGE_SESSION_READY). */
const SESSION_READY = 'numinia:session-ready';

interface SessionLike {
  readonly status: string;
}
interface SessionClientLike {
  subscribe(listener: (session: SessionLike) => void): unknown;
}
export interface SessionWindowLike extends EventTarget {
  numiniaSession?: SessionClientLike;
}

/**
 * Calls `then` once, the first time the page's session says it is in; a
 * page that never signs in never calls it. Waits for the chrome to publish
 * its client when it has not yet.
 */
export function onceSignedIn(win: SessionWindowLike, then: () => void): void {
  let done = false;
  const watch = (client: SessionClientLike): void => {
    client.subscribe((session) => {
      if (done || session.status !== 'in') return;
      done = true;
      then();
    });
  };
  if (win.numiniaSession) return watch(win.numiniaSession);
  win.addEventListener(
    SESSION_READY,
    () => {
      if (win.numiniaSession) watch(win.numiniaSession);
    },
    { once: true },
  );
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** GET /api/rsvp's body: the ids of the encounters the wallet is going to, or null when it is not that. */
export function readRsvpMine(body: unknown): readonly string[] | null {
  if (!isRecord(body) || !Array.isArray(body['mine'])) return null;
  return (body['mine'] as unknown[]).filter((id): id is string => typeof id === 'string');
}

/** GET /api/follow's body: the ids of the communities the wallet follows — the same `mine` shape. */
export function readFollowMine(body: unknown): readonly string[] | null {
  return readRsvpMine(body);
}

/** GET /api/mundos/mine's body: the account ids of the organizations you are in, or null when it is not that. */
export function readMyTeamIds(body: unknown): readonly string[] | null {
  if (!isRecord(body) || body['ok'] !== true || !Array.isArray(body['communities'])) return null;
  return (body['communities'] as unknown[])
    .map((team) => (isRecord(team) ? team['accountId'] : undefined))
    .filter((id): id is string => typeof id === 'string');
}

/**
 * The account id the till derives for a register community — the same
 * formula as lib/community-teams.ts `communityAccountId`, repeated here (not
 * imported: see the header) so a followed community and the organization
 * you belong to count as one.
 */
export async function communityAccountId(communityId: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(`numinia-till community ${communityId}`),
  );
  const hex = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0'));
  return `acc_t_${hex.join('').slice(0, 32)}`;
}

/** How many communities are yours: the organizations you are in and the ones you follow, each once. */
export async function communitiesCount(
  teamIds: readonly string[],
  followIds: readonly string[],
): Promise<number> {
  const yours = new Set(teamIds);
  for (const id of await Promise.all([...new Set(followIds)].map(communityAccountId)))
    yours.add(id);
  return yours.size;
}

/**
 * How many of the ids are still to come: `ends` maps each upcoming
 * encounter of the register to the millisecond it ends (lib/agenda.ts
 * `agendaEnds`, written into the markup at build); an id the map lacks is
 * over or unknown, and is not counted.
 */
export function upcomingCount(
  mine: readonly string[],
  ends: Readonly<Record<string, number>>,
  nowMs: number,
): number {
  return [...new Set(mine)].filter((id) => (ends[id] ?? 0) > nowMs).length;
}

/** The map of ends as the markup carries it (`data-ritual-ends`), or none when it is not one. */
export function readEnds(json: string | undefined): Readonly<Record<string, number>> {
  if (json === undefined || json === '') return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return {};
  }
  if (!isRecord(parsed)) return {};
  return Object.fromEntries(
    Object.entries(parsed).filter(
      (entry): entry is [string, number] => typeof entry[1] === 'number',
    ),
  );
}

/** GET /api/mundos/mine's body: how many worlds your communities have, or null when it is not that. */
export function readMyWorldsCount(body: unknown): number | null {
  if (!isRecord(body) || body['ok'] !== true) return null;
  const { count } = body;
  return typeof count === 'number' && Number.isInteger(count) && count >= 0 ? count : null;
}

/** What the three counters show: null for «nothing to show» (the figure stays hidden). */
export interface YouCounts {
  readonly agenda: number | null;
  readonly worlds: number | null;
  readonly communities: number | null;
}

type Fetch = (input: string, init?: RequestInit) => Promise<Response>;

/** One JSON body, or null for any status but 200 or any failure. */
async function bodyOf(fetcher: Fetch, path: string): Promise<unknown> {
  try {
    const response = await fetcher(path, {
      credentials: 'same-origin',
      headers: { accept: 'application/json' },
    });
    const text = await response.text();
    return response.ok ? (JSON.parse(text) as unknown) : null;
  } catch {
    return null;
  }
}

const some = (count: number): number | null => (count > 0 ? count : null);

/** The three reads at once; a count of 0 reads as null (never a «0»). Never throws. */
export async function loadYouCounts(
  fetcher: Fetch,
  ends: Readonly<Record<string, number>>,
  nowMs: number,
): Promise<YouCounts> {
  const [rsvp, worlds, follows] = await Promise.all([
    bodyOf(fetcher, RSVP_PATH),
    bodyOf(fetcher, MY_WORLDS_API_PATH),
    bodyOf(fetcher, FOLLOW_PATH),
  ]);
  const mine = readRsvpMine(rsvp);
  const agenda = mine === null ? 0 : upcomingCount(mine, ends, nowMs);
  const count = readMyWorldsCount(worlds) ?? 0;
  const communities = await communitiesCount(
    readMyTeamIds(worlds) ?? [],
    readFollowMine(follows) ?? [],
  );
  return { agenda: some(agenda), worlds: some(count), communities: some(communities) };
}

/** Paints a count into every figure of its kind: the number shown, or hidden when there is none. */
export function paintCount(figures: readonly HTMLElement[], count: number | null): void {
  for (const figure of figures) {
    figure.hidden = count === null;
    figure.textContent = count === null ? '' : String(count);
  }
}
