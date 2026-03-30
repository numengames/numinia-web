import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth/getSession';
import { fetchData, updateData } from '@/lib/github-storage';
import { getR2PublicUrl } from '@/lib/r2-client';
import { getContentPath } from '@/lib/content-paths';
import { createAssetMetadata } from '@/lib/asset-id';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Called after the client has uploaded the binary directly to R2.
// Creates the metadata entry in the GitHub data repo.
export async function POST(req: NextRequest) {
  const session = getAdminSession(req);
  if (!session.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { assetId, r2Key, displayName, description, format } = await req.json();

    if (!assetId || !r2Key || !displayName || !format) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const publicUrl = `${getR2PublicUrl()}/${r2Key}`;
    const { catalogFile, projectId } = getContentPath(format);

    const newEntry = createAssetMetadata(
      assetId,
      displayName,
      format.toLowerCase(),
      description || `${format} asset uploaded via Numinia Admin`,
      publicUrl,
      projectId,
    );

    const existingAssets = await fetchData<Record<string, unknown>[]>(catalogFile);
    const assets = Array.isArray(existingAssets) ? existingAssets : [];
    assets.push(newEntry);

    await updateData(catalogFile, assets, `asset: add ${displayName}`);

    return NextResponse.json({
      success: true,
      asset: { id: assetId, name: displayName, format, url: publicUrl },
    });
  } catch (error) {
    console.error('Presign confirm error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create metadata' },
      { status: 500 }
    );
  }
}
