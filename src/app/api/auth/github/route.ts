import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/lib/env';

// These export configurations tell Next.js that this is a dynamic route
// and should not be statically generated
export const dynamic = 'force-dynamic';
export const dynamicParams = true;
export const revalidate = 0;
export const fetchCache = 'force-no-store';
export const runtime = 'nodejs';

/**
 * This route initiates the GitHub OAuth flow
 * It redirects the user to GitHub's authorization page
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const redirectTo = searchParams.get('redirect_to') || '/';

    // Generate a cryptographically random CSRF token
    const csrfToken = crypto.randomUUID();

    // Build the GitHub authorization URL
    const authUrl = new URL('https://github.com/login/oauth/authorize');
    authUrl.searchParams.set('client_id', env.github.clientId);
    authUrl.searchParams.set('redirect_uri', env.github.redirectUri);
    authUrl.searchParams.set('scope', 'user:email read:user');
    authUrl.searchParams.set('state', csrfToken);

    // Store CSRF token + redirect destination in a short-lived httpOnly cookie
    const response = NextResponse.redirect(authUrl);
    response.cookies.set('oauth_state', JSON.stringify({ csrf: csrfToken, redirectTo }), {
      httpOnly: true,
      secure: env.isProd,
      sameSite: 'lax',
      maxAge: 60 * 10, // 10 minutes
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Auth initiation error:', error);
    return NextResponse.redirect(new URL('/login?error=initiation_failed', request.url));
  }
} 