import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock requireRank
const mockRequireRank = vi.fn();
vi.mock('@/lib/session', () => ({ verifyCsrf: () => true, generateCsrfToken: () => 'test-csrf' }));
vi.mock('@/lib/auth/getSession', () => ({
  requireRank: (...args: unknown[]) => mockRequireRank(...args),
}));

// Mock github-storage
const mockAvatars = [
  { id: 'test-1', name: 'Test Avatar', description: 'desc', isPublic: true, creator: 'me', license: 'CC0' },
  { id: 'test-2', name: 'Hidden', description: '', isPublic: false, creator: '', license: '' },
];
const mockUpdate = vi.fn(() => Promise.resolve(true));

vi.mock('@/lib/github-storage', () => ({
  getAvatars: vi.fn(() => Promise.resolve([...mockAvatars])),
  updateAvatarInSource: (...args: Parameters<typeof mockUpdate>) => mockUpdate(...args),
}));

import { PATCH } from '@/app/api/assets/[id]/visibility/route';

function makeRequest(id: string, body?: Record<string, unknown>) {
  const req = new NextRequest(`http://localhost/api/assets/${id}/visibility`, {
    method: 'PATCH',
    ...(body ? { body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } } : {}),
  });
  const params = Promise.resolve({ id });
  return PATCH(req, { params });
}

beforeEach(() => {
  mockRequireRank.mockResolvedValue({
    authenticated: true,
    role: 'admin',
    rank: 'archon',
    permissions: {},
    banned: false,
  });
  mockUpdate.mockResolvedValue(true);
});

describe('PATCH /api/assets/[id]/visibility', () => {
  it('returns 401 for non-admin', async () => {
    mockRequireRank.mockImplementation(async () => {
      throw Response.json({ error: 'Unauthorized' }, { status: 401 });
    });
    const res = await makeRequest('test-1');
    expect(res.status).toBe(401);
  });

  it('returns 404 for unknown ID', async () => {
    const res = await makeRequest('nonexistent', { name: 'x' });
    expect(res.status).toBe(404);
  });

  it('updates name', async () => {
    const res = await makeRequest('test-1', { name: 'New Name' });
    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith('test-1', { name: 'New Name' });
  });

  it('updates description', async () => {
    const res = await makeRequest('test-1', { description: 'Updated desc' });
    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith('test-1', { description: 'Updated desc' });
  });

  it('updates creator and license', async () => {
    await makeRequest('test-1', { creator: 'Alice', license: 'CC-BY' });
    expect(mockUpdate).toHaveBeenCalledWith('test-1', { creator: 'Alice', license: 'CC-BY' });
  });

  it('updates nft object', async () => {
    const nft = { chain: 'base', contract: '0x123', token_id: '1', type: 'ERC-1155' };
    await makeRequest('test-1', { nft });
    expect(mockUpdate).toHaveBeenCalledWith('test-1', { nft });
  });

  it('toggles visibility when no fields sent', async () => {
    const res = await makeRequest('test-1');
    expect(res.status).toBe(200);
    // test-1 is public, so toggle should set is_public: false
    expect(mockUpdate).toHaveBeenCalledWith('test-1', { is_public: false });
  });

  it('trims string values', async () => {
    await makeRequest('test-1', { name: '  Trimmed  ', description: '  Desc  ' });
    expect(mockUpdate).toHaveBeenCalledWith('test-1', { name: 'Trimmed', description: 'Desc' });
  });

  it('ignores empty name', async () => {
    await makeRequest('test-1', { name: '   ', description: 'only desc' });
    // Name should not be in updates since it's whitespace-only
    expect(mockUpdate).toHaveBeenCalledWith('test-1', { description: 'only desc' });
  });
});
