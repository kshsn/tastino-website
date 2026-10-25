import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { routing } from '@/i18n/routing';
import { SESSION_COOKIE, SESSION_COOKIE_SECURE } from '@/lib/admin/config';
import { safeNext } from '@/lib/admin/paths';
import { stripUnsupportedLocale } from '@/lib/locale-path';

const intl = createMiddleware(routing);

export default function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Admin is not locale-prefixed. Its sign-in pages and the invitation page are open; every other admin page needs a
  // session cookie to get past this point. This is only the first, cheap check: the page itself (requireAdminPage)
  // and every API handler (requireAdminApi) verify the session against the database.
  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    const isOpen = pathname === '/admin/login' || pathname.startsWith('/admin/login/') || pathname.startsWith('/admin/invite/');
    const hasCookie = req.cookies.has((process.env.SITE_URL ?? '').startsWith('https:') ? SESSION_COOKIE_SECURE : SESSION_COOKIE);
    if (!isOpen && !hasCookie) {
      const url = req.nextUrl.clone();
      url.pathname = '/admin/login';
      url.search = `?next=${encodeURIComponent(safeNext(pathname + req.nextUrl.search))}`;
      return NextResponse.redirect(url);
    }
    // Never stored by the browser or any cache, so Back cannot reopen an admin page after signing out.
    const res = NextResponse.next();
    res.headers.set('Cache-Control', 'no-store');
    return res;
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
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)', '/admin/:path*'],
};
