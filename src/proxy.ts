import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { routing } from '@/i18n/routing';
import { stripUnsupportedLocale } from '@/lib/locale-path';

const intl = createMiddleware(routing);

export default function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Admin is not locale-prefixed. Sessions arrive in Epic 7; until then every admin page requires login.
  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    if (pathname === '/admin/login') return NextResponse.next();
    const url = req.nextUrl.clone();
    url.pathname = '/admin/login';
    url.search = `?next=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(url);
  }

  // `/fr/about` → one redirect straight to the detected supported locale (`/en/about` or `/ar/about`).
  const stripped = stripUnsupportedLocale(pathname);
  if (stripped !== null) {
    // Clone the request URL and only replace the path, so the origin can never change.
    const url = req.nextUrl.clone();
    url.pathname = stripped;
    return intl(new NextRequest(url, { headers: req.headers }));
  }

  return intl(req);
}

export const config = {
  // `/admin/:path*` is listed separately so admin paths containing a dot are still gated.
  // Epic 7 must also check the session server-side in the admin layout and every admin API handler.
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)', '/admin/:path*'],
};
