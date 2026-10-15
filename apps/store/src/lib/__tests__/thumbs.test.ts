/**
 * Local thumbnail resolution (MISSION-017): baked ids resolve to the local
 * 480px WebP; everything else falls back to the remote original — including
 * the honest null when an asset has no thumbnail at all. A baked id also has
 * its 1x cut (v0.89.0), offered through the card's srcset; a baked picture
 * also its 960px preview (v0.91.0).
 */

import { existsSync, statSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import baked from '../../generated/local-thumbs.json';
import previews from '../../generated/local-previews.json';
import { previewSrc, thumbSrc, thumbSrcSet } from '../thumbs';

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

describe('previewSrc', () => {
  it('serves the baked 960px preview of every picture in the manifest, on disk and baked as a card', () => {
    expect((previews as string[]).length).toBeGreaterThan(0);
    for (const id of previews as string[]) {
      expect(previewSrc(id)).toBe(`/thumbs/preview/${id}.webp`);
      expect(existsSync(publicFile(`/thumbs/preview/${id}.webp`))).toBe(true);
      expect(baked as string[]).toContain(id);
    }
  });

  it('keeps the preview well under the original: a picture of 2MB must not ride in a 300px pane', () => {
    for (const id of previews as string[]) {
      const bytes = statSync(publicFile(`/thumbs/preview/${id}.webp`)).size;
      expect(bytes).toBeLessThan(300 * 1024);
    }
  });

  it('has nothing to offer for an unbaked asset or a model', () => {
    expect(previewSrc('never-baked-id')).toBeNull();
  });
});
