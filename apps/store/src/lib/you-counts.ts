/**
 * The counters of your rail (cut I, «Tu agenda» · «Tus mundos»): beside
 * «Tu agenda», how many encounters you said you are going to that are still
 * to come; beside «Tus mundos», how many worlds your communities have. Read
 * once per page, right after the chrome's one session read says you are
 * in — one GET each (`/api/rsvp`, `/api/mundos/mine`) — and painted into
 * the markup the page already has (the rail, the phone's «Tú» sheet).
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

/** What the two counters show: null for «nothing to show» (the figure stays hidden). */
export interface YouCounts {
  readonly agenda: number | null;
  readonly worlds: number | null;
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

/** Both reads at once; a count of 0 reads as null (never a «0»). Never throws. */
export async function loadYouCounts(
  fetcher: Fetch,
  ends: Readonly<Record<string, number>>,
  nowMs: number,
): Promise<YouCounts> {
  const [rsvp, worlds] = await Promise.all([
    bodyOf(fetcher, RSVP_PATH),
    bodyOf(fetcher, MY_WORLDS_API_PATH),
  ]);
  const mine = readRsvpMine(rsvp);
  const agenda = mine === null ? 0 : upcomingCount(mine, ends, nowMs);
  const count = readMyWorldsCount(worlds) ?? 0;
  return { agenda: agenda > 0 ? agenda : null, worlds: count > 0 ? count : null };
}

/** Paints a count into every figure of its kind: the number shown, or hidden when there is none. */
export function paintCount(figures: readonly HTMLElement[], count: number | null): void {
  for (const figure of figures) {
    figure.hidden = count === null;
    figure.textContent = count === null ? '' : String(count);
  }
}
