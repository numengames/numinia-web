/**
 * A world as the body meets it, behind a fake global `WebSocket` (the
 * vendored bridge opens its connection with the standard `new
 * WebSocket(url)`, as it will in workerd): the socket opens, the world
 * sends WELCOME, the body answers with its PASE and an IDENTITY request,
 * and the world names it as an organization's AI (`ia-a_…`, « · IA»).
 * Every PASE the world receives is kept, so a test reads which passes
 * entered and when; other frames (the body's 20 Hz input) are only counted.
 * With its name the world sends its feature catalog (`chat`, `objetos`, and
 * the ones a test asks for in `features`: `llamar`, `burbuja`, `gestos`, `ia`)
 * and whether the body may build (`objetos.permiso`); each intent the body
 * sends (say, place, undo…) is decoded and kept, and a build is answered
 * `hecho` (or `rechazado`, when the test says so), as the engine's server
 * answers it. Wire format: numinia-engine packages/net/src/index.ts and
 * packages/client/src/features.ts.
 */
const MSG_WELCOME = 5;
const MSG_CATALOG = 6;
const MSG_FEATURE = 7;
const MSG_IDENTITY = 10;
const MSG_PASE = 12;

type Field =
  | { readonly kind: 'bool' }
  | { readonly kind: 'text'; readonly maxBytes: number }
  | { readonly kind: 'int'; readonly min: number; readonly max: number }
  | { readonly kind: 'enum'; readonly values: readonly string[] }
  | { readonly kind: 'fixed'; readonly min: number; readonly max: number; readonly step: number };

const text = (maxBytes: number): Field => ({ kind: 'text', maxBytes });
const metres: Field = { kind: 'fixed', min: -2048, max: 2048, step: 0.01 };
const BOOL: Field = { kind: 'bool' };
const who: Field = { kind: 'int', min: 0, max: 65535 };
/** The ways to call an AI (features/llamar). */
export const CALL_MODES = ['nombre', 'barra', 'boton', 'frase'] as const;
/** The moves of the `gestos` feature the bridge's four gestures play. */
const MOVES = ['saludar', 'hablar', 'agacharse', 'usar', 'parar'] as const;

interface Entry {
  readonly feature: string;
  readonly kind: 'intent' | 'event';
  readonly name: string;
  readonly index: number;
  readonly fields: Record<string, Field>;
}

const pose = { x: metres, y: metres, z: metres };
const size = { sx: metres, sy: metres, sz: metres };
/** The intents and events of the world's catalog, numbered in order (the wire's message index). */
const ENTRIES: readonly Entry[] = (
  [
    ['chat', 'intent', 'decir', { texto: text(400) }],
    ['chat', 'intent', 'decirZona', { texto: text(400) }],
    [
      'objetos',
      'intent',
      'colocar',
      { modelo: text(64), ...pose, ry: metres, nombre: text(160), decorado: BOOL },
    ],
    [
      'objetos',
      'intent',
      'mover',
      { id: text(16), ...pose, rx: metres, ry: metres, rz: metres, ...size },
    ],
    ['objetos', 'intent', 'borrar', { id: text(16) }],
    ['objetos', 'intent', 'deshacer', {}],
    ['objetos', 'event', 'permiso', { construir: BOOL }],
    ['objetos', 'event', 'hecho', { id: text(16) }],
    ['objetos', 'event', 'rechazado', { motivo: text(120) }],
    [
      'llamar',
      'event',
      'llamada',
      {
        ia: who,
        quien: who,
        nombre: text(60),
        texto: text(190),
        modo: { kind: 'enum', values: CALL_MODES },
        t: { kind: 'int', min: 0, max: 2147483647 },
      },
    ],
    [
      'burbuja',
      'event',
      'entraEnBurbuja',
      {
        ia: who,
        quien: who,
        nombre: text(60),
        distanciaDm: { kind: 'int', min: 0, max: 65535 },
        esIA: BOOL,
      },
    ],
    ['burbuja', 'event', 'saleDeBurbuja', { ia: who, quien: who, nombre: text(60), esIA: BOOL }],
    ['gestos', 'intent', 'hacer', { gesto: { kind: 'enum', values: MOVES } }],
    ['ia', 'intent', 'atenta', {}],
  ] as const
).map(([feature, kind, name, fields], index) => ({ feature, kind, name, index, fields }));

function catalog(ids: readonly string[]): Uint8Array {
  const features = ids.map((id) => ({
    id,
    version: 1,
    intents: ENTRIES.filter((e) => e.feature === id && e.kind === 'intent'),
    events: ENTRIES.filter((e) => e.feature === id && e.kind === 'event'),
  }));
  const json = new TextEncoder().encode(
    JSON.stringify({ schema: 'numinia-engine/catalog@1', features }),
  );
  const bytes = new Uint8Array(json.length + 1);
  bytes[0] = MSG_CATALOG;
  bytes.set(json, 1);
  return bytes;
}

const lengthBits = (maxBytes: number): number => Math.max(1, Math.ceil(Math.log2(maxBytes + 1)));
const intBits = (f: { min: number; max: number }): number =>
  Math.max(1, Math.ceil(Math.log2(f.max - f.min + 1)));
const enumBits = (f: { values: readonly string[] }): number =>
  Math.max(1, Math.ceil(Math.log2(f.values.length)));
const fixedBits = (f: { min: number; max: number; step: number }): number =>
  Math.max(1, Math.ceil(Math.log2(Math.floor((f.max - f.min) / f.step) + 1)));

/** FEATURE from the world: type, index (16 bits), then the fields, bit by bit. */
function event(name: string, value: Record<string, boolean | number | string>): Uint8Array {
  const entry = ENTRIES.find((e) => e.kind === 'event' && e.name === name);
  if (entry === undefined) throw new Error(`no event ${name}`);
  const bits: number[] = [];
  const put = (v: number, n: number): void => {
    for (let i = n - 1; i >= 0; i -= 1) bits.push((v >>> i) & 1);
  };
  put(MSG_FEATURE, 8);
  put(entry.index, 16);
  for (const [key, field] of Object.entries(entry.fields)) {
    const v = value[key];
    if (field.kind === 'bool') put(v === true ? 1 : 0, 1);
    else if (field.kind === 'int') put(Number(v) - field.min, intBits(field));
    else if (field.kind === 'enum') put(field.values.indexOf(String(v)), enumBits(field));
    else if (field.kind === 'text') {
      const b = new TextEncoder().encode(String(v ?? ''));
      put(b.length, lengthBits(field.maxBytes));
      for (const x of b) put(x, 8);
    }
  }
  const bytes = new Uint8Array(Math.ceil(bits.length / 8));
  bits.forEach((bit, i) => {
    if (bit === 1) bytes[i >> 3] = (bytes[i >> 3] ?? 0) | (128 >> (i & 7));
  });
  return bytes;
}

/** One intent the body sent: which, and its fields as the world reads them. */
export interface IntentSeen {
  readonly feature: string;
  readonly name: string;
  readonly fields: Record<string, number | string | boolean>;
}

function readIntent(bytes: Uint8Array): IntentSeen | null {
  let bit = 0;
  const take = (n: number): number => {
    let v = 0;
    for (let i = 0; i < n; i += 1) {
      v = (v << 1) | (((bytes[bit >> 3] ?? 0) >> (7 - (bit & 7))) & 1);
      bit += 1;
    }
    return v >>> 0;
  };
  take(8);
  const entry = ENTRIES[take(16)];
  if (entry === undefined || entry.kind !== 'intent') return null;
  const fields: Record<string, number | string | boolean> = {};
  for (const [key, field] of Object.entries(entry.fields)) {
    if (field.kind === 'bool') fields[key] = take(1) === 1;
    else if (field.kind === 'int') fields[key] = field.min + take(intBits(field));
    else if (field.kind === 'enum') fields[key] = field.values[take(enumBits(field))] ?? '';
    else if (field.kind === 'fixed') fields[key] = field.min + take(fixedBits(field)) * field.step;
    else {
      const n = take(lengthBits(field.maxBytes));
      fields[key] = new TextDecoder().decode(Uint8Array.from({ length: n }, () => take(8)));
    }
  }
  return { feature: entry.feature, name: entry.name, fields };
}

/** WELCOME: entity 16, tick 32, x 32, z 32, seed 32, ticks 32, n 16, hash 32, format 8 (big-endian). */
function welcome(entity: number): Uint8Array {
  const bytes = new Uint8Array(30);
  const view = new DataView(bytes.buffer);
  view.setUint8(0, MSG_WELCOME);
  view.setUint16(1, entity);
  view.setUint32(3, 100);
  view.setInt32(7, 0);
  view.setInt32(11, 0);
  view.setUint32(15, 1);
  view.setUint32(19, 0);
  view.setUint16(23, 0);
  view.setUint32(25, 0);
  view.setUint8(29, 2);
  return bytes;
}

function identity(name: string): Uint8Array {
  const json = new TextEncoder().encode(
    JSON.stringify({ token: '', id: `ia-a_${'0f'.repeat(16)}`, nombre: name }),
  );
  const bytes = new Uint8Array(json.length + 1);
  bytes[0] = MSG_IDENTITY;
  bytes.set(json, 1);
  return bytes;
}

export interface PassSeen {
  readonly pass: string;
  readonly at: number;
}

export class FakeSocket extends EventTarget {
  readonly url: string;
  readyState = 0;
  binaryType = 'blob';
  readonly passes: PassSeen[] = [];
  readonly intents: IntentSeen[] = [];
  frames = 0;
  private made = 0;
  closedBy: 'client' | 'world' | null = null;
  private readonly world: FakeWorld;

  constructor(url: string, world: FakeWorld) {
    super();
    this.url = url;
    this.world = world;
    world.sockets.push(this);
    queueMicrotask(() => {
      if (world.answers) {
        this.open();
        return;
      }
      // A world that is not there: the connection fails.
      this.readyState = 3;
      this.dispatchEvent(new Event('error'));
      this.fire(1006, '');
    });
  }

  open(): void {
    this.readyState = 1;
    this.dispatchEvent(new Event('open'));
    // The world speaks first a moment later, once the client listens (as over a real network).
    setTimeout(() => {
      if (this.readyState === 1) this.deliver(welcome(this.world.sockets.indexOf(this) + 1));
    }, 5);
  }

  send(data: ArrayBuffer | Uint8Array): void {
    const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
    this.frames += 1;
    if (bytes[0] === MSG_PASE) {
      this.passes.push({ pass: String.fromCharCode(...bytes.subarray(1)), at: Date.now() });
    } else if (bytes[0] === MSG_IDENTITY) {
      this.deliver(identity(this.world.name));
      this.deliver(catalog(this.world.features));
      this.deliver(event('permiso', { construir: this.world.build }));
    } else if (bytes[0] === MSG_FEATURE) {
      this.intent(bytes);
    }
  }

  /** The world reads an intent and, for a build, answers it a moment later (as over a network). */
  private intent(bytes: Uint8Array): void {
    const seen = readIntent(bytes);
    if (seen === null) return;
    this.intents.push(seen);
    if (seen.feature !== 'objetos') return;
    const refusal = this.world.refuse;
    this.made += 1;
    const id = seen.name === 'deshacer' ? '' : `o${this.made}`;
    queueMicrotask(() =>
      this.deliver(
        refusal === null ? event('hecho', { id }) : event('rechazado', { motivo: refusal }),
      ),
    );
  }

  /** The world tells the body something (a call, someone entering its bubble…). */
  emit(name: string, value: Record<string, boolean | number | string>): void {
    this.deliver(event(name, value));
  }

  /** The client closes (the bridge's `parar`, or it gave up on the world). */
  close(): void {
    if (this.readyState >= 2) return;
    this.readyState = 3;
    this.closedBy = 'client';
    queueMicrotask(() => this.fire(1000, ''));
  }

  /** The world closes the connection (4003: «do not come back by yourself»). */
  shut(code: number, reason = ''): void {
    this.readyState = 3;
    this.closedBy = 'world';
    this.fire(code, reason);
  }

  private deliver(bytes: Uint8Array): void {
    const data = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    this.dispatchEvent(new MessageEvent('message', { data }));
  }

  private fire(code: number, reason: string): void {
    this.dispatchEvent(Object.assign(new Event('close'), { code, reason }));
  }
}

export class FakeWorld {
  readonly sockets: FakeSocket[] = [];
  /** false: every connection fails (a world that is not there). */
  answers = true;
  name = 'Claude de Ana · IA';
  /** Whether the world lets the body build (`objetos.permiso`, sent with its name). */
  build = true;
  /** The features its catalog lists. */
  features: string[] = ['chat', 'objetos'];
  /** Set: the world refuses every build with this reason (`objetos.rechazado`). */
  refuse: string | null = null;

  /** The `WebSocket` constructor to put in `globalThis`. */
  socketClass(): typeof WebSocket {
    // eslint-disable-next-line @typescript-eslint/no-this-alias -- the class below closes over this world
    const world = this;
    return class extends FakeSocket {
      constructor(url: string) {
        super(url, world);
      }
    } as unknown as typeof WebSocket;
  }

  /** Every PASE any socket of this world received, in order. */
  passes(): PassSeen[] {
    return this.sockets.flatMap((socket) => socket.passes).sort((a, b) => a.at - b.at);
  }

  last(): FakeSocket | undefined {
    return this.sockets.at(-1);
  }

  /** Every intent any socket of this world received, in order. */
  intents(): IntentSeen[] {
    return this.sockets.flatMap((socket) => socket.intents);
  }
}
