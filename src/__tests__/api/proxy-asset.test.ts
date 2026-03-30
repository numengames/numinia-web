import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock global fetch for proxy target
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

import { GET } from '@/app/api/proxy-asset/route';

beforeEach(() => {
  mockFetch.mockReset();
});

describe('GET /api/proxy-asset', () => {
  it('returns 400 without url param', async () => {
    const req = new NextRequest('http://localhost/api/proxy-asset');
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it('returns 403 for disallowed domain', async () => {
    const req = new NextRequest('http://localhost/api/proxy-asset?url=https://evil.com/malware.exe');
    const res = await GET(req);
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toContain('not allowed');
  });

  it('allows arweave.net domain', async () => {
    mockFetch.mockResolvedValue(new Response(new ArrayBuffer(8), {
      status: 200,
      headers: { 'Content-Type': 'model/gltf-binary' },
    }));

    const req = new NextRequest('http://localhost/api/proxy-asset?url=https://arweave.net/abc123');
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledWith(
      'https://arweave.net/abc123',
      expect.objectContaining({ headers: expect.any(Object) }),
    );
  });

  it('allows assets.numinia.store domain', async () => {
    mockFetch.mockResolvedValue(new Response(new ArrayBuffer(4), {
      status: 200,
      headers: { 'Content-Type': 'application/octet-stream' },
    }));

    const req = new NextRequest('http://localhost/api/proxy-asset?url=https://assets.numinia.store/content/models/test.glb');
    const res = await GET(req);

    expect(res.status).toBe(200);
  });

  it('sets cache and CORS headers', async () => {
    mockFetch.mockResolvedValue(new Response(new ArrayBuffer(4), {
      status: 200,
      headers: { 'Content-Type': 'model/gltf-binary' },
    }));

    const req = new NextRequest('http://localhost/api/proxy-asset?url=https://arweave.net/test');
    const res = await GET(req);

    expect(res.headers.get('Cache-Control')).toContain('max-age=86400');
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
  });

  it('forwards upstream errors', async () => {
    mockFetch.mockResolvedValue(new Response(null, { status: 404, statusText: 'Not Found' }));

    const req = new NextRequest('http://localhost/api/proxy-asset?url=https://arweave.net/missing');
    const res = await GET(req);

    expect(res.status).toBe(404);
  });
});
