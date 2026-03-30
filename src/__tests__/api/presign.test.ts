import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockIsAdmin = vi.fn(() => ({ isAdmin: true }));
vi.mock('@/lib/auth/getSession', () => ({
  getAdminSession: (...args: Parameters<typeof mockIsAdmin>) => mockIsAdmin(...args),
}));

const mockR2Configured = vi.fn(() => true);
vi.mock('@/lib/r2-client', () => ({
  isR2Configured: () => mockR2Configured(),
  getR2Client: () => ({}),
  getR2BucketName: () => 'test-bucket',
}));

vi.mock('@/lib/asset-id', () => ({
  generateAssetId: () => 'ndg-presign-test',
}));

vi.mock('@aws-sdk/client-s3', () => ({
  PutObjectCommand: vi.fn(),
}));

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn(() => Promise.resolve('https://r2.example.com/signed-url')),
}));

import { POST } from '@/app/api/admin/presign/route';

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/admin/presign', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

beforeEach(() => {
  mockIsAdmin.mockReturnValue({ isAdmin: true });
  mockR2Configured.mockReturnValue(true);
});

describe('POST /api/admin/presign', () => {
  it('returns 401 for non-admin', async () => {
    mockIsAdmin.mockReturnValue({ isAdmin: false });
    const res = await POST(makeRequest({ fileName: 'test.glb', fileSize: 1000 }));
    expect(res.status).toBe(401);
  });

  it('returns 503 when R2 not configured', async () => {
    mockR2Configured.mockReturnValue(false);
    const res = await POST(makeRequest({ fileName: 'test.glb', fileSize: 1000 }));
    expect(res.status).toBe(503);
  });

  it('rejects unsupported format', async () => {
    const res = await POST(makeRequest({ fileName: 'test.exe', fileSize: 1000 }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('Unsupported format');
  });

  it('rejects file over 500MB', async () => {
    const res = await POST(makeRequest({ fileName: 'huge.glb', fileSize: 600 * 1024 * 1024 }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('too large');
  });

  it('returns presigned URL for valid GLB', async () => {
    const res = await POST(makeRequest({ fileName: 'model.glb', fileSize: 5000, name: 'My Model' }));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.uploadUrl).toBe('https://r2.example.com/signed-url');
    expect(data.assetId).toBe('ndg-presign-test');
    expect(data.format).toBe('GLB');
    expect(data.r2Key).toContain('content/models/');
    expect(data.displayName).toBe('My Model');
  });

  it('returns presigned URL for VRM', async () => {
    const res = await POST(makeRequest({ fileName: 'avatar.vrm', fileSize: 10000 }));
    const data = await res.json();

    expect(data.format).toBe('VRM');
    expect(data.r2Key).toContain('content/avatars/');
  });

  it('returns presigned URL for HYP', async () => {
    const res = await POST(makeRequest({ fileName: 'world.hyp', fileSize: 3000 }));
    const data = await res.json();

    expect(data.format).toBe('HYP');
    expect(data.r2Key).toContain('content/worlds/');
  });

  it('returns presigned URL for audio', async () => {
    const res = await POST(makeRequest({ fileName: 'song.mp3', fileSize: 2000 }));
    const data = await res.json();

    expect(data.format).toBe('MP3');
    expect(data.r2Key).toContain('content/audio/');
  });

  it('returns presigned URL for images', async () => {
    const res = await POST(makeRequest({ fileName: 'photo.png', fileSize: 500 }));
    const data = await res.json();

    expect(data.format).toBe('PNG');
    expect(data.r2Key).toContain('content/images/');
  });

  it('uses filename as displayName when name not provided', async () => {
    const res = await POST(makeRequest({ fileName: 'my-avatar.vrm', fileSize: 1000 }));
    const data = await res.json();

    expect(data.displayName).toBe('my-avatar');
  });
});
