/**
 * The worlds room's side of the fleet's door (numinia-assets
 * `open-worlds/machine/fleetd.py`).
 *
 * Each machine of the public fleet answers at
 * `https://<alias>.numinia.com/fleet/v1/`: its worlds and their phase, and
 * what it did, to anyone; and requests an Oracle signed with their wallet —
 * EIP-712 typed data, the standard a wallet shows field by field before it
 * signs, which the machine checks itself against the Oracles it lists. The
 * room holds no key to any machine: it writes the request, the wallet signs
 * it, the machine decides. A stolen website cannot sign for anyone.
 *
 * The request types mirror the machine's `walletsig.py` field for field and
 * in the same order; the tests hash them against digests the machine's own
 * tests verify. Pure builders and readers, plus the calls with fetch
 * injected. No zod: this runs in the Oracle's browser, and every answer is
 * checked by hand.
 */

import { orderProblems, type LeavingWorld, type MachineSummary, type WorldOrder } from './worlds';

type Fetch = typeof fetch;

/** The zone each machine's own address hangs from: `<alias>.numinia.com`, written by its bootstrap. */
export const CONTROL_ZONE = 'numinia.com';
export const FLEET_DOMAIN = { name: 'Numinia Fleet', version: '1' } as const;
/**
 * How long a signed request stays good. The door takes at most fifteen
 * minutes ahead; ten leaves room for a browser clock five minutes off.
 */
export const REQUEST_SECONDS = 600;
/** The recipe each machine is made from, and updated with. */
export const BOOTSTRAP_URL =
  'https://raw.githubusercontent.com/numengames/numinia-assets/main/open-worlds/machine/bootstrap.sh';

export interface TypeField {
  readonly name: string;
  readonly type: 'string' | 'uint256';
}

const text = (name: string): TypeField => ({ name, type: 'string' });
const whole = (name: string): TypeField => ({ name, type: 'uint256' });

/** Field for field, in order, what the machine hashes. */
export const REQUEST_TYPES = {
  CreateWorld: [
    text('machine'),
    text('world'),
    text('domain'),
    text('image'),
    text('memory'),
    text('cpus'),
    whole('maxUploadMb'),
    text('nonce'),
    whole('expires'),
  ],
  DeleteWorld: [text('machine'), text('world'), text('domain'), text('nonce'), whole('expires')],
  StopWorld: [text('machine'), text('world'), text('nonce'), whole('expires')],
  StartWorld: [text('machine'), text('world'), text('nonce'), whole('expires')],
  DownloadWorld: [text('machine'), text('world'), text('nonce'), whole('expires')],
  ShowAdminCode: [text('machine'), text('nonce'), whole('expires')],
} as const satisfies Readonly<Record<string, readonly TypeField[]>>;

export type RequestKind = keyof typeof REQUEST_TYPES;

/** What the room asks a machine for, before the request gets its number and its expiry. */
export type Ask =
  | {
      readonly kind: 'CreateWorld';
      readonly machine: string;
      readonly world: string;
      readonly domain: string;
      readonly image: string;
      readonly memory: string;
      readonly cpus: string;
      readonly maxUploadMb: number;
    }
  | {
      readonly kind: 'DeleteWorld';
      readonly machine: string;
      readonly world: string;
      readonly domain: string;
    }
  | {
      readonly kind: 'StopWorld' | 'StartWorld' | 'DownloadWorld';
      readonly machine: string;
      readonly world: string;
    }
  | { readonly kind: 'ShowAdminCode'; readonly machine: string };

export type MessageValue = string | number;

/** A request as the door takes it, short of its signature. */
export interface FleetRequest {
  readonly type: RequestKind;
  readonly message: Readonly<Record<string, MessageValue>>;
}

/** 128 random bits as 32 hex digits: the request's number, which a machine takes once. */
export function newNonce(
  random: (bytes: Uint8Array) => Uint8Array = (bytes) => crypto.getRandomValues(bytes),
): string {
  return Array.from(random(new Uint8Array(16)), (byte) => byte.toString(16).padStart(2, '0')).join(
    '',
  );
}

/** The request for `ask`, numbered, good for REQUEST_SECONDS from `nowMs`, its fields in the type's order. */
export function buildRequest(ask: Ask, nonce: string, nowMs: number): FleetRequest {
  const values: Readonly<Record<string, MessageValue>> = {
    ...ask,
    nonce,
    expires: Math.floor(nowMs / 1000) + REQUEST_SECONDS,
  };
  const message = Object.fromEntries(
    REQUEST_TYPES[ask.kind].map((field) => [field.name, values[field.name] as MessageValue]),
  );
  return { type: ask.kind, message };
}

/** What the wallet signs: the typed data, its uint256 fields as bigints, the way wallets take them. */
export interface FleetTypedData {
  readonly domain: typeof FLEET_DOMAIN;
  readonly types: Readonly<Record<string, readonly TypeField[]>>;
  readonly primaryType: RequestKind;
  readonly message: Readonly<Record<string, string | bigint>>;
}

export function typedData(request: FleetRequest): FleetTypedData {
  const fields = REQUEST_TYPES[request.type];
  return {
    domain: FLEET_DOMAIN,
    types: { [request.type]: fields },
    primaryType: request.type,
    message: Object.fromEntries(
      fields.map((field) => {
        const value = request.message[field.name] as MessageValue;
        return [field.name, field.type === 'uint256' ? BigInt(value) : String(value)];
      }),
    ),
  };
}

/** The machine's own address, where its door answers. */
export function doorHost(alias: string): string {
  return `${alias}.${CONTROL_ZONE}`;
}

export function doorUrl(alias: string, path: string): string {
  return `https://${doorHost(alias)}/fleet/v1/${path}`;
}

/** The zip of a ready copy. Its 128-bit number is the key to it, for a day. */
export function copyFileUrl(alias: string, copy: string): string {
  return doorUrl(alias, `copies/${copy}/file`);
}

/** The one line that makes a server a machine of the fleet, or updates one, with this Oracle's wallet. */
export function bootstrapLine(alias: string, wallet: string): string {
  return `curl -fsSL ${BOOTSTRAP_URL} | sudo bash -s -- ${alias} ${wallet}`;
}

/** `0x42e6…ca26`: enough of a wallet to recognise it. */
export function shortWallet(wallet: string): string {
  return wallet.length > 12 ? `${wallet.slice(0, 6)}…${wallet.slice(-4)}` : wallet;
}

/** A size in bytes, short: `840 B`, `12.4 KB`, `3.1 MB`, `1.2 GB`. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'] as const;
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(1)} ${units[unit] as string}`;
}

// ---------------------------------------------------------------------------
// What the door answers
// ---------------------------------------------------------------------------

type Obj = Readonly<Record<string, unknown>>;

const isObj = (value: unknown): value is Obj =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const HEX32 = /^[0-9a-f]{32}$/;
const SHA256 = /^[0-9a-f]{64}$/;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const HOST = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/;

/** Every refusal the door can give. */
export const DOOR_ERRORS = [
  'not-an-oracle-here',
  'bad-signature',
  'expired',
  'replayed',
  'exists',
  'address-taken',
  'missing',
  'address-mismatch',
  'refused',
  'other-machine',
  'invalid',
  'shape',
  'not-json',
  'too-large',
  'slow-down',
  'no-admin-code',
  'origin',
] as const;

/** A refusal, or one of the two ways the room meets on the road: no answer, or an answer it cannot read. */
export type DoorError = (typeof DOOR_ERRORS)[number] | 'unreachable' | 'unexpected';

export type Accepted =
  | {
      readonly ok: true;
      readonly request: string;
      /** The machine's admin code, given to the Oracle who signed a create or asked for it. */
      readonly adminCode: string | null;
      /** The copy's number, for a download. */
      readonly copy: string | null;
    }
  | { readonly ok: false; readonly error: DoorError; readonly status: number };

/** The door's answer to a request: taken (202, with its number) or refused, and why. */
export function readAccepted(status: number, body: unknown): Accepted {
  const answer = isObj(body) ? body : {};
  const request = answer['request'];
  if (status === 202 && typeof request === 'string' && HEX32.test(request)) {
    const code = answer['adminCode'];
    const copy = answer['copy'];
    return {
      ok: true,
      request,
      adminCode: typeof code === 'string' && code !== '' ? code : null,
      copy: typeof copy === 'string' && HEX32.test(copy) ? copy : null,
    };
  }
  const known: readonly string[] = DOOR_ERRORS;
  const error = answer['error'];
  return {
    ok: false,
    error: typeof error === 'string' && known.includes(error) ? (error as DoorError) : 'unexpected',
    status,
  };
}

export type RequestState = 'pending' | 'working' | 'done' | 'failed';

export interface RequestResult {
  readonly state: RequestState;
  /** Which rule the machine found broken, when it refused. */
  readonly rule: string | null;
}

const REQUEST_STATES: readonly string[] = ['pending', 'working', 'done', 'failed'];

export function readRequestResult(body: unknown): RequestResult | null {
  if (!isObj(body)) return null;
  const state = body['state'];
  if (typeof state !== 'string' || !REQUEST_STATES.includes(state)) return null;
  const rule = body['rule'];
  return { state: state as RequestState, rule: typeof rule === 'string' ? rule : null };
}

/** A request the machine has finished with, one way or the other. */
export const settled = (result: RequestResult): boolean =>
  result.state === 'done' || result.state === 'failed';

export type CopyState = 'preparing' | 'ready' | 'failed';

export interface CopyStatus {
  readonly state: CopyState;
  readonly bytes: number | null;
  readonly sha256: string | null;
  readonly filename: string | null;
  readonly expiresAt: string | null;
}

export function readCopyStatus(body: unknown): CopyStatus | null {
  if (!isObj(body)) return null;
  const state = body['state'];
  if (state !== 'preparing' && state !== 'ready' && state !== 'failed') return null;
  const textOf = (key: string): string | null => {
    const value = body[key];
    return typeof value === 'string' && value !== '' ? value : null;
  };
  const bytes = body['bytes'];
  const sha = textOf('sha256');
  return {
    state,
    bytes: typeof bytes === 'number' && Number.isInteger(bytes) && bytes >= 0 ? bytes : null,
    sha256: sha !== null && SHA256.test(sha) ? sha : null,
    filename: textOf('filename'),
    expiresAt: textOf('expiresAt'),
  };
}

/** A copy the machine has finished with, one way or the other. */
export const copyDone = (copy: CopyStatus): boolean => copy.state !== 'preparing';

/** Where a world is, as its machine says: settled, or on its way somewhere. */
export type DoorPhase = 'running' | 'stopped' | 'creating' | 'stopping' | 'starting' | 'deleting';

const PHASES: readonly string[] = [
  'running',
  'stopped',
  'creating',
  'stopping',
  'starting',
  'deleting',
];

export interface DoorWorld {
  readonly id: string;
  readonly phase: DoorPhase;
  /** Null for a world being deleted whose order is already gone. */
  readonly order: WorldOrder | null;
  readonly domain: string | null;
}

/**
 * A machine's `/worlds` → its worlds. Each one is checked against the
 * order's own rules before the room believes it; anything else is dropped,
 * never trusted. The text-wide checks for an IP or a key word are left to
 * the files they were written for: here each field is already checked.
 */
export function readDoorWorlds(body: unknown, alias: string): DoorWorld[] | null {
  if (!isObj(body) || !Array.isArray(body['worlds'])) return null;
  const worlds: DoorWorld[] = [];
  for (const item of body['worlds'] as readonly unknown[]) {
    if (!isObj(item)) continue;
    const id = item['id'];
    const phase = item['phase'];
    if (typeof id !== 'string' || !SLUG.test(id)) continue;
    if (typeof phase !== 'string' || !PHASES.includes(phase)) continue;
    const source = JSON.stringify({
      id,
      card: id,
      state: item['state'],
      server: alias,
      domain: item['domain'],
      image: item['image'],
      limits: item['limits'],
    });
    const problems = orderProblems(source, id).filter(
      (problem) => problem !== 'ip' && problem !== 'secret',
    );
    if (problems.length === 0) {
      const order = JSON.parse(source) as WorldOrder;
      worlds.push({ id, phase: phase as DoorPhase, order, domain: order.domain });
    } else if (phase === 'deleting') {
      const domain = item['domain'];
      worlds.push({
        id,
        phase,
        order: null,
        domain: typeof domain === 'string' && HOST.test(domain) ? domain : null,
      });
    }
  }
  return worlds;
}

export interface DoorLogEntry {
  readonly machine: string;
  readonly at: string;
  readonly type: RequestKind;
  readonly world: string | null;
  /** The short wallet that signed it, as the machine logs it. */
  readonly by: string | null;
  readonly state: 'done' | 'failed';
}

/** A machine's `/log` → what it did, newest first, as it says; lines it does not recognise are dropped. */
export function readDoorLog(body: unknown, alias: string): DoorLogEntry[] {
  if (!isObj(body) || !Array.isArray(body['entries'])) return [];
  const kinds: readonly string[] = Object.keys(REQUEST_TYPES);
  return (body['entries'] as readonly unknown[]).filter(isObj).flatMap((entry) => {
    const { at, type, world, by, state } = entry;
    if (typeof at !== 'string' || typeof type !== 'string' || !kinds.includes(type)) return [];
    if (state !== 'done' && state !== 'failed') return [];
    return [
      {
        machine: alias,
        at,
        type: type as RequestKind,
        world: typeof world === 'string' && SLUG.test(world) ? world : null,
        by: typeof by === 'string' ? by : null,
        state,
      },
    ];
  });
}

/** Several machines' logs as one, newest first, at most `limit` lines. */
export function mergeLogs(
  logs: readonly (readonly DoorLogEntry[])[],
  limit: number,
): DoorLogEntry[] {
  return logs
    .flat()
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, limit);
}

// ---------------------------------------------------------------------------
// The calls
// ---------------------------------------------------------------------------

export type Unreadable = 'timeout' | 'network' | 'http' | 'shape';

type Read =
  | { readonly ok: true; readonly body: unknown }
  | { readonly ok: false; readonly reason: Unreadable; readonly status?: number };

async function readJson(fetchImpl: Fetch, url: string, timeoutMs: number): Promise<Read> {
  let response: Response;
  try {
    response = await fetchImpl(url, {
      headers: { accept: 'application/json' },
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
    return { ok: true, body: await response.json() };
  } catch {
    return { ok: false, reason: 'shape' };
  }
}

export type MachineView =
  | {
      readonly alias: string;
      readonly open: true;
      readonly worlds: readonly DoorWorld[];
      readonly log: readonly DoorLogEntry[];
    }
  | {
      readonly alias: string;
      readonly open: false;
      readonly reason: Unreadable;
      readonly status?: number;
    };

/** One machine as its door shows it, or why it could not be read. Never throws. */
export async function readMachine(
  fetchImpl: Fetch,
  alias: string,
  timeoutMs = 4000,
): Promise<MachineView> {
  const [worlds, log] = await Promise.all([
    readJson(fetchImpl, doorUrl(alias, 'worlds'), timeoutMs),
    readJson(fetchImpl, doorUrl(alias, 'log'), timeoutMs),
  ]);
  if (!worlds.ok) {
    return worlds.status === undefined
      ? { alias, open: false, reason: worlds.reason }
      : { alias, open: false, reason: worlds.reason, status: worlds.status };
  }
  const read = readDoorWorlds(worlds.body, alias);
  if (read === null) return { alias, open: false, reason: 'shape' };
  return { alias, open: true, worlds: read, log: log.ok ? readDoorLog(log.body, alias) : [] };
}

/** The fleet as its machines tell it, ready for the room's rows. */
export interface GatheredFleet {
  readonly machines: readonly MachineSummary[];
  readonly orders: readonly WorldOrder[];
  readonly phases: Readonly<Record<string, DoorPhase>>;
  readonly leaving: readonly LeavingWorld[];
  readonly history: readonly DoorLogEntry[];
}

/**
 * Several machines' doors → one fleet: each machine and whether it
 * answered, every world with its phase (a name is the first machine's that
 * holds it), the worlds leaving, and one history, newest first.
 */
export function gatherFleet(views: readonly MachineView[], historyLines = 30): GatheredFleet {
  const orders: WorldOrder[] = [];
  const phases: Record<string, DoorPhase> = {};
  const leaving: LeavingWorld[] = [];
  const taken = new Set<string>();
  for (const view of views) {
    if (!view.open) continue;
    for (const world of view.worlds) {
      if (taken.has(world.id)) continue;
      taken.add(world.id);
      if (world.order) {
        orders.push(world.order);
        phases[world.id] = world.phase;
      } else {
        leaving.push({ id: world.id, server: view.alias, domain: world.domain });
      }
    }
  }
  return {
    machines: views.map((view) => ({
      alias: view.alias,
      open: view.open,
      reason: view.open
        ? null
        : view.status === undefined
          ? view.reason
          : `${view.reason} ${view.status}`,
    })),
    orders,
    phases,
    leaving,
    history: mergeLogs(
      views.map((view) => (view.open ? view.log : [])),
      historyLines,
    ),
  };
}

/** Hand a signed request to its machine's door. Never throws. */
export async function sendRequest(
  fetchImpl: Fetch,
  request: FleetRequest,
  signature: string,
  timeoutMs = 15000,
): Promise<Accepted> {
  let response: Response;
  try {
    response = await fetchImpl(doorUrl(String(request.message['machine']), 'actions'), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ type: request.type, message: request.message, signature }),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch {
    return { ok: false, error: 'unreachable', status: 0 };
  }
  return readAccepted(response.status, await response.json().catch(() => null));
}

/** How a request went, as its machine says; null when it could not be read. */
export async function readRequest(
  fetchImpl: Fetch,
  alias: string,
  nonce: string,
  timeoutMs = 4000,
): Promise<RequestResult | null> {
  const answer = await readJson(fetchImpl, doorUrl(alias, `requests/${nonce}`), timeoutMs);
  return answer.ok ? readRequestResult(answer.body) : null;
}

/** A copy's state, as its machine says; null when it could not be read. */
export async function readCopy(
  fetchImpl: Fetch,
  alias: string,
  copy: string,
  timeoutMs = 4000,
): Promise<CopyStatus | null> {
  const answer = await readJson(fetchImpl, doorUrl(alias, `copies/${copy}`), timeoutMs);
  return answer.ok ? readCopyStatus(answer.body) : null;
}

export interface Waiting {
  readonly intervalMs: number;
  readonly timeoutMs: number;
  /** True once the person has closed the dialog that waits: stop asking. */
  readonly cancelled?: () => boolean;
  readonly sleep?: (ms: number) => Promise<void>;
  readonly now?: () => number;
}

/**
 * Ask again every `intervalMs` until `done` says so, the time runs out or
 * the wait is cancelled; the last answer read either way (null if none).
 */
export async function waitFor<T>(
  read: () => Promise<T | null>,
  done: (value: T) => boolean,
  waiting: Waiting,
): Promise<T | null> {
  const sleep =
    waiting.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  const now = waiting.now ?? Date.now;
  const cancelled = waiting.cancelled ?? (() => false);
  const until = now() + waiting.timeoutMs;
  let last: T | null = null;
  for (;;) {
    const value = await read();
    if (value !== null) {
      last = value;
      if (done(value)) return value;
    }
    if (now() >= until || cancelled()) return last;
    await sleep(waiting.intervalMs);
  }
}
