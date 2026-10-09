/**
 * The worlds room's reads and proposals — everything that leaves the Worker.
 *
 * Reads: the order book (numinia-assets `open-worlds/`), its open pull
 * requests and its recent history, all public; plus each running world's
 * public `/status`, asked like any visitor would. Writes: none to a server,
 * ever. A change is a branch, one commit and a pull request on the order
 * book, reviewed like any other — the Tower's single-commit, reuse-the-PR
 * changeset, minus its keys to the rest of the infrastructure.
 *
 * The token (WORLDS_GITHUB_TOKEN) is optional and scoped to the depot alone.
 * Without it the room still reads, and proposals fall back to GitHub's own
 * new/edit/delete pages, opened by the Oracle's own account.
 */

import { z } from 'zod';
import {
  DEPOT,
  DEPOT_BRANCH,
  FLEET_DIR,
  REVIEWERS,
  buildRows,
  changeBranch,
  orderPath,
  parseChangeBranch,
  parseOrder,
  proposalBody,
  proposalCommit,
  proposalTitle,
  readProbe,
  renderOrder,
  withState,
  type ChangeAction,
  type OrderProblem,
  type PendingChange,
  type Probe,
  type LegacyWorld,
  type WorldCardInfo,
  type WorldFace,
  type WorldOrder,
  type WorldRow,
} from './worlds';

const API = `https://api.github.com/repos/${DEPOT}`;

type Fetch = typeof fetch;

/** The token, when the house gave the room one; anything shorter than a real token is none. */
export function worldsToken(env: Readonly<Record<string, string | undefined>>): string | null {
  const token = env.WORLDS_GITHUB_TOKEN?.trim() ?? '';
  return token.length >= 20 ? token : null;
}

export class FleetError extends Error {
  constructor(
    readonly status: number,
    what: string,
  ) {
    super(`GitHub answered ${status} on ${what}`);
    this.name = 'FleetError';
  }
}

function headers(token: string | null): Record<string, string> {
  return {
    accept: 'application/vnd.github+json',
    'user-agent': 'numinia-worlds-room',
    'x-github-api-version': '2022-11-28',
    ...(token ? { authorization: `Bearer ${token}` } : {}),
  };
}

async function getJson(
  fetchImpl: Fetch,
  url: string,
  token: string | null,
  what: string,
): Promise<unknown> {
  const response = await fetchImpl(url, { headers: headers(token) });
  if (!response.ok) throw new FleetError(response.status, what);
  return response.json();
}

const DirShape = z.array(
  z.object({ name: z.string(), type: z.string(), download_url: z.string().nullable() }),
);
const PullsShape = z.array(
  z.object({ number: z.number(), html_url: z.string(), head: z.object({ ref: z.string() }) }),
);
const CommitsShape = z.array(
  z.object({
    sha: z.string(),
    html_url: z.string(),
    author: z.object({ login: z.string() }).nullable(),
    commit: z.object({
      message: z.string(),
      author: z.object({ name: z.string(), date: z.string() }),
    }),
  }),
);

export interface HistoryEntry {
  readonly sha: string;
  readonly subject: string;
  readonly author: string;
  readonly date: string;
  readonly url: string;
}

export interface InvalidOrder {
  readonly file: string;
  readonly problems: readonly OrderProblem[];
}

export interface FleetSnapshot {
  readonly orders: readonly WorldOrder[];
  readonly invalid: readonly InvalidOrder[];
  readonly pending: readonly PendingChange[];
  readonly history: readonly HistoryEntry[];
}

async function readOrders(
  fetchImpl: Fetch,
  token: string | null,
): Promise<{ orders: WorldOrder[]; invalid: InvalidOrder[] }> {
  const response = await fetchImpl(`${API}/contents/${FLEET_DIR}?ref=${DEPOT_BRANCH}`, {
    headers: headers(token),
  });
  // No folder yet is an empty fleet, not an error.
  if (response.status === 404) return { orders: [], invalid: [] };
  if (!response.ok) throw new FleetError(response.status, `${FLEET_DIR}/`);
  const entries = DirShape.parse(await response.json()).filter(
    (entry) => entry.type === 'file' && entry.name.endsWith('.json') && entry.download_url,
  );
  const files = await Promise.all(
    entries.map(async (entry) => {
      const raw = await fetchImpl(entry.download_url as string);
      if (!raw.ok) throw new FleetError(raw.status, `${FLEET_DIR}/${entry.name}`);
      return { name: entry.name, source: await raw.text() };
    }),
  );
  const orders: WorldOrder[] = [];
  const invalid: InvalidOrder[] = [];
  for (const file of files) {
    const parsed = parseOrder(file.source, file.name.slice(0, -'.json'.length));
    if ('order' in parsed) orders.push(parsed.order);
    else invalid.push({ file: file.name, problems: parsed.problems });
  }
  return { orders, invalid };
}

/** The whole order book as the room needs it: orders, open proposals, recent history. */
export async function readFleet(fetchImpl: Fetch, token: string | null): Promise<FleetSnapshot> {
  const [book, pulls, commits] = await Promise.all([
    readOrders(fetchImpl, token),
    getJson(fetchImpl, `${API}/pulls?state=open&per_page=100`, token, 'pulls'),
    getJson(
      fetchImpl,
      `${API}/commits?path=${FLEET_DIR}&sha=${DEPOT_BRANCH}&per_page=15`,
      token,
      'commits',
    ),
  ]);
  const pending: PendingChange[] = [];
  for (const pull of PullsShape.parse(pulls)) {
    const change = parseChangeBranch(pull.head.ref);
    if (change) pending.push({ ...change, number: pull.number, url: pull.html_url });
  }
  const history = CommitsShape.parse(commits).map((entry) => ({
    sha: entry.sha.slice(0, 7),
    subject: entry.commit.message.split('\n')[0] as string,
    author: entry.author?.login ?? entry.commit.author.name,
    date: entry.commit.author.date,
    url: entry.html_url,
  }));
  return { ...book, pending, history };
}

/** Ask a world's public `/status`, like a visitor. Never throws. */
export async function probeWorld(
  fetchImpl: Fetch,
  domain: string,
  timeoutMs = 3000,
): Promise<Probe> {
  let response: Response;
  try {
    response = await fetchImpl(`https://${domain}/status`, {
      headers: { accept: 'application/json', 'user-agent': 'numinia-worlds-room' },
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    const name = error instanceof Error ? error.name : '';
    return {
      ok: false,
      reason: name === 'TimeoutError' || name === 'AbortError' ? 'timeout' : 'network',
    };
  }
  if (!response.ok) return { ok: false, reason: 'http', status: response.status };
  try {
    return readProbe(await response.json());
  } catch {
    return { ok: false, reason: 'shape' };
  }
}

/** Probe every running order in parallel; stopped ones are not asked. */
export async function probeFleet(
  fetchImpl: Fetch,
  orders: readonly WorldOrder[],
  timeoutMs = 3000,
): Promise<Record<string, Probe>> {
  return probeWorlds(
    fetchImpl,
    orders.filter((order) => order.state === 'running'),
    timeoutMs,
  );
}

/** Probe any list of worlds by address, in parallel (the legacy list has no state to filter on). */
export async function probeWorlds(
  fetchImpl: Fetch,
  worlds: readonly { readonly id: string; readonly domain: string }[],
  timeoutMs = 3000,
): Promise<Record<string, Probe>> {
  const answers = await Promise.all(
    worlds.map(
      async (world) => [world.id, await probeWorld(fetchImpl, world.domain, timeoutMs)] as const,
    ),
  );
  return Object.fromEntries(answers);
}

// ---------------------------------------------------------------------------
// A world's face: what its own page says it is (title and loading picture)
// ---------------------------------------------------------------------------

const ENTITIES: Readonly<Record<string, string>> = {
  '&amp;': '&',
  '&quot;': '"',
  '&#39;': "'",
  '&lt;': '<',
  '&gt;': '>',
};

const unescape = (text: string): string =>
  text.replace(/&(?:amp|quot|#39|lt|gt);/g, (entity) => ENTITIES[entity] as string);

function meta(html: string, property: string): string | null {
  const match = new RegExp(`<meta\\s+property="${property}"\\s+content="([^"]*)"`, 'i').exec(html);
  const value = unescape(match?.[1] ?? '').trim();
  return value === '' ? null : value;
}

/**
 * The engine serves each world's title and its Settings image as og: tags —
 * the same picture the world shows while it loads. Only a picture served by
 * the world itself is kept.
 */
export function parseFace(html: string, domain: string): WorldFace {
  const titleTag = /<title>([^<]*)<\/title>/i.exec(html)?.[1];
  const title = meta(html, 'og:title') ?? (unescape(titleTag ?? '').trim() || null);
  const image = meta(html, 'og:image');
  return { title, image: image?.startsWith(`https://${domain}/`) ? image : null };
}

/** Read a world's page like a visitor; null when it does not answer. Never throws. */
export async function readFace(
  fetchImpl: Fetch,
  domain: string,
  timeoutMs = 3000,
): Promise<WorldFace | null> {
  try {
    const response = await fetchImpl(`https://${domain}/`, {
      headers: { accept: 'text/html', 'user-agent': 'numinia-worlds-room' },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok) return null;
    return parseFace((await response.text()).slice(0, 200_000), domain);
  } catch {
    return null;
  }
}

/** The faces of several worlds, in parallel; a world that does not answer is left out. */
export async function readFaces(
  fetchImpl: Fetch,
  worlds: readonly { readonly id: string; readonly domain: string }[],
  timeoutMs = 3000,
): Promise<Record<string, WorldFace>> {
  const answers = await Promise.all(
    worlds.map(
      async (world) => [world.id, await readFace(fetchImpl, world.domain, timeoutMs)] as const,
    ),
  );
  return Object.fromEntries(
    answers.filter((entry): entry is readonly [string, WorldFace] => entry[1] !== null),
  );
}

// ---------------------------------------------------------------------------
// Reading from the Oracle's own browser
// ---------------------------------------------------------------------------

const RAW = `https://raw.githubusercontent.com/${DEPOT}/${DEPOT_BRANCH}/${FLEET_DIR}`;
const WORLD_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MAX_PROBES = 50;

/** How the worlds look from outside: their /status and, without a card, their own page. */
export interface Watch {
  readonly probes: Readonly<Record<string, Probe>>;
  readonly faces: Readonly<Record<string, WorldFace>>;
}

/**
 * Watch the running worlds named by id. Each domain comes from the world's
 * order in the depot, read raw, never from the caller: the Worker only ever
 * asks a host that an approved order names. Invalid or unknown ids are
 * skipped. A world whose card is not in `carded` is also read for its face.
 */
export async function watchByIds(
  fetchImpl: Fetch,
  ids: readonly string[],
  carded: ReadonlySet<string>,
  timeoutMs = 3000,
): Promise<Watch> {
  const wanted = [...new Set(ids)].filter((id) => WORLD_ID.test(id)).slice(0, MAX_PROBES);
  const found = await Promise.all(
    wanted.map(async (id): Promise<WorldOrder | null> => {
      try {
        const raw = await fetchImpl(`${RAW}/${id}.json`);
        if (!raw.ok) return null;
        const parsed = parseOrder(await raw.text(), id);
        return 'order' in parsed ? parsed.order : null;
      } catch {
        return null;
      }
    }),
  );
  const running = found.filter(
    (order): order is WorldOrder => order !== null && order.state === 'running',
  );
  const [probes, faces] = await Promise.all([
    probeWorlds(fetchImpl, running, timeoutMs),
    readFaces(
      fetchImpl,
      running.filter((order) => !carded.has(order.card)),
      timeoutMs,
    ),
  ]);
  return { probes, faces };
}

/** What the Worker answers when it holds no key: who asks, the cards, and the legacy worlds watched. */
export interface KeylessAnswer extends Watch {
  readonly rank: string;
  readonly canPropose: boolean;
  readonly cards: readonly WorldCardInfo[];
  readonly legacy: readonly LegacyWorld[];
}

export interface RoomFleet {
  readonly rank: string;
  readonly canPropose: boolean;
  readonly cards: readonly WorldCardInfo[];
  readonly rows: readonly WorldRow[];
  readonly invalid: readonly InvalidOrder[];
  readonly history: readonly HistoryEntry[];
}

/**
 * The order book read by the Oracle's own browser. The depot is public, and
 * GitHub answers a person's own address where it refuses anonymous readers
 * on Cloudflare's shared ones, so the room needs no key to read. The Worker
 * adds only what needs a server: watching the running worlds.
 */
export async function readFleetHere(
  fetchImpl: Fetch,
  answer: KeylessAnswer,
  watchUrl = '/api/admin/worlds?probe=',
): Promise<RoomFleet> {
  const snapshot = await readFleet(fetchImpl, null);
  const running = snapshot.orders
    .filter((order) => order.state === 'running')
    .map((order) => order.id);
  let watch: Partial<Watch> = {};
  if (running.length > 0) {
    const response = await fetchImpl(`${watchUrl}${running.join(',')}`);
    if (response.ok) watch = (await response.json()) as Partial<Watch>;
  }
  return {
    rank: answer.rank,
    canPropose: answer.canPropose,
    cards: answer.cards,
    rows: buildRows({
      orders: snapshot.orders,
      cards: answer.cards,
      probes: { ...answer.probes, ...watch.probes },
      pending: snapshot.pending,
      legacy: answer.legacy,
      faces: { ...answer.faces, ...watch.faces },
    }),
    invalid: snapshot.invalid,
    history: snapshot.history,
  };
}

// ---------------------------------------------------------------------------
// Proposals
// ---------------------------------------------------------------------------

export type Change =
  | { readonly action: 'create'; readonly order: WorldOrder }
  | { readonly action: 'stop' | 'start' | 'close'; readonly id: string };

export type ProposalFailure = 'exists' | 'missing' | 'github';

export class ProposalError extends Error {
  constructor(
    readonly code: ProposalFailure,
    readonly status: number,
  ) {
    super(`Proposal failed: ${code} (${status})`);
    this.name = 'ProposalError';
  }
}

export interface Proposal {
  readonly number: number;
  readonly url: string;
}

const RefShape = z.object({ object: z.object({ sha: z.string() }) });
const FileShape = z.object({ sha: z.string(), content: z.string() });
const PullShape = z.object({ number: z.number(), html_url: z.string() });

function decodeBase64(content: string): string {
  const binary = atob(content.replace(/\s/g, ''));
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function encodeBase64(textContent: string): string {
  const bytes = new TextEncoder().encode(textContent);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

async function send(
  fetchImpl: Fetch,
  token: string,
  method: string,
  url: string,
  body: unknown,
): Promise<Response> {
  return fetchImpl(url, {
    method,
    headers: { ...headers(token), 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

async function expectOk(response: Response): Promise<unknown> {
  if (!response.ok) throw new ProposalError('github', response.status);
  return response.json();
}

/**
 * Open the pull request for one change: a branch from main, ONE commit on
 * the order file, the PR, then the house's reviewers one by one (a rejected
 * reviewer never sinks a proposal that already exists).
 */
export async function proposeChange(
  fetchImpl: Fetch,
  token: string,
  change: Change,
  actor: string,
  stamp: string,
): Promise<Proposal> {
  const id = change.action === 'create' ? change.order.id : change.id;
  const action: ChangeAction = change.action;
  const path = orderPath(id);

  const ref = RefShape.parse(
    await expectOk(
      await fetchImpl(`${API}/git/ref/heads/${DEPOT_BRANCH}`, { headers: headers(token) }),
    ),
  );

  const current = await fetchImpl(`${API}/contents/${path}?ref=${DEPOT_BRANCH}`, {
    headers: headers(token),
  });
  if (action === 'create' && current.ok) throw new ProposalError('exists', 409);
  if (action !== 'create' && current.status === 404) throw new ProposalError('missing', 404);
  if (!current.ok && current.status !== 404) throw new ProposalError('github', current.status);
  const file = current.ok ? FileShape.parse(await current.json()) : null;

  const branch = changeBranch(id, action, stamp);
  await expectOk(
    await send(fetchImpl, token, 'POST', `${API}/git/refs`, {
      ref: `refs/heads/${branch}`,
      sha: ref.object.sha,
    }),
  );

  const message = proposalCommit(action, id, actor);
  if (change.action === 'create') {
    await expectOk(
      await send(fetchImpl, token, 'PUT', `${API}/contents/${path}`, {
        message,
        content: encodeBase64(renderOrder(change.order)),
        branch,
      }),
    );
  } else if (change.action === 'close') {
    await expectOk(
      await send(fetchImpl, token, 'DELETE', `${API}/contents/${path}`, {
        message,
        sha: (file as { sha: string }).sha,
        branch,
      }),
    );
  } else {
    const existing = file as { sha: string; content: string };
    const parsed = parseOrder(decodeBase64(existing.content), id);
    if (!('order' in parsed)) throw new ProposalError('github', 422);
    const next = withState(parsed.order, change.action === 'stop' ? 'stopped' : 'running');
    await expectOk(
      await send(fetchImpl, token, 'PUT', `${API}/contents/${path}`, {
        message,
        content: encodeBase64(renderOrder(next)),
        sha: existing.sha,
        branch,
      }),
    );
  }

  const pull = PullShape.parse(
    await expectOk(
      await send(fetchImpl, token, 'POST', `${API}/pulls`, {
        title: proposalTitle(action, id),
        head: branch,
        base: DEPOT_BRANCH,
        body: proposalBody(action, id, actor),
      }),
    ),
  );
  for (const reviewer of REVIEWERS) {
    // Best effort, one by one: some repos refuse a batch they accept singly.
    await send(fetchImpl, token, 'POST', `${API}/pulls/${pull.number}/requested_reviewers`, {
      reviewers: [reviewer],
    }).catch(() => undefined);
  }
  return { number: pull.number, url: pull.html_url };
}
