import { NextRequest, NextResponse } from 'next/server';
import { isAllowedAssetUrl } from '@/lib/schemas';
import { logAudit } from '@/lib/audit';
import { verifyCsrf } from '@/lib/session';
import { requireRank, type SessionWithRank } from '@/lib/auth/getSession';
import { getDataSource } from '@/lib/data-source';
import type { GithubAvatar } from '@/types/github-storage';
import { env } from '@/lib/env';
import { archiveRateLimit, getRateLimitKey } from '@/lib/rate-limit';
import { createLogger } from '@/lib/logger';

const log = createLogger('api/admin/archive');

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/admin/archive
 * Archives an asset to Arweave via ArDrive Turbo SDK.
 * Requires ARWEAVE_WALLET_KEY env var (JWK JSON string).
 *
 * Body: { assetId: string }
 *
 * Flow:
 * 1. Fetch the asset's binary from its current URL (R2 or GitHub)
 * 2. Upload to Arweave via Turbo
 * 3. Update the asset's storage.arweave_tx field
 */
export async function POST(req: NextRequest) {
  let session: SessionWithRank;
  try {
    session = await requireRank(req, 'archon');
  } catch (response) {
    return response as Response;
  }
    if (!verifyCsrf(req)) return NextResponse.json({ error: "CSRF token invalid" }, { status: 403 });

  const rl = await archiveRateLimit(getRateLimitKey(req));
  if (!rl.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

  const walletKeyJson = env.arweave.walletKey;
  if (!walletKeyJson) {
    return NextResponse.json({
      error: 'Arweave wallet not configured. Set ARWEAVE_WALLET_KEY env var with JWK JSON.',
    }, { status: 503 });
  }

  try {
    const { assetId } = await req.json();
    if (!assetId) {
      return NextResponse.json({ error: 'assetId required' }, { status: 400 });
    }

    // Find the asset
    const ds = getDataSource();
    const avatars = await ds.assets.getAll();
    const avatar = avatars.find((a: GithubAvatar) => a.id === assetId);
    if (!avatar || !avatar.modelFileUrl) {
      return NextResponse.json({ error: 'Asset not found or has no file URL' }, { status: 404 });
    }

    // Check if already archived
    const storage = (avatar as Record<string, unknown>).storage as Record<string, unknown> | undefined;
    if (storage?.arweave_tx) {
      return NextResponse.json({
        already_archived: true,
        arweave_tx: storage.arweave_tx,
        arweave_url: `https://arweave.net/${storage.arweave_tx}`,
      });
    }

    // Fetch the binary
    if (!isAllowedAssetUrl(avatar.modelFileUrl)) return NextResponse.json({ error: "Invalid asset URL" }, { status: 400 });
    const fileRes = await fetch(avatar.modelFileUrl);
    if (!fileRes.ok) {
      return NextResponse.json({ error: `Failed to fetch asset: ${fileRes.status}` }, { status: 502 });
    }

    const fileBuffer = Buffer.from(await fileRes.arrayBuffer());
    const contentType = fileRes.headers.get('content-type') || 'application/octet-stream';

    // Upload to Arweave via Turbo
    const { TurboFactory } = await import('@ardrive/turbo-sdk');
    const jwk = JSON.parse(walletKeyJson);
    const turbo = TurboFactory.authenticated({ privateKey: jwk });

    const uploadResult = await turbo.uploadFile({
      fileStreamFactory: () => {
        const { Readable } = require('stream');
        return Readable.from(fileBuffer);
      },
      fileSizeFactory: () => fileBuffer.byteLength,
      dataItemOpts: {
        tags: [
          { name: 'Content-Type', value: contentType },
          { name: 'App-Name', value: 'Numinia-Digital-Goods' },
          { name: 'Asset-ID', value: assetId },
          { name: 'Asset-Name', value: avatar.name },
        ],
      },
    });

    const txId = uploadResult.id;

    // Update the asset's storage field
    await ds.assets.update(assetId, {
      storage: {
        ...(storage || {}),
        arweave_tx: txId,
      },
    });

    logAudit({ action: 'archive', actor: session.address || 'admin', target: assetId, metadata: { arweave_tx: txId } });

    return NextResponse.json({
      success: true,
      arweave_tx: txId,
      arweave_url: `https://arweave.net/${txId}`,
      size_bytes: fileBuffer.byteLength,
    });
  } catch (error) {
    log.error({ err: error }, 'Arweave archive error');
    return NextResponse.json(
      { error: 'Archive failed' },
      { status: 500 },
    );
  }
}
