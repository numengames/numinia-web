/**
 * Local thumbnail resolution (MISSION-017): baked ids resolve to the local
 * 480px WebP; everything else falls back to the remote original — including
 * the honest null when an asset has no thumbnail at all.
 */

import { describe, expect, it } from 'vitest';
import baked from '../../generated/local-thumbs.json';
import { thumbSrc } from '../thumbs';

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
