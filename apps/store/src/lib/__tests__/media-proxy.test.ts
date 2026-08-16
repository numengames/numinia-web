/**
 * The media proxy rules (3D fix): only the storage chain's hosts pass;
 * everything else — other hosts, http, garbage, lookalike domains — is
 * refused. The proxy must never become an open relay.
 */

import { describe, expect, it } from 'vitest';
import { isProxyableMediaUrl, viewerProxyUrl } from '../media-proxy';

describe('isProxyableMediaUrl', () => {
  it('accepts every storage-chain host', () => {
    for (const url of [
      'https://pub-abc123.r2.dev/content/models/x.glb',
      'https://bucket.r2.cloudflarestorage.com/x.vrm',
      'https://arweave.net/tx123',
      'https://raw.githubusercontent.com/o/r/main/x.glb',
      'https://dweb.link/ipfs/Qm123',
      'https://ipfs.io/ipfs/Qm123',
      'https://gateway.dweb.link/ipfs/Qm123',
    ]) {
      expect(isProxyableMediaUrl(url), url).toBe(true);
    }
  });

  it('refuses foreign hosts, lookalikes, http and garbage', () => {
    for (const url of [
      'https://evil.com/x.glb',
      'https://r2.dev.evil.com/x.glb',
      'https://notraw.githubusercontent.com.evil.io/x',
      'http://pub-abc.r2.dev/x.glb',
      'ftp://arweave.net/x',
      'not a url',
      '//pub-abc.r2.dev/x.glb',
      '',
    ]) {
      expect(isProxyableMediaUrl(url), url).toBe(false);
    }
  });
});

describe('viewerProxyUrl', () => {
  it('wraps a direct URL into the same-origin route', () => {
    expect(viewerProxyUrl('https://pub-a.r2.dev/m/x.glb')).toBe(
      '/api/media?src=https%3A%2F%2Fpub-a.r2.dev%2Fm%2Fx.glb',
    );
  });
  it('absence stays absent', () => {
    expect(viewerProxyUrl(null)).toBeNull();
  });
});
