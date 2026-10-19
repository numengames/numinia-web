/**
 * A world as the body meets it, behind a fake global `WebSocket` (the
 * vendored bridge opens its connection with the standard `new
 * WebSocket(url)`, as it will in workerd): the socket opens, the world
 * sends WELCOME, the body answers with its PASE and an IDENTITY request,
 * and the world names it as an organization's AI (`ia-a_…`, « · IA»).
 * Every PASE the world receives is kept, so a test reads which passes
 * entered and when; other frames (the body's 20 Hz input) are only counted.
 * Wire format: numinia-engine packages/net/src/index.ts.
 */
const MSG_WELCOME = 5;
const MSG_IDENTITY = 10;
const MSG_PASE = 12;

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
  frames = 0;
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
    }
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
}
