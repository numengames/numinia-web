/**
 * Local thumbnail resolution (MISSION-017): baked ids resolve to the local
 * 480px WebP; everything else falls back to the remote original — including
 * the honest null when an asset has no thumbnail at all. A baked id also has
 * its 1x cut (v0.89.0), offered through the card's srcset.
 */

import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import baked from '../../generated/local-thumbs.json';
import { thumbSrc, thumbSrcSet } from '../thumbs';

const publicFile = (path: string): URL => new URL(`../../../public${path}`, import.meta.url);

describe('thumbSrc', () => {
  it('serves the baked WebP for every manifest id', () => {
    expect((baked as string[]).length).toBeGreaterThan(0);
    for (const id of baked as string[]) {
      expect(thumbSrc(id, 'https://remote/x.png')).toBe(`/thumbs/${id}.webp`);
    }
  });

  it('falls back to the remote original for unbaked assets', () => {
    expect(thumbSrc('never-baked-id', 'https://remote/x.png')).toBe('https://remote/x.png');
  });

  it('absence stays absent: no thumbnail anywhere yields null', () => {
    expect(thumbSrc('never-baked-id', null)).toBeNull();
  });
});

describe('thumbSrcSet', () => {
  it('offers the 1x cut and the 480px WebP for every manifest id, both on disk', () => {
    for (const id of baked as string[]) {
      expect(thumbSrcSet(id)).toBe(`/thumbs/1x/${id}.webp 1x, /thumbs/${id}.webp 2x`);
      expect(existsSync(publicFile(`/thumbs/${id}.webp`))).toBe(true);
      expect(existsSync(publicFile(`/thumbs/1x/${id}.webp`))).toBe(true);
    }
  });

  it('has nothing to offer for an unbaked asset', () => {
    expect(thumbSrcSet('never-baked-id')).toBeNull();
  });
});
