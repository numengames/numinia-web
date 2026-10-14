/**
 * A zip, written in the visitor's browser: the Bazaar's download queue
 * leaves as ONE file (v0.83.0). Entries are STORED, not deflated — GLB,
 * VRM, PNG, JPG, MP3 and MP4 are compressed already, and storing keeps the
 * writer tiny and the CPU idle. The result is a list of parts for a Blob,
 * so no part is ever copied into one big buffer.
 *
 * Plain zip (APPNOTE 6.3.10), no ZIP64: past 65 535 entries or 4 GiB the
 * writer refuses instead of writing a file no tool could open. Names are
 * UTF-8 (general purpose bit 11). Read back by zip-read.ts in its tests.
 *
 * Pure: no dependency and no zod — this runs in the Bazaar's island.
 */

export interface ZipInput {
  /** The path inside the zip, '/' separated. */
  readonly name: string;
  readonly data: Uint8Array<ArrayBuffer>;
}

const LOCAL = 0x04034b50;
const CENTRAL = 0x02014b50;
const EOCD = 0x06054b50;
const LOCAL_SIZE = 30;
const CENTRAL_SIZE = 46;
const EOCD_SIZE = 22;
const FLAG_UTF8 = 0x800;
/** 2.0: the version an unzip needs for a stored entry with a UTF-8 name. */
const VERSION = 20;
const MAX16 = 0xffff;
const MAX32 = 0xffffffff;

let table: Uint32Array | null = null;

/** CRC-32 (IEEE 802.3, the zip one) of some bytes. */
export function crc32(bytes: Uint8Array): number {
  if (table === null) {
    table = new Uint32Array(256);
    for (let n = 0; n < 256; n += 1) {
      let c = n;
      for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c >>> 0;
    }
  }
  let crc = 0xffffffff;
  for (const byte of bytes) crc = (table[(crc ^ byte) & 0xff] as number) ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

/** An MS-DOS date and time (local clock, 2-second steps, 1980–2107), as zip stores them. */
export function dosDateTime(when: Date): { readonly date: number; readonly time: number } {
  const year = Math.min(Math.max(when.getFullYear(), 1980), 2107);
  return {
    date: ((year - 1980) << 9) | ((when.getMonth() + 1) << 5) | when.getDate(),
    time: (when.getHours() << 11) | (when.getMinutes() << 5) | Math.floor(when.getSeconds() / 2),
  };
}

/**
 * The zip's bytes as parts for `new Blob(parts, { type: 'application/zip' })`.
 * Throws, before reading a byte, when the entries would need ZIP64.
 */
export function zipStore(
  entries: readonly ZipInput[],
  when: Date = new Date(),
): Uint8Array<ArrayBuffer>[] {
  if (entries.length > MAX16) throw new Error(`A zip holds at most ${MAX16} entries`);
  const encoder = new TextEncoder();
  const prepared = entries.map((entry) => ({ entry, name: encoder.encode(entry.name) }));
  let total = EOCD_SIZE;
  for (const { entry, name } of prepared) {
    if (name.byteLength > MAX16) throw new Error(`Name too long: ${entry.name}`);
    total += LOCAL_SIZE + CENTRAL_SIZE + 2 * name.byteLength + entry.data.byteLength;
  }
  if (total > MAX32) throw new Error('The zip would pass 4 GiB');

  const { date, time } = dosDateTime(when);
  const parts: Uint8Array<ArrayBuffer>[] = [];
  const central: Uint8Array<ArrayBuffer>[] = [];
  let offset = 0;
  for (const { entry, name } of prepared) {
    const size = entry.data.byteLength;
    const crc = crc32(entry.data);

    const local = new Uint8Array(LOCAL_SIZE + name.byteLength);
    const head = new DataView(local.buffer);
    head.setUint32(0, LOCAL, true);
    head.setUint16(4, VERSION, true);
    head.setUint16(6, FLAG_UTF8, true);
    // 8: method 0, stored.
    head.setUint16(10, time, true);
    head.setUint16(12, date, true);
    head.setUint32(14, crc, true);
    head.setUint32(18, size, true);
    head.setUint32(22, size, true);
    head.setUint16(26, name.byteLength, true);
    // 28: no extra field.
    local.set(name, LOCAL_SIZE);

    const record = new Uint8Array(CENTRAL_SIZE + name.byteLength);
    const dir = new DataView(record.buffer);
    dir.setUint32(0, CENTRAL, true);
    dir.setUint16(4, VERSION, true); // made by: MS-DOS attributes, 2.0
    dir.setUint16(6, VERSION, true);
    dir.setUint16(8, FLAG_UTF8, true);
    // 10: method 0, stored.
    dir.setUint16(12, time, true);
    dir.setUint16(14, date, true);
    dir.setUint32(16, crc, true);
    dir.setUint32(20, size, true);
    dir.setUint32(24, size, true);
    dir.setUint16(28, name.byteLength, true);
    // 30–41: extra, comment, disk, internal and external attributes, all zero.
    dir.setUint32(42, offset, true);
    record.set(name, CENTRAL_SIZE);

    parts.push(local, entry.data);
    central.push(record);
    offset += local.byteLength + size;
  }

  const end = new Uint8Array(EOCD_SIZE);
  const tail = new DataView(end.buffer);
  tail.setUint32(0, EOCD, true);
  tail.setUint16(8, entries.length, true);
  tail.setUint16(10, entries.length, true);
  tail.setUint32(
    12,
    central.reduce((sum, record) => sum + record.byteLength, 0),
    true,
  );
  tail.setUint32(16, offset, true);
  return [...parts, ...central, end];
}
