///scr/middleware.ts

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

  // CORS headers are set in next.config.js with the correct origin.
  // Do NOT duplicate them here — setting Allow-Origin: * in middleware
  // conflicts with the specific origin in next.config.js and breaks
  // credential-based requests (cookies).

  // Check for session — wallet auth (admin_session) or GitHub OAuth (session)
  let isAdmin = false;

  // Middleware runs on Edge — can't use Node.js crypto for HMAC verification.
  // This is a lightweight routing check only. Real auth enforcement is in API routes
  // via verifySession() (server-side, Node.js runtime).
  const walletCookie = request.cookies.get('admin_session');
  if (walletCookie) {
    try {
      // Try signed format: decode base64url payload before the dot
      const dot = walletCookie.value.indexOf('.');
      const payload = dot > 0 ? atob(walletCookie.value.slice(0, dot).replace(/-/g, '+').replace(/_/g, '/')) : walletCookie.value;
      const data = JSON.parse(payload);
      if (data.role === 'admin') isAdmin = true;
    } catch { /* malformed cookie — treat as unauthenticated */ }
  }

  if (!isAdmin) {
    const sessionCookie = request.cookies.get('session');
    if (sessionCookie) {
      try {
        const dot = sessionCookie.value.indexOf('.');
        const payload = dot > 0 ? atob(sessionCookie.value.slice(0, dot).replace(/-/g, '+').replace(/_/g, '/')) : sessionCookie.value;
        const data = JSON.parse(payload);
        if (['admin', 'creator'].includes(data.role)) isAdmin = true;
      } catch { /* malformed cookie — treat as unauthenticated */ }
    }
  }

  // Check Thirdweb JWT (tw_jwt) — any valid JWT means authenticated user
  if (!isAdmin) {
    const twJwt = request.cookies.get('tw_jwt');
    if (twJwt?.value) {
      try {
        const parts = twJwt.value.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
          if (payload.sub) isAdmin = true; // Any wallet-authenticated user can access LAP
        }
      } catch { /* malformed JWT — treat as unauthenticated */ }
    }
  }

  // Check user_session cookie (regular wallet users)
  if (!isAdmin) {
    const userCookie = request.cookies.get('user_session');
    if (userCookie) {
      try {
        const dot = userCookie.value.indexOf('.');
        const payload = dot > 0 ? atob(userCookie.value.slice(0, dot).replace(/-/g, '+').replace(/_/g, '/')) : userCookie.value;
        const data = JSON.parse(payload);
        if (data.address) isAdmin = true; // Any authenticated wallet user can access LAP
      } catch { /* malformed cookie — treat as unauthenticated */ }
    }
  }

  // L.A.P. and admin routes — redirect unauthenticated users to home
  if (pathname.match(/^\/[a-z]{2}\/(admin|LAP)/) && !isAdmin) {
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