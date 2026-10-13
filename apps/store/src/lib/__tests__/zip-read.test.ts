/**
 * A world's zip as the room reads it before anything is signed: the index
 * (End of Central Directory, ZIP64, a self-extractor's prefix), one small
 * entry (stored or deflated), the machine's rules mirrored for early words,
 * and the slices its fingerprint is made of. Every zip is built here, byte
 * by byte: no binary fixture in git.
 */

import { deflateRawSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import {
  HASH_CHUNK,
  ZIP_CAPS,
  checkZip,
  digestChunks,
  inspectZip,
  notRegular,
  readEntry,
  readZipIndex,
  shortHash,
  slips,
  worldRoot,
  zipStem,
  type ZipCaps,
  type ZipEntry,
} from '../zip-read';

/** One entry of a zip to build. */
interface Spec {
  readonly name: string;
  readonly data?: string | Uint8Array;
  readonly deflate?: boolean;
  readonly flags?: number;
  /** External attributes; a Unix mode goes in the high 16 bits. */
  readonly attrs?: number;
  /** Sizes the directory claims, when they must differ from the data's. */
  readonly size?: number;
  readonly compressed?: number;
  /** Write its sizes and offset in a ZIP64 extra field. */
  readonly zip64?: boolean;
  /** Another extra field, before any ZIP64 one. */
  readonly extra?: Uint8Array;
  readonly method?: number;
}

interface Options {
  /** Bytes before the zip (a self-extractor), offsets left as the zip wrote them. */
  readonly prefix?: number;
  readonly comment?: string;
  /** End with a ZIP64 record and its locator. */
  readonly zip64?: boolean;
}

const encoder = new TextEncoder();
const bytes = (data: string | Uint8Array | undefined): Uint8Array =>
  typeof data === 'string' ? encoder.encode(data) : (data ?? new Uint8Array(0));

class Writer {
  private readonly parts: number[] = [];
  get length(): number {
    return this.parts.length;
  }
  u16(value: number): this {
    this.parts.push(value & 0xff, (value >>> 8) & 0xff);
    return this;
  }
  u32(value: number): this {
    return this.u16(value & 0xffff).u16(Math.floor(value / 0x10000) & 0xffff);
  }
  u64(value: number): this {
    return this.u32(value % 0x100000000).u32(Math.floor(value / 0x100000000));
  }
  put(data: Uint8Array): this {
    for (const byte of data) this.parts.push(byte);
    return this;
  }
  done(): Uint8Array<ArrayBuffer> {
    return Uint8Array.from(this.parts);
  }
}

const MAX32 = 0xffffffff;

function makeZip(specs: readonly Spec[], options: Options = {}): Blob {
  const out = new Writer();
  const central = new Writer();
  for (const spec of specs) {
    const raw = bytes(spec.data);
    const packed = spec.deflate ? new Uint8Array(deflateRawSync(raw)) : raw;
    const name = encoder.encode(spec.name);
    const method = spec.method ?? (spec.deflate ? 8 : 0);
    const size = spec.size ?? raw.byteLength;
    const compressed = spec.compressed ?? packed.byteLength;
    const offset = out.length;
    out
      .u32(0x04034b50)
      .u16(20)
      .u16(spec.flags ?? 0)
      .u16(method)
      .u16(0)
      .u16(0)
      .u32(0)
      .u32(compressed)
      .u32(size)
      .u16(name.byteLength)
      .u16(0)
      .put(name)
      .put(packed);
    const extra = new Writer();
    if (spec.extra) extra.put(spec.extra);
    if (spec.zip64) extra.u16(1).u16(24).u64(size).u64(compressed).u64(offset);
    const extraBytes = extra.done();
    central
      .u32(0x02014b50)
      .u16((3 << 8) | 20)
      .u16(20)
      .u16(spec.flags ?? 0)
      .u16(method)
      .u16(0)
      .u16(0)
      .u32(0)
      .u32(spec.zip64 ? MAX32 : compressed)
      .u32(spec.zip64 ? MAX32 : size)
      .u16(name.byteLength)
      .u16(extraBytes.byteLength)
      .u16(0)
      .u16(0)
      .u16(0)
      .u32(spec.attrs ?? 0)
      .u32(spec.zip64 ? MAX32 : offset)
      .put(name)
      .put(extraBytes);
  }
  const directory = central.done();
  const start = out.length;
  out.put(directory);
  if (options.zip64) {
    const record = out.length;
    out
      .u32(0x06064b50)
      .u64(44)
      .u16(45)
      .u16(45)
      .u32(0)
      .u32(0)
      .u64(specs.length)
      .u64(specs.length)
      .u64(directory.byteLength)
      .u64(start);
    out.u32(0x07064b50).u32(0).u64(record).u32(1);
  }
  const comment = encoder.encode(options.comment ?? '');
  out
    .u32(0x06054b50)
    .u16(0)
    .u16(0)
    .u16(options.zip64 ? 0xffff : specs.length)
    .u16(options.zip64 ? 0xffff : specs.length)
    .u32(options.zip64 ? MAX32 : directory.byteLength)
    .u32(options.zip64 ? MAX32 : start)
    .u16(comment.byteLength)
    .put(comment);
  return new Blob([new Uint8Array(options.prefix ?? 0), out.done()]);
}

const UNIX_FILE = 0o100644 * 0x10000;
const UNIX_FOLDER = 0o040755 * 0x10000;
const UNIX_LINK = 0o120777 * 0x10000;

/** A fleet copy as `build_copy` makes it: the world under `world/`, its manifest at the top. */
const FLEET_COPY: readonly Spec[] = [
  {
    name: 'world.json',
    data: JSON.stringify({
      format: 'numinia-world-copy/1',
      world: 'pablofm',
      copiedAt: '2026-10-12T09:30:00Z',
    }),
    deflate: true,
  },
  { name: 'world/', attrs: UNIX_FOLDER },
  { name: 'world/db.sqlite', data: 'SQLite format 3\u0000 rows', attrs: UNIX_FILE },
  { name: 'world/db.sqlite-shm', data: 'shm' },
  { name: 'world/storage.json', data: '{}' },
  { name: 'world/assets/', attrs: UNIX_FOLDER },
  { name: 'world/assets/tree.glb', data: 'glTF', deflate: true },
  { name: 'world/collections/default/blueprint.json', data: '{}' },
  { name: '.env', data: 'JWT_SECRET=from-the-zip' },
  { name: 'docker-compose.yml', data: 'services: {}' },
];

const entry = (name: string, extra: Partial<ZipEntry> = {}): ZipEntry => ({
  name,
  flags: 0,
  method: 0,
  compressed: 10,
  size: 10,
  attrs: 0,
  offset: 0,
  ...extra,
});

const SMALL: ZipCaps = {
  zipMax: 1000,
  fileMax: 100,
  unpackedMax: 300,
  entriesMax: 5,
  ratioMax: 10,
  ratioFloor: 50,
};

describe('the index: End of Central Directory, ZIP64, the central directory', () => {
  it('lists every entry with its sizes, flags, attributes and where it starts', async () => {
    const index = await readZipIndex(makeZip(FLEET_COPY));
    expect(index.ok).toBe(true);
    if (!index.ok) return;
    expect(index.entries.map((e) => e.name)).toEqual(FLEET_COPY.map((spec) => spec.name));
    const db = index.entries.find((e) => e.name === 'world/db.sqlite');
    expect(db).toMatchObject({ method: 0, size: 21, compressed: 21, attrs: UNIX_FILE, flags: 0 });
    expect(index.entries[0]).toMatchObject({ method: 8, offset: 0 });
  });

  it('finds the record behind a comment, and the zip behind a self-extractor', async () => {
    const commented = await readZipIndex(makeZip(FLEET_COPY, { comment: 'made by hand' }));
    expect(commented.ok && commented.entries).toHaveLength(FLEET_COPY.length);
    const shifted = makeZip(FLEET_COPY, { prefix: 300 });
    const index = await readZipIndex(shifted);
    expect(index.ok && index.entries[0]?.offset).toBe(300);
    // The entry is read where it really is.
    const manifest = index.ok ? index.entries[0] : undefined;
    expect(manifest && (await readEntry(shifted, manifest))).not.toBeNull();
  });

  it('reads a ZIP64 zip: its record, its locator, and each entry’s 64-bit sizes and offset', async () => {
    const zip = makeZip(
      [
        {
          name: 'world/db.sqlite',
          data: 'db',
          zip64: true,
          extra: new Writer().u16(0x5455).u16(1).put(Uint8Array.of(0)).done(),
        },
        { name: 'world.json', data: '{"world":"grande"}', zip64: true, deflate: true },
      ],
      { zip64: true },
    );
    const index = await readZipIndex(zip);
    expect(index.ok && index.entries.map((e) => [e.name, e.size, e.compressed])).toEqual([
      ['world/db.sqlite', 2, 2],
      ['world.json', 18, expect.any(Number)],
    ]);
    const second = index.ok ? index.entries[1] : undefined;
    expect(second && second.offset).toBeGreaterThan(0);
    expect(await inspectZip(zip)).toMatchObject({ ok: true, reading: { world: 'grande' } });
  });

  it('decodes names as the zip wrote them: UTF-8 when it says so, byte for byte otherwise', async () => {
    const index = await readZipIndex(makeZip([{ name: 'mapa-ñ.txt', flags: 0x800 }]));
    expect(index.ok && index.entries[0]?.name).toBe('mapa-ñ.txt');
    // The same bytes without the flag: one character per byte.
    const raw = await readZipIndex(makeZip([{ name: 'mapa-ñ.txt' }]));
    expect(raw.ok && raw.entries[0]?.name).toBe('mapa-Ã±.txt');
  });

  it('calls anything whose index does not add up not a zip', async () => {
    const notAZip = { ok: false, problem: { rule: 'not-a-zip', entry: null, amount: null } };
    expect(await readZipIndex(new Blob(['PK']))).toEqual(notAZip);
    expect(await readZipIndex(new Blob(['x'.repeat(200)]))).toEqual(notAZip);
    const good = new Uint8Array(
      await makeZip([{ name: 'world/db.sqlite', data: 'db' }]).arrayBuffer(),
    );
    const at = good.byteLength - 22;
    const dirAt = new DataView(good.buffer).getUint32(at + 16, true);
    const broken = (patch: (copy: DataView) => void): Blob => {
      const copy = good.slice();
      patch(new DataView(copy.buffer));
      return new Blob([copy]);
    };
    // A directory said to be bigger than everything before its record.
    expect(await readZipIndex(broken((v) => v.setUint32(at + 12, 5000, true)))).toEqual(notAZip);
    // A directory whose header is not one.
    expect(await readZipIndex(broken((v) => v.setUint32(dirAt, 0x01020304, true)))).toEqual(
      notAZip,
    );
    // A name longer than the directory holds.
    expect(await readZipIndex(broken((v) => v.setUint16(dirAt + 28, 500, true)))).toEqual(notAZip);
    // A directory ending in half a header.
    const tail = good.slice(at);
    new DataView(tail.buffer).setUint32(
      12,
      new DataView(tail.buffer).getUint32(12, true) + 10,
      true,
    );
    expect(await readZipIndex(new Blob([good.slice(0, at), new Uint8Array(10), tail]))).toEqual(
      notAZip,
    );
  });

  it('refuses a ZIP64 extra that does not hold what its entry says it does', async () => {
    const notAZip = { ok: false, problem: { rule: 'not-a-zip', entry: null, amount: null } };
    // A field longer than the room left for it.
    const overflowing = makeZip([
      { name: 'a', data: 'a', extra: new Writer().u16(0x7875).u16(40).done() },
    ]);
    expect(await readZipIndex(overflowing)).toEqual(notAZip);
    // The size said to be in the ZIP64 field: there when it is, refused when it is too short.
    const withSize = async (extra: Uint8Array): Promise<unknown> => {
      const zip = new Uint8Array(await makeZip([{ name: 'a', data: 'abc', extra }]).arrayBuffer());
      const view = new DataView(zip.buffer);
      const dir = view.getUint32(zip.byteLength - 22 + 16, true);
      view.setUint32(dir + 24, MAX32, true);
      return readZipIndex(new Blob([zip]));
    };
    expect(await withSize(new Writer().u16(1).u16(8).u64(3).done())).toMatchObject({
      ok: true,
      entries: [{ name: 'a', size: 3, compressed: 3, offset: 0 }],
    });
    expect(await withSize(new Writer().u16(1).u16(4).u32(0).done())).toEqual(notAZip);
  });

  it('says too many files when the directory alone is bigger than any world needs', async () => {
    const huge = 33 * 1024 ** 2;
    const tail = new Writer()
      .u32(0x06054b50)
      .u16(0)
      .u16(0)
      .u16(1)
      .u16(1)
      .u32(huge)
      .u32(0)
      .u16(0)
      .done();
    const zip = new Blob([new Uint8Array(huge), tail]);
    expect(await readZipIndex(zip)).toEqual({
      ok: false,
      problem: { rule: 'too-many-files', entry: null, amount: null },
    });
  });
});

describe('one small entry, stored or deflated', () => {
  it('reads a stored entry and a deflated one', async () => {
    const zip = makeZip([
      { name: 'a.txt', data: 'stored text' },
      { name: 'b.txt', data: 'deflated text '.repeat(20), deflate: true },
    ]);
    const index = await readZipIndex(zip);
    if (!index.ok) throw new Error('not read');
    const [a, b] = index.entries as [ZipEntry, ZipEntry];
    expect(new TextDecoder().decode((await readEntry(zip, a)) ?? undefined)).toBe('stored text');
    expect(new TextDecoder().decode((await readEntry(zip, b)) ?? undefined)).toBe(
      'deflated text '.repeat(20),
    );
  });

  it('reads nothing too big, nothing it cannot find, and nothing packed another way', async () => {
    const zip = makeZip([
      { name: 'a.txt', data: 'stored text' },
      { name: 'bomb', data: new Uint8Array(100_000), deflate: true, size: 10 },
      { name: 'bz', data: 'x', method: 12 },
      { name: 'rota', data: 'not deflate at all', method: 8 },
    ]);
    const index = await readZipIndex(zip);
    if (!index.ok) throw new Error('not read');
    const [a, bomb, bz, rota] = index.entries as [ZipEntry, ZipEntry, ZipEntry, ZipEntry];
    expect(await readEntry(zip, a, 5)).toBeNull();
    expect(await readEntry(zip, { ...a, compressed: 50 }, 40)).toBeNull();
    // Its local header is not where the directory says.
    expect(await readEntry(zip, { ...a, offset: 3 })).toBeNull();
    expect(await readEntry(zip, { ...a, offset: 1_000_000 })).toBeNull();
    // It claims more packed bytes than the file has.
    expect(await readEntry(zip, { ...a, compressed: 900, size: 900 })).toBeNull();
    // A few packed bytes that would unpack to far more than they claim: stopped at the limit.
    expect(await readEntry(zip, bomb, 1000)).toBeNull();
    expect(await readEntry(zip, bz)).toBeNull();
    expect(await readEntry(zip, rota)).toBeNull();
  });
});

describe('the machine’s rules, said before anything is signed', () => {
  it('tells a name that would land outside its folder, or that no honest zip tool writes', () => {
    for (const name of [
      '../x',
      'world/../../etc',
      '/etc/passwd',
      'C:\\x',
      'c:x',
      'a\\b',
      '',
      'a//b',
      './x',
      'world/./db.sqlite',
      'x\0y',
    ]) {
      expect(slips(name)).toBe(true);
    }
    for (const name of ['world/db.sqlite', 'world/a..b', '..hidden', 'world/.x', 'world/']) {
      expect(slips(name)).toBe(false);
    }
  });

  it('tells a link or a device from a file or a folder, by its Unix type bits and its name', () => {
    expect(notRegular({ name: 'l', attrs: UNIX_LINK })).toBe(true);
    expect(notRegular({ name: 'dev', attrs: 0o060660 << 16 })).toBe(true);
    expect(notRegular({ name: 'f', attrs: UNIX_FILE })).toBe(false);
    expect(notRegular({ name: 'd/', attrs: UNIX_FOLDER })).toBe(false);
    // A file that says it is a folder, or a folder that says it is a file.
    expect(notRegular({ name: 'f', attrs: UNIX_FOLDER })).toBe(true);
    expect(notRegular({ name: 'd/', attrs: UNIX_FILE })).toBe(true);
    // A zip made where there are no Unix modes says nothing: a file.
    expect(notRegular({ name: 'f', attrs: 0x20 })).toBe(false);
  });

  it('finds the world: under world/, in its one top folder, or at the root', () => {
    expect(worldRoot([{ name: 'world/db.sqlite' }, { name: 'otra/db.sqlite' }])).toBe('world/');
    expect(worldRoot([{ name: 'mi-mundo/db.sqlite' }, { name: 'mi-mundo/assets/a' }])).toBe(
      'mi-mundo/',
    );
    expect(worldRoot([{ name: 'db.sqlite' }, { name: 'assets/a' }])).toBe('');
    expect(
      worldRoot([{ name: 'a/db.sqlite' }, { name: 'b/db.sqlite' }, { name: 'db.sqlite' }]),
    ).toBe('');
    expect(worldRoot([{ name: 'a/db.sqlite' }, { name: 'b/db.sqlite' }])).toBeNull();
    expect(worldRoot([{ name: 'a/b/db.sqlite' }])).toBeNull();
    expect(worldRoot([])).toBeNull();
  });

  it('applies them in the machine’s order, naming the entry and what it measured', () => {
    const world = [entry('world/db.sqlite'), entry('world/assets/a.glb')];
    expect(checkZip(world, SMALL)).toBeNull();
    expect(checkZip([...world, entry('world/x', { flags: 1 })], SMALL)).toEqual({
      rule: 'encrypted',
      entry: 'world/x',
      amount: null,
    });
    const many = Array.from({ length: 6 }, (_, i) => entry(`world/assets/${i}`));
    expect(checkZip(many, SMALL)).toEqual({ rule: 'too-many-files', entry: null, amount: 6 });
    expect(checkZip([...world, entry('../evil')], SMALL)).toMatchObject({
      rule: 'zip-slip',
      entry: '../evil',
    });
    expect(
      checkZip([...world, entry('world/assets/l', { attrs: UNIX_LINK })], SMALL),
    ).toMatchObject({ rule: 'link', entry: 'world/assets/l' });
    expect(checkZip([...world, entry('world/assets/big', { size: 101 })], SMALL)).toEqual({
      rule: 'file-too-big',
      entry: 'world/assets/big',
      amount: 101,
    });
    expect(
      checkZip([...world, entry('world/assets/z', { size: 60, compressed: 2 })], SMALL),
    ).toEqual({ rule: 'ratio', entry: 'world/assets/z', amount: 30 });
    expect(
      checkZip([...world, entry('world/assets/z', { size: 60, compressed: 0 })], SMALL),
    ).toMatchObject({ rule: 'ratio', amount: Infinity });
    // Under the floor, any ratio goes.
    expect(
      checkZip([...world, entry('world/assets/s', { size: 40, compressed: 1 })], SMALL),
    ).toBeNull();
    const heavy = [0, 1, 2, 3].map((i) => entry(`world/assets/${i}`, { size: 90, compressed: 90 }));
    expect(checkZip([entry('world/db.sqlite'), ...heavy], SMALL)).toEqual({
      rule: 'unpacked-too-big',
      entry: null,
      amount: 370,
    });
    expect(checkZip([entry('readme.txt')], SMALL)).toMatchObject({ rule: 'not-a-world' });
    expect(checkZip([...world, entry('world/db.sqlite-wal')], SMALL)).toMatchObject({
      rule: 'db-open',
      entry: 'world/db.sqlite-wal',
    });
    expect(checkZip([...world, entry('world/db.sqlite-journal')], SMALL)).toMatchObject({
      rule: 'db-open',
    });
    expect(checkZip([...world, entry('world/notes.txt')], SMALL)).toEqual({
      rule: 'unexpected',
      entry: 'world/notes.txt',
      amount: null,
    });
    // What sits outside the world is never unpacked: the zip's .env, its compose, its README.
    expect(
      checkZip(
        [...world, entry('world/db.sqlite-shm'), entry('.env'), entry('docker-compose.yml')],
        SMALL,
      ),
    ).toBeNull();
  });

  it('keeps the machine’s own caps', () => {
    expect(ZIP_CAPS).toEqual({
      zipMax: 2147483648,
      fileMax: 1073741824,
      unpackedMax: 4294967296,
      entriesMax: 20000,
      ratioMax: 100,
      ratioFloor: 1048576,
    });
    expect(checkZip([entry('world/db.sqlite')])).toBeNull();
  });
});

describe('inspectZip — what the room says about a zip', () => {
  it('describes a fleet copy: its world, when it was made, the files the machine keeps', async () => {
    const zip = makeZip(FLEET_COPY);
    const inspection = await inspectZip(zip);
    expect(inspection).toEqual({
      ok: true,
      reading: {
        root: 'world/',
        files: 4,
        unpacked: expect.any(Number),
        world: 'pablofm',
        copiedAt: '2026-10-12T09:30:00Z',
        engineBytes: 0,
      },
    });
  });

  it('describes a bare world folder, and a Tower backup with its unused engine image', async () => {
    const folder = makeZip([
      { name: 'mi-mundo/db.sqlite', data: 'db' },
      { name: 'mi-mundo/assets/a', data: 'a' },
      { name: 'mi-mundo/assets/b', data: 'b' },
    ]);
    expect(await inspectZip(folder)).toMatchObject({
      ok: true,
      reading: { root: 'mi-mundo/', files: 3, world: null, copiedAt: null, engineBytes: 0 },
    });
    const tower = makeZip([
      { name: 'world.json', data: JSON.stringify({ slug: 'torre', copiedAt: 'yesterday' }) },
      { name: 'world/db.sqlite', data: 'db' },
      { name: 'engine/hyperfy.tar', data: new Uint8Array(4096) },
    ]);
    expect(await inspectZip(tower)).toMatchObject({
      ok: true,
      reading: { root: 'world/', world: 'torre', copiedAt: null, engineBytes: 4096 },
    });
  });

  it('reads a manifest only when it is one: a name, a time, an object', async () => {
    const withManifest = async (data: string | Uint8Array, size?: number) => {
      const reading = await inspectZip(
        makeZip([
          size === undefined
            ? { name: 'world.json', data }
            : { name: 'world.json', data, size, compressed: size },
          { name: 'world/db.sqlite', data: 'db' },
        ]),
      );
      return reading.ok ? [reading.reading.world, reading.reading.copiedAt] : reading.problem.rule;
    };
    expect(
      await withManifest('{"name":"  Plaza Mayor  ","copiedAt":"2026-10-12T09:30+02:00"}'),
    ).toEqual(['Plaza Mayor', '2026-10-12T09:30+02:00']);
    expect(await withManifest('not json')).toEqual([null, null]);
    expect(await withManifest('["world"]')).toEqual([null, null]);
    expect(await withManifest('null')).toEqual([null, null]);
    expect(await withManifest('{"world":"   ","slug":7}')).toEqual([null, null]);
    expect(await withManifest('{}', 2 * 1024 ** 2)).toEqual([null, null]);
  });

  it('says what the machine would refuse, before anything is signed', async () => {
    expect(await inspectZip(new Blob([]))).toEqual({
      ok: false,
      problem: { rule: 'empty', entry: null, amount: null },
    });
    expect(await inspectZip(new Blob(['this is a text file, not a zip at all']))).toMatchObject({
      ok: false,
      problem: { rule: 'not-a-zip' },
    });
    expect(
      await inspectZip(makeZip([{ name: 'world/db.sqlite', data: 'db', flags: 1 }])),
    ).toMatchObject({ ok: false, problem: { rule: 'encrypted', entry: 'world/db.sqlite' } });
    expect(
      await inspectZip(
        makeZip([
          { name: 'db.sqlite', data: 'db' },
          { name: 'x', size: 200 },
        ]),
        SMALL,
      ),
    ).toMatchObject({ ok: false, problem: { rule: 'file-too-big' } });
    // An empty zip holds no world.
    expect(await inspectZip(makeZip([]))).toMatchObject({
      ok: false,
      problem: { rule: 'not-a-world' },
    });
  });

  it('never throws: a file that cannot be read is not a zip', async () => {
    const unreadable = {
      size: 100,
      slice: () => {
        throw new Error('gone');
      },
    } as unknown as Blob;
    expect(await inspectZip(unreadable)).toMatchObject({
      ok: false,
      problem: { rule: 'not-a-zip' },
    });
  });
});

describe('small words and the fingerprint’s slices', () => {
  it('names a world after its zip, and shortens a fingerprint to read it', () => {
    expect(zipStem('Plaza-20261012.ZIP')).toBe('Plaza-20261012');
    expect(zipStem('plaza')).toBe('plaza');
    expect(shortHash('9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08')).toBe(
      '9f86d081…b0f00a08',
    );
    expect(shortHash('abc')).toBe('abc');
  });

  it('feeds a file to a hash slice by slice, never whole, saying how far it got', async () => {
    const file = new Blob([Uint8Array.from({ length: 10 }, (_, i) => i)]);
    const seen: number[][] = [];
    const done: number[] = [];
    await digestChunks(
      file,
      (slice) => seen.push([...slice]),
      (at) => done.push(at),
      4,
    );
    expect(seen).toEqual([
      [0, 1, 2, 3],
      [4, 5, 6, 7],
      [8, 9],
    ]);
    expect(done).toEqual([4, 8, 10]);
    const whole: number[] = [];
    await digestChunks(file, (slice) => whole.push(slice.byteLength));
    expect(whole).toEqual([10]);
    expect(HASH_CHUNK).toBe(8 * 1024 ** 2);
  });
});
