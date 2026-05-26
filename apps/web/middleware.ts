import createIntlMiddleware from 'next-intl/middleware';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { routing } from './i18n/routing';
import { isFrozenNonMvpPath, isNonMvpFreezeEnabled } from './lib/non-mvp-freeze';

const COOKIE_NAME = 'airportfaster_session';
const intlMiddleware = createIntlMiddleware(routing);

function getLocaleFromPathname(pathname: string): string | null {
  const [, maybeLocale] = pathname.split('/');
  if (!maybeLocale) return null;
  return routing.locales.includes(maybeLocale as 'en' | 'ar') ? maybeLocale : null;
}

function stripLocalePrefix(pathname: string): string {
  const locale = getLocaleFromPathname(pathname);
  if (!locale) return pathname;

  const stripped = pathname.slice(locale.length + 1);
  return stripped.length > 0 ? stripped : '/';
}

/**
 * Middleware runs on every request matching the config below.
 * For admin routes: if no session cookie, redirect to login.
 * For the login page: if session cookie exists, redirect to dashboard.
 *
 * Note: We only check cookie PRESENCE here (fast, edge-compatible).
 * Full session validation happens in the layout Server Component,
 * which calls the API /me endpoint.
 */
export default function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;
  const sessionToken = request.cookies.get(COOKIE_NAME)?.value;

  if (isNonMvpFreezeEnabled() && isFrozenNonMvpPath(pathname)) {
    return new NextResponse(null, { status: 404 });
  }

  const locale = getLocaleFromPathname(pathname);
  if (!locale) {
    return intlMiddleware(request);
  }

  const pathWithoutLocale = stripLocalePrefix(pathname);
  const loginPath = `/${locale}/admin/login`;
  const dashboardPath = `/${locale}/admin`;
  const isLoginPage = pathWithoutLocale === '/admin/login' || pathWithoutLocale === '/admin/login/';
  const isPasswordResetPage =
    pathWithoutLocale === '/admin/password-reset' || pathWithoutLocale === '/admin/password-reset/';
  const isAdminPath = pathWithoutLocale.startsWith('/admin');

  // If user has a cookie and is on the login page, redirect to dashboard
  if (isLoginPage && sessionToken) {
    return NextResponse.redirect(new URL(dashboardPath, request.url));
  }

  // If user has no cookie and is accessing admin (non-login) route, redirect to login
  if (isAdminPath && !isLoginPage && !isPasswordResetPage && !sessionToken) {
    const loginUrl = new URL(loginPath, request.url);
    loginUrl.searchParams.set('redirect', pathWithoutLocale);
    return NextResponse.redirect(loginUrl);
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
