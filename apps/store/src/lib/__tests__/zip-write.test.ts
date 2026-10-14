/**
 * Unit tests for the zip writer: its CRC against the published check value
 * and Node's own zlib, its dates, and every zip it writes read back by the
 * site's own reader (zip-read.ts) — names, sizes, bytes and method.
 */

import { crc32 as nodeCrc32 } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { readEntry, readZipIndex } from '../zip-read';
import { crc32, dosDateTime, zipStore, type ZipInput } from '../zip-write';

const bytes = (text: string): Uint8Array<ArrayBuffer> => new TextEncoder().encode(text);
const blobOf = (parts: Uint8Array<ArrayBuffer>[]): Blob =>
  new Blob(parts, { type: 'application/zip' });

describe('crc32', () => {
  it('matches the check value and zlib', () => {
    expect(crc32(bytes('123456789'))).toBe(0xcbf43926);
    expect(crc32(new Uint8Array())).toBe(0);
    const random = Uint8Array.from({ length: 4096 }, (_, i) => (i * 7919 + 13) % 256);
    expect(crc32(random)).toBe(nodeCrc32(random));
  });
});

describe('dosDateTime', () => {
  it('packs the local date and time in two-second steps', () => {
    const { date, time } = dosDateTime(new Date(2026, 9, 14, 13, 45, 31));
    expect(date).toBe(((2026 - 1980) << 9) | (10 << 5) | 14);
    expect(time).toBe((13 << 11) | (45 << 5) | 15);
  });

  it('clamps years to the span the format can hold', () => {
    expect(dosDateTime(new Date(1970, 0, 1)).date >> 9).toBe(0);
    expect(dosDateTime(new Date(2200, 0, 1)).date >> 9).toBe(127);
  });
});

describe('zipStore', () => {
  it('writes a zip its reader takes back whole: names, sizes, method and bytes', async () => {
    const entries: ZipInput[] = [
      { name: 'Avatar Arla.vrm', data: bytes('glTF-ish avatar bytes') },
      { name: 'Ñandú — sonido.mp3', data: Uint8Array.from({ length: 3000 }, (_, i) => i % 251) },
      { name: 'empty.txt', data: new Uint8Array() },
    ];
    const blob = blobOf(zipStore(entries, new Date(2026, 9, 14, 12, 0, 0)));
    const head = new Uint8Array(await blob.slice(0, 2).arrayBuffer());
    expect(String.fromCharCode(...head)).toBe('PK');
    const index = await readZipIndex(blob);
    expect(index.ok).toBe(true);
    if (!index.ok) return;
    expect(index.entries.map((e) => [e.name, e.size, e.compressed, e.method])).toEqual(
      entries.map((e) => [e.name, e.data.byteLength, e.data.byteLength, 0]),
    );
    for (const [i, entry] of index.entries.entries()) {
      expect(await readEntry(blob, entry)).toEqual(entries[i]!.data);
    }
  });

  it('writes an empty zip as its end record alone', async () => {
    const parts = zipStore([]);
    expect(parts).toHaveLength(1);
    expect(parts[0]!.byteLength).toBe(22);
    const index = await readZipIndex(blobOf(parts));
    expect(index).toEqual({ ok: true, entries: [] });
  });

  it('refuses what only ZIP64 could hold, before reading a byte', () => {
    const fake = (byteLength: number) => ({ byteLength }) as unknown as Uint8Array<ArrayBuffer>;
    expect(() => zipStore([{ name: 'huge.glb', data: fake(0xffffffff) }])).toThrow(/4 GiB/);
    expect(() =>
      zipStore([
        { name: 'a.glb', data: fake(0x80000000) },
        { name: 'b.glb', data: fake(0x80000000) },
      ]),
    ).toThrow(/4 GiB/);
    expect(() => zipStore([{ name: 'x'.repeat(0x10000), data: new Uint8Array() }])).toThrow(
      /Name too long/,
    );
    const many = Array.from({ length: 0x10000 }, () => ({ name: 'a', data: new Uint8Array() }));
    expect(() => zipStore(many)).toThrow(/at most 65535 entries/);
  });
});
