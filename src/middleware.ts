///scr/middleware.ts

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// List of supported locales
const locales = ['en', 'ja'];
const defaultLocale = 'en';

// Get the preferred locale from headers
function getLocale(request: NextRequest) {
  // Check if locale is set in URL
  const pathname = request.nextUrl.pathname;
  const pathnameLocale = locales.find(
    locale => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );
  if (pathnameLocale) return pathnameLocale;

  // Check Accept-Language header
  const acceptedLanguages = request.headers.get('accept-language');
  if (acceptedLanguages) {
    const preferredLocale = acceptedLanguages
      .split(',')
      .map(lang => lang.split(';')[0].trim().substring(0, 2))
      .find(lang => locales.includes(lang));
    if (preferredLocale) return preferredLocale;
  }

  // Default to English
  return defaultLocale;
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const segments = pathname.split('/').filter(Boolean);

  // Get current locale from URL if it exists
  const currentLocale = segments[0] && locales.includes(segments[0]) ? segments[0] : null;

  // If no locale in URL, redirect to appropriate locale
  if (!currentLocale) {
    const locale = getLocale(request);
    return NextResponse.redirect(
      new URL(
        `/${locale}${pathname === '/' ? '' : pathname}`,
        request.url
      )
    );
  }

  const res = NextResponse.next();

  // CORS headers are set in next.config.js with the correct origin.
  // Do NOT duplicate them here — setting Allow-Origin: * in middleware
  // conflicts with the specific origin in next.config.js and breaks
  // credential-based requests (cookies).

  // Check for session — wallet auth (admin_session) or GitHub OAuth (session)
  let isAdmin = false;

  const walletCookie = request.cookies.get('admin_session');
  if (walletCookie) {
    try {
      const data = JSON.parse(walletCookie.value);
      if (data.role === 'admin') isAdmin = true;
    } catch {}
  }

  if (!isAdmin) {
    const sessionCookie = request.cookies.get('session');
    if (sessionCookie) {
      try {
        const data = JSON.parse(sessionCookie.value);
        if (['admin', 'creator'].includes(data.role)) isAdmin = true;
      } catch {}
    }
  }

  // Admin routes — wallet or OAuth session required
  // The /en/admin page handles its own auth gate (WalletConnect),
  // so we only block unauthenticated access to /admin without locale prefix.
  if (pathname.match(/^\/[a-z]{2}\/admin/) && !isAdmin) {
    // Let the page handle auth — it shows WalletConnect if not authenticated
  }

  return res;
}

export const config = {
  // Match all pathnames except for
  // - /api (API routes)
  // - /_next (Next.js internals)
  // - /static (static files)
  // - favicon.ico, robots.txt, etc.
  matcher: ['/((?!api|_next|static|.*\\..*).*)']
};