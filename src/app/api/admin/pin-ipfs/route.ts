import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth/getSession';
import { getAvatars, updateAvatarInSource } from '@/lib/github-storage';
import type { GithubAvatar } from '@/types/github-storage';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/admin/pin-ipfs
 * Pins an asset to IPFS via a pinning service (Pinata, web3.storage, etc.)
 * Requires IPFS_PIN_API_URL and IPFS_PIN_API_KEY env vars.
 *
 * Body: { assetId: string }
 */
export async function POST(req: NextRequest) {
  const session = getAdminSession(req);
  if (!session.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const pinApiUrl = process.env.IPFS_PIN_API_URL;
  const pinApiKey = process.env.IPFS_PIN_API_KEY;

  if (!pinApiUrl || !pinApiKey) {
    return NextResponse.json({
      error: 'IPFS pinning not configured. Set IPFS_PIN_API_URL and IPFS_PIN_API_KEY.',
    }, { status: 503 });
  }

  try {
    const { assetId } = await req.json();
    if (!assetId) {
      return NextResponse.json({ error: 'assetId required' }, { status: 400 });
    }

    const avatars = await getAvatars();
    const avatar = avatars.find((a: GithubAvatar) => a.id === assetId);
    if (!avatar || !avatar.modelFileUrl) {
      return NextResponse.json({ error: 'Asset not found or has no file URL' }, { status: 404 });
    }

    const storage = (avatar as Record<string, unknown>).storage as Record<string, unknown> | undefined;
    if (storage?.ipfs_cid) {
      return NextResponse.json({
        already_pinned: true,
        ipfs_cid: storage.ipfs_cid,
        ipfs_url: `https://ipfs.io/ipfs/${storage.ipfs_cid}`,
      });
    }

    // Fetch binary
    const fileRes = await fetch(avatar.modelFileUrl);
    if (!fileRes.ok) {
      return NextResponse.json({ error: `Failed to fetch asset: ${fileRes.status}` }, { status: 502 });
    }

    const fileBlob = await fileRes.blob();
    const ext = avatar.modelFileUrl.split('.').pop() || 'bin';
    const fileName = `${assetId}.${ext}`;

    // Pin via IPFS Pinning Service API (Pinata-compatible)
    const formData = new FormData();
    formData.append('file', fileBlob, fileName);
    formData.append('pinataMetadata', JSON.stringify({
      name: `${avatar.name} (${assetId})`,
      keyvalues: { assetId, format: avatar.format },
    }));

    const pinRes = await fetch(`${pinApiUrl}/pinning/pinFileToIPFS`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${pinApiKey}` },
      body: formData,
    });

    if (!pinRes.ok) {
      const err = await pinRes.text();
      return NextResponse.json({ error: `Pin failed: ${err}` }, { status: 502 });
    }

    const pinData = await pinRes.json();
    const cid = pinData.IpfsHash;

    // Update storage field
    await updateAvatarInSource(assetId, {
      storage: {
        ...(storage || {}),
        ipfs_cid: cid,
      },
    });

    return NextResponse.json({
      success: true,
      ipfs_cid: cid,
      ipfs_url: `https://ipfs.io/ipfs/${cid}`,
      size_bytes: fileBlob.size,
    });
  } catch (error) {
    console.error('IPFS pin error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Pin failed' },
      { status: 500 },
    );
  }
}
