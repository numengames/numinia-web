///src/middleware.ts

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Import from the single source of truth for locale config.
// Middleware runs on Edge so we inline the values to avoid import issues.
const locales = ['en', 'ja', 'es', 'ko', 'zh', 'pt', 'de'];
const defaultLocale = 'en';

// Get the preferred locale: cookie > Accept-Language > default
function getLocale(request: NextRequest) {
  // Check if locale is set in URL
  const pathname = request.nextUrl.pathname;
  const pathnameLocale = locales.find(
    locale => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );
  if (pathnameLocale) return pathnameLocale;

  // Check user preference cookie (set by Settings or LanguageSelector)
  const preferredLocale = request.cookies.get('preferred-locale')?.value;
  if (preferredLocale && locales.includes(preferredLocale)) return preferredLocale;

  // Check Accept-Language header
  const acceptedLanguages = request.headers.get('accept-language');
  if (acceptedLanguages) {
    const browserLocale = acceptedLanguages
      .split(',')
      .map(lang => lang.split(';')[0].trim().substring(0, 2))
      .find(lang => locales.includes(lang));
    if (browserLocale) return browserLocale;
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

  // Check for Thirdweb JWT — only auth method
  let isAuthenticated = false;

  const twJwt = request.cookies.get('tw_jwt');
  if (twJwt?.value) {
    try {
      const parts = twJwt.value.split('.');
      if (parts.length === 3) {
        // Base64url → base64: replace URL-safe chars and add padding
        let b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        while (b64.length % 4) b64 += '=';
        const payload = JSON.parse(atob(b64));
        if (payload.sub) isAuthenticated = true;
      }
    } catch { /* malformed JWT — treat as unauthenticated */ }
  }

  // L.A.P. and admin routes — redirect unauthenticated users to home
  if (pathname.match(/^\/[a-z]{2}\/(admin|LAP)/) && !isAuthenticated) {
    const locale = currentLocale || defaultLocale;
    return NextResponse.redirect(new URL(`/${locale}/`, request.url));
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
