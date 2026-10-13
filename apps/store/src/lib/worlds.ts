/**
 * The worlds room's model (numinia-archive ADR-069), shaped after the
 * Alchemists' Tower — the console César built for the EKS worlds: a strip
 * of figures, search and filters, cards with a status pill that says why,
 * a create wizard, a delete that asks you to type the name, a history.
 *
 * What differs is the plumbing, on purpose. The Tower held keys to the
 * whole infrastructure; this room holds none. A world is three things in
 * three places: its card in the Summa (what it is, its cover), its order on
 * its machine (where and how it runs) and its keys, which never leave the
 * machine. The room reads the cards, each machine's door (lib/fleet.ts) and
 * each world's public `/status` like any visitor would; it changes things
 * only by handing a machine a request the Oracle's wallet signed.
 *
 * Pure: no fetch, no env. The order rules mirror the machine's own checks
 * (numinia-assets `open-worlds/machine/reconcile.py`), so the room never
 * asks for an order the machine would refuse.
 */

import type { DoorFeature, DoorPhase, Heartbeat, Imports, UploadProgress } from './fleet';
import type { SummaCard } from './summa';

/** Names a world may not take: the machine's front service, and the old book's table of contents. */
export const RESERVED_IDS: readonly string[] = ['index', 'caddy'];
/**
 * The zones a world's address hangs from: one name under either. They mirror
 * the machine's own list (HOUSE_ZONES), which is what refuses an order in
 * the end; the first is the one the wizard proposes.
 */
export const WORLD_ZONES = ['numinia.com', 'numen.games'] as const;

/** A machine of the public fleet: the alias orders name, and its provider's public host name. */
export interface FleetMachine {
  readonly alias: string;
  /** Never an IP: only how the room checks where an address points. */
  readonly host: string;
}

/**
 * The fleet's machines, in the order the wizard offers them. A new machine
 * is a line here, plus its bootstrap line on the machine itself.
 */
export const FLEET_MACHINES: readonly FleetMachine[] = [
  { alias: 'open-1', host: 'vps-39c7f315.vps.ovh.net' },
];
/** The engine build the wizard proposes: numinia-hyperfy2 `dev`, pinned. */
export const DEFAULT_IMAGE =
  'ghcr.io/numengames/numinia-hyperfy2:sha-0e2045370989d051e73f81c7c9d53121d5c374b3';
export const DEFAULT_LIMITS = { memory: '2g', cpus: '1.5', maxUploadMb: 50 } as const;
export const DEFAULT_SERVER = 'open-1';

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
 * Every rule an order breaks; empty means valid. `stem` is the name the
 * order goes by — the id must equal it.
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
  // The reserved names: the machine's front service, and the old book's index.
  if (SLUG.test(text(order.id)) && RESERVED_IDS.includes(text(order.id))) found.push('id');
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

/** An order's text: the order, or what is wrong with it. */
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

/** An order as text, in its fixed key order, two spaces, final newline. */
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

/** The address for a name under a zone; '' while the name is empty. */
export function joinDomain(label: string, zone: string): string {
  const name = label.trim().toLowerCase();
  return name === '' ? '' : `${name}.${zone}`;
}

const LABEL = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

/** Exactly one name under one of the house zones — what a fleet machine accepts. */
export function inHouseZone(domain: string): boolean {
  const dot = domain.indexOf('.');
  if (dot < 1) return false;
  const zones: readonly string[] = WORLD_ZONES;
  return LABEL.test(domain.slice(0, dot)) && zones.includes(domain.slice(dot + 1));
}

export type DraftResult =
  { readonly order: WorldOrder } | { readonly problems: readonly OrderProblem[] };

/**
 * A draft becomes an order only if the order's rules accept it and its
 * address is one name under a house zone, which is all the machine serves.
 */
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
  if (!inHouseZone(order.domain) && !problems.includes('domain')) problems.push('domain');
  return problems.length > 0 ? { problems } : { order };
}

// ---------------------------------------------------------------------------
// Place: which machine, which address, and whether the address is free
// ---------------------------------------------------------------------------

/** A machine of the fleet as the room found it: its door answering, or not and why. */
export interface MachineSummary {
  readonly alias: string;
  readonly open: boolean;
  /** Why its door could not be read (`timeout`, `http 502`…); null when it was. */
  readonly reason: string | null;
  /** Whether its reconciler keeps up (lib/fleet.ts `machineHealth`); null when its door says nothing. */
  readonly heartbeat: Heartbeat | null;
  /** What its door listens to besides requests: `events` = it takes the room's beacons. */
  readonly listens: readonly DoorFeature[];
  /**
   * The numinia-assets commit it was installed from, as its door says (40
   * hex); null when its door says none, or does not answer. Against the room's
   * own (lib/fleet.ts `staleRecipe`), it says whether its line must run again.
   */
  readonly recipe: string | null;
  /**
   * Whether it brings worlds back from their zip, and the biggest zip it
   * takes, as its door says; null when its door says nothing (an older
   * machine) or does not answer.
   */
  readonly imports: Imports | null;
}

/**
 * The machines the wizard offers: those whose door answers, in the fleet's
 * order. A world sent to a machine with no door would never be created.
 */
export function machineChoices(machines: readonly MachineSummary[]): string[] {
  return machines.filter((machine) => machine.open).map((machine) => machine.alias);
}

/** The machines a world can be brought back to from its zip: those whose door says it takes zips. */
export function importMachines(
  machines: readonly MachineSummary[],
): { readonly alias: string; readonly zipMaxBytes: number }[] {
  return machines.flatMap((machine) =>
    machine.open && machine.imports !== null
      ? [{ alias: machine.alias, zipMaxBytes: machine.imports.zipMaxBytes }]
      : [],
  );
}

/** The public host name of a fleet machine, to compare addresses with; null if unknown. */
export function machineHost(alias: string): string | null {
  return FLEET_MACHINES.find((machine) => machine.alias === alias)?.host ?? null;
}

/** Who already holds this address: a world of the fleet (a clash), one being deleted (it frees soon) or a legacy world (a move). */
export function addressOwner(
  domain: string,
  rows: readonly WorldRow[],
): { readonly id: string; readonly legacy: boolean; readonly leaving: boolean } | null {
  const wanted = domain.trim().toLowerCase();
  if (wanted === '') return null;
  const row = rows.find((candidate) => rowPlace(candidate)?.domain === wanted);
  return row
    ? { id: row.id, legacy: row.legacy !== null, leaving: row.phase === 'deleting' }
    : null;
}

/**
 * Who already holds this name among the fleet's worlds: one that exists, or
 * one being deleted, whose folder and keys are not gone yet (the machine
 * answers `still-deleting` until they are). A legacy world's name is free:
 * the old machine reads no book.
 */
export function nameOwner(
  id: string,
  rows: readonly WorldRow[],
): { readonly id: string; readonly leaving: boolean } | null {
  const wanted = id.trim().toLowerCase();
  if (wanted === '') return null;
  const row = rows.find((candidate) => candidate.legacy === null && candidate.id === wanted);
  return row ? { id: row.id, leaving: row.phase === 'deleting' } : null;
}

/**
 * A name made from any text (a zip's `world.json`, its file name):
 * lowercase letters, digits and single hyphens, as an order's id must be, at
 * most 40 characters; '' when nothing is left.
 */
export function slugify(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+/, '')
    .slice(0, 40)
    .replace(/-+$/, '');
}

/**
 * The name the room proposes for a world brought back from a zip: its own,
 * made a name, unless a world of the fleet — one being deleted included —
 * holds it or its address under `zone`; then the first free `<name>-2`,
 * `<name>-3`…
 */
export function proposeName(source: string, rows: readonly WorldRow[], zone: string): string {
  const base = slugify(source) || 'world';
  const free = (name: string): boolean =>
    !RESERVED_IDS.includes(name) &&
    nameOwner(name, rows) === null &&
    addressOwner(joinDomain(name, zone), rows) === null;
  if (free(base)) return base;
  let n = 2;
  while (!free(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}

/**
 * Where an address points in public DNS, against the machine chosen for it:
 * at that machine, somewhere else, nowhere yet, or it could not be told.
 */
export type AddressDns = 'machine' | 'elsewhere' | 'none' | 'unknown';

/**
 * A DNS-over-HTTPS JSON answer → its IPv4 addresses. A name that does not
 * exist is an empty list; an answer that is not one (or a failed lookup)
 * is null.
 */
export function readDohAnswer(body: unknown): string[] | null {
  if (!isRecord(body)) return null;
  // 0 = answered, 3 = no such name; anything else means the lookup failed.
  if (body.Status !== 0 && body.Status !== 3) return null;
  const answer = Array.isArray(body.Answer) ? body.Answer : [];
  return answer
    .filter(isRecord)
    .filter((record) => record.type === 1 && typeof record.data === 'string')
    .map((record) => record.data as string);
}

/** The address's IPv4s against the machine's: does it already point there? */
export function compareDns(address: readonly string[], machine: readonly string[]): AddressDns {
  if (address.length === 0) return 'none';
  if (machine.length === 0) return 'unknown';
  return address.some((ip) => machine.includes(ip)) ? 'machine' : 'elsewhere';
}

/**
 * Whether the wizard may go on with this address. A world of the fleet
 * already there, or a DNS record that sends it to another machine, stops
 * it — unless the world there is a legacy one being moved into the fleet,
 * whose record still points at the old machine until its data has moved.
 */
export function placeAllowed(
  domain: string,
  owner: { readonly legacy: boolean } | null,
  dns: AddressDns | 'checking',
): boolean {
  if (!inHouseZone(domain) || dns === 'checking') return false;
  if (owner) return owner.legacy;
  return dns !== 'elsewhere';
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
// Rows: order × phase × card × probe → what the room shows
// ---------------------------------------------------------------------------

/** `changing`: its machine is creating, stopping, starting or deleting it right now. */
export type WorldStatus = 'running' | 'stopped' | 'unreachable' | 'unknown' | 'changing';

/**
 * A world that runs outside the fleet: set up by hand on the old machine,
 * before the fleet existed. The room watches it (the Tower's "legacy"
 * mark) and never changes it; once a world of the fleet takes its id or its
 * address, the fleet's wins.
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

export interface WorldPlace {
  readonly server: string;
  readonly domain: string;
}

export interface WorldRow {
  readonly id: string;
  readonly title: string;
  readonly cover: string | null;
  /** The world names a card the Summa does not have. */
  readonly missingCard: boolean;
  readonly status: WorldStatus;
  readonly probe: Probe | null;
  /** What its machine says is happening to it; null for a legacy world. */
  readonly phase: DoorPhase | null;
  /** Null for a world being deleted (its order is gone) and for a legacy world. */
  readonly order: WorldOrder | null;
  /** Set for a world the room only watches (nothing to stop, start, download or delete). */
  readonly legacy: LegacyWorld | null;
  /** Where it lives; null only when not even its address is known any more. */
  readonly place: WorldPlace | null;
  /** For a world whose zip is on its way to its machine: how much of it the machine has. */
  readonly upload: UploadProgress | null;
}

/** A world its machine is deleting after its order already went. */
export interface LeavingWorld {
  readonly id: string;
  readonly server: string;
  readonly domain: string | null;
}

/** A world on its way back from its zip: its zip travelling (`uploading`) or being opened (`importing`). */
export interface ArrivingWorld {
  readonly id: string;
  readonly server: string;
  readonly domain: string;
  readonly phase: 'uploading' | 'importing';
  readonly upload: UploadProgress | null;
}

export interface RowsInput {
  readonly orders: readonly WorldOrder[];
  /** What each order's machine says is happening to it; an order missing here is settled. */
  readonly phases?: Readonly<Record<string, DoorPhase>>;
  readonly leaving?: readonly LeavingWorld[];
  readonly arriving?: readonly ArrivingWorld[];
  readonly cards: readonly WorldCardInfo[];
  readonly probes: Readonly<Record<string, Probe>>;
  readonly legacy?: readonly LegacyWorld[];
  /** Read from each world's own page when the Summa has no card for it. */
  readonly faces?: Readonly<Record<string, WorldFace>>;
}

function seen(probe: Probe | undefined): WorldStatus {
  if (!probe) return 'unknown';
  return probe.ok ? 'running' : 'unreachable';
}

/** The titles the engine gives a world nobody named: a page titled so says nothing about the world. */
const ENGINE_TITLES: readonly string[] = ['world'];

/** A world's own page title, unless it is empty or the engine's default (then the room says its name). */
export function ownTitle(title: string | null | undefined): string | null {
  const clean = (title ?? '').trim();
  return clean === '' || ENGINE_TITLES.includes(clean.toLowerCase()) ? null : clean;
}

function statusOf(phase: DoorPhase, probe: Probe | undefined): WorldStatus {
  if (phase === 'stopped') return 'stopped';
  if (phase === 'running') return seen(probe);
  return 'changing';
}

/**
 * The Tower's trick: what was asked for crossed with what is seen running.
 * A world is "running" only when its machine runs it and it answers; one on
 * its way somewhere (created, stopped, started, deleted, brought back from
 * its zip) shows as changing, like the Tower's provisioning rows. Without a
 * card, a world is named and pictured by its own page (the picture it shows
 * while loading). A legacy world is listed after the fleet's, unless one of
 * them already holds its id or its address.
 */
export function buildRows(input: RowsInput): WorldRow[] {
  const cards = new Map(input.cards.map((card) => [card.slug, card]));
  const faces = input.faces ?? {};
  const phases = input.phases ?? {};
  const rows: WorldRow[] = input.orders.map((order) => {
    const card = cards.get(order.card);
    const face = faces[order.id];
    const probe = input.probes[order.id];
    const phase = phases[order.id] ?? order.state;
    return {
      id: order.id,
      title: card?.title ?? ownTitle(face?.title) ?? order.id,
      cover: card?.cover ?? face?.image ?? null,
      missingCard: card === undefined,
      status: statusOf(phase, probe),
      probe: probe ?? null,
      phase,
      order,
      legacy: null,
      place: { server: order.server, domain: order.domain },
      upload: null,
    };
  });
  const taken = new Set(input.orders.map((order) => order.id));
  for (const world of input.leaving ?? []) {
    if (taken.has(world.id)) continue;
    taken.add(world.id);
    const card = cards.get(world.id);
    rows.push({
      id: world.id,
      title: card?.title ?? world.id,
      cover: card?.cover ?? null,
      missingCard: false,
      status: 'changing',
      probe: null,
      phase: 'deleting',
      order: null,
      legacy: null,
      place: world.domain === null ? null : { server: world.server, domain: world.domain },
      upload: null,
    });
  }
  // A world on its way back from its zip: nothing to press until its machine has it, stopped.
  for (const world of input.arriving ?? []) {
    if (taken.has(world.id)) continue;
    taken.add(world.id);
    const card = cards.get(world.id);
    rows.push({
      id: world.id,
      title: card?.title ?? world.id,
      cover: card?.cover ?? null,
      missingCard: false,
      status: 'changing',
      probe: null,
      phase: world.phase,
      order: null,
      legacy: null,
      place: { server: world.server, domain: world.domain },
      upload: world.upload,
    });
  }
  const addresses = new Set(
    rows.map((row) => row.place?.domain).filter((domain) => domain !== undefined),
  );
  for (const world of input.legacy ?? []) {
    if (taken.has(world.id) || addresses.has(world.domain)) continue;
    const face = faces[world.id];
    const probe = input.probes[world.id];
    rows.push({
      id: world.id,
      title: ownTitle(face?.title) ?? world.id,
      cover: face?.image ?? null,
      missingCard: false,
      status: seen(probe),
      probe: probe ?? null,
      phase: null,
      order: null,
      legacy: world,
      place: { server: world.server, domain: world.domain },
      upload: null,
    });
  }
  return rows.sort((a, b) => a.title.localeCompare(b.title) || a.id.localeCompare(b.id));
}

/** Where a row's world lives; null when not even its address is known any more. */
export function rowPlace(row: WorldRow): WorldPlace | null {
  return row.place;
}

/**
 * The worlds the room lists: every one but those being deleted, which leave
 * the list the moment their machine takes the delete. The room still keeps
 * them, to say that their name and address are being freed.
 */
export function listedRows(rows: readonly WorldRow[]): WorldRow[] {
  return rows.filter((row) => row.phase !== 'deleting');
}

export interface FleetStats {
  readonly total: number;
  readonly running: number;
  readonly stopped: number;
  readonly problems: number;
  readonly changing: number;
}

export function fleetStats(rows: readonly WorldRow[]): FleetStats {
  const count = (status: WorldStatus): number => rows.filter((row) => row.status === status).length;
  return {
    total: rows.length,
    running: count('running'),
    stopped: count('stopped'),
    problems: count('unreachable'),
    changing: count('changing'),
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

/** Every server some world names, sorted. */
export function fleetServers(rows: readonly WorldRow[]): string[] {
  const names = new Set<string>();
  for (const row of rows) {
    const place = rowPlace(row);
    if (place) names.add(place.server);
  }
  return [...names].sort();
}

export interface ServerGroup {
  /** null = worlds whose place is no longer known. */
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

/**
 * A world's address as a link. The host is encoded: an address reaches the
 * page from what someone typed or what a machine answered, and encoding it
 * here means no text can turn into markup or a script URL, whatever checks
 * it passed before. A real host name comes out unchanged.
 */
export function worldUrl(domain: string): string {
  return `https://${encodeURIComponent(domain)}/`;
}

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

/**
 * A sentence cut around its one `{key}` slot, so the value can sit in its own
 * markup wherever each language puts it: [before, after]. A sentence without
 * the slot takes the value at its end.
 */
export function slot(template: string, key: string): readonly [string, string] {
  const mark = `{${key}}`;
  const at = template.indexOf(mark);
  return at < 0 ? [`${template} `, ''] : [template.slice(0, at), template.slice(at + mark.length)];
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
  readonly creating: string;
  readonly stopping: string;
  readonly starting: string;
  readonly deleting: string;
  /** A world from its zip: its zip on its way to its machine, then being opened there. */
  readonly uploading: string;
  readonly importing: string;
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
  if (row.status === 'changing') {
    const phase = row.phase;
    if (phase === 'creating' || phase === 'stopping' || phase === 'starting') return words[phase];
    if (phase === 'uploading' || phase === 'importing') return words[phase];
    return words.deleting;
  }
  return words.unknown;
}
