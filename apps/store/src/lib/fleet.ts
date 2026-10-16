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

import {
  ENGINES,
  orderProblems,
  type ArrivingWorld,
  type Engine,
  type LeavingWorld,
  type MachineSummary,
  type WorldOrder,
} from './worlds';

type Fetch = typeof fetch;

/** The zone each machine's own address hangs from: `<alias>.numinia.com`, written by its bootstrap. */
export const CONTROL_ZONE = 'numinia.com';
export const FLEET_DOMAIN = { name: 'Numinia Fleet', version: '1' } as const;
/**
 * How long a signed request stays good. The door takes at most fifteen
 * minutes ahead; ten leaves room for a browser clock five minutes off.
 */
export const REQUEST_SECONDS = 600;
/**
 * The one reviewed commit of numinia-assets every machine is installed from:
 * the merge of the machine's pull request this room was built against
 * (numengames/numinia-assets#21, each world's own admin code). A machine run
 * with this line installs exactly this commit, never whatever is on `main` at
 * the time. Moving it is a release of the room: the machine's pull request
 * merges first, then this constant and the fixture's open-1 move together.
 */
export const FLEET_REF: string = '880ff114c8cf2b4f4705300e8bc0224c7dbf0a41';
/** The recipe each machine is made from, and updated with: pinned to FLEET_REF. */
export const BOOTSTRAP_URL = `https://raw.githubusercontent.com/numengames/numinia-assets/${FLEET_REF}/open-worlds/machine/bootstrap.sh`;

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
  /** Legacy: the machine-wide code. Machines still take it; this room no longer asks for it. */
  ShowAdminCode: [text('machine'), text('nonce'), whole('expires')],
  /** One world's own admin code. */
  ShowWorldCode: [text('machine'), text('world'), text('nonce'), whole('expires')],
  /** A new admin code for one world: the machine makes it, answers it, and restarts that world. */
  RotateWorldCode: [text('machine'), text('world'), text('nonce'), whole('expires')],
  /**
   * A world brought back from its zip: CreateWorld's fields plus the zip's
   * exact size and SHA-256, so the machine takes that zip and no other. It is
   * always born stopped.
   */
  ImportWorld: [
    text('machine'),
    text('world'),
    text('domain'),
    text('image'),
    text('memory'),
    text('cpus'),
    whole('maxUploadMb'),
    whole('zipBytes'),
    text('zipSha256'),
    text('nonce'),
    whole('expires'),
  ],
  /**
   * A world moved to another build of its own engine: the image is all that
   * changes. The machine fetches it, then makes that one container anew.
   */
  UpdateWorld: [text('machine'), text('world'), text('image'), text('nonce'), whole('expires')],
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
      readonly kind:
        'StopWorld' | 'StartWorld' | 'DownloadWorld' | 'ShowWorldCode' | 'RotateWorldCode';
      readonly machine: string;
      readonly world: string;
    }
  | { readonly kind: 'ShowAdminCode'; readonly machine: string }
  | {
      readonly kind: 'ImportWorld';
      readonly machine: string;
      readonly world: string;
      readonly domain: string;
      readonly image: string;
      readonly memory: string;
      readonly cpus: string;
      readonly maxUploadMb: number;
      /** The zip's exact size in bytes, and its SHA-256 (64 lowercase hex). */
      readonly zipBytes: number;
      readonly zipSha256: string;
    }
  | {
      readonly kind: 'UpdateWorld';
      readonly machine: string;
      readonly world: string;
      /** The build to move to: another of the world's own engine. */
      readonly image: string;
    };

/** The requests whose answer is an admin code, the one thing the Oracle asked for. */
export const CODE_KINDS: readonly RequestKind[] = [
  'ShowAdminCode',
  'ShowWorldCode',
  'RotateWorldCode',
];

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

/**
 * The one line that makes a server a machine of the fleet, or updates one,
 * with this Oracle's wallet. It fetches the bootstrap of FLEET_REF and tells
 * it to install that same commit.
 */
export function bootstrapLine(alias: string, wallet: string): string {
  return `curl -fsSL ${BOOTSTRAP_URL} | sudo FLEET_REF=${FLEET_REF} bash -s -- ${alias} ${wallet}`;
}

/** A commit, short: its first seven hex digits, as git shows it. */
export function shortSha(sha: string): string {
  return sha.slice(0, 7);
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

/**
 * A size in bytes, short and in the reader's language: `48 MB`, `1,1 GB`
 * (es), `412 MB`. Binary units, at most one decimal; `lang` is the page's
 * language (none or '' = the browser's).
 */
export function formatSize(bytes: number, lang?: string): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'] as const;
  let value = Math.max(0, bytes);
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  const digits = unit === 0 ? 0 : 1;
  const figure = new Intl.NumberFormat(lang || undefined, { maximumFractionDigits: digits });
  return `${figure.format(value)} ${units[unit] as string}`;
}

/** A whole number in the reader's language: `50.331.648` (es), `50,331,648` (en). */
export function formatCount(count: number, lang?: string): string {
  return new Intl.NumberFormat(lang || undefined, { maximumFractionDigits: 0 }).format(count);
}

// ---------------------------------------------------------------------------
// What the door answers
// ---------------------------------------------------------------------------

type Obj = Readonly<Record<string, unknown>>;

const isObj = (value: unknown): value is Obj =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const HEX32 = /^[0-9a-f]{32}$/;
const SHA1 = /^[0-9a-f]{40}$/;
const SHA256 = /^[0-9a-f]{64}$/;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const HOST = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/;
/** An admin code as the machine makes and checks it (reconcile.py ADMIN_CODE). */
const ADMIN_CODE = /^[A-Za-z0-9_-]{8,64}$/;

/** Every refusal the door can give, and every rule a machine names when it cannot bring a world back from its zip. */
export const DOOR_ERRORS = [
  'not-an-oracle-here',
  'bad-signature',
  'expired',
  'replayed',
  'exists',
  'address-taken',
  'still-deleting',
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
  'busy',
  'origin',
  // A request with no length (411): the door's name for it, POST or PUT.
  'length',
  // An engine the machine does not run, or a build of another engine than the world's.
  'unknown-engine',
  'engine-mismatch',
  // A world from its zip (ImportWorld): the door's, before and while the zip arrives…
  'zip-too-big',
  'no-room',
  'slot-expired',
  'wrong-size',
  'cut',
  'fingerprint',
  // …and the machine's, once it opens it.
  'not-a-zip',
  'encrypted',
  'too-many-files',
  'zip-slip',
  'link',
  'file-too-big',
  'ratio',
  'unpacked-too-big',
  'not-a-world',
  'unexpected',
  'db-open',
  'manifest',
  'db-broken',
  'db-foreign',
  // A Numinia Engine world's zip: its own engine's tools would not read it.
  'engine-refused',
] as const;

/** A refusal, or one of the two ways the room meets on the road: no answer, or an answer it cannot read. */
export type DoorError = (typeof DOOR_ERRORS)[number] | 'unreachable' | 'unexpected';

/** The rules a world's zip can break, at the door or once its machine opens it. */
export const IMPORT_RULES = [
  'zip-too-big',
  'no-room',
  'slot-expired',
  'wrong-size',
  'cut',
  'fingerprint',
  'not-a-zip',
  'encrypted',
  'too-many-files',
  'zip-slip',
  'link',
  'file-too-big',
  'ratio',
  'unpacked-too-big',
  'not-a-world',
  'unexpected',
  'db-open',
  'manifest',
  'db-broken',
  'db-foreign',
  'engine-refused',
] as const satisfies readonly DoorError[];

export type ImportRule = (typeof IMPORT_RULES)[number];

/**
 * A machine's rule, as it logs it (`zip-slip`, or `unexpected: world/notes.txt`)
 * → which import rule, and what it adds; null when it is not one of them.
 */
export function readImportRule(
  rule: string | null,
): { readonly rule: ImportRule; readonly detail: string | null } | null {
  if (rule === null) return null;
  const match = /^([a-z-]+)(?::\s*(.*))?$/s.exec(rule.trim());
  const known: readonly string[] = IMPORT_RULES;
  if (!match || !known.includes(match[1] as string)) return null;
  const detail = match[2]?.trim().slice(0, 200) ?? '';
  return { rule: match[1] as ImportRule, detail: detail === '' ? null : detail };
}

export type Accepted =
  | {
      readonly ok: true;
      readonly request: string;
      /**
       * An admin code, only to the Oracle who signed for it: a new world's own
       * code (CreateWorld, ImportWorld), the code of the world asked for
       * (ShowWorldCode), that world's new one (RotateWorldCode), or the legacy
       * machine-wide one.
       */
      readonly adminCode: string | null;
      /** The copy's number, for a download. */
      readonly copy: string | null;
      /** Where the zip goes, for a world from its zip: `uploads/<the request's number>`. */
      readonly upload: string | null;
    }
  | { readonly ok: false; readonly error: DoorError; readonly status: number };

const UPLOAD = /^uploads\/[0-9a-f]{32}$/;

/** Why the door refused, from its answer: a refusal it knows, else `unexpected`. */
function readRefusal(status: number, body: unknown): Extract<Accepted, { ok: false }> {
  const known: readonly string[] = DOOR_ERRORS;
  const error = isObj(body) ? body['error'] : undefined;
  return {
    ok: false,
    error: typeof error === 'string' && known.includes(error) ? (error as DoorError) : 'unexpected',
    status,
  };
}

/** The door's answer to a request: taken (202, with its number) or refused, and why. */
export function readAccepted(status: number, body: unknown): Accepted {
  const answer = isObj(body) ? body : {};
  const request = answer['request'];
  if (status === 202 && typeof request === 'string' && HEX32.test(request)) {
    const code = answer['adminCode'];
    const copy = answer['copy'];
    const upload = answer['upload'];
    return {
      ok: true,
      request,
      adminCode: typeof code === 'string' && ADMIN_CODE.test(code) ? code : null,
      copy: typeof copy === 'string' && HEX32.test(copy) ? copy : null,
      upload: typeof upload === 'string' && UPLOAD.test(upload) ? upload : null,
    };
  }
  return readRefusal(status, body);
}

export type RequestState = 'uploading' | 'pending' | 'working' | 'done' | 'failed';

export interface RequestResult {
  readonly state: RequestState;
  /** Which rule the machine found broken, when it refused. */
  readonly rule: string | null;
  /** The zip entry that broke it, when the machine names one (`world/notes.txt`). */
  readonly entry: string | null;
}

const REQUEST_STATES: readonly string[] = ['uploading', 'pending', 'working', 'done', 'failed'];
/** A zip entry's name as a machine reports it: printable, at most 200 characters. */
const ENTRY = /^[^\p{Cc}]{1,200}$/u;

export function readRequestResult(body: unknown): RequestResult | null {
  if (!isObj(body)) return null;
  const state = body['state'];
  if (typeof state !== 'string' || !REQUEST_STATES.includes(state)) return null;
  const rule = body['rule'];
  const entry = body['entry'];
  return {
    state: state as RequestState,
    rule: typeof rule === 'string' ? rule : null,
    entry: typeof entry === 'string' && ENTRY.test(entry) ? entry : null,
  };
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

// ---------------------------------------------------------------------------
// Whether a machine obeys: its door's heartbeat
// ---------------------------------------------------------------------------

const ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;
const isIso = (value: unknown): value is string => typeof value === 'string' && ISO_UTC.test(value);

/** When a machine's reconciler last ran, how that ended, and what still waits for it. */
export interface Heartbeat {
  /** The door's own clock when it answered: ages are measured against it, never the browser's. */
  readonly at: string;
  readonly lastRun: {
    readonly at: string;
    readonly ok: boolean;
    readonly rule: string | null;
  } | null;
  readonly waiting: { readonly requests: number; readonly since: string | null };
}

/** A door's `/machine` → its heartbeat; null when the door publishes none (one older than the floor). */
export function readHeartbeat(body: unknown): Heartbeat | null {
  if (!isObj(body) || !isIso(body['at']) || !isObj(body['waiting'])) return null;
  const requests = body['waiting']['requests'];
  if (typeof requests !== 'number' || !Number.isInteger(requests) || requests < 0) return null;
  const since = body['waiting']['since'];
  const run = body['lastRun'];
  let lastRun: Heartbeat['lastRun'] = null;
  if (isObj(run) && isIso(run['at']) && typeof run['ok'] === 'boolean') {
    const rule = run['rule'];
    lastRun = {
      at: run['at'],
      ok: run['ok'],
      rule: typeof rule === 'string' && rule !== '' ? rule.slice(0, 200) : null,
    };
  }
  return { at: body['at'], lastRun, waiting: { requests, since: isIso(since) ? since : null } };
}

/**
 * A machine's reconciler runs every minute and on each request, and records
 * when each run ends. Three minutes without one, or a request waiting that
 * long, is a delay (a long create can take that); ten is a machine that is
 * not obeying.
 */
export const SLOW_AFTER_S = 180;
export const SILENT_AFTER_S = 600;

export type MachineHealth =
  /** Its door publishes no heartbeat, or nothing to judge yet: nothing to say. */
  | { readonly kind: 'unknown' }
  | { readonly kind: 'ok'; readonly ago: number }
  /** It works, late: `ago` since its last run (null: none on record), `waiting` requests queued. */
  | { readonly kind: 'slow'; readonly ago: number | null; readonly waiting: number }
  /** It runs, but its last run could not apply the book. */
  | { readonly kind: 'failing'; readonly ago: number; readonly rule: string | null }
  /** It has stopped working: `ago` since its last run (null: none on record), `waiting` requests queued. */
  | { readonly kind: 'silent'; readonly ago: number | null; readonly waiting: number };

/** Whether a machine obeys, from its heartbeat alone (the door's clock against the door's clock). */
export function machineHealth(heartbeat: Heartbeat | null): MachineHealth {
  if (heartbeat === null) return { kind: 'unknown' };
  const now = Date.parse(heartbeat.at);
  const { requests, since } = heartbeat.waiting;
  const waited = requests > 0 && since !== null ? Math.max(0, (now - Date.parse(since)) / 1000) : 0;
  const run = heartbeat.lastRun;
  if (run === null) {
    // No run on record yet: only a request left waiting says something.
    if (waited > SILENT_AFTER_S) return { kind: 'silent', ago: null, waiting: requests };
    if (waited > SLOW_AFTER_S) return { kind: 'slow', ago: null, waiting: requests };
    return { kind: 'unknown' };
  }
  const ago = Math.max(0, Math.round((now - Date.parse(run.at)) / 1000));
  // How long it has gone without doing what it is there for: running, and taking what waits.
  const quiet = Math.max(ago, waited);
  if (quiet > SILENT_AFTER_S) return { kind: 'silent', ago, waiting: requests };
  if (!run.ok) return { kind: 'failing', ago, rule: run.rule };
  if (quiet > SLOW_AFTER_S) return { kind: 'slow', ago, waiting: requests };
  return { kind: 'ok', ago };
}

/** A span of seconds, short: `45 s`, `3 min`, `2 h`, `4 d`. */
export function formatAgo(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  if (s < 60) return `${s} s`;
  if (s < 3600) return `${Math.round(s / 60)} min`;
  if (s < 172_800) return `${Math.round(s / 3600)} h`;
  return `${Math.round(s / 86_400)} d`;
}

// ---------------------------------------------------------------------------
// Which recipe a machine was installed from
// ---------------------------------------------------------------------------

/**
 * A door's `/machine` → the numinia-assets commit its machine was installed
 * from (`recipe`, 40 hex); null when it says none — a machine installed
 * before the recipe was pinned — or says something else.
 */
export function readRecipe(body: unknown): string | null {
  if (!isObj(body)) return null;
  const recipe = body['recipe'];
  return typeof recipe === 'string' && SHA1.test(recipe) ? recipe : null;
}

/**
 * Whether a machine whose door answers runs another recipe than the one this
 * room hands out (FLEET_REF), or says none: its line must be run again. A
 * machine whose door does not answer already shows its line.
 */
export function staleRecipe(machine: Pick<MachineSummary, 'open' | 'recipe'>): boolean {
  return machine.open && machine.recipe !== FLEET_REF;
}

// ---------------------------------------------------------------------------
// What the room tells a machine about the browser's side of a request
// ---------------------------------------------------------------------------

/**
 * Where a signed request got to in the browser. The machine sees only what
 * reaches its door; a wallet that was not found, a signature cancelled or a
 * door that could not be reached never get there unless the room says so.
 */
export type BeaconStep =
  | 'asked'
  | 'signed'
  | 'wallet-refused'
  | 'accepted'
  | 'refused'
  | 'unreachable'
  | 'copy-ready'
  | 'copy-failed'
  | 'late';

/** One step, as the door takes it: names from closed lists and a number, never a wallet, a name or an address. */
export interface BeaconEvent {
  readonly step: BeaconStep;
  readonly type: RequestKind;
  readonly problem: string | null;
  /** Milliseconds since the Oracle pressed the button. */
  readonly ms: number;
}

/** The most a door takes in one beacon, and the longest a step may claim to have taken. */
export const BEACON_MAX_EVENTS = 20;
const BEACON_MAX_MS = 86_400_000;

/** What a door may listen to besides signed requests: `events`, the room's beacons. */
export type DoorFeature = 'events';
const DOOR_FEATURES: readonly DoorFeature[] = ['events'];

/**
 * What a door says it listens to, from its `/machine` (`listens: [...]`): the
 * room sends a beacon only to a door that says it takes them, so a machine
 * older than the beacons never sees one.
 */
export function readListens(body: unknown): DoorFeature[] {
  if (!isObj(body) || !Array.isArray(body['listens'])) return [];
  const said: readonly unknown[] = body['listens'];
  return DOOR_FEATURES.filter((feature) => said.includes(feature));
}

/** What a door says about worlds brought back from their zip: the biggest zip it takes. */
export interface Imports {
  readonly zipMaxBytes: number;
}

/**
 * A door's `/machine` → whether its machine brings worlds back from their
 * zip (`imports: {zipMaxBytes}`); null when it says nothing (a machine
 * older than the import, which the room never offers one).
 */
export function readImports(body: unknown): Imports | null {
  if (!isObj(body) || !isObj(body['imports'])) return null;
  const max = body['imports']['zipMaxBytes'];
  return typeof max === 'number' && Number.isSafeInteger(max) && max > 0
    ? { zipMaxBytes: max }
    : null;
}

/**
 * A door's `/machine` → the engines its machine runs (`engines: [...]`, those
 * the room knows, in the room's order); null when it names none — a machine
 * older than the Numinia Engine, which runs Hyperfy alone.
 */
export function readEngines(body: unknown): Engine[] | null {
  if (!isObj(body) || !Array.isArray(body['engines'])) return null;
  const said: readonly unknown[] = body['engines'];
  return ENGINES.filter((engine) => said.includes(engine));
}

/** A door's `/machine` → whether it moves a world to another build of its engine (`updates: true`). */
export function readUpdates(body: unknown): boolean {
  return isObj(body) && body['updates'] === true;
}

/** A beacon's body: `{"events": [...]}`, at most BEACON_MAX_EVENTS, each `ms` a whole number in range. */
export function beaconBody(events: readonly BeaconEvent[]): string {
  return JSON.stringify({
    events: events.slice(0, BEACON_MAX_EVENTS).map((event) => ({
      step: event.step,
      type: event.type,
      problem: event.problem,
      ms: Math.min(BEACON_MAX_MS, Math.max(0, Math.round(event.ms))),
    })),
  });
}

export type BeaconSender = (url: string, body: Blob) => boolean;

/**
 * Hand a machine's door what happened in the browser, without waiting for an
 * answer (a beacon, as text, so the browser asks no preflight). Never throws:
 * a lost beacon costs a count, never a request.
 */
export function sendBeacon(
  alias: string,
  events: readonly BeaconEvent[],
  send: BeaconSender | null,
): boolean {
  if (send === null || events.length === 0) return false;
  try {
    return send(doorUrl(alias, 'events'), new Blob([beaconBody(events)], { type: 'text/plain' }));
  } catch {
    return false;
  }
}

/** Where a world is, as its machine says: settled, or on its way somewhere. */
export type DoorPhase =
  | 'running'
  | 'stopped'
  | 'creating'
  | 'stopping'
  | 'starting'
  | 'deleting'
  /** A world from its zip: its zip is on its way to the machine… */
  | 'uploading'
  /** …or the machine is checking and unpacking it. */
  | 'importing'
  /** A world moved to another build of its engine, until its machine has started it. */
  | 'updating';

const PHASES: readonly string[] = [
  'running',
  'stopped',
  'creating',
  'stopping',
  'starting',
  'deleting',
  'uploading',
  'importing',
  'updating',
];

/** How much of a zip its machine has: `bytes` of `of`. */
export interface UploadProgress {
  readonly bytes: number;
  readonly of: number;
}

export interface DoorWorld {
  readonly id: string;
  readonly phase: DoorPhase;
  /** Null for a world being deleted whose order is already gone, and for one still arriving from its zip. */
  readonly order: WorldOrder | null;
  readonly domain: string | null;
  /** For a world whose zip is on its way: how much of it the machine has; null otherwise. */
  readonly upload: UploadProgress | null;
}

const isCount = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0;

/** A door's `bytes`/`of` → how much of a zip it has; null unless both are whole and in order. */
function readProgress(item: Obj): UploadProgress | null {
  const bytes = item['bytes'];
  const of = item['of'];
  return isCount(bytes) && isCount(of) && of > 0 && bytes <= of ? { bytes, of } : null;
}

/**
 * A machine's `/worlds` → its worlds. Each one is checked against the
 * order's own rules before the room believes it; anything else is dropped,
 * never trusted. The text-wide checks for an IP or a key word are left to
 * the files they were written for: here each field is already checked. A
 * world still arriving from its zip has no order yet: only its name, its
 * address and, while its zip travels, how much of it the machine has.
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
    const domain = item['domain'];
    const host = typeof domain === 'string' && HOST.test(domain) ? domain : null;
    if (phase === 'uploading' || phase === 'importing') {
      if (host !== null) {
        const upload = phase === 'uploading' ? readProgress(item) : null;
        worlds.push({ id, phase, order: null, domain: host, upload });
      }
      continue;
    }
    const source = JSON.stringify({
      id,
      card: id,
      state: item['state'],
      server: alias,
      domain,
      image: item['image'],
      limits: item['limits'],
    });
    const problems = orderProblems(source, id).filter(
      (problem) => problem !== 'ip' && problem !== 'secret',
    );
    if (problems.length === 0) {
      const order = JSON.parse(source) as WorldOrder;
      worlds.push({ id, phase: phase as DoorPhase, order, domain: order.domain, upload: null });
    } else if (phase === 'deleting') {
      worlds.push({ id, phase, order: null, domain: host, upload: null });
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
  /** The rule the machine found broken, when it failed (a door older than the metrics says none). */
  readonly rule: string | null;
  /** Whole seconds from the door taking the request to the machine finishing it; null when not said. */
  readonly took: number | null;
}

/** A machine's `/log` → what it did, newest first, as it says; lines it does not recognise are dropped. */
export function readDoorLog(body: unknown, alias: string): DoorLogEntry[] {
  if (!isObj(body) || !Array.isArray(body['entries'])) return [];
  const kinds: readonly string[] = Object.keys(REQUEST_TYPES);
  return (body['entries'] as readonly unknown[]).filter(isObj).flatMap((entry) => {
    const { at, type, world, by, state, rule, took } = entry;
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
        rule:
          state === 'failed' && typeof rule === 'string' && rule !== '' ? rule.slice(0, 200) : null,
        took: typeof took === 'number' && Number.isInteger(took) && took >= 0 ? took : null,
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
      /** Whether its reconciler keeps up; null when its door publishes no heartbeat. */
      readonly heartbeat: Heartbeat | null;
      /** What its door listens to besides requests (readListens). */
      readonly listens: readonly DoorFeature[];
      /** The numinia-assets commit it was installed from (readRecipe); null when its door says none. */
      readonly recipe: string | null;
      /** Whether it brings worlds back from their zip, and how big a zip it takes (readImports). */
      readonly imports: Imports | null;
      /** The engines it runs (readEngines); null when its door names none: Hyperfy alone. */
      readonly engines?: readonly Engine[] | null;
      /** Whether it moves a world to another build of its engine (readUpdates). */
      readonly updates?: boolean;
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
  const [worlds, log, machine] = await Promise.all([
    readJson(fetchImpl, doorUrl(alias, 'worlds'), timeoutMs),
    readJson(fetchImpl, doorUrl(alias, 'log'), timeoutMs),
    readJson(fetchImpl, doorUrl(alias, 'machine'), timeoutMs),
  ]);
  if (!worlds.ok) {
    return worlds.status === undefined
      ? { alias, open: false, reason: worlds.reason }
      : { alias, open: false, reason: worlds.reason, status: worlds.status };
  }
  const read = readDoorWorlds(worlds.body, alias);
  if (read === null) return { alias, open: false, reason: 'shape' };
  return {
    alias,
    open: true,
    worlds: read,
    log: log.ok ? readDoorLog(log.body, alias) : [],
    heartbeat: machine.ok ? readHeartbeat(machine.body) : null,
    listens: machine.ok ? readListens(machine.body) : [],
    recipe: machine.ok ? readRecipe(machine.body) : null,
    imports: machine.ok ? readImports(machine.body) : null,
    engines: machine.ok ? readEngines(machine.body) : null,
    updates: machine.ok && readUpdates(machine.body),
  };
}

/** The fleet as its machines tell it, ready for the room's rows. */
export interface GatheredFleet {
  readonly machines: readonly MachineSummary[];
  readonly orders: readonly WorldOrder[];
  readonly phases: Readonly<Record<string, DoorPhase>>;
  readonly leaving: readonly LeavingWorld[];
  /** Worlds on their way back from their zip: no order yet. */
  readonly arriving: readonly ArrivingWorld[];
  readonly history: readonly DoorLogEntry[];
}

/**
 * Several machines' doors → one fleet: each machine and whether it
 * answered, every world with its phase (a name is the first machine's that
 * holds it), the worlds leaving, those arriving from their zip, and one
 * history, newest first.
 */
export function gatherFleet(views: readonly MachineView[], historyLines = 30): GatheredFleet {
  const orders: WorldOrder[] = [];
  const phases: Record<string, DoorPhase> = {};
  const leaving: LeavingWorld[] = [];
  const arriving: ArrivingWorld[] = [];
  const taken = new Set<string>();
  for (const view of views) {
    if (!view.open) continue;
    for (const world of view.worlds) {
      if (taken.has(world.id)) continue;
      taken.add(world.id);
      if (world.order) {
        orders.push(world.order);
        phases[world.id] = world.phase;
      } else if (world.phase === 'uploading' || world.phase === 'importing') {
        arriving.push({
          id: world.id,
          server: view.alias,
          // readDoorWorlds keeps an arriving world only with its address.
          domain: world.domain as string,
          phase: world.phase,
          upload: world.upload ?? null,
        });
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
      heartbeat: view.open ? view.heartbeat : null,
      listens: view.open ? view.listens : [],
      recipe: view.open ? view.recipe : null,
      imports: view.open ? (view.imports ?? null) : null,
      engines: view.open ? (view.engines ?? null) : null,
      updates: view.open && view.updates === true,
    })),
    orders,
    phases,
    leaving,
    arriving,
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

// ---------------------------------------------------------------------------
// A world from its zip: the zip itself, straight to its machine
// ---------------------------------------------------------------------------

/** How an upload ended: the machine has the whole zip, or why not. */
export type Uploaded =
  | { readonly ok: true }
  | {
      readonly ok: false;
      /** `stopped`: the Oracle stopped it; `cut`: the connection dropped part-way. */
      readonly error: DoorError | 'stopped';
      readonly status: number;
      /** How many bytes had left the browser when it ended. */
      readonly sent: number;
    };

/**
 * One zip, sent whole to the slot its machine opened for it (`PUT
 * /fleet/v1/uploads/<nonce>`) in ONE XMLHttpRequest: the browser's own
 * upload, with progress events (a streamed fetch body needs HTTP/2 both
 * ways). The machine stops at the signed size and checks the signed
 * fingerprint; a wrong one leaves the slot open for the same zip again, with
 * no new signature. `signal` stops it. Never throws.
 */
export function uploadZip(
  alias: string,
  nonce: string,
  file: Blob,
  onProgress: (sent: number) => void,
  xhrFactory: () => XMLHttpRequest = () => new XMLHttpRequest(),
  signal?: AbortSignal,
): Promise<Uploaded> {
  return new Promise((resolve) => {
    let sent = 0;
    let stop: (() => void) | null = null;
    const finish = (result: Uploaded): void => {
      if (stop !== null) signal?.removeEventListener('abort', stop);
      resolve(result);
    };
    const failed = (error: DoorError | 'stopped', status: number): void =>
      finish({ ok: false, error, status, sent });
    if (signal?.aborted) return failed('stopped', 0);
    try {
      const request = xhrFactory();
      stop = () => request.abort();
      request.upload.onprogress = (event) => {
        sent = event.loaded;
        onProgress(sent);
      };
      request.onload = () => {
        if (request.status === 202) {
          onProgress(file.size);
          return finish({ ok: true });
        }
        let body: unknown;
        try {
          body = JSON.parse(request.responseText);
        } catch {
          body = null;
        }
        const error = readRefusal(request.status, body).error;
        // A zip that arrived with no length is, for the Oracle, one that arrived incomplete.
        failed(error === 'length' ? 'wrong-size' : error, request.status);
      };
      // No answer at all: the door was never reached, or the connection dropped part-way.
      request.onerror = () => failed(sent > 0 ? 'cut' : 'unreachable', 0);
      request.onabort = () => failed('stopped', 0);
      signal?.addEventListener('abort', stop, { once: true });
      request.open('PUT', doorUrl(alias, `uploads/${nonce}`));
      request.send(file);
    } catch {
      failed('unreachable', 0);
    }
  });
}

/**
 * What the room keeps of an upload so that a reload of the same tab can
 * finish it: the slot and what was signed — never the admin code. It lives
 * in the tab's own history entry (`history.state`), as the dialogs' entry
 * does: nothing of the site's storage, and gone with the tab.
 */
export interface ImportTicket {
  readonly machine: string;
  readonly world: string;
  readonly domain: string;
  /** The request's number, which names its slot: `uploads/<nonce>`. */
  readonly nonce: string;
  /** The zip's exact size and SHA-256, as signed. */
  readonly bytes: number;
  readonly sha256: string;
  /** The zip's file name, to ask for the same one again. */
  readonly name: string;
}

/** The field of the tab's history entry that holds the room's unfinished uploads. */
const TICKETS_FIELD = 'worldsImports';

/** The unfinished uploads a history entry holds, each checked field by field; none when it holds none. */
export function readTickets(state: unknown): ImportTicket[] {
  if (!isObj(state) || !Array.isArray(state[TICKETS_FIELD])) return [];
  return (state[TICKETS_FIELD] as readonly unknown[]).flatMap((item) => {
    if (!isObj(item)) return [];
    const { machine, world, domain, nonce, bytes, sha256, name } = item;
    if (typeof machine !== 'string' || !SLUG.test(machine)) return [];
    if (typeof world !== 'string' || !SLUG.test(world)) return [];
    if (typeof domain !== 'string' || !HOST.test(domain)) return [];
    if (typeof nonce !== 'string' || !HEX32.test(nonce)) return [];
    if (!isCount(bytes) || bytes === 0) return [];
    if (typeof sha256 !== 'string' || !SHA256.test(sha256)) return [];
    if (typeof name !== 'string' || name.length > 255) return [];
    return [{ machine, world, domain, nonce, bytes, sha256, name }];
  });
}

/** A history entry's state with these unfinished uploads (none: the field goes), the rest kept. */
export function withTickets(
  state: unknown,
  tickets: readonly ImportTicket[],
): Record<string, unknown> {
  const next: Record<string, unknown> = isObj(state) ? { ...state } : {};
  if (tickets.length === 0) delete next[TICKETS_FIELD];
  else next[TICKETS_FIELD] = tickets.map((ticket) => ({ ...ticket }));
  return next;
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
