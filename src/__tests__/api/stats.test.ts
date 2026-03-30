import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockIsAdmin = vi.fn(() => ({ isAdmin: true }));
vi.mock('@/lib/auth/getSession', () => ({
  getAdminSession: (...args: Parameters<typeof mockIsAdmin>) => mockIsAdmin(...args),
}));

const mockAvatars = [
  { id: '1', format: 'VRM', storage: { r2: 'url', github_raw: 'url' }, nft: { mint_status: 'minted' }, status: 'active', metadata: { file_size_bytes: 1024000 } },
  { id: '2', format: 'GLB', storage: { github_raw: 'url' }, nft: null, status: 'active', metadata: {} },
  { id: '3', format: 'VRM', storage: { r2: 'url' }, nft: { mint_status: 'unminted' }, status: 'deprecated', metadata: { file_size_bytes: 2048000 } },
  { id: '4', format: 'MP3', nft: null, status: 'active', metadata: {} },
];

vi.mock('@/lib/github-storage', () => ({
  getAvatars: vi.fn(() => Promise.resolve([...mockAvatars])),
  getProjects: vi.fn(() => Promise.resolve([{ id: 'p1' }, { id: 'p2' }])),
}));

import { GET } from '@/app/api/admin/stats/route';

beforeEach(() => {
  mockIsAdmin.mockReturnValue({ isAdmin: true });
});

describe('GET /api/admin/stats', () => {
  it('returns 401 for non-admin', async () => {
    mockIsAdmin.mockReturnValue({ isAdmin: false });
    const res = await GET(new NextRequest('http://localhost/api/admin/stats'));
    expect(res.status).toBe(401);
  });

  it('returns stats for admin', async () => {
    const res = await GET(new NextRequest('http://localhost/api/admin/stats'));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.total_assets).toBe(4);
    expect(data.total_projects).toBe(2);
  });

  it('counts by type correctly', async () => {
    const res = await GET(new NextRequest('http://localhost/api/admin/stats'));
    const data = await res.json();

    expect(data.by_type.VRM).toBe(2);
    expect(data.by_type.GLB).toBe(1);
    expect(data.by_type.MP3).toBe(1);
  });

  it('counts storage layers', async () => {
    const res = await GET(new NextRequest('http://localhost/api/admin/stats'));
    const data = await res.json();

    expect(data.by_layer.r2).toBe(2);
    expect(data.by_layer.github).toBeGreaterThanOrEqual(2);
  });

  it('counts NFT status', async () => {
    const res = await GET(new NextRequest('http://localhost/api/admin/stats'));
    const data = await res.json();

    expect(data.nft.minted).toBe(1);
    expect(data.nft.unminted).toBeGreaterThanOrEqual(2);
  });

  it('counts version status', async () => {
    const res = await GET(new NextRequest('http://localhost/api/admin/stats'));
    const data = await res.json();

    expect(data.versions.active).toBe(3);
    expect(data.versions.deprecated).toBe(1);
  });

  it('calculates total size', async () => {
    const res = await GET(new NextRequest('http://localhost/api/admin/stats'));
    const data = await res.json();

    expect(data.total_size_bytes).toBe(3072000);
    expect(data.total_size_mb).toBeGreaterThan(0);
  });

  it('includes timestamp', async () => {
    const res = await GET(new NextRequest('http://localhost/api/admin/stats'));
    const data = await res.json();

    expect(data.generated_at).toBeDefined();
    expect(new Date(data.generated_at).getTime()).not.toBeNaN();
  });
});
