import { NextResponse, type NextRequest } from 'next/server';
import { isLocale, LOCALE_COOKIE, matchLocale } from '@/i18n/config';

/**
 * Every page lives under a locale prefix (/en, /ru, /es, /de) so each language
 * has its own crawlable URL. Requests without a prefix are redirected to the
 * visitor's saved choice, then their browser language, then English.
 */
export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const firstSegment = pathname.split('/')[1];

  if (isLocale(firstSegment)) {
    const response = NextResponse.next();
    // Remember an explicit choice (e.g. from the language switcher or a shared link).
    if (request.cookies.get(LOCALE_COOKIE)?.value !== firstSegment) {
      response.cookies.set(LOCALE_COOKIE, firstSegment, {
        path: '/',
        maxAge: 60 * 60 * 24 * 365,
        sameSite: 'lax',
      });
    }
    return response;
  }

  const saved = request.cookies.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(saved) ? saved : matchLocale(request.headers.get('accept-language'));

  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${pathname === '/' ? '' : pathname}`;
  url.search = search;
  return NextResponse.redirect(url);
}

export const config = {
  // Skip API routes, Next internals, metadata routes and any file with an extension.
  matcher: [
    '/((?!api|_next|_vercel|robots.txt|sitemap.xml|manifest.webmanifest|icon|apple-icon|opengraph-image|llms.txt|.*\\..*).*)',
  ],
};
