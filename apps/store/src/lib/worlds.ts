/**
 * The worlds room's model (numinia-archive ADR-069), shaped after the
 * Alchemists' Tower — the console César built for the EKS worlds: a strip
 * of figures, search and filters, cards with a status pill that says why,
 * a create wizard, a close that asks you to type the name, a history.
 *
 * What differs is the plumbing, on purpose. The Tower held keys to the
 * whole infrastructure; this room holds none. A world is three things in
 * three places: its card in the Summa (what it is, its cover), its order in
 * numinia-assets `open-worlds/` (where and how it runs) and its keys, which
 * never leave its server. The room reads the first two, asks each world's
 * public `/status` like any visitor would, and changes things only by
 * proposing a pull request on the order book.
 *
 * Pure: no fetch, no env. The order rules mirror numinia-assets
 * `tests/test_open_worlds.py` one for one, so the console never proposes
 * an order the depot's own test would refuse.
 */

import type { SummaCard } from './summa';

export const DEPOT = 'numengames/numinia-assets';
export const DEPOT_BRANCH = 'main';
export const FLEET_DIR = 'open-worlds';
export const DOMAIN_SUFFIX = 'numen.games';
/** The engine build the wizard proposes: numinia-hyperfy2 `dev`, pinned. */
export const DEFAULT_IMAGE =
  'ghcr.io/numengames/numinia-hyperfy2:sha-0e2045370989d051e73f81c7c9d53121d5c374b3';
export const DEFAULT_LIMITS = { memory: '2g', cpus: '1.5', maxUploadMb: 50 } as const;
export const DEFAULT_SERVER = 'open-1';
/** The house's reviewers, asked on every proposal. */
export const REVIEWERS = ['PabloFMM', 'MariaGarciaJordan', 'Christian-Numen'] as const;

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DOMAIN = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/;
const IMAGE = /^[a-z0-9./_-]+(?::sha-[0-9a-f]{7,40}|@sha256:[0-9a-f]{64})$/;
const MEMORY = /^[0-9]+(?:\.[0-9]+)?[mg]$/;
const CPUS = /^[0-9]+(?:\.[0-9]+)?$/;
const IPV4 = /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/;
const SECRET = /(secret|password|passwd|token|api[_-]?key|private key|jwt|admin_code|livekit_)/i;
const FIELDS = ['id', 'card', 'state', 'server', 'domain', 'image', 'limits'] as const;
const LIMIT_FIELDS = ['cpus', 'maxUploadMb', 'memory'] as const;

export type OrderState = 'running' | 'stopped';

export interface WorldLimits {
  readonly memory: string;
  readonly cpus: string;
  readonly maxUploadMb: number;
}

export interface WorldOrder {
  readonly id: string;
  readonly card: string;
  readonly state: OrderState;
  readonly server: string;
  readonly domain: string;
  readonly image: string;
  readonly limits: WorldLimits;
}

/** What is wrong with an order, one code per broken rule. */
export type OrderProblem =
  | 'json'
  | 'object'
  | 'fields'
  | 'file-name'
  | 'id'
  | 'card'
  | 'server'
  | 'state'
  | 'domain'
  | 'image'
  | 'limits'
  | 'memory'
  | 'cpus'
  | 'upload'
  | 'ip'
  | 'secret';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function sameKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const own = Object.keys(value).sort();
  const wanted = [...keys].sort();
  return own.length === wanted.length && own.every((key, index) => key === wanted[index]);
}

const text = (value: unknown): string => (typeof value === 'string' ? value : '');

/**
 * Every rule an order file breaks; empty means valid. `stem` is the file
 * name without `.json` — the id must equal it.
 */
export function orderProblems(source: string, stem: string): OrderProblem[] {
  let order: unknown;
  try {
    order = JSON.parse(source);
  } catch {
    return ['json'];
  }
  if (!isRecord(order)) return ['object'];
  const found: OrderProblem[] = [];
  if (!sameKeys(order, FIELDS)) found.push('fields');
  if (order.id !== stem) found.push('file-name');
  for (const key of ['id', 'card', 'server'] as const) {
    if (!SLUG.test(text(order[key]))) found.push(key);
  }
  if (order.state !== 'running' && order.state !== 'stopped') found.push('state');
  if (!DOMAIN.test(text(order.domain))) found.push('domain');
  if (!IMAGE.test(text(order.image))) found.push('image');
  const limits = order.limits;
  if (!isRecord(limits) || !sameKeys(limits, LIMIT_FIELDS)) {
    found.push('limits');
  } else {
    if (!MEMORY.test(text(limits.memory))) found.push('memory');
    if (!CPUS.test(text(limits.cpus))) found.push('cpus');
    const upload = limits.maxUploadMb;
    if (typeof upload !== 'number' || !Number.isInteger(upload) || upload <= 0) {
      found.push('upload');
    }
  }
  if (IPV4.test(source)) found.push('ip');
  if (SECRET.test(source)) found.push('secret');
  return found;
}

export type ParsedOrder =
  { readonly order: WorldOrder } | { readonly problems: readonly OrderProblem[] };

/** An order file read from the depot: the order, or what is wrong with it. */
export function parseOrder(source: string, stem: string): ParsedOrder {
  const problems = orderProblems(source, stem);
  if (problems.length > 0) return { problems };
  // orderProblems proved every field's type and shape; copy them out by name.
  const raw = JSON.parse(source) as WorldOrder;
  return {
    order: {
      id: raw.id,
      card: raw.card,
      state: raw.state,
      server: raw.server,
      domain: raw.domain,
      image: raw.image,
      limits: {
        memory: raw.limits.memory,
        cpus: raw.limits.cpus,
        maxUploadMb: raw.limits.maxUploadMb,
      },
    },
  };
}

/** The file exactly as the depot keeps it: fixed key order, two spaces, final newline. */
export function renderOrder(order: WorldOrder): string {
  const ordered = {
    id: order.id,
    card: order.card,
    state: order.state,
    server: order.server,
    domain: order.domain,
    image: order.image,
    limits: {
      memory: order.limits.memory,
      cpus: order.limits.cpus,
      maxUploadMb: order.limits.maxUploadMb,
    },
  };
  return `${JSON.stringify(ordered, null, 2)}\n`;
}

/** The wizard's fields, as typed. */
export interface OrderDraft {
  readonly id: string;
  readonly card: string;
  readonly server: string;
  readonly domain: string;
  readonly image: string;
  readonly memory: string;
  readonly cpus: string;
  readonly maxUploadMb: string;
}

/** A fresh draft with the house defaults. */
export function emptyDraft(server: string = DEFAULT_SERVER): OrderDraft {
  return {
    id: '',
    card: '',
    server,
    domain: '',
    image: DEFAULT_IMAGE,
    memory: DEFAULT_LIMITS.memory,
    cpus: DEFAULT_LIMITS.cpus,
    maxUploadMb: String(DEFAULT_LIMITS.maxUploadMb),
  };
}

/** The address the wizard suggests for a world id. */
export function suggestDomain(id: string): string {
  return id === '' ? '' : `${id}.${DOMAIN_SUFFIX}`;
}

export type DraftResult =
  { readonly order: WorldOrder } | { readonly problems: readonly OrderProblem[] };

/** A draft becomes an order only if the depot's own rules accept it. */
export function draftToOrder(draft: OrderDraft): DraftResult {
  const clean = (value: string): string => value.trim().toLowerCase();
  const upload = Number(draft.maxUploadMb.trim());
  const order: WorldOrder = {
    id: clean(draft.id),
    card: clean(draft.card),
    state: 'running',
    server: clean(draft.server),
    domain: clean(draft.domain),
    image: draft.image.trim(),
    limits: {
      memory: clean(draft.memory),
      cpus: draft.cpus.trim(),
      maxUploadMb: Number.isFinite(upload) ? upload : 0,
    },
  };
  const problems = orderProblems(renderOrder(order), order.id);
  return problems.length > 0 ? { problems } : { order };
}

// ---------------------------------------------------------------------------
// Cards: what the Summa says each world is
// ---------------------------------------------------------------------------

export interface WorldCardInfo {
  readonly slug: string;
  readonly title: string;
  /** The cover: the card's `cover` form — the same picture the world shows while loading. */
  readonly cover: string | null;
}

/** The world cards of the Summa catalogue, with their covers, by title. */
export function worldCards(entities: readonly SummaCard[]): WorldCardInfo[] {
  return entities
    .filter((card) => card.entity === 'world')
    .map((card) => {
      const form = card.forms.find((candidate) => candidate.role === 'cover');
      const copy = form?.copies.find((candidate) => candidate.url !== undefined);
      return { slug: card.slug, title: card.title, cover: copy?.url ?? null };
    })
    .sort((a, b) => a.title.localeCompare(b.title));
}

// ---------------------------------------------------------------------------
// Probes: what each world answers on its public /status
// ---------------------------------------------------------------------------

export type ProbeFailure = 'timeout' | 'network' | 'http' | 'shape';

export type Probe =
  | {
      readonly ok: true;
      readonly users: number;
      readonly uptime: number;
      readonly commit: string | null;
    }
  | { readonly ok: false; readonly reason: ProbeFailure; readonly status?: number };

/**
 * A world's `/status` body → counts only. The engine lists every visitor's
 * name and position there; the room keeps the number and drops the rest.
 */
export function readProbe(body: unknown): Probe {
  if (!isRecord(body)) return { ok: false, reason: 'shape' };
  const { uptime, connectedUsers, commitHash } = body;
  if (typeof uptime !== 'number' || !Array.isArray(connectedUsers)) {
    return { ok: false, reason: 'shape' };
  }
  return {
    ok: true,
    users: connectedUsers.length,
    uptime,
    commit: typeof commitHash === 'string' && commitHash !== '' ? commitHash.slice(0, 7) : null,
  };
}

// ---------------------------------------------------------------------------
// Proposals: changes asked for by pull request
// ---------------------------------------------------------------------------

export const CHANGE_ACTIONS = ['create', 'stop', 'start', 'close'] as const;
export type ChangeAction = (typeof CHANGE_ACTIONS)[number];

export interface PendingChange {
  readonly id: string;
  readonly action: ChangeAction;
  readonly number: number;
  readonly url: string;
}

const BRANCH = /^open-worlds\/([a-z0-9]+(?:-[a-z0-9]+)*)\/(create|stop|start|close)-[a-z0-9]+$/;

/** The branch a proposal is opened from; the room recognises its own by it. */
export function changeBranch(id: string, action: ChangeAction, stamp: string): string {
  return `${FLEET_DIR}/${id}/${action}-${stamp}`;
}

/** A pull request's head branch → the world and change it asks for, if it is the room's. */
export function parseChangeBranch(ref: string): { id: string; action: ChangeAction } | null {
  const match = BRANCH.exec(ref);
  if (!match) return null;
  return { id: match[1] as string, action: match[2] as ChangeAction };
}

/** The order after a stop or a start. */
export function withState(order: WorldOrder, state: OrderState): WorldOrder {
  return { ...order, state };
}

const SUBJECTS: Readonly<Record<ChangeAction, string>> = {
  create: 'feat(open-worlds): order the world',
  stop: 'chore(open-worlds): stop the world',
  start: 'chore(open-worlds): start the world',
  close: 'chore(open-worlds): close the world',
};

/** Pull request title (and commit subject) for a change. */
export function proposalTitle(action: ChangeAction, id: string): string {
  return `${SUBJECTS[action]} ${id}`;
}

/** Commit message: the subject plus the wallet that asked, as a trailer. */
export function proposalCommit(action: ChangeAction, id: string, actor: string): string {
  return `${proposalTitle(action, id)}\n\nActing-Wallet: ${actor}`;
}

const AFTER: Readonly<Record<ChangeAction, string>> = {
  create: 'On merge, the public fleet starts this world on its server.',
  stop: 'On merge, the server stops the container. Data, copies and card stay.',
  start: 'On merge, the server starts the container again.',
  close:
    'On merge, the order leaves the fleet and the server stops the world. Its card, its copies and its data stay; nothing is deleted.',
};

/** Pull request body: what is asked, what happens on merge, who asked. */
export function proposalBody(action: ChangeAction, id: string, actor: string): string {
  return [
    `Proposed from the worlds room on numinia.com (ADR-069).`,
    '',
    `- **World:** \`${id}\``,
    `- **Change:** ${action}`,
    `- **Order file:** \`${FLEET_DIR}/${id}.json\``,
    `- **Asked by wallet:** \`${actor}\``,
    '',
    AFTER[action],
  ].join('\n');
}

// ---------------------------------------------------------------------------
// GitHub links: the same changes, opened by hand when the room has no key
// ---------------------------------------------------------------------------

const GITHUB = `https://github.com/${DEPOT}`;

export function orderPath(id: string): string {
  return `${FLEET_DIR}/${id}.json`;
}

/** GitHub's "new file" page with the order already written in. */
export function newOrderUrl(order: WorldOrder): string {
  const query = new URLSearchParams({ filename: `${order.id}.json`, value: renderOrder(order) });
  return `${GITHUB}/new/${DEPOT_BRANCH}/${FLEET_DIR}?${query.toString()}`;
}

export function editOrderUrl(id: string): string {
  return `${GITHUB}/edit/${DEPOT_BRANCH}/${orderPath(id)}`;
}

export function deleteOrderUrl(id: string): string {
  return `${GITHUB}/delete/${DEPOT_BRANCH}/${orderPath(id)}`;
}

export function orderFileUrl(id: string): string {
  return `${GITHUB}/blob/${DEPOT_BRANCH}/${orderPath(id)}`;
}

export function fleetHistoryUrl(): string {
  return `${GITHUB}/commits/${DEPOT_BRANCH}/${FLEET_DIR}`;
}

// ---------------------------------------------------------------------------
// Rows: order × card × probe × pending change → what the room shows
// ---------------------------------------------------------------------------

export type WorldStatus = 'running' | 'stopped' | 'unreachable' | 'unknown' | 'requested';

/**
 * A world that runs outside the order book: set up by hand on the old
 * machine, before the fleet existed. The room watches it (the Tower's
 * "legacy" mark) and never changes it; it joins the book only when an order
 * for it is merged, and from then on the order wins.
 */
export interface LegacyWorld {
  readonly id: string;
  readonly domain: string;
  readonly server: string;
}

/** What a world shows of itself: its page title and its loading picture. */
export interface WorldFace {
  readonly title: string | null;
  readonly image: string | null;
}

export interface WorldRow {
  readonly id: string;
  readonly title: string;
  readonly cover: string | null;
  /** The order names a card the Summa does not have. */
  readonly missingCard: boolean;
  readonly status: WorldStatus;
  readonly probe: Probe | null;
  readonly pending: PendingChange | null;
  /** Null while the world is only asked for (its order is still in a pull request). */
  readonly order: WorldOrder | null;
  /** Set for a world the room only watches (no order: nothing to stop, start or close). */
  readonly legacy: LegacyWorld | null;
}

export interface RowsInput {
  readonly orders: readonly WorldOrder[];
  readonly cards: readonly WorldCardInfo[];
  readonly probes: Readonly<Record<string, Probe>>;
  readonly pending: readonly PendingChange[];
  readonly legacy?: readonly LegacyWorld[];
  /** Read from each world's own page when the Summa has no card for it. */
  readonly faces?: Readonly<Record<string, WorldFace>>;
}

function statusOf(order: WorldOrder, probe: Probe | undefined): WorldStatus {
  if (order.state === 'stopped') return 'stopped';
  return seen(probe);
}

function seen(probe: Probe | undefined): WorldStatus {
  if (!probe) return 'unknown';
  return probe.ok ? 'running' : 'unreachable';
}

/**
 * The Tower's trick: what was asked for crossed with what is seen running.
 * An order is "running" only when its world answers; a world still waiting
 * in a pull request shows up as "requested", like the Tower's provisioning
 * rows. Without a card, a world is named and pictured by its own page (the
 * picture it shows while loading). A legacy world is listed after the
 * orders, unless an order already holds its id or its address.
 */
export function buildRows(input: RowsInput): WorldRow[] {
  const cards = new Map(input.cards.map((card) => [card.slug, card]));
  const faces = input.faces ?? {};
  const pendingById = new Map(input.pending.map((change) => [change.id, change]));
  const rows: WorldRow[] = input.orders.map((order) => {
    const card = cards.get(order.card);
    const face = faces[order.id];
    const probe = input.probes[order.id];
    return {
      id: order.id,
      title: card?.title ?? face?.title ?? order.id,
      cover: card?.cover ?? face?.image ?? null,
      missingCard: card === undefined,
      status: statusOf(order, probe),
      probe: probe ?? null,
      pending: pendingById.get(order.id) ?? null,
      order,
      legacy: null,
    };
  });
  const ordered = new Set(input.orders.map((order) => order.id));
  for (const change of input.pending) {
    if (change.action !== 'create' || ordered.has(change.id)) continue;
    const card = cards.get(change.id);
    rows.push({
      id: change.id,
      title: card?.title ?? change.id,
      cover: card?.cover ?? null,
      missingCard: false,
      status: 'requested',
      probe: null,
      pending: change,
      order: null,
      legacy: null,
    });
  }
  const addresses = new Set(input.orders.map((order) => order.domain));
  for (const world of input.legacy ?? []) {
    if (ordered.has(world.id) || addresses.has(world.domain)) continue;
    const face = faces[world.id];
    const probe = input.probes[world.id];
    rows.push({
      id: world.id,
      title: face?.title ?? world.id,
      cover: face?.image ?? null,
      missingCard: false,
      status: seen(probe),
      probe: probe ?? null,
      pending: null,
      order: null,
      legacy: world,
    });
  }
  return rows.sort((a, b) => a.title.localeCompare(b.title) || a.id.localeCompare(b.id));
}

/** Where a row's world lives — from its order, or from the legacy list; null while only asked for. */
export function rowPlace(
  row: WorldRow,
): { readonly server: string; readonly domain: string } | null {
  return row.order ?? row.legacy;
}

export interface FleetStats {
  readonly total: number;
  readonly running: number;
  readonly stopped: number;
  readonly problems: number;
  readonly requested: number;
}

export function fleetStats(rows: readonly WorldRow[]): FleetStats {
  const count = (status: WorldStatus): number => rows.filter((row) => row.status === status).length;
  return {
    total: rows.length,
    running: count('running'),
    stopped: count('stopped'),
    problems: count('unreachable'),
    requested: count('requested'),
  };
}

export type StatusFilter = 'all' | WorldStatus;

export interface RowFilter {
  readonly query: string;
  readonly status: StatusFilter;
  /** '' = every server. */
  readonly server: string;
}

/** Search over id, title, card, address and server; then status; then server. */
export function filterRows(rows: readonly WorldRow[], filter: RowFilter): WorldRow[] {
  const needle = filter.query.trim().toLowerCase();
  return rows.filter((row) => {
    const place = rowPlace(row);
    if (filter.status !== 'all' && row.status !== filter.status) return false;
    if (filter.server !== '' && place?.server !== filter.server) return false;
    if (needle === '') return true;
    const haystack = [row.id, row.title, row.order?.card, place?.domain, place?.server]
      .filter((part): part is string => part !== undefined)
      .join(' ')
      .toLowerCase();
    return haystack.includes(needle);
  });
}

/** Every server some order (or the legacy list) names, sorted. */
export function fleetServers(rows: readonly WorldRow[]): string[] {
  const names = new Set<string>();
  for (const row of rows) {
    const place = rowPlace(row);
    if (place) names.add(place.server);
  }
  return [...names].sort();
}

export interface ServerGroup {
  /** null = worlds still only asked for, with no server yet. */
  readonly server: string | null;
  readonly rows: readonly WorldRow[];
}

/** Rows grouped by server (the Tower grouped by organisation); the unplaced go last. */
export function groupByServer(rows: readonly WorldRow[]): ServerGroup[] {
  const groups = new Map<string | null, WorldRow[]>();
  for (const row of rows) {
    const key = rowPlace(row)?.server ?? null;
    const list = groups.get(key) ?? [];
    list.push(row);
    groups.set(key, list);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => (a === null ? 1 : b === null ? -1 : a.localeCompare(b)))
    .map(([server, list]) => ({ server, rows: list }));
}

// ---------------------------------------------------------------------------
// Small display helpers
// ---------------------------------------------------------------------------

/** The engine build, short: `sha-0e20453` or `sha256:1a2b3c4d5e6f`. */
export function buildTag(image: string): string {
  const tag = /:sha-([0-9a-f]{7,40})$/.exec(image);
  if (tag) return `sha-${(tag[1] as string).slice(0, 7)}`;
  const digest = /@sha256:([0-9a-f]{64})$/.exec(image);
  if (digest) return `sha256:${(digest[1] as string).slice(0, 12)}`;
  return image;
}

/** Seconds awake → a short span: `45 min`, `3 h`, `2 d 4 h`. */
export function formatUptime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h`;
  const days = Math.floor(hours / 24);
  const rest = hours % 24;
  return rest === 0 ? `${days} d` : `${days} d ${rest} h`;
}

/** `{name}` placeholders → values; unknown placeholders stay as written. */
export function fill(template: string, values: Readonly<Record<string, string | number>>): string {
  return template.replace(/\{(\w+)\}/g, (whole, key: string) =>
    key in values ? String(values[key]) : whole,
  );
}

/** The wizard field each broken rule points at; `other` = the order's format itself. */
export type DraftField =
  'id' | 'card' | 'server' | 'domain' | 'image' | 'memory' | 'cpus' | 'upload' | 'other';

const PROBLEM_FIELD: Readonly<Record<OrderProblem, DraftField>> = {
  json: 'other',
  object: 'other',
  fields: 'other',
  'file-name': 'id',
  id: 'id',
  card: 'card',
  server: 'server',
  state: 'other',
  domain: 'domain',
  image: 'image',
  limits: 'other',
  memory: 'memory',
  cpus: 'cpus',
  upload: 'upload',
  ip: 'domain',
  secret: 'other',
};

/** The fields to mark, once each, in the order the rules were broken. */
export function problemFields(problems: readonly OrderProblem[]): DraftField[] {
  return [...new Set(problems.map((problem) => PROBLEM_FIELD[problem]))];
}

export interface ReasonWords {
  readonly users: string;
  readonly uptime: string;
  readonly engine: string;
  readonly timeout: string;
  readonly network: string;
  readonly http: string;
  readonly shape: string;
  readonly stopped: string;
  readonly requested: string;
  readonly unknown: string;
}

/** Why a world shows the status it shows, in one line (the Tower's tooltip, made visible). */
export function describeStatus(row: WorldRow, words: ReasonWords): string {
  const probe = row.probe;
  if (row.status === 'running' && probe?.ok) {
    const parts = [
      fill(words.users, { n: probe.users }),
      fill(words.uptime, { t: formatUptime(probe.uptime) }),
    ];
    if (probe.commit) parts.push(fill(words.engine, { c: probe.commit }));
    return parts.join(' · ');
  }
  if (row.status === 'unreachable' && probe && !probe.ok) {
    if (probe.reason === 'http') return fill(words.http, { s: probe.status ?? '?' });
    return words[probe.reason];
  }
  if (row.status === 'stopped') return words.stopped;
  if (row.status === 'requested') return fill(words.requested, { n: row.pending?.number ?? '?' });
  return words.unknown;
}
