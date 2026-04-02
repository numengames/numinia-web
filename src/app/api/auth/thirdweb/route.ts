/**
 * Thirdweb Auth API routes — handles SIWE login/logout/session check.
 *
 * These are called by the ConnectButton's auth callbacks:
 *   - POST /api/auth/thirdweb (action=login) — verify signature, issue JWT
 *   - POST /api/auth/thirdweb (action=logout) — clear JWT cookie
 *   - GET /api/auth/thirdweb — check if logged in (isLoggedIn)
 *   - POST /api/auth/thirdweb (action=payload) — generate login payload
 *
 * Only activates when THIRDWEB_AUTH_DOMAIN is configured.
 * Falls back to 503 if not configured.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getThirdwebAuth, TW_JWT_COOKIE, TW_JWT_COOKIE_OPTIONS } from '@/lib/thirdweb-auth';
import { generateCsrfToken } from '@/lib/session';
import { createLogger } from '@/lib/logger';
import { cookies } from 'next/headers';

const log = createLogger('api/auth/thirdweb');

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET — check if user is logged in via Thirdweb JWT.
 */
export async function GET() {
  const auth = getThirdwebAuth();
  if (!auth) {
    return NextResponse.json({ loggedIn: false, reason: 'thirdweb-auth-not-configured' });
  }

  const cookieStore = await cookies();
  const jwt = cookieStore.get(TW_JWT_COOKIE)?.value;

  if (!jwt) {
    return NextResponse.json({ loggedIn: false });
  }

  try {
    const result = await auth.verifyJWT({ jwt });
    if (!result.valid) {
      return NextResponse.json({ loggedIn: false });
    }
    return NextResponse.json({
      loggedIn: true,
      address: result.parsedJWT.sub,
    });
  } catch {
    return NextResponse.json({ loggedIn: false });
  }
}

/**
 * POST — login, logout, or generate payload.
 */
export async function POST(req: NextRequest) {
  const auth = getThirdwebAuth();
  if (!auth) {
    return NextResponse.json({ error: 'Thirdweb Auth not configured' }, { status: 503 });
  }

  try {
    const body = await req.json();
    const action = body.action as string;

    switch (action) {
      case 'payload': {
        // Generate SIWE login payload for the given address
        const payload = await auth.generatePayload({ address: body.address });
        return NextResponse.json(payload);
      }

      case 'login': {
        // Verify signature and issue JWT
        const verifiedPayload = await auth.verifyPayload(body);
        if (!verifiedPayload.valid) {
          return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
        }

        const jwt = await auth.generateJWT({ payload: verifiedPayload.payload });

        const response = NextResponse.json({
          success: true,
          address: verifiedPayload.payload?.address,
        });

        response.cookies.set(TW_JWT_COOKIE, jwt, TW_JWT_COOKIE_OPTIONS);

        // Set CSRF token for admin API requests
        response.cookies.set('csrf_token', generateCsrfToken(), {
          httpOnly: false,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 7,
          path: '/',
        });

        log.info({ address: verifiedPayload.payload?.address }, 'Thirdweb login');
        return response;
      }

      case 'logout': {
        const response = NextResponse.json({ success: true });
        response.cookies.set(TW_JWT_COOKIE, '', { ...TW_JWT_COOKIE_OPTIONS, maxAge: 0 });
        response.cookies.set('csrf_token', '', { path: '/', maxAge: 0 });
        return response;
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (err) {
    log.error({ err }, 'Thirdweb auth error');
    return NextResponse.json({ error: 'Auth failed' }, { status: 500 });
  }
}
