import { NextRequest, NextResponse } from 'next/server';
import { proxyRateLimit, getRateLimitKey } from '@/lib/rate-limit';
import { createLogger } from '@/lib/logger';

const log = createLogger('api/proxy-asset');

// These export configurations tell Next.js that this is a dynamic route
// and should not be statically generated
export const dynamic = 'force-dynamic';
export const dynamicParams = true;
export const revalidate = 0;
export const fetchCache = 'force-no-store';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const rl = await proxyRateLimit(getRateLimitKey(request));
  if (!rl.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

  try {
    // Get the target URL from the query parameter
    const url = request.nextUrl.searchParams.get('url');

    if (!url) {
      return NextResponse.json({ error: 'URL parameter is required' }, { status: 400 });
    }

    // Only allow proxying from certain domains for security
    const allowedDomains = [
      'assets.numinia.store',
      'assetsdev.numinia.store',
      'assets.opensourceavatars.com',
      'arweave.net',
      'r2.dev',
      'r2.cloudflarestorage.com',
      'raw.githubusercontent.com',
    ];

    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    const isAllowedDomain = allowedDomains.some(d => hostname === d || hostname.endsWith(`.${d}`));

    if (!isAllowedDomain) {
      return NextResponse.json(
        { error: 'Proxying from this domain is not allowed' },
        { status: 403 }
      );
    }

    // Fetch the asset
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'OSA-Asset-Proxy',
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch from source: ${response.status} ${response.statusText}` },
        { status: response.status }
      );
    }

    // Get the asset as a blob/buffer
    const blob = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'application/octet-stream';

    // Return the asset with appropriate headers
    return new NextResponse(blob, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
        'Access-Control-Allow-Origin': '*',
      }
    });
  } catch (error) {
    log.error({ err: error }, 'Error proxying asset');
    return NextResponse.json(
      { error: 'Failed to proxy asset' },
      { status: 500 }
    );
  }
} 