import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock auth session
const mockRequireRank = vi.fn();
const mockGetAdminSession = vi.fn(() => ({ isAdmin: false }));
vi.mock('@/lib/session', () => ({ verifyCsrf: () => true, signSession: (p: unknown) => JSON.stringify(p), verifySession: (v: string) => { try { return JSON.parse(v); } catch { return null; } } }));
vi.mock('@/lib/auth/getSession', () => ({
  requireRank: (...args: unknown[]) => mockRequireRank(...args),
  getAdminSession: () => mockGetAdminSession(),
}));

// Mock data
const mockAvatars = [
  { id: 'a1', name: 'Public Avatar', description: 'desc', projectId: 'p1', isPublic: true, isDraft: false, format: 'VRM', createdAt: '2026-03-30T10:00:00Z', updatedAt: '2026-03-30T10:00:00Z', thumbnailUrl: null, modelFileUrl: '/test.vrm', polygonCount: 1000, materialCount: 2, metadata: {} },
  { id: 'a2', name: 'Hidden Avatar', description: 'secret', projectId: 'p1', isPublic: false, isDraft: false, format: 'GLB', createdAt: '2026-03-30T09:00:00Z', updatedAt: '2026-03-30T09:00:00Z', thumbnailUrl: null, modelFileUrl: '/test.glb', polygonCount: 500, materialCount: 1, metadata: {} },
  { id: 'a3', name: 'Audio File', description: 'music', projectId: 'p2', isPublic: true, isDraft: false, format: 'MP3', createdAt: '2026-03-30T08:00:00Z', updatedAt: '2026-03-30T08:00:00Z', thumbnailUrl: null, modelFileUrl: '/test.mp3', polygonCount: 0, materialCount: 0, metadata: {} },
];

const mockProjects = [
  { id: 'p1', name: 'Avatars', description: '', isPublic: true, license: 'CC0', createdAt: '2026-01-01', updatedAt: '2026-01-01' },
  { id: 'p2', name: 'Audio', description: '', isPublic: true, license: 'CC0', createdAt: '2026-01-01', updatedAt: '2026-01-01' },
];

vi.mock('@/lib/github-storage', () => ({
  getAvatars: vi.fn(() => Promise.resolve([...mockAvatars])),
  getProjects: vi.fn(() => Promise.resolve([...mockProjects])),
  saveAvatars: vi.fn(() => Promise.resolve()),
  deleteAvatarFromSource: vi.fn(() => Promise.resolve(true)),
  getAvatarTags: vi.fn(() => Promise.resolve([])),
  saveAvatarTags: vi.fn(() => Promise.resolve()),
  getDownloads: vi.fn(() => Promise.resolve([])),
  saveDownloads: vi.fn(() => Promise.resolve()),
}));

vi.mock('@/lib/asset-id', () => ({
  generateAssetId: () => 'ndg-test-id',
}));

vi.mock('@/lib/r2-client', () => ({
  isR2Configured: () => false,
  getR2Client: () => ({}),
  getR2BucketName: () => 'test',
}));

import { GET, POST } from '@/app/api/assets/route';
import { DELETE } from '@/app/api/assets/[id]/route';

beforeEach(() => {
  // GET handler uses getAdminSession — default to non-admin
  mockGetAdminSession.mockReturnValue({ isAdmin: false });
  // POST/DELETE handlers use requireRank — default to rejected (non-admin)
  mockRequireRank.mockImplementation(async () => {
    throw Response.json({ error: 'Unauthorized' }, { status: 401 });
  });
});

describe('GET /api/assets', () => {
  it('returns public avatars for non-admin', async () => {
    const req = new NextRequest('http://localhost/api/assets');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    // Non-admin sees only public: a1 and a3
    expect(data.avatars).toHaveLength(2);
    expect(data.avatars.every((a: { isPublic: boolean }) => a.isPublic)).toBe(true);
  });

  it('returns all avatars for admin', async () => {
    mockGetAdminSession.mockReturnValue({ isAdmin: true });
    const req = new NextRequest('http://localhost/api/assets');
    const res = await GET(req);
    const data = await res.json();

    expect(data.avatars).toHaveLength(3);
  });

  it('filters by search query', async () => {
    mockGetAdminSession.mockReturnValue({ isAdmin: true });
    const req = new NextRequest('http://localhost/api/assets?search=audio');
    const res = await GET(req);
    const data = await res.json();

    expect(data.avatars).toHaveLength(1);
    expect(data.avatars[0].name).toBe('Audio File');
  });

  it('returns projects in response', async () => {
    const req = new NextRequest('http://localhost/api/assets');
    const res = await GET(req);
    const data = await res.json();

    expect(data.projects).toBeDefined();
    expect(data.projects.length).toBeGreaterThan(0);
  });

  it('sorts by newest first', async () => {
    mockGetAdminSession.mockReturnValue({ isAdmin: true });
    const req = new NextRequest('http://localhost/api/assets');
    const res = await GET(req);
    const data = await res.json();

    const dates = data.avatars.map((a: { createdAt: string }) => new Date(a.createdAt).getTime());
    for (let i = 1; i < dates.length; i++) {
      expect(dates[i - 1]).toBeGreaterThanOrEqual(dates[i]);
    }
  });

  it('filters by assetName param', async () => {
    const req = new NextRequest('http://localhost/api/assets?assetName=Public');
    const res = await GET(req);
    const data = await res.json();

    expect(data.avatars).toHaveLength(1);
    expect(data.avatars[0].name).toBe('Public Avatar');
  });
});

describe('POST /api/assets', () => {
  it('returns 401 for non-admin', async () => {
    const req = new NextRequest('http://localhost/api/assets', {
      method: 'POST',
      body: JSON.stringify({ name: 'Test', projectId: 'p1' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('returns 400 without required fields', async () => {
    mockRequireRank.mockResolvedValue({
      authenticated: true, role: 'admin', rank: 'archon', permissions: {}, banned: false,
    });
    const req = new NextRequest('http://localhost/api/assets', {
      method: 'POST',
      body: JSON.stringify({ name: 'Test' }), // missing projectId
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('creates asset for admin with valid data', async () => {
    mockRequireRank.mockResolvedValue({
      authenticated: true, role: 'admin', rank: 'archon', permissions: {}, banned: false,
    });
    const req = new NextRequest('http://localhost/api/assets', {
      method: 'POST',
      body: JSON.stringify({ name: 'New Asset', projectId: 'p1', format: 'GLB' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.id).toBe('ndg-test-id');
    expect(data.name).toBe('New Asset');
    expect(data.format).toBe('GLB');
  });
});

describe('DELETE /api/assets/[id]', () => {
  it('returns 401 for non-admin', async () => {
    const req = new NextRequest('http://localhost/api/assets/a1', { method: 'DELETE' });
    const res = await DELETE(req, { params: Promise.resolve({ id: 'a1' }) });
    expect(res.status).toBe(401);
  });

  it('returns 404 for unknown ID', async () => {
    mockRequireRank.mockResolvedValue({
      authenticated: true, role: 'admin', rank: 'archon', permissions: {}, banned: false,
    });
    const req = new NextRequest('http://localhost/api/assets/nonexistent', { method: 'DELETE' });
    const res = await DELETE(req, { params: Promise.resolve({ id: 'nonexistent' }) });
    expect(res.status).toBe(404);
  });

  it('deletes asset for admin', async () => {
    mockRequireRank.mockResolvedValue({
      authenticated: true, role: 'admin', rank: 'archon', permissions: {}, banned: false,
    });
    const req = new NextRequest('http://localhost/api/assets/a1', { method: 'DELETE' });
    const res = await DELETE(req, { params: Promise.resolve({ id: 'a1' }) });
    expect(res.status).toBe(204);
  });
});
