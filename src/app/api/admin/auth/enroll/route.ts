import { beginEnrollment, confirmEnrollment } from '@/lib/admin/auth-service';
import { jsonResponse } from '@/lib/admin/guard';
import { authContext, openSignInRequest, retryHeaders, sessionTokenOf, withSessionCookie } from '@/lib/admin/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** The secret and QR code for the authenticator app. Asking again shows the same secret until it is confirmed. */
export async function GET(req: Request) {
  const result = await beginEnrollment(sessionTokenOf(req), authContext(req));
  switch (result.status) {
    case 'ok':
      return jsonResponse({ secret: result.secret, qr: result.qr, email: result.email });
    case 'unavailable':
      return jsonResponse({ error: 'unavailable' }, 503);
    case 'forbidden':
      return jsonResponse({ error: 'forbidden' }, 403);
    default:
      return jsonResponse({ error: 'expired' }, 401);
  }
}

/** Confirms the first code. The recovery codes in the answer are shown once and never again. */
export async function POST(req: Request) {
  const opened = await openSignInRequest(req);
  if (!opened.ok) return opened.response;

  const result = await confirmEnrollment(sessionTokenOf(req), opened.data.code, authContext(req));
  switch (result.status) {
    case 'ok':
      return withSessionCookie({ next: '/admin', recoveryCodes: result.recoveryCodes }, result.token, 'active');
    case 'locked':
      return jsonResponse({ error: 'locked', retryAfterSec: result.retryAfterSec }, 423, retryHeaders(result.retryAfterSec));
    case 'throttled':
      return jsonResponse({ error: 'rate_limited' }, 429, retryHeaders(result.retryAfterSec));
    case 'expired':
      return jsonResponse({ error: 'expired' }, 401);
    case 'unavailable':
      return jsonResponse({ error: 'unavailable' }, 503);
    default:
      return jsonResponse({ error: 'invalid' }, 401);
  }
}
