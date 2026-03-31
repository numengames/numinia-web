import { describe, it, expect } from 'vitest';
import { validateMimeType } from '@/lib/mime-validation';

describe('MIME validation', () => {
  it('accepts valid GLB (glTF magic bytes)', () => {
    const buf = new Uint8Array([0x67, 0x6C, 0x54, 0x46, 0x02, 0x00, 0x00, 0x00]).buffer;
    expect(validateMimeType(buf, 'glb')).toBe(true);
  });

  it('rejects invalid GLB', () => {
    const buf = new Uint8Array([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]).buffer;
    expect(validateMimeType(buf, 'glb')).toBe(false);
  });

  it('accepts valid PNG', () => {
    const buf = new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]).buffer;
    expect(validateMimeType(buf, 'png')).toBe(true);
  });

  it('rejects text file as PNG', () => {
    const buf = new Uint8Array(new TextEncoder().encode('Hello World!')).buffer as ArrayBuffer;
    expect(validateMimeType(buf, 'png')).toBe(false);
  });

  it('accepts valid JPEG', () => {
    const buf = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10]).buffer;
    expect(validateMimeType(buf, 'jpg')).toBe(true);
  });

  it('accepts valid MP3 with ID3', () => {
    const buf = new Uint8Array([0x49, 0x44, 0x33, 0x04, 0x00, 0x00]).buffer;
    expect(validateMimeType(buf, 'mp3')).toBe(true);
  });

  it('accepts valid OGG', () => {
    const buf = new Uint8Array([0x4F, 0x67, 0x67, 0x53, 0x00, 0x02]).buffer;
    expect(validateMimeType(buf, 'ogg')).toBe(true);
  });

  it('allows unknown formats (passthrough)', () => {
    const buf = new Uint8Array([0x00, 0x01, 0x02, 0x03]).buffer;
    expect(validateMimeType(buf, 'xyz')).toBe(true);
  });

  it('allows HYP (no magic bytes check)', () => {
    const buf = new Uint8Array([0x00, 0x00, 0x00, 0x00]).buffer;
    expect(validateMimeType(buf, 'hyp')).toBe(true);
  });

  it('rejects too-small buffer', () => {
    const buf = new Uint8Array([0x89, 0x50]).buffer;
    expect(validateMimeType(buf, 'png')).toBe(false);
  });
});
