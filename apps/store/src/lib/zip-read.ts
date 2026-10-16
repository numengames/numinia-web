/**
 * A world's zip, read in the Oracle's browser before anything is signed: its
 * index — the End of Central Directory (ZIP64 included) and the central
 * directory, each read with `Blob.slice()`, never the whole file — one small
 * entry (`world.json`), and the fleet machine's own rules (numinia-assets
 * `open-worlds/machine/reconcile.py`, ImportWorld), applied here only to say
 * early what the machine would refuse. The machine re-checks everything
 * after the upload: nothing read here is trusted for security.
 *
 * Pure: no dependency and no zod — this runs in the room's island. A
 * Numinia Engine world's zip (`mundo.json`) is read only as far as the
 * machine reads it: the rules every zip keeps, then its manifest's version;
 * the engine's own tools judge the rest on its machine.
 */

import type { Engine } from './worlds';

/** The machine's caps for a world's zip; its own are the law, these mirror them. */
export const ZIP_CAPS = {
  /** The biggest zip a machine takes; its door says its own in `/machine` (`imports.zipMaxBytes`). */
  zipMax: 2 * 1024 ** 3,
  /** The biggest single file inside it. */
  fileMax: 1024 ** 3,
  /** Everything inside it, unpacked. */
  unpackedMax: 4 * 1024 ** 3,
  entriesMax: 20_000,
  /** How much one entry may grow when unpacked (its size over its packed size)… */
  ratioMax: 100,
  /** …judged only for entries of at least this size. */
  ratioFloor: 1024 ** 2,
} as const;

export type ZipCaps = { readonly [K in keyof typeof ZIP_CAPS]: number };

/** One entry of the central directory. */
export interface ZipEntry {
  readonly name: string;
  readonly flags: number;
  readonly method: number;
  /** Bytes packed in the zip. */
  readonly compressed: number;
  /** Bytes once unpacked. */
  readonly size: number;
  /** External attributes: a Unix mode in the high 16 bits when a Unix tool made the zip. */
  readonly attrs: number;
  /** Where its local header starts in the file. */
  readonly offset: number;
}

/** Every rule the room checks before signing, named as the machine names them. */
export type ZipRule =
  | 'empty'
  | 'not-a-zip'
  | 'encrypted'
  | 'too-many-files'
  | 'zip-slip'
  | 'link'
  | 'file-too-big'
  | 'ratio'
  | 'unpacked-too-big'
  | 'not-a-world'
  | 'db-open'
  | 'unexpected';

export interface ZipProblem {
  readonly rule: ZipRule;
  /** The entry that broke it, when one did. */
  readonly entry: string | null;
  /** What the rule measured: a count of entries, a size in bytes, or a ratio. */
  readonly amount: number | null;
}

const EOCD = 0x06054b50;
const ZIP64_LOCATOR = 0x07064b50;
const ZIP64_EOCD = 0x06064b50;
const CENTRAL = 0x02014b50;
const LOCAL = 0x04034b50;
const EOCD_SIZE = 22;
const LOCATOR_SIZE = 20;
const ZIP64_EOCD_SIZE = 56;
const CENTRAL_SIZE = 46;
const LOCAL_SIZE = 30;
const MAX_COMMENT = 0xffff;
const MAX32 = 0xffffffff;
const ZIP64_EXTRA = 0x0001;
/** The most of a central directory the room reads: far more than ENTRIES_MAX names ever need. */
const CENTRAL_MAX = 32 * 1024 ** 2;
const FLAG_ENCRYPTED = 0x1;
const FLAG_UTF8 = 0x800;

const problem = (rule: ZipRule, entry: string | null = null, amount: number | null = null) => ({
  rule,
  entry,
  amount,
});

async function view(blob: Blob, start: number, end: number): Promise<DataView> {
  return new DataView(await blob.slice(start, end).arrayBuffer());
}

const utf8 = new TextDecoder('utf-8');

/** A name as the zip wrote it: UTF-8 when its flag says so, else byte for byte. */
function decodeName(bytes: Uint8Array, flags: number): string {
  return flags & FLAG_UTF8 ? utf8.decode(bytes) : String.fromCharCode(...bytes);
}

interface Directory {
  /** Where the central directory starts, and how long it is. */
  readonly start: number;
  readonly size: number;
  /** Bytes a self-extractor (or anything) put before the zip: added to every offset, as zipfile does. */
  readonly shift: number;
}

/** The End of Central Directory (and its ZIP64 record) → where the directory lies; null if none. */
async function findDirectory(blob: Blob): Promise<Directory | null> {
  const from = Math.max(0, blob.size - EOCD_SIZE - MAX_COMMENT);
  const tail = await view(blob, from, blob.size);
  let at = -1;
  // The record ends the file, followed only by its comment: the last one found is it.
  for (let i = tail.byteLength - EOCD_SIZE; i >= 0; i -= 1) {
    if (tail.getUint32(i, true) === EOCD) {
      at = i;
      break;
    }
  }
  if (at < 0) return null;
  const end = from + at;
  let size = tail.getUint32(at + 12, true);
  let offset = tail.getUint32(at + 16, true);
  let records = end;
  // A ZIP64 zip says so in a locator just before the record, right after its own record.
  if (end >= LOCATOR_SIZE + ZIP64_EOCD_SIZE) {
    const locator = await view(blob, end - LOCATOR_SIZE, end);
    const record = await view(blob, end - LOCATOR_SIZE - ZIP64_EOCD_SIZE, end - LOCATOR_SIZE);
    if (locator.getUint32(0, true) === ZIP64_LOCATOR && record.getUint32(0, true) === ZIP64_EOCD) {
      size = Number(record.getBigUint64(40, true));
      offset = Number(record.getBigUint64(48, true));
      records = end - LOCATOR_SIZE - ZIP64_EOCD_SIZE;
    }
  }
  // The directory ends where its record (or its ZIP64 record) starts: whatever comes before
  // the zip (a self-extractor) shifts every offset it wrote, as Python's zipfile reads it.
  const shift = records - size - offset;
  return offset + shift < 0 ? null : { start: offset + shift, size, shift };
}

/** One central-directory header's ZIP64 extra: the 64-bit sizes and offset its 32-bit fields stand for. */
function zip64Fields(
  dir: DataView,
  from: number,
  to: number,
  fields: { size: number; compressed: number; offset: number },
): boolean {
  let at = from;
  while (at + 4 <= to) {
    const id = dir.getUint16(at, true);
    const length = dir.getUint16(at + 2, true);
    if (at + 4 + length > to) return false;
    if (id === ZIP64_EXTRA) {
      let field = at + 4;
      const fieldEnd = field + length;
      for (const key of ['size', 'compressed', 'offset'] as const) {
        if (fields[key] !== MAX32) continue;
        if (field + 8 > fieldEnd) return false;
        fields[key] = Number(dir.getBigUint64(field, true));
        field += 8;
      }
    }
    at += 4 + length;
  }
  return true;
}

export type ZipIndex =
  | { readonly ok: true; readonly entries: readonly ZipEntry[] }
  | { readonly ok: false; readonly problem: ZipProblem };

/**
 * The zip's entries, from its central directory alone. A file that is not a
 * zip, spans several disks or whose directory does not add up is `not-a-zip`.
 */
export async function readZipIndex(blob: Blob): Promise<ZipIndex> {
  const notAZip: ZipIndex = { ok: false, problem: problem('not-a-zip') };
  if (blob.size < EOCD_SIZE) return notAZip;
  const where = await findDirectory(blob);
  if (where === null) return notAZip;
  if (where.size > CENTRAL_MAX) return { ok: false, problem: problem('too-many-files') };
  const dir = await view(blob, where.start, where.start + where.size);
  const entries: ZipEntry[] = [];
  let at = 0;
  while (at < dir.byteLength) {
    if (at + CENTRAL_SIZE > dir.byteLength || dir.getUint32(at, true) !== CENTRAL) return notAZip;
    const flags = dir.getUint16(at + 8, true);
    const nameLength = dir.getUint16(at + 28, true);
    const extraLength = dir.getUint16(at + 30, true);
    const end = at + CENTRAL_SIZE + nameLength + extraLength + dir.getUint16(at + 32, true);
    if (end > dir.byteLength) return notAZip;
    const fields = {
      compressed: dir.getUint32(at + 20, true),
      size: dir.getUint32(at + 24, true),
      offset: dir.getUint32(at + 42, true),
    };
    const extra = at + CENTRAL_SIZE + nameLength;
    if (!zip64Fields(dir, extra, extra + extraLength, fields)) return notAZip;
    entries.push({
      name: decodeName(
        new Uint8Array(dir.buffer, dir.byteOffset + at + CENTRAL_SIZE, nameLength),
        flags,
      ),
      flags,
      method: dir.getUint16(at + 10, true),
      compressed: fields.compressed,
      size: fields.size,
      attrs: dir.getUint32(at + 38, true),
      offset: fields.offset + where.shift,
    });
    at = end;
  }
  return { ok: true, entries };
}

/** A small entry's bytes (stored or deflated), or null when it is bigger than `limit` or cannot be read. */
export async function readEntry(
  blob: Blob,
  entry: ZipEntry,
  limit = 1024 ** 2,
): Promise<Uint8Array | null> {
  if (entry.size > limit || entry.compressed > limit) return null;
  const head = await view(blob, entry.offset, entry.offset + LOCAL_SIZE);
  if (head.byteLength < LOCAL_SIZE || head.getUint32(0, true) !== LOCAL) return null;
  const start = entry.offset + LOCAL_SIZE + head.getUint16(26, true) + head.getUint16(28, true);
  const packed = new Uint8Array(await blob.slice(start, start + entry.compressed).arrayBuffer());
  if (packed.byteLength !== entry.compressed) return null;
  if (entry.method === 0) return packed;
  if (entry.method !== 8) return null;
  return inflate(packed, limit);
}

/** Deflate-raw → bytes, stopping (null) past `limit`: a few packed bytes can claim gigabytes. */
async function inflate(packed: Uint8Array, limit: number): Promise<Uint8Array | null> {
  const reader = new Blob([packed as Uint8Array<ArrayBuffer>])
    .stream()
    .pipeThrough(new DecompressionStream('deflate-raw'))
    .getReader();
  const parts: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > limit) {
        await reader.cancel();
        return null;
      }
      parts.push(value);
    }
  } catch {
    return null;
  }
  const out = new Uint8Array(total);
  let at = 0;
  for (const part of parts) {
    out.set(part, at);
    at += part.byteLength;
  }
  return out;
}

const DB = 'db.sqlite';
/** What a world's folder holds that the machine keeps: its database, its files, its storage. */
const KEPT_FILES: readonly string[] = [DB, 'storage.json'];
const KEPT_FOLDERS: readonly string[] = ['assets/', 'collections/'];
/** SQLite's shared-memory index: the machine skips it. */
const SKIPPED: readonly string[] = [`${DB}-shm`];
/** A database copied while the world ran leaves these beside it. */
const OPEN_DB: readonly string[] = [`${DB}-wal`, `${DB}-journal`];
/** Outside the world, a Tower backup may carry the engine's image: never used. */
const ENGINE_FOLDER = 'engine/';

const S_IFMT = 0o170000;
const REGULAR = 0o100000;
const DIRECTORY = 0o040000;

/**
 * A name that would land outside the folder it is unpacked into, or that no
 * honest zip tool writes (reconcile.py `safe_name`): empty, absolute, with a
 * drive (`C:`), a backslash or a NUL, or with an empty, `.` or `..` part.
 */
export function slips(name: string): boolean {
  if (name === '' || name.startsWith('/') || name.includes('\\') || name.includes('\0')) {
    return true;
  }
  if (/^[A-Za-z]:/.test(name)) return true;
  const parts = (name.endsWith('/') ? name.slice(0, -1) : name).split('/');
  return parts.some((part) => part === '' || part === '.' || part === '..');
}

/**
 * A link, a device or anything else that is not what its name says
 * (reconcile.py `plain_entry`): by its Unix type bits, a name ending in `/`
 * must be a folder and any other a file; a zip made where there are no Unix
 * modes (type 0) says nothing against it.
 */
export function notRegular(entry: Pick<ZipEntry, 'attrs' | 'name'>): boolean {
  const type = (entry.attrs >>> 16) & S_IFMT;
  return type !== 0 && type !== (entry.name.endsWith('/') ? DIRECTORY : REGULAR);
}

/**
 * Where the world sits in the zip, first match: `world/` holding db.sqlite
 * (the fleet's own copy and the Alchemists' Tower's backup), exactly one top
 * folder holding it, or db.sqlite at the zip's root (''). Null: no world.
 */
export function worldRoot(entries: readonly Pick<ZipEntry, 'name'>[]): string | null {
  const names = new Set(entries.map((entry) => entry.name));
  if (names.has(`world/${DB}`)) return 'world/';
  const tops = new Set<string>();
  for (const name of names) {
    const slash = name.indexOf('/');
    if (slash > 0 && name.slice(slash + 1) === DB) tops.add(name.slice(0, slash + 1));
  }
  if (tops.size === 1) return [...tops][0] as string;
  return names.has(DB) ? '' : null;
}

/** An entry's path inside the world's folder; null when it is outside, or the folder itself. */
function inside(name: string, root: string): string | null {
  return name.startsWith(root) && name !== root ? name.slice(root.length) : null;
}

const kept = (path: string): boolean =>
  KEPT_FILES.includes(path) ||
  KEPT_FOLDERS.some((folder) => path === folder || path.startsWith(folder));

/**
 * The rules every world's zip keeps, whichever its engine, in the machine's
 * order (reconcile.py `open_zip` then `check_entries`): too many files,
 * then each rule over every entry — encrypted, zip-slip, link,
 * file-too-big, ratio — then the total unpacked. Null when none.
 */
export function checkEntries(
  entries: readonly ZipEntry[],
  caps: ZipCaps = ZIP_CAPS,
): ZipProblem | null {
  if (entries.length > caps.entriesMax) return problem('too-many-files', null, entries.length);
  const encrypted = entries.find((entry) => entry.flags & FLAG_ENCRYPTED);
  if (encrypted) return problem('encrypted', encrypted.name);
  const slip = entries.find((entry) => slips(entry.name));
  if (slip) return problem('zip-slip', slip.name);
  const link = entries.find(notRegular);
  if (link) return problem('link', link.name);
  const big = entries.find((entry) => entry.size > caps.fileMax);
  if (big) return problem('file-too-big', big.name, big.size);
  for (const entry of entries) {
    if (entry.size < caps.ratioFloor) continue;
    const ratio = entry.compressed === 0 ? Infinity : entry.size / entry.compressed;
    if (ratio > caps.ratioMax) return problem('ratio', entry.name, Math.round(ratio));
  }
  const unpacked = entries.reduce((sum, entry) => sum + entry.size, 0);
  if (unpacked > caps.unpackedMax) return problem('unpacked-too-big', null, unpacked);
  return null;
}

/**
 * The first of the machine's rules a Hyperfy world's zip breaks, in the
 * machine's order (reconcile.py `open_zip` then `inspect_zip`): the rules
 * every zip keeps (checkEntries), then where the world is, and inside it
 * db-open and unexpected. Null when none.
 */
export function checkZip(
  entries: readonly ZipEntry[],
  caps: ZipCaps = ZIP_CAPS,
): ZipProblem | null {
  const broken = checkEntries(entries, caps);
  if (broken) return broken;
  const root = worldRoot(entries);
  if (root === null) return problem('not-a-world');
  const paths = entries.flatMap((entry) => {
    const path = inside(entry.name, root);
    return path === null ? [] : [{ name: entry.name, path }];
  });
  const open = paths.find((entry) => OPEN_DB.includes(entry.path));
  if (open) return problem('db-open', open.name);
  const odd = paths.find((entry) => !kept(entry.path) && !SKIPPED.includes(entry.path));
  if (odd) return problem('unexpected', odd.name);
  return null;
}

/** A Numinia Engine world's manifest, and the versions of its zip the engine reads. */
const ENGINE_MANIFEST = 'mundo.json';
export const ENGINE_SCHEMAS = ['numinia-engine/mundo@1', 'numinia-engine/mundo@2'] as const;
export type EngineSchema = (typeof ENGINE_SCHEMAS)[number];

/**
 * Where a Numinia Engine world sits in its zip, as the engine finds it: its
 * one `mundo.json` at the zip's root ('') or in exactly one top folder
 * (`<folder>/`). Null: none, or more than one.
 */
export function engineRoot(entries: readonly Pick<ZipEntry, 'name'>[]): string | null {
  const found = entries
    .map((entry) => entry.name)
    .filter((name) => name === ENGINE_MANIFEST || /^[^/]+\/mundo\.json$/.test(name));
  return found.length === 1 ? (found[0] as string).slice(0, -ENGINE_MANIFEST.length) : null;
}

/** What the room says about a zip that passes the machine's rules. */
export interface ZipReading {
  /** Which engine's world it is: a Hyperfy world (db.sqlite) or a Numinia Engine one (mundo.json). */
  readonly engine: Engine;
  /** For a Numinia Engine world: the version of its zip (`numinia-engine/mundo@1|@2`); null for Hyperfy. */
  readonly schema: EngineSchema | null;
  /** Where the world sits in it: `world/`, `<one folder>/` or '' (the zip's root). */
  readonly root: string;
  /** The files the machine keeps, db.sqlite included (a Numinia Engine world: every file in its folder). */
  readonly files: number;
  /** Everything inside it, unpacked. */
  readonly unpacked: number;
  /** The world's name its `world.json` gives, when the zip carries one at its top. */
  readonly world: string | null;
  /** When that `world.json` (or the engine's `mundo.json`) says the copy was made (ISO 8601). */
  readonly copiedAt: string | null;
  /** An engine image the zip carries beside the world (a Tower backup's `engine/`): never used. */
  readonly engineBytes: number;
}

export type ZipInspection =
  | { readonly ok: true; readonly reading: ZipReading }
  | { readonly ok: false; readonly problem: ZipProblem };

const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/;

/** `world.json` at the zip's top → the world's name and when the copy was made. */
async function readManifest(
  blob: Blob,
  entries: readonly ZipEntry[],
): Promise<Pick<ZipReading, 'world' | 'copiedAt'>> {
  const none = { world: null, copiedAt: null };
  const entry = entries.find((candidate) => candidate.name === 'world.json');
  if (!entry) return none;
  const bytes = await readEntry(blob, entry);
  if (bytes === null) return none;
  let manifest: unknown;
  try {
    manifest = JSON.parse(utf8.decode(bytes));
  } catch {
    return none;
  }
  if (typeof manifest !== 'object' || manifest === null || Array.isArray(manifest)) return none;
  const said = manifest as Readonly<Record<string, unknown>>;
  // The fleet's copy names its world `world`; a Tower backup may say `slug` or `name`.
  const name = [said['world'], said['slug'], said['name']].find(
    (value): value is string => typeof value === 'string' && value.trim() !== '',
  );
  const at = said['copiedAt'];
  return {
    world: name === undefined ? null : name.trim().slice(0, 120),
    copiedAt: typeof at === 'string' && ISO.test(at) ? at : null,
  };
}

/**
 * A Numinia Engine world's `mundo.json` → its zip's version and when it was
 * made; null when it is not one the engine reads (`esquema` @2, or the first
 * version's `schema` @1). The engine's own tools judge the rest, on its machine.
 */
async function readEngineManifest(
  blob: Blob,
  entry: ZipEntry,
): Promise<{ readonly schema: EngineSchema; readonly copiedAt: string | null } | null> {
  // It lists every file of the world: allowed more than world.json's megabyte.
  const bytes = await readEntry(blob, entry, 16 * 1024 ** 2);
  if (bytes === null) return null;
  let manifest: unknown;
  try {
    manifest = JSON.parse(utf8.decode(bytes));
  } catch {
    return null;
  }
  if (typeof manifest !== 'object' || manifest === null || Array.isArray(manifest)) return null;
  const said = manifest as Readonly<Record<string, unknown>>;
  const [first, second] = ENGINE_SCHEMAS;
  const schema = said['esquema'] === second ? second : said['schema'] === first ? first : null;
  if (schema === null || !Array.isArray(said['ficheros'])) return null;
  const at = schema === second ? said['creado'] : said['hecho'];
  return { schema, copiedAt: typeof at === 'string' && ISO.test(at) ? at : null };
}

/**
 * Read a zip the way the machine will judge it: its index, its rules, and,
 * when it passes, what it is — a Hyperfy world (db.sqlite, the machine's
 * own rules) or a Numinia Engine world (mundo.json; the rules every zip
 * keeps here, the engine's own on its machine). Never throws: an unreadable
 * file is not a zip.
 */
export async function inspectZip(blob: Blob, caps: ZipCaps = ZIP_CAPS): Promise<ZipInspection> {
  if (blob.size === 0) return { ok: false, problem: problem('empty') };
  try {
    const index = await readZipIndex(blob);
    if (!index.ok) return index;
    const unpacked = index.entries.reduce((sum, entry) => sum + entry.size, 0);
    if (worldRoot(index.entries) === null) {
      const broken = checkEntries(index.entries, caps);
      if (broken) return { ok: false, problem: broken };
      const root = engineRoot(index.entries);
      if (root === null) return { ok: false, problem: problem('not-a-world') };
      const manifest = index.entries.find(
        (entry) => entry.name === `${root}mundo.json`,
      ) as ZipEntry;
      const said = await readEngineManifest(blob, manifest);
      if (said === null) return { ok: false, problem: problem('not-a-world') };
      const files = index.entries.filter(
        (entry) => entry.name.startsWith(root) && !entry.name.endsWith('/'),
      ).length;
      return {
        ok: true,
        reading: {
          engine: 'numinia-engine',
          schema: said.schema,
          root,
          files,
          unpacked,
          world: null,
          copiedAt: said.copiedAt,
          engineBytes: 0,
        },
      };
    }
    const found = checkZip(index.entries, caps);
    if (found) return { ok: false, problem: found };
    const root = worldRoot(index.entries) as string;
    const files = index.entries.filter((entry) => {
      const path = inside(entry.name, root);
      return path !== null && !path.endsWith('/') && kept(path);
    }).length;
    const engineBytes = index.entries
      .filter((entry) => entry.name.startsWith(ENGINE_FOLDER) && inside(entry.name, root) === null)
      .reduce((sum, entry) => sum + entry.size, 0);
    return {
      ok: true,
      reading: {
        engine: 'numinia-hyperfy2',
        schema: null,
        root,
        files,
        unpacked,
        ...(await readManifest(blob, index.entries)),
        engineBytes,
      },
    };
  } catch {
    return { ok: false, problem: problem('not-a-zip') };
  }
}

/** The zip's own name without `.zip`: what a world is called when its zip says nothing else. */
export function zipStem(fileName: string): string {
  return fileName.replace(/\.zip$/i, '');
}

/** How much of a file is hashed at a time: a slice of 8 MiB, never the whole file. */
export const HASH_CHUNK = 8 * 1024 ** 2;

/**
 * Feed a file to a hash slice by slice (`update`), saying how far it got.
 * The hash itself is the caller's (the room's worker uses SHA-256):
 * `crypto.subtle.digest` cannot stream, and would hold the whole zip.
 */
export async function digestChunks(
  blob: Blob,
  update: (bytes: Uint8Array) => void,
  onProgress: (done: number) => void = () => undefined,
  chunk: number = HASH_CHUNK,
): Promise<void> {
  for (let at = 0; at < blob.size; at += chunk) {
    const end = Math.min(blob.size, at + chunk);
    update(new Uint8Array(await blob.slice(at, end).arrayBuffer()));
    onProgress(end);
  }
}

/** A fingerprint, short enough to read and long enough to compare: `9f86d081…b0f00a08`. */
export function shortHash(sha256: string): string {
  return sha256.length > 20 ? `${sha256.slice(0, 8)}…${sha256.slice(-8)}` : sha256;
}
