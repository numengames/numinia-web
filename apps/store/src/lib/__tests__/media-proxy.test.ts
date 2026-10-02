/**
 * The media proxy rules (3D fix): only the storage chain's hosts pass;
 * everything else — other hosts, http, garbage, lookalike domains — is
 * refused. The proxy must never become an open relay.
 */

import { describe, expect, it } from 'vitest';
import {
  isProxyableContentType,
  isProxyableMediaUrl,
  proxiedMediaHeaders,
  viewerProxyUrl,
} from '../media-proxy';

describe('isProxyableMediaUrl', () => {
  it('accepts every storage-chain host', () => {
    for (const url of [
      'https://pub-abc123.r2.dev/content/models/x.glb',
      'https://bucket.r2.cloudflarestorage.com/x.vrm',
      'https://arweave.net/tx123',
      'https://raw.githubusercontent.com/PabloFMM/numinia-digital-goods-data/main/content/models/x.glb',
      'https://raw.githubusercontent.com/numengames/numinia-assets/56b2830/content/avatars/x.vrm',
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

describe('isProxyableMediaUrl on raw.githubusercontent.com', () => {
  /* Anyone can push a file to their own GitHub repo, so the host alone is not
     the storage chain: only the data repository and the studio's own repos. */
  it('passes the data repository and the numengames repos, owner in any case', () => {
    for (const url of [
      'https://raw.githubusercontent.com/PabloFMM/numinia-digital-goods-data/main/data/avatars/numinia-avatars.json',
      'https://raw.githubusercontent.com/pablofmm/numinia-digital-goods-data/main/content/models/x.glb',
      'https://raw.githubusercontent.com/numengames/numinia-assets/56b2830/content/avatars/x.vrm',
      'https://raw.githubusercontent.com/NumenGames/numinia-nwos/main/lore/x.png',
    ]) {
      expect(isProxyableMediaUrl(url), url).toBe(true);
    }
  });

  it('refuses any other repository, owner or escape from the allowed prefix', () => {
    for (const url of [
      'https://raw.githubusercontent.com/evil/payload/main/x.glb',
      'https://raw.githubusercontent.com/PabloFMM/other-repo/main/x.glb',
      'https://raw.githubusercontent.com/PabloFMM/numinia-digital-goods-data-fork/main/x.glb',
      'https://raw.githubusercontent.com/numengamesevil/repo/main/x.glb',
      'https://raw.githubusercontent.com/numengames/../evil/repo/main/x.glb',
      'https://raw.githubusercontent.com/numengames/%2e%2e/evil/repo/main/x.glb',
      'https://raw.githubusercontent.com/numengames',
      'https://raw.githubusercontent.com/',
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

/* Stored XSS guard: the proxy re-serves bytes under numinia.com, and the
   site's CSP allows inline script. Anyone can host a file on an allowlisted
   host (a fresh r2.dev bucket, any GitHub repo), so the TYPE decides what
   may be re-served — only what the viewer actually loads. */
describe('isProxyableContentType', () => {
  it('passes what the viewer loads: chain binaries, textures, media', () => {
    for (const type of [
      'application/octet-stream',
      'model/gltf-binary',
      'model/gltf+json',
      'image/png',
      'image/jpeg',
      'image/webp',
      'image/gif',
      'image/avif',
      'video/mp4',
      'audio/mpeg',
      'IMAGE/PNG',
      'image/png; charset=binary',
      ' application/octet-stream ',
    ]) {
      expect(isProxyableContentType(type), type).toBe(true);
    }
  });

  it('a missing type passes: it is re-served as an inert octet-stream', () => {
    expect(isProxyableContentType(null)).toBe(true);
  });

  it('refuses anything a browser could run or render as a document', () => {
    for (const type of [
      'text/html',
      'text/html; charset=utf-8',
      'TEXT/HTML',
      'text/plain',
      'text/javascript',
      'application/javascript',
      'application/json',
      'application/xhtml+xml',
      'application/xml',
      'text/xml',
      'image/svg+xml',
      'image/svg+xml; charset=utf-8',
      'application/pdf',
      'multipart/x-mixed-replace',
      '',
      'video',
      'image/',
    ]) {
      expect(isProxyableContentType(type), type).toBe(false);
    }
  });
});

describe('proxiedMediaHeaders', () => {
  it('locks every proxied response into an inert sandbox', () => {
    const headers = proxiedMediaHeaders('model/gltf-binary');
    expect(headers['content-type']).toBe('model/gltf-binary');
    expect(headers['content-security-policy']).toBe("default-src 'none'; sandbox");
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['cache-control']).toBe('public, max-age=86400, stale-while-revalidate=604800');
  });

  it('an absent upstream type is re-served as octet-stream, never guessed', () => {
    expect(proxiedMediaHeaders(null)['content-type']).toBe('application/octet-stream');
  });
});
